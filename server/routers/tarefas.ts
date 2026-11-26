// Tarefas da operação: cada colaborador tem as suas e os supervisores veem e atribuem para toda a equipe.
// Tabelas criadas sob demanda (sem migração manual).
//   · "tarefas"          → módulo de uso: o colaborador vê e cria as próprias tarefas
//   · "tarefas-gestao"   → supervisor: vê toda a equipe e atribui para qualquer colaborador
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router } from "../_core/trpc";
import { moduleProcedure, resolveUserPermissions } from "./permissions";
import { notifyUsers } from "./notifications";
import { mapaSuperiores, subordinadosDe } from "../utils/hierarquia";

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
        ["pendencia_resp_ids", "VARCHAR(255) NULL"], ["pendencia_descricao", "TEXT NULL"], ["pendencia_resp_nomes", "VARCHAR(600) NULL"],
        // tarefa criada para alguém fora da hierarquia de quem criou: precisa da autorização do superior
        ["autorizacao", "VARCHAR(12) NULL"], ["autorizador_user_id", "INT NULL"], ["autorizador_nome", "VARCHAR(120) NULL"],
        ["autorizacao_motivo", "VARCHAR(300) NULL"], ["autorizacao_em", "DATETIME NULL"],
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
      // Cada pendência que a tarefa teve (para o histórico detalhado, inclusive depois de concluída)
      await db.$client.execute(`
        CREATE TABLE IF NOT EXISTS tarefa_pendencias (
          id INT AUTO_INCREMENT PRIMARY KEY,
          tarefa_id INT NOT NULL,
          tipo VARCHAR(12) NOT NULL,
          motivo VARCHAR(300) NULL,
          descricao TEXT NULL,
          resp_nomes VARCHAR(600) NULL,
          aberta_por INT NULL,
          aberta_por_nome VARCHAR(120) NULL,
          aberta_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          resolvida_em DATETIME NULL,
          resolvida_por INT NULL,
          resolvida_por_nome VARCHAR(120) NULL,
          resolucao VARCHAR(20) NULL,
          KEY tarefa_pend_tarefa (tarefa_id)
        )
      `);
      await recuperarPendenciasAntigas(db);
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
    pendenciaDescricao: (r.pendencia_descricao as string | null) ?? null,
    pendenciaRespIds: String(r.pendencia_resp_ids ?? "").split(",").filter(Boolean).map(Number),
    pendenciaRespNomes: (r.pendencia_resp_nomes as string | null) ?? null,
    autorizacao: (r.autorizacao as "pendente" | "recusada" | null) ?? null,
    autorizadorNome: (r.autorizador_nome as string | null) ?? null,
    autorizacaoMotivo: (r.autorizacao_motivo as string | null) ?? null,
  };
}

// ───────── Hierarquia: quem pode criar tarefa para quem ─────────
// Cada um cria direto para si e para quem está abaixo dele (Usuários do Sistema → Superior). Para os demais,
// a tarefa fica aguardando a autorização do superior de quem criou (sem superior cadastrado: um administrador autoriza).
// Administradores criam para qualquer pessoa.
type Regra = { direto: true } | { direto: false; autorizadorId: number | null; autorizadorNome: string | null };

async function regraAtribuicao(db: any, ctx: any, respColabId: number): Promise<Regra> {
  if (ctx.user.role === "admin") return { direto: true };
  const meus = await meusColaboradorIds(db, ctx.user.id);
  if (meus.includes(respColabId)) return { direto: true };
  const [c] = (await db.$client.execute(`SELECT user_id FROM collaborators WHERE id = ?`, [respColabId])) as any;
  const alvo = Number((c as any[])[0]?.user_id ?? 0);
  if (alvo && alvo === Number(ctx.user.id)) return { direto: true };
  const mapa = await mapaSuperiores(db);
  if (alvo && subordinadosDe(mapa, Number(ctx.user.id)).has(alvo)) return { direto: true };
  const sup = mapa.get(Number(ctx.user.id)) ?? null;
  let nome: string | null = null;
  if (sup) {
    const [u] = (await db.$client.execute(`SELECT name FROM users WHERE id = ?`, [sup])) as any;
    nome = ((u as any[])[0]?.name as string | undefined)?.trim() || null;
  }
  return { direto: false, autorizadorId: sup, autorizadorNome: nome };
}

