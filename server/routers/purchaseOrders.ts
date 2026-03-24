import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { purchaseOrders, purchaseOrderItems, parts } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { notifyTeam } from "../notifyTeam";

export const purchaseOrdersRouter = router({
  // Listar todos os pedidos
  listOrders: protectedProcedure
    .input(z.object({ status: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const orders = await db.select().from(purchaseOrders).orderBy(desc(purchaseOrders.createdAt));
      if (input?.status) return orders.filter(o => o.status === input.status);
      return orders;
    }),

  // Buscar pedido com itens
  getOrder: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const [order] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, input.id));
      if (!order) throw new TRPCError({ code: "NOT_FOUND" });
      const items = await db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.orderId, input.id));
      return { ...order, items };
    }),

  // Criar pedido com itens
  createOrder: protectedProcedure
    .input(z.object({
      title: z.string().min(2),
      notes: z.string().optional(),
      items: z.array(z.object({
        partId: z.number().optional(),
        partName: z.string(),
        partCode: z.string().optional(),
        partCategory: z.string().optional(),
        supplier: z.string().optional(),
        unit: z.string().optional(),
        quantity: z.number().min(1),
        unitCost: z.string().optional(),
        notes: z.string().optional(),
      })).min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const [result] = await db.insert(purchaseOrders).values({
        title: input.title,
        notes: input.notes,
        status: "rascunho",
        createdBy: ctx.user.id,
      });
      const orderId = (result as any).insertId;
      if (input.items.length > 0) {
        await db.insert(purchaseOrderItems).values(
          input.items.map(item => ({ ...item, orderId }))
        );
      }
      // Notificação por e-mail ao criar pedido de compra
      const itemsList = input.items.map(i => `${i.quantity}x ${i.partName}${i.supplier ? " (" + i.supplier + ")" : ""}`).join(", ");
      notifyTeam({
        event: "pedido_compra_criado",
        title: `Novo pedido de compra criado: ${input.title}.`,
        details: {
          "Título do Pedido": input.title,
          "Itens": itemsList,
          "Qtd. de Itens": input.items.length,
          "Observações": input.notes || "—",
        },
        registeredBy: ctx.user.name,
      }).catch(() => {});

      return { success: true, orderId };
    }),

  // Atualizar status do pedido
  updateOrderStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["rascunho", "enviado", "aprovado", "rejeitado", "comprado"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const updateData: Record<string, unknown> = { status: input.status, updatedAt: new Date() };
      if (input.status === "aprovado") {
        updateData.approvedBy = ctx.user.id;
        updateData.approvedAt = new Date();
      }
      await db.update(purchaseOrders).set(updateData).where(eq(purchaseOrders.id, input.id));

      // Notificação quando pedido é enviado para aprovação
      if (input.status === "enviado") {
        const [order] = await db.select({ title: purchaseOrders.title }).from(purchaseOrders).where(eq(purchaseOrders.id, input.id));
        notifyTeam({
          event: "pedido_compra_enviado",
          title: `Pedido de compra enviado para aprovação: ${order?.title || `#${input.id}`}.`,
          details: {
            "Pedido": order?.title || `#${input.id}`,
            "Status": "Enviado para aprovação",
          },
          registeredBy: ctx.user.name,
        }).catch(() => {});
      }

      return { success: true };
    }),

  // Deletar pedido
  deleteOrder: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      await db.delete(purchaseOrders).where(eq(purchaseOrders.id, input.id));
      return { success: true };
    }),
});
