// @ts-nocheck
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { purchaseRequestItems, quotationRequests, collaborators } from "../../drizzle/schema";
import { eq, sql } from "drizzle-orm";
import { cloudinaryUpload } from "../cloudinary";
import crypto from "crypto";
import { notifyFinanceiro, notifyUsers } from "./notifications";
import { notifyFinanceiroNewPurchaseRequestWhatsApp, notifyRequesterPurchaseCompletedWhatsApp } from "../utils/whatsappNotifications";

const statusEnum = z.enum(['pendente', 'lida', 'analisando', 'comprando', 'aprovada', 'comprada', 'recebida', 'cancelada', 'negada']);
const urgencyEnum = z.enum(['baixa', 'media', 'alta', 'critica']);

// Núcleo de criação de solicitação de compra — usado tanto pela procedure `create`
// (formulário no site) quanto pelo bot de WhatsApp (server/webhooks/whatsappPurchaseBot.ts),
// pra não duplicar o INSERT em dois lugares divergentes.
export async function createPurchaseRequestCore(
  db: Awaited<ReturnType<typeof getDb>>,
  params: {
    title: string;
    description?: string;
    linkUrl?: string;
    categoryId?: number;
    equipmentId?: number;
    urgency?: 'baixa' | 'media' | 'alta' | 'critica';
    notes?: string;
    items?: Array<{ name: string; quantity?: string; unit?: string; notes?: string; packageSize?: number; packageUnit?: string }>;
    userId: number;
    requesterName: string;
  }
) {
  const items = params.items || [];
  let result: any;
  try {
    [result] = await db.execute(sql`
      INSERT INTO purchase_requests (title, description, link, category_id, equipment_id, status, urgency, requested_at, requested_by, notes, created_at, updated_at)
      VALUES (${params.title}, ${params.description || null}, ${params.linkUrl || null}, ${params.categoryId || null}, ${params.equipmentId || null}, 'pending', ${URGENCY_TO_DB[params.urgency || 'media'] || 'medium'}, ${Date.now()}, ${params.userId}, ${params.notes || null}, NOW(), NOW())
    `) as any;
  } catch (err: any) {
    const cause = err?.cause?.message || err?.message || String(err);
    console.error('[createPurchaseRequestCore] ERRO:', cause);
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `Falha ao gravar: ${cause}` });
  }
  const requestId = (result as any).insertId;
  if (items.length > 0) {
    await db.insert(purchaseRequestItems).values(
      items.map(item => ({
        requestId,
        name: item.name,
        quantity: item.quantity || '1',
        // O texto da unidade já carrega o conteúdo ("un de 20 L") pra aparecer em orçamentos, WhatsApp e fichas.
        unit: item.packageSize && item.packageUnit
          ? `${item.unit || 'un'} de ${String(item.packageSize).replace('.', ',')} ${item.packageUnit}`
          : (item.unit || 'un'),
        notes: item.notes,
        confirmed: 0,
        packageSize: item.packageSize && item.packageUnit ? String(item.packageSize) : null,
        packageUnit: item.packageSize && item.packageUnit ? item.packageUnit : null,
      }))
    );
  }
  await notifyFinanceiro({
    type: 'geral',
    title: `Nova solicitação de compra: ${params.title}`,
    message: `${params.requesterName} solicitou "${params.title}"${items.length > 0 ? ` (${items.length} item(ns))` : ''}.`,
    relatedId: requestId,
    relatedType: 'purchase_request',
  }).catch((e: any) => console.error('[createPurchaseRequestCore] Falha ao notificar financeiro:', e?.message));
  await notifyFinanceiroNewPurchaseRequestWhatsApp(db, {
    requestId, title: params.title, requesterName: params.requesterName, items,
  });
  return { id: requestId, success: true };
}

// Máquina de estados simplificada: Pendente -> Em orçamento (nome de exibição do
// valor interno 'analisando') -> Comprada -> Recebida, com desvio pra Negada/Cancelada
// a qualquer momento. 'lida', 'aprovada' e 'comprando' saíram do fluxo ativo — ficam
// só como destino de registros antigos que já estejam neles (nenhum tinha em 16/09/2026).
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pendente: ['analisando', 'comprada', 'negada', 'cancelada'],
  analisando: ['comprada', 'negada', 'cancelada'],
  comprada: ['recebida'],
  recebida: [],
  negada: [],
  cancelada: [],
  lida: ['analisando', 'comprada', 'negada', 'cancelada'],
  aprovada: ['comprada', 'cancelada'],
  comprando: ['comprada', 'negada', 'cancelada'],
};

