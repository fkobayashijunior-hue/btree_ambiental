// @ts-nocheck
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { purchaseRequestItems } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { storagePut } from "../storage";

const statusEnum = z.enum(['pendente', 'lida', 'aprovada', 'comprada', 'recebida', 'cancelada', 'negada']);
const urgencyEnum = z.enum(['baixa', 'media', 'alta', 'critica']);

// Mapeamentos entre o padrão do app (português) e o ENUM legado do banco (inglês)
const URGENCY_TO_DB: Record<string, string> = {
  baixa: 'low', media: 'medium', alta: 'high', critica: 'critical',
};
const STATUS_FROM_DB: Record<string, string> = {
  pending: 'pendente', read: 'lida', approved: 'aprovada', purchased: 'comprada',
  received: 'recebida', cancelled: 'cancelada', canceled: 'cancelada', negada: 'negada',
  pendente: 'pendente', lida: 'lida', aprovada: 'aprovada', comprada: 'comprada',
  recebida: 'recebida', cancelada: 'cancelada',
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
  };
}

export const purchaseRequestsRouter = router({
  // Diagnóstico: mostra as colunas reais da tabela no banco (para troubleshooting)
  schemaInfo: protectedProcedure.query(async () => {
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
          req_user.name AS requestedByName,
          pr.responded_by AS respondedBy,
          resp_user.name AS respondedByName,
          pr.responded_at AS respondedAt,
          pr.response_notes AS responseNotes,
          pr.denial_reason AS denialReason,
          pr.notes,
          pr.created_at AS createdAt,
          pr.updated_at AS updatedAt
        FROM purchase_requests pr
        LEFT JOIN purchase_categories pc ON pr.category_id = pc.id
        LEFT JOIN equipment eqp ON pr.equipment_id = eqp.id
        LEFT JOIN users req_user ON pr.requested_by = req_user.id
        LEFT JOIN users resp_user ON pr.responded_by = resp_user.id
        ORDER BY
          FIELD(pr.status, 'pending','pendente','read','lida','approved','aprovada','purchased','comprada','received','recebida','negada','cancelled','canceled','cancelada'),
          FIELD(pr.urgency, 'critical','critica','high','alta','medium','media','low','baixa'),
          pr.created_at DESC
      `);
      let filtered = (rows as unknown as any[]).map(normalizeRow);
      if (input?.status) filtered = filtered.filter((r: any) => r.status === input.status);
      if (input?.urgency) filtered = filtered.filter((r: any) => r.urgency === input.urgency);
      if (input?.categoryId) filtered = filtered.filter((r: any) => r.categoryId === input.categoryId);
      return filtered;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
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
          req_user.name AS requestedByName,
          pr.responded_by AS respondedBy,
          resp_user.name AS respondedByName,
          pr.responded_at AS respondedAt,
          pr.response_notes AS responseNotes,
          pr.denial_reason AS denialReason,
          pr.notes,
          pr.created_at AS createdAt,
          pr.updated_at AS updatedAt
        FROM purchase_requests pr
        LEFT JOIN purchase_categories pc ON pr.category_id = pc.id
        LEFT JOIN equipment eqp ON pr.equipment_id = eqp.id
        LEFT JOIN users req_user ON pr.requested_by = req_user.id
        LEFT JOIN users resp_user ON pr.responded_by = resp_user.id
        WHERE pr.id = ?
        LIMIT 1
      `, [input.id]);
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
      })).optional().default([]),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // INSERT direto no formato legado do banco (requested_at epoch ms, coluna link, ENUM inglês)
      let result: any;
      try {
        [result] = await db.execute<any>(
          `INSERT INTO purchase_requests (title, description, link, category_id, equipment_id, status, urgency, requested_at, requested_by, notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, NOW(), NOW())`,
          [
            input.title,
            input.description || null,
            input.linkUrl || null,
            input.categoryId || null,
            input.equipmentId || null,
            URGENCY_TO_DB[input.urgency || 'media'] || 'medium',
            Date.now(),
            ctx.user.id,
            input.notes || null,
          ]
        );
      } catch (err: any) {
        const cause = err?.cause?.message || err?.message || String(err);
        console.error('[purchaseRequests.create] ERRO:', cause);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `Falha ao gravar: ${cause}` });
      }
      const requestId = (result as any).insertId;
      if (input.items.length > 0) {
        await db.insert(purchaseRequestItems).values(
          input.items.map(item => ({
            requestId,
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            notes: item.notes,
            confirmed: 0,
          }))
        );
      }
      return { id: requestId, success: true };
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
      const sets: string[] = [];
      const params: any[] = [];
      if (input.title !== undefined) { sets.push('title = ?'); params.push(input.title); }
      if (input.description !== undefined) { sets.push('description = ?'); params.push(input.description); }
      if (input.linkUrl !== undefined) { sets.push('link = ?'); params.push(input.linkUrl); }
      if (input.categoryId !== undefined) { sets.push('category_id = ?'); params.push(input.categoryId); }
      if (input.equipmentId !== undefined) { sets.push('equipment_id = ?'); params.push(input.equipmentId); }
      if (input.urgency !== undefined) { sets.push('urgency = ?'); params.push(URGENCY_TO_DB[input.urgency] || 'medium'); }
      if (input.notes !== undefined) { sets.push('notes = ?'); params.push(input.notes); }
      if (sets.length === 0) return { success: true };
      sets.push('updated_at = NOW()');
      params.push(input.id);
      await db.execute<any>(`UPDATE purchase_requests SET ${sets.join(', ')} WHERE id = ?`, params);
      return { success: true };
    }),

  markRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.execute<any>(
        `UPDATE purchase_requests SET read_at = ?, status = 'lida', responded_by = ?, responded_at = NOW(), updated_at = NOW() WHERE id = ?`,
        [Date.now(), ctx.user.id, input.id]
      );
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
      await db.execute<any>(
        `UPDATE purchase_requests
         SET response_notes = ?, responded_by = ?, responded_at = NOW(),
             read_at = COALESCE(read_at, ?),
             status = CASE WHEN status IN ('pendente','pending') THEN 'lida' ELSE status END,
             updated_at = NOW()
         WHERE id = ?`,
        [input.responseNotes, ctx.user.id, Date.now(), input.id]
      );
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
      await db.execute<any>(
        `UPDATE purchase_requests SET status = 'negada', denial_reason = ?, responded_by = ?, responded_at = NOW(), updated_at = NOW() WHERE id = ?`,
        [input.denialReason, ctx.user.id, input.id]
      );
      return { success: true };
    }),

  markPurchased: protectedProcedure
    .input(z.object({
      id: z.number(),
      purchaseDate: z.string().optional(),
      expectedArrival: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const purchaseMs = input.purchaseDate ? new Date(input.purchaseDate.replace(' ', 'T')).getTime() : Date.now();
      const arrivalMs = input.expectedArrival ? new Date(input.expectedArrival.replace(' ', 'T')).getTime() : null;
      await db.execute<any>(
        `UPDATE purchase_requests SET purchased_at = ?, expected_arrival = ?, status = 'comprada', responded_by = ?, responded_at = NOW(), updated_at = NOW() WHERE id = ?`,
        [purchaseMs, arrivalMs, ctx.user.id, input.id]
      );
      return { success: true };
    }),

  markReceived: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.execute<any>(
        `UPDATE purchase_requests SET received_at = ?, status = 'recebida', updated_at = NOW() WHERE id = ?`,
        [Date.now(), input.id]
      );
      return { success: true };
    }),

  confirmItems: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.execute<any>(`UPDATE purchase_request_items SET confirmed = 1 WHERE request_id = ?`, [input.id]);
      return { success: true };
    }),

  toggleItemConfirm: protectedProcedure
    .input(z.object({ itemId: z.number(), confirmed: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.execute<any>(`UPDATE purchase_request_items SET confirmed = ? WHERE id = ?`, [input.confirmed ? 1 : 0, input.itemId]);
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
      const buffer = Buffer.from(input.imageBase64, 'base64');
      const ext = input.mimeType.split('/')[1] || 'jpg';
      const key = `purchase-requests/${input.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { url } = await storagePut(key, buffer, input.mimeType);
      const [rows] = await db.execute<any[]>(`SELECT images FROM purchase_requests WHERE id = ?`, [input.id]);
      const current = (rows as any[])[0]?.images;
      let images: string[] = [];
      try { images = current ? JSON.parse(current) : []; } catch { images = []; }
      images.push(url);
      await db.execute<any>(`UPDATE purchase_requests SET images = ?, updated_at = NOW() WHERE id = ?`, [JSON.stringify(images), input.id]);
      return { url, success: true };
    }),

  removeImage: protectedProcedure
    .input(z.object({ id: z.number(), imageUrl: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [rows] = await db.execute<any[]>(`SELECT images FROM purchase_requests WHERE id = ?`, [input.id]);
      const current = (rows as any[])[0]?.images;
      let images: string[] = [];
      try { images = current ? JSON.parse(current) : []; } catch { images = []; }
      images = images.filter(u => u !== input.imageUrl);
      await db.execute<any>(`UPDATE purchase_requests SET images = ?, updated_at = NOW() WHERE id = ?`, [JSON.stringify(images), input.id]);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.execute<any>(`DELETE FROM purchase_request_items WHERE request_id = ?`, [input.id]);
      await db.execute<any>(`DELETE FROM purchase_requests WHERE id = ?`, [input.id]);
      return { success: true };
    }),
});
