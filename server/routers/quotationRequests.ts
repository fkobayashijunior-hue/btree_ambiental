import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { quotationRequests, quotationResponses } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import crypto from "crypto";
import { notifyOwner } from "../_core/notification";

export const quotationRequestsRouter = router({
  // Listar todas as solicitações (protegido)
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const rows = await db.select().from(quotationRequests).orderBy(desc(quotationRequests.createdAt));
    return rows.map((r: typeof quotationRequests.$inferSelect) => ({
      ...r,
      items: JSON.parse(r.itemsJson || "[]") as Array<{ name: string; quantity: string; unit: string }>,
      isExpired: Date.now() > r.expiresAt,
    }));
  }),

  // Buscar por ID com respostas (protegido)
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [req] = await db.select().from(quotationRequests).where(eq(quotationRequests.id, input.id));
      if (!req) throw new TRPCError({ code: "NOT_FOUND", message: "Solicitação não encontrada" });
      const responses = await db
        .select()
        .from(quotationResponses)
        .where(eq(quotationResponses.quotationRequestId, input.id))
        .orderBy(desc(quotationResponses.createdAt));
      return {
        ...req,
        items: JSON.parse(req.itemsJson || "[]") as Array<{ name: string; quantity: string; unit: string }>,
        isExpired: Date.now() > req.expiresAt,
        responses: responses.map((r: typeof quotationResponses.$inferSelect) => ({
          ...r,
          items: JSON.parse(r.itemsJson || "[]") as Array<{ name: string; quantity: string; unit: string; price: string; brand?: string; notes?: string }>,
        })),
      };
    }),

  // Criar nova solicitação (protegido)
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        requesterId: z.number().optional(),
        requesterName: z.string().optional(),
        requesterPhone: z.string().optional(),
        requesterEmail: z.string().optional(),
        items: z.array(z.object({
          name: z.string().min(1),
          quantity: z.string().min(1),
          unit: z.string().optional().default("un"),
        })).min(1),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 dias

      const [result] = await db.insert(quotationRequests).values({
        title: input.title,
        requesterId: input.requesterId,
        requesterName: input.requesterName,
        requesterPhone: input.requesterPhone,
        requesterEmail: input.requesterEmail,
        itemsJson: JSON.stringify(input.items),
        token,
        expiresAt,
        status: "ativa",
        notes: input.notes,
        createdBy: ctx.user.id,
      });

      const id = (result as { insertId: number }).insertId;
      return { id, token };
    }),

  // Cancelar solicitação (protegido)
  cancel: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db
        .update(quotationRequests)
        .set({ status: "cancelada" })
        .where(eq(quotationRequests.id, input.id));
      return { success: true };
    }),

  // ===== ROTAS PÚBLICAS (sem auth) =====

  // Buscar solicitação por token (fornecedor acessa)
  getByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { found: false as const };
      const [req] = await db
        .select()
        .from(quotationRequests)
        .where(eq(quotationRequests.token, input.token));

      if (!req) return { found: false as const };

      const isCancelled = req.status === "cancelada";

      return {
        found: true as const,
        isExpired: false,
        isCancelled,
        request: isCancelled ? null : {
          id: req.id,
          title: req.title,
          requesterName: req.requesterName,
          requesterPhone: req.requesterPhone,
          requesterEmail: req.requesterEmail,
          items: JSON.parse(req.itemsJson || "[]") as Array<{ name: string; quantity: string; unit: string }>,
          notes: req.notes,
          expiresAt: req.expiresAt,
        },
      };
    }),

  // Fornecedor envia resposta (público)
  submitResponse: publicProcedure
    .input(
      z.object({
        token: z.string(),
        supplierName: z.string().min(1),
        cnpj: z.string().optional(),
        address: z.string().optional(),
        sellerName: z.string().optional(),
        sellerPhone: z.string().optional(),
        sellerEmail: z.string().optional(),
        items: z.array(
          z.object({
            name: z.string(),
            quantity: z.string(),
            unit: z.string().optional(),
            price: z.string(),
            brand: z.string().optional(),
            notes: z.string().optional(),
          })
        ).min(1),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [req] = await db
        .select()
        .from(quotationRequests)
        .where(eq(quotationRequests.token, input.token));

      if (!req) throw new TRPCError({ code: "NOT_FOUND", message: "Solicitação não encontrada" });
      if (req.status === "cancelada") throw new TRPCError({ code: "BAD_REQUEST", message: "Solicitação cancelada" });

      await db.insert(quotationResponses).values({
        quotationRequestId: req.id,
        supplierName: input.supplierName,
        cnpj: input.cnpj,
        address: input.address,
        sellerName: input.sellerName,
        sellerPhone: input.sellerPhone,
        sellerEmail: input.sellerEmail,
        itemsJson: JSON.stringify(input.items),
        notes: input.notes,
      });

      // Atualizar status para respondida
      await db
        .update(quotationRequests)
        .set({ status: "respondida" })
        .where(eq(quotationRequests.id, req.id));

      // Notificar owner
      try {
        await notifyOwner({
          title: `📋 Novo orçamento recebido: ${req.title}`,
          content: `Fornecedor "${input.supplierName}" respondeu a solicitação de orçamento "${req.title}".\n\nVendedor: ${input.sellerName || "—"}\nTelefone: ${input.sellerPhone || "—"}\n\nAcesse o sistema para visualizar os valores.`,
        });
      } catch (_) {
        // Não bloquear se notificação falhar
      }

      return { success: true };
    }),
});