// Usado tanto pela procedure `applyQuotationDecision` (chamada direto na tela de
// Solicitação de Compra) quanto por `quotationRequests.confirmPurchaseDecision`
// (chamada na tela de Orçamento, quando o financeiro fecha a compra por lá) —
// única fonte de verdade de como uma decisão de orçamento atualiza a solicitação.
export async function applyPurchaseQuotationDecision(
  db: Awaited<ReturnType<typeof getDb>>,
  params: {
    purchaseRequestId: number; winningSupplierId: number; finalPrice: string; userId: number;
    // Detalhamento por fornecedor — a compra pode ter itens vindos de fornecedores
    // diferentes (cada um com o melhor preço do seu item), não só um fornecedor pra tudo.
    suppliersBreakdown: Array<{ supplierId: number; supplierName: string; subtotal: number }>;
    paymentMethod?: string | null;
    invoiceUrl?: string | null;
    receiptUrl?: string | null;
  }
) {
  const [rows] = await db.execute(sql`SELECT status, requested_by FROM purchase_requests WHERE id = ${params.purchaseRequestId} LIMIT 1`) as any;
  const pr = (rows as any[])[0];
  if (!pr) throw new TRPCError({ code: "NOT_FOUND", message: "Solicitação de compra não encontrada" });
  // O status cru do banco pode estar em inglês (registros antigos/`create`) — normaliza
  // pro formato do app antes de checar a máquina de estados.
  const currentStatus = STATUS_FROM_DB[pr.status] || pr.status;
  // Confirmar a compra (fornecedor + preço + quantidade já revisados) já É a compra
  // sendo efetivada — vai direto pra "Comprada" com a data de hoje, em vez de passar
  // por "Comprando" como um passo manual à parte. Só não mexe se já estiver num estado
  // final que não devia ser sobrescrito por uma decisão de orçamento.
  const terminalStates = ['negada', 'cancelada', 'recebida'];
  const nextStatus = terminalStates.includes(currentStatus) ? currentStatus : 'comprada';
  const nowMs = Date.now();
  await db.execute(sql`
    UPDATE purchase_requests
    SET winning_supplier_id = ${params.winningSupplierId}, final_price = ${params.finalPrice},
        suppliers_breakdown = ${JSON.stringify(params.suppliersBreakdown)},
        status = ${nextStatus}, purchased_at = COALESCE(purchased_at, ${nowMs}),
        payment_method = COALESCE(${params.paymentMethod ?? null}, payment_method),
        invoice_url = COALESCE(${params.invoiceUrl ?? null}, invoice_url),
        receipt_url = COALESCE(${params.receiptUrl ?? null}, receipt_url),
        responded_by = ${params.userId}, responded_at = NOW(), updated_at = NOW()
    WHERE id = ${params.purchaseRequestId}
  `);
  if (pr.requested_by) {
    await notifyUsers({
      recipientUserIds: [pr.requested_by],
      type: 'geral',
      title: `Compra decidida`,
      message: `A cotação da sua solicitação de compra foi decidida. Valor final: R$ ${params.finalPrice}.`,
      relatedId: params.purchaseRequestId,
      relatedType: 'purchase_request',
    }).catch(() => {});
  }
  // Só avisa por WhatsApp quando a compra está virando "comprada" agora — evita reenviar
  // o aviso toda vez que uma decisão de orçamento é reaplicada num pedido que já tinha sido comprado.
  if (nextStatus === 'comprada' && currentStatus !== 'comprada') {
    await notifyRequesterPurchaseCompletedWhatsApp(db, params.purchaseRequestId);
  }
  return { success: true, status: nextStatus };
}

// Mapeamentos entre o padrão do app (português) e o ENUM legado do banco (inglês)
const URGENCY_TO_DB: Record<string, string> = {
  baixa: 'low', media: 'medium', alta: 'high', critica: 'critical',
};
const STATUS_FROM_DB: Record<string, string> = {
  pending: 'pendente', read: 'lida', approved: 'aprovada', purchased: 'comprada',
  received: 'recebida', cancelled: 'cancelada', canceled: 'cancelada', negada: 'negada',
  pendente: 'pendente', lida: 'lida', aprovada: 'aprovada', comprada: 'comprada',
  recebida: 'recebida', cancelada: 'cancelada',
  analisando: 'analisando', comprando: 'comprando',
};
const URGENCY_FROM_DB: Record<string, string> = {
  low: 'baixa', medium: 'media', high: 'alta', critical: 'critica',
  baixa: 'baixa', media: 'media', alta: 'alta', critica: 'critica',
};

