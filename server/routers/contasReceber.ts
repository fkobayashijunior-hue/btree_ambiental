// Cards e filtros de "Contas a Receber": junta boletos Sicoob, NFs sem boleto e cargas a receber
// seguindo os MESMOS filtros das tabelas (período, destinatário, pesquisa e status).
import { z } from "zod";
import { router } from "../_core/trpc";
import { moduleProcedure } from "./permissions";
import { calcularCards, soDigitos, type ItemReceber } from "../utils/contasReceberResumo";

const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const entrada = z.object({
  mes: z.number().min(1).max(12),
  ano: z.number().min(2020).max(2100),
  /** período de emissão (NF/boleto) ou entrega (carga); quando informado, substitui o mês */
  dataInicio: data.optional(),
  dataFim: data.optional(),
  cnpj: z.string().optional(),
  pesquisa: z.string().optional(),
  statusFiltro: z.enum(["todos", "em_aberto", "pago", "cancelado"]).default("todos"),
});

function num(v: unknown): number {
  const s = String(v ?? "0").trim();
  const n = s.includes(",") ? parseFloat(s.replace(/\./g, "").replace(",", ".")) : parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}
const dia = (v: any): string => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v ?? "").slice(0, 10));
const SQL_DIGITOS = (col: string) => `REPLACE(REPLACE(REPLACE(REPLACE(${col}, '.', ''), '/', ''), '-', ''), ' ', '')`;

async function getDbOrNull() {
  const { getDb } = await import("../db");
  return getDb();
}

