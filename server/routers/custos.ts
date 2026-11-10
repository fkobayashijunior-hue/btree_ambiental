// Custos lançados à mão (Contas a Pagar): fixos e variáveis, por planta, com categoria, forma de pagamento,
// cartão, quem gastou e NF anexa. Tabelas criadas sob demanda (evita a trava de 6h da migration de boot).
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { randomUUID } from "node:crypto";
import { sqlNum } from "../utils/financeiroCanonico";
import { custoPorPlanta } from "../utils/custoPlanta";
import { router, adminProcedure } from "../_core/trpc";
import { moduleProcedure, resolveUserPermissions } from "./permissions";
import {
  FORMAS_PAGAMENTO, CATEGORIAS_PADRAO, validarCusto, parseValor, dataValida, exigeCartao, somarMeses,
} from "../utils/custos";
import { interpretarLinha, atribuirHashes, type LancamentoPronto } from "../utils/custosImport";

const SLUG = "contas-a-pagar" as const;
const MEUS = "meus-gastos" as const;
const CENTROS_CUSTO = ["Financeiro/Administrativo", "Produção", "Logístico"] as const;

async function getDbOrThrow() {
  const { getDb } = await import("../db");
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
  return db;
}

let ensurePromise: Promise<void> | null = null;
function ensureTables(db: any): Promise<void> {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      await db.$client.execute(`
        CREATE TABLE IF NOT EXISTS custo_categorias (
          id INT AUTO_INCREMENT PRIMARY KEY,
          nome VARCHAR(80) NOT NULL,
          tipo_padrao VARCHAR(10) NOT NULL DEFAULT 'variavel',
          origem_automatica TINYINT(1) NOT NULL DEFAULT 0,
          icone VARCHAR(30) NULL,
          ativa TINYINT(1) NOT NULL DEFAULT 1,
          ordem INT NOT NULL DEFAULT 50,
          UNIQUE KEY custo_categorias_nome (nome)
        )
      `);
      await db.$client.execute(`
        CREATE TABLE IF NOT EXISTS custo_cartoes (
          id INT AUTO_INCREMENT PRIMARY KEY,
          nome VARCHAR(80) NOT NULL,
          tipo VARCHAR(12) NOT NULL DEFAULT 'credito',
          banco VARCHAR(60) NULL,
          final VARCHAR(10) NULL,
          titular VARCHAR(100) NULL,
          ativo TINYINT(1) NOT NULL DEFAULT 1
        )
      `);
      await db.$client.execute(`
        CREATE TABLE IF NOT EXISTS custo_lancamentos (
          id INT AUTO_INCREMENT PRIMARY KEY,
          data_competencia DATE NOT NULL,
          data_vencimento DATE NULL,
          data_pagamento DATE NULL,
          status VARCHAR(10) NOT NULL DEFAULT 'pago',
          planta_id INT NULL,
          categoria_id INT NOT NULL,
          tipo VARCHAR(10) NOT NULL DEFAULT 'variavel',
          descricao VARCHAR(255) NOT NULL,
          favorecido VARCHAR(150) NULL,
          valor DECIMAL(15,2) NOT NULL,
          forma_pagamento VARCHAR(20) NULL,
          cartao_id INT NULL,
          gasto_por_colaborador_id INT NULL,
          gasto_por_nome VARCHAR(120) NULL,
          nf_numero VARCHAR(40) NULL,
          nf_url TEXT NULL,
          observacoes TEXT NULL,
          origem VARCHAR(20) NOT NULL DEFAULT 'manual',
          importacao_id INT NULL,
          hash_importacao CHAR(40) NULL,
          extrato_id INT NULL,
          conferencia_status VARCHAR(12) NOT NULL DEFAULT 'pendente',
          conferido_por INT NULL,
          conferido_por_nome VARCHAR(120) NULL,
          conferido_em DATETIME NULL,
          conferencia_obs VARCHAR(500) NULL,
          criado_por INT NULL,
          criado_por_nome VARCHAR(120) NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY custo_lanc_hash (hash_importacao),
          UNIQUE KEY custo_lanc_extrato (extrato_id),
          KEY custo_lanc_comp (data_competencia),
          KEY custo_lanc_planta (planta_id)
        )
      `);
      // Tabelas criadas em versões anteriores podem não ter as colunas novas: adiciona o que faltar (idempotente).
      const [colunas] = (await db.$client.execute(
        `SELECT column_name AS c FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'custo_lancamentos'`
      )) as any;
      const tem = new Set((colunas as any[]).map((r) => String(r.c ?? r.COLUMN_NAME).toLowerCase()));
      const faltantes: [string, string][] = [
        ["conferencia_status", "VARCHAR(12) NOT NULL DEFAULT 'pendente'"],
        ["conferido_por", "INT NULL"],
        ["conferido_por_nome", "VARCHAR(120) NULL"],
        ["conferido_em", "DATETIME NULL"],
        ["conferencia_obs", "VARCHAR(500) NULL"],
        ["serie_id", "VARCHAR(36) NULL"],
        ["centro_custo", "VARCHAR(40) NULL"],
        ["tipo_custo", "VARCHAR(10) NULL"],
      ];
      for (const [nome, def] of faltantes) {
        if (!tem.has(nome)) await db.$client.execute(`ALTER TABLE custo_lancamentos ADD COLUMN ${nome} ${def}`);
      }
      if (!tem.has("serie_id")) {
        await db.$client.execute(`ALTER TABLE custo_lancamentos ADD KEY custo_lanc_serie (serie_id)`);
      }
      // Uma data só: o vencimento (gasto pago na hora = dia do gasto). Preenche o que faltava e alinha a competência ao vencimento.
      await db.$client.execute(`UPDATE custo_lancamentos SET data_vencimento = data_competencia WHERE data_vencimento IS NULL`);
      await db.$client.execute(`UPDATE custo_lancamentos SET data_competencia = data_vencimento WHERE data_competencia <> data_vencimento`);
      await db.$client.execute(`
        CREATE TABLE IF NOT EXISTS custo_importacoes (
          id INT AUTO_INCREMENT PRIMARY KEY,
          arquivo VARCHAR(200) NULL,
          linhas_lidas INT NOT NULL DEFAULT 0,
          lancamentos_criados INT NOT NULL DEFAULT 0,
          duplicados INT NOT NULL DEFAULT 0,
          erros INT NOT NULL DEFAULT 0,
          usuario_id INT NULL,
          usuario_nome VARCHAR(120) NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await db.$client.execute(`
        CREATE TABLE IF NOT EXISTS custo_config (
          chave VARCHAR(40) PRIMARY KEY,
          valor VARCHAR(100) NULL
        )
      `);
      await db.$client.execute(`
        CREATE TABLE IF NOT EXISTS custo_exclusoes (
          id INT AUTO_INCREMENT PRIMARY KEY,
          lancamento_id INT NOT NULL,
          dados_json MEDIUMTEXT NOT NULL,
          excluido_por INT NULL,
          excluido_por_nome VARCHAR(120) NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await db.$client.execute(`
        CREATE TABLE IF NOT EXISTS custo_conferentes (
          user_id INT PRIMARY KEY
        )
      `);
      // O "Grupo" é o próprio Fixo/Variável; o Centro de Custo é escolhido em cada gasto, na conferência.
      const [cnt] = (await db.$client.execute(`SELECT COUNT(*) AS n FROM custo_categorias`)) as any;
      if (Number((cnt as any[])[0]?.n ?? 0) === 0) {
        for (const c of CATEGORIAS_PADRAO) {
          await db.$client.execute(
            `INSERT IGNORE INTO custo_categorias (nome, tipo_padrao, origem_automatica, icone, ordem) VALUES (?, ?, ?, ?, ?)`,
            [c.nome, c.tipo, c.automatica ? 1 : 0, c.icone, c.ordem]
          );
        }
      }
    })().catch((e) => { ensurePromise = null; throw e; });
  }
  return ensurePromise;
}

