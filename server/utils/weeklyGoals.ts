// Regras puras do módulo "Metas Semanais" (sem banco): semana sáb–sex, papéis, progresso por comprador.

export const KINDS_ENTRY = ["inicio_dia", "andamento", "problema", "fechamento_dia"] as const;
export type KindEntry = typeof KINDS_ENTRY[number];

// ───────────────────────── Datas ─────────────────────────

const DIA_MS = 86_400_000;
const toUtc = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
const fmt = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export function addDays(date: string, n: number): string {
  return fmt(toUtc(date) + n * DIA_MS);
}

/** Semana de sábado a sexta que contém `date` (YYYY-MM-DD). */
export function weekBounds(date: string): { start: string; end: string; days: string[] } {
  const ms = toUtc(date);
  const dow = new Date(ms).getUTCDay(); // 0 = domingo ... 6 = sábado
  const desdeSabado = (dow + 1) % 7;
  const start = fmt(ms - desdeSabado * DIA_MS);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return { start, end: days[6], days };
}

export function hojeISO(now = new Date()): string {
  // data local do servidor (YYYY-MM-DD)
  const p = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

// ───────────────────────── Papéis ─────────────────────────

export type PapelMeta = "admin" | "criador" | "responsavel" | "supervisor";

export function papelNaMeta(
  user: { id: number; isAdmin: boolean },
  meta: { responsibleUserId: number; createdBy: number },
  supervisorIds: number[]
): PapelMeta | null {
  if (user.isAdmin) return "admin";
  if (meta.createdBy === user.id) return "criador";
  if (meta.responsibleUserId === user.id) return "responsavel";
  if (supervisorIds.includes(user.id)) return "supervisor";
  return null;
}

export const podeVer = (p: PapelMeta | null) => p !== null;
export const podeEditarMeta = (p: PapelMeta | null) => p === "admin" || p === "criador";
export const podeEncerrar = (p: PapelMeta | null) => p === "admin" || p === "criador" || p === "supervisor";
export const podeDarCiencia = (p: PapelMeta | null) => p === "responsavel";
export const podeRelatar = (p: PapelMeta | null) => p === "responsavel";

/** Que tipos de mensagem cada papel pode escrever. */
export function tiposMensagemPermitidos(p: PapelMeta | null): ("pergunta" | "resposta" | "comentario")[] {
  if (p === "responsavel") return ["resposta", "comentario"];
  if (p === "admin" || p === "criador" || p === "supervisor") return ["pergunta", "comentario", "resposta"];
  return [];
}

// ───────────────────────── Progresso ─────────────────────────

/** Cargas antigas usam destination_id + 10000 para compradores do cadastro legado. */
export function normalizaDestino(id: number | null | undefined): number | null {
  if (id == null) return null;
  return id >= 10000 ? id - 10000 : id;
}

export type CargaLeve = {
  id: number;
  data: string;                 // YYYY-MM-DD (data de saída)
  destinationId: number | null;
  status: string;               // pendente | entregue | cancelado
};

export type ItemMeta = {
  id: number;
  destinationId: number;
  targetCargas: number;
  dias: { data: string; target: number }[];
};

export type ProgressoItem = {
  itemId: number;
  destinationId: number;
  meta: number;
  carregadas: number;
  entregues: number;
  pct: number;
  porDia: { data: string; planejado: number | null; carregadas: number; entregues: number }[];
};

export function calcularProgresso(itens: ItemMeta[], cargas: CargaLeve[], diasSemana: string[]): {
  itens: ProgressoItem[];
  total: { meta: number; carregadas: number; entregues: number; pct: number };
} {
  const validas = cargas.filter(c => c.status !== "cancelado");
  const out: ProgressoItem[] = itens.map(it => {
    const doComprador = validas.filter(c => normalizaDestino(c.destinationId) === it.destinationId);
    const porDia = diasSemana.map(d => {
      const doDia = doComprador.filter(c => c.data === d);
      const plan = it.dias.find(x => x.data === d);
      return {
        data: d,
        planejado: it.dias.length > 0 ? (plan?.target ?? 0) : null,
        carregadas: doDia.length,
        entregues: doDia.filter(c => c.status === "entregue").length,
      };
    });
    const carregadas = porDia.reduce((s, x) => s + x.carregadas, 0);
    const entregues = porDia.reduce((s, x) => s + x.entregues, 0);
    return {
      itemId: it.id, destinationId: it.destinationId, meta: it.targetCargas, carregadas, entregues,
      pct: it.targetCargas > 0 ? Math.round((carregadas / it.targetCargas) * 100) : 0,
      porDia,
    };
  });
  const meta = out.reduce((s, x) => s + x.meta, 0);
  const carregadas = out.reduce((s, x) => s + Math.min(x.carregadas, x.meta), 0); // excedente de um comprador não cobre falta de outro
  const entregues = out.reduce((s, x) => s + x.entregues, 0);
  return { itens: out, total: { meta, carregadas, entregues, pct: meta > 0 ? Math.round((carregadas / meta) * 100) : 0 } };
}

// ───────────────────────── Alertas ─────────────────────────

export type Alerta = "em_negociacao" | "ciencia_pendente" | "sem_relato_hoje" | "problema_hoje" | "pergunta_sem_resposta" | "atrasada_no_ritmo";

export function calcularAlertas(p: {
  status: string;
  ack: "pendente" | "de_acordo" | "com_ressalva";
  hoje: string;
  semana: { start: string; end: string };
  relatosHoje: number;
  fechouHoje: boolean;
  problemaHoje: boolean;
  perguntasSemResposta: number;
  pctMeta: number;
  diasDecorridos: number; // dias da semana já passados, 0–7
}): Alerta[] {
  if (p.status === "encerrada" || p.status === "cancelada") return [];
  // Em negociação a meta ainda não está valendo: só importa o acordo (e perguntas abertas)
  if (p.status === "em_negociacao") return p.perguntasSemResposta > 0 ? ["em_negociacao", "pergunta_sem_resposta"] : ["em_negociacao"];
  const out: Alerta[] = [];
  if (p.ack === "pendente") out.push("ciencia_pendente");
  const hojeNaSemana = p.hoje >= p.semana.start && p.hoje <= p.semana.end;
  if (hojeNaSemana && p.relatosHoje === 0) out.push("sem_relato_hoje");
  if (p.problemaHoje) out.push("problema_hoje");
  if (p.perguntasSemResposta > 0) out.push("pergunta_sem_resposta");
  // ritmo: esperado = dias decorridos / 7 da meta; alerta se estiver 25 pontos abaixo (após o 3º dia)
  if (hojeNaSemana && p.diasDecorridos >= 3 && p.pctMeta < (p.diasDecorridos / 7) * 100 - 25) out.push("atrasada_no_ritmo");
  return out;
}

export const ALERTA_LABEL: Record<Alerta, string> = {
  em_negociacao: "Em negociação: falta acordo",
  ciencia_pendente: "Ciência pendente",
  sem_relato_hoje: "Sem relato hoje",
  problema_hoje: "Problema informado",
  pergunta_sem_resposta: "Pergunta sem resposta",
  atrasada_no_ritmo: "Abaixo do ritmo",
};
