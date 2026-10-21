// Metas semanais: meta por carga e por comprador, relatos do dia, conversa com supervisores e histórico.
// Tudo é só acrescentado (nada é apagado): meta cancelada continua no histórico.
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router } from "../_core/trpc";
import { moduleProcedure, resolveUserPermissions } from "./permissions";
import { notifyUsers } from "./notifications";
import {
  KINDS_ENTRY, weekBounds, addDays, hojeISO, papelNaMeta, podeVer, podeEditarMeta, podeEncerrar, podeDarCiencia,
  podeRelatar, tiposMensagemPermitidos, calcularProgresso, calcularAlertas, normalizaDestino,
  type PapelMeta, type CargaLeve, type ItemMeta, type Alerta,
} from "../utils/weeklyGoals";

const USO = "metas-semanais" as const;
const GESTAO = "metas-semanais-gestao" as const;
const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

async function getDbOrThrow() {
  const { getDb } = await import("../db");
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
  return db;
}

type Db = { $client: { execute: (sql: string, params?: any[]) => Promise<any> } };
const q = async (db: Db, sql: string, params: any[] = []): Promise<any[]> => (await db.$client.execute(sql, params))[0] as any[];

// Criação lazy e idempotente (evita a trava de 6h da migration de boot)
let ensurePromise: Promise<void> | null = null;
function ensureTables(db: Db): Promise<void> {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      const run = (s: string) => db.$client.execute(s);
      await run(`CREATE TABLE IF NOT EXISTS weekly_goals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        week_start VARCHAR(10) NOT NULL, week_end VARCHAR(10) NOT NULL,
        title VARCHAR(200) NOT NULL, description TEXT NULL,
        responsible_user_id INT NOT NULL, responsible_name VARCHAR(160) NULL,
        created_by INT NOT NULL, created_by_name VARCHAR(160) NULL,
        status VARCHAR(24) NOT NULL DEFAULT 'aguardando_ciencia',
        ack VARCHAR(16) NOT NULL DEFAULT 'pendente', ack_at DATETIME NULL, ack_comment TEXT NULL,
        closed_at DATETIME NULL, closed_by INT NULL, closing_summary TEXT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX weekly_goals_week_idx (week_start), INDEX weekly_goals_resp_idx (responsible_user_id)
      )`);
      await run(`CREATE TABLE IF NOT EXISTS weekly_goal_items (
        id INT AUTO_INCREMENT PRIMARY KEY, goal_id INT NOT NULL, destination_id INT NOT NULL,
        destination_name VARCHAR(200) NOT NULL, target_cargas INT NOT NULL, observacao VARCHAR(300) NULL,
        INDEX weekly_goal_items_goal_idx (goal_id)
      )`);
      await run(`CREATE TABLE IF NOT EXISTS weekly_goal_item_days (
        id INT AUTO_INCREMENT PRIMARY KEY, item_id INT NOT NULL, plan_date VARCHAR(10) NOT NULL, target_cargas INT NOT NULL,
        UNIQUE KEY weekly_goal_item_days_unique (item_id, plan_date)
      )`);
      await run(`CREATE TABLE IF NOT EXISTS weekly_goal_supervisors (
        goal_id INT NOT NULL, user_id INT NOT NULL, user_name VARCHAR(160) NULL, PRIMARY KEY (goal_id, user_id)
      )`);
      await run(`CREATE TABLE IF NOT EXISTS weekly_goal_entries (
        id INT AUTO_INCREMENT PRIMARY KEY, goal_id INT NOT NULL, entry_date VARCHAR(10) NOT NULL,
        kind VARCHAR(20) NOT NULL, situacao VARCHAR(12) NOT NULL DEFAULT 'ok', body TEXT NOT NULL,
        photo_urls TEXT NULL, author_user_id INT NOT NULL, author_name VARCHAR(160) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX weekly_goal_entries_goal_idx (goal_id, entry_date)
      )`);
      await run(`CREATE TABLE IF NOT EXISTS weekly_goal_messages (
        id INT AUTO_INCREMENT PRIMARY KEY, goal_id INT NOT NULL, entry_id INT NULL, parent_id INT NULL,
        kind VARCHAR(16) NOT NULL, body TEXT NOT NULL, author_user_id INT NULL, author_name VARCHAR(160) NULL,
        author_role VARCHAR(16) NULL, answered TINYINT NOT NULL DEFAULT 0, msg_date VARCHAR(10) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX weekly_goal_messages_goal_idx (goal_id, created_at)
      )`);
    })().catch(e => { ensurePromise = null; throw e; });
  }
  return ensurePromise;
}

type UserCtx = { id: number; role: string; name?: string | null };
const isAdmin = (u: UserCtx) => u.role === "admin";