export const contasReceberRouter = router({
  // ── Cards: Vencidos / Vencem hoje / A vencer / Recebidos / Total ──
  cards: moduleProcedure("contas-a-receber")
    .input(entrada)
    .query(async ({ input }) => {
      const db = await getDbOrNull();
      const vazio = calcularCards([], "1970-01-01");
      if (!db) return { ...vazio, error: "DB indisponível" };

      const hoje = new Date().toISOString().slice(0, 10);
      const prefixo = `${input.ano}-${String(input.mes).padStart(2, "0")}`;
      const intervalo = input.dataInicio && input.dataFim ? { ini: input.dataInicio, fim: input.dataFim } : null;
      const cnpj = soDigitos(input.cnpj);
      const itens: ItemReceber[] = [];
      const erros: string[] = [];

      // 1) Boletos Sicoob — mês: pelo vencimento; intervalo: pela data de emissão do boleto
      try {
        const where: string[] = [];
        const params: any[] = [];
        if (intervalo) { where.push(`COALESCE(NULLIF(data_emissao, ''), data_vencimento) BETWEEN ? AND ?`); params.push(intervalo.ini, intervalo.fim); }
        else { where.push(`data_vencimento LIKE ?`); params.push(`${prefixo}%`); }
        if (cnpj) { where.push(`${SQL_DIGITOS("cnpj_pagador")} = ?`); params.push(cnpj); }
        if (input.pesquisa) { where.push(`(nome_pagador LIKE ? OR cnpj_pagador LIKE ?)`); params.push(`%${input.pesquisa}%`, `%${input.pesquisa}%`); }
        const [rows] = (await db.$client.execute(`SELECT situacao, data_vencimento, valor FROM sicoob_boletos WHERE ${where.join(" AND ")}`, params)) as any;
        for (const r of rows as any[]) {
          itens.push({ fonte: "boleto", valor: num(r.valor), recebido: r.situacao === 3, cancelado: r.situacao === 2, vencimento: dia(r.data_vencimento) || null });
        }
      } catch (e: any) { erros.push(`Boletos: ${e.message}`); }

      // 2) NFs SEM boleto correspondente — mês: previsão (em aberto) ou pagamento (pago) no mês; intervalo: emissão
      try {
        const where: string[] = [`sb.id IS NULL`, `nf.cfop = '5102'`];
        const params: any[] = [];
        if (intervalo) { where.push(`nf.data_emissao BETWEEN ? AND ?`); params.push(intervalo.ini, intervalo.fim); }
        else { where.push(`(nf.data_previsao_pagamento LIKE ? OR nf.data_pagamento_confirmado LIKE ?)`); params.push(`${prefixo}%`, `${prefixo}%`); }
        if (cnpj) { where.push(`${SQL_DIGITOS("nf.cnpj_destinatario")} = ?`); params.push(cnpj); }
        if (input.pesquisa) { where.push(`(nf.nome_destinatario LIKE ? OR nf.cnpj_destinatario LIKE ? OR nf.numero_nota LIKE ?)`); params.push(`%${input.pesquisa}%`, `%${input.pesquisa}%`, `%${input.pesquisa}%`); }
        const [rows] = (await db.$client.execute(
          `SELECT nf.valor_total, nf.status_nf_interno, nf.data_pagamento_confirmado, nf.data_previsao_pagamento
           FROM notas_fiscais nf
           LEFT JOIN sicoob_boletos sb ON sb.nf_referente = nf.numero_nota AND sb.cnpj_pagador = nf.cnpj_destinatario
           WHERE ${where.join(" AND ")}`, params)) as any;
        for (const r of rows as any[]) {
          const cancelado = r.status_nf_interno === "cancelado";
          const pago = r.status_nf_interno === "pago";
          if (!intervalo && !cancelado) {
            // no modo mês, só conta o que "pertence" ao mês pelo critério de cada estado
            if (pago && !String(r.data_pagamento_confirmado ?? "").startsWith(prefixo)) continue;
            if (!pago && !String(r.data_previsao_pagamento ?? "").startsWith(prefixo)) continue;
          }
          itens.push({ fonte: "nf", valor: num(r.valor_total), recebido: pago, cancelado, vencimento: r.data_previsao_pagamento ? dia(r.data_previsao_pagamento) : null });
        }
      } catch (e: any) { erros.push(`NFs: ${e.message}`); }

      // 3) Cargas entregues a compradores sem boleto/NF (ex.: Enerbio) — mês: vencimento; intervalo: entrega
      try {
        const where: string[] = [`cl.status = 'entregue'`, `cd.payment_term_days_after_delivery IS NOT NULL`];
        const params: any[] = [];
        if (cnpj) { where.push(`${SQL_DIGITOS("cd.cnpj_cpf")} = ?`); params.push(cnpj); }
        const [rows] = (await db.$client.execute(
          `SELECT cl.date, cl.delivery_date, cl.weight_net_kg, cl.weight_out_kg, cl.volume_m3, cl.buyer_paid_at, cl.invoice_number,
                  cd.name AS destino_nome, cd.cnpj_cpf, cd.price_per_unit, cd.unit, cd.payment_term_days_after_delivery
           FROM cargo_loads cl
           JOIN cargo_destinations cd ON cd.id = IF(cl.destination_id >= 10000, cl.destination_id - 10000, cl.destination_id)
           WHERE ${where.join(" AND ")}`, params)) as any;
        const pesq = input.pesquisa?.toLowerCase();
        for (const r of rows as any[]) {
          if (pesq && !String(r.destino_nome ?? "").toLowerCase().includes(pesq) && !String(r.cnpj_cpf ?? "").includes(input.pesquisa!)) continue;
          const entrega = dia(r.delivery_date || r.date);
          const venc = new Date(entrega + "T12:00:00");
          venc.setDate(venc.getDate() + Number(r.payment_term_days_after_delivery));
          const vencimento = venc.toISOString().slice(0, 10);
          if (intervalo ? (entrega < intervalo.ini || entrega > intervalo.fim) : !vencimento.startsWith(prefixo)) continue;
          const peso = parseFloat(r.weight_net_kg || r.weight_out_kg || "0");
          const volume = parseFloat(r.volume_m3 || "0");
          const quantidade = r.unit === "m3" ? volume : peso / 1000;
          itens.push({ fonte: "carga", valor: quantidade * parseFloat(r.price_per_unit || "0"), recebido: !!r.buyer_paid_at, cancelado: false, vencimento });
        }
      } catch (e: any) { erros.push(`Cargas: ${e.message}`); }

      return { ...calcularCards(itens, hoje, input.statusFiltro), error: erros.length ? erros.join(" | ") : null };
    }),

  // ── Destinatários disponíveis para o filtro (NFs + boletos + compradores), por CNPJ ──
  destinatarios: moduleProcedure("contas-a-receber").query(async () => {
    const db = await getDbOrNull();
    if (!db) return [] as { cnpj: string; nome: string }[];
    const mapa = new Map<string, string>();
    const add = (cnpj: any, nome: any) => {
      const c = soDigitos(String(cnpj ?? ""));
      const n = String(nome ?? "").trim();
      if (c.length < 11 || !n) return;
      if (!mapa.has(c)) mapa.set(c, n);
    };
    const tentar = async (sql: string) => { try { const [r] = (await db.$client.execute(sql)) as any; return r as any[]; } catch { return [] as any[]; } };
    for (const r of await tentar(`SELECT cnpj_destinatario AS cnpj, MAX(nome_destinatario) AS nome FROM notas_fiscais WHERE cfop = '5102' AND cnpj_destinatario <> '' GROUP BY cnpj_destinatario`)) add(r.cnpj, r.nome);
    for (const r of await tentar(`SELECT cnpj_pagador AS cnpj, MAX(nome_pagador) AS nome FROM sicoob_boletos WHERE cnpj_pagador <> '' GROUP BY cnpj_pagador`)) add(r.cnpj, r.nome);
    for (const r of await tentar(`SELECT cnpj_cpf AS cnpj, name AS nome FROM cargo_destinations WHERE payment_term_days_after_delivery IS NOT NULL AND cnpj_cpf IS NOT NULL AND cnpj_cpf <> ''`)) add(r.cnpj, r.nome);
    return Array.from(mapa.entries()).map(([cnpj, nome]) => ({ cnpj, nome })).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }),
});
