// Dashboard Financeiro Real — visão de CAIXA (extrato bancário classificado).
//
// Regra de ouro: os totais de caixa vêm SOMENTE do extrato (sicoob_extrato). Nenhuma tabela do
// sistema (folha, fechamentos, faturas...) é somada aqui — elas só explicam lançamentos, para não
// contar o mesmo pagamento duas vezes. A visão de custo da operação (competência) é outra tela.
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, adminProcedure } from "../_core/trpc";
import { moduleProcedure } from "./permissions";
import { extrairIdentificadorFavorecido } from "../utils/favorecidoCategoria";
import { parseExtrato } from "../utils/bankImport";
import {
  competenciaCustos, pagamentosDoSistema, casarPagamentos, entradasDoPeriodo, pendencias, contaCorrenteCompradores,
  type DebitoBanco,
} from "../utils/financeiroCanonico";
import {
  classificarLinha, estaClassificado, REGRAS_PADRAO,
  type Classificacao, type LinhaExtrato, type Regra, type ManualClassificacao,
  type FavorecidoClassificacao, type TipoResultado,
} from "../utils/extratoClassificacao";

const SLUG = "dashboard-real" as const;
const TIPOS_RESULTADO = ["resultado", "financeiro_nao_resultado", "transferencia_propria"] as const;

async function getDbOrThrow() {
  const { getDb } = await import("../db");
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
  return db;
}