type GoalRow = {
  id: number; weekStart: string; weekEnd: string; title: string; description: string | null;
  responsibleUserId: number; responsibleName: string | null; createdBy: number; createdByName: string | null;
  status: string; ack: "pendente" | "de_acordo" | "com_ressalva"; ackAt: any; ackComment: string | null;
  closedAt: any; closingSummary: string | null; createdAt: any;
};
const mapGoal = (r: any): GoalRow => ({
  id: r.id, weekStart: r.week_start, weekEnd: r.week_end, title: r.title, description: r.description ?? null,
  responsibleUserId: r.responsible_user_id, responsibleName: r.responsible_name ?? null,
  createdBy: r.created_by, createdByName: r.created_by_name ?? null, status: r.status, ack: r.ack,
  ackAt: r.ack_at ?? null, ackComment: r.ack_comment ?? null, closedAt: r.closed_at ?? null,
  closingSummary: r.closing_summary ?? null, createdAt: r.created_at,
});

async function carregarMeta(db: Db, id: number) {
  const [g] = await q(db, `SELECT * FROM weekly_goals WHERE id = ?`, [id]);
  if (!g) throw new TRPCError({ code: "NOT_FOUND", message: "Meta não encontrada" });
  const sups = await q(db, `SELECT user_id, user_name FROM weekly_goal_supervisors WHERE goal_id = ? ORDER BY user_name`, [id]);
  return { goal: mapGoal(g), supervisors: sups.map(s => ({ userId: s.user_id as number, name: (s.user_name ?? "") as string })) };
}

async function exigirPapel(db: Db, user: UserCtx, id: number) {
  const m = await carregarMeta(db, id);
  const papel = papelNaMeta({ id: user.id, isAdmin: isAdmin(user) }, m.goal, m.supervisors.map(s => s.userId));
  if (!podeVer(papel)) throw new TRPCError({ code: "FORBIDDEN", message: "Você não participa desta meta" });
  return { ...m, papel: papel as PapelMeta };
}

async function nomeDe(db: Db, userId: number): Promise<string> {
  const [u] = await q(db, `SELECT name FROM users WHERE id = ?`, [userId]);
  return String(u?.name ?? `Usuário #${userId}`);
}

// Avisos no sino — falha de aviso nunca derruba a ação
async function avisar(userIds: number[], title: string, message: string, goalId: number, exceto?: number) {
  const ids = Array.from(new Set(userIds)).filter(id => id && id !== exceto);
  if (ids.length === 0) return;
  try { await notifyUsers({ recipientUserIds: ids, type: "geral", title, message, relatedId: goalId, relatedType: "weekly_goal" }); }
  catch (e: any) { console.warn("[WeeklyGoals] Falha ao notificar:", e?.message); }
}

const interessados = (m: { goal: GoalRow; supervisors: { userId: number }[] }) =>
  [m.goal.createdBy, ...m.supervisors.map(s => s.userId)];

async function mensagemSistema(db: Db, goalId: number, body: string, msgDate?: string) {
  await db.$client.execute(
    `INSERT INTO weekly_goal_messages (goal_id, kind, body, author_role, msg_date) VALUES (?, 'sistema', ?, 'sistema', ?)`,
    [goalId, body, msgDate ?? hojeISO()]
  );
}

async function cargasDaSemana(db: Db, inicio: string, fim: string) {
  const rows = await q(db,
    `SELECT cl.id, DATE_FORMAT(cl.date, '%Y-%m-%d') AS d, cl.destination_id, cl.status, cl.vehicle_plate, cl.driver_name,
            cl.weight_net_kg, cl.weight_out_kg, cl.created_at, cd.name AS dest_name
     FROM cargo_loads cl
     LEFT JOIN cargo_destinations cd ON cd.id = IF(cl.destination_id >= 10000, cl.destination_id - 10000, cl.destination_id)
     WHERE DATE(cl.date) BETWEEN ? AND ? AND cl.status <> 'cancelado' ORDER BY cl.date, cl.id`, [inicio, fim]);
  return rows.map(r => ({
    id: r.id as number, data: String(r.d), destinationId: (r.destination_id ?? null) as number | null, status: String(r.status),
    placa: (r.vehicle_plate ?? null) as string | null, motorista: (r.driver_name ?? null) as string | null,
    pesoKg: parseFloat(r.weight_net_kg || r.weight_out_kg || "0") || 0, registradoEm: r.created_at as any,
    destinoNome: (r.dest_name ?? null) as string | null,
  }));
}

