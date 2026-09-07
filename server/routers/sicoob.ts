import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import https from "https";
import fs from "fs";
import path from "path";
import axios from "axios";
import { sicoobBoletos, sicoobExtrato, sicoobLancamentosFuturos } from "../../drizzle/schema";
import { sql } from "drizzle-orm";
import { mergeDiasFluxoCaixa } from "../utils/fluxoCaixaProjecao";
import { descobrirFavorecido, registrarFavorecido, extrairIdentificadorFavorecido } from "../utils/favorecidoCategoria";
import { getSpecialWeeklyCommissionCashFlow } from "./payroll";

// Datas de pagamento da Folha usadas na projeção do Fluxo de Caixa (ver regras no topo de
// fluxoCaixaDiario): CLT/PJ no 5º dia útil do mês seguinte ao trabalhado; Comissão sempre no
// dia 20 do mês seguinte ao da comissão fechada.
function prevMonthOf(year: number, month: number): { year: number; month: number } {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}
function nthBusinessDayOfMonth(year: number, month: number, n: number): string {
  let count = 0;
  let day = 1;
  while (true) {
    const dow = new Date(year, month - 1, day).getDay();
    if (dow !== 0 && dow !== 6 && ++count === n) break;
    day++;
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// Cache do token em memória
let tokenCache: { token: string; idToken: string; expiresAt: number } | null = null;

let certWarningLogged = false;

function getSicoobAgent() {
  const pfxPath = process.env.SICOOB_CERT_PATH;
  const pfxPassphrase = process.env.SICOOB_CERT_PASSPHRASE ?? "";

  if (!pfxPath) {
    if (!certWarningLogged) {
      console.error("[Sicoob] SICOOB_CERT_PATH não está definido — chamadas à API falharão com 'certificado digital é obrigatório'.");
      certWarningLogged = true;
    }
    return undefined;
  }

  const resolvedPath = path.resolve(process.cwd(), pfxPath);
  if (!fs.existsSync(resolvedPath)) {
    if (!certWarningLogged) {
      console.error(
        `[Sicoob] Certificado não encontrado. SICOOB_CERT_PATH="${pfxPath}" | cwd="${process.cwd()}" | caminho resolvido="${resolvedPath}" (arquivo não existe nesse caminho).`
      );
      certWarningLogged = true;
    }
    return undefined;
  }

  const pfx = fs.readFileSync(resolvedPath);
  console.log(`[Sicoob] Certificado carregado de: ${resolvedPath}`);
  return new https.Agent({ pfx, passphrase: pfxPassphrase, rejectUnauthorized: true });
}

async function getSicoobToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) return tokenCache.token;

  const tokenUrl = process.env.SICOOB_TOKEN_URL ?? "https://auth.sicoob.com.br/auth/realms/cooperado/protocol/openid-connect/token";
  const clientId = process.env.SICOOB_CLIENT_ID ?? "";
  const agent = getSicoobAgent();

  const params = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    scope: "cco_transferencias cco_consulta boletos_consulta pagamentos_consulta",
  });

  const res = await axios.post(tokenUrl, params.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    httpsAgent: agent,
  });

  const { access_token, id_token, expires_in } = res.data;
  tokenCache = { token: access_token, idToken: id_token ?? access_token, expiresAt: Date.now() + (expires_in - 60) * 1000 };
  return access_token;
}

async function sicoobGet(path: string, params: Record<string, string | number | undefined>) {
  const token = await getSicoobToken();
  const agent = getSicoobAgent();
  const clientId = process.env.SICOOB_CLIENT_ID ?? "";
  const baseUrl = "https://api.sicoob.com.br";

  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined)
  ) as Record<string, string>;

  console.log(`[SicoobGet] ${path} params=`, cleanParams);
  const res = await axios.get(`${baseUrl}${path}`, {
    params: cleanParams,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      client_id: clientId,
      id_token: tokenCache?.idToken ?? token,
    },
    httpsAgent: agent,
  });
  return res.data;
}

const NUMERO_CLIENTE = Number(process.env.SICOOB_NUMERO_CLIENTE ?? "8971676");
const NUMERO_CONTA = Number(process.env.SICOOB_NUMERO_CONTA ?? "0");
const CODIGO_MODALIDADE = Number(process.env.SICOOB_CODIGO_MODALIDADE ?? "1");

// ── Sync do extrato bancário para um mês/ano ──
export async function syncSicoobExtrato(mes: number, ano: number) {
  const { getDb } = await import("../db");
  const db = await getDb();
  if (!db) return { synced: 0, error: "DB indisponível" };

  try {
    const numeroConta = process.env.SICOOB_NUMERO_CONTA ?? String(NUMERO_CONTA);
    console.log(`[SicoobExtrato] Chamando extrato ${mes}/${ano} conta=${numeroConta}`);
    const data = await sicoobGet(`/conta-corrente/v4/extrato/${mes}/${ano}`, {
      numeroContaCorrente: numeroConta,
    });
    console.log(`[SicoobExtrato] Resposta ${mes}/${ano}:`, JSON.stringify(data).slice(0, 400));
    const resultado = data.resultado ?? {};
    const transacoes: any[] = resultado.transacoes ?? resultado.lancamentos ?? [];
    const saldoAnterior = String(resultado.saldoAnterior ?? resultado.saldoInicial ?? "0");
    const saldoAtual = String(resultado.saldoAtual ?? "0");
    console.log(`[SicoobExtrato] saldoAnterior=${saldoAnterior} saldoAtual=${saldoAtual} transacoes=${transacoes.length}`);
    if (transacoes.length > 0) console.log(`[SicoobExtrato] Exemplo transação:`, JSON.stringify(transacoes[0], null, 2));

    // Persistir saldo inicial e final do mês
    await db.$client.execute(
      `INSERT INTO sicoob_saldo_mes (mes, ano, saldo_inicial, saldo_final, sincronizado_em)
       VALUES (?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE saldo_inicial = ?, saldo_final = ?, sincronizado_em = NOW()`,
      [mes, ano, saldoAnterior, saldoAtual, saldoAnterior, saldoAtual]
    );

    let synced = 0;

    for (const l of transacoes) {
      const numeroLancamento = String(l.transactionId ?? l.numeroLancamento ?? l.id ?? `${mes}-${ano}-${synced}`);
      const dataLanc = l.dataLote ?? (l.data ? String(l.data).slice(0, 10) : null);
      const descricao = l.descricao ?? null;
      const complemento = l.descInfComplementar
        ? String(l.descInfComplementar).replace(/\|@\*+/g, "").replace(/\|@/g, " ").trim()
        : null;
      const numeroDocumento = l.numeroDocumento ? String(l.numeroDocumento) : null;
      const valor = l.tipo === "DEBITO"
        ? String(-Math.abs(parseFloat(l.valor ?? "0")))
        : String(Math.abs(parseFloat(l.valor ?? "0")));
      const saldo = "0";
      const tipoLancamento = l.tipo ?? null;
      await descobrirFavorecido(db, descricao, complemento, numeroDocumento);

      await db.insert(sicoobExtrato).values({
        numeroLancamento, mes, ano, dataLancamento: dataLanc,
        descricao, complemento, valor, saldo,
        tipoLancamento: tipoLancamento ? String(tipoLancamento) : null,
        numeroDocumento,
      }).onDuplicateKeyUpdate({
        set: {
          dataLancamento: dataLanc, descricao, complemento, valor, saldo,
          tipoLancamento: tipoLancamento ? String(tipoLancamento) : null,
          numeroDocumento,
          sincronizadoEm: sql`NOW()`,
        },
      });
      synced++;
    }
    return { synced, error: null };
  } catch (e: any) {
    const detail = JSON.stringify(e?.response?.data ?? {});
    console.error(`[SicoobExtrato] Erro ${mes}/${ano}:`, detail);
    const msg = e?.response?.data?.mensagens?.[0]?.mensagem
      ?? e?.response?.data?.message
      ?? e?.response?.data?.httpMessage
      ?? e?.message ?? "Erro desconhecido";
    return { synced: 0, error: `${msg} | ${detail}` };
  }
}