// O banco armazena datas como epoch ms (bigint) nas colunas *_at; converte para ISO
function epochToIso(v: any): string | null {
  if (v === null || v === undefined || v === '' || Number(v) === 0) return null;
  const n = Number(v);
  if (Number.isNaN(n)) return typeof v === 'string' ? v : null;
  return new Date(n).toISOString();
}

function normalizeRow(r: any) {
  return {
    ...r,
    status: STATUS_FROM_DB[r.status] || r.status,
    urgency: URGENCY_FROM_DB[r.urgency] || r.urgency,
    requestDate: epochToIso(r.requestDate),
    readDate: epochToIso(r.readDate),
    purchaseDate: epochToIso(r.purchaseDate),
    expectedArrival: epochToIso(r.expectedArrival),
    receivedDate: epochToIso(r.receivedDate),
    respondedAt: r.respondedAt ? (r.respondedAt instanceof Date ? r.respondedAt.toISOString() : String(r.respondedAt)) : null,
    suppliersBreakdown: (() => { try { return r.suppliersBreakdown ? JSON.parse(r.suppliersBreakdown) : null; } catch { return null; } })(),
  };
}

export const purchaseRequestsRouter = router({
  // Diagnóstico: mostra as colunas reais da tabela no banco (para troubleshooting). Só admin.
  schemaInfo: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const [cols] = await db.execute<any[]>(`SHOW COLUMNS FROM purchase_requests`);
    return (cols as any[]).map((c: any) => ({ field: c.Field, type: c.Type, null: c.Null, default: c.Default }));
  }),

  list: protectedProcedure
    .input(z.object({
      status: statusEnum.optional(),
      urgency: urgencyEnum.optional(),
      categoryId: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [rows] = await db.execute<any[]>(`
        SELECT
          pr.id, pr.title, pr.description, pr.images,
          pr.link AS linkUrl,
          pr.category_id AS categoryId,
          pc.name AS categoryName, pc.color AS categoryColor,
          pr.equipment_id AS equipmentId,
          eqp.name AS equipmentName, eqp.license_plate AS equipmentPlate,
          pr.status, pr.urgency,
          pr.requested_at AS requestDate,
          pr.read_at AS readDate,
          pr.purchased_at AS purchaseDate,
          pr.expected_arrival AS expectedArrival,
          pr.received_at AS receivedDate,
          pr.requested_by AS requestedBy,
          COALESCE((SELECT c.name FROM collaborators c WHERE c.user_id = pr.requested_by ORDER BY c.id LIMIT 1), req_user.name) AS requestedByName,
          pr.responded_by AS respondedBy,
          COALESCE((SELECT c.name FROM collaborators c WHERE c.user_id = pr.responded_by ORDER BY c.id LIMIT 1), resp_user.name) AS respondedByName,
          pr.responded_at AS respondedAt,
          pr.response_notes AS responseNotes,
          pr.denial_reason AS denialReason,
          pr.quotation_request_id AS quotationRequestId,
          pr.winning_supplier_id AS winningSupplierId,
          sup.company_name AS winningSupplierName,
          pr.final_price AS finalPrice,
          pr.suppliers_breakdown AS suppliersBreakdown,
          pr.payment_method AS paymentMethod,
          pr.invoice_url AS invoiceUrl,
          pr.receipt_url AS receiptUrl,
          pr.notes,
          pr.created_at AS createdAt,
          pr.updated_at AS updatedAt
        FROM purchase_requests pr
        LEFT JOIN purchase_categories pc ON pr.category_id = pc.id
        LEFT JOIN equipment eqp ON pr.equipment_id = eqp.id
        LEFT JOIN users req_user ON pr.requested_by = req_user.id
        LEFT JOIN users resp_user ON pr.responded_by = resp_user.id
        LEFT JOIN suppliers sup ON pr.winning_supplier_id = sup.id
        ORDER BY
          FIELD(pr.status, 'pending','pendente','read','lida','approved','aprovada','purchased','comprada','received','recebida','negada','cancelled','canceled','cancelada'),
          FIELD(pr.urgency, 'critical','critica','high','alta','medium','media','low','baixa'),
          pr.created_at DESC
      `);
      let filtered = (rows as unknown as any[]).map(normalizeRow);
      if (input?.status) filtered = filtered.filter((r: any) => r.status === input.status);
      if (input?.urgency) filtered = filtered.filter((r: any) => r.urgency === input.urgency);
      if (input?.categoryId) filtered = filtered.filter((r: any) => r.categoryId === input.categoryId);
      // Anexa itens de cada solicitação para exibição na planilha
      const allItems = await db.select().from(purchaseRequestItems);
      const byReq: Record<number, any[]> = {};
      for (const it of allItems as any[]) {
        if (!byReq[it.requestId]) byReq[it.requestId] = [];
        byReq[it.requestId].push(it);
      }
      for (const r of filtered) {
        (r as any).items = byReq[r.id] || [];
      }
      return filtered;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [rows] = await db.execute(sql`
        SELECT
          pr.id, pr.title, pr.description, pr.images,
          pr.link AS linkUrl,
          pr.category_id AS categoryId,
          pc.name AS categoryName, pc.color AS categoryColor,
          pr.equipment_id AS equipmentId,
          eqp.name AS equipmentName, eqp.license_plate AS equipmentPlate,
          pr.status, pr.urgency,
          pr.requested_at AS requestDate,
          pr.read_at AS readDate,
          pr.purchased_at AS purchaseDate,
          pr.expected_arrival AS expectedArrival,
          pr.received_at AS receivedDate,
          pr.requested_by AS requestedBy,
          COALESCE((SELECT c.name FROM collaborators c WHERE c.user_id = pr.requested_by ORDER BY c.id LIMIT 1), req_user.name) AS requestedByName,
          pr.responded_by AS respondedBy,
          COALESCE((SELECT c.name FROM collaborators c WHERE c.user_id = pr.responded_by ORDER BY c.id LIMIT 1), resp_user.name) AS respondedByName,
          pr.responded_at AS respondedAt,
          pr.response_notes AS responseNotes,
          pr.denial_reason AS denialReason,
          pr.quotation_request_id AS quotationRequestId,
          pr.winning_supplier_id AS winningSupplierId,
          sup.company_name AS winningSupplierName,
          pr.final_price AS finalPrice,
          pr.suppliers_breakdown AS suppliersBreakdown,
          pr.payment_method AS paymentMethod,
          pr.invoice_url AS invoiceUrl,
          pr.receipt_url AS receiptUrl,
          pr.notes,
          pr.created_at AS createdAt,
          pr.updated_at AS updatedAt
        FROM purchase_requests pr
        LEFT JOIN purchase_categories pc ON pr.category_id = pc.id
        LEFT JOIN equipment eqp ON pr.equipment_id = eqp.id
        LEFT JOIN users req_user ON pr.requested_by = req_user.id
        LEFT JOIN users resp_user ON pr.responded_by = resp_user.id
        LEFT JOIN suppliers sup ON pr.winning_supplier_id = sup.id
        WHERE pr.id = ${input.id}
        LIMIT 1
      `) as any;
      const row = (rows as any[])[0];
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Solicitação não encontrada" });
      const normalized = normalizeRow(row);
      const items = await db.select().from(purchaseRequestItems).where(eq(purchaseRequestItems.requestId, input.id));
      return { ...normalized, items };
    }),

  create: protectedProcedure
    .input(z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      linkUrl: z.string().optional(),
      categoryId: z.number().optional(),
      equipmentId: z.number().optional(),
      urgency: urgencyEnum.optional().default('media'),
      notes: z.string().optional(),
      items: z.array(z.object({
        name: z.string().min(1),
        quantity: z.string().optional().default('1'),
        unit: z.string().optional().default('un'),
        notes: z.string().optional(),
        packageSize: z.number().positive().optional(),
        packageUnit: z.enum(['L', 'kg', 'm']).optional(),
      })).optional().default([]),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return createPurchaseRequestCore(db, { ...input, userId: ctx.user.id, requesterName: ctx.user.name });
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().optional(),
      description: z.string().optional(),
      linkUrl: z.string().optional(),
      categoryId: z.number().optional(),
      equipmentId: z.number().optional(),
      urgency: urgencyEnum.optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const sets: any[] = [];
      if (input.title !== undefined) sets.push(sql`title = ${input.title}`);
      if (input.description !== undefined) sets.push(sql`description = ${input.description}`);
      if (input.linkUrl !== undefined) sets.push(sql`link = ${input.linkUrl}`);
      if (input.categoryId !== undefined) sets.push(sql`category_id = ${input.categoryId}`);
      if (input.equipmentId !== undefined) sets.push(sql`equipment_id = ${input.equipmentId}`);
      if (input.urgency !== undefined) sets.push(sql`urgency = ${URGENCY_TO_DB[input.urgency] || 'medium'}`);
      if (input.notes !== undefined) sets.push(sql`notes = ${input.notes}`);
      if (sets.length === 0) return { success: true };
      sets.push(sql`updated_at = NOW()`);
      const setSql = sql.join(sets, sql`, `);
      await db.execute(sql`UPDATE purchase_requests SET ${setSql} WHERE id = ${input.id}`);
      return { success: true };
    }),

  // Atualizar status diretamente (para a grade de edição)
  updateStatus: protectedProcedure
    .input(z.object({ id: z.number(), status: statusEnum }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [curRows] = await db.execute(sql`SELECT status, requested_by FROM purchase_requests WHERE id = ${input.id} LIMIT 1`) as any;
      const current = (curRows as any[])[0];
      if (!current) throw new TRPCError({ code: "NOT_FOUND" });
      // Idem: normaliza o status cru do banco (pode estar em inglês) antes de validar a transição.
      const currentStatusNorm = STATUS_FROM_DB[current.status] || current.status;
      if (currentStatusNorm !== input.status && !ALLOWED_TRANSITIONS[currentStatusNorm]?.includes(input.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Não é possível mudar de "${currentStatusNorm}" para "${input.status}"` });
      }
      const nowMs = Date.now();
      // Sincroniza colunas de data conforme o status
      if (input.status === 'lida') {
        await db.execute(sql`UPDATE purchase_requests SET status = 'lida', read_at = COALESCE(read_at, ${nowMs}), responded_by = ${ctx.user.id}, responded_at = NOW(), updated_at = NOW() WHERE id = ${input.id}`);
      } else if (input.status === 'comprada') {
        await db.execute(sql`UPDATE purchase_requests SET status = 'comprada', purchased_at = COALESCE(purchased_at, ${nowMs}), responded_by = ${ctx.user.id}, responded_at = NOW(), updated_at = NOW() WHERE id = ${input.id}`);
      } else if (input.status === 'recebida') {
        await db.execute(sql`UPDATE purchase_requests SET status = 'recebida', received_at = COALESCE(received_at, ${nowMs}), updated_at = NOW() WHERE id = ${input.id}`);
      } else if (input.status === 'negada') {
        await db.execute(sql`UPDATE purchase_requests SET status = 'negada', responded_by = ${ctx.user.id}, responded_at = NOW(), updated_at = NOW() WHERE id = ${input.id}`);
      } else {
        await db.execute(sql`UPDATE purchase_requests SET status = ${input.status}, updated_at = NOW() WHERE id = ${input.id}`);
      }
      if (current.requested_by && ['negada', 'comprada', 'recebida'].includes(input.status)) {
        const labels: Record<string, string> = { negada: 'negada', comprada: 'comprada', recebida: 'recebida' };
        await notifyUsers({
          recipientUserIds: [current.requested_by],
          type: 'geral',
          title: `Solicitação de compra ${labels[input.status]}`,
          relatedId: input.id,
          relatedType: 'purchase_request',
        }).catch((e: any) => console.error('[purchaseRequests.updateStatus] Falha ao notificar solicitante:', e?.message));
      }
      if (input.status === 'comprada' && currentStatusNorm !== 'comprada') {
        await notifyRequesterPurchaseCompletedWhatsApp(db, input.id);
      }
      return { success: true };
    }),

  // Atualizar datas da compra/entrega (edição direta na grade)
  updateDates: protectedProcedure
    .input(z.object({
      id: z.number(),
      purchaseDate: z.string().optional().nullable(),   // 'YYYY-MM-DD' ou null
      expectedArrival: z.string().optional().nullable(), // 'YYYY-MM-DD' ou null
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const toMs = (d?: string | null) => d ? new Date(d + 'T12:00:00').getTime() : null;
      await db.execute(sql`UPDATE purchase_requests SET purchased_at = ${toMs(input.purchaseDate)}, expected_arrival = ${toMs(input.expectedArrival)}, updated_at = NOW() WHERE id = ${input.id}`);
      return { success: true };
    }),

  // Responsável responde a solicitação (parecer) — também marca como lida
  respond: protectedProcedure
    .input(z.object({
      id: z.number(),
      responseNotes: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // 'lida' saiu do fluxo ativo de status — Responder só registra o parecer,
      // sem mais empurrar o status pra frente sozinho.
      await db.execute(sql`UPDATE purchase_requests
         SET response_notes = ${input.responseNotes}, responded_by = ${ctx.user.id}, responded_at = NOW(),
             read_at = COALESCE(read_at, ${Date.now()}),
             updated_at = NOW()
         WHERE id = ${input.id}`);
      return { success: true };
    }),

  // Negar solicitação com motivo
  deny: protectedProcedure
    .input(z.object({
      id: z.number(),
      denialReason: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.execute(sql`UPDATE purchase_requests SET status = 'negada', denial_reason = ${input.denialReason}, responded_by = ${ctx.user.id}, responded_at = NOW(), updated_at = NOW() WHERE id = ${input.id}`);
      return { success: true };
    }),

  toggleItemConfirm: protectedProcedure
    .input(z.object({ itemId: z.number(), confirmed: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Item já lançado no estoque não pode ser desmarcado aqui — deixaria o saldo dessincronizado
      // da confirmação. Correção é feita no módulo de Estoque (ajuste).
      const [chk] = await db.execute(sql`SELECT received_quantity FROM purchase_request_items WHERE id = ${input.itemId} LIMIT 1`) as any;
      if (Number((chk as any[])[0]?.received_quantity || 0) > 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Este item já foi lançado no estoque. Correções são feitas no módulo de Estoque (ajuste)." });
      }
      await db.execute(sql`UPDATE purchase_request_items SET confirmed = ${input.confirmed ? 1 : 0} WHERE id = ${input.itemId}`);
      return { success: true };
    }),

  uploadImage: protectedProcedure
    .input(z.object({
      id: z.number(),
      imageBase64: z.string(),
      mimeType: z.string().default('image/jpeg'),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const dataUri = `data:${input.mimeType};base64,${input.imageBase64}`;
      const { url } = await cloudinaryUpload(dataUri, `btree/purchase-requests/${input.id}`, `foto-${Date.now()}.jpg`);
      const [rows] = await db.execute(sql`SELECT images FROM purchase_requests WHERE id = ${input.id}`) as any;
      const current = (rows as any[])[0]?.images;
      let images: string[] = [];
      try { images = current ? JSON.parse(current) : []; } catch { images = []; }
      images.push(url);
      await db.execute(sql`UPDATE purchase_requests SET images = ${JSON.stringify(images)}, updated_at = NOW() WHERE id = ${input.id}`);
      return { url, success: true };
    }),

  removeImage: protectedProcedure
    .input(z.object({ id: z.number(), imageUrl: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [rows] = await db.execute(sql`SELECT images FROM purchase_requests WHERE id = ${input.id}`) as any;
      const current = (rows as any[])[0]?.images;
      let images: string[] = [];
      try { images = current ? JSON.parse(current) : []; } catch { images = []; }
      images = images.filter(u => u !== input.imageUrl);
      await db.execute(sql`UPDATE purchase_requests SET images = ${JSON.stringify(images)}, updated_at = NOW() WHERE id = ${input.id}`);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.execute(sql`DELETE FROM purchase_request_items WHERE request_id = ${input.id}`);
      await db.execute(sql`DELETE FROM purchase_requests WHERE id = ${input.id}`);
      return { success: true };
    }),

  // Dispara um Orçamento a partir desta solicitação, reaproveitando os itens já
  // cadastrados — fecha o ciclo Compra -> Orçamento.
  requestQuotation: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [rows] = await db.execute(sql`SELECT title, requested_by, quotation_request_id, status FROM purchase_requests WHERE id = ${input.id} LIMIT 1`) as any;
      const pr = (rows as any[])[0];
      if (!pr) throw new TRPCError({ code: "NOT_FOUND", message: "Solicitação não encontrada" });
      if (pr.quotation_request_id) throw new TRPCError({ code: "BAD_REQUEST", message: "Esta solicitação já tem um orçamento vinculado" });

      const items = await db.select().from(purchaseRequestItems).where(eq(purchaseRequestItems.requestId, input.id));
      if (items.length === 0) throw new TRPCError({ code: "BAD_REQUEST", message: "Adicione ao menos um item antes de solicitar orçamento" });

      // Prioriza o nome do colaborador vinculado à conta (é o nome "de verdade" da
      // pessoa) — o nome da conta de login (users.name) às vezes é só o usuário/e-mail,
      // então só cai nele se não houver colaborador vinculado.
      let requesterName: string | null = null;
      let requesterId: number | undefined;
      if (pr.requested_by) {
        const [collab] = await db.select({ id: collaborators.id, name: collaborators.name })
          .from(collaborators).where(eq(collaborators.userId, pr.requested_by)).limit(1);
        if (collab) {
          requesterName = collab.name;
          requesterId = collab.id;
        } else {
          const [userRows] = await db.execute(sql`SELECT name FROM users WHERE id = ${pr.requested_by} LIMIT 1`) as any;
          requesterName = (userRows as any[])[0]?.name || null;
        }
      }

      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
      const [insertResult] = await db.insert(quotationRequests).values({
        title: pr.title,
        requesterId,
        requesterName,
        itemsJson: JSON.stringify(items.map((it: any) => ({ name: it.name, quantity: it.quantity, unit: it.unit || 'un' }))),
        token,
        expiresAt,
        status: "ativa",
        createdBy: ctx.user.id,
      });
      const quotationRequestId = (insertResult as any).insertId;

      const prStatusNorm = STATUS_FROM_DB[pr.status] || pr.status;
      const nextStatus = ALLOWED_TRANSITIONS[prStatusNorm]?.includes('analisando') ? 'analisando' : prStatusNorm;
      await db.execute(sql`UPDATE purchase_requests SET quotation_request_id = ${quotationRequestId}, status = ${nextStatus}, updated_at = NOW() WHERE id = ${input.id}`);

      return { quotationRequestId, token };
    }),

  // Grava a decisão de compra (fornecedor vencedor + preço por item) direto pela tela
  // da Solicitação de Compra — usado pra "Compra Direta" (site/loja, sem orçamento).
  applyQuotationDecision: protectedProcedure
    .input(z.object({
      id: z.number(),
      winningSupplierId: z.number(),
      items: z.array(z.object({ itemId: z.number(), price: z.string() })).min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [supRows] = await db.execute(sql`SELECT company_name FROM suppliers WHERE id = ${input.winningSupplierId} LIMIT 1`) as any;
      const supplierName = (supRows as any[])[0]?.company_name || '';

      const [prRows] = await db.execute(sql`SELECT category_id FROM purchase_requests WHERE id = ${input.id} LIMIT 1`) as any;
      const categoryId = (prRows as any[])[0]?.category_id;
      const purchaseItems = await db.select().from(purchaseRequestItems).where(eq(purchaseRequestItems.requestId, input.id));

      let finalPriceNum = 0;
      for (const it of input.items) {
        const price = parseFloat(it.price.replace(',', '.')) || 0;
        finalPriceNum += price;
        // Registra no catálogo de preços do fornecedor (histórico), se a solicitação
        // tiver categoria definida — best-effort, não bloqueia o registro da compra.
        if (categoryId) {
          const item = purchaseItems.find((p: any) => p.id === it.itemId);
          if (item) {
            const qty = parseFloat(item.quantity) || 1;
            const unitPrice = qty > 0 ? price / qty : price;
            await db.execute(sql`
              INSERT INTO quotations (supplier_id, category_id, product_name, unit, quantity, unit_price, total_price, currency, quoted_at, purchase_request_id, created_by, created_at)
              VALUES (${input.winningSupplierId}, ${categoryId}, ${item.name}, ${item.unit || 'un'}, ${item.quantity}, ${unitPrice.toFixed(2)}, ${price.toFixed(2)}, 'BRL', ${Date.now()}, ${input.id}, ${ctx.user.id}, NOW())
            `);
          }
        }
      }

      const finalPrice = finalPriceNum.toFixed(2);
      return applyPurchaseQuotationDecision(db, {
        purchaseRequestId: input.id,
        winningSupplierId: input.winningSupplierId,
        finalPrice,
        suppliersBreakdown: [{ supplierId: input.winningSupplierId, supplierName, subtotal: finalPriceNum }],
        userId: ctx.user.id,
      });
    }),
});
