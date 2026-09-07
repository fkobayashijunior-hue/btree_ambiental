import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import axios, { AxiosError } from "axios";
import { calcularDataPrevisaoPagamento, normalizarCnpj } from "../utils/prazoPagamento";
import { calcularResumoNFsSemBoleto, type NFParaResumo } from "../utils/resumoNFs";

const BASE_URL = "https://api-v2.contaazul.com";

// ── In-memory access token cache ──────────────────────────────────────────────
let tokenCache: { token: string; expiresAt: number } | null = null;

function getCredentials() {
  const clientId     = process.env.CONTAAZUL_CLIENT_ID ?? "";
  const clientSecret = process.env.CONTAAZUL_CLIENT_SECRET ?? "";
  if (!clientId || !clientSecret) {
    throw new Error("CONTAAZUL_CLIENT_ID e CONTAAZUL_CLIENT_SECRET não configurados no .env");
  }
  return { clientId, clientSecret };
}

async function getDbInstance() {
  const { getDb } = await import("../db");
  return getDb();
}

async function getStoredRefreshToken(db: any): Promise<string | null> {
  const [rows] = await db.$client.execute(
    `SELECT refresh_token FROM contaazul_tokens ORDER BY id DESC LIMIT 1`
  ) as any;
  return (rows as any[])?.[0]?.refresh_token ?? null;
}

async function persistTokens(db: any, refreshToken: string, accessToken: string, expiresAt: number) {
  await db.$client.execute(
    `INSERT INTO contaazul_tokens (id, refresh_token, access_token, expires_at, atualizado_em)
     VALUES (1, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE refresh_token = ?, access_token = ?, expires_at = ?, atualizado_em = NOW()`,
    [refreshToken, accessToken, expiresAt, refreshToken, accessToken, expiresAt]
  );
}