/** Avisa quem precisa autorizar (o superior; sem superior, os administradores). */
async function avisarAutorizador(db: any, ctx: any, tarefaId: number, titulo: string, para: string, autorizadorId: number | null) {
  try {
    let ids: number[] = [];
    if (autorizadorId) ids = [autorizadorId];
    else { const [a] = (await db.$client.execute(`SELECT id FROM users WHERE role = 'admin'`)) as any; ids = (a as any[]).map((x) => Number(x.id)); }
    ids = ids.filter((id) => id !== Number(ctx.user.id));
    if (ids.length) await notifyUsers({ recipientUserIds: ids, type: "geral", title: "Tarefa aguardando sua autorização", message: `${ctx.user.name ?? "Um colaborador"} quer criar a tarefa "${titulo}" para ${para}`, relatedId: tarefaId, relatedType: "tarefa" });
  } catch (e: any) { console.warn("[tarefas] aviso de autorização:", e?.message); }
}

async function registrar(db: any, tarefaId: number, tipo: string, texto: string | null, fotoUrl: string | null, ctx: any) {
  await db.$client.execute(
    `INSERT INTO tarefa_historico (tarefa_id, tipo, texto, foto_url, user_id, user_nome) VALUES (?, ?, ?, ?, ?, ?)`,
    [tarefaId, tipo, texto, fotoUrl, ctx.user.id ?? null, ctx.user.name ?? null]
  );
}

