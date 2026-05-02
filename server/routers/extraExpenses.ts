import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { extraExpenses, gpsLocations, userPermissions } from "../../drizzle/schema";
import { desc, eq, and, gte, lte } from "drizzle-orm";

export const extraExpensesRouter = router({
  list: protectedProcedure
    .input(z.object({
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      category: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const conditions = [];
      if (input.dateFrom) {
        conditions.push(gte(extraExpenses.date, input.dateFrom));
      }
      if (input.dateTo) {
        conditions.push(lte(extraExpenses.date, input.dateTo + " 23:59:59"));
      }
      if (input.category) {
        conditions.push(eq(extraExpenses.category, input.category as any));
      }
      // Verificar se o usuário tem restrição de clientes
      let allowedClientIds: number[] | null = null;
      if (ctx.user.role !== "admin") {
        const [perm] = await db.select().from(userPermissions).where(eq(userPermissions.userId, ctx.user.id));
        if (perm?.allowedClientIds) {
          allowedClientIds = JSON.parse(perm.allowedClientIds) as number[];
        }
      }
      const rows = await db
        .select({
          id: extraExpenses.id,
          date: extraExpenses.date,
          category: extraExpenses.category,
          description: extraExpenses.description,
          amount: extraExpenses.amount,
          paymentMethod: extraExpenses.paymentMethod,
          receiptImageUrl: extraExpenses.receiptImageUrl,
          notes: extraExpenses.notes,
          registeredBy: extraExpenses.registeredBy,
          registeredByName: extraExpenses.registeredByName,
          createdAt: extraExpenses.createdAt,
          workLocationId: extraExpenses.workLocationId,
          clientId: extraExpenses.clientId,
          locationName: gpsLocations.name,
          locationClientId: gpsLocations.clientId,
        })
        .from(extraExpenses)
        .leftJoin(gpsLocations, eq(extraExpenses.workLocationId, gpsLocations.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(extraExpenses.date));
      // Filtrar por cliente se encarregado
      if (allowedClientIds && allowedClientIds.length > 0) {
        return rows.filter(r => {
          const cId = r.clientId || r.locationClientId;
          return cId && allowedClientIds!.includes(cId);
        });
      }
      return rows;
    }),

  create: protectedProcedure
    .input(z.object({
      date: z.string(),
      category: z.enum(["abastecimento", "refeicao", "compra_material", "servico_terceiro", "pedagio", "outro"]),
      description: z.string().min(1),
      amount: z.string().min(1),
      paymentMethod: z.enum(["dinheiro", "pix", "cartao", "transferencia"]).default("dinheiro"),
      receiptImageUrl: z.string().optional(),
      notes: z.string().optional(),
      workLocationId: z.number().optional(),
      clientId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const [result] = await db.insert(extraExpenses).values({
        date: input.date,
        category: input.category,
        description: input.description,
        amount: input.amount,
        paymentMethod: input.paymentMethod,
        receiptImageUrl: input.receiptImageUrl,
        notes: input.notes,
        registeredBy: ctx.user.id,
        registeredByName: ctx.user.name,
        workLocationId: input.workLocationId || null,
        clientId: input.clientId || null,
      });
      return { id: (result as any).insertId };
    }),

  updateLocation: protectedProcedure
    .input(z.object({
      id: z.number(),
      workLocationId: z.number().nullable(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.update(extraExpenses).set({
        workLocationId: input.workLocationId,
      }).where(eq(extraExpenses.id, input.id));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.delete(extraExpenses).where(eq(extraExpenses.id, input.id));
      return { success: true };
    }),
});