// Pedágios (TAG) vêm do extrato do banco: um lançamento por débito "TAG.*", sem digitação. Idempotente (extrato_id é único).
// Já entram conferidos (vieram do banco) e na planta padrão configurada (ou sem planta, até alguém atribuir).
const ultimaSync = new Map<string, number>();
async function sincronizarPedagios(db: any, ini: string, fim: string, forcar = false): Promise<number> {
  const chaveCache = `${ini}|${fim}`;
  if (!forcar && Date.now() - (ultimaSync.get(chaveCache) ?? 0) < 60_000) return 0;
  ultimaSync.set(chaveCache, Date.now());

  let [cats] = (await db.$client.execute(`SELECT id FROM custo_categorias WHERE nome = 'Pedágio / TAG' LIMIT 1`)) as any;
  let catId = (cats as any[])[0]?.id;
  if (!catId) {
    await db.$client.execute(`INSERT IGNORE INTO custo_categorias (nome, tipo_padrao, icone, ordem) VALUES ('Pedágio / TAG', 'variavel', 'route', 10)`);
    [cats] = (await db.$client.execute(`SELECT id FROM custo_categorias WHERE nome = 'Pedágio / TAG' LIMIT 1`)) as any;
    catId = (cats as any[])[0]?.id;
  }
  if (!catId) return 0;
  const [cfg] = (await db.$client.execute(`SELECT valor FROM custo_config WHERE chave = 'pedagio_planta_padrao'`)) as any;
  const plantaPadrao = Number((cfg as any[])[0]?.valor) || null;

  const [res] = (await db.$client.execute(
    `INSERT IGNORE INTO custo_lancamentos
       (data_competencia, data_vencimento, data_pagamento, status, planta_id, categoria_id, tipo, descricao, valor, forma_pagamento,
        origem, extrato_id, conferencia_status, conferido_por_nome, conferido_em, gasto_por_nome, criado_por_nome)
     SELECT e.data_lancamento, e.data_lancamento, e.data_lancamento, 'pago', ?, ?, 'variavel',
            CONCAT('Pedágio (TAG)', IF(e.complemento IS NULL OR e.complemento = '', '', CONCAT(' - ', LEFT(e.complemento, 150)))),
            ABS(${sqlNum("e.valor")}), 'debito_conta', 'extrato_pedagio', e.id, 'conferido', 'Extrato bancário', NOW(),
            'Extrato bancário', 'Extrato bancário'
     FROM sicoob_extrato e
     WHERE e.tipo_lancamento = 'DEBITO' AND e.numero_documento LIKE 'TAG.%'
       AND e.data_lancamento BETWEEN ? AND ? AND ABS(${sqlNum("e.valor")}) > 0`,
    [plantaPadrao, catId, ini, fim]
  )) as any;
  return Number((res as any).affectedRows ?? 0);
}

async function plantasPermitidas(ctx: { user: { id: number; role?: string | null } }): Promise<number[] | null> {
  if (ctx.user.role === "admin") return null;
  const p = await resolveUserPermissions(ctx.user.id, ctx.user.role);
  return p.allowedWorkLocationIds && p.allowedWorkLocationIds.length > 0 ? p.allowedWorkLocationIds : null;
}

async function ehConferente(db: any, ctx: { user: { id: number; role?: string | null } }): Promise<boolean> {
  if (ctx.user.role === "admin") return true;
  const [rows] = (await db.$client.execute(`SELECT 1 FROM custo_conferentes WHERE user_id = ?`, [ctx.user.id])) as any;
  return (rows as any[]).length > 0;
}

function exigirPlanta(permitidas: number[] | null, plantaId: number | null | undefined) {
  if (plantaId && permitidas && !permitidas.includes(plantaId)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Você não tem acesso a esta planta" });
  }
}

const dataOpc = z.string().refine(dataValida, "Data inválida").nullable().optional();

const entradaCusto = z.object({
  valor: z.union([z.number(), z.string()]),
  descricao: z.string().max(255),
  plantaId: z.number().int().positive().nullable().optional(), // o local é opcional
  categoriaId: z.number().int().positive(),
  dataCompetencia: z.string().refine(dataValida, "Data inválida"),
  tipo: z.enum(["fixo", "variavel"]).optional(),
  formaPagamento: z.enum(FORMAS_PAGAMENTO).nullable().optional(),
  cartaoId: z.number().int().positive().nullable().optional(),
  gastoPorNome: z.string().max(120).nullable().optional(),
  gastoPorColaboradorId: z.number().int().positive().nullable().optional(),
  favorecido: z.string().max(150).nullable().optional(),
  nfNumero: z.string().max(40).nullable().optional(),
  nfUrl: z.string().max(2000).nullable().optional(),
  observacoes: z.string().max(2000).nullable().optional(),
  dataVencimento: dataOpc,
  dataPagamento: dataOpc,
  status: z.enum(["pendente", "pago"]).optional(),
  repetirMeses: z.number().int().min(1).max(36).optional(),
});

async function prepararEntrada(db: any, input: z.infer<typeof entradaCusto>, permitidas: number[] | null) {
  const valor = parseValor(input.valor);
  const erros = validarCusto({
    valor: valor ?? 0, descricao: input.descricao, plantaId: input.plantaId ?? null, categoriaId: input.categoriaId,
    dataCompetencia: input.dataCompetencia, formaPagamento: input.formaPagamento, cartaoId: input.cartaoId,
  }, { plantaObrigatoria: false });
  if (erros.length) throw new TRPCError({ code: "BAD_REQUEST", message: erros[0] });
  exigirPlanta(permitidas, input.plantaId);

  const [cats] = (await db.$client.execute(
    `SELECT id, tipo_padrao, origem_automatica, ativa FROM custo_categorias WHERE id = ?`, [input.categoriaId]
  )) as any;
  const cat = (cats as any[])[0];
  if (!cat || !cat.ativa) throw new TRPCError({ code: "BAD_REQUEST", message: "Tipo de gasto inválido" });
  if (cat.origem_automatica) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Combustível é lançado no Controle de Abastecimento" });
  }
  return { valor: valor as number, tipo: input.tipo ?? (cat.tipo_padrao === "fixo" ? "fixo" : "variavel") };
}

const cel = z.union([z.string().max(1000), z.number(), z.null()]).optional();
const linhaImportacao = z.object({
  linha: z.number().int(),
  data: cel, planta: cel, categoria: cel, tipo: cel, descricao: cel, favorecido: cel, valor: cel, forma: cel,
  cartao: cel, quemGastou: cel, nfNumero: cel, vencimento: cel, pagoEm: cel, repetir: cel, observacoes: cel, centroCusto: cel, tipoCusto: cel, situacao: cel,
});

const limpa = (s: string | null | undefined) => (s && s.trim() ? s.trim() : null);

