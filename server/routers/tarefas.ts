// Tarefas da operação: cada colaborador tem as suas e os supervisores veem e atribuem para toda a equipe.
// Tabelas criadas sob demanda (sem migração manual).
//   · "tarefas"          → módulo de uso: o colaborador vê e cria as próprias tarefas
//   · "tarefas-gestao"   → supervisor: vê toda a equipe e atribui para qualquer colaborador
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router } from "../_core/trpc";
import { moduleProcedure, resolveUserPermissions } from "./permissions";
import { notifyUsers } from "./notifications";

const USO = "tarefas" as const;
const GESTAO = "tarefas-gestao" as const;
const STATUS = ["a_fazer", "andamento", "concluida"] as const;
const STATUS_LABEL: Record<string, string> = { a_fazer: "A fazer", andamento: "Em andamento", concluida: "Concluída" };
const PRIORIDADES = ["baixa", "media", "alta"] as const;
// Pendência = o que está impedindo a tarefa de andar (campo separado da coluna/andamento).
const PENDENCIAS = ["aprovacao", "resposta", "material", "bloqueada", "espera"] as const;
const PENDENCIA_LABEL: Record<string, string> = {
  aprovacao: "Aguardando aprovação", resposta: "Aguardando resposta", material: "Aguardando material/peça",
  bloqueada: "Bloqueada", espera: "Em espera",
};
const dataIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

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
        CREATE TABLE IF NOT EXISTS tarefas (
          id INT AUTO_INCREMENT PRIMARY KEY,
          titulo VARCHAR(200) NOT NULL,
          descricao TEXT NULL,
          status VARCHAR(12) NOT NULL DEFAULT 'a_fazer',
          prioridade VARCHAR(8) NOT NULL DEFAULT 'media',
          prazo DATE NULL,
          local_id INT NULL,
          responsavel_colaborador_id INT NOT NULL,
          responsavel_nome VARCHAR(150) NULL,
          criado_por INT NULL,
          criado_por_nome VARCHAR(120) NULL,
          concluida_em DATETIME NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          KEY tarefas_resp (responsavel_colaborador_id),
          KEY tarefas_status (status),
          KEY tarefas_prazo (prazo)
        )
      `);
      // Colunas da pendência (adicionadas depois da primeira versão): cria se faltar.
      const [cols] = (await db.$client.execute(
        `SELECT column_name AS c FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'tarefas'`
      )) as any;
      const tem = new Set((cols as any[]).map((r) => String(r.c ?? r.COLUMN_NAME).toLowerCase()));
      for (const [nome, def] of [
        ["pendencia", "VARCHAR(12) NULL"], ["pendencia_motivo", "VARCHAR(300) NULL"], ["pendencia_desde", "DATETIME NULL"],
        ["origem", "VARCHAR(20) NULL"], ["origem_id", "INT NULL"], ["responsavel_user_id", "INT NULL"],
      ] as [string, string][]) {
        if (!tem.has(nome)) await db.$client.execute(`ALTER TABLE tarefas ADD COLUMN ${nome} ${def}`);
      }
      // Uma tarefa por origem (ex.: uma por meta semanal). Tarefas manuais têm origem NULL e não entram na regra.
      const [idx] = (await db.$client.execute(
        `SELECT COUNT(*) AS n FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'tarefas' AND index_name = 'tarefas_origem_unica'`
      )) as any;
      if (Number((idx as any[])[0]?.n ?? 0) === 0) {
        await db.$client.execute(`ALTER TABLE tarefas ADD UNIQUE KEY tarefas_origem_unica (origem, origem_id)`);
      }
      await db.$client.execute(`
        CREATE TABLE IF NOT EXISTS tarefa_historico (
          id INT AUTO_INCREMENT PRIMARY KEY,
          tarefa_id INT NOT NULL,
          tipo VARCHAR(12) NOT NULL DEFAULT 'comentario',
          texto TEXT NULL,
          foto_url TEXT NULL,
          user_id INT NULL,
          user_nome VARCHAR(120) NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          KEY tarefa_hist_tarefa (tarefa_id)
        )
      `);
      await db.$client.execute(`
        CREATE TABLE IF NOT EXISTS tarefa_anexos (
          id INT AUTO_INCREMENT PRIMARY KEY,
          tarefa_id INT NOT NULL,
          nome VARCHAR(255) NOT NULL,
          url TEXT NOT NULL,
          mime VARCHAR(120) NULL,
          tamanho INT NULL,
          user_id INT NULL,
          user_nome VARCHAR(120) NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          KEY tarefa_anexos_tarefa (tarefa_id)
        )
      `);
    })().catch((e) => { ensurePromise = null; throw e; });
  }
  return ensurePromise;
}

const d = (v: any): string | null => (v ? (v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10)) : null);
const dt = (v: any): string | null => (v ? (v instanceof Date ? v.toISOString() : String(v)) : null);

/** Supervisor: administrador ou quem tem o módulo "tarefas-gestao". */
async function ehGestor(ctx: { user: { id: number; role?: string | null } }): Promise<boolean> {
  if (ctx.user.role === "admin") return true;
  const p = await resolveUserPermissions(ctx.user.id, ctx.user.role);
  return p.modules === null || p.modules.includes(GESTAO);
}

async function meusColaboradorIds(db: any, userId: number): Promise<number[]> {
  const [rows] = (await db.$client.execute(`SELECT id FROM collaborators WHERE user_id = ?`, [userId])) as any;
  return (rows as any[]).map((r) => Number(r.id));
}

const SELECT_TAREFA = `
  SELECT t.*, g.name AS local_nome,
         (SELECT COUNT(*) FROM tarefa_historico h WHERE h.tarefa_id = t.id AND h.tipo = 'comentario') AS qtd_coment
  FROM tarefas t LEFT JOIN gps_locations g ON g.id = t.local_id`;

function mapTarefa(r: any) {
  return {
    id: Number(r.id), titulo: String(r.titulo), descricao: (r.descricao as string | null) ?? null,
    status: String(r.status) as typeof STATUS[number], prioridade: String(r.prioridade) as typeof PRIORIDADES[number],
    prazo: d(r.prazo), localId: r.local_id ? Number(r.local_id) : null, localNome: (r.local_nome as string | null) ?? null,
    responsavelId: Number(r.responsavel_colaborador_id), responsavelNome: (r.responsavel_nome as string | null) ?? null,
    criadoPorId: r.criado_por ? Number(r.criado_por) : null, criadoPorNome: (r.criado_por_nome as string | null) ?? null,
    concluidaEm: dt(r.concluida_em), criadaEm: dt(r.created_at), qtdComentarios: Number(r.qtd_coment ?? 0),
    origem: (r.origem as string | null) ?? null, origemId: r.origem_id ? Number(r.origem_id) : null,
    pendencia: (r.pendencia as string | null) ?? null, pendenciaMotivo: (r.pendencia_motivo as string | null) ?? null, pendenciaDesde: dt(r.pendencia_desde),
  };
}

async function registrar(db: any, tarefaId: number, tipo: string, texto: string | null, fotoUrl: string | null, ctx: any) {
  await db.$client.execute(
    `INSERT INTO tarefa_historico (tarefa_id, tipo, texto, foto_url, user_id, user_nome) VALUES (?, ?, ?, ?, ?, ?)`,
    [tarefaId, tipo, texto, fotoUrl, ctx.user.id ?? null, ctx.user.name ?? null]
  );
}

/** Avisa o outro lado da conversa: quem escreveu não recebe; o responsável e quem criou a tarefa recebem. */
async function avisarTarefa(db: any, ctx: any, t: any, titulo: string, mensagem: string) {
  try {
    const ids = new Set<number>();
    if (t.criado_por) ids.add(Number(t.criado_por));
    let respUser = t.responsavel_user_id ? Number(t.responsavel_user_id) : 0;
    if (!respUser && t.responsavel_colaborador_id) {
      const [c] = (await db.$client.execute(`SELECT user_id FROM collaborators WHERE id = ?`, [t.responsavel_colaborador_id])) as any;
      respUser = Number((c as any[])[0]?.user_id ?? 0);
    }
    if (respUser) ids.add(respUser);
    ids.delete(Number(ctx.user.id));
    if (!ids.size) return;
    const gestores: number[] = [];
    const comuns: number[] = [];
    for (const id of Array.from(ids)) (id === respUser ? comuns : gestores).push(id);
    // o responsável abre em "Minhas tarefas"; quem criou/supervisiona abre em "Tarefas da equipe"
    if (comuns.length) await notifyUsers({ recipientUserIds: comuns, type: "geral", title: titulo, message: mensagem, relatedId: Number(t.id), relatedType: "tarefa" });
    if (gestores.length) await notifyUsers({ recipientUserIds: gestores, type: "geral", title: titulo, message: mensagem, relatedId: Number(t.id), relatedType: "tarefa_equipe" });
  } catch (e: any) { console.warn("[tarefas] aviso:", e?.message); }
}

/** Quem pode mexer numa tarefa: supervisor, o responsável ou quem criou. */
async function podeAcessar(db: any, ctx: any, t: any): Promise<{ gestor: boolean; responsavel: boolean; criador: boolean }> {
  const gestor = await ehGestor(ctx);
  const meus = await meusColaboradorIds(db, ctx.user.id);
  return { gestor, responsavel: meus.includes(Number(t.responsavel_colaborador_id)) || Number(t.responsavel_user_id) === Number(ctx.user.id), criador: Number(t.criado_por) === Number(ctx.user.id) };
}

// ───────── Integração com Metas Semanais ─────────
// Cada meta semanal vira UMA tarefa para o responsável de operação. O andamento segue a meta (não é editado à mão)
// e a tarefa leva para a tela da meta. A sincronização roda ao listar (no máximo a cada 20 s) e pega as metas já existentes.
const MARCA_META = "meta_semanal";
const MSG_META = "Esta tarefa vem da Meta Semanal: o andamento segue a meta. Abra a meta para alterar.";
let ultimaSyncMetas = 0;

const fmtDia = (iso: string) => iso.split("-").reverse().slice(0, 2).join("/");

async function sincronizarMetas(db: any, forcar = false): Promise<void> {
  if (!forcar && Date.now() - ultimaSyncMetas < 20_000) return;
  ultimaSyncMetas = Date.now();
  try {
    const [tem] = (await db.$client.execute(
      `SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'weekly_goals'`
    )) as any;
    if (!Number((tem as any[])[0]?.n ?? 0)) return;
    const desde = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 19).replace("T", " ");
    const [metas] = (await db.$client.execute(
      `SELECT id, title, week_start, week_end, responsible_user_id, responsible_name, status, created_by
       FROM weekly_goals
       WHERE status IN ('aguardando_ciencia','em_negociacao','em_andamento') OR (status = 'encerrada' AND closed_at >= ?)`, [desde]
    )) as any;

    // metas canceladas: a tarefa some
    const [canc] = (await db.$client.execute(`SELECT id FROM weekly_goals WHERE status = 'cancelada'`)) as any;
    for (const c of canc as any[]) {
      const [t] = (await db.$client.execute(`SELECT id FROM tarefas WHERE origem = ? AND origem_id = ?`, [MARCA_META, c.id])) as any;
      for (const x of t as any[]) {
        await db.$client.execute(`DELETE FROM tarefa_historico WHERE tarefa_id = ?`, [x.id]);
        await db.$client.execute(`DELETE FROM tarefas WHERE id = ?`, [x.id]);
      }
    }
    // metas excluídas: a tarefa que ficou sem meta também some
    const [orfas] = (await db.$client.execute(
      `SELECT t.id FROM tarefas t LEFT JOIN weekly_goals w ON w.id = t.origem_id WHERE t.origem = ? AND w.id IS NULL`, [MARCA_META]
    )) as any;
    for (const x of orfas as any[]) {
      await db.$client.execute(`DELETE FROM tarefa_historico WHERE tarefa_id = ?`, [x.id]);
      await db.$client.execute(`DELETE FROM tarefas WHERE id = ?`, [x.id]);
    }
    if (!(metas as any[]).length) return;

    const userIds = Array.from(new Set((metas as any[]).map((m) => Number(m.responsible_user_id))));
    const [cols] = (await db.$client.execute(
      `SELECT id, name, user_id FROM collaborators WHERE user_id IN (${userIds.map(() => "?").join(",")}) ORDER BY id`, userIds
    )) as any;
    const colabPorUser = new Map<number, { id: number; name: string }>();
    for (const c of cols as any[]) if (!colabPorUser.has(Number(c.user_id))) colabPorUser.set(Number(c.user_id), { id: Number(c.id), name: String(c.name ?? "").trim() });

    const [exist] = (await db.$client.execute(`SELECT * FROM tarefas WHERE origem = ?`, [MARCA_META])) as any;
    const porMeta = new Map<number, any>();
    for (const e of exist as any[]) porMeta.set(Number(e.origem_id), e);

    const hojeBR = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
    for (const m of metas as any[]) {
      // meta de acordo, mas de semana futura: a tarefa fica em "A fazer" até a semana começar
      const comecou = String(m.week_start).slice(0, 10) <= hojeBR;
      const status = m.status === "encerrada" ? "concluida" : m.status === "em_andamento" && comecou ? "andamento" : "a_fazer";
      const pendencia = m.status === "em_negociacao" ? "resposta" : null;
      const motivo = pendencia ? "Meta em negociação com o supervisor" : null;
      const titulo = `Meta semanal: ${String(m.title).trim()}`.slice(0, 200);
      const descricao = `Semana de ${fmtDia(String(m.week_start))} a ${fmtDia(String(m.week_end))}. Abra a meta para ver os compradores, os dias e conversar.`;
      const prazo = String(m.week_end).slice(0, 10);
      const colab = colabPorUser.get(Number(m.responsible_user_id));
      const nome = colab?.name || (m.responsible_name as string | null) || null;
      const atual = porMeta.get(Number(m.id));
      if (!atual) {
        const [res] = (await db.$client.execute(
          `INSERT INTO tarefas (titulo, descricao, status, prioridade, prazo, responsavel_colaborador_id, responsavel_nome, responsavel_user_id,
             criado_por, criado_por_nome, concluida_em, pendencia, pendencia_motivo, pendencia_desde, origem, origem_id)
           VALUES (?, ?, ?, 'media', ?, ?, ?, ?, ?, 'Meta Semanal', ${status === "concluida" ? "NOW()" : "NULL"}, ?, ?, ${pendencia ? "NOW()" : "NULL"}, ?, ?)`,
          [titulo, descricao, status, prazo, colab?.id ?? 0, nome, m.responsible_user_id, m.created_by ?? null, pendencia, motivo, MARCA_META, m.id]
        )) as any;
        await db.$client.execute(`INSERT INTO tarefa_historico (tarefa_id, tipo, texto, user_nome) VALUES (?, 'criada', ?, 'Meta Semanal')`, [Number((res as any).insertId), "Tarefa criada a partir da Meta Semanal"]);
      } else if (
        atual.titulo !== titulo || d(atual.prazo) !== prazo || atual.status !== status || (atual.pendencia ?? null) !== pendencia ||
        Number(atual.responsavel_user_id) !== Number(m.responsible_user_id) || (atual.responsavel_nome ?? null) !== nome
      ) {
        const mudouStatus = atual.status !== status;
        await db.$client.execute(
          `UPDATE tarefas SET titulo = ?, descricao = ?, status = ?, prazo = ?, responsavel_colaborador_id = ?, responsavel_nome = ?, responsavel_user_id = ?,
             pendencia = ?, pendencia_motivo = ?, pendencia_desde = ${pendencia ? (atual.pendencia ? "pendencia_desde" : "NOW()") : "NULL"},
             concluida_em = ${status === "concluida" ? (atual.status === "concluida" ? "concluida_em" : "NOW()") : "NULL"}
           WHERE id = ?`,
          [titulo, descricao, status, prazo, colab?.id ?? 0, nome, m.responsible_user_id, pendencia, motivo, atual.id]
        );
        if (mudouStatus) {
          await db.$client.execute(
            `INSERT INTO tarefa_historico (tarefa_id, tipo, texto, user_nome) VALUES (?, 'status', ?, 'Meta Semanal')`,
            [atual.id, `${STATUS_LABEL[String(atual.status)] ?? atual.status} → ${STATUS_LABEL[status]} (acompanha a meta)`]
          );
        }
      }
    }
  } catch (e: any) {
    console.warn("[tarefas] sincronizar metas:", e?.message);
  }
}

export const tarefasRouter = router({
  // Colaboradores ativos (para atribuir) e permissão do usuário.
  contexto: moduleProcedure(USO, GESTAO).query(async ({ ctx }) => {
    const db = await getDbOrThrow();
    await ensureTables(db);
    const gestor = await ehGestor(ctx as any);
    const meus = await meusColaboradorIds(db, ctx.user.id);
    const [rows] = (await db.$client.execute(`SELECT id, name FROM collaborators WHERE (active = 1 OR active IS NULL) ORDER BY name`)) as any;
    return {
      gestor,
      meuColaboradorId: meus[0] ?? null,
      colaboradores: gestor ? (rows as any[]).map((r) => ({ id: Number(r.id), nome: String(r.name ?? "").trim() })).filter((c) => c.nome) : [],
    };
  }),

  // Força a sincronização das metas semanais (usado logo após criar/alterar/encerrar uma meta dentro das Tarefas).
  sincronizarMetasAgora: moduleProcedure(USO, GESTAO).mutation(async () => {
    const db = await getDbOrThrow();
    await ensureTables(db);
    await sincronizarMetas(db, true);
    return { ok: true };
  }),

  // Minhas tarefas: as do(s) colaborador(es) ligado(s) ao meu usuário.
  minhas: moduleProcedure(USO, GESTAO)
    .input(z.object({ concluidasDias: z.number().int().min(1).max(365).default(14) }).optional())
    .query(async ({ input, ctx }) => {
      const db = await getDbOrThrow();
      await ensureTables(db);
      await sincronizarMetas(db);
      const meus = await meusColaboradorIds(db, ctx.user.id);
      const desde = new Date(Date.now() - (input?.concluidasDias ?? 14) * 86400000).toISOString().slice(0, 19).replace("T", " ");
      // minhas = as do(s) colaborador(es) ligado(s) ao meu usuário + as ligadas diretamente ao meu usuário (ex.: metas semanais)
      const filtroResp = meus.length ? `(t.responsavel_colaborador_id IN (${meus.map(() => "?").join(",")}) OR t.responsavel_user_id = ?)` : `t.responsavel_user_id = ?`;
      const [rows] = (await db.$client.execute(
        `${SELECT_TAREFA}
         WHERE ${filtroResp} AND (t.status <> 'concluida' OR t.concluida_em >= ?)
         ORDER BY t.prazo IS NULL, t.prazo, t.id DESC LIMIT 500`,
        [...meus, ctx.user.id, desde]
      )) as any;
      const itens = (rows as any[]).map(mapTarefa);
      return { itens, semVinculo: !meus.length && itens.length === 0 };
    }),

  // Equipe inteira (supervisores).
  equipe: moduleProcedure(GESTAO)
    .input(z.object({
      colaboradorId: z.number().int().positive().optional(),
      localId: z.number().int().positive().optional(),
      status: z.enum(STATUS).optional(),
      atrasadas: z.boolean().optional(),
      pendencia: z.enum(["qualquer", ...PENDENCIAS]).optional(),
      busca: z.string().max(100).optional(),
      concluidasDias: z.number().int().min(1).max(365).default(14),
    }))
    .query(async ({ input }) => {
      const db = await getDbOrThrow();
      await ensureTables(db);
      await sincronizarMetas(db);
      const hoje = new Date().toISOString().slice(0, 10);
      const desde = new Date(Date.now() - input.concluidasDias * 86400000).toISOString().slice(0, 19).replace("T", " ");
      const where: string[] = ["(t.status <> 'concluida' OR t.concluida_em >= ?)"];
      const params: any[] = [desde];
      if (input.colaboradorId) { where.push("t.responsavel_colaborador_id = ?"); params.push(input.colaboradorId); }
      if (input.localId) { where.push("t.local_id = ?"); params.push(input.localId); }
      if (input.status) { where.push("t.status = ?"); params.push(input.status); }
      if (input.atrasadas) { where.push("t.prazo < ? AND t.status <> 'concluida'"); params.push(hoje); }
      if (input.pendencia === "qualquer") where.push("t.pendencia IS NOT NULL AND t.status <> 'concluida'");
      else if (input.pendencia) { where.push("t.pendencia = ?"); params.push(input.pendencia); }
      if (input.busca?.trim()) { where.push("(t.titulo LIKE ? OR t.descricao LIKE ? OR t.responsavel_nome LIKE ?)"); const b = `%${input.busca.trim()}%`; params.push(b, b, b); }
      const [rows] = (await db.$client.execute(
        `${SELECT_TAREFA} WHERE ${where.join(" AND ")} ORDER BY t.prazo IS NULL, t.prazo, t.id DESC LIMIT 1000`, params
      )) as any;
      const itens = (rows as any[]).map(mapTarefa);
      const abertas = itens.filter((i) => i.status !== "concluida");
      return {
        itens,
        resumo: {
          abertas: abertas.length,
          atrasadas: abertas.filter((i) => i.prazo && i.prazo < hoje).length,
          andamento: itens.filter((i) => i.status === "andamento").length,
          aguardando: abertas.filter((i) => i.pendencia).length,
          concluidas: itens.filter((i) => i.status === "concluida").length,
        },
      };
    }),

  criar: moduleProcedure(USO, GESTAO)
    .input(z.object({
      titulo: z.string().trim().min(2, "Dê um título à tarefa").max(200),
      descricao: z.string().trim().max(4000).nullable().optional(),
      prioridade: z.enum(PRIORIDADES).default("media"),
      prazo: dataIso.nullable().optional(),
      localId: z.number().int().positive().nullable().optional(),
      responsavelColaboradorId: z.number().int().positive().nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDbOrThrow();
      await ensureTables(db);
      const gestor = await ehGestor(ctx as any);
      let resp = input.responsavelColaboradorId ?? null;
      if (!gestor) {
        // colaborador só cria tarefa para si mesmo
        const meus = await meusColaboradorIds(db, ctx.user.id);
        if (!meus.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Seu usuário não está ligado a um colaborador. Fale com o escritório." });
        resp = meus[0];
      } else if (!resp) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Escolha o responsável pela tarefa" });
      }
      const [c] = (await db.$client.execute(`SELECT id, name FROM collaborators WHERE id = ? AND (active = 1 OR active IS NULL)`, [resp])) as any;
      const colab = (c as any[])[0];
      if (!colab) throw new TRPCError({ code: "BAD_REQUEST", message: "Colaborador inválido ou inativo" });
      const [res] = (await db.$client.execute(
        `INSERT INTO tarefas (titulo, descricao, prioridade, prazo, local_id, responsavel_colaborador_id, responsavel_nome, criado_por, criado_por_nome)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [input.titulo, input.descricao || null, input.prioridade, input.prazo ?? null, input.localId ?? null, resp, String(colab.name ?? "").trim(), ctx.user.id ?? null, (ctx.user as any).name ?? null]
      )) as any;
      const id = Number((res as any).insertId);
      await registrar(db, id, "criada", `Tarefa criada para ${String(colab.name ?? "").trim()}`, null, ctx);
      return { id };
    }),

  detalhe: moduleProcedure(USO, GESTAO)
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const db = await getDbOrThrow();
      await ensureTables(db);
      const [rows] = (await db.$client.execute(`${SELECT_TAREFA} WHERE t.id = ?`, [input.id])) as any;
      const r = (rows as any[])[0];
      if (!r) throw new TRPCError({ code: "NOT_FOUND", message: "Tarefa não encontrada" });
      const acc = await podeAcessar(db, ctx, r);
      if (!acc.gestor && !acc.responsavel && !acc.criador) throw new TRPCError({ code: "FORBIDDEN", message: "Você não tem acesso a esta tarefa" });
      const [h] = (await db.$client.execute(`SELECT id, tipo, texto, foto_url, user_id, user_nome, created_at FROM tarefa_historico WHERE tarefa_id = ? ORDER BY id`, [input.id])) as any;
      const [an] = (await db.$client.execute(`SELECT id, nome, url, mime, tamanho, user_id, user_nome, created_at FROM tarefa_anexos WHERE tarefa_id = ? ORDER BY id`, [input.id])) as any;
      return {
        tarefa: mapTarefa(r),
        historico: (h as any[]).map((x) => ({ id: Number(x.id), tipo: String(x.tipo), texto: (x.texto as string | null) ?? null, fotoUrl: (x.foto_url as string | null) ?? null, por: (x.user_nome as string | null) ?? null, porId: x.user_id ? Number(x.user_id) : null, em: dt(x.created_at) })),
        anexos: (an as any[]).map((x) => ({ id: Number(x.id), nome: String(x.nome), url: String(x.url), mime: (x.mime as string | null) ?? null, tamanho: x.tamanho ? Number(x.tamanho) : null, porId: x.user_id ? Number(x.user_id) : null, por: (x.user_nome as string | null) ?? null, em: dt(x.created_at) })),
        meuUserId: Number(ctx.user.id),
        gestor: acc.gestor,
        podeEditar: r.origem !== MARCA_META && (acc.gestor || acc.criador),
        podeMudar: true,
      };
    }),

  editar: moduleProcedure(USO, GESTAO)
    .input(z.object({
      id: z.number().int().positive(),
      titulo: z.string().trim().min(2).max(200),
      descricao: z.string().trim().max(4000).nullable().optional(),
      prioridade: z.enum(PRIORIDADES),
      prazo: dataIso.nullable().optional(),
      localId: z.number().int().positive().nullable().optional(),
      responsavelColaboradorId: z.number().int().positive().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDbOrThrow();
      await ensureTables(db);
      const [rows] = (await db.$client.execute(`SELECT * FROM tarefas WHERE id = ?`, [input.id])) as any;
      const t = (rows as any[])[0];
      if (!t) throw new TRPCError({ code: "NOT_FOUND", message: "Tarefa não encontrada" });
      if (t.origem === MARCA_META) throw new TRPCError({ code: "BAD_REQUEST", message: MSG_META });
      const acc = await podeAcessar(db, ctx, t);
      if (!acc.gestor && !acc.criador) throw new TRPCError({ code: "FORBIDDEN", message: "Só quem criou a tarefa ou um supervisor pode alterá-la" });
      let resp = Number(t.responsavel_colaborador_id);
      let nome = t.responsavel_nome as string | null;
      if (acc.gestor && input.responsavelColaboradorId && input.responsavelColaboradorId !== resp) {
        const [c] = (await db.$client.execute(`SELECT id, name FROM collaborators WHERE id = ? AND (active = 1 OR active IS NULL)`, [input.responsavelColaboradorId])) as any;
        const colab = (c as any[])[0];
        if (!colab) throw new TRPCError({ code: "BAD_REQUEST", message: "Colaborador inválido ou inativo" });
        resp = input.responsavelColaboradorId; nome = String(colab.name ?? "").trim();
        await registrar(db, input.id, "editada", `Responsável alterado para ${nome}`, null, ctx);
      }
      await db.$client.execute(
        `UPDATE tarefas SET titulo = ?, descricao = ?, prioridade = ?, prazo = ?, local_id = ?, responsavel_colaborador_id = ?, responsavel_nome = ? WHERE id = ?`,
        [input.titulo, input.descricao || null, input.prioridade, input.prazo ?? null, input.localId ?? null, resp, nome, input.id]
      );
      return { ok: true };
    }),

  // Muda o andamento (A fazer → Em andamento → Concluída). O responsável, quem criou e os supervisores podem.
  mudarStatus: moduleProcedure(USO, GESTAO)
    .input(z.object({
      id: z.number().int().positive(),
      status: z.enum(STATUS),
      comentario: z.string().trim().max(2000).nullable().optional(),
      fotoUrl: z.string().max(2000).nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDbOrThrow();
      await ensureTables(db);
      const [rows] = (await db.$client.execute(`SELECT * FROM tarefas WHERE id = ?`, [input.id])) as any;
      const t = (rows as any[])[0];
      if (!t) throw new TRPCError({ code: "NOT_FOUND", message: "Tarefa não encontrada" });
      if (t.origem === MARCA_META) throw new TRPCError({ code: "BAD_REQUEST", message: MSG_META });
      const acc = await podeAcessar(db, ctx, t);
      if (!acc.gestor && !acc.responsavel && !acc.criador) throw new TRPCError({ code: "FORBIDDEN", message: "Você não tem acesso a esta tarefa" });
      if (t.status === input.status) return { ok: true };
      if (input.status === "concluida" && t.pendencia === "aprovacao" && !acc.gestor) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Esta tarefa aguarda a aprovação de um supervisor para ser concluída" });
      }
      if (input.status === "concluida" && t.pendencia === "bloqueada") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Resolva o bloqueio antes de concluir a tarefa" });
      }
      if (input.status === "concluida") {
        // concluir encerra qualquer pendência (aprovação só por supervisor, bloqueio precisa ser resolvido antes)
        await db.$client.execute(`UPDATE tarefas SET status = ?, concluida_em = NOW(), pendencia = NULL, pendencia_motivo = NULL, pendencia_desde = NULL WHERE id = ?`, [input.status, input.id]);
      } else {
        await db.$client.execute(`UPDATE tarefas SET status = ?, concluida_em = NULL WHERE id = ?`, [input.status, input.id]);
      }
      await registrar(db, input.id, "status", `${STATUS_LABEL[String(t.status)] ?? t.status} → ${STATUS_LABEL[input.status]}${input.comentario ? `: ${input.comentario}` : ""}`, input.fotoUrl ?? null, ctx);
      return { ok: true };
    }),

  // Marca (ou remove) uma pendência: o que está impedindo a tarefa de andar. Ex.: aguardando aprovação, resposta do cliente, material.
  definirPendencia: moduleProcedure(USO, GESTAO)
    .input(z.object({
      id: z.number().int().positive(),
      pendencia: z.enum(PENDENCIAS).nullable(),
      motivo: z.string().trim().max(300).nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDbOrThrow();
      await ensureTables(db);
      const [rows] = (await db.$client.execute(`SELECT * FROM tarefas WHERE id = ?`, [input.id])) as any;
      const t = (rows as any[])[0];
      if (!t) throw new TRPCError({ code: "NOT_FOUND", message: "Tarefa não encontrada" });
      if (t.origem === MARCA_META) throw new TRPCError({ code: "BAD_REQUEST", message: MSG_META });
      const acc = await podeAcessar(db, ctx, t);
      if (!acc.gestor && !acc.responsavel && !acc.criador) throw new TRPCError({ code: "FORBIDDEN", message: "Você não tem acesso a esta tarefa" });
      if (t.status === "concluida") throw new TRPCError({ code: "BAD_REQUEST", message: "A tarefa já está concluída" });
      if (t.pendencia === "aprovacao" && input.pendencia !== "aprovacao" && !acc.gestor) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Só um supervisor pode liberar uma tarefa que aguarda aprovação" });
      }
      if (input.pendencia === "bloqueada" && !input.motivo) throw new TRPCError({ code: "BAD_REQUEST", message: "Explique o que está bloqueando a tarefa" });
      if (input.pendencia) {
        await db.$client.execute(`UPDATE tarefas SET pendencia = ?, pendencia_motivo = ?, pendencia_desde = NOW() WHERE id = ?`, [input.pendencia, input.motivo || null, input.id]);
        await registrar(db, input.id, "pendencia", `${PENDENCIA_LABEL[input.pendencia]}${input.motivo ? `: ${input.motivo}` : ""}`, null, ctx);
      } else {
        await db.$client.execute(`UPDATE tarefas SET pendencia = NULL, pendencia_motivo = NULL, pendencia_desde = NULL WHERE id = ?`, [input.id]);
        await registrar(db, input.id, "pendencia", "Pendência removida", null, ctx);
      }
      return { ok: true };
    }),

  // Supervisor responde a uma tarefa "Aguardando aprovação": aprova (e conclui) ou devolve para ajustes.
  aprovar: moduleProcedure(GESTAO)
    .input(z.object({ id: z.number().int().positive(), aprovar: z.boolean(), comentario: z.string().trim().max(500).nullable().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDbOrThrow();
      await ensureTables(db);
      const [rows] = (await db.$client.execute(`SELECT * FROM tarefas WHERE id = ?`, [input.id])) as any;
      const t = (rows as any[])[0];
      if (!t) throw new TRPCError({ code: "NOT_FOUND", message: "Tarefa não encontrada" });
      if (t.origem === MARCA_META) throw new TRPCError({ code: "BAD_REQUEST", message: MSG_META });
      if (t.pendencia !== "aprovacao") throw new TRPCError({ code: "BAD_REQUEST", message: "Esta tarefa não está aguardando aprovação" });
      if (!input.aprovar && !input.comentario) throw new TRPCError({ code: "BAD_REQUEST", message: "Explique o que precisa ser ajustado" });
      if (input.aprovar) {
        await db.$client.execute(`UPDATE tarefas SET status = 'concluida', concluida_em = NOW(), pendencia = NULL, pendencia_motivo = NULL, pendencia_desde = NULL WHERE id = ?`, [input.id]);
        await registrar(db, input.id, "status", `Aprovada e concluída${input.comentario ? `: ${input.comentario}` : ""}`, null, ctx);
      } else {
        await db.$client.execute(`UPDATE tarefas SET status = 'andamento', concluida_em = NULL, pendencia = NULL, pendencia_motivo = NULL, pendencia_desde = NULL WHERE id = ?`, [input.id]);
        await registrar(db, input.id, "status", `Devolvida para ajustes: ${input.comentario}`, null, ctx);
      }
      return { ok: true };
    }),

  comentar: moduleProcedure(USO, GESTAO)
    .input(z.object({
      id: z.number().int().positive(),
      texto: z.string().trim().max(2000).optional(),
      fotoUrl: z.string().max(2000).nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!input.texto && !input.fotoUrl) throw new TRPCError({ code: "BAD_REQUEST", message: "Escreva um comentário ou anexe uma foto" });
      const db = await getDbOrThrow();
      await ensureTables(db);
      const [rows] = (await db.$client.execute(`SELECT * FROM tarefas WHERE id = ?`, [input.id])) as any;
      const t = (rows as any[])[0];
      if (!t) throw new TRPCError({ code: "NOT_FOUND", message: "Tarefa não encontrada" });
      const acc = await podeAcessar(db, ctx, t);
      if (!acc.gestor && !acc.responsavel && !acc.criador) throw new TRPCError({ code: "FORBIDDEN", message: "Você não tem acesso a esta tarefa" });
      await registrar(db, input.id, "comentario", input.texto ?? null, input.fotoUrl ?? null, ctx);
      await avisarTarefa(db, ctx, t, `Mensagem na tarefa: ${String(t.titulo).slice(0, 80)}`, `${ctx.user.name ?? "Alguém"}: ${input.texto ?? "enviou uma foto"}`.slice(0, 300));
      return { ok: true };
    }),

  // Anexos (documentos, planilhas, PDFs, fotos). O arquivo sobe no navegador (Cloudinary); aqui só guardamos o endereço.
  anexar: moduleProcedure(USO, GESTAO)
    .input(z.object({
      id: z.number().int().positive(),
      nome: z.string().trim().min(1).max(255),
      url: z.string().url().max(2000),
      mime: z.string().max(120).nullable().optional(),
      tamanho: z.number().int().min(0).max(50 * 1024 * 1024).nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDbOrThrow();
      await ensureTables(db);
      const [rows] = (await db.$client.execute(`SELECT * FROM tarefas WHERE id = ?`, [input.id])) as any;
      const t = (rows as any[])[0];
      if (!t) throw new TRPCError({ code: "NOT_FOUND", message: "Tarefa não encontrada" });
      const acc = await podeAcessar(db, ctx, t);
      if (!acc.gestor && !acc.responsavel && !acc.criador) throw new TRPCError({ code: "FORBIDDEN", message: "Você não tem acesso a esta tarefa" });
      await db.$client.execute(
        `INSERT INTO tarefa_anexos (tarefa_id, nome, url, mime, tamanho, user_id, user_nome) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [input.id, input.nome, input.url, input.mime ?? null, input.tamanho ?? null, ctx.user.id ?? null, ctx.user.name ?? null]
      );
      await registrar(db, input.id, "anexo", `Anexou o arquivo "${input.nome}"`, null, ctx);
      await avisarTarefa(db, ctx, t, `Arquivo anexado na tarefa: ${String(t.titulo).slice(0, 80)}`, `${ctx.user.name ?? "Alguém"} anexou "${input.nome}"`);
      return { ok: true };
    }),

  removerAnexo: moduleProcedure(USO, GESTAO)
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDbOrThrow();
      await ensureTables(db);
      const [rows] = (await db.$client.execute(`SELECT * FROM tarefa_anexos WHERE id = ?`, [input.id])) as any;
      const a = (rows as any[])[0];
      if (!a) throw new TRPCError({ code: "NOT_FOUND", message: "Anexo não encontrado" });
      const gestor = await ehGestor(ctx);
      if (!gestor && Number(a.user_id) !== Number(ctx.user.id)) throw new TRPCError({ code: "FORBIDDEN", message: "Só quem anexou ou um supervisor pode remover" });
      await db.$client.execute(`DELETE FROM tarefa_anexos WHERE id = ?`, [input.id]);
      await registrar(db, a.tarefa_id, "anexo", `Removeu o arquivo "${a.nome}"`, null, ctx);
      return { ok: true };
    }),

  excluir: moduleProcedure(USO, GESTAO)
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDbOrThrow();
      await ensureTables(db);
      const [rows] = (await db.$client.execute(`SELECT * FROM tarefas WHERE id = ?`, [input.id])) as any;
      const t = (rows as any[])[0];
      if (!t) throw new TRPCError({ code: "NOT_FOUND", message: "Tarefa não encontrada" });
      if (t.origem === MARCA_META) throw new TRPCError({ code: "BAD_REQUEST", message: MSG_META });
      const acc = await podeAcessar(db, ctx, t);
      if (!acc.gestor && !acc.criador) throw new TRPCError({ code: "FORBIDDEN", message: "Só quem criou a tarefa ou um supervisor pode excluí-la" });
      await db.$client.execute(`DELETE FROM tarefa_historico WHERE tarefa_id = ?`, [input.id]);
      await db.$client.execute(`DELETE FROM tarefa_anexos WHERE tarefa_id = ?`, [input.id]);
      await db.$client.execute(`DELETE FROM tarefas WHERE id = ?`, [input.id]);
      return { ok: true };
    }),
});