// Marca a NF (Conta Azul) correspondente a um boleto liquidado como "Pago" automaticamente.
// Mesmo critério de vínculo usado no resto do módulo: número da NF + CNPJ do pagador.
// Não sobrescreve NF já "pago" (idempotente) nem "cancelado" (decisão manual do usuário).
async function autoMarkNfPaidFromBoleto(db: any, nfReferente: string, cnpjPagador: string, dataPagamento: string | null) {
  const [rows] = await db.$client.execute(
    `SELECT id, status_nf_interno FROM notas_fiscais WHERE numero_nota = ? AND cnpj_destinatario = ? LIMIT 1`,
    [nfReferente, cnpjPagador]
  ) as any;
  const nf = (rows as any[])?.[0];
  if (!nf || nf.status_nf_interno !== "em_aberto") return;

  const dataConfirmada = dataPagamento ?? new Date().toISOString().slice(0, 10);
  await db.$client.execute(
    `UPDATE notas_fiscais SET status_nf_interno = 'pago', data_pagamento_confirmado = ? WHERE id = ?`,
    [dataConfirmada, nf.id]
  );
  await db.$client.execute(
    `INSERT INTO notas_fiscais_status_log (nota_fiscal_id, campo, valor_anterior, valor_novo, usuario_id, usuario_nome, alterado_em)
     VALUES (?, 'status_nf_interno', 'em_aberto', 'pago', NULL, 'Sincronização automática (boleto liquidado)', NOW())`,
    [nf.id]
  );
}

// ── Função de sync reutilizável (usada pelo cron e pelo endpoint manual) ──
export async function syncSicoobBoletos() {
  const { getDb } = await import("../db");
  const db = await getDb();
  if (!db) return { synced: 0, errors: [] as string[] };

  // Buscar todos os CNPJs ativos de compradores
  const [rows] = await db.execute(
    `SELECT DISTINCT cnpj_cpf FROM buyer_clients WHERE active = 1 AND cnpj_cpf IS NOT NULL AND cnpj_cpf != ''`
  ) as any;

  const cnpjs: string[] = (rows ?? [])
    .map((r: any) => (r.cnpj_cpf as string)?.replace(/\D/g, "").slice(0, 14))
    .filter((c: string) => c && c.length > 0);

  const errors: string[] = [];
  let synced = 0;

  // Janela de 1 ano dividida em chunks de 35 dias (limite da API Sicoob)
  const windowStart = new Date();
  windowStart.setMonth(windowStart.getMonth() - 6);
  const windowEnd = new Date();
  windowEnd.setMonth(windowEnd.getMonth() + 6);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const chunks: { inicio: Date; fim: Date }[] = [];
  let cur = new Date(windowStart);
  while (cur <= windowEnd) {
    const chunkEnd = new Date(cur);
    chunkEnd.setDate(chunkEnd.getDate() + 34);
    if (chunkEnd > windowEnd) chunkEnd.setTime(windowEnd.getTime());
    chunks.push({ inicio: new Date(cur), fim: new Date(chunkEnd) });
    cur.setDate(cur.getDate() + 35);
  }

  for (const cnpj of cnpjs) {
    for (const chunk of chunks) {
    try {
      console.log(`[SicoobSync] Consultando CNPJ ${cnpj} (${fmt(chunk.inicio)} → ${fmt(chunk.fim)})...`);
      const data = await sicoobGet(
        `/cobranca-bancaria/v3/pagadores/${cnpj}/boletos`,
        {
          numeroCliente: NUMERO_CLIENTE,
          dataInicio: fmt(chunk.inicio),
          dataFim: fmt(chunk.fim),
        }
      );

      console.log(`[SicoobSync] Resposta CNPJ ${cnpj}:`, JSON.stringify(data).slice(0, 300));
      const boletos: any[] = data.resultado ?? [];
      console.log(`[SicoobSync] Boletos encontrados: ${boletos.length}`);
      if (boletos.length > 0) console.log(`[SicoobSync] Exemplo boleto:`, JSON.stringify(boletos[0], null, 2));

      for (const b of boletos) {
        const nossoNumero = b.nossoNumero ?? b.numero;
        if (!nossoNumero) continue;

        const valor = String(b.valor ?? "0");
        const dataVenc = b.dataVencimento ? String(b.dataVencimento).slice(0, 10) : null;
        const dataPag = b.dataPagamento ? String(b.dataPagamento).slice(0, 10) : null;
        const situacaoStr = (b.situacaoBoleto ?? "").toLowerCase();
        const situacao = situacaoStr.includes("liquid") ? 3
          : situacaoStr.includes("baixado") ? 2
          : 1;
        const nomePagador = b.nomePagador ?? b.pagador?.nome ?? "";
        const cnpjPagador = b.numeroCpfCnpjPagador ?? b.pagador?.numeroCpfCnpj ?? cnpj;

        const seuNumero = b.seuNumero ? String(b.seuNumero) : null;
        const codigoEspecieDocumento = b.codigoEspecieDocumento ? String(b.codigoEspecieDocumento) : null;
        const dataEmissao = b.dataEmissao ? String(b.dataEmissao).slice(0, 10) : null;
        const mensagens: string[] = Array.isArray(b.mensagensInstrucao) ? b.mensagensInstrucao : [];
        const nfMatch = mensagens.map(m => m.match(/NF-?e?\s*(\d+)/i)).find(m => m);
        const nfReferente = nfMatch ? nfMatch[1] : null;

        await db.insert(sicoobBoletos).values({
          nossoNumero: Number(nossoNumero),
          seuNumero,
          codigoEspecieDocumento,
          dataEmissao,
          nfReferente,
          cnpjPagador,
          nomePagador,
          valor,
          dataVencimento: dataVenc,
          dataPagamento: dataPag,
          situacao,
        }).onDuplicateKeyUpdate({
          set: {
            seuNumero,
            codigoEspecieDocumento,
            dataEmissao,
            nfReferente,
            cnpjPagador,
            nomePagador,
            valor: sql`IF(valor_editado = 1, valor, ${valor})`,
            dataVencimento: dataVenc,
            dataPagamento: dataPag,
            situacao,
            sincronizadoEm: sql`NOW()`,
          },
        });
        synced++;

        // Boleto liquidado: marca a NF correspondente (mesmo número + CNPJ) como "Pago"
        // automaticamente, sem precisar trocar o Status NF manualmente na tela.
        if (situacao === 3 && nfReferente) {
          try {
            await autoMarkNfPaidFromBoleto(db, nfReferente, cnpjPagador, dataPag);
          } catch (e: any) {
            console.warn(`[SicoobSync] Falha ao marcar NF ${nfReferente} como paga automaticamente:`, e?.message);
          }
        }
      }
    } catch (e: any) {
      const msg = e?.response?.data?.httpMessage ?? e?.response?.data?.message ?? e?.message ?? "Erro desconhecido";
      const detail = JSON.stringify(e?.response?.data ?? {}).slice(0, 300);
      console.error(`[SicoobSync] Erro CNPJ ${cnpj}: ${msg} | Detalhe: ${detail}`);
      errors.push(`CNPJ ${cnpj}: ${msg}`);
    }
    } // end chunk
  }

  console.log(`[SicoobSync] Total sincronizado: ${synced} | Erros: ${errors.length}`);
  return { synced, errors };
}

