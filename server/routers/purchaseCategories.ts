import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { purchaseCategories } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export const purchaseCategoriesRouter = router({
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return await db.select().from(purchaseCategories).orderBy(purchaseCategories.name);
  }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(100),
      color: z.string().optional().default('#6B7280'),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [result] = await db.insert(purchaseCategories).values({
        name: input.name,
        color: input.color,
        createdBy: ctx.user.id,
      });
      return { id: (result as any).insertId, name: input.name, color: input.color };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).max(100),
      color: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(purchaseCategories)
        .set({ name: input.name, color: input.color })
        .where(eq(purchaseCategories.id, input.id));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(purchaseCategories).where(eq(purchaseCategories.id, input.id));
      return { success: true };
    }),
});