/** Uma vez só: reconstrói a lista de pendências de tarefas antigas a partir do histórico de mudanças (tabela vazia = ainda não feito). */
async function recuperarPendenciasAntigas(db: any) {
  try {
    const [n] = (await db.$client.execute(`SELECT COUNT(*) AS n FROM tarefa_pendencias`)) as any;
    if (Number((n as any[])[0]?.n ?? 0) > 0) return;
    const [ev] = (await db.$client.execute(
      `SELECT tarefa_id, tipo, texto, user_id, user_nome, created_at FROM tarefa_historico WHERE tipo IN ('pendencia','status') ORDER BY tarefa_id, id`
    )) as any;
    const porLabel = Object.fromEntries(Object.entries(PENDENCIA_LABEL).map(([k, v]) => [v, k]));
    const atual = new Map<number, { id: number }>();
    const ultimo = new Map<number, any>();
    const fechar = async (tarefaId: number, e: any, resolucao: string) => {
      const a = atual.get(tarefaId); if (!a) return;
      await db.$client.execute(`UPDATE tarefa_pendencias SET resolvida_em = ?, resolvida_por = ?, resolvida_por_nome = ?, resolucao = ? WHERE id = ?`, [e.created_at, e.user_id ?? null, e.user_nome ?? null, resolucao, a.id]);
      atual.delete(tarefaId);
    };
    for (const e of ev as any[]) {
      const tid = Number(e.tarefa_id); const texto = String(e.texto ?? "");
      ultimo.set(tid, e);
      if (e.tipo === "pendencia") {
        if (texto.startsWith("Pendência removida")) { await fechar(tid, e, "removida"); continue; }
        const label = Object.keys(porLabel).find((l) => texto.startsWith(l));
        if (!label) continue;
        await fechar(tid, e, "trocada");
        let resto = texto.slice(label.length).replace(/^:\s*/, "");
        let desc: string | null = null; let resp: string | null = null;
        const mD = resto.match(/ · Descrição: ([\s\S]*)$/); if (mD) { desc = mD[1]; resto = resto.slice(0, mD.index); }
        const mR = resto.match(/ · Responsável\(is\): ([\s\S]*)$/); if (mR) { resp = mR[1]; resto = resto.slice(0, mR.index); }
        const motivo = resto.replace(/^ · /, "").trim() || null;
        const [r] = (await db.$client.execute(
          `INSERT INTO tarefa_pendencias (tarefa_id, tipo, motivo, descricao, resp_nomes, aberta_por, aberta_por_nome, aberta_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [tid, porLabel[label], motivo, desc, resp, e.user_id ?? null, e.user_nome ?? null, e.created_at]
        )) as any;
        atual.set(tid, { id: Number((r as any).insertId) });
      } else if (e.tipo === "status") {
        if (/Aprovada e concluída/.test(texto)) await fechar(tid, e, "aprovada");
        else if (/Devolvida para ajustes/.test(texto)) await fechar(tid, e, "devolvida");
        else if (/→ Concluída/.test(texto)) await fechar(tid, e, "concluida");
      }
    }
    // pendência que ficou "aberta" no histórico mas a tarefa já não tem pendência: encerra na última movimentação
    for (const [tid, a] of Array.from(atual.entries())) {
      const [t] = (await db.$client.execute(`SELECT pendencia FROM tarefas WHERE id = ?`, [tid])) as any;
      if (!(t as any[])[0]?.pendencia) await fechar(tid, ultimo.get(tid), "removida");
    }
  } catch (e: any) { console.warn("[tarefas] recuperar pendências:", e?.message); }
}

async function abrirPendencia(db: any, tarefaId: number, tipo: string, motivo: string | null, descricao: string | null, respNomes: string | null, ctx: any, desde: string | null = null) {
  await db.$client.execute(
    `INSERT INTO tarefa_pendencias (tarefa_id, tipo, motivo, descricao, resp_nomes, aberta_por, aberta_por_nome, aberta_em) VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(?, NOW()))`,
    [tarefaId, tipo, motivo, descricao, respNomes, ctx.user.id ?? null, ctx.user.name ?? null, desde]
  );
}
/** Encerra a pendência em aberto da tarefa e guarda como ela terminou (removida, trocada, concluída, aprovada, devolvida). */
async function fecharPendencias(db: any, tarefaId: number, ctx: any, resolucao: string) {
  await db.$client.execute(
    `UPDATE tarefa_pendencias SET resolvida_em = NOW(), resolvida_por = ?, resolvida_por_nome = ?, resolucao = ? WHERE tarefa_id = ? AND resolvida_em IS NULL`,
    [ctx.user.id ?? null, ctx.user.name ?? null, resolucao, tarefaId]
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
    const pr = String(t.pendencia_resp_ids ?? "").split(",").filter(Boolean).map(Number);
    if (t.pendencia && pr.length) {
      const [cs] = (await db.$client.execute(`SELECT user_id FROM collaborators WHERE id IN (${pr.map(() => "?").join(",")})`, pr)) as any;
      for (const c of cs as any[]) if (c.user_id) ids.add(Number(c.user_id));
    }
    ids.delete(Number(ctx.user.id));
    if (!ids.size) return;
    const gestores: number[] = [];
    const comuns: number[] = [];
    const pendUsers = new Set<number>();
    if (t.pendencia && pr.length) { const [cs] = (await db.$client.execute(`SELECT user_id FROM collaborators WHERE id IN (${pr.map(() => "?").join(",")})`, pr)) as any; for (const c of cs as any[]) if (c.user_id) pendUsers.add(Number(c.user_id)); }
    for (const id of Array.from(ids)) ((id === respUser || pendUsers.has(id)) ? comuns : gestores).push(id);
    // o responsável abre em "Minhas tarefas"; quem criou/supervisiona abre em "Tarefas da equipe"
    if (comuns.length) await notifyUsers({ recipientUserIds: comuns, type: "geral", title: titulo, message: mensagem, relatedId: Number(t.id), relatedType: "tarefa" });
    if (gestores.length) await notifyUsers({ recipientUserIds: gestores, type: "geral", title: titulo, message: mensagem, relatedId: Number(t.id), relatedType: "tarefa_equipe" });
  } catch (e: any) { console.warn("[tarefas] aviso:", e?.message); }
}

/** Quem pode mexer numa tarefa: supervisor, o responsável ou quem criou. */
async function podeAcessar(db: any, ctx: any, t: any): Promise<{ gestor: boolean; responsavel: boolean; criador: boolean; pendResp: boolean; autorizador: boolean }> {
  const gestor = await ehGestor(ctx);
  const meus = await meusColaboradorIds(db, ctx.user.id);
  const idsPend = String(t.pendencia_resp_ids ?? "");
  const pendResp = !!t.pendencia && meus.some((id) => idsPend.includes(`,${id},`));
  const autorizador = t.autorizacao === "pendente" && (ctx.user.role === "admin" || Number(t.autorizador_user_id) === Number(ctx.user.id));
  return { gestor, pendResp, autorizador, responsavel: meus.includes(Number(t.responsavel_colaborador_id)) || Number(t.responsavel_user_id) === Number(ctx.user.id), criador: Number(t.criado_por) === Number(ctx.user.id) };
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
    const [rows] = (await db.$client.execute(`SELECT id, name, user_id FROM collaborators WHERE (active = 1 OR active IS NULL) ORDER BY name`)) as any;
    // para quem posso criar tarefa direto (eu e quem está abaixo de mim); os demais precisam de autorização. null = qualquer um (admin)
    const admin = ctx.user.role === "admin";
    const mapa = await mapaSuperiores(db);
    const abaixo = subordinadosDe(mapa, Number(ctx.user.id));
    const diretos = admin ? null : (rows as any[]).filter((r) => meus.includes(Number(r.id)) || (r.user_id && (Number(r.user_id) === Number(ctx.user.id) || abaixo.has(Number(r.user_id))))).map((r) => Number(r.id));
    const sup = mapa.get(Number(ctx.user.id));
    let meuSuperiorNome: string | null = null;
    if (sup) { const [u] = (await db.$client.execute(`SELECT name FROM users WHERE id = ?`, [sup])) as any; meuSuperiorNome = ((u as any[])[0]?.name as string | undefined)?.trim() || null; }
    return {
      gestor,
      admin,
      meuColaboradorId: meus[0] ?? null,
      diretos,
      meuSuperiorNome,
      colaboradores: (rows as any[]).map((r) => ({ id: Number(r.id), nome: String(r.name ?? "").trim() })).filter((c) => c.nome),
      // quem pode ser responsável por uma pendência: colaborador ativo que tem usuário (login) no sistema
      pessoas: (rows as any[]).filter((r) => r.user_id).map((r) => ({ id: Number(r.id), nome: String(r.name ?? "").trim() })).filter((c) => c.nome),
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
      const pend = meus.map(() => "t.pendencia_resp_ids LIKE ?").join(" OR ");
      const filtroResp = meus.length ? `(t.responsavel_colaborador_id IN (${meus.map(() => "?").join(",")}) OR t.responsavel_user_id = ? OR (t.pendencia IS NOT NULL AND (${pend})))` : `t.responsavel_user_id = ?`;
      const [rows] = (await db.$client.execute(
        // + as que eu pedi para outra pessoa e ainda aguardam autorização (ou foram recusadas)
        `${SELECT_TAREFA}
         WHERE ((${filtroResp} AND t.autorizacao IS NULL) OR (t.autorizacao IS NOT NULL AND t.criado_por = ?))
           AND (t.status <> 'concluida' OR t.concluida_em >= ?)
         ORDER BY t.prazo IS NULL, t.prazo, t.id DESC LIMIT 500`,
        meus.length ? [...meus, ctx.user.id, ...meus.map((id) => `%,${id},%`), ctx.user.id, desde] : [ctx.user.id, ctx.user.id, desde]
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
      const where: string[] = ["(t.status <> 'concluida' OR t.concluida_em >= ?)", "t.autorizacao IS NULL"];
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
      let resp = input.responsavelColaboradorId ?? null;
      if (!resp) {
        // sem responsável escolhido: a tarefa é de quem criou
        const meus = await meusColaboradorIds(db, ctx.user.id);
        if (!meus.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Seu usuário não está ligado a um colaborador. Fale com o escritório." });
        resp = meus[0];
      }
      const [c] = (await db.$client.execute(`SELECT id, name FROM collaborators WHERE id = ? AND (active = 1 OR active IS NULL)`, [resp])) as any;
      const colab = (c as any[])[0];
      if (!colab) throw new TRPCError({ code: "BAD_REQUEST", message: "Colaborador inválido ou inativo" });
      const nomeResp = String(colab.name ?? "").trim();
      const regra = await regraAtribuicao(db, ctx, resp);
      const aut = regra.direto ? null : regra;
      const [res] = (await db.$client.execute(
        `INSERT INTO tarefas (titulo, descricao, prioridade, prazo, local_id, responsavel_colaborador_id, responsavel_nome, criado_por, criado_por_nome,
           autorizacao, autorizador_user_id, autorizador_nome)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [input.titulo, input.descricao || null, input.prioridade, input.prazo ?? null, input.localId ?? null, resp, nomeResp, ctx.user.id ?? null, (ctx.user as any).name ?? null,
         aut ? "pendente" : null, aut?.autorizadorId ?? null, aut ? aut.autorizadorNome ?? "Administrador" : null]
      )) as any;
      const id = Number((res as any).insertId);
      await registrar(db, id, "criada", `Tarefa criada para ${nomeResp}${aut ? ` · aguardando autorização de ${aut.autorizadorNome ?? "um administrador"}` : ""}`, null, ctx);
      if (aut) await avisarAutorizador(db, ctx, id, input.titulo, nomeResp, aut.autorizadorId);
      return { id, aguardandoAutorizacao: !!aut, autorizadorNome: aut ? aut.autorizadorNome ?? "um administrador" : null };
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
      if (!acc.gestor && !acc.responsavel && !acc.criador && !acc.pendResp && !acc.autorizador) throw new TRPCError({ code: "FORBIDDEN", message: "Você não tem acesso a esta tarefa" });
      const [h] = (await db.$client.execute(`SELECT id, tipo, texto, foto_url, user_id, user_nome, created_at FROM tarefa_historico WHERE tarefa_id = ? ORDER BY id`, [input.id])) as any;
      const [an] = (await db.$client.execute(`SELECT id, nome, url, mime, tamanho, user_id, user_nome, created_at FROM tarefa_anexos WHERE tarefa_id = ? ORDER BY id`, [input.id])) as any;
      const [pe] = (await db.$client.execute(`SELECT * FROM tarefa_pendencias WHERE tarefa_id = ? ORDER BY id`, [input.id])) as any;
      return {
        tarefa: mapTarefa(r),
        pendencias: (pe as any[]).map((x) => ({ id: Number(x.id), tipo: String(x.tipo), motivo: (x.motivo as string | null) ?? null, descricao: (x.descricao as string | null) ?? null, respNomes: (x.resp_nomes as string | null) ?? null, abertaPor: (x.aberta_por_nome as string | null) ?? null, abertaEm: dt(x.aberta_em), resolvidaEm: dt(x.resolvida_em), resolvidaPor: (x.resolvida_por_nome as string | null) ?? null, resolucao: (x.resolucao as string | null) ?? null })),
        historico: (h as any[]).map((x) => ({ id: Number(x.id), tipo: String(x.tipo), texto: (x.texto as string | null) ?? null, fotoUrl: (x.foto_url as string | null) ?? null, por: (x.user_nome as string | null) ?? null, porId: x.user_id ? Number(x.user_id) : null, em: dt(x.created_at) })),
        anexos: (an as any[]).map((x) => ({ id: Number(x.id), nome: String(x.nome), url: String(x.url), mime: (x.mime as string | null) ?? null, tamanho: x.tamanho ? Number(x.tamanho) : null, porId: x.user_id ? Number(x.user_id) : null, por: (x.user_nome as string | null) ?? null, em: dt(x.created_at) })),
        meuUserId: Number(ctx.user.id),
        gestor: acc.gestor,
        podeEditar: r.origem !== MARCA_META && (acc.gestor || acc.criador),
        podeMudar: !r.autorizacao,
        podeAutorizar: acc.autorizador,
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
      // trocar o responsável para alguém fora da hierarquia (ou reenviar uma recusada) volta a pedir autorização
      let regra: Regra | null = null;
      if (input.responsavelColaboradorId && input.responsavelColaboradorId !== resp) {
        const [c] = (await db.$client.execute(`SELECT id, name FROM collaborators WHERE id = ? AND (active = 1 OR active IS NULL)`, [input.responsavelColaboradorId])) as any;
        const colab = (c as any[])[0];
        if (!colab) throw new TRPCError({ code: "BAD_REQUEST", message: "Colaborador inválido ou inativo" });
        resp = input.responsavelColaboradorId; nome = String(colab.name ?? "").trim();
        regra = await regraAtribuicao(db, ctx, resp);
        await registrar(db, input.id, "editada", `Responsável alterado para ${nome}`, null, ctx);
      } else if (t.autorizacao === "recusada") {
        regra = await regraAtribuicao(db, ctx, resp);
      }
      const aut = regra && !regra.direto ? regra : null;
      await db.$client.execute(
        `UPDATE tarefas SET titulo = ?, descricao = ?, prioridade = ?, prazo = ?, local_id = ?, responsavel_colaborador_id = ?, responsavel_nome = ? WHERE id = ?`,
        [input.titulo, input.descricao || null, input.prioridade, input.prazo ?? null, input.localId ?? null, resp, nome, input.id]
      );
      if (regra) {
        await db.$client.execute(
          `UPDATE tarefas SET autorizacao = ?, autorizador_user_id = ?, autorizador_nome = ?, autorizacao_motivo = NULL, autorizacao_em = NULL WHERE id = ?`,
          [aut ? "pendente" : null, aut?.autorizadorId ?? null, aut ? aut.autorizadorNome ?? "Administrador" : null, input.id]
        );
        if (aut) {
          await registrar(db, input.id, "editada", `Aguardando autorização de ${aut.autorizadorNome ?? "um administrador"}`, null, ctx);
          await avisarAutorizador(db, ctx, input.id, input.titulo, nome ?? "-", aut.autorizadorId);
        }
      }
      return { ok: true, aguardandoAutorizacao: !!aut, autorizadorNome: aut ? aut.autorizadorNome ?? "um administrador" : null };
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
      if (t.autorizacao) throw new TRPCError({ code: "BAD_REQUEST", message: t.autorizacao === "recusada" ? "Esta tarefa foi recusada pelo superior" : "Esta tarefa ainda aguarda autorização" });
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
        await fecharPendencias(db, input.id, ctx, "concluida");
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
      descricao: z.string().trim().max(2000).nullable().optional(), // detalhes da pendência
      responsaveis: z.array(z.number().int().positive()).max(10).optional(), // colaboradores responsáveis por resolver a pendência
      desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(), // quando a pendência começou (vazio = agora)
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDbOrThrow();
      await ensureTables(db);
      const [rows] = (await db.$client.execute(`SELECT * FROM tarefas WHERE id = ?`, [input.id])) as any;
      const t = (rows as any[])[0];
      if (!t) throw new TRPCError({ code: "NOT_FOUND", message: "Tarefa não encontrada" });
      if (t.origem === MARCA_META) throw new TRPCError({ code: "BAD_REQUEST", message: MSG_META });
      const acc = await podeAcessar(db, ctx, t);
      if (!acc.gestor && !acc.responsavel && !acc.criador && !acc.pendResp) throw new TRPCError({ code: "FORBIDDEN", message: "Você não tem acesso a esta tarefa" });
      if (t.autorizacao) throw new TRPCError({ code: "BAD_REQUEST", message: "Esta tarefa ainda não foi autorizada" });
      if (t.status === "concluida") throw new TRPCError({ code: "BAD_REQUEST", message: "A tarefa já está concluída" });
      if (t.pendencia === "aprovacao" && input.pendencia !== "aprovacao" && !acc.gestor) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Só um supervisor pode liberar uma tarefa que aguarda aprovação" });
      }
      if (input.pendencia === "bloqueada" && !input.motivo) throw new TRPCError({ code: "BAD_REQUEST", message: "Explique o que está bloqueando a tarefa" });
      if (input.pendencia) {
        // quem deve resolver a pendência (uma ou mais pessoas)
        const idsResp = Array.from(new Set(input.responsaveis ?? []));
        let pessoas: { id: number; nome: string; userId: number | null }[] = [];
        if (idsResp.length) {
          const [cs] = (await db.$client.execute(`SELECT id, name, user_id FROM collaborators WHERE id IN (${idsResp.map(() => "?").join(",")})`, idsResp)) as any;
          pessoas = (cs as any[]).map((c) => ({ id: Number(c.id), nome: String(c.name ?? "").trim(), userId: c.user_id ? Number(c.user_id) : null }));
        }
        let desdeSql: string | null = null;
        if (input.desde) {
          const d = new Date(input.desde + "T12:00:00");
          if (isNaN(d.getTime())) throw new TRPCError({ code: "BAD_REQUEST", message: "Data de início inválida" });
          if (d.getTime() > Date.now() + 24 * 3600 * 1000) throw new TRPCError({ code: "BAD_REQUEST", message: "A data de início não pode estar no futuro" });
          // só a data: hoje vale o momento atual; outro dia fica ao meio-dia (evita virar o dia por fuso)
          const hoje = new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
          desdeSql = input.desde === hoje ? null : input.desde + " 12:00:00";
        }
        const respIds = pessoas.length ? `,${pessoas.map((p) => p.id).join(",")},` : null;
        const respNomes = pessoas.length ? pessoas.map((p) => p.nome).join(", ").slice(0, 600) : null;
        await db.$client.execute(`UPDATE tarefas SET pendencia = ?, pendencia_motivo = ?, pendencia_desde = COALESCE(?, NOW()), pendencia_resp_ids = ?, pendencia_resp_nomes = ?, pendencia_descricao = ? WHERE id = ?`, [input.pendencia, input.motivo || null, desdeSql, respIds, respNomes, input.descricao || null, input.id]);
        await registrar(db, input.id, "pendencia", `${PENDENCIA_LABEL[input.pendencia]}${input.motivo ? `: ${input.motivo}` : ""}${respNomes ? ` · Responsável(is): ${respNomes}` : ""}${input.descricao ? ` · Descrição: ${input.descricao}` : ""}`, null, ctx);
        await fecharPendencias(db, input.id, ctx, "trocada");
        await abrirPendencia(db, input.id, input.pendencia, input.motivo || null, input.descricao || null, respNomes, ctx, desdeSql);
        const avisar = pessoas.map((p) => p.userId).filter((u): u is number => !!u && u !== Number(ctx.user.id));
        if (avisar.length) {
          try { await notifyUsers({ recipientUserIds: avisar, type: "geral", title: `Pendência para você: ${String(t.titulo).slice(0, 80)}`, message: `${ctx.user.name ?? "Alguém"} marcou "${PENDENCIA_LABEL[input.pendencia]}" e indicou você como responsável.`.slice(0, 300), relatedId: Number(t.id), relatedType: "tarefa" }); }
          catch (e: any) { console.warn("[tarefas] aviso pendência:", e?.message); }
        }
      } else {
        await db.$client.execute(`UPDATE tarefas SET pendencia = NULL, pendencia_motivo = NULL, pendencia_desde = NULL, pendencia_resp_ids = NULL, pendencia_resp_nomes = NULL, pendencia_descricao = NULL WHERE id = ?`, [input.id]);
        await fecharPendencias(db, input.id, ctx, "removida");
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
        await fecharPendencias(db, input.id, ctx, "aprovada");
        await registrar(db, input.id, "status", `Aprovada e concluída${input.comentario ? `: ${input.comentario}` : ""}`, null, ctx);
      } else {
        await db.$client.execute(`UPDATE tarefas SET status = 'andamento', concluida_em = NULL, pendencia = NULL, pendencia_motivo = NULL, pendencia_desde = NULL WHERE id = ?`, [input.id]);
        await fecharPendencias(db, input.id, ctx, "devolvida");
        await registrar(db, input.id, "status", `Devolvida para ajustes: ${input.comentario}`, null, ctx);
      }
      return { ok: true };
    }),

  // Solicitações de tarefa que esperam a MINHA autorização (admin vê todas).
  solicitacoes: moduleProcedure(USO, GESTAO).query(async ({ ctx }) => {
    const db = await getDbOrThrow();
    await ensureTables(db);
    const admin = ctx.user.role === "admin";
    const [rows] = (await db.$client.execute(
      `${SELECT_TAREFA} WHERE t.autorizacao = 'pendente' ${admin ? "" : "AND t.autorizador_user_id = ?"} ORDER BY t.id DESC LIMIT 200`,
      admin ? [] : [ctx.user.id]
    )) as any;
    return (rows as any[]).map(mapTarefa);
  }),

  // O superior autoriza (a tarefa passa a valer para o responsável) ou recusa (volta para quem pediu, com o motivo).
  autorizar: moduleProcedure(USO, GESTAO)
    .input(z.object({ id: z.number().int().positive(), aprovar: z.boolean(), motivo: z.string().trim().max(300).nullable().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDbOrThrow();
      await ensureTables(db);
      const [rows] = (await db.$client.execute(`SELECT * FROM tarefas WHERE id = ?`, [input.id])) as any;
      const t = (rows as any[])[0];
      if (!t) throw new TRPCError({ code: "NOT_FOUND", message: "Tarefa não encontrada" });
      if (t.autorizacao !== "pendente") throw new TRPCError({ code: "BAD_REQUEST", message: "Esta tarefa não está aguardando autorização" });
      const acc = await podeAcessar(db, ctx, t);
      if (!acc.autorizador) throw new TRPCError({ code: "FORBIDDEN", message: "Só o superior de quem pediu (ou um administrador) pode autorizar" });
      if (!input.aprovar && !input.motivo) throw new TRPCError({ code: "BAD_REQUEST", message: "Diga por que a tarefa foi recusada" });
      const eu = String((ctx.user as any).name ?? "").trim() || "Superior";
      await db.$client.execute(
        `UPDATE tarefas SET autorizacao = ?, autorizacao_motivo = ?, autorizacao_em = NOW(), autorizador_user_id = ?, autorizador_nome = ? WHERE id = ?`,
        [input.aprovar ? null : "recusada", input.aprovar ? null : input.motivo, ctx.user.id, eu, input.id]
      );
      await registrar(db, input.id, "status", input.aprovar ? `Autorizada por ${eu}` : `Recusada por ${eu}: ${input.motivo}`, null, ctx);
      try {
        // quem pediu fica sabendo; se autorizada, o responsável também
        const ids = new Set<number>();
        if (t.criado_por) ids.add(Number(t.criado_por));
        if (input.aprovar) {
          const [c] = (await db.$client.execute(`SELECT user_id FROM collaborators WHERE id = ?`, [t.responsavel_colaborador_id])) as any;
          const u = Number((c as any[])[0]?.user_id ?? 0);
          if (u) await notifyUsers({ recipientUserIds: [u], type: "geral", title: "Nova tarefa para você", message: `"${t.titulo}" (pedida por ${t.criado_por_nome ?? "-"}, autorizada por ${eu})`, relatedId: Number(t.id), relatedType: "tarefa" });
          ids.delete(u);
        }
        ids.delete(Number(ctx.user.id));
        if (ids.size) await notifyUsers({ recipientUserIds: Array.from(ids), type: "geral", title: input.aprovar ? "Tarefa autorizada" : "Tarefa recusada", message: input.aprovar ? `${eu} autorizou "${t.titulo}" para ${t.responsavel_nome ?? "-"}` : `${eu} recusou "${t.titulo}": ${input.motivo}`, relatedId: Number(t.id), relatedType: "tarefa" });
      } catch (e: any) { console.warn("[tarefas] aviso de autorização:", e?.message); }
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
      if (!acc.gestor && !acc.responsavel && !acc.criador && !acc.pendResp) throw new TRPCError({ code: "FORBIDDEN", message: "Você não tem acesso a esta tarefa" });
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
      if (!acc.gestor && !acc.responsavel && !acc.criador && !acc.pendResp) throw new TRPCError({ code: "FORBIDDEN", message: "Você não tem acesso a esta tarefa" });
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
      await db.$client.execute(`DELETE FROM tarefa_pendencias WHERE tarefa_id = ?`, [input.id]);
      await db.$client.execute(`DELETE FROM tarefas WHERE id = ?`, [input.id]);
      return { ok: true };
    }),
});