async function computeFluxoCaixaMes(db: any, ano: number, mes: number, modo: "projecao" | "real" = "projecao") {
  try {
    const mesStr = String(mes).padStart(2, "0");
        const prefixo = `${ano}-${mesStr}`;

        const [rows] = await db.$client.execute(
          `SELECT
             data_lancamento,
             SUM(CASE WHEN CAST(valor AS DECIMAL(15,2)) > 0 THEN CAST(valor AS DECIMAL(15,2)) ELSE 0 END) AS recebimentos,
             SUM(CASE WHEN CAST(valor AS DECIMAL(15,2)) < 0 THEN ABS(CAST(valor AS DECIMAL(15,2))) ELSE 0 END) AS pagamentos
           FROM sicoob_extrato
           WHERE data_lancamento LIKE ?
           GROUP BY data_lancamento
           ORDER BY data_lancamento ASC`,
          [`${prefixo}%`]
        ) as any;

        const [saldoRows] = await db.$client.execute(
          `SELECT saldo_inicial FROM sicoob_saldo_mes WHERE mes = ? AND ano = ?`,
          [mes, ano]
        ) as any;
        const saldoInicial = parseFloat((saldoRows as any[])?.[0]?.saldo_inicial ?? "0");

        // Lançamentos futuros para o mesmo mês/ano
        const [futRows] = await db.$client.execute(
          `SELECT
             data,
             SUM(CASE WHEN CAST(valor AS DECIMAL(15,2)) > 0 THEN CAST(valor AS DECIMAL(15,2)) ELSE 0 END) AS recebimentos,
             SUM(CASE WHEN CAST(valor AS DECIMAL(15,2)) < 0 THEN ABS(CAST(valor AS DECIMAL(15,2))) ELSE 0 END) AS pagamentos
           FROM sicoob_lancamentos_futuros
           WHERE data LIKE ?
           GROUP BY data
           ORDER BY data ASC`,
          [`${prefixo}%`]
        ) as any;

        // Projeção "Contas a Receber": boletos em aberto (Sicoob), detalhado por item
        const [boletosAbertoRows] = await db.$client.execute(
          `SELECT data_vencimento AS data, nome_pagador, valor, nosso_numero, nf_referente
           FROM sicoob_boletos
           WHERE situacao = 1 AND data_vencimento LIKE ?`,
          [`${prefixo}%`]
        ) as any;

        // Projeção "Contas a Receber": NFs (Conta Azul) em aberto que ainda não têm boleto
        // correspondente — mesmo critério de dedução usado em summaryNFsSemBoleto, pra não
        // contar o mesmo valor duas vezes (boleto e NF referente ao mesmo pagamento). Só entram
        // NFs já vinculadas a uma carga no Controle de Cargas (mesmo casamento usado em
        // listNotasFiscais) — NF sem carga registrada ainda não é considerada "confirmada" o
        // suficiente pra entrar na projeção de recebimento.
        const [nfsAbertoRows] = await db.$client.execute(
          `SELECT nf.data_previsao_pagamento AS data, nf.nome_destinatario, nf.valor_total, nf.numero_nota
           FROM notas_fiscais nf
           LEFT JOIN sicoob_boletos sb
             ON sb.nf_referente = nf.numero_nota
            AND sb.cnpj_pagador = nf.cnpj_destinatario
           WHERE sb.id IS NULL
             AND nf.status_nf_interno = 'em_aberto'
             AND nf.data_previsao_pagamento LIKE ?
             AND EXISTS (
               SELECT 1 FROM cargo_loads cl
               WHERE TRIM(SUBSTRING_INDEX(cl.invoice_number, 'NF ', -1)) = nf.numero_nota
             )`,
          [`${prefixo}%`]
        ) as any;

        // Projeção "Contas a Receber": cargas entregues para compradores sem boleto/NF (ex:
        // Enerbio, mesma fonte da aba "Cargas Entregues a Receber"), ainda não marcadas como
        // recebidas (buyer_paid_at). Vencimento = data de entrega + prazo do comprador.
        const [cargasAReceberRows] = await db.$client.execute(
          `SELECT cl.id, cl.date, cl.delivery_date, cl.weight_net_kg, cl.weight_out_kg, cl.volume_m3,
                  cd.name AS destino_nome, cd.price_per_unit, cd.unit, cd.payment_term_days_after_delivery
           FROM cargo_loads cl
           JOIN cargo_destinations cd ON cd.id = IF(cl.destination_id >= 10000, cl.destination_id - 10000, cl.destination_id)
           WHERE cl.status = 'entregue' AND cd.payment_term_days_after_delivery IS NOT NULL AND cl.buyer_paid_at IS NULL`
        ) as any;
        // mysql2 devolve DATE/TIMESTAMP como objeto Date (não string) em execute() cru
        const toDateStrCarga = (v: any): string => v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10);
        const cargasAReceber = (cargasAReceberRows ?? [])
          .map((r: any) => {
            const entrega = toDateStrCarga(r.delivery_date || r.date);
            const venc = new Date(entrega + "T12:00:00");
            venc.setDate(venc.getDate() + Number(r.payment_term_days_after_delivery));
            const vencimento = venc.toISOString().slice(0, 10);
            const peso = parseFloat(r.weight_net_kg || r.weight_out_kg || "0");
            const volume = parseFloat(r.volume_m3 || "0");
            const preco = parseFloat(r.price_per_unit || "0");
            const quantidade = r.unit === "m3" ? volume : peso / 1000;
            return { data: vencimento, cliente: r.destino_nome, valor: quantidade * preco };
          })
          .filter((c: any) => c.data.startsWith(prefixo) && c.valor > 0);

        // Regras de pagamento da Folha (definidas pelo usuário):
        //  - CLT/PJ: pago no 5º dia útil do mês SEGUINTE ao trabalhado.
        //  - Semanalmente: pago na sexta-feira, com 1 semana de defasagem em relação à semana
        //    trabalhada (semana 05–11/07 é paga na sexta 17/07, não na sexta 10/07).
        //  - Diarista: pago no SÁBADO que fecha a própria semana trabalhada, sem defasagem
        //    (semana 02/08–08/08 é paga no próprio sábado 08/08).
        //  - Comissão: paga sempre no dia 20 do mês seguinte ao da comissão fechada, para
        //    qualquer cargo/vínculo (não só CLT/PJ) — é um lançamento à parte do salário/diária.
        const prevRef = prevMonthOf(ano, mes);
        const prevRefStr = `${prevRef.year}-${String(prevRef.month).padStart(2, "0")}`;
        const addDays = (dateStr: string, days: number): string => {
          const d = new Date(dateStr + "T12:00:00");
          d.setDate(d.getDate() + days);
          return d.toISOString().slice(0, 10);
        };
        const fridaysOfMonth = (year: number, month: number): string[] => {
          const list: string[] = [];
          const daysInMonth = new Date(year, month, 0).getDate();
          for (let d = 1; d <= daysInMonth; d++) {
            if (new Date(year, month - 1, d).getDay() === 5) list.push(`${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
          }
          return list;
        };

        // Projeção "Salário/Diária" — CLT/PJ: trabalho do mês anterior (prevRef), pago no 5º
        // dia útil deste mês. Usa base_value (não total_amount) — a comissão eventual tem sua
        // própria projeção, separada, no dia 20.
        const dataSalarioCltPj = nthBusinessDayOfMonth(ano, mes, 5);
        const [folhaCltPjRows] = await db.$client.execute(
          `SELECT c.id, c.name, c.daily_rate, pe.base_value, pe.status
           FROM collaborators c
           LEFT JOIN payroll_entries pe ON pe.collaborator_id = c.id AND pe.reference_month = ?
           WHERE c.active = 1 AND c.employment_type IN ('clt','pj')`,
          [prevRefStr]
        ) as any;
        const folhaCltPjPendente = (folhaCltPjRows ?? [])
          .filter((c: any) => c.status !== "pago")
          .map((c: any) => ({
            nome: c.name,
            valor: c.base_value !== null ? parseFloat(c.base_value) : parseFloat(c.daily_rate ?? "0"),
          }))
          .filter((c: any) => c.valor > 0);

        // Projeção "Salário" — colaboradores "Semanalmente": por padrão, cada sexta trabalhada é
        // paga na sexta seguinte (+7 dias, payment_lag_days). Exceção pontual (ex: Fernando
        // Kobayashi Junior, payment_lag_days=0): o pagamento no Fluxo de Caixa deve refletir a
        // MESMA sexta mostrada/paga na Folha, sem defasagem nenhuma. Olhamos o mês de referência
        // atual e o anterior, pois sextas do fim do mês anterior podem "vencer" (com defasagem >0)
        // já dentro deste mês exibido.
        const folhaSemanalPendente: { nome: string; data: string; valor: number }[] = [];
        for (const ref of [prevRef, { year: ano, month: mes }]) {
          const refStr = `${ref.year}-${String(ref.month).padStart(2, "0")}`;
          const refFridays = fridaysOfMonth(ref.year, ref.month);
          if (refFridays.length === 0) continue;
          const [rowsSemanal] = await db.$client.execute(
            `SELECT c.id, c.name, c.daily_rate, c.payment_lag_days, pe.base_value
             FROM collaborators c
             LEFT JOIN payroll_entries pe ON pe.collaborator_id = c.id AND pe.reference_month = ?
             WHERE c.active = 1 AND c.employment_type = 'semanal'`,
            [refStr]
          ) as any;
          // O que já foi marcado como pago SEXTA A SEXTA (chave é a sexta TRABALHADA, não a paga)
          const [pagasRows] = await db.$client.execute(
            `SELECT collaborator_id, week_friday FROM payroll_weekly_payments WHERE paid = 1 AND week_friday LIKE ?`,
            [`${refStr}%`]
          ) as any;
          const pagas = new Set((pagasRows ?? []).map((r: any) => `${r.collaborator_id}|${r.week_friday}`));
          for (const c of (rowsSemanal ?? [])) {
            const baseMes = c.base_value !== null ? parseFloat(c.base_value) : parseFloat(c.daily_rate ?? "0") * refFridays.length;
            const valorPorSexta = refFridays.length > 0 ? baseMes / refFridays.length : 0;
            if (valorPorSexta <= 0) continue;
            const lag = c.payment_lag_days !== null && c.payment_lag_days !== undefined ? Number(c.payment_lag_days) : 7;
            for (const f of refFridays) {
              if (pagas.has(`${c.id}|${f}`)) continue;
              const dataPagamento = addDays(f, lag);
              if (!dataPagamento.startsWith(prefixo)) continue;
              folhaSemanalPendente.push({ nome: c.name, data: dataPagamento, valor: valorPorSexta });
            }
          }
        }

        // Projeção "Diária" — Presenças (diarista/terceirizado) ainda não pagas. Diarista é
        // sempre pago no sábado que fecha a própria semana trabalhada (domingo–sábado), sem
        // defasagem; terceirizado (tipo de vínculo) projeta no próprio dia da presença, também
        // sem defasagem. Busca também o mês anterior, pois dias trabalhados no fim dele podem
        // "vencer" já dentro deste mês (ex: sexta 31/07 fecha no sábado 01/08).
        const [folhaDiariasRowsRaw] = await db.$client.execute(
          `SELECT DATE(ca.date) AS data, ca.daily_value, c.name, ca.employment_type_ca AS tipo
           FROM collaborator_attendance ca
           JOIN collaborators c ON c.id = ca.collaborator_id
           WHERE ca.payment_status_ca = 'pendente'
             AND ca.employment_type_ca IN ('diarista','terceirizado')
             AND ((YEAR(ca.date) = ? AND MONTH(ca.date) = ?) OR (YEAR(ca.date) = ? AND MONTH(ca.date) = ?))`,
          [ano, mes, prevRef.year, prevRef.month]
        ) as any;
        // sexta-feira (dia 5, semana domingo=0..sábado=6) da mesma semana da data informada
        const fridayOfWeek = (dateStr: string): string => {
          const d = new Date(dateStr + "T12:00:00");
          d.setDate(d.getDate() + (5 - d.getDay()));
          return d.toISOString().slice(0, 10);
        };
        // mysql2 devolve DATE(...) como objeto Date (não string) quando não há dateStrings
        // configurado na conexão — normaliza pra "YYYY-MM-DD" antes de usar como chave/comparar.
        const folhaDiariasRows = (folhaDiariasRowsRaw ?? [])
          .map((d: any) => {
            const dataTrabalho = d.data instanceof Date ? d.data.toISOString().slice(0, 10) : String(d.data).slice(0, 10);
            const dataPagamento = d.tipo === "diarista" ? addDays(fridayOfWeek(dataTrabalho), 1) : dataTrabalho;
            return { ...d, dataTrabalho, data: dataPagamento };
          })
          .filter((d: any) => d.data.startsWith(prefixo));

        // Projeção "Comissão" — sempre no dia 20, referente à comissão FECHADA do mês anterior
        // (prevRef), para qualquer cargo/vínculo (Motorista, Terceirizado, Operador, CLT etc.),
        // já líquida do desconto de combustível (Terceirizado). Só considera comissão já salva
        // na Folha (mesmo critério conservador usado no salário ainda não fechado, que entra
        // como 0). Exclui colaboradores com regra de pagamento periódica própria (ex: Ruan —
        // ver getSpecialWeeklyCommissionCashFlow), que têm um lançamento por período em vez
        // desse único lançamento mensal no dia 20.
        const dataComissao = `${prefixo}-20`;
        const [comissaoRows] = await db.$client.execute(
          `SELECT c.name, pe.commission, pe.discount
           FROM payroll_entries pe
           JOIN collaborators c ON c.id = pe.collaborator_id
           WHERE pe.reference_month = ?
             AND CAST(pe.commission AS DECIMAL(15,2)) - CAST(pe.discount AS DECIMAL(15,2)) > 0
             AND NOT (c.role IN ('motorista','terceirizado') AND c.commission_auto = 1
                      AND (c.weekly_period_anchor = 'sabado' OR c.payment_lag_days <> 7))`,
          [prevRefStr]
        ) as any;
        const folhaComissaoPendente = (comissaoRows ?? []).map((c: any) => ({
          nome: c.name, valor: parseFloat(c.commission) - parseFloat(c.discount || "0"),
        }));

        // Lançamentos por período (sábado-sexta, pago 14 dias depois, etc.) dos colaboradores
        // com regra própria — substitui, só pra eles, o lançamento único de dia 20 acima.
        const comissaoPeriodica = await getSpecialWeeklyCommissionCashFlow(db, ano, mes);

        const diasRealizados = (rows ?? []).map((r: any) => ({
          data: r.data_lancamento,
          recebimentos: parseFloat(r.recebimentos ?? 0),
          pagamentos: parseFloat(r.pagamentos ?? 0),
        }));
        const diasFuturosExcel = (futRows ?? []).map((f: any) => ({
          data: f.data,
          recebimentos: parseFloat(f.recebimentos ?? 0),
          pagamentos: parseFloat(f.pagamentos ?? 0),
        }));
        const diasContasAReceber = [
          ...(boletosAbertoRows ?? []).map((b: any) => ({ data: b.data, valor: parseFloat(b.valor ?? 0) })),
          ...(nfsAbertoRows ?? []).map((n: any) => ({ data: n.data, valor: parseFloat(n.valor_total ?? 0) })),
          ...cargasAReceber.map((c: any) => ({ data: c.data, valor: c.valor })),
        ];
        const diasFolhaPendente = [
          ...folhaCltPjPendente.map((c: any) => ({ data: dataSalarioCltPj, valor: c.valor })),
          ...(folhaDiariasRows ?? []).map((d: any) => ({ data: d.data, valor: parseFloat(d.daily_value ?? 0) })),
          ...folhaSemanalPendente.map((c: any) => ({ data: c.data, valor: c.valor })),
          ...folhaComissaoPendente.map((c: any) => ({ data: dataComissao, valor: c.valor })),
          ...comissaoPeriodica.map((c: any) => ({ data: c.date, valor: c.valor })),
        ];

        // Detalhe das pendências por dia, para exibir "o que não foi pago" (boletos Sicoob,
        // NFs Conta Azul sem boleto, Cargas Entregues a Receber e Folha de Pagamento pendente)
        const pendenciasPorDia: Record<string, {
          tipo: "boleto" | "nf" | "carga" | "folha"; cliente: string; referencia: string; valor: number;
        }[]> = {};
        for (const b of (boletosAbertoRows ?? [])) {
          const item = {
            tipo: "boleto" as const,
            cliente: b.nome_pagador ?? "—",
            referencia: b.nf_referente ? `NF ${b.nf_referente} • Nosso Nº ${b.nosso_numero}` : `Nosso Nº ${b.nosso_numero}`,
            valor: parseFloat(b.valor ?? 0),
          };
          (pendenciasPorDia[b.data] ??= []).push(item);
        }
        for (const n of (nfsAbertoRows ?? [])) {
          const item = {
            tipo: "nf" as const,
            cliente: n.nome_destinatario ?? "—",
            referencia: `NF ${n.numero_nota}`,
            valor: parseFloat(n.valor_total ?? 0),
          };
          (pendenciasPorDia[n.data] ??= []).push(item);
        }
        for (const c of cargasAReceber) {
          const item = {
            tipo: "carga" as const,
            cliente: c.cliente ?? "—",
            referencia: "Carga entregue sem boleto/NF",
            valor: c.valor,
          };
          (pendenciasPorDia[c.data] ??= []).push(item);
        }
        for (const c of folhaCltPjPendente) {
          const item = {
            tipo: "folha" as const,
            cliente: c.nome,
            referencia: "Folha — Salário CLT/PJ",
            valor: c.valor,
          };
          (pendenciasPorDia[dataSalarioCltPj] ??= []).push(item);
        }
        for (const c of folhaSemanalPendente) {
          const item = {
            tipo: "folha" as const,
            cliente: c.nome,
            referencia: "Folha — Semanal",
            valor: c.valor,
          };
          (pendenciasPorDia[c.data] ??= []).push(item);
        }
        for (const d of (folhaDiariasRows ?? [])) {
          const [ay, am, ad] = d.dataTrabalho.split("-");
          const item = {
            tipo: "folha" as const,
            cliente: d.name ?? "—",
            referencia: d.tipo === "diarista"
              ? `Folha — Diária de ${ad}/${am} (paga no sábado da semana)`
              : "Folha — Diária (Presença)",
            valor: parseFloat(d.daily_value ?? 0),
          };
          (pendenciasPorDia[d.data] ??= []).push(item);
        }
        for (const c of folhaComissaoPendente) {
          const item = {
            tipo: "folha" as const,
            cliente: c.nome,
            referencia: "Folha — Comissão (mês anterior)",
            valor: c.valor,
          };
          (pendenciasPorDia[dataComissao] ??= []).push(item);
        }
        for (const c of comissaoPeriodica) {
          const item = {
            tipo: "folha" as const,
            cliente: c.collaboratorName,
            referencia: "Folha — Comissão por período (líquida de combustível)",
            valor: c.valor,
          };
          (pendenciasPorDia[c.date] ??= []).push(item);
        }

        // "Real" mostra só o que já aconteceu de fato (extrato Sicoob) — sem nenhuma projeção.
        // "Projeção" mistura o que já foi realizado (extrato) com o que ainda está em aberto
        // (pendências + lançamentos futuros importados) — assim um boleto que acabou de ser
        // liquidado hoje aparece imediatamente, em vez de sumir da tela até você trocar pra "Real".
        const dias = modo === "real"
          ? mergeDiasFluxoCaixa(diasRealizados, [], [], saldoInicial, [])
          : mergeDiasFluxoCaixa(diasRealizados, diasFuturosExcel, diasContasAReceber, saldoInicial, diasFolhaPendente);

        return { dias, saldoInicial, pendenciasPorDia: modo === "real" ? {} : pendenciasPorDia, error: null };
  } catch (e: any) {
    return { dias: [], error: e.message };
  }
}

export const sicoobRouter = router({

  // Saldo da conta corrente
  saldo: protectedProcedure.query(async () => {
    try {
      const data = await sicoobGet("/conta-corrente/v4/saldo", {
        numeroContaCorrente: String(NUMERO_CONTA),
      });
      return { saldo: data.resultado?.saldo ?? 0, error: null };
    } catch (e: any) {
      return { saldo: 0, error: e?.response?.data?.httpMessage ?? "Erro ao buscar saldo" };
    }
  }),

  // Extrato da conta corrente
  extrato: protectedProcedure
    .input(z.object({ mes: z.number(), ano: z.number() }))
    .query(async ({ input }) => {
      try {
        const data = await sicoobGet(`/conta-corrente/v4/extrato/${input.mes}/${input.ano}`, {
          numeroContaCorrente: String(NUMERO_CONTA),
        });
        return { lancamentos: data.resultado?.lancamentos ?? [], error: null };
      } catch (e: any) {
        return { lancamentos: [], error: e?.response?.data?.httpMessage ?? "Erro ao buscar extrato" };
      }
    }),

  // Boletos a receber (por pagador) — direto da API
  boletosPorPagador: protectedProcedure
    .input(z.object({
      numeroCpfCnpj: z.string(),
      dataInicio: z.string().optional(),
      dataFim: z.string().optional(),
      codigoSituacao: z.number().optional(),
    }))
    .query(async ({ input }) => {
      try {
        const data = await sicoobGet(
          `/cobranca-bancaria/v3/pagadores/${input.numeroCpfCnpj}/boletos`,
          {
            numeroCliente: NUMERO_CLIENTE,
            dataInicio: input.dataInicio,
            dataFim: input.dataFim,
            codigoSituacao: input.codigoSituacao,
          }
        );
        return { boletos: data.resultado ?? [], error: null };
      } catch (e: any) {
        return { boletos: [], error: e?.response?.data?.httpMessage ?? "Erro ao buscar boletos" };
      }
    }),

  // Boleto individual
  boleto: protectedProcedure
    .input(z.object({ nossoNumero: z.number() }))
    .query(async ({ input }) => {
      try {
        const data = await sicoobGet("/cobranca-bancaria/v3/boletos", {
          numeroCliente: NUMERO_CLIENTE,
          codigoModalidade: CODIGO_MODALIDADE,
          nossoNumero: input.nossoNumero,
        });
        return { boleto: data.resultado ?? null, error: null };
      } catch (e: any) {
        return { boleto: null, error: e?.response?.data?.httpMessage ?? "Erro ao buscar boleto" };
      }
    }),

  // Configuração (verifica se está configurado)
  config: protectedProcedure.query(() => {
    return {
      configured: !!(
        process.env.SICOOB_CERT_PATH &&
        process.env.SICOOB_CLIENT_ID &&
        process.env.SICOOB_NUMERO_CONTA
      ),
      numeroConta: NUMERO_CONTA,
      numeroCliente: NUMERO_CLIENTE,
    };
  }),

  // ── Contas a Receber (lê da tabela sicoob_boletos) ──

  listBoletos: protectedProcedure
    .input(z.object({
      mes: z.number().min(1).max(12),
      ano: z.number().min(2020).max(2100),
      pesquisa: z.string().optional(),
    }))
    .query(async ({ input }) => {
      try {
        const { getDb } = await import("../db");
        const db = await getDb();
        if (!db) return { boletos: [], error: "DB indisponível" };

        const mesStr = String(input.mes).padStart(2, "0");
        const prefixo = `${input.ano}-${mesStr}`;

        const pesquisaClause = input.pesquisa
          ? `AND (nome_pagador LIKE ? OR cnpj_pagador LIKE ?)`
          : "";
        const pesquisaParams = input.pesquisa
          ? [`%${input.pesquisa}%`, `%${input.pesquisa}%`]
          : [];

        const [rows] = await db.$client.execute(
          `SELECT * FROM sicoob_boletos
           WHERE data_vencimento LIKE ?
           ${pesquisaClause}
           ORDER BY data_vencimento ASC`,
          [`${prefixo}%`, ...pesquisaParams]
        ) as any;

        return { boletos: rows ?? [], error: null };
      } catch (e: any) {
        return { boletos: [], error: e.message };
      }
    }),

  summaryBoletos: protectedProcedure
    .input(z.object({
      mes: z.number().min(1).max(12),
      ano: z.number().min(2020).max(2100),
    }))
    .query(async ({ input }) => {
      try {
        const { getDb } = await import("../db");
        const db = await getDb();
        if (!db) return { vencidos: 0, vencemHoje: 0, aVencer: 0, recebidos: 0, total: 0, error: "DB indisponível" };

        const mesStr = String(input.mes).padStart(2, "0");
        const prefixo = `${input.ano}-${mesStr}`;
        const hoje = new Date().toISOString().slice(0, 10);

        const [rows] = await db.$client.execute(
          `SELECT situacao, data_vencimento, valor FROM sicoob_boletos WHERE data_vencimento LIKE ?`,
          [`${prefixo}%`]
        ) as any;

        let vencidos = 0, vencemHoje = 0, aVencer = 0, recebidos = 0;

        for (const r of (rows ?? [])) {
          const v = parseFloat(r.valor ?? "0");
          if (r.situacao === 2) {
            // Baixado = cancelado, não entra nos totais
          } else if (r.situacao === 3) {
            recebidos += v;
          } else {
            if (r.data_vencimento < hoje) vencidos += v;
            else if (r.data_vencimento === hoje) vencemHoje += v;
            else aVencer += v;
          }
        }

        return {
          vencidos,
          vencemHoje,
          aVencer,
          recebidos,
          total: vencidos + vencemHoje + aVencer + recebidos,
          error: null,
        };
      } catch (e: any) {
        return { vencidos: 0, vencemHoje: 0, aVencer: 0, recebidos: 0, total: 0, error: e.message };
      }
    }),

  // ── Extrato Movimentações (lê da tabela sicoob_extrato) ──

  listExtrato: protectedProcedure
    .input(z.object({ mes: z.number().min(1).max(12), ano: z.number().min(2020).max(2100) }))
    .query(async ({ input }) => {
      try {
        const { getDb } = await import("../db");
        const db = await getDb();
        if (!db) return { lancamentos: [], sincronizadoEm: null, error: "DB indisponível" };
        const [rows] = await db.$client.execute(
          `SELECT * FROM sicoob_extrato WHERE mes = ? AND ano = ? ORDER BY data_lancamento ASC, id ASC`,
          [input.mes, input.ano]
        ) as any;
        const [meta] = await db.$client.execute(
          `SELECT MAX(sincronizado_em) as ultima FROM sicoob_extrato WHERE mes = ? AND ano = ?`,
          [input.mes, input.ano]
        ) as any;
        const [saldoRows] = await db.$client.execute(
          `SELECT saldo_inicial, saldo_final FROM sicoob_saldo_mes WHERE mes = ? AND ano = ?`,
          [input.mes, input.ano]
        ) as any;
        const saldoInicial = parseFloat((saldoRows as any[])?.[0]?.saldo_inicial ?? "0");
        return { lancamentos: rows ?? [], saldoInicial, sincronizadoEm: meta?.[0]?.ultima ?? null, error: null };
      } catch (e: any) {
        return { lancamentos: [], sincronizadoEm: null, error: e.message };
      }
    }),

  syncExtrato: protectedProcedure
    .input(z.object({ mes: z.number().min(1).max(12), ano: z.number().min(2020).max(2100) }))
    .mutation(async ({ input }) => {
      const result = await syncSicoobExtrato(input.mes, input.ano);
      return result;
    }),

  fluxoCaixaDiario: protectedProcedure
    .input(z.object({
      mes: z.number().min(1).max(12), ano: z.number().min(2020).max(2100),
      modo: z.enum(["projecao", "real"]).optional(),
    }))
    .query(async ({ input }) => {
      const { getDb } = await import("../db");
      const db = await getDb();
      if (!db) return { dias: [], error: "DB indisponível" };
      return computeFluxoCaixaMes(db, input.ano, input.mes, input.modo ?? "projecao");
    }),

  // Visão anual: soma os totais (recebimentos/pagamentos) de cada mês do ano, reaproveitando
  // o mesmo cálculo dia-a-dia usado na visão mensal — sem duplicar nenhuma regra de negócio
  // (Sicoob, boletos, NFs, Folha). O saldo acumulado passa de mês em mês.
  fluxoCaixaAnual: protectedProcedure
    .input(z.object({ ano: z.number().min(2020).max(2100), modo: z.enum(["projecao", "real"]).optional() }))
    .query(async ({ input }) => {
      const { getDb } = await import("../db");
      const db = await getDb();
      if (!db) return { meses: [], saldoInicialAno: 0, error: "DB indisponível" };
      try {
        // Os 12 meses são independentes entre si — roda em paralelo (limitado pelo pool de
        // conexões do banco) em vez de sequencial, senão a tela demora ~12x o tempo de 1 mês.
        const modo = input.modo ?? "projecao";
        const resultados = await Promise.all(
          Array.from({ length: 12 }, (_, i) => computeFluxoCaixaMes(db, input.ano, i + 1, modo))
        );
        const erro = resultados.find(r => r.error);
        if (erro) return { meses: [], saldoInicialAno: 0, error: erro.error };

        const saldoInicialAno = resultados[0].saldoInicial ?? 0;
        const meses = resultados.map((resultado, i) => {
          const recebimentos = resultado.dias.reduce((s: number, d: any) => s + d.recebimentos, 0);
          const pagamentos = resultado.dias.reduce((s: number, d: any) => s + d.pagamentos, 0);
          // Saldo final do mês = saldo acumulado do último dia calculado (já parte do saldo
          // inicial real daquele mês, salvo em sicoob_saldo_mes — mesma fonte da visão mensal).
          const saldoAcumulado = resultado.dias.length > 0
            ? resultado.dias[resultado.dias.length - 1].saldoAcumulado
            : (resultado.saldoInicial ?? 0);
          return { mes: i + 1, recebimentos, pagamentos, saldoAcumulado };
        });
        return { meses, saldoInicialAno, error: null };
      } catch (e: any) {
        return { meses: [], saldoInicialAno: 0, error: e.message };
      }
    }),


  updateValor: protectedProcedure
    .input(z.object({ id: z.number(), valor: z.string() }))
    .mutation(async ({ input }) => {
      const { getDb } = await import("../db");
      const db = await getDb();
      if (!db) throw new Error("DB indisponível");
      await db.$client.execute(
        `UPDATE sicoob_boletos SET valor = ?, valor_editado = 1 WHERE id = ?`,
        [input.valor, input.id]
      );
      return { success: true };
    }),

  // ── Lançamentos Futuros (importados do Excel do banco) ──

  importLancamentosFuturos: protectedProcedure
    .input(z.object({
      lancamentos: z.array(z.object({
        data: z.string(),
        documento: z.string().nullable(),
        historico: z.string().nullable(),
        infoComplementar: z.string().nullable(),
        valor: z.string(),
      })),
      substituirMes: z.string().optional(), // "YYYY-MM" — apaga os do mês antes de inserir
    }))
    .mutation(async ({ input }) => {
      const { getDb } = await import("../db");
      const db = await getDb();
      if (!db) throw new Error("DB indisponível");

      if (input.substituirMes) {
        await db.$client.execute(
          `DELETE FROM sicoob_lancamentos_futuros WHERE data LIKE ?`,
          [`${input.substituirMes}%`]
        );
      }

      let inserted = 0;
      for (const l of input.lancamentos) {
        await descobrirFavorecido(db, l.historico, l.infoComplementar, l.documento);
        await db.insert(sicoobLancamentosFuturos).values({
          data: l.data,
          documento: l.documento ?? null,
          historico: l.historico ?? null,
          infoComplementar: l.infoComplementar ?? null,
          valor: l.valor,
        });
        inserted++;
      }
      return { inserted, error: null };
    }),

  listLancamentosFuturos: protectedProcedure
    .input(z.object({ mes: z.number().min(1).max(12), ano: z.number().min(2020).max(2100) }))
    .query(async ({ input }) => {
      const { getDb } = await import("../db");
      const db = await getDb();
      if (!db) return { lancamentos: [], error: "DB indisponível" };
      const mesStr = String(input.mes).padStart(2, "0");
      const [rows] = await db.$client.execute(
        `SELECT * FROM sicoob_lancamentos_futuros WHERE data LIKE ? ORDER BY data ASC`,
        [`${input.ano}-${mesStr}%`]
      ) as any;
      return { lancamentos: rows ?? [], error: null };
    }),

  deleteLancamentosFuturos: protectedProcedure
    .input(z.object({ mes: z.number().min(1).max(12), ano: z.number().min(2020).max(2100) }))
    .mutation(async ({ input }) => {
      const { getDb } = await import("../db");
      const db = await getDb();
      if (!db) throw new Error("DB indisponível");
      const mesStr = String(input.mes).padStart(2, "0");
      await db.$client.execute(
        `DELETE FROM sicoob_lancamentos_futuros WHERE data LIKE ?`,
        [`${input.ano}-${mesStr}%`]
      );
      return { success: true };
    }),

  syncBoletos: protectedProcedure
    .mutation(async () => {
      try {
        const result = await syncSicoobBoletos();
        return { success: true, ...result };
      } catch (e: any) {
        return { success: false, synced: 0, errors: [e.message] };
      }
    }),

  syncStatus: protectedProcedure.query(async () => {
    try {
      const { getDb } = await import("../db");
      const db = await getDb();
      if (!db) return { ultimaSincronizacao: null, totalBoletos: 0 };
      const [rows] = await db.execute(
        `SELECT MAX(sincronizado_em) as ultima, COUNT(*) as total FROM sicoob_boletos`
      ) as any;
      const row = (rows as any[])[0];
      return {
        ultimaSincronizacao: row?.ultima ?? null,
        totalBoletos: Number(row?.total ?? 0),
      };
    } catch {
      return { ultimaSincronizacao: null, totalBoletos: 0 };
    }
  }),

  // ── Contas a Pagar (débitos do extrato Sicoob + lançamentos futuros negativos) ──

  contasAPagar: protectedProcedure
    .input(z.object({
      mes: z.number().min(1).max(12),
      ano: z.number().min(2020).max(2100),
      pesquisa: z.string().optional(),
    }))
    .query(async ({ input }) => {
      try {
        const { getDb } = await import("../db");
        const db = await getDb();
        if (!db) return { lancamentos: [], resumo: null, error: "DB indisponível" };

        const mesStr = String(input.mes).padStart(2, "0");
        const prefixo = `${input.ano}-${mesStr}`;
        const pesquisaLike = input.pesquisa ? `%${input.pesquisa}%` : null;

        const [extratoRows] = await db.$client.execute(
          `SELECT id, data_lancamento, descricao, complemento, numero_documento, valor
           FROM sicoob_extrato
           WHERE tipo_lancamento = 'DEBITO' AND data_lancamento LIKE ?
           ${pesquisaLike ? "AND descricao LIKE ?" : ""}
           ORDER BY data_lancamento ASC`,
          pesquisaLike ? [`${prefixo}%`, pesquisaLike] : [`${prefixo}%`]
        ) as any;

        const [futurosRows] = await db.$client.execute(
          `SELECT id, data, historico, documento, info_complementar, valor
           FROM sicoob_lancamentos_futuros
           WHERE CAST(valor AS DECIMAL(15,2)) < 0 AND data LIKE ?
           ${pesquisaLike ? "AND historico LIKE ?" : ""}
           ORDER BY data ASC`,
          pesquisaLike ? [`${prefixo}%`, pesquisaLike] : [`${prefixo}%`]
        ) as any;

        // Dias já refletidos no extrato realizado — evita duplicar lançamentos futuros já pagos
        const datasExtrato = new Set((extratoRows as any[]).map((r: any) => r.data_lancamento));
        const hoje = new Date().toISOString().slice(0, 10);

        const lancamentos: any[] = [];

        for (const r of (extratoRows as any[])) {
          lancamentos.push({
            id: r.id,
            origem: "extrato",
            dataVencimento: r.data_lancamento,
            dataPagamento: r.data_lancamento,
            descricao: r.descricao,
            complemento: r.complemento,
            numeroDocumento: r.numero_documento,
            valor: Math.abs(parseFloat(r.valor ?? "0")),
            situacao: "pago",
          });
        }
        for (const f of (futurosRows as any[])) {
          if (datasExtrato.has(f.data)) continue; // já refletido no extrato, evita dupla contagem
          const situacao = f.data < hoje ? "vencido" : (f.data === hoje ? "vence_hoje" : "a_vencer");
          lancamentos.push({
            id: f.id,
            origem: "futuro",
            dataVencimento: f.data,
            dataPagamento: null,
            descricao: f.historico,
            complemento: f.info_complementar,
            numeroDocumento: f.documento,
            valor: Math.abs(parseFloat(f.valor ?? "0")),
            situacao,
          });
        }

        // Anexa Grupo/Centro de Custo/Natureza do favorecido correspondente (mesma identificação
        // usada no sync — CNPJ/nome/fragmento de CPF), pra mostrar a classificação já feita na
        // aba Favorecidos sem precisar trocar de tela. Também expõe a chave/tipo do favorecido,
        // pra dar pra editar os campos vazios direto por aqui.
        const identPorLancamento = new Map<string, { tipo: string; chave: string }>();
        for (const l of lancamentos) {
          const ident = extrairIdentificadorFavorecido(l.descricao, l.complemento, l.numeroDocumento);
          if (ident) identPorLancamento.set(`${l.origem}-${l.id}`, ident);
        }
        if (identPorLancamento.size > 0) {
          const chavesUnicas = Array.from(new Set(Array.from(identPorLancamento.values()).map(i => i.chave)));
          const placeholders = chavesUnicas.map(() => "?").join(",");
          const [favRows] = (await db.$client.execute(
            `SELECT chave, grupo, centro_custo, natureza FROM favorecido_categoria WHERE chave IN (${placeholders})`,
            chavesUnicas
          )) as any;
          const favMap = new Map<string, any>((favRows as any[]).map(f => [f.chave, f]));
          for (const l of lancamentos) {
            const ident = identPorLancamento.get(`${l.origem}-${l.id}`);
            const fav = ident ? favMap.get(ident.chave) : null;
            l.grupo = fav?.grupo ?? null;
            l.centroCusto = fav?.centro_custo ?? null;
            l.natureza = fav?.natureza ?? null;
            l.favorecidoChave = ident?.chave ?? null;
            l.favorecidoTipo = ident?.tipo ?? null;
          }
        }

        lancamentos.sort((a, b) => (a.dataVencimento ?? "").localeCompare(b.dataVencimento ?? ""));

        let vencidos = 0, vencemHoje = 0, aVencer = 0, pagos = 0;
        for (const l of lancamentos) {
          if (l.situacao === "pago") pagos += l.valor;
          else if (l.situacao === "vencido") vencidos += l.valor;
          else if (l.situacao === "vence_hoje") vencemHoje += l.valor;
          else aVencer += l.valor;
        }

        return {
          lancamentos,
          resumo: { vencidos, vencemHoje, aVencer, pagos, total: vencidos + vencemHoje + aVencer + pagos },
          error: null,
        };
      } catch (e: any) {
        return { lancamentos: [], resumo: null, error: e.message };
      }
    }),

  // Dashboard de análise: débitos JÁ REALIZADOS (extrato Sicoob, não pendências/projeção) num
  // período, com a classificação (Grupo/Centro de Custo/Natureza) de cada um — a agregação por
  // grupo/centro de custo/natureza e por mês é feita no frontend em cima dessa lista "achatada".
  dashboardContasAPagar: protectedProcedure
    .input(z.object({
      anoInicio: z.number().min(2020).max(2100),
      mesInicio: z.number().min(1).max(12),
      anoFim: z.number().min(2020).max(2100),
      mesFim: z.number().min(1).max(12),
    }))
    .query(async ({ input }) => {
      try {
        const { getDb } = await import("../db");
        const db = await getDb();
        if (!db) return { lancamentos: [], error: "DB indisponível" };

        const dataInicio = `${input.anoInicio}-${String(input.mesInicio).padStart(2, "0")}-01`;
        const ultimoDiaFim = new Date(input.anoFim, input.mesFim, 0).getDate();
        const dataFim = `${input.anoFim}-${String(input.mesFim).padStart(2, "0")}-${String(ultimoDiaFim).padStart(2, "0")}`;

        const [rows] = (await db.$client.execute(
          `SELECT id, data_lancamento, descricao, complemento, numero_documento, valor
           FROM sicoob_extrato
           WHERE tipo_lancamento = 'DEBITO' AND data_lancamento BETWEEN ? AND ?
           ORDER BY data_lancamento ASC`,
          [dataInicio, dataFim]
        )) as any;

        const lancamentos = (rows as any[]).map(r => ({
          id: r.id,
          data: r.data_lancamento,
          descricao: r.descricao,
          complemento: r.complemento,
          numeroDocumento: r.numero_documento,
          valor: Math.abs(parseFloat(r.valor ?? "0")),
        }));

        // Anexa Grupo/Centro de Custo/Natureza do favorecido correspondente — mesma identificação
        // usada em toda a tela de Contas a Pagar (CNPJ/nome/fragmento de CPF/descrição).
        const identPorLancamento = new Map<number, string>();
        for (let i = 0; i < lancamentos.length; i++) {
          const l = lancamentos[i];
          const ident = extrairIdentificadorFavorecido(l.descricao, l.complemento, l.numeroDocumento);
          if (ident) identPorLancamento.set(l.id, ident.chave);
        }
        if (identPorLancamento.size > 0) {
          const chavesUnicas = Array.from(new Set(identPorLancamento.values()));
          const placeholders = chavesUnicas.map(() => "?").join(",");
          const [favRows] = (await db.$client.execute(
            `SELECT chave, grupo, centro_custo, natureza FROM favorecido_categoria WHERE chave IN (${placeholders})`,
            chavesUnicas
          )) as any;
          const favMap = new Map<string, any>((favRows as any[]).map(f => [f.chave, f]));
          for (const l of lancamentos as any[]) {
            const chave = identPorLancamento.get(l.id);
            const fav = chave ? favMap.get(chave) : null;
            l.grupo = fav?.grupo ?? null;
            l.centroCusto = fav?.centro_custo ?? null;
            l.natureza = fav?.natureza ?? null;
          }
        }

        return { lancamentos, error: null };
      } catch (e: any) {
        return { lancamentos: [], error: e.message };
      }
    }),

  // ── Memória de favorecidos (server/utils/favorecidoCategoria.ts) ──

  listFavorecidosCategoria: protectedProcedure.query(async () => {
    const { getDb } = await import("../db");
    const db = await getDb();
    if (!db) return { favorecidos: [], error: "DB indisponível" };
    const [rows] = (await db.$client.execute(
      `SELECT id, chave, tipo_chave, razao_social, cnae_codigo, cnae_descricao,
              grupo, centro_custo, natureza, classificacao, fixo_variavel, direto_indireto, updated_at
       FROM favorecido_categoria
       ORDER BY updated_at DESC`
    )) as any;
    return { favorecidos: rows ?? [], error: null };
  }),

  // Combinações já usadas de Grupo/Centro de Custo/Natureza/Classificação/Fixo-Variável/
  // Direto-Indireto — o frontend usa isso pra montar os dropdowns em cascata (cada campo só
  // mostra as opções que já apareceram junto com o que foi escolhido nos campos anteriores).
  listClassificacaoOpcoes: protectedProcedure.query(async () => {
    const { getDb } = await import("../db");
    const db = await getDb();
    if (!db) return { combos: [], error: "DB indisponível" };
    const [rows] = (await db.$client.execute(
      `SELECT DISTINCT grupo, centro_custo, natureza, classificacao, fixo_variavel, direto_indireto
       FROM favorecido_categoria
       WHERE grupo IS NOT NULL AND grupo != ''`
    )) as any;
    return { combos: rows ?? [], error: null };
  }),

  // Edita um dos campos de classificação adicional (Grupo, Centro de Custo, Natureza,
  // Classificação, Fixo/Variável, Direto/Indireto). Como os campos formam uma hierarquia
  // (dropdowns em cascata na tela), mudar um campo limpa os campos abaixo dele nessa mesma
  // linha — evita deixar uma combinação inconsistente com o que passou a estar acima.
  updateFavorecidoClassificacao: protectedProcedure
    .input(z.object({
      id: z.number(),
      campo: z.enum(["grupo", "centro_custo", "natureza", "classificacao", "fixo_variavel", "direto_indireto"]),
      valor: z.string().nullable(),
    }))
    .mutation(async ({ input }) => {
      const { getDb } = await import("../db");
      const db = await getDb();
      if (!db) throw new Error("DB indisponível");
      const ORDEM = ["grupo", "centro_custo", "natureza", "classificacao", "fixo_variavel", "direto_indireto"] as const;
      const idx = ORDEM.indexOf(input.campo);
      const dependentes = ORDEM.slice(idx + 1);
      const sets = [`${input.campo} = ?`, ...dependentes.map(c => `${c} = NULL`)].join(", ");
      await db.$client.execute(
        `UPDATE favorecido_categoria SET ${sets}, updated_at = NOW() WHERE id = ?`,
        [input.valor, input.id]
      );
      return { success: true };
    }),

  // Mesma edição de campo de classificação, mas endereçada pela CHAVE do favorecido (não pelo
  // id) — usada na aba Lançamentos, onde o favorecido pode ainda nem existir na memória (ex:
  // primeira vez que esse CNPJ aparece). Cria o registro na hora se ainda não existir.
  upsertFavorecidoClassificacaoPorChave: protectedProcedure
    .input(z.object({
      chave: z.string(),
      tipoChave: z.enum(["cnpj", "nome", "cpf_fragmento"]),
      campo: z.enum(["grupo", "centro_custo", "natureza", "classificacao", "fixo_variavel", "direto_indireto"]),
      valor: z.string().nullable(),
    }))
    .mutation(async ({ input }) => {
      const { getDb } = await import("../db");
      const db = await getDb();
      if (!db) throw new Error("DB indisponível");
      const ORDEM = ["grupo", "centro_custo", "natureza", "classificacao", "fixo_variavel", "direto_indireto"] as const;
      const idx = ORDEM.indexOf(input.campo);
      const dependentes = ORDEM.slice(idx + 1);

      const [existente] = (await db.$client.execute(
        `SELECT id FROM favorecido_categoria WHERE chave = ? LIMIT 1`,
        [input.chave]
      )) as any;

      if ((existente as any[])?.[0]) {
        const sets = [`${input.campo} = ?`, ...dependentes.map(c => `${c} = NULL`)].join(", ");
        await db.$client.execute(
          `UPDATE favorecido_categoria SET ${sets}, updated_at = NOW() WHERE chave = ?`,
          [input.valor, input.chave]
        );
      } else {
        await db.$client.execute(
          `INSERT INTO favorecido_categoria (chave, tipo_chave, ${input.campo}) VALUES (?, ?, ?)`,
          [input.chave, input.tipoChave, input.valor]
        );
      }
      return { success: true };
    }),

  updateFavorecidoNome: protectedProcedure
    .input(z.object({ id: z.number(), razaoSocial: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const { getDb } = await import("../db");
      const db = await getDb();
      if (!db) throw new Error("DB indisponível");
      await db.$client.execute(
        `UPDATE favorecido_categoria SET razao_social = ?, updated_at = NOW() WHERE id = ?`,
        [input.razaoSocial.trim(), input.id]
      );
      return { success: true };
    }),

  deleteFavorecidoCategoria: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const { getDb } = await import("../db");
      const db = await getDb();
      if (!db) throw new Error("DB indisponível");
      await db.$client.execute(`DELETE FROM favorecido_categoria WHERE id = ?`, [input.id]);
      return { success: true };
    }),

  // Importa uma planilha de CNPJs (ex: base de razão social/CNAE já levantada externamente)
  // como ponto de partida da memória — cada linha vira (ou atualiza) um favorecido por CNPJ.
  importFavorecidosCategoriaPlanilha: protectedProcedure
    .input(z.object({
      linhas: z.array(z.object({
        cnpj: z.string(),
        razaoSocial: z.string().nullable().optional(),
        nomeFantasia: z.string().nullable().optional(),
        cnaeCodigo: z.string().nullable().optional(),
        cnaeDescricao: z.string().nullable().optional(),
        grupo: z.string().nullable().optional(),
        centroCusto: z.string().nullable().optional(),
        natureza: z.string().nullable().optional(),
        classificacao: z.string().nullable().optional(),
        fixoVariavel: z.string().nullable().optional(),
        diretoIndireto: z.string().nullable().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      const { getDb } = await import("../db");
      const db = await getDb();
      if (!db) throw new Error("DB indisponível");

      let importados = 0;
      let ignorados = 0;
      for (const l of input.linhas) {
        // Colunas de CNPJ tratadas como número no Excel perdem os zeros à esquerda
        // (ex: CAIXA ECONÔMICA FEDERAL vira "360305000104" em vez de "00360305000104") —
        // completa de volta para 14 dígitos antes de rejeitar.
        const digitosBrutos = l.cnpj.replace(/\D/g, "");
        if (digitosBrutos.length === 0 || digitosBrutos.length > 14) { ignorados++; continue; }
        const digitos = digitosBrutos.padStart(14, "0");
        const chave = `cnpj:${digitos}`;
        await registrarFavorecido(db, {
          chave,
          tipoChave: "cnpj",
          razaoSocial: l.razaoSocial || l.nomeFantasia || null,
          cnaeCodigo: l.cnaeCodigo || null,
          cnaeDescricao: l.cnaeDescricao || null,
        });
        // Só mexe nesses campos se a planilha realmente tem essas colunas — evita apagar uma
        // classificação já feita pela tela ao reimportar uma planilha só com CNPJ/CNAE.
        const temClassificacao = [l.grupo, l.centroCusto, l.natureza, l.classificacao, l.fixoVariavel, l.diretoIndireto]
          .some(v => v !== undefined);
        if (temClassificacao) {
          await db.$client.execute(
            `UPDATE favorecido_categoria SET
               grupo = ?, centro_custo = ?, natureza = ?, classificacao = ?, fixo_variavel = ?, direto_indireto = ?
             WHERE chave = ?`,
            [
              l.grupo?.trim() || null,
              l.centroCusto?.trim() || null,
              l.natureza?.trim() || null,
              l.classificacao?.trim() || null,
              l.fixoVariavel?.trim() || null,
              l.diretoIndireto?.trim() || null,
              chave,
            ]
          );
        }
        importados++;
      }
      return { importados, ignorados };
    }),
});
