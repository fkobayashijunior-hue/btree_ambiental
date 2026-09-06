// @ts-nocheck
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { purchaseRequests, purchaseRequestItems, purchaseCategories, users, equipment } from "../../drizzle/schema";
import { eq, desc, and, inArray } from "drizzle-orm";
import { storagePut } from "../storage";

const statusEnum = z.enum(['pendente', 'lida', 'aprovada', 'comprada', 'recebida', 'cancelada', 'negada']);
const urgencyEnum = z.enum(['baixa', 'media', 'alta', 'critica']);

export const purchaseRequestsRouter = router({
  list: protectedProcedure
    .input(z.object({
      status: statusEnum.optional(),
      urgency: urgencyEnum.optional(),
      categoryId: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Usa SQL raw para compatibilidade com schema legado da Hostinger
      // (colunas requested_at/link em vez de request_date/link_url, ENUMs em inglês)
      const [rows] = await db.execute<any[]>(`
        SELECT
          pr.id, pr.title, pr.description, pr.images,
          COALESCE(pr.link_url, pr.link) AS linkUrl,
          pr.category_id AS categoryId,
          pc.name AS categoryName, pc.color AS categoryColor,
          pr.equipment_id AS equipmentId,
          eqp.name AS equipmentName, eqp.license_plate AS equipmentPlate,
          pr.status, pr.urgency,
          COALESCE(pr.request_date, FROM_UNIXTIME(pr.requested_at / 1000)) AS requestDate,
          pr.read_date AS readDate,
          pr.purchase_date AS purchaseDate,
          pr.expected_arrival AS expectedArrival,
          pr.received_date AS receivedDate,
          pr.items_confirmed_date AS itemsConfirmedDate,
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
          FIELD(pr.status, 'pendente','lida','aprovada','comprada','recebida','negada','cancelada'),
          FIELD(pr.urgency, 'critica','alta','media','baixa'),
          pr.created_at DESC
      `);

      console.log('[purchaseRequests.list] rows retornados:', (rows as unknown as any[]).length);

      // Mapeamento de valores legados (inglês) para o padrão atual (português)
      const statusMap: Record<string, string> = {
        pending: 'pendente', read: 'lida', approved: 'aprovada',
        purchased: 'comprada', received: 'recebida', cancelled: 'cancelada', canceled: 'cancelada',
        pendente: 'pendente', lida: 'lida', aprovada: 'aprovada',
        comprada: 'comprada', recebida: 'recebida', cancelada: 'cancelada',
      };
      const urgencyMap: Record<string, string> = {
        low: 'baixa', medium: 'media', high: 'alta', critical: 'critica',
        baixa: 'baixa', media: 'media', alta: 'alta', critica: 'critica',
      };
      const normalized = (rows as unknown as any[]).map((r: any) => ({
        ...r,
        status: statusMap[r.status] || r.status,
        urgency: urgencyMap[r.urgency] || r.urgency,
      }));

      // Filter in JS
      let filtered = normalized;
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
      const [req] = await db.select({
        id: purchaseRequests.id,
        title: purchaseRequests.title,
        description: purchaseRequests.description,
        images: purchaseRequests.images,
        linkUrl: purchaseRequests.linkUrl,
        categoryId: purchaseRequests.categoryId,
        categoryName: purchaseCategories.name,
        categoryColor: purchaseCategories.color,
        status: purchaseRequests.status,
        urgency: purchaseRequests.urgency,
        requestDate: purchaseRequests.requestDate,
        readDate: purchaseRequests.readDate,
        purchaseDate: purchaseRequests.purchaseDate,
        expectedArrival: purchaseRequests.expectedArrival,
        receivedDate: purchaseRequests.receivedDate,
        itemsConfirmedDate: purchaseRequests.itemsConfirmedDate,
        requestedBy: purchaseRequests.requestedBy,
        approvedBy: purchaseRequests.approvedBy,
        notes: purchaseRequests.notes,
        createdAt: purchaseRequests.createdAt,
        updatedAt: purchaseRequests.updatedAt,
      })
        .from(purchaseRequests)
        .leftJoin(purchaseCategories, eq(purchaseRequests.categoryId, purchaseCategories.id))
        .where(eq(purchaseRequests.id, input.id));

      if (!req) throw new TRPCError({ code: "NOT_FOUND" });

      const items = await db.select().from(purchaseRequestItems)
        .where(eq(purchaseRequestItems.requestId, input.id))
        .orderBy(purchaseRequestItems.id);

      return { ...req, items };
    }),

  create: protectedProcedure
    .input(z.object({
      title: z.string().min(1).max(255),
      description: z.string().optional(),
      linkUrl: z.string().optional(),
      categoryId: z.number().optional(),
      equipmentId: z.number().optional(),
      urgency: urgencyEnum.optional().default('media'),
      notes: z.string().optional(),
      items: z.array(z.object({
        name: z.string().min(1),
        quantity: z.string(),
        unit: z.string().optional(),
        notes: z.string().optional(),
      })).optional().default([]),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      let requestId: number;
      try {
        const [result] = await db.insert(purchaseRequests).values({
          title: input.title,
          description: input.description,
          linkUrl: input.linkUrl,
          categoryId: input.categoryId,
          equipmentId: input.equipmentId || null,
          urgency: input.urgency,
          status: 'pendente',
          requestDate: now,
          requestedBy: ctx.user.id,
          notes: input.notes,
        });
        requestId = (result as any).insertId;
      } catch (err: any) {
        // Fallback para schema legado da Hostinger (requested_at epoch ms, coluna link, ENUM inglês)
        console.warn('[purchaseRequests.create] insert Drizzle falhou, tentando SQL legado:', err?.message);
        const legacyUrgency: Record<string, string> = { baixa: 'low', media: 'medium', alta: 'high', critica: 'critical' };
        const [rows] = await db.execute<any>(
          `INSERT INTO purchase_requests (title, description, link, category_id, equipment_id, status, urgency, requested_at, requested_by, notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, NOW(), NOW())`,
          [
            input.title,
            input.description || null,
            input.linkUrl || null,
            input.categoryId || null,
            input.equipmentId || null,
            legacyUrgency[input.urgency || 'media'] || 'medium',
            Date.now(),
            ctx.user.id,
            input.notes || null,
          ]
        );
        requestId = (rows as any).insertId;
      }

      if (input.items.length > 0) {
        await db.insert(purchaseRequestItems).values(
          input.items.map(item => ({
            requestId,
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            notes: item.notes,
          }))
        );
      }

      return { id: requestId };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().optional(),
      description: z.string().optional(),
      linkUrl: z.string().optional(),
      categoryId: z.number().optional(),
      urgency: urgencyEnum.optional(),
      notes: z.string().optional(),
      expectedArrival: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...data } = input;
      await db.update(purchaseRequests).set(data).where(eq(purchaseRequests.id, id));
      return { success: true };
    }),

  // Mark as read by responsible
  markRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      await db.update(purchaseRequests)
        .set({ readDate: now, status: 'lida', respondedBy: ctx.user.id, respondedAt: now })
        .where(eq(purchaseRequests.id, input.id));
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
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const [cur] = await db.select({ status: purchaseRequests.status, readDate: purchaseRequests.readDate })
        .from(purchaseRequests).where(eq(purchaseRequests.id, input.id)).limit(1);
      await db.update(purchaseRequests)
        .set({
          responseNotes: input.responseNotes,
          respondedBy: ctx.user.id,
          respondedAt: now,
          ...(cur?.readDate ? {} : { readDate: now }),
          ...(cur?.status === 'pendente' ? { status: 'lida' as const } : {}),
        })
        .where(eq(purchaseRequests.id, input.id));
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
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      await db.update(purchaseRequests)
        .set({
          status: 'negada',
          denialReason: input.denialReason,
          respondedBy: ctx.user.id,
          respondedAt: now,
        })
        .where(eq(purchaseRequests.id, input.id));
      return { success: true };
    }),

  // Mark as purchased
  markPurchased: protectedProcedure
    .input(z.object({
      id: z.number(),
      purchaseDate: z.string().optional(),
      expectedArrival: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      await db.update(purchaseRequests)
        .set({
          purchaseDate: input.purchaseDate || now,
          expectedArrival: input.expectedArrival,
          status: 'comprada',
          respondedBy: ctx.user.id,
          respondedAt: now,
        })
        .where(eq(purchaseRequests.id, input.id));
      return { success: true };
    }),

  // Mark as received
  markReceived: protectedProcedure
    .input(z.object({ id: z.number(), receivedDate: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      await db.update(purchaseRequests)
        .set({ receivedDate: input.receivedDate || now, status: 'recebida' })
        .where(eq(purchaseRequests.id, input.id));
      return { success: true };
    }),

  // Confirm items separately (after received)
  confirmItems: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      await db.update(purchaseRequests)
        .set({ itemsConfirmedDate: now })
        .where(eq(purchaseRequests.id, input.id));
      // Mark all items as confirmed
      await db.update(purchaseRequestItems)
        .set({ confirmed: 1 })
        .where(eq(purchaseRequestItems.requestId, input.id));
      return { success: true };
    }),

  // Toggle single item confirmation
  toggleItemConfirm: protectedProcedure
    .input(z.object({ itemId: z.number(), confirmed: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(purchaseRequestItems)
        .set({ confirmed: input.confirmed ? 1 : 0 })
        .where(eq(purchaseRequestItems.id, input.itemId));
      return { success: true };
    }),

  // Upload image for a request
  uploadImage: protectedProcedure
    .input(z.object({
      id: z.number(),
      imageBase64: z.string(),
      mimeType: z.string().default('image/jpeg'),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Convert base64 to buffer
      const buffer = Buffer.from(input.imageBase64, 'base64');
      const ext = input.mimeType.split('/')[1] || 'jpg';
      const key = `purchase-requests/${input.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { url } = await storagePut(key, buffer, input.mimeType);

      // Get current images
      const [req] = await db.select({ images: purchaseRequests.images })
        .from(purchaseRequests)
        .where(eq(purchaseRequests.id, input.id));

      const currentImages: string[] = req?.images ? JSON.parse(req.images) : [];
      currentImages.push(url);

      await db.update(purchaseRequests)
        .set({ images: JSON.stringify(currentImages) })
        .where(eq(purchaseRequests.id, input.id));

      return { url, images: currentImages };
    }),

  // Remove image from a request
  removeImage: protectedProcedure
    .input(z.object({ id: z.number(), imageUrl: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [req] = await db.select({ images: purchaseRequests.images })
        .from(purchaseRequests)
        .where(eq(purchaseRequests.id, input.id));

      const currentImages: string[] = req?.images ? JSON.parse(req.images) : [];
      const newImages = currentImages.filter(img => img !== input.imageUrl);

      await db.update(purchaseRequests)
        .set({ images: JSON.stringify(newImages) })
        .where(eq(purchaseRequests.id, input.id));

      return { images: newImages };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(purchaseRequestItems).where(eq(purchaseRequestItems.requestId, input.id));
      await db.delete(purchaseRequests).where(eq(purchaseRequests.id, input.id));
      return { success: true };
    }),
});