async function itensDaMeta(db: Db, goalId: number): Promise<(ItemMeta & { destinationName: string; observacao: string | null })[]> {
  const itens = await q(db, `SELECT * FROM weekly_goal_items WHERE goal_id = ? ORDER BY id`, [goalId]);
  const dias = itens.length ? await q(db, `SELECT * FROM weekly_goal_item_days WHERE item_id IN (${itens.map(() => "?").join(",")}) ORDER BY plan_date`, itens.map(i => i.id)) : [];
  return itens.map(i => ({
    id: i.id, destinationId: i.destination_id, destinationName: i.destination_name, targetCargas: i.target_cargas,
    observacao: i.observacao ?? null,
    dias: dias.filter(d => d.item_id === i.id).map(d => ({ data: d.plan_date as string, target: d.target_cargas as number })),
  }));
}

async function resumoDaMeta(db: Db, g: GoalRow, hoje: string) {
  const itens = await itensDaMeta(db, g.id);
  const sem = weekBounds(g.weekStart);
  const cargas = await cargasDaSemana(db, sem.start, sem.end);
  const prog = calcularProgresso(itens, cargas.map(c => ({ id: c.id, data: c.data, destinationId: c.destinationId, status: c.status } as CargaLeve)), sem.days);
  const [rel] = await q(db, `SELECT SUM(entry_date = ?) AS hoje, SUM(entry_date = ? AND kind = 'fechamento_dia') AS fechou,
                                    SUM(entry_date = ? AND (kind = 'problema' OR situacao = 'problema')) AS prob
                             FROM weekly_goal_entries WHERE goal_id = ?`, [hoje, hoje, hoje, g.id]);
  const [pq] = await q(db, `SELECT COUNT(*) AS n FROM weekly_goal_messages WHERE goal_id = ? AND kind = 'pergunta' AND answered = 0`, [g.id]);
  const decorridos = hoje < sem.start ? 0 : hoje > sem.end ? 7 : sem.days.indexOf(hoje) + 1;
  const alertas: Alerta[] = calcularAlertas({
    status: g.status, ack: g.ack, hoje, semana: { start: sem.start, end: sem.end }, relatosHoje: Number(rel?.hoje ?? 0),
    fechouHoje: Number(rel?.fechou ?? 0) > 0, problemaHoje: Number(rel?.prob ?? 0) > 0,
    perguntasSemResposta: Number(pq?.n ?? 0), pctMeta: prog.total.pct, diasDecorridos: decorridos,
  });
  return {
    itens, progresso: prog, alertas, dias: sem.days, cargas,
    hoje: { relatos: Number(rel?.hoje ?? 0), fechou: Number(rel?.fechou ?? 0) > 0, problema: Number(rel?.prob ?? 0) > 0 },
    perguntasSemResposta: Number(pq?.n ?? 0),
  };
}

const itemInput = z.object({
  destinationId: z.number(),
  targetCargas: z.number().int().min(1).max(500),
  observacao: z.string().max(300).nullable().optional(),
  dias: z.array(z.object({ data, target: z.number().int().min(0).max(100) })).max(7).optional(),
});

async function gravarItens(db: Db, goalId: number, semana: { days: string[] }, itens: z.infer<typeof itemInput>[]) {
  for (const it of itens) {
    const [d] = await q(db, `SELECT id, name, nickname FROM cargo_destinations WHERE id = ?`, [normalizaDestino(it.destinationId) ?? it.destinationId]);
    if (!d) throw new TRPCError({ code: "BAD_REQUEST", message: "Comprador não encontrado" });
    const [res] = (await db.$client.execute(
      `INSERT INTO weekly_goal_items (goal_id, destination_id, destination_name, target_cargas, observacao) VALUES (?, ?, ?, ?, ?)`,
      [goalId, d.id, String(d.nickname || d.name), it.targetCargas, it.observacao ?? null]
    )) as any;
    for (const dia of it.dias ?? []) {
      if (!semana.days.includes(dia.data) || dia.target <= 0) continue;
      await db.$client.execute(`INSERT INTO weekly_goal_item_days (item_id, plan_date, target_cargas) VALUES (?, ?, ?)`, [res.insertId, dia.data, dia.target]);
    }
  }
}

const descreveItens = (itens: { destinationName: string; targetCargas: number }[]) =>
  itens.map(i => `${i.targetCargas}x ${i.destinationName}`).join(", ");