async function getContaAzulToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) return tokenCache.token;

  const db = await getDbInstance();
  if (!db) throw new Error("DB indisponível");

  const { clientId, clientSecret } = getCredentials();
  const refreshToken = await getStoredRefreshToken(db);
  if (!refreshToken) {
    throw new Error(
      "Refresh token não configurado. Acesse Contas a Receber → Notas Fiscais → Configurar Conta Azul para inserir o token inicial."
    );
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const params = new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken });

  let res: any;
  try {
    res = await axios.post(`${BASE_URL}/oauth/token`, params.toString(), {
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
  } catch (e: any) {
    const status = (e as AxiosError)?.response?.status;
    if (status === 400 || status === 401) {
      tokenCache = null;
      throw new Error("Refresh token da Conta Azul revogado ou expirado. Insira um novo token.");
    }
    throw e;
  }

  const { access_token, refresh_token: newRefreshToken, expires_in } = res.data;
  const expiresAt = Date.now() + (expires_in - 300) * 1000; // renova 5 min antes

  // Salva novo refresh_token ANTES de usar o access_token (evita perda em caso de falha)
  await persistTokens(db, newRefreshToken, access_token, expiresAt);

  tokenCache = { token: access_token, expiresAt };
  console.log("[ContaAzul] Token renovado com sucesso");
  return access_token;
}

export async function caGet(path: string, params?: Record<string, any>): Promise<any> {
  const token = await getContaAzulToken();
  const res = await axios.get(`${BASE_URL}${path}`, {
    params,
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  return res.data;
}

async function caGetXml(path: string): Promise<string> {
  const token = await getContaAzulToken();
  const res = await axios.get(`${BASE_URL}${path}`, {
    responseType: "text",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/xml, text/xml, */*" },
  });
  return typeof res.data === "string" ? res.data : JSON.stringify(res.data);
}

// ── XML parser (NFe / NFS-e padrão) ─────────────────────────────────────────
function extractTag(xml: string, tag: string): string | null {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([^<]+)<\/${tag}>`));
  return m?.[1]?.trim() ?? null;
}

function parseNFXml(xml: string) {
  const destBlock = xml.match(/<dest>([\s\S]*?)<\/dest>/)?.[1] ?? "";
  const cnpjDestinatario =
    destBlock.match(/<CNPJ>(\d+)<\/CNPJ>/)?.[1] ??
    destBlock.match(/<CPF>(\d+)<\/CPF>/)?.[1] ?? null;
  const nomeDestinatario = extractTag(destBlock, "xNome") ?? null;
  const valorTotal =
    extractTag(xml, "vNF") ??
    extractTag(xml, "vLiq") ??
    extractTag(xml, "vTotalNota") ??
    extractTag(xml, "vNFSe") ?? null;
  const dhEmi = extractTag(xml, "dhEmi") ?? extractTag(xml, "dEmi") ?? null;
  const dataEmissao = dhEmi ? dhEmi.slice(0, 10) : null;
  const numeroNota = extractTag(xml, "nNF") ?? extractTag(xml, "NumeroNFe") ?? null;
  // uCom/qCom (unidade/quantidade comerciais) vêm dentro de <det><prod>...</prod></det> — quando há
  // vários itens na NF, usamos o primeiro (extractTag pega a primeira ocorrência no XML inteiro).
  const unidade = extractTag(xml, "uCom") ?? null;
  const quantidade = extractTag(xml, "qCom") ?? null;
  const cfop = extractTag(xml, "CFOP") ?? null;
  return { cnpjDestinatario, nomeDestinatario, valorTotal, dataEmissao, numeroNota, unidade, quantidade, cfop };
}

function isStatusCancelamento(statusFiscal: string | null | undefined): boolean {
  return /cancel/i.test(statusFiscal ?? "");
}

async function carregarRegrasPrazo(db: any) {
  const [rows] = await db.$client.execute(
    `SELECT cnpj, tipo_regra as tipoRegra, parametros FROM cliente_prazo_pagamento WHERE ativo = 1`
  ) as any;
  return (rows ?? []) as { cnpj: string; tipoRegra: string; parametros: string }[];
}

async function temBoletoCorrespondente(db: any, numeroNota: string, cnpj: string): Promise<boolean> {
  if (!numeroNota || !cnpj) return false;
  const [rows] = await db.$client.execute(
    `SELECT id FROM sicoob_boletos WHERE nf_referente = ? AND cnpj_pagador = ? LIMIT 1`,
    [numeroNota, cnpj]
  ) as any;
  return ((rows as any[]) ?? []).length > 0;
}

// Data de entrega da carga vinculada à NF (mesmo casamento usado em listNotasFiscais: o campo
// invoice_number da carga é ou o número puro da NF, ou "AC-XXXXX — NF ###"). Usada pra contar o
// prazo de pagamento (regra dias_corridos) a partir da entrega, não da emissão da NF.
async function buscarDataEntregaCarga(db: any, numeroNota: string): Promise<string | null> {
  if (!numeroNota) return null;
  const [rows] = await db.$client.execute(
    `SELECT delivery_date FROM cargo_loads WHERE TRIM(SUBSTRING_INDEX(invoice_number, 'NF ', -1)) = ? LIMIT 1`,
    [numeroNota]
  ) as any;
  const deliveryDate = (rows as any[])?.[0]?.delivery_date ?? null;
  if (!deliveryDate) return null;
  return deliveryDate instanceof Date ? deliveryDate.toISOString().slice(0, 10) : String(deliveryDate).slice(0, 10);
}

// ── Sync principal ────────────────────────────────────────────────────────────
export async function syncNotasFiscais(mes: number, ano: number) {
  const db = await getDbInstance();
  if (!db) return { synced: 0, errors: ["DB indisponível"] };

  const fmtDate = (d: Date) => d.toISOString().slice(0, 10);
  const addDay  = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
  const inicio  = new Date(ano, mes - 1, 1);
  const fim     = new Date(ano, mes, 0);

  // Divide em chunks de 15 dias (limite da API Conta Azul)
  const chunks: { inicio: Date; fim: Date }[] = [];
  let cur = new Date(inicio);
  while (cur <= fim) {
    const chunkEnd = new Date(cur);
    chunkEnd.setDate(chunkEnd.getDate() + 14);
    if (chunkEnd > fim) chunkEnd.setTime(fim.getTime());
    chunks.push({ inicio: new Date(cur), fim: new Date(chunkEnd) });
    cur.setDate(cur.getDate() + 15);
  }

  const errors: string[] = [];
  const allNFs: any[] = [];

  for (const chunk of chunks) {
    let pagina = 1;
    while (true) {
      try {
        // A API trata data_final como limite EXCLUSIVO (início do dia) — sem o +1 dia, as NFs
        // emitidas exatamente no último dia do chunk (incluindo o último dia do mês) somem da sincronização.
        const res = await caGet("/v1/notas-fiscais", {
          data_inicial: fmtDate(chunk.inicio),
          data_final:   fmtDate(addDay(chunk.fim, 1)),
          pagina,
          tamanho_pagina: 50,
        });
        const items: any[] = res.itens ?? res.data ?? (Array.isArray(res) ? res : []);
        const totalPaginas: number = res.total_paginas ?? res.totalPaginas ?? 1;
        console.log(`[ContaAzul] ${fmtDate(chunk.inicio)}→${fmtDate(chunk.fim)} pág ${pagina}/${totalPaginas}: ${items.length} NFs`);
        allNFs.push(...items);
        if (pagina >= totalPaginas || items.length === 0) break;
        pagina++;
      } catch (e: any) {
        const msg = e?.response?.data?.message ?? e?.message ?? "Erro";
        errors.push(`Chunk ${fmtDate(chunk.inicio)}: ${msg}`);
        break;
      }
    }
  }

  console.log(`[ContaAzul] Total NFs encontradas: ${allNFs.length}`);

  const regras = await carregarRegrasPrazo(db);

  let synced = 0;
  const BATCH = 3;
  for (let i = 0; i < allNFs.length; i += BATCH) {
    const batch = allNFs.slice(i, i + BATCH);
    await Promise.all(batch.map(async (nf: any) => {
      const chave = nf.chave_acesso ?? nf.chaveAcesso ?? null;
      if (!chave) return;
      try {
        const xmlStr = await caGetXml(`/v1/notas-fiscais/${chave}`);
        const parsed = parseNFXml(xmlStr);

        const numeroNota       = String(nf.numero_nota ?? nf.numeroNota ?? parsed.numeroNota ?? "");
        const nomeDestinatario = nf.nome_destinatario ?? nf.nomeDestinatario ?? parsed.nomeDestinatario ?? "";
        const dataEmissao      = (nf.data_emissao ?? nf.dataEmissao ?? parsed.dataEmissao ?? "").slice(0, 10);
        const statusFiscal     = nf.status ?? "desconhecido";
        const cnpjDestinatario = normalizarCnpj(parsed.cnpjDestinatario ?? "");
        const valorTotal       = parsed.valorTotal ?? "0";
        const unidade          = parsed.unidade ?? null;
        const quantidade       = parsed.quantidade ?? null;
        const cfop             = parsed.cfop ?? null;
        const mesNF            = dataEmissao ? parseInt(dataEmissao.slice(5, 7)) : mes;
        const anoNF            = dataEmissao ? parseInt(dataEmissao.slice(0, 4)) : ano;

        // Estado atual (para não sobrescrever status_nf_interno manual e para log de auditoria)
        const [existingRows] = await db.$client.execute(
          `SELECT id, status_nf_interno FROM notas_fiscais WHERE chave_acesso = ?`,
          [chave]
        ) as any;
        const existing = (existingRows as any[])?.[0] ?? null;

        // Data Previsão de Pagamento: só quando NÃO houver boleto Sicoob correspondente
        const temBoleto = await temBoletoCorrespondente(db, numeroNota, cnpjDestinatario);
        const dataEntregaCarga = temBoleto ? null : await buscarDataEntregaCarga(db, numeroNota);
        const dataPrevisao = temBoleto
          ? null
          : calcularDataPrevisaoPagamento(cnpjDestinatario, dataEmissao, regras, dataEntregaCarga);

        await db.$client.execute(
          `INSERT INTO notas_fiscais
             (chave_acesso, numero_nota, data_emissao, nome_destinatario, cnpj_destinatario, valor_total,
              unidade, quantidade, cfop, status_fiscal_conta_azul, data_previsao_pagamento, mes, ano, sincronizado_em)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
           ON DUPLICATE KEY UPDATE
             numero_nota = ?, data_emissao = ?, nome_destinatario = ?, cnpj_destinatario = ?,
             valor_total = IF(valor_editado = 1, valor_total, ?), unidade = ?, quantidade = ?, cfop = ?,
             status_fiscal_conta_azul = ?, data_previsao_pagamento = ?,
             mes = ?, ano = ?, sincronizado_em = NOW()`,
          [chave, numeroNota, dataEmissao, nomeDestinatario, cnpjDestinatario, valorTotal,
           unidade, quantidade, cfop, statusFiscal, dataPrevisao, mesNF, anoNF,
           numeroNota, dataEmissao, nomeDestinatario, cnpjDestinatario, valorTotal, unidade, quantidade, cfop,
           statusFiscal, dataPrevisao, mesNF, anoNF]
        );

        // Cancelamento automático: status fiscal indica cancelamento na SEFAZ
        if (isStatusCancelamento(statusFiscal) && existing?.status_nf_interno !== "cancelado") {
          const [idRows] = await db.$client.execute(
            `SELECT id FROM notas_fiscais WHERE chave_acesso = ?`, [chave]
          ) as any;
          const notaId = (idRows as any[])?.[0]?.id;
          if (notaId) {
            await db.$client.execute(
              `UPDATE notas_fiscais SET status_nf_interno = 'cancelado' WHERE id = ?`,
              [notaId]
            );
            await db.$client.execute(
              `INSERT INTO notas_fiscais_status_log (nota_fiscal_id, campo, valor_anterior, valor_novo, usuario_id, usuario_nome, alterado_em)
               VALUES (?, 'status_nf_interno', ?, 'cancelado', NULL, 'Sistema (Conta Azul)', NOW())`,
              [notaId, existing?.status_nf_interno ?? "em_aberto"]
            );
            console.log(`[ContaAzul] NF ${numeroNota} auto-cancelada (status fiscal: ${statusFiscal})`);
          }
        }

        synced++;
      } catch (e: any) {
        const msg = e?.response?.data?.message ?? e?.message ?? "Erro";
        console.error(`[ContaAzul] Erro NF ${chave}: ${msg}`);
        errors.push(`NF ${chave}: ${msg}`);
      }
    }));
  }

  console.log(`[ContaAzul] Sync concluído: ${synced} NFs | Erros: ${errors.length}`);
  return { synced, errors };
}

// ── Router tRPC ───────────────────────────────────────────────────────────────
export const contaAzulRouter = router({

  setRefreshToken: protectedProcedure
    .input(z.object({ refreshToken: z.string().min(10) }))
    .mutation(async ({ input }) => {
      const db = await getDbInstance();
      if (!db) throw new Error("DB indisponível");
      await db.$client.execute(
        `INSERT INTO contaazul_tokens (id, refresh_token, access_token, expires_at, atualizado_em)
         VALUES (1, ?, '', 0, NOW())
         ON DUPLICATE KEY UPDATE refresh_token = ?, atualizado_em = NOW()`,
        [input.refreshToken, input.refreshToken]
      );
      tokenCache = null;
      return { success: true };
    }),

  syncStatus: protectedProcedure.query(async () => {
    const db = await getDbInstance();
    if (!db) return { ultimaSincronizacao: null, totalNFs: 0, configurado: false };
    const [nfRows]    = await db.$client.execute(`SELECT MAX(sincronizado_em) as ultima, COUNT(*) as total FROM notas_fiscais`) as any;
    const [tokenRows] = await db.$client.execute(`SELECT COUNT(*) as cnt FROM contaazul_tokens WHERE refresh_token IS NOT NULL AND refresh_token != ''`) as any;
    const row = (nfRows as any[])[0];
    return {
      ultimaSincronizacao: row?.ultima ?? null,
      totalNFs:   Number(row?.total ?? 0),
      configurado: Number((tokenRows as any[])?.[0]?.cnt ?? 0) > 0,
    };
  }),

  listNotasFiscais: protectedProcedure
    .input(z.object({
      mes:                z.number().min(1).max(12),
      ano:                z.number().min(2020).max(2100),
      pesquisa:           z.string().optional(),
      incluirCanceladas:  z.boolean().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDbInstance();
      if (!db) return { notas: [], error: "DB indisponível" };
      const pClause = input.pesquisa
        ? `AND (nf.nome_destinatario LIKE ? OR nf.cnpj_destinatario LIKE ? OR nf.numero_nota LIKE ?)`
        : "";
      const pParams = input.pesquisa
        ? [`%${input.pesquisa}%`, `%${input.pesquisa}%`, `%${input.pesquisa}%`]
        : [];
      const canceladasClause = input.incluirCanceladas ? "" : `AND nf.status_nf_interno != 'cancelado'`;
      const [rows] = await db.$client.execute(
        `SELECT nf.*,
           CASE WHEN sb.id IS NOT NULL THEN 1 ELSE 0 END AS tem_boleto,
           sb.nosso_numero                                AS boleto_nosso_numero,
           sb.situacao                                    AS boleto_situacao,
           sb.data_vencimento                             AS boleto_data_vencimento,
           cl.date                                        AS carga_data_carregamento,
           cl.delivery_date                                AS carga_data_entrega,
           cl.vehicle_plate                                AS carga_placa,
           cl.driver_name                                  AS carga_motorista,
           cl.wood_type                                    AS carga_madeira,
           cl.volume_m3                                    AS carga_volume_m3,
           COALESCE(NULLIF(cl.weight_net_kg, ''), NULLIF(cl.weight_kg, '')) AS carga_peso_kg,
           cl.status                                       AS carga_situacao
         FROM notas_fiscais nf
         LEFT JOIN sicoob_boletos sb
           ON sb.nf_referente = nf.numero_nota
          AND sb.cnpj_pagador = nf.cnpj_destinatario
         LEFT JOIN cargo_loads cl
           ON TRIM(SUBSTRING_INDEX(cl.invoice_number, 'NF ', -1)) = nf.numero_nota
         WHERE nf.mes = ? AND nf.ano = ? AND nf.cfop = '5102'
         ${canceladasClause}
         ${pClause}
         ORDER BY nf.data_emissao ASC`,
        [input.mes, input.ano, ...pParams]
      ) as any;
      return { notas: rows ?? [], error: null };
    }),

  // Resumo (Vencidos/Vencem hoje/A vencer/Recebidos/Total) apenas das NFs sem boleto correspondente.
  // O frontend soma este resultado ao summaryBoletos (Sicoob) para formar os cards finais.
  summaryNFsSemBoleto: protectedProcedure
    .input(z.object({ mes: z.number().min(1).max(12), ano: z.number().min(2020).max(2100) }))
    .query(async ({ input }) => {
      const db = await getDbInstance();
      if (!db) return { vencidos: 0, vencemHoje: 0, aVencer: 0, recebidos: 0, total: 0, error: "DB indisponível" };

      // NFs sem boleto correspondente, com previsão OU pagamento no período filtrado (ou sem período definido, filtradas depois na função pura)
      const [rows] = await db.$client.execute(
        `SELECT nf.valor_total, nf.status_nf_interno, nf.data_pagamento_confirmado, nf.data_previsao_pagamento
         FROM notas_fiscais nf
         LEFT JOIN sicoob_boletos sb
           ON sb.nf_referente = nf.numero_nota
          AND sb.cnpj_pagador = nf.cnpj_destinatario
         WHERE sb.id IS NULL
           AND nf.cfop = '5102'
           AND (
             (nf.data_previsao_pagamento LIKE ?) OR
             (nf.data_pagamento_confirmado LIKE ?)
           )`,
        [`${input.ano}-${String(input.mes).padStart(2, "0")}%`, `${input.ano}-${String(input.mes).padStart(2, "0")}%`]
      ) as any;

      const nfs: NFParaResumo[] = (rows ?? []).map((r: any) => ({
        valor: parseFloat(r.valor_total ?? "0"),
        statusNfInterno: r.status_nf_interno,
        dataPagamentoConfirmado: r.data_pagamento_confirmado,
        dataPrevisaoPagamento: r.data_previsao_pagamento,
      }));

      const hoje = new Date().toISOString().slice(0, 10);
      const resumo = calcularResumoNFsSemBoleto(nfs, input.mes, input.ano, hoje);
      return { ...resumo, error: null };
    }),

  // Altera o Status NF (manual). Registra auditoria e, se "pago", a data de pagamento confirmado.
  updateStatusNf: protectedProcedure
    .input(z.object({
      id: z.number(),
      novoStatus: z.enum(["em_aberto", "pago", "cancelado"]),
      dataPagamentoConfirmado: z.string().optional(), // "YYYY-MM-DD" — obrigatório apenas quando novoStatus = pago (default: hoje)
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDbInstance();
      if (!db) throw new Error("DB indisponível");

      const [rows] = await db.$client.execute(
        `SELECT status_nf_interno FROM notas_fiscais WHERE id = ?`, [input.id]
      ) as any;
      const atual = (rows as any[])?.[0];
      if (!atual) throw new Error("NF não encontrada");

      const statusAnterior = atual.status_nf_interno;
      const hoje = new Date().toISOString().slice(0, 10);
      const dataPagamento = input.novoStatus === "pago"
        ? (input.dataPagamentoConfirmado ?? hoje)
        : null;

      await db.$client.execute(
        `UPDATE notas_fiscais SET status_nf_interno = ?, data_pagamento_confirmado = ? WHERE id = ?`,
        [input.novoStatus, dataPagamento, input.id]
      );

      await db.$client.execute(
        `INSERT INTO notas_fiscais_status_log (nota_fiscal_id, campo, valor_anterior, valor_novo, usuario_id, usuario_nome, alterado_em)
         VALUES (?, 'status_nf_interno', ?, ?, ?, ?, NOW())`,
        [input.id, statusAnterior, input.novoStatus, ctx.user?.id ?? null, ctx.user?.name ?? "Desconhecido"]
      );

      return { success: true };
    }),

  // Edita o valor da NF manualmente (protegido de sobrescrita em sincronizações futuras)
  updateValorNF: protectedProcedure
    .input(z.object({ id: z.number(), valor: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDbInstance();
      if (!db) throw new Error("DB indisponível");
      await db.$client.execute(
        `UPDATE notas_fiscais SET valor_total = ?, valor_editado = 1 WHERE id = ?`,
        [input.valor, input.id]
      );
      return { success: true };
    }),

  // Histórico de alterações de uma NF (auditoria)
  historicoStatusNf: protectedProcedure
    .input(z.object({ notaFiscalId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDbInstance();
      if (!db) return { historico: [], error: "DB indisponível" };
      const [rows] = await db.$client.execute(
        `SELECT * FROM notas_fiscais_status_log WHERE nota_fiscal_id = ? ORDER BY alterado_em DESC`,
        [input.notaFiscalId]
      ) as any;
      return { historico: rows ?? [], error: null };
    }),

  syncNotasFiscais: protectedProcedure
    .input(z.object({ mes: z.number().min(1).max(12), ano: z.number().min(2020).max(2100) }))
    .mutation(async ({ input }) => {
      try {
        return { success: true, ...(await syncNotasFiscais(input.mes, input.ano)) };
      } catch (e: any) {
        return { success: false, synced: 0, errors: [e.message] };
      }
    }),
});
