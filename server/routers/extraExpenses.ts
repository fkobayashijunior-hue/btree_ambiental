import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { extraExpenses } from "../../drizzle/schema";
import { desc, eq, and, gte, lte } from "drizzle-orm";

export const extraExpensesRouter = router({
  list: protectedProcedure
    .input(z.object({
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      category: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const conditions = [];
      if (input.dateFrom) {
        conditions.push(gte(extraExpenses.date, new Date(input.dateFrom)));
      }
      if (input.dateTo) {
        const to = new Date(input.dateTo);
        to.setHours(23, 59, 59, 999);
        conditions.push(lte(extraExpenses.date, to));
      }
      if (input.category) {
        conditions.push(eq(extraExpenses.category, input.category as any));
      }
      return db
        .select()
        .from(extraExpenses)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(extraExpenses.date));
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
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const [result] = await db.insert(extraExpenses).values({
        date: new Date(input.date),
        category: input.category,
        description: input.description,
        amount: input.amount,
        paymentMethod: input.paymentMethod,
        receiptImageUrl: input.receiptImageUrl,
        notes: input.notes,
        registeredBy: ctx.user.id,
        registeredByName: ctx.user.name,
        workLocationId: input.workLocationId || null,
      });
      return { id: (result as any).insertId };
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