// Criação lazy e idempotente das tabelas (evita a trava de 6h da migration de boot).
let ensurePromise: Promise<void> | null = null;
function ensureTables(db: any): Promise<void> {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      const [existia] = (await db.$client.execute(
        `SELECT COUNT(*) AS n FROM information_schema.tables
         WHERE table_schema = DATABASE() AND table_name = 'extrato_regras'`
      )) as any;
      const regrasJaExistiam = Number((existia as any[])[0]?.n ?? 0) > 0;

      await db.$client.execute(`
        CREATE TABLE IF NOT EXISTS extrato_classificacao (
          id INT AUTO_INCREMENT PRIMARY KEY,
          fonte VARCHAR(20) NOT NULL DEFAULT 'sicoob',
          lancamento_id INT NOT NULL,
          grupo VARCHAR(120) NULL,
          centro_custo VARCHAR(120) NULL,
          natureza VARCHAR(120) NULL,
          tipo_resultado VARCHAR(40) NOT NULL DEFAULT 'resultado',
          atualizado_por INT NULL,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY extrato_classificacao_unique (fonte, lancamento_id)
        )
      `);
      await db.$client.execute(`
        CREATE TABLE IF NOT EXISTS extrato_regras (
          id INT AUTO_INCREMENT PRIMARY KEY,
          nome VARCHAR(160) NOT NULL,
          campo VARCHAR(20) NOT NULL DEFAULT 'texto',
          tipo_lancamento VARCHAR(10) NOT NULL DEFAULT 'AMBOS',
          padrao VARCHAR(255) NOT NULL,
          grupo VARCHAR(120) NULL,
          centro_custo VARCHAR(120) NULL,
          natureza VARCHAR(120) NULL,
          tipo_resultado VARCHAR(40) NOT NULL DEFAULT 'resultado',
          prioridade INT NOT NULL DEFAULT 100,
          ativa TINYINT NOT NULL DEFAULT 1,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      await db.$client.execute(`
        CREATE TABLE IF NOT EXISTS bank_accounts (
          id INT AUTO_INCREMENT PRIMARY KEY,
          nome VARCHAR(120) NOT NULL,
          banco VARCHAR(80) NULL,
          tipo VARCHAR(20) NOT NULL DEFAULT 'conta',
          ativa TINYINT NOT NULL DEFAULT 1,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await db.$client.execute(`
        CREATE TABLE IF NOT EXISTS bank_transactions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          account_id INT NOT NULL,
          data_lancamento VARCHAR(10) NOT NULL,
          descricao VARCHAR(500) NOT NULL,
          documento VARCHAR(100) NULL,
          valor DECIMAL(15,2) NOT NULL,
          hash CHAR(40) NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY bank_transactions_unique (account_id, hash),
          INDEX bank_transactions_data_idx (data_lancamento)
        )
      `);
      if (!regrasJaExistiam) {
        for (const r of REGRAS_PADRAO) {
          await db.$client.execute(
            `INSERT INTO extrato_regras (nome, campo, tipo_lancamento, padrao, grupo, centro_custo, natureza, tipo_resultado, prioridade, ativa)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [r.nome, r.campo, r.tipoLancamento, r.padrao, r.grupo, r.centroCusto, r.natureza, r.tipoResultado, r.prioridade, r.ativa ? 1 : 0]
          );
        }
      }
    })().catch(e => { ensurePromise = null; throw e; });
  }
  return ensurePromise;
}

function num(v: unknown): number {
  const s = String(v ?? "0").trim();
  // aceita "1234.56" e "1.234,56"
  const n = s.includes(",") ? parseFloat(s.replace(/\./g, "").replace(",", ".")) : parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function rowParaRegra(r: any): Regra {
  return {
    id: r.id, nome: r.nome, campo: r.campo, tipoLancamento: r.tipo_lancamento, padrao: r.padrao,
    grupo: r.grupo ?? null, centroCusto: r.centro_custo ?? null, natureza: r.natureza ?? null,
    tipoResultado: (TIPOS_RESULTADO as readonly string[]).includes(r.tipo_resultado) ? r.tipo_resultado : "resultado",
    prioridade: Number(r.prioridade ?? 100), ativa: Number(r.ativa) === 1,
  };
}

type LinhaClassificada = { linha: LinhaExtrato; c: Classificacao };

// Lançamentos de contas importadas (OFX/CSV) usam id = IMPORT_OFFSET + id real, para conviver com o id do Sicoob.
const IMPORT_OFFSET = 1_000_000_000;
const ehImportado = (id: number) => id >= IMPORT_OFFSET;
const idReal = (id: number) => (ehImportado(id) ? id - IMPORT_OFFSET : id);

// "todas" | "sicoob" | id de uma conta importada
const contaInput = z.union([z.literal("todas"), z.literal("sicoob"), z.number()]).default("todas");
type ContaFiltro = z.infer<typeof contaInput>;

// Carrega as linhas do extrato no período e classifica cada uma (manual > regra > favorecido).
async function carregarLinhasClassificadas(db: any, dataInicio: string, dataFim: string, conta: ContaFiltro = "todas"): Promise<LinhaClassificada[]> {
  await ensureTables(db);

  const linhas: LinhaExtrato[] = [];
  if (conta === "todas" || conta === "sicoob") {
    const [rows] = (await db.$client.execute(
      `SELECT id, data_lancamento, descricao, complemento, numero_documento, valor, tipo_lancamento
       FROM sicoob_extrato WHERE data_lancamento BETWEEN ? AND ? ORDER BY data_lancamento ASC, id ASC`,
      [dataInicio, dataFim]
    )) as any;
    for (const r of rows as any[]) {
      linhas.push({
        id: r.id, dataLancamento: r.data_lancamento, descricao: r.descricao, complemento: r.complemento,
        numeroDocumento: r.numero_documento, tipo: r.tipo_lancamento === "CREDITO" ? "CREDITO" : "DEBITO",
        valor: Math.abs(num(r.valor)), conta: "Sicoob",
      });
    }
  }
  if (conta === "todas" || typeof conta === "number") {
    const [rows] = (await db.$client.execute(
      `SELECT t.id, t.data_lancamento, t.descricao, t.documento, t.valor, a.nome AS conta
       FROM bank_transactions t JOIN bank_accounts a ON a.id = t.account_id
       WHERE t.data_lancamento BETWEEN ? AND ? ${typeof conta === "number" ? "AND t.account_id = ?" : ""}
       ORDER BY t.data_lancamento ASC, t.id ASC`,
      typeof conta === "number" ? [dataInicio, dataFim, conta] : [dataInicio, dataFim]
    )) as any;
    for (const r of rows as any[]) {
      const v = num(r.valor);
      linhas.push({
        id: IMPORT_OFFSET + r.id, dataLancamento: r.data_lancamento, descricao: r.descricao, complemento: null,
        numeroDocumento: r.documento, tipo: v >= 0 ? "CREDITO" : "DEBITO", valor: Math.abs(v), conta: r.conta,
      });
    }
    linhas.sort((a, b) => a.dataLancamento.localeCompare(b.dataLancamento) || a.id - b.id);
  }

  // ajustes manuais do período
  const manual = new Map<number, ManualClassificacao>();
  if (linhas.length > 0) {
    const [man] = (await db.$client.execute(
      `SELECT c.lancamento_id AS lid, c.grupo, c.centro_custo, c.natureza, c.tipo_resultado
       FROM extrato_classificacao c
       JOIN sicoob_extrato e ON e.id = c.lancamento_id AND c.fonte = 'sicoob'
       WHERE e.data_lancamento BETWEEN ? AND ?
       UNION ALL
       SELECT c.lancamento_id + ${IMPORT_OFFSET} AS lid, c.grupo, c.centro_custo, c.natureza, c.tipo_resultado
       FROM extrato_classificacao c
       JOIN bank_transactions t ON t.id = c.lancamento_id AND c.fonte = 'import'
       WHERE t.data_lancamento BETWEEN ? AND ?`,
      [dataInicio, dataFim, dataInicio, dataFim]
    )) as any;
    for (const m of man as any[]) {
      manual.set(Number(m.lid), {
        grupo: m.grupo ?? null, centroCusto: m.centro_custo ?? null, natureza: m.natureza ?? null,
        tipoResultado: (TIPOS_RESULTADO as readonly string[]).includes(m.tipo_resultado) ? m.tipo_resultado : "resultado",
      });
    }
  }

  const [regrasRows] = (await db.$client.execute(`SELECT * FROM extrato_regras WHERE ativa = 1`)) as any;
  const regras = (regrasRows as any[]).map(rowParaRegra);

  // favorecidos (classificação por pagador/recebedor)
  const chavePorLinha = new Map<number, string>();
  for (const l of linhas) {
    if (l.tipo !== "DEBITO") continue;
    const ident = extrairIdentificadorFavorecido(l.descricao, l.complemento, l.numeroDocumento);
    if (ident) chavePorLinha.set(l.id, ident.chave);
  }
  const favMap = new Map<string, FavorecidoClassificacao>();
  const chaves = Array.from(new Set(chavePorLinha.values()));
  for (let i = 0; i < chaves.length; i += 500) {
    const lote = chaves.slice(i, i + 500);
    const [favRows] = (await db.$client.execute(
      `SELECT chave, grupo, centro_custo, natureza FROM favorecido_categoria WHERE chave IN (${lote.map(() => "?").join(",")})`,
      lote
    )) as any;
    for (const f of favRows as any[]) {
      favMap.set(f.chave, { grupo: f.grupo ?? null, centroCusto: f.centro_custo ?? null, natureza: f.natureza ?? null });
    }
  }

  // CNPJs de compradores (PIX recebido deles é venda)
  const compradoresCnpj = new Set<string>();
  try {
    const [cd] = (await db.$client.execute(
      `SELECT cnpj_cpf FROM cargo_destinations WHERE is_buyer = 1 AND cnpj_cpf IS NOT NULL AND cnpj_cpf <> ''`
    )) as any;
    for (const r of cd as any[]) {
      const d = String(r.cnpj_cpf).replace(/\D/g, "");
      if (d.length === 14) compradoresCnpj.add(d);
    }
  } catch { /* tabela/coluna ausente: segue sem essa regra */ }
  try {
    const [nf] = (await db.$client.execute(
      `SELECT DISTINCT cnpj_destinatario FROM notas_fiscais WHERE cnpj_destinatario IS NOT NULL AND cnpj_destinatario <> ''`
    )) as any;
    for (const r of nf as any[]) {
      const d = String(r.cnpj_destinatario).replace(/\D/g, "");
      if (d.length === 14) compradoresCnpj.add(d);
    }
  } catch { /* idem */ }

  return linhas.map(linha => ({
    linha,
    c: classificarLinha(linha, {
      manual, regras, compradoresCnpj,
      favorecido: favMap.get(chavePorLinha.get(linha.id) ?? "") ?? null,
    }),
  }));
}

const periodoInput = z.object({
  dataInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dataFim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  conta: contaInput,
});

const soPeriodo = z.object({
  dataInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dataFim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const SEM = "Sem classificação";

export const financialRealRouter = router({
  // ── Resumo de caixa do período ──
  resumo: moduleProcedure(SLUG)
    .input(periodoInput)
    .query(async ({ input }) => {
      const db = await getDbOrThrow();
      const itens = await carregarLinhasClassificadas(db, input.dataInicio, input.dataFim, input.conta);

      const tot = { entradasResultado: 0, saidasResultado: 0, entradasFinanceiro: 0, saidasFinanceiro: 0, transferencias: 0 };
      const porMes = new Map<string, { mes: string; entradas: number; saidas: number; entradasFin: number; saidasFin: number }>();
      const arvore = new Map<string, { tipo: "saida" | "entrada"; grupo: string; centroCusto: string; natureza: string; valor: number; qtd: number }>();
      const sem = { debitoQtd: 0, debitoValor: 0, creditoQtd: 0, creditoValor: 0 };

      let movimentoSicoob = 0; // soma assinada dos lançamentos do Sicoob (para conferir com o saldo do banco)
      for (const { linha, c } of itens) {
        if (!ehImportado(linha.id)) movimentoSicoob += linha.tipo === "CREDITO" ? linha.valor : -linha.valor;
        const mes = linha.dataLancamento.slice(0, 7);
        const m = porMes.get(mes) ?? { mes, entradas: 0, saidas: 0, entradasFin: 0, saidasFin: 0 };
        const entrada = linha.tipo === "CREDITO";
        const v = linha.valor;

        if (c.tipoResultado === "resultado") {
          if (entrada) { tot.entradasResultado += v; m.entradas += v; } else { tot.saidasResultado += v; m.saidas += v; }
          const g = c.grupo ?? SEM, cc = c.centroCusto ?? SEM, n = c.natureza ?? SEM;
          const k = `${entrada ? "e" : "s"}|${g}|${cc}|${n}`;
          const a = arvore.get(k) ?? { tipo: entrada ? "entrada" : "saida", grupo: g, centroCusto: cc, natureza: n, valor: 0, qtd: 0 };
          a.valor += v; a.qtd += 1;
          arvore.set(k, a);
        } else if (c.tipoResultado === "financeiro_nao_resultado") {
          if (entrada) { tot.entradasFinanceiro += v; m.entradasFin += v; } else { tot.saidasFinanceiro += v; m.saidasFin += v; }
        } else {
          tot.transferencias += entrada ? v : -v;
        }
        porMes.set(mes, m);

        if (!estaClassificado(c)) {
          if (entrada) { sem.creditoQtd++; sem.creditoValor += v; } else { sem.debitoQtd++; sem.debitoValor += v; }
        }
      }

      // saldo bancário: inicial do primeiro mês, final do último mês do período
      const [ai, mi] = input.dataInicio.split("-").map(Number).slice(0, 2);
      const [af, mf] = input.dataFim.split("-").map(Number).slice(0, 2);
      let saldoInicial: number | null = null;
      let saldoFinal: number | null = null;
      try {
        const [sI] = (await db.$client.execute(`SELECT saldo_inicial FROM sicoob_saldo_mes WHERE ano = ? AND mes = ? LIMIT 1`, [ai, mi])) as any;
        const [sF] = (await db.$client.execute(`SELECT saldo_final FROM sicoob_saldo_mes WHERE ano = ? AND mes = ? LIMIT 1`, [af, mf])) as any;
        if ((sI as any[])[0]) saldoInicial = num((sI as any[])[0].saldo_inicial);
        if ((sF as any[])[0]) saldoFinal = num((sF as any[])[0].saldo_final);
      } catch { /* sem saldo sincronizado */ }

      const r2 = (n: number) => Math.round(n * 100) / 100;
      const variacaoSaldo = saldoInicial != null && saldoFinal != null ? saldoFinal - saldoInicial : null;
      const incluiSicoob = input.conta === "todas" || input.conta === "sicoob";
      return {
        conciliacaoSaldo: variacaoSaldo != null && incluiSicoob
          ? { variacaoSaldo: r2(variacaoSaldo), variacaoLancamentos: r2(movimentoSicoob), diferenca: r2(variacaoSaldo - movimentoSicoob) }
          : null,
        totais: {
          entradasResultado: r2(tot.entradasResultado),
          saidasResultado: r2(tot.saidasResultado),
          resultadoCaixa: r2(tot.entradasResultado - tot.saidasResultado),
          entradasFinanceiro: r2(tot.entradasFinanceiro),
          saidasFinanceiro: r2(tot.saidasFinanceiro),
          transferenciasLiquidas: r2(tot.transferencias),
          lancamentos: itens.length,
        },
        saldo: { inicial: saldoInicial, final: saldoFinal },
        porMes: Array.from(porMes.values()).sort((a, b) => a.mes.localeCompare(b.mes)).map(m => ({
          mes: m.mes, entradas: r2(m.entradas), saidas: r2(m.saidas), resultado: r2(m.entradas - m.saidas),
          entradasFin: r2(m.entradasFin), saidasFin: r2(m.saidasFin),
        })),
        arvore: Array.from(arvore.values()).map(a => ({ ...a, valor: r2(a.valor) })),
        semClassificacao: { ...sem, debitoValor: r2(sem.debitoValor), creditoValor: r2(sem.creditoValor) },
      };
    }),

  // ── Lançamentos classificados (drill-down e fila "sem classificação") ──
  lancamentos: moduleProcedure(SLUG)
    .input(periodoInput.extend({
      tipo: z.enum(["todos", "DEBITO", "CREDITO"]).default("todos"),
      situacao: z.enum(["todas", "sem", "classificadas"]).default("todas"),
      busca: z.string().max(100).optional(),
      grupo: z.string().max(120).optional(),
      centroCusto: z.string().max(120).optional(),
      natureza: z.string().max(120).optional(),
      tipoResultado: z.enum(TIPOS_RESULTADO).optional(),
      limit: z.number().min(1).max(500).default(200),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const db = await getDbOrThrow();
      const itens = await carregarLinhasClassificadas(db, input.dataInicio, input.dataFim, input.conta);
      const busca = input.busca ? input.busca.toUpperCase() : null;

      const filtrados = itens.filter(({ linha, c }) => {
        if (input.tipo !== "todos" && linha.tipo !== input.tipo) return false;
        if (input.situacao === "sem" && estaClassificado(c)) return false;
        if (input.situacao === "classificadas" && !estaClassificado(c)) return false;
        if (input.tipoResultado && c.tipoResultado !== input.tipoResultado) return false;
        if (input.grupo && (c.grupo ?? SEM) !== input.grupo) return false;
        if (input.centroCusto && (c.centroCusto ?? SEM) !== input.centroCusto) return false;
        if (input.natureza && (c.natureza ?? SEM) !== input.natureza) return false;
        if (busca) {
          const t = `${linha.descricao ?? ""} ${linha.complemento ?? ""} ${linha.numeroDocumento ?? ""}`.toUpperCase();
          if (!t.includes(busca)) return false;
        }
        return true;
      });

      const soma = filtrados.reduce((s, { linha }) => s + linha.valor, 0);
      const pagina = filtrados.slice(input.offset, input.offset + input.limit);
      return {
        total: filtrados.length,
        soma: Math.round(soma * 100) / 100,
        itens: pagina.map(({ linha, c }) => ({
          id: linha.id,
          data: linha.dataLancamento,
          tipo: linha.tipo,
          descricao: linha.descricao,
          complemento: linha.complemento,
          numeroDocumento: linha.numeroDocumento,
          valor: linha.valor,
          conta: linha.conta ?? null,
          grupo: c.grupo, centroCusto: c.centroCusto, natureza: c.natureza,
          tipoResultado: c.tipoResultado, origem: c.origem, regraNome: c.regraNome,
        })),
      };
    }),

  // ── Classificação manual por lançamento ──
  classificar: moduleProcedure(SLUG)
    .input(z.object({
      ids: z.array(z.number()).min(1).max(500),
      grupo: z.string().max(120).nullable(),
      centroCusto: z.string().max(120).nullable(),
      natureza: z.string().max(120).nullable(),
      tipoResultado: z.enum(TIPOS_RESULTADO).default("resultado"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDbOrThrow();
      await ensureTables(db);
      const limpa = (s: string | null) => (s && s.trim() ? s.trim() : null);
      for (const id of input.ids) {
        await db.$client.execute(
          `INSERT INTO extrato_classificacao (fonte, lancamento_id, grupo, centro_custo, natureza, tipo_resultado, atualizado_por)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE grupo = VALUES(grupo), centro_custo = VALUES(centro_custo),
             natureza = VALUES(natureza), tipo_resultado = VALUES(tipo_resultado), atualizado_por = VALUES(atualizado_por)`,
          [ehImportado(id) ? "import" : "sicoob", idReal(id), limpa(input.grupo), limpa(input.centroCusto), limpa(input.natureza), input.tipoResultado, ctx.user.id ?? null]
        );
      }
      return { atualizados: input.ids.length };
    }),

  removerClassificacaoManual: moduleProcedure(SLUG)
    .input(z.object({ ids: z.array(z.number()).min(1).max(500) }))
    .mutation(async ({ input }) => {
      const db = await getDbOrThrow();
      await ensureTables(db);
      for (const id of input.ids) {
        await db.$client.execute(
          `DELETE FROM extrato_classificacao WHERE fonte = ? AND lancamento_id = ?`,
          [ehImportado(id) ? "import" : "sicoob", idReal(id)]
        );
      }
      return { removidos: input.ids.length };
    }),

  // ── Opções de Grupo / Centro de custo / Natureza (favorecidos + regras + ajustes) ──
  opcoes: moduleProcedure(SLUG).query(async () => {
    const db = await getDbOrThrow();
    await ensureTables(db);
    const [rows] = (await db.$client.execute(
      `SELECT DISTINCT grupo, centro_custo, natureza FROM (
         SELECT grupo, centro_custo, natureza FROM favorecido_categoria
         UNION SELECT grupo, centro_custo, natureza FROM extrato_regras
         UNION SELECT grupo, centro_custo, natureza FROM extrato_classificacao
       ) t WHERE grupo IS NOT NULL AND grupo <> '' ORDER BY grupo, centro_custo, natureza`
    )) as any;
    return {
      combinacoes: (rows as any[]).map(r => ({
        grupo: r.grupo as string, centroCusto: (r.centro_custo ?? null) as string | null, natureza: (r.natureza ?? null) as string | null,
      })),
    };
  }),

  // ── Regras ──
  listRegras: moduleProcedure(SLUG).query(async () => {
    const db = await getDbOrThrow();
    await ensureTables(db);
    const [rows] = (await db.$client.execute(`SELECT * FROM extrato_regras ORDER BY prioridade ASC, id ASC`)) as any;
    return (rows as any[]).map(rowParaRegra);
  }),

  salvarRegra: moduleProcedure(SLUG)
    .input(z.object({
      id: z.number().optional(),
      nome: z.string().min(1).max(160),
      campo: z.enum(["descricao", "complemento", "documento", "texto"]),
      tipoLancamento: z.enum(["DEBITO", "CREDITO", "AMBOS"]),
      padrao: z.string().min(1).max(255),
      grupo: z.string().max(120).nullable(),
      centroCusto: z.string().max(120).nullable(),
      natureza: z.string().max(120).nullable(),
      tipoResultado: z.enum(TIPOS_RESULTADO),
      prioridade: z.number().min(1).max(10000).default(100),
      ativa: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      if (input.padrao.startsWith("re:")) {
        try { new RegExp(input.padrao.slice(3), "i"); }
        catch { throw new TRPCError({ code: "BAD_REQUEST", message: "Expressão regular inválida" }); }
      }
      const db = await getDbOrThrow();
      await ensureTables(db);
      const p = [input.nome, input.campo, input.tipoLancamento, input.padrao, input.grupo, input.centroCusto,
        input.natureza, input.tipoResultado, input.prioridade, input.ativa ? 1 : 0];
      if (input.id) {
        await db.$client.execute(
          `UPDATE extrato_regras SET nome=?, campo=?, tipo_lancamento=?, padrao=?, grupo=?, centro_custo=?, natureza=?,
             tipo_resultado=?, prioridade=?, ativa=? WHERE id = ?`,
          [...p, input.id]
        );
        return { id: input.id };
      }
      const [res] = (await db.$client.execute(
        `INSERT INTO extrato_regras (nome, campo, tipo_lancamento, padrao, grupo, centro_custo, natureza, tipo_resultado, prioridade, ativa)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        p
      )) as any;
      return { id: Number(res.insertId) };
    }),

  excluirRegra: moduleProcedure(SLUG)
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDbOrThrow();
      await ensureTables(db);
      await db.$client.execute(`DELETE FROM extrato_regras WHERE id = ?`, [input.id]);
      return { success: true };
    }),

  // ── Entradas: faturado × recebido, boletos e NFs ──
  entradas: moduleProcedure(SLUG)
    .input(soPeriodo)
    .query(async ({ input }) => {
      const db = await getDbOrThrow();
      return entradasDoPeriodo(db, input.dataInicio, input.dataFim);
    }),

  // ── Conta corrente dos compradores: faturado × recebido (PIX por CNPJ + boletos) ──
  compradores: moduleProcedure(SLUG)
    .input(soPeriodo)
    .query(async ({ input }) => {
      const db = await getDbOrThrow();
      return contaCorrenteCompradores(db, input.dataInicio, input.dataFim);
    }),

  // ── Pendências de hoje: a receber e a pagar (somente o que ainda não foi baixado) ──
  pendencias: moduleProcedure(SLUG).query(async () => {
    const db = await getDbOrThrow();
    return pendencias(db, new Date().toISOString().slice(0, 10));
  }),

  // ── Competência: custo da operação por bloco, equipamento e local (só tabelas do sistema) ──
  competencia: moduleProcedure(SLUG)
    .input(soPeriodo)
    .query(async ({ input }) => {
      const db = await getDbOrThrow();
      return competenciaCustos(db, input.dataInicio, input.dataFim);
    }),

  // ── Resultado por cliente (origem da madeira): receita estimada × compra da madeira ──
  resultadoPorCliente: moduleProcedure(SLUG)
    .input(soPeriodo)
    .query(async ({ input }) => {
      const db = await getDbOrThrow();
      const { resultadoPorCliente } = await import("../utils/financeiroCliente");
      return resultadoPorCliente(db, input.dataInicio, input.dataFim);
    }),

  // ── Detalhe de um bloco de custo (os registros que formam o valor) ──
  competenciaDetalhe: moduleProcedure(SLUG)
    .input(soPeriodo.extend({ chave: z.string().max(60) }))
    .query(async ({ input }) => {
      const db = await getDbOrThrow();
      const { detalheBloco } = await import("../utils/financeiroDetalhe");
      return detalheBloco(db, input.chave, input.dataInicio, input.dataFim);
    }),

  // ── Conciliação: pagamentos marcados no sistema × débitos do banco ──
  conciliacao: moduleProcedure(SLUG)
    .input(periodoInput)
    .query(async ({ input }) => {
      const db = await getDbOrThrow();
      const folga = (d: string, dias: number) => {
        const x = new Date(d + "T12:00:00"); x.setDate(x.getDate() + dias); return x.toISOString().slice(0, 10);
      };
      const ini = folga(input.dataInicio, -7), fim = folga(input.dataFim, 7);

      const [linhas, sistema] = await Promise.all([
        carregarLinhasClassificadas(db, ini, fim, input.conta),
        pagamentosDoSistema(db, ini, fim),
      ]);

      const debitos: DebitoBanco[] = linhas.filter(x => x.linha.tipo === "DEBITO").map(({ linha, c }) => ({
        id: linha.id, data: linha.dataLancamento, valor: linha.valor, descricao: linha.descricao, complemento: linha.complemento,
        classificado: estaClassificado(c), grupo: c.grupo, centroCusto: c.centroCusto, natureza: c.natureza, tipoResultado: c.tipoResultado,
      }));
      const m = casarPagamentos(sistema.pagamentos, debitos, 7);

      const dentro = (d: string) => d >= input.dataInicio && d <= input.dataFim;
      const r2 = (n: number) => Math.round(n * 100) / 100;
      const soma = (a: { valor: number }[]) => r2(a.reduce((s, x) => s + x.valor, 0));

      const casados = m.casados.filter(c => dentro(c.pagamento.data));
      const pagamentosSemBanco = m.pagamentosSemBanco.filter(p => dentro(p.data));
      const debitosSemSistema = m.debitosSemSistema.filter(d => dentro(d.data));
      const debitosNoPeriodo = debitos.filter(d => dentro(d.data));
      const pagamentosNoPeriodo = sistema.pagamentos.filter(p => dentro(p.data));

      return {
        resumo: {
          debitosBanco: soma(debitosNoPeriodo),
          pagamentosSistema: soma(pagamentosNoPeriodo),
          casadosValor: r2(casados.reduce((s, c) => s + c.pagamento.valor, 0)),
          casadosQtd: casados.length,
          pagamentosSemBancoValor: soma(pagamentosSemBanco),
          pagamentosSemBancoQtd: pagamentosSemBanco.length,
          debitosSemSistemaValor: soma(debitosSemSistema),
          debitosSemSistemaQtd: debitosSemSistema.length,
        },
        casados: casados.map(c => ({
          tipoLabel: c.pagamento.tipoLabel, descricao: c.pagamento.descricao, valor: c.pagamento.valor,
          dataSistema: c.pagamento.data, dataBanco: c.debito.data, diasDiferenca: c.diasDiferenca,
          debitoId: c.debito.id, debitoDescricao: c.debito.descricao, debitoComplemento: c.debito.complemento,
          classificado: c.debito.classificado, sugestao: c.pagamento.sugestao,
        })),
        pagamentosSemBanco: pagamentosSemBanco.map(p => ({
          tipoLabel: p.tipoLabel, descricao: p.descricao, valor: p.valor, data: p.data,
        })),
        debitosSemSistema: debitosSemSistema.sort((a, b) => b.valor - a.valor).slice(0, 100).map(d => ({
          id: d.id, data: d.data, valor: d.valor, descricao: d.descricao, complemento: d.complemento,
          classificado: d.classificado, grupo: d.grupo, centroCusto: d.centroCusto, natureza: d.natureza, tipoResultado: d.tipoResultado,
        })),
        erros: sistema.erros,
      };
    }),

  // ── Outras contas/cartões (importação OFX/CSV) ──
  listContas: moduleProcedure(SLUG).query(async () => {
    const db = await getDbOrThrow();
    await ensureTables(db);
    const [rows] = (await db.$client.execute(
      `SELECT a.id, a.nome, a.banco, a.tipo, a.ativa,
              (SELECT COUNT(*) FROM bank_transactions t WHERE t.account_id = a.id) AS qtd,
              (SELECT MIN(data_lancamento) FROM bank_transactions t WHERE t.account_id = a.id) AS primeira,
              (SELECT MAX(data_lancamento) FROM bank_transactions t WHERE t.account_id = a.id) AS ultima
       FROM bank_accounts a ORDER BY a.nome`
    )) as any;
    return (rows as any[]).map(r => ({
      id: r.id as number, nome: r.nome as string, banco: (r.banco ?? null) as string | null, tipo: r.tipo as string,
      ativa: Number(r.ativa) === 1, qtd: Number(r.qtd), primeira: (r.primeira ?? null) as string | null, ultima: (r.ultima ?? null) as string | null,
    }));
  }),

  criarConta: moduleProcedure(SLUG)
    .input(z.object({ nome: z.string().min(1).max(120), banco: z.string().max(80).nullable(), tipo: z.enum(["conta", "cartao"]).default("conta") }))
    .mutation(async ({ input }) => {
      const db = await getDbOrThrow();
      await ensureTables(db);
      const [res] = (await db.$client.execute(
        `INSERT INTO bank_accounts (nome, banco, tipo) VALUES (?, ?, ?)`, [input.nome.trim(), input.banco?.trim() || null, input.tipo]
      )) as any;
      return { id: Number(res.insertId) };
    }),

  excluirConta: moduleProcedure(SLUG)
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDbOrThrow();
      await ensureTables(db);
      await db.$client.execute(
        `DELETE FROM extrato_classificacao WHERE fonte = 'import' AND lancamento_id IN (SELECT id FROM bank_transactions WHERE account_id = ?)`, [input.id]
      );
      await db.$client.execute(`DELETE FROM bank_transactions WHERE account_id = ?`, [input.id]);
      await db.$client.execute(`DELETE FROM bank_accounts WHERE id = ?`, [input.id]);
      return { success: true };
    }),

  importarExtrato: moduleProcedure(SLUG)
    .input(z.object({
      contaId: z.number(),
      nomeArquivo: z.string().max(200).optional(),
      conteudo: z.string().min(1).max(8_000_000),
    }))
    .mutation(async ({ input }) => {
      const db = await getDbOrThrow();
      await ensureTables(db);
      const [c] = (await db.$client.execute(`SELECT id FROM bank_accounts WHERE id = ?`, [input.contaId])) as any;
      if (!(c as any[])[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Conta não encontrada" });

      const parsed = parseExtrato(input.conteudo, input.nomeArquivo);
      let novos = 0;
      for (const t of parsed.transacoes) {
        const [res] = (await db.$client.execute(
          `INSERT IGNORE INTO bank_transactions (account_id, data_lancamento, descricao, documento, valor, hash)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [input.contaId, t.data, t.descricao.slice(0, 500), t.documento?.slice(0, 100) ?? null, t.valor.toFixed(2), t.hash]
        )) as any;
        novos += Number(res.affectedRows ?? 0);
      }
      return {
        formato: parsed.formato, lidos: parsed.transacoes.length, novos,
        duplicados: parsed.transacoes.length - novos, avisos: parsed.avisos.slice(0, 5),
      };
    }),

  // ── Sincronização do extrato (backfill de meses) — somente administrador ──
  sincronizarPeriodo: adminProcedure
    .input(z.object({
      anoInicio: z.number().min(2020).max(2100),
      mesInicio: z.number().min(1).max(12),
      anoFim: z.number().min(2020).max(2100),
      mesFim: z.number().min(1).max(12),
    }))
    .mutation(async ({ input }) => {
      const inicio = input.anoInicio * 12 + (input.mesInicio - 1);
      const fim = input.anoFim * 12 + (input.mesFim - 1);
      if (fim < inicio) throw new TRPCError({ code: "BAD_REQUEST", message: "Período inválido" });
      if (fim - inicio + 1 > 24) throw new TRPCError({ code: "BAD_REQUEST", message: "Máximo de 24 meses por vez" });
      const { syncSicoobExtrato } = await import("./sicoob");
      const resultado: { mes: number; ano: number; synced: number; error: string | null }[] = [];
      for (let k = inicio; k <= fim; k++) {
        const ano = Math.floor(k / 12), mes = (k % 12) + 1;
        const r: any = await syncSicoobExtrato(mes, ano);
        resultado.push({ mes, ano, synced: r.synced ?? 0, error: r.error ?? null });
        await new Promise(res => setTimeout(res, 1000)); // não estressa a API do banco
      }
      return { resultado };
    }),
});

export type { TipoResultado };
