import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { parts, partsRequests } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { cloudinaryUpload } from "../cloudinary";
import { notifyTeam } from "../notifyTeam";

export const partsRouter = router({
  // === PEÇAS ===
  listParts: protectedProcedure
    .input(z.object({ search: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const results = await db.select().from(parts).orderBy(desc(parts.createdAt));
      if (input?.search) {
        const s = input.search.toLowerCase();
        return results.filter(p =>
          p.name.toLowerCase().includes(s) ||
          p.code?.toLowerCase().includes(s) ||
          p.category?.toLowerCase().includes(s)
        );
      }
      return results;
    }),

  createPart: protectedProcedure
    .input(z.object({
      code: z.string().optional(),
      name: z.string().min(2),
      category: z.string().optional(),
      unit: z.string().optional(),
      stockQuantity: z.number().optional(),
      minStock: z.number().optional(),
      unitCost: z.string().optional(),
      supplier: z.string().optional(),
      photoBase64: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      let photoUrl: string | undefined;
      if (input.photoBase64) {
        const result = await cloudinaryUpload(input.photoBase64, "btree/parts");
        photoUrl = result.url;
      }

      const { photoBase64, ...rest } = input;
      await db.insert(parts).values({ ...rest, photoUrl, createdBy: ctx.user.id });
      return { success: true };
    }),

  updatePart: protectedProcedure
    .input(z.object({
      id: z.number(),
      code: z.string().optional(),
      name: z.string().optional(),
      category: z.string().optional(),
      unit: z.string().optional(),
      stockQuantity: z.number().optional(),
      minStock: z.number().optional(),
      unitCost: z.string().optional(),
      supplier: z.string().optional(),
      photoBase64: z.string().optional(),
      notes: z.string().optional(),
      active: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      const { id, photoBase64, ...rest } = input;
      const updateData: any = { ...rest, updatedAt: new Date() };

      if (photoBase64) {
        const result = await cloudinaryUpload(photoBase64, "btree/parts");
        updateData.photoUrl = result.url;
      }

      await db.update(parts).set(updateData).where(eq(parts.id, id));
      return { success: true };
    }),

  deletePart: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      await db.delete(parts).where(eq(parts.id, input.id));
      return { success: true };
    }),

  // === SOLICITAÇÕES ===
  listRequests: protectedProcedure
    .input(z.object({
      status: z.enum(["pendente", "aprovado", "rejeitado", "comprado", "entregue"]).optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const results = await db.select().from(partsRequests).orderBy(desc(partsRequests.createdAt));
      if (input?.status) return results.filter(r => r.status === input.status);
      return results;
    }),

  createRequest: protectedProcedure
    .input(z.object({
      partId: z.number().optional(),
      partName: z.string(),
      quantity: z.number().min(1),
      urgency: z.enum(["baixa", "media", "alta"]),
      equipmentId: z.number().optional(),
      equipmentName: z.string().optional(),
      reason: z.string().optional(),
      estimatedCost: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      await db.insert(partsRequests).values({
        ...input,
        status: "pendente",
        requestedBy: ctx.user.id,
      });

      // Notificação por e-mail para a equipe
      const urgencyLabels: Record<string, string> = { baixa: "Baixa", media: "Média", alta: "Alta ⚠️" };
      notifyTeam({
        event: "pedido_pecas_criado",
        title: `Nova solicitação de peça/acessório: ${input.partName}.`,
        details: {
          "Peça / Acessório": input.partName,
          "Quantidade": input.quantity,
          "Urgência": urgencyLabels[input.urgency] || input.urgency,
          "Equipamento": input.equipmentName || "—",
          "Motivo": input.reason || "—",
          "Custo Estimado": input.estimatedCost ? `R$ ${input.estimatedCost}` : "—",
        },
        registeredBy: ctx.user.name,
      }).catch(() => {});

      return { success: true };
    }),

  updateRequestStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["pendente", "aprovado", "rejeitado", "comprado", "entregue"]),
      rejectionReason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && input.status !== "comprado" && input.status !== "entregue") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas admins podem aprovar/rejeitar" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      const updateData: Record<string, unknown> = {
        status: input.status,
        updatedAt: new Date(),
      };
      if (input.status === "aprovado") {
        updateData.approvedBy = ctx.user.id;
        updateData.approvedAt = new Date();
      }
      if (input.rejectionReason) updateData.rejectionReason = input.rejectionReason;

      await db.update(partsRequests).set(updateData).where(eq(partsRequests.id, input.id));
      return { success: true };
    }),

  deleteRequest: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      await db.delete(partsRequests).where(eq(partsRequests.id, input.id));
      return { success: true };
    }),
});