export const custosRouter = router({
  // Plantas que o usuário pode usar (respeita permissão por local).
  plantas: moduleProcedure(SLUG, MEUS).query(async ({ ctx }) => {
    const db = await getDbOrThrow();
    const permitidas = await plantasPermitidas(ctx as any);
    const [rows] = (await db.$client.execute(`SELECT id, name FROM gps_locations WHERE is_active = 1 ORDER BY name`)) as any;
    return (rows as any[])
      .filter((r) => !permitidas || permitidas.includes(r.id))
      .map((r) => ({ id: Number(r.id), nome: String(r.name) }));
  }),

  // Colaboradores ativos (para escolher "quem gastou"). userId permite pré-selecionar quem está logado.
  colaboradores: moduleProcedure(SLUG, MEUS).query(async () => {
    const db = await getDbOrThrow();
    const [rows] = (await db.$client.execute(
      `SELECT id, name, user_id FROM collaborators WHERE (active = 1 OR active IS NULL) ORDER BY name`
    )) as any;
    return (rows as any[]).map((r) => ({ id: Number(r.id), nome: String(r.name ?? "").trim(), userId: r.user_id ? Number(r.user_id) : null }))
      .filter((c) => c.nome);
  }),

  categorias: moduleProcedure(SLUG, MEUS)
    .input(z.object({ incluirInativas: z.boolean().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDbOrThrow();
      await ensureTables(db);
      const [rows] = (await db.$client.execute(
        `SELECT id, nome, tipo_padrao, origem_automatica, icone, ativa, ordem FROM custo_categorias
         ${input?.incluirInativas ? "" : "WHERE ativa = 1"} ORDER BY ordem, nome`
      )) as any;
      return (rows as any[]).map((r) => ({
        id: Number(r.id), nome: String(r.nome), tipoPadrao: r.tipo_padrao === "fixo" ? "fixo" as const : "variavel" as const,
        automatica: !!r.origem_automatica, icone: r.icone as string | null, ativa: !!r.ativa, ordem: Number(r.ordem),
      }));
    }),

  salvarCategoria: adminProcedure
    .input(z.object({
      id: z.number().int().positive().optional(),
      nome: z.string().trim().min(2).max(80),
      tipoPadrao: z.enum(["fixo", "variavel"]),
      ativa: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      const db = await getDbOrThrow();
      await ensureTables(db);
      try {
        if (input.id) {
          await db.$client.execute(
            `UPDATE custo_categorias SET nome = ?, tipo_padrao = ?, ativa = ? WHERE id = ?`,
            [input.nome, input.tipoPadrao, input.ativa ? 1 : 0, input.id]
          );
        } else {
          await db.$client.execute(
            `INSERT INTO custo_categorias (nome, tipo_padrao, ativa, ordem) VALUES (?, ?, ?, 50)`,
            [input.nome, input.tipoPadrao, input.ativa ? 1 : 0]
          );
        }
      } catch (e: any) {
        if (String(e?.code) === "ER_DUP_ENTRY") throw new TRPCError({ code: "CONFLICT", message: "Já existe um tipo de gasto com esse nome" });
        throw e;
      }
      return { ok: true };
    }),

  // Exclui um tipo de gasto que ninguém usa. Em uso: o correto é desativar (os gastos antigos mantêm o nome).
  excluirCategoria: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = await getDbOrThrow();
      await ensureTables(db);
      const [cat] = (await db.$client.execute(`SELECT nome, origem_automatica FROM custo_categorias WHERE id = ?`, [input.id])) as any;
      const c = (cat as any[])[0];
      if (!c) throw new TRPCError({ code: "NOT_FOUND", message: "Tipo de gasto não encontrado" });
      if (c.origem_automatica) throw new TRPCError({ code: "BAD_REQUEST", message: "Este tipo vem do Controle de Abastecimento e não pode ser excluído" });
      if (String(c.nome) === "Pedágio / TAG") throw new TRPCError({ code: "BAD_REQUEST", message: "Este tipo é usado pelos pedágios do extrato e não pode ser excluído" });
      const [uso] = (await db.$client.execute(`SELECT COUNT(*) AS n FROM custo_lancamentos WHERE categoria_id = ?`, [input.id])) as any;
      const n = Number((uso as any[])[0]?.n ?? 0);
      if (n > 0) throw new TRPCError({ code: "BAD_REQUEST", message: `Em uso por ${n} gasto(s). Desmarque "Ativo" para escondê-lo dos botões sem perder o histórico.` });
      await db.$client.execute(`DELETE FROM custo_categorias WHERE id = ?`, [input.id]);
      return { ok: true };
    }),

  // Exclui um cartão/conta que nenhum gasto usa.
  excluirCartao: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = await getDbOrThrow();
      await ensureTables(db);
      const [uso] = (await db.$client.execute(`SELECT COUNT(*) AS n FROM custo_lancamentos WHERE cartao_id = ?`, [input.id])) as any;
      const n = Number((uso as any[])[0]?.n ?? 0);
      if (n > 0) throw new TRPCError({ code: "BAD_REQUEST", message: `Em uso por ${n} gasto(s). Desmarque "Ativo" para escondê-lo sem perder o histórico.` });
      await db.$client.execute(`DELETE FROM custo_cartoes WHERE id = ?`, [input.id]);
      return { ok: true };
    }),

  cartoes: moduleProcedure(SLUG, MEUS)
    .input(z.object({ incluirInativos: z.boolean().optional() }).optional())
    .query(async ({ input, ctx }) => {
      const db = await getDbOrThrow();
      await ensureTables(db);
      // Quem só tem "Meus Gastos" escolhe o cartão pelo nome e final; banco e titular ficam restritos ao financeiro.
      let detalhes = ctx.user.role === "admin";
      if (!detalhes) {
        const p = await resolveUserPermissions(ctx.user.id, ctx.user.role);
        detalhes = p.modules === null || p.modules.includes(SLUG);
      }
      const [rows] = (await db.$client.execute(
        `SELECT id, nome, tipo, banco, final, titular, ativo FROM custo_cartoes ${input?.incluirInativos ? "" : "WHERE ativo = 1"} ORDER BY nome`
      )) as any;
      return (rows as any[]).map((r) => ({
        id: Number(r.id), nome: String(r.nome), tipo: String(r.tipo), banco: detalhes ? (r.banco as string | null) : null,
        final: r.final as string | null, titular: detalhes ? (r.titular as string | null) : null, ativo: !!r.ativo,
      }));
    }),

  salvarCartao: adminProcedure
    .input(z.object({
      id: z.number().int().positive().optional(),
      nome: z.string().trim().min(2).max(80),
      tipo: z.enum(["credito", "debito", "conta"]),
      banco: z.string().max(60).nullable().optional(),
      final: z.string().max(10).nullable().optional(),
      titular: z.string().max(100).nullable().optional(),
      ativo: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      const db = await getDbOrThrow();
      await ensureTables(db);
      const v = [input.nome, input.tipo, limpa(input.banco), limpa(input.final), limpa(input.titular), input.ativo ? 1 : 0];
      if (input.id) {
        await db.$client.execute(`UPDATE custo_cartoes SET nome=?, tipo=?, banco=?, final=?, titular=?, ativo=? WHERE id=?`, [...v, input.id]);
      } else {
        await db.$client.execute(`INSERT INTO custo_cartoes (nome, tipo, banco, final, titular, ativo) VALUES (?, ?, ?, ?, ?, ?)`, v);
      }
      return { ok: true };
    }),

  listar: moduleProcedure(SLUG)
    .input(z.object({
      mes: z.number().int().min(1).max(12),
      ano: z.number().int().min(2000).max(2100),
      plantaId: z.number().int().positive().optional(),
      categoriaId: z.number().int().positive().optional(),
      tipo: z.enum(["fixo", "variavel"]).optional(),
      status: z.enum(["pendente", "pago", "cancelado"]).optional(),
      formaPagamento: z.enum(FORMAS_PAGAMENTO).optional(),
      cartaoId: z.number().int().positive().optional(),
      busca: z.string().max(100).optional(),
      conferencia: z.enum(["pendente", "conferido", "devolvido"]).optional(),
      semPlanta: z.boolean().optional(),
      base: z.enum(["gasto", "vencimento"]).optional(),
      centroCusto: z.enum(["Financeiro/Administrativo", "Produção", "Logístico", "__nenhum"]).optional(),
      tipoCusto: z.enum(["direto", "indireto", "__nenhum"]).optional(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDbOrThrow();
      await ensureTables(db);
      const permitidas = await plantasPermitidas(ctx as any);
      const ini = `${input.ano}-${String(input.mes).padStart(2, "0")}-01`;
      const fim = new Date(Date.UTC(input.ano, input.mes, 0)).toISOString().slice(0, 10);
      try { await sincronizarPedagios(db, ini, fim); } catch (e: any) { console.warn("[custos] sincronizar pedágios:", e?.message); }
      const colData = input.base === "vencimento" ? "l.data_vencimento" : "l.data_competencia";
      const where: string[] = [`${colData} BETWEEN ? AND ?`];
      const params: any[] = [ini, fim];
      if (input.semPlanta) where.push("l.planta_id IS NULL");
      if (input.plantaId) { where.push("l.planta_id = ?"); params.push(input.plantaId); }
      if (permitidas) { where.push(`l.planta_id IN (${permitidas.map(() => "?").join(",")})`); params.push(...permitidas); }
      if (input.categoriaId) { where.push("l.categoria_id = ?"); params.push(input.categoriaId); }
      if (input.tipo) { where.push("l.tipo = ?"); params.push(input.tipo); }
      if (input.status) { where.push("l.status = ?"); params.push(input.status); }
      if (input.formaPagamento) { where.push("l.forma_pagamento = ?"); params.push(input.formaPagamento); }
      if (input.cartaoId) { where.push("l.cartao_id = ?"); params.push(input.cartaoId); }
      if (input.conferencia) { where.push("l.conferencia_status = ?"); params.push(input.conferencia); }
      if (input.centroCusto) { if (input.centroCusto === "__nenhum") where.push("l.centro_custo IS NULL"); else { where.push("l.centro_custo = ?"); params.push(input.centroCusto); } }
      if (input.tipoCusto) { if (input.tipoCusto === "__nenhum") where.push("l.tipo_custo IS NULL"); else { where.push("l.tipo_custo = ?"); params.push(input.tipoCusto); } }
      if (input.busca?.trim()) {
        where.push("(l.descricao LIKE ? OR l.favorecido LIKE ? OR l.nf_numero LIKE ? OR l.gasto_por_nome LIKE ?)");
        const b = `%${input.busca.trim()}%`;
        params.push(b, b, b, b);
      }
      const [rows] = (await db.$client.execute(
        `SELECT l.*, c.nome AS categoria_nome, c.icone AS categoria_icone, g.name AS planta_nome, k.nome AS cartao_nome
         FROM custo_lancamentos l
         LEFT JOIN custo_categorias c ON c.id = l.categoria_id
         LEFT JOIN gps_locations g ON g.id = l.planta_id
         LEFT JOIN custo_cartoes k ON k.id = l.cartao_id
         WHERE ${where.join(" AND ")}
         ORDER BY ${colData} DESC, l.id DESC LIMIT 1000`,
        params
      )) as any;
      const d = (v: any) => (v ? (v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10)) : null);
      const itens = (rows as any[]).map((r) => ({
        id: Number(r.id),
        dataCompetencia: d(r.data_competencia) as string,
        dataVencimento: d(r.data_vencimento),
        dataPagamento: d(r.data_pagamento),
        status: String(r.status) as "pendente" | "pago" | "cancelado",
        plantaId: r.planta_id ? Number(r.planta_id) : null,
        plantaNome: r.planta_nome as string | null,
        categoriaId: Number(r.categoria_id),
        categoriaNome: (r.categoria_nome as string | null) ?? "—",
        categoriaIcone: r.categoria_icone as string | null,
        centroCusto: (r.centro_custo as string | null) ?? null,
        tipoCusto: (r.tipo_custo as string | null) ?? null,
        tipo: r.tipo === "fixo" ? "fixo" as const : "variavel" as const,
        descricao: String(r.descricao),
        favorecido: r.favorecido as string | null,
        valor: Number(r.valor),
        formaPagamento: r.forma_pagamento as string | null,
        cartaoId: r.cartao_id ? Number(r.cartao_id) : null,
        cartaoNome: r.cartao_nome as string | null,
        gastoPorNome: r.gasto_por_nome as string | null,
        nfNumero: r.nf_numero as string | null,
        nfUrl: r.nf_url as string | null,
        observacoes: r.observacoes as string | null,
        origem: String(r.origem),
        serieId: (r.serie_id as string | null) ?? null,
        criadoPorNome: r.criado_por_nome as string | null,
        conferencia: (["conferido", "devolvido"].includes(r.conferencia_status) ? r.conferencia_status : "pendente") as "pendente" | "conferido" | "devolvido",
        conferidoPorNome: r.conferido_por_nome as string | null,
        conferidoEm: r.conferido_em ? (r.conferido_em instanceof Date ? r.conferido_em.toISOString() : String(r.conferido_em)) : null,
        conferenciaObs: r.conferencia_obs as string | null,
      }));
      const ativos = itens.filter((i) => i.status !== "cancelado");
      const soma = (f: (i: typeof itens[number]) => boolean) => Math.round(ativos.filter(f).reduce((s, i) => s + i.valor, 0) * 100) / 100;
      return {
        itens,
        resumo: {
          total: soma(() => true),
          pago: soma((i) => i.status === "pago"),
          pendente: soma((i) => i.status === "pendente"),
          fixo: soma((i) => i.tipo === "fixo"),
          variavel: soma((i) => i.tipo === "variavel"),
          semPlanta: ativos.filter((i) => i.plantaId === null).length,
          aguardandoConferencia: ativos.filter((i) => i.conferencia === "pendente").length,
          devolvidos: ativos.filter((i) => i.conferencia === "devolvido").length,
          semNota: ativos.filter((i) => !i.nfUrl && !i.nfNumero).length,
          quantidade: ativos.length,
        },
      };
    }),

  criar: moduleProcedure(SLUG)
    .input(entradaCusto)
    .mutation(async ({ input, ctx }) => {
      const db = await getDbOrThrow();
      await ensureTables(db);
      const permitidas = await plantasPermitidas(ctx as any);
      const { valor, tipo } = await prepararEntrada(db, input, permitidas);
      const status = input.status ?? "pago";
      const n = input.repetirMeses ?? 1;
      const serieId = n > 1 ? randomUUID() : null;
      let primeiroId = 0;
      for (let k = 0; k < n; k++) {
        // Uma data só: o vencimento (ou o dia do gasto, quando pago na hora). A competência acompanha.
        const venc = somarMeses(input.dataVencimento ?? input.dataCompetencia, k);
        const comp = venc;
        const st = k === 0 ? status : "pendente";
        const pag = k === 0 ? (input.dataPagamento ?? (status === "pago" ? (input.dataVencimento ?? input.dataCompetencia) : null)) : null;
        const [res] = (await db.$client.execute(
          `INSERT INTO custo_lancamentos
           (data_competencia, data_vencimento, data_pagamento, status, planta_id, categoria_id, tipo, descricao, favorecido, valor,
            forma_pagamento, cartao_id, gasto_por_colaborador_id, gasto_por_nome, nf_numero, nf_url, observacoes, origem, criado_por, criado_por_nome, serie_id)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'manual', ?, ?, ?)`,
          [
            comp, venc, pag, st, input.plantaId ?? null, input.categoriaId, tipo, input.descricao.trim(), limpa(input.favorecido), valor,
            input.formaPagamento ?? null, exigeCartao(input.formaPagamento) ? input.cartaoId ?? null : null,
            input.gastoPorColaboradorId ?? null, limpa(input.gastoPorNome) ?? (ctx.user as any).name ?? null,
            k === 0 ? limpa(input.nfNumero) : null, k === 0 ? limpa(input.nfUrl) : null, limpa(input.observacoes),
            ctx.user.id ?? null, (ctx.user as any).name ?? null, serieId,
          ]
        )) as any;
        if (k === 0) primeiroId = Number((res as any).insertId);
      }
      return { id: primeiroId, criados: n };
    }),

  editar: moduleProcedure(SLUG)
    .input(entradaCusto.extend({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDbOrThrow();
      await ensureTables(db);
      const permitidas = await plantasPermitidas(ctx as any);
      const [atual] = (await db.$client.execute(`SELECT planta_id, origem FROM custo_lancamentos WHERE id = ?`, [input.id])) as any;
      const reg = (atual as any[])[0];
      if (!reg) throw new TRPCError({ code: "NOT_FOUND", message: "Lançamento não encontrado" });
      exigirPlanta(permitidas, reg.planta_id);
      if (reg.origem === "extrato_pedagio") {
        exigirPlanta(permitidas, input.plantaId);
        await db.$client.execute(
          `UPDATE custo_lancamentos SET planta_id=?, nf_numero=?, nf_url=?, observacoes=? WHERE id=?`,
          [input.plantaId ?? null, limpa(input.nfNumero), limpa(input.nfUrl), limpa(input.observacoes), input.id]
        );
        return { ok: true };
      }
      const { valor, tipo } = await prepararEntrada(db, input, permitidas);
      await db.$client.execute(
        `UPDATE custo_lancamentos SET data_competencia=?, data_vencimento=?, data_pagamento=?, status=COALESCE(?, status), planta_id=?, categoria_id=?,
           tipo=?, descricao=?, favorecido=?, valor=?, forma_pagamento=?, cartao_id=?, gasto_por_colaborador_id=?, gasto_por_nome=?,
           nf_numero=?, nf_url=?, observacoes=?,
           conferencia_status='pendente', conferido_por=NULL, conferido_por_nome=NULL, conferido_em=NULL WHERE id=?`,
        [
          input.dataVencimento ?? input.dataCompetencia, input.dataVencimento ?? input.dataCompetencia, input.dataPagamento ?? null, input.status ?? null,
          input.plantaId ?? null, input.categoriaId, tipo, input.descricao.trim(), limpa(input.favorecido), valor,
          input.formaPagamento ?? null, exigeCartao(input.formaPagamento) ? input.cartaoId ?? null : null,
          input.gastoPorColaboradorId ?? null, limpa(input.gastoPorNome), limpa(input.nfNumero), limpa(input.nfUrl),
          limpa(input.observacoes), input.id,
        ]
      );
      return { ok: true };
    }),

  // ── Conferência: uma pessoa designada confere se o gasto foi preenchido corretamente ──
  minhaConferencia: moduleProcedure(SLUG).query(async ({ ctx }) => {
    const db = await getDbOrThrow();
    await ensureTables(db);
    return { podeConferir: await ehConferente(db, ctx as any) };
  }),

  conferir: moduleProcedure(SLUG)
    .input(z.object({
      ids: z.array(z.number().int().positive()).min(1).max(200),
      resultado: z.enum(["conferido", "devolvido"]),
      motivo: z.string().trim().max(500).optional(),
      centroCusto: z.enum(CENTROS_CUSTO).optional(), // obrigatório ao conferir: escolha manual
      tipoCusto: z.enum(["direto", "indireto"]).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDbOrThrow();
      await ensureTables(db);
      if (!(await ehConferente(db, ctx as any))) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Só o responsável pela conferência pode fazer isso" });
      }
      if (input.resultado === "devolvido" && !input.motivo) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Explique o que precisa ser corrigido" });
      }
      if (input.resultado === "conferido" && !input.centroCusto) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Escolha o centro de custo" });
      }
      const permitidas = await plantasPermitidas(ctx as any);
      const marcas = input.ids.map(() => "?").join(",");
      const [rows] = (await db.$client.execute(`SELECT id, planta_id FROM custo_lancamentos WHERE id IN (${marcas})`, input.ids)) as any;
      for (const r of rows as any[]) exigirPlanta(permitidas, r.planta_id);
      if (input.resultado === "conferido") {
        await db.$client.execute(
          `UPDATE custo_lancamentos SET conferencia_status = ?, conferido_por = ?, conferido_por_nome = ?, conferido_em = NOW(), conferencia_obs = NULL, centro_custo = ?, tipo_custo = COALESCE(?, tipo_custo)
           WHERE id IN (${marcas}) AND status <> 'cancelado'`,
          [input.resultado, ctx.user.id, (ctx.user as any).name ?? null, input.centroCusto, input.tipoCusto ?? null, ...input.ids]
        );
      } else {
        await db.$client.execute(
          `UPDATE custo_lancamentos SET conferencia_status = ?, conferido_por = ?, conferido_por_nome = ?, conferido_em = NOW(), conferencia_obs = ?
           WHERE id IN (${marcas}) AND status <> 'cancelado'`,
          [input.resultado, ctx.user.id, (ctx.user as any).name ?? null, input.motivo, ...input.ids]
        );
      }
      return { ok: true, total: (rows as any[]).length };
    }),

  // Edição direta de uma célula da tabela: só quem confere os gastos (e administradores).
  // Pedágios do extrato só aceitam local, complemento, nº documento e centro de custo.
  editarCampo: moduleProcedure(SLUG)
    .input(z.object({
      id: z.number().int().positive(),
      campo: z.enum(["dataCompetencia", "dataVencimento", "dataPagamento", "descricao", "observacoes", "nfNumero", "centroCusto", "tipoCusto", "categoriaId", "plantaId", "tipo", "valor", "gastoPorColaboradorId", "formaPagamento"]),
      valor: z.union([z.string().max(2000), z.number(), z.null()]),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDbOrThrow();
      await ensureTables(db);
      if (!(await ehConferente(db, ctx as any))) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Só quem confere os gastos pode editar direto na tabela" });
      }
      const permitidas = await plantasPermitidas(ctx as any);
      const [rows] = (await db.$client.execute(`SELECT id, planta_id, origem, status FROM custo_lancamentos WHERE id = ?`, [input.id])) as any;
      const reg = (rows as any[])[0];
      if (!reg) throw new TRPCError({ code: "NOT_FOUND", message: "Lançamento não encontrado" });
      if (reg.status === "cancelado") throw new TRPCError({ code: "BAD_REQUEST", message: "Gasto cancelado não pode ser editado" });
      exigirPlanta(permitidas, reg.planta_id);
      if (reg.origem === "extrato_pedagio" && !["plantaId", "observacoes", "nfNumero", "centroCusto", "tipoCusto"].includes(input.campo)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Este pedágio veio do extrato: só local, complemento, nº documento e centro de custo podem mudar" });
      }
      const erro = (m: string) => new TRPCError({ code: "BAD_REQUEST", message: m });
      const v = input.valor;
      const s = v === null || v === undefined ? "" : String(v).trim();
      const sets: [string, any][] = [];
      switch (input.campo) {
        case "dataCompetencia":
        case "dataVencimento": // uma data só: vencimento e competência andam juntos
          if (!dataValida(s)) throw erro("Data inválida");
          sets.push(["data_vencimento", s], ["data_competencia", s]);
          break;
        case "dataPagamento": // informar a data paga marca como pago; apagar volta para "a pagar"
          if (s && !dataValida(s)) throw erro("Data inválida");
          sets.push(["data_pagamento", s || null], ["status", s ? "pago" : "pendente"]);
          break;
        case "descricao": if (!s) throw erro("A descrição não pode ficar vazia"); sets.push(["descricao", s.slice(0, 255)]); break;
        case "observacoes": sets.push(["observacoes", s || null]); break;
        case "nfNumero": sets.push(["nf_numero", s ? s.slice(0, 40) : null]); break;
        case "centroCusto":
          if (s && !(CENTROS_CUSTO as readonly string[]).includes(s)) throw erro("Centro de custo inválido");
          sets.push(["centro_custo", s || null]);
          break;
        case "tipoCusto": // Custo Direto ou Custo Indireto
          if (s && s !== "direto" && s !== "indireto") throw erro("Valor inválido");
          sets.push(["tipo_custo", s || null]);
          break;
        case "tipo": if (s !== "fixo" && s !== "variavel") throw erro("Valor inválido"); sets.push(["tipo", s]); break;
        case "valor": { const n = parseValor(v); if (n === null || n <= 0) throw erro("Valor inválido"); sets.push(["valor", n]); break; }
        case "gastoPorColaboradorId": {
          if (!s) { sets.push(["gasto_por_colaborador_id", null], ["gasto_por_nome", null]); break; }
          const id = Number(s);
          const [c] = (await db.$client.execute(`SELECT id, name FROM collaborators WHERE id = ? AND (active = 1 OR active IS NULL)`, [id])) as any;
          const colab = (c as any[])[0];
          if (!colab) throw erro("Escolha um colaborador cadastrado");
          sets.push(["gasto_por_colaborador_id", id], ["gasto_por_nome", String(colab.name ?? "").trim().slice(0, 120)]);
          break;
        }
        case "formaPagamento": {
          if (s.startsWith("cartao:")) { // escolheu um cartão/conta cadastrado: define a forma pelo tipo dele e guarda o cartão
            const id = Number(s.slice(7));
            const [k] = (await db.$client.execute(`SELECT id, tipo FROM custo_cartoes WHERE id = ? AND ativo = 1`, [id])) as any;
            const card = (k as any[])[0];
            if (!card) throw erro("Cartão inválido");
            const forma = card.tipo === "debito" ? "cartao_debito" : card.tipo === "conta" ? "debito_conta" : "cartao_credito";
            sets.push(["forma_pagamento", forma], ["cartao_id", id]);
            break;
          }
          if (s && !(FORMAS_PAGAMENTO as readonly string[]).includes(s)) throw erro("Forma de pagamento inválida");
          sets.push(["forma_pagamento", s || null]);
          if (!exigeCartao(s)) sets.push(["cartao_id", null]);
          break;
        }
        case "categoriaId": {
          const id = Number(s);
          const [c] = (await db.$client.execute(`SELECT id, origem_automatica, ativa FROM custo_categorias WHERE id = ?`, [id])) as any;
          const cat = (c as any[])[0];
          if (!cat || !cat.ativa) throw erro("Categoria inválida");
          if (cat.origem_automatica) throw erro("Combustível é lançado no Controle de Abastecimento");
          sets.push(["categoria_id", id]);
          break;
        }
        case "plantaId": {
          if (!s) { sets.push(["planta_id", null]); break; }
          const id = Number(s);
          exigirPlanta(permitidas, id);
          const [l] = (await db.$client.execute(`SELECT id FROM gps_locations WHERE id = ?`, [id])) as any;
          if (!(l as any[])[0]) throw erro("Local inválido");
          sets.push(["planta_id", id]);
          break;
        }
      }
      await db.$client.execute(
        `UPDATE custo_lancamentos SET ${sets.map(([c]) => `${c} = ?`).join(", ")} WHERE id = ?`,
        [...sets.map(([, val]) => val), input.id]
      );
      return { ok: true };
    }),

  // Administrador: quem são os responsáveis pela conferência.
  conferentesConfig: adminProcedure.query(async () => {
    const db = await getDbOrThrow();
    await ensureTables(db);
    const [sel] = (await db.$client.execute(`SELECT user_id FROM custo_conferentes`)) as any;
    const [us] = (await db.$client.execute(
      `SELECT u.id, u.name, u.role, c.name AS colaborador
       FROM users u LEFT JOIN collaborators c ON c.user_id = u.id AND (c.active = 1 OR c.active IS NULL) ORDER BY COALESCE(c.name, u.name)`
    )) as any;
    const vistos = new Set<number>();
    const usuarios: { id: number; nome: string }[] = [];
    for (const u of us as any[]) {
      if (vistos.has(u.id)) continue;
      vistos.add(u.id);
      if (u.role !== "admin") {
        try {
          const p = await resolveUserPermissions(u.id, u.role);
          if (p.modules !== null && !p.modules.includes(SLUG)) continue;
        } catch { continue; }
      }
      usuarios.push({ id: Number(u.id), nome: String(u.colaborador || u.name).trim() });
    }
    return { usuarios, selecionados: (sel as any[]).map((r) => Number(r.user_id)) };
  }),

  salvarConferentes: adminProcedure
    .input(z.object({ userIds: z.array(z.number().int().positive()).max(50) }))
    .mutation(async ({ input }) => {
      const db = await getDbOrThrow();
      await ensureTables(db);
      await db.$client.execute(`DELETE FROM custo_conferentes`);
      for (const id of input.userIds) await db.$client.execute(`INSERT IGNORE INTO custo_conferentes (user_id) VALUES (?)`, [id]);
      return { ok: true };
    }),

  // ── Módulo "Meus Gastos": o colaborador lança os PRÓPRIOS gastos. Eles entram em Contas a Pagar como "aguardando conferência". ──
  meusListar: moduleProcedure(MEUS)
    .input(z.object({ mes: z.number().int().min(1).max(12), ano: z.number().int().min(2000).max(2100) }))
    .query(async ({ input, ctx }) => {
      const db = await getDbOrThrow();
      await ensureTables(db);
      const ini = `${input.ano}-${String(input.mes).padStart(2, "0")}-01`;
      const fim = new Date(Date.UTC(input.ano, input.mes, 0)).toISOString().slice(0, 10);
      const [rows] = (await db.$client.execute(
        `SELECT l.*, c.nome AS categoria_nome, g.name AS planta_nome, k.nome AS cartao_nome
         FROM custo_lancamentos l
         LEFT JOIN custo_categorias c ON c.id = l.categoria_id
         LEFT JOIN gps_locations g ON g.id = l.planta_id
         LEFT JOIN custo_cartoes k ON k.id = l.cartao_id
         WHERE l.criado_por = ? AND l.data_competencia BETWEEN ? AND ?
         ORDER BY l.data_competencia DESC, l.id DESC LIMIT 500`,
        [ctx.user.id, ini, fim]
      )) as any;
      const d = (v: any) => (v ? (v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10)) : null);
      const itens = (rows as any[]).map((r) => {
        const conferencia = (["conferido", "devolvido"].includes(r.conferencia_status) ? r.conferencia_status : "pendente") as "pendente" | "conferido" | "devolvido";
        return {
          id: Number(r.id), dataCompetencia: d(r.data_competencia) as string, dataVencimento: d(r.data_vencimento), dataPagamento: d(r.data_pagamento),
          status: String(r.status) as "pendente" | "pago" | "cancelado",
          plantaId: r.planta_id ? Number(r.planta_id) : null, plantaNome: r.planta_nome as string | null,
          categoriaId: Number(r.categoria_id), categoriaNome: (r.categoria_nome as string | null) ?? "—",
          tipo: r.tipo === "fixo" ? "fixo" as const : "variavel" as const,
          descricao: String(r.descricao), favorecido: r.favorecido as string | null, valor: Number(r.valor),
          formaPagamento: r.forma_pagamento as string | null, cartaoId: r.cartao_id ? Number(r.cartao_id) : null, cartaoNome: r.cartao_nome as string | null,
          gastoPorNome: r.gasto_por_nome as string | null, nfNumero: r.nf_numero as string | null, nfUrl: r.nf_url as string | null,
          observacoes: r.observacoes as string | null, origem: String(r.origem),
          conferencia, conferidoPorNome: r.conferido_por_nome as string | null, conferenciaObs: r.conferencia_obs as string | null,
          // só dá para alterar enquanto ainda não foi conferido
          editavel: r.status !== "cancelado" && conferencia !== "conferido" && r.origem !== "extrato_pedagio",
        };
      });
      const ativos = itens.filter((i) => i.status !== "cancelado");
      return {
        itens,
        resumo: {
          total: Math.round(ativos.reduce((s, i) => s + i.valor, 0) * 100) / 100,
          quantidade: ativos.length,
          aguardando: ativos.filter((i) => i.conferencia === "pendente").length,
          devolvidos: ativos.filter((i) => i.conferencia === "devolvido").length,
          conferidos: ativos.filter((i) => i.conferencia === "conferido").length,
        },
      };
    }),

  meusCriar: moduleProcedure(MEUS)
    .input(entradaCusto.omit({ repetirMeses: true, status: true, dataVencimento: true, dataPagamento: true }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDbOrThrow();
      await ensureTables(db);
      const permitidas = await plantasPermitidas(ctx as any);
      const { valor, tipo } = await prepararEntrada(db, input as any, permitidas);
      const [res] = (await db.$client.execute(
        `INSERT INTO custo_lancamentos
         (data_competencia, data_pagamento, status, planta_id, categoria_id, tipo, descricao, favorecido, valor,
          forma_pagamento, cartao_id, gasto_por_nome, nf_numero, nf_url, observacoes, origem, criado_por, criado_por_nome)
         VALUES (?,?, 'pago', ?,?,?,?,?,?,?,?,?,?,?,?, 'colaborador', ?, ?)`,
        [
          input.dataCompetencia, input.dataCompetencia, input.plantaId ?? null, input.categoriaId, tipo, input.descricao.trim(), limpa(input.favorecido), valor,
          input.formaPagamento ?? null, exigeCartao(input.formaPagamento) ? input.cartaoId ?? null : null,
          limpa(input.gastoPorNome) ?? (ctx.user as any).name ?? null, limpa(input.nfNumero), limpa(input.nfUrl), limpa(input.observacoes),
          ctx.user.id ?? null, (ctx.user as any).name ?? null,
        ]
      )) as any;
      const novoId = Number((res as any).insertId);
      await db.$client.execute(`UPDATE custo_lancamentos SET data_vencimento = data_competencia WHERE id = ?`, [novoId]);
      return { id: novoId, criados: 1 };
    }),

  meusEditar: moduleProcedure(MEUS)
    .input(entradaCusto.omit({ repetirMeses: true, status: true, dataVencimento: true, dataPagamento: true }).extend({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDbOrThrow();
      await ensureTables(db);
      const permitidas = await plantasPermitidas(ctx as any);
      const [atual] = (await db.$client.execute(`SELECT criado_por, conferencia_status, status FROM custo_lancamentos WHERE id = ?`, [input.id])) as any;
      const reg = (atual as any[])[0];
      if (!reg || Number(reg.criado_por) !== Number(ctx.user.id)) throw new TRPCError({ code: "NOT_FOUND", message: "Lançamento não encontrado" });
      if (reg.status === "cancelado") throw new TRPCError({ code: "BAD_REQUEST", message: "Este gasto foi cancelado" });
      if (reg.conferencia_status === "conferido") throw new TRPCError({ code: "BAD_REQUEST", message: "Este gasto já foi conferido e não pode mais ser alterado" });
      const { valor, tipo } = await prepararEntrada(db, input as any, permitidas);
      await db.$client.execute(
        `UPDATE custo_lancamentos SET data_competencia=?, data_pagamento=?, planta_id=?, categoria_id=?, tipo=?, descricao=?, favorecido=?, valor=?,
           forma_pagamento=?, cartao_id=?, gasto_por_nome=?, nf_numero=?, nf_url=?, observacoes=?,
           conferencia_status='pendente', conferido_por=NULL, conferido_por_nome=NULL, conferido_em=NULL WHERE id=?`,
        [
          input.dataCompetencia, input.dataCompetencia, input.plantaId ?? null, input.categoriaId, tipo, input.descricao.trim(), limpa(input.favorecido), valor,
          input.formaPagamento ?? null, exigeCartao(input.formaPagamento) ? input.cartaoId ?? null : null,
          limpa(input.gastoPorNome), limpa(input.nfNumero), limpa(input.nfUrl), limpa(input.observacoes), input.id,
        ]
      );
      await db.$client.execute(`UPDATE custo_lancamentos SET data_vencimento = data_competencia WHERE id = ?`, [input.id]);
      return { ok: true };
    }),

  meusCancelar: moduleProcedure(MEUS)
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDbOrThrow();
      await ensureTables(db);
      const [res] = (await db.$client.execute(
        `UPDATE custo_lancamentos SET status = 'cancelado' WHERE id = ? AND criado_por = ? AND conferencia_status <> 'conferido'`,
        [input.id, ctx.user.id]
      )) as any;
      if (!Number((res as any).affectedRows)) throw new TRPCError({ code: "BAD_REQUEST", message: "Este gasto já foi conferido ou não é seu" });
      return { ok: true };
    }),

  // Importação por planilha: com confirmar=false só mostra a prévia (nada é gravado); com confirmar=true grava as linhas válidas.
  // Nunca apaga nada. Reimportar o mesmo arquivo não duplica (hash por lançamento).
  importar: moduleProcedure(SLUG)
    .input(z.object({
      arquivo: z.string().max(200).default("planilha"),
      linhas: z.array(linhaImportacao).min(1).max(2000),
      confirmar: z.boolean().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDbOrThrow();
      await ensureTables(db);
      const permitidas = await plantasPermitidas(ctx as any);

      const [pl] = (await db.$client.execute(`SELECT id, name FROM gps_locations WHERE is_active = 1`)) as any;
      const [ct] = (await db.$client.execute(`SELECT id, nome, tipo_padrao, origem_automatica FROM custo_categorias WHERE ativa = 1`)) as any;
      const [ca] = (await db.$client.execute(`SELECT id, nome FROM custo_cartoes WHERE ativo = 1`)) as any;
      const [co] = (await db.$client.execute(`SELECT id, name FROM collaborators WHERE (active = 1 OR active IS NULL)`)) as any;
      const lookup = {
        plantas: (pl as any[]).map((r) => ({ id: Number(r.id), nome: String(r.name) })),
        categorias: (ct as any[]).map((r) => ({ id: Number(r.id), nome: String(r.nome), tipoPadrao: r.tipo_padrao === "fixo" ? "fixo" as const : "variavel" as const, automatica: !!r.origem_automatica })),
        cartoes: (ca as any[]).map((r) => ({ id: Number(r.id), nome: String(r.nome) })),
        colaboradores: (co as any[]).map((r) => ({ id: Number(r.id), nome: String(r.name ?? "").trim() })).filter((c) => c.nome),
        plantasPermitidas: permitidas,
      };

      // 1) interpreta e valida cada linha
      const porLinha = new Map<number, { erro?: string; itens: LancamentoPronto[] }>();
      const todos: LancamentoPronto[] = [];
      for (const r of input.linhas) {
        const res = interpretarLinha(r as any, lookup);
        if ("erro" in res) porLinha.set(r.linha, { erro: res.erro, itens: [] });
        else { porLinha.set(r.linha, { itens: res.itens }); todos.push(...res.itens); }
      }
      const comHash = atribuirHashes(todos);

      // 2) o que já existe no banco (por hash)
      const existentes = new Set<string>();
      for (let i = 0; i < comHash.length; i += 500) {
        const lote = comHash.slice(i, i + 500).map((x) => x.hash);
        if (!lote.length) continue;
        const [rows] = (await db.$client.execute(
          `SELECT hash_importacao FROM custo_lancamentos WHERE hash_importacao IN (${lote.map(() => "?").join(",")})`, lote
        )) as any;
        for (const r of rows as any[]) existentes.add(String(r.hash_importacao).trim());
      }
      const novos = comHash.filter((x) => !existentes.has(x.hash));

      // 3) resultado por linha
      const novosPorLinha = new Map<number, number>();
      for (const n of novos) novosPorLinha.set(n.linha, (novosPorLinha.get(n.linha) ?? 0) + 1);
      const linhas = input.linhas.map((r) => {
        const p = porLinha.get(r.linha)!;
        if (p.erro) return { linha: r.linha, situacao: "erro" as const, mensagem: p.erro, novos: 0 };
        const n = novosPorLinha.get(r.linha) ?? 0;
        if (n === 0) return { linha: r.linha, situacao: "duplicada" as const, mensagem: "Já foi importada antes", novos: 0 };
        return {
          linha: r.linha, situacao: "ok" as const, novos: n,
          mensagem: p.itens.length > 1 ? `${n} de ${p.itens.length} meses serão criados` : "Pronta para importar",
        };
      });
      const resumo = {
        linhasLidas: linhas.length,
        validas: linhas.filter((l) => l.situacao === "ok").length,
        erros: linhas.filter((l) => l.situacao === "erro").length,
        duplicadas: linhas.filter((l) => l.situacao === "duplicada").length,
        lancamentosNovos: novos.length,
      };
      if (!input.confirmar) return { resumo, linhas, importacaoId: null as number | null };

      // 4) grava só o que é novo e válido
      const [imp] = (await db.$client.execute(
        `INSERT INTO custo_importacoes (arquivo, linhas_lidas, usuario_id, usuario_nome) VALUES (?, ?, ?, ?)`,
        [input.arquivo, resumo.linhasLidas, ctx.user.id ?? null, (ctx.user as any).name ?? null]
      )) as any;
      const importacaoId = Number((imp as any).insertId);
      let criados = 0;
      for (const n of novos) {
        const [res] = (await db.$client.execute(
          `INSERT IGNORE INTO custo_lancamentos
           (data_competencia, data_vencimento, data_pagamento, status, planta_id, categoria_id, tipo, descricao, favorecido, valor,
            forma_pagamento, cartao_id, gasto_por_nome, gasto_por_colaborador_id, nf_numero, observacoes, centro_custo, tipo_custo, origem, importacao_id, hash_importacao, criado_por, criado_por_nome)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'importacao', ?, ?, ?, ?)`,
          [
            n.dataCompetencia, n.dataVencimento, n.dataPagamento, n.status, n.plantaId, n.categoriaId, n.tipo, n.descricao, n.favorecido, n.valor,
            n.formaPagamento, n.cartaoId, n.gastoPorNome ?? (ctx.user as any).name ?? null, n.gastoPorColaboradorId, n.nfNumero, n.observacoes, n.centroCusto, n.tipoCusto,
            importacaoId, n.hash, ctx.user.id ?? null, (ctx.user as any).name ?? null,
          ]
        )) as any;
        criados += Number((res as any).affectedRows ?? 0);
      }
      await db.$client.execute(
        `UPDATE custo_importacoes SET lancamentos_criados = ?, duplicados = ?, erros = ? WHERE id = ?`,
        [criados, resumo.duplicadas, resumo.erros, importacaoId]
      );
      return { resumo: { ...resumo, lancamentosNovos: criados }, linhas, importacaoId };
    }),

  // Dashboard: custo por fonte e planta + receita por planta no período (a tela escolhe quais fontes somar).
  dashboardPlanta: moduleProcedure(SLUG)
    .input(z.object({
      inicio: z.string().refine(dataValida, "Data inválida"),
      fim: z.string().refine(dataValida, "Data inválida"),
    }))
    .query(async ({ input, ctx }) => {
      if (input.fim < input.inicio) throw new TRPCError({ code: "BAD_REQUEST", message: "O fim do período é anterior ao início" });
      const db = await getDbOrThrow();
      await ensureTables(db);
      const permitidas = await plantasPermitidas(ctx as any);
      try { await sincronizarPedagios(db, input.inicio, input.fim); } catch { /* o dashboard segue com o que já existe */ }
      // Folha e diárias usam a própria conta da tela de Folha de Pagamento, que é restrita a administradores.
      const meses = (Date.UTC(+input.fim.slice(0, 4), +input.fim.slice(5, 7) - 1, 1) - Date.UTC(+input.inicio.slice(0, 4), +input.inicio.slice(5, 7) - 1, 1)) / (30 * 86400000);
      if (meses > 36) throw new TRPCError({ code: "BAD_REQUEST", message: "Escolha no máximo 36 meses" });
      let getFolhaMes: ((ym: string) => Promise<any[]>) | undefined;
      if ((ctx.user as any).role === "admin") {
        const { payrollRouter } = await import("./payroll");
        const caller = payrollRouter.createCaller(ctx as any);
        getFolhaMes = async (ym) => (await caller.getMonth({ referenceMonth: ym })).rows as any[];
      }
      const r = await custoPorPlanta(db as any, input.inicio, input.fim, { getFolhaMes });
      const visivel = (p: number | null) => !permitidas || (p !== null && permitidas.includes(p));
      const [pl] = (await db.$client.execute(`SELECT id, name FROM gps_locations`)) as any;
      const nomes: Record<number, string> = {};
      for (const x of pl as any[]) nomes[Number(x.id)] = String(x.name);
      return {
        linhas: r.linhas.filter((l) => visivel(l.plantaId)),
        receita: r.receita.filter((l) => visivel(l.plantaId)),
        nomes,
        alertas: permitidas ? [] : r.alertas,
        erros: r.erros,
      };
    }),

  // Traz do extrato os pedágios (TAG) dos últimos 12 meses até o mês informado.
  atualizarPedagios: moduleProcedure(SLUG)
    .input(z.object({ mes: z.number().int().min(1).max(12), ano: z.number().int().min(2000).max(2100) }))
    .mutation(async ({ input }) => {
      const db = await getDbOrThrow();
      await ensureTables(db);
      const fim = new Date(Date.UTC(input.ano, input.mes, 0)).toISOString().slice(0, 10);
      const ini = new Date(Date.UTC(input.ano, input.mes - 12, 1)).toISOString().slice(0, 10);
      return { criados: await sincronizarPedagios(db, ini, fim, true) };
    }),

  pedagioConfig: moduleProcedure(SLUG).query(async () => {
    const db = await getDbOrThrow();
    await ensureTables(db);
    const [cfg] = (await db.$client.execute(`SELECT valor FROM custo_config WHERE chave = 'pedagio_planta_padrao'`)) as any;
    return { plantaPadraoId: Number((cfg as any[])[0]?.valor) || null };
  }),

  salvarPedagioConfig: adminProcedure
    .input(z.object({ plantaPadraoId: z.number().int().positive().nullable() }))
    .mutation(async ({ input }) => {
      const db = await getDbOrThrow();
      await ensureTables(db);
      await db.$client.execute(
        `INSERT INTO custo_config (chave, valor) VALUES ('pedagio_planta_padrao', ?) ON DUPLICATE KEY UPDATE valor = VALUES(valor)`,
        [input.plantaPadraoId ? String(input.plantaPadraoId) : null]
      );
      return { ok: true };
    }),

  // Atribui o local a vários gastos de uma vez (os cancelados ficam de fora).
  atribuirPlanta: moduleProcedure(SLUG)
    .input(z.object({ ids: z.array(z.number().int().positive()).min(1).max(500), plantaId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDbOrThrow();
      await ensureTables(db);
      exigirPlanta(await plantasPermitidas(ctx as any), input.plantaId);
      const [res] = (await db.$client.execute(
        `UPDATE custo_lancamentos SET planta_id = ? WHERE status <> 'cancelado' AND id IN (${input.ids.map(() => "?").join(",")})`,
        [input.plantaId, ...input.ids]
      )) as any;
      return { atualizados: Number((res as any).affectedRows ?? 0) };
    }),

  // Exclusão DEFINITIVA (só administrador). Antes de apagar, guarda uma cópia do lançamento em custo_exclusoes.
  // Pedágios vindos do extrato não se excluem (voltariam na próxima atualização): para esses, use Cancelar.
  excluir: adminProcedure
    .input(z.object({ id: z.number().int().positive(), serie: z.boolean().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDbOrThrow();
      await ensureTables(db);
      const [rows] = (await db.$client.execute(`SELECT * FROM custo_lancamentos WHERE id = ?`, [input.id])) as any;
      const reg = (rows as any[])[0];
      if (!reg) throw new TRPCError({ code: "NOT_FOUND", message: "Lançamento não encontrado" });
      if (reg.origem === "extrato_pedagio") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Pedágios do extrato não podem ser excluídos (voltariam na próxima atualização). Use Cancelar." });
      }
      let alvo: any[] = [reg];
      if (input.serie && reg.serie_id) {
        const [mais] = (await db.$client.execute(
          `SELECT * FROM custo_lancamentos WHERE serie_id = ? AND data_competencia > ? AND status = 'pendente' AND id <> ?`,
          [reg.serie_id, reg.data_competencia, reg.id]
        )) as any;
        alvo = [reg, ...(mais as any[])];
      }
      for (const r of alvo) {
        await db.$client.execute(
          `INSERT INTO custo_exclusoes (lancamento_id, dados_json, excluido_por, excluido_por_nome) VALUES (?, ?, ?, ?)`,
          [r.id, JSON.stringify(r), ctx.user.id ?? null, (ctx.user as any).name ?? null]
        );
      }
      await db.$client.execute(`DELETE FROM custo_lancamentos WHERE id IN (${alvo.map(() => "?").join(",")})`, alvo.map((r) => r.id));
      return { excluidos: alvo.length };
    }),

  // Cancela este lançamento e os próximos da mesma série (repetição mensal) que ainda não foram pagos.
  cancelarSerie: moduleProcedure(SLUG)
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDbOrThrow();
      await ensureTables(db);
      const permitidas = await plantasPermitidas(ctx as any);
      const [atual] = (await db.$client.execute(`SELECT planta_id, serie_id, data_competencia FROM custo_lancamentos WHERE id = ?`, [input.id])) as any;
      const reg = (atual as any[])[0];
      if (!reg) throw new TRPCError({ code: "NOT_FOUND", message: "Lançamento não encontrado" });
      exigirPlanta(permitidas, reg.planta_id);
      if (!reg.serie_id) throw new TRPCError({ code: "BAD_REQUEST", message: "Este gasto não faz parte de uma repetição" });
      const [res] = (await db.$client.execute(
        `UPDATE custo_lancamentos SET status = 'cancelado' WHERE serie_id = ? AND data_competencia >= ? AND status = 'pendente'`,
        [reg.serie_id, reg.data_competencia]
      )) as any;
      return { cancelados: Number((res as any).affectedRows ?? 0) };
    }),

  // "Excluir" não apaga: marca como cancelado (e permite reativar / desfazer).
  alterarStatus: moduleProcedure(SLUG)
    .input(z.object({
      id: z.number().int().positive(),
      status: z.enum(["pendente", "pago", "cancelado"]),
      dataPagamento: dataOpc,
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDbOrThrow();
      await ensureTables(db);
      const permitidas = await plantasPermitidas(ctx as any);
      const [atual] = (await db.$client.execute(`SELECT planta_id FROM custo_lancamentos WHERE id = ?`, [input.id])) as any;
      const reg = (atual as any[])[0];
      if (!reg) throw new TRPCError({ code: "NOT_FOUND", message: "Lançamento não encontrado" });
      exigirPlanta(permitidas, reg.planta_id);
      const hoje = new Date().toISOString().slice(0, 10);
      // A decisão "marcar pago define a data de pagamento" é tomada aqui, sem comparar texto no SQL
      // (parâmetro × literal mistura collations do banco e dá "Illegal mix of collations").
      if (input.status === "pago") {
        await db.$client.execute(
          `UPDATE custo_lancamentos SET status = ?, data_pagamento = COALESCE(?, data_pagamento, ?) WHERE id = ?`,
          [input.status, input.dataPagamento ?? null, hoje, input.id]
        );
      } else {
        await db.$client.execute(`UPDATE custo_lancamentos SET status = ? WHERE id = ?`, [input.status, input.id]);
      }
      return { ok: true };
    }),
});