export const weeklyGoalsRouter = router({
  // ── Apoio ao formulário ──
  opcoes: moduleProcedure(GESTAO).query(async () => {
    const db = await getDbOrThrow();
    await ensureTables(db);
    // Usuários com login + nome do colaborador vinculado (collaborators.user_id), quando existir
    const users = await q(db, `SELECT u.id, u.name, u.email, u.role, c.name AS colaborador
       FROM users u LEFT JOIN collaborators c ON c.user_id = u.id AND (c.active = 1 OR c.active IS NULL) ORDER BY COALESCE(c.name, u.name)`);
    // Só quem consegue abrir o módulo (administradores ou com "Metas Semanais" liberado)
    const comAcesso: typeof users = [];
    const vistos = new Set<number>(); // um usuário ligado a mais de um colaborador aparece uma vez só
    for (const u of users) {
      if (vistos.has(u.id)) continue;
      vistos.add(u.id);
      if (u.role === "admin") { comAcesso.push(u); continue; }
      try {
        const perms = await resolveUserPermissions(u.id, u.role);
        if (perms.modules === null || perms.modules.includes(USO) || perms.modules.includes(GESTAO)) comAcesso.push(u);
      } catch { /* sem permissões legíveis: não lista */ }
    }
    const dests = await q(db, `SELECT id, name, nickname FROM cargo_destinations WHERE (is_buyer = 1 OR is_buyer IS NULL) AND (active = 1 OR active IS NULL) ORDER BY COALESCE(NULLIF(nickname,''), name)`);
    return {
      usuarios: comAcesso.map(u => ({
        id: u.id as number,
        nome: (u.colaborador && String(u.colaborador).trim().toLowerCase() !== String(u.name).trim().toLowerCase() ? `${String(u.colaborador).trim()} (${String(u.name).trim()})` : String(u.colaborador || u.name).trim()),
        email: String(u.email), admin: u.role === "admin",
      })),
      compradores: dests.map(d => ({ id: d.id as number, nome: String(d.nickname || d.name) })),
    };
  }),

  // ── Lista da semana, conforme o papel do usuário ──
  list: moduleProcedure(USO, GESTAO)
    .input(z.object({ semana: data.optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDbOrThrow();
      await ensureTables(db);
      const hoje = hojeISO();
      const sem = weekBounds(input?.semana ?? hoje);
      const rows = await q(db, `SELECT * FROM weekly_goals WHERE week_start = ? ORDER BY responsible_name, id`, [sem.start]);
      const out: any[] = [];
      for (const r of rows) {
        const g = mapGoal(r);
        const sups = (await q(db, `SELECT user_id, user_name FROM weekly_goal_supervisors WHERE goal_id = ?`, [g.id]));
        const papel = papelNaMeta({ id: ctx.user.id, isAdmin: isAdmin(ctx.user) }, g, sups.map(s => s.user_id));
        if (!podeVer(papel)) continue;
        const res = await resumoDaMeta(db, g, hoje);
        out.push({
          ...g, papel, supervisores: sups.map(s => ({ userId: s.user_id as number, name: (s.user_name ?? "") as string })),
          metaResumo: descreveItens(res.itens), progresso: res.progresso, alertas: res.alertas, hoje: res.hoje,
        });
      }
      return { semana: sem, hoje, metas: out };
    }),

  // ── Detalhe completo: itens, dia a dia, relatos, conversa ──
  getById: moduleProcedure(USO, GESTAO)
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDbOrThrow();
      await ensureTables(db);
      const m = await exigirPapel(db, ctx.user, input.id);
      const hoje = hojeISO();
      const res = await resumoDaMeta(db, m.goal, hoje);
      const entries = await q(db, `SELECT * FROM weekly_goal_entries WHERE goal_id = ? ORDER BY entry_date, created_at, id`, [input.id]);
      const messages = await q(db, `SELECT * FROM weekly_goal_messages WHERE goal_id = ? ORDER BY created_at, id`, [input.id]);

      const destinosDaMeta = new Set(res.itens.map(i => i.destinationId));
      const dias = res.dias.map(dia => {
        const cargasDia = res.cargas.filter(c => c.data === dia);
        const doComprador = cargasDia.filter(c => destinosDaMeta.has(normalizaDestino(c.destinationId) ?? -1));
        return {
          data: dia,
          porComprador: res.progresso.itens.map(p => {
            const x = p.porDia.find(d => d.data === dia)!;
            const item = res.itens.find(i => i.id === p.itemId)!;
            return { itemId: p.itemId, comprador: item.destinationName, planejado: x.planejado, carregadas: x.carregadas, entregues: x.entregues };
          }),
          cargas: doComprador.map(c => ({
            id: c.id, comprador: c.destinoNome ?? "—", placa: c.placa, motorista: c.motorista, pesoKg: c.pesoKg,
            status: c.status, registradoEm: c.registradoEm,
          })),
          outrasCargas: cargasDia.length - doComprador.length,
          relatos: entries.filter(e => e.entry_date === dia).map(e => mapEntry(e)),
          mensagens: messages.filter(x => x.msg_date === dia).map(x => mapMsg(x)),
        };
      });

      return {
        goal: m.goal, supervisores: m.supervisors, papel: m.papel,
        permissoes: {
          editar: podeEditarMeta(m.papel), encerrar: podeEncerrar(m.papel),
          ciencia: podeDarCiencia(m.papel) && (m.goal.ack === "pendente" || m.goal.status === "em_negociacao"),
          resolverRessalva: podeEncerrar(m.papel) && m.goal.status === "em_negociacao",
          relatar: podeRelatar(m.papel) && m.goal.status === "em_andamento",
          mensagens: tiposMensagemPermitidos(m.papel),
        },
        itens: res.itens, progresso: res.progresso, alertas: res.alertas, hoje, dias,
        conversaMeta: (() => {
          const raizes = messages.filter(x => x.msg_date == null && !x.parent_id && x.kind !== "sistema");
          const ids = new Set(raizes.map(x => x.id));
          return messages.filter(x => (x.msg_date == null && x.kind !== "sistema") || (x.parent_id && ids.has(x.parent_id))).map(mapMsg);
        })(),
        relatos: entries.map(mapEntry), mensagens: messages.map(mapMsg),
      };
    }),

  // ── Criar meta (gestão) ──
  create: moduleProcedure(GESTAO)
    .input(z.object({
      semana: data,
      title: z.string().min(1).max(200),
      description: z.string().max(4000).nullable().optional(),
      responsibleUserId: z.number(),
      supervisorUserIds: z.array(z.number()).max(10),
      itens: z.array(itemInput).min(1).max(20),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDbOrThrow();
      await ensureTables(db);
      const sem = weekBounds(input.semana);
      const respNome = await nomeDe(db, input.responsibleUserId);
      const criador = await nomeDe(db, ctx.user.id);
      const [res] = (await db.$client.execute(
        `INSERT INTO weekly_goals (week_start, week_end, title, description, responsible_user_id, responsible_name, created_by, created_by_name)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [sem.start, sem.end, input.title.trim(), input.description?.trim() || null, input.responsibleUserId, respNome, ctx.user.id, criador]
      )) as any;
      const id = Number(res.insertId);

      const sups = Array.from(new Set([ctx.user.id, ...input.supervisorUserIds])).filter(u => u !== input.responsibleUserId);
      for (const uid of sups) {
        await db.$client.execute(`INSERT IGNORE INTO weekly_goal_supervisors (goal_id, user_id, user_name) VALUES (?, ?, ?)`, [id, uid, await nomeDe(db, uid)]);
      }
      await gravarItens(db, id, sem, input.itens);
      const itens = await itensDaMeta(db, id);
      await mensagemSistema(db, id, `Meta criada por ${criador}: ${descreveItens(itens)}. Supervisores: ${(await q(db, `SELECT user_name FROM weekly_goal_supervisors WHERE goal_id = ?`, [id])).map(s => s.user_name).join(", ")}.`);
      await avisar([input.responsibleUserId], "Nova meta semanal", `${input.title} — ${descreveItens(itens)} (${sem.start.split("-").reverse().join("/")} a ${sem.end.split("-").reverse().join("/")})`, id);
      await avisar(sups, "Meta semanal criada", `${respNome}: ${descreveItens(itens)}`, id, ctx.user.id);
      return { id };
    }),

  // ── Editar meta (admin/criador): troca itens e registra o antes/depois na linha do tempo ──
  update: moduleProcedure(GESTAO)
    .input(z.object({
      id: z.number(),
      title: z.string().min(1).max(200),
      description: z.string().max(4000).nullable().optional(),
      supervisorUserIds: z.array(z.number()).max(10),
      itens: z.array(itemInput).min(1).max(20),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDbOrThrow();
      await ensureTables(db);
      const m = await exigirPapel(db, ctx.user, input.id);
      if (!podeEditarMeta(m.papel)) throw new TRPCError({ code: "FORBIDDEN", message: "Só o criador ou o administrador edita a meta" });
      if (["encerrada", "cancelada"].includes(m.goal.status)) throw new TRPCError({ code: "BAD_REQUEST", message: "Meta já encerrada" });

      const antes = descreveItens(await itensDaMeta(db, input.id));
      await db.$client.execute(`DELETE FROM weekly_goal_item_days WHERE item_id IN (SELECT id FROM weekly_goal_items WHERE goal_id = ?)`, [input.id]);
      await db.$client.execute(`DELETE FROM weekly_goal_items WHERE goal_id = ?`, [input.id]);
      await gravarItens(db, input.id, weekBounds(m.goal.weekStart), input.itens);
      await db.$client.execute(`UPDATE weekly_goals SET title = ?, description = ?, ack = 'pendente', ack_at = NULL, ack_comment = NULL,
        status = 'aguardando_ciencia' WHERE id = ?`, [input.title.trim(), input.description?.trim() || null, input.id]);

      await db.$client.execute(`DELETE FROM weekly_goal_supervisors WHERE goal_id = ?`, [input.id]);
      const sups = Array.from(new Set([m.goal.createdBy, ...input.supervisorUserIds])).filter(u => u !== m.goal.responsibleUserId);
      for (const uid of sups) await db.$client.execute(`INSERT IGNORE INTO weekly_goal_supervisors (goal_id, user_id, user_name) VALUES (?, ?, ?)`, [input.id, uid, await nomeDe(db, uid)]);

      const depois = descreveItens(await itensDaMeta(db, input.id));
      await mensagemSistema(db, input.id, `Meta alterada por ${await nomeDe(db, ctx.user.id)}. Antes: ${antes}. Agora: ${depois}. A ciência do responsável foi pedida de novo.`);
      await avisar([m.goal.responsibleUserId], "Meta semanal alterada", `${input.title} — ${depois}. Confirme a ciência.`, input.id);
      return { success: true };
    }),

  cancel: moduleProcedure(GESTAO)
    .input(z.object({ id: z.number(), motivo: z.string().min(1).max(500) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDbOrThrow();
      const m = await exigirPapel(db, ctx.user, input.id);
      if (!podeEditarMeta(m.papel)) throw new TRPCError({ code: "FORBIDDEN" });
      await db.$client.execute(`UPDATE weekly_goals SET status = 'cancelada', closed_at = NOW(), closed_by = ?, closing_summary = ? WHERE id = ?`, [ctx.user.id, input.motivo, input.id]);
      await mensagemSistema(db, input.id, `Meta cancelada por ${await nomeDe(db, ctx.user.id)}: ${input.motivo}`);
      await avisar([m.goal.responsibleUserId], "Meta semanal cancelada", input.motivo, input.id, ctx.user.id);
      return { success: true };
    }),

  // ── Excluir meta de vez (admin/criador): apaga também relatos, conversa e avisos dela ──
  delete: moduleProcedure(GESTAO)
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDbOrThrow();
      const m = await exigirPapel(db, ctx.user, input.id);
      if (!podeEditarMeta(m.papel)) throw new TRPCError({ code: "FORBIDDEN", message: "Só o criador ou o administrador exclui a meta" });
      const id = input.id;
      await db.$client.execute(`DELETE FROM weekly_goal_item_days WHERE item_id IN (SELECT id FROM weekly_goal_items WHERE goal_id = ?)`, [id]);
      for (const t of ["weekly_goal_items", "weekly_goal_supervisors", "weekly_goal_entries", "weekly_goal_messages"]) {
        await db.$client.execute(`DELETE FROM ${t} WHERE goal_id = ?`, [id]);
      }
      await db.$client.execute(`DELETE FROM weekly_goals WHERE id = ?`, [id]);
      try { await db.$client.execute(`DELETE FROM notifications WHERE related_type = 'weekly_goal' AND related_id = ?`, [id]); } catch { /* aviso é só conveniência */ }
      return { success: true };
    }),

  // ── Encerrar a semana com avaliação (supervisor/criador/admin) ──
  close: moduleProcedure(GESTAO)
    .input(z.object({ id: z.number(), avaliacao: z.string().min(1).max(2000) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDbOrThrow();
      const m = await exigirPapel(db, ctx.user, input.id);
      if (!podeEncerrar(m.papel)) throw new TRPCError({ code: "FORBIDDEN" });
      const res = await resumoDaMeta(db, m.goal, hojeISO());
      await db.$client.execute(`UPDATE weekly_goals SET status = 'encerrada', closed_at = NOW(), closed_by = ?, closing_summary = ? WHERE id = ?`, [ctx.user.id, input.avaliacao, input.id]);
      await mensagemSistema(db, input.id, `Semana encerrada por ${await nomeDe(db, ctx.user.id)}. Resultado: ${res.progresso.total.carregadas} de ${res.progresso.total.meta} cargas (${res.progresso.total.pct}%). Avaliação: ${input.avaliacao}`);
      await avisar([m.goal.responsibleUserId, ...interessados(m)], "Meta semanal encerrada", `${m.goal.title}: ${res.progresso.total.pct}% da meta. ${input.avaliacao}`, input.id, ctx.user.id);
      return { success: true };
    }),

  // ── Ciência do responsável ──
  acknowledge: moduleProcedure(USO, GESTAO)
    .input(z.object({ id: z.number(), ack: z.enum(["de_acordo", "com_ressalva"]), comentario: z.string().max(1000).optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDbOrThrow();
      const m = await exigirPapel(db, ctx.user, input.id);
      if (!podeDarCiencia(m.papel)) throw new TRPCError({ code: "FORBIDDEN", message: "Só o responsável dá ciência" });
      if (m.goal.ack !== "pendente" && m.goal.status !== "em_negociacao") throw new TRPCError({ code: "BAD_REQUEST", message: "A ciência desta meta já foi registrada" });
      if (input.ack === "com_ressalva" && !input.comentario?.trim()) throw new TRPCError({ code: "BAD_REQUEST", message: "Explique a ressalva" });
      // Com ressalva a meta NÃO segue: fica em negociação até o responsável dar o "de acordo"
      const novoStatus = input.ack === "de_acordo" ? "em_andamento" : "em_negociacao";
      await db.$client.execute(`UPDATE weekly_goals SET ack = ?, ack_at = NOW(), ack_comment = ?, status = ? WHERE id = ? AND status <> 'encerrada' AND status <> 'cancelada'`,
        [input.ack, input.comentario?.trim() || null, novoStatus, input.id]);
      const nome = await nomeDe(db, ctx.user.id);
      const eraNegociacao = m.goal.status === "em_negociacao";
      await mensagemSistema(db, input.id, input.ack === "de_acordo"
        ? (eraNegociacao ? `${nome} chegou a um acordo: de acordo com a meta. A meta passa a valer (em andamento).` : `${nome} deu ciência: de acordo com a meta.`)
        : `${nome} deu ciência com ressalvas: ${input.comentario!.trim()}. A meta fica em negociação até haver acordo.`);
      await avisar(interessados(m), input.ack === "de_acordo" ? (eraNegociacao ? "Acordo fechado na meta" : "Meta aceita") : "Meta com ressalvas: negociação aberta", `${nome}: ${input.ack === "de_acordo" ? "de acordo" : input.comentario!.trim()}`, input.id, ctx.user.id);
      return { success: true };
    }),

  // ── Supervisão mantém a meta durante a negociação e pede nova confirmação ──
  keepGoal: moduleProcedure(USO, GESTAO)
    .input(z.object({ id: z.number(), justificativa: z.string().min(1).max(1500) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDbOrThrow();
      const m = await exigirPapel(db, ctx.user, input.id);
      if (!podeEncerrar(m.papel)) throw new TRPCError({ code: "FORBIDDEN", message: "Só a supervisão responde à ressalva" });
      if (m.goal.status !== "em_negociacao") throw new TRPCError({ code: "BAD_REQUEST", message: "A meta não está em negociação" });
      await db.$client.execute(`UPDATE weekly_goals SET status = 'aguardando_ciencia', ack = 'pendente', ack_at = NULL WHERE id = ?`, [input.id]);
      const nome = await nomeDe(db, ctx.user.id);
      await mensagemSistema(db, input.id, `${nome} manteve a meta: ${input.justificativa.trim()}. O responsável precisa confirmar (de acordo ou nova ressalva).`);
      await avisar([m.goal.responsibleUserId], "Meta mantida pela supervisão", `${nome}: ${input.justificativa.trim().slice(0, 140)}. Confirme a ciência.`, input.id, ctx.user.id);
      return { success: true };
    }),

  // ── Relato do responsável ──
  addEntry: moduleProcedure(USO, GESTAO)
    .input(z.object({
      goalId: z.number(),
      entryDate: data.optional(),
      kind: z.enum(KINDS_ENTRY),
      situacao: z.enum(["ok", "atencao", "problema"]).default("ok"),
      body: z.string().min(1).max(3000),
      photoUrls: z.array(z.string().url()).max(5).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDbOrThrow();
      const m = await exigirPapel(db, ctx.user, input.goalId);
      if (!podeRelatar(m.papel)) throw new TRPCError({ code: "FORBIDDEN", message: "Só o responsável registra relatos" });
      if (["encerrada", "cancelada"].includes(m.goal.status)) throw new TRPCError({ code: "BAD_REQUEST", message: "Meta encerrada" });
      if (m.goal.status !== "em_andamento") throw new TRPCError({ code: "BAD_REQUEST", message: "A meta só segue em andamento depois do acordo: dê o \"de acordo\" (ou resolva a negociação) antes de relatar" });
      const dia = input.entryDate ?? hojeISO();
      const sem = weekBounds(m.goal.weekStart);
      if (dia < sem.start || dia > sem.end) throw new TRPCError({ code: "BAD_REQUEST", message: "Data fora da semana da meta" });
      const situacao = input.kind === "problema" ? "problema" : input.situacao;
      const nome = await nomeDe(db, ctx.user.id);
      const [res] = (await db.$client.execute(
        `INSERT INTO weekly_goal_entries (goal_id, entry_date, kind, situacao, body, photo_urls, author_user_id, author_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [input.goalId, dia, input.kind, situacao, input.body.trim(), input.photoUrls?.length ? JSON.stringify(input.photoUrls) : null, ctx.user.id, nome]
      )) as any;
      if (input.kind === "problema" || situacao === "problema") {
        await avisar(interessados(m), "Problema informado", `${nome}: ${input.body.trim().slice(0, 140)}`, input.goalId, ctx.user.id);
      } else if (input.kind === "fechamento_dia") {
        await avisar(interessados(m), "Fechamento do dia", `${nome}: ${input.body.trim().slice(0, 140)}`, input.goalId, ctx.user.id);
      }
      return { id: Number(res.insertId) };
    }),

  // ── Conversa (perguntas, respostas, comentários) ──
  addMessage: moduleProcedure(USO, GESTAO)
    .input(z.object({
      goalId: z.number(),
      kind: z.enum(["pergunta", "resposta", "comentario"]),
      body: z.string().min(1).max(3000),
      entryId: z.number().optional(),
      parentId: z.number().optional(),
      dia: data.optional(),
      geral: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDbOrThrow();
      const m = await exigirPapel(db, ctx.user, input.goalId);
      if (!tiposMensagemPermitidos(m.papel).includes(input.kind)) throw new TRPCError({ code: "FORBIDDEN", message: "Você não pode enviar este tipo de mensagem" });
      const nome = await nomeDe(db, ctx.user.id);
      const papel = m.papel === "responsavel" ? "responsavel" : m.papel === "admin" ? "admin" : "supervisor";
      let dia: string | null = input.geral ? null : (input.dia ?? hojeISO());
      if (input.entryId) {
        const [e] = await q(db, `SELECT entry_date FROM weekly_goal_entries WHERE id = ? AND goal_id = ?`, [input.entryId, input.goalId]);
        if (e) dia = e.entry_date;
      }
      if (input.parentId) {
        const [pm] = await q(db, `SELECT msg_date FROM weekly_goal_messages WHERE id = ? AND goal_id = ?`, [input.parentId, input.goalId]);
        if (pm) dia = pm.msg_date ?? null; // resposta fica no mesmo lugar da mensagem respondida (dia ou conversa da meta)
      }
      const [res] = (await db.$client.execute(
        `INSERT INTO weekly_goal_messages (goal_id, entry_id, parent_id, kind, body, author_user_id, author_name, author_role, msg_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [input.goalId, input.entryId ?? null, input.parentId ?? null, input.kind, input.body.trim(), ctx.user.id, nome, papel, dia]
      )) as any;
      if (input.kind === "resposta" && input.parentId) {
        await db.$client.execute(`UPDATE weekly_goal_messages SET answered = 1 WHERE id = ? AND goal_id = ?`, [input.parentId, input.goalId]);
      }
      const destinatarios = m.papel === "responsavel" ? interessados(m) : [m.goal.responsibleUserId];
      const titulo = input.kind === "pergunta" ? "Pergunta na meta semanal" : input.kind === "resposta" ? "Resposta na meta semanal" : "Comentário na meta semanal";
      await avisar(destinatarios, titulo, `${nome}: ${input.body.trim().slice(0, 140)}`, input.goalId, ctx.user.id);
      return { id: Number(res.insertId) };
    }),
});

function mapEntry(e: any) {
  let fotos: string[] = [];
  try { fotos = e.photo_urls ? JSON.parse(e.photo_urls) : []; } catch { fotos = []; }
  return {
    id: e.id as number, data: e.entry_date as string, kind: e.kind as string, situacao: e.situacao as string, body: e.body as string,
    fotos, autor: (e.author_name ?? "") as string, criadoEm: e.created_at as any,
  };
}
function mapMsg(x: any) {
  return {
    id: x.id as number, entryId: (x.entry_id ?? null) as number | null, parentId: (x.parent_id ?? null) as number | null,
    kind: x.kind as string, body: x.body as string, autor: (x.author_name ?? "Sistema") as string,
    papel: (x.author_role ?? "sistema") as string, respondida: Number(x.answered) === 1, data: (x.msg_date ?? null) as string | null,
    criadoEm: x.created_at as any,
  };
}

// ── Lembrete diário (cron): quem ainda não fez o fechamento do dia ──
export async function enviarLembretesFechamento(hoje = hojeISO()): Promise<number> {
  const db = await getDbOrThrow();
  await ensureTables(db);
  const metas = await q(db,
    `SELECT g.id, g.title, g.responsible_user_id FROM weekly_goals g
     WHERE g.status IN ('aguardando_ciencia','em_andamento') AND ? BETWEEN g.week_start AND g.week_end
       AND NOT EXISTS (SELECT 1 FROM weekly_goal_entries e WHERE e.goal_id = g.id AND e.entry_date = ? AND e.kind = 'fechamento_dia')
       AND NOT EXISTS (SELECT 1 FROM notifications n WHERE n.recipient_user_id = g.responsible_user_id AND n.related_type = 'weekly_goal'
                       AND n.related_id = g.id AND n.title = 'Lembrete: fechamento do dia' AND DATE(n.created_at) = ?)`,
    [hoje, hoje, hoje]);
  for (const g of metas) {
    await avisar([g.responsible_user_id], "Lembrete: fechamento do dia", `Registre como foi a operação hoje na meta "${g.title}".`, g.id);
  }
  return metas.length;
}

export { addDays };
