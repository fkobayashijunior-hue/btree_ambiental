import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { suppliers, quotations, purchaseCategories } from "../../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";

export const suppliersRouter = router({
  list: protectedProcedure
    .input(z.object({ activeOnly: z.boolean().optional().default(true) }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const query = db.select().from(suppliers);
      if (input?.activeOnly !== false) {
        return await query.where(eq(suppliers.active, 1)).orderBy(suppliers.name);
      }
      return await query.orderBy(suppliers.name);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, input.id));
      if (!supplier) throw new TRPCError({ code: "NOT_FOUND" });
      // Get recent quotations for this supplier
      const recentQuotations = await db.select({
        id: quotations.id,
        productName: quotations.productName,
        price: quotations.price,
        unit: quotations.unit,
        quotationDate: quotations.quotationDate,
        categoryId: quotations.categoryId,
        notes: quotations.notes,
      })
        .from(quotations)
        .where(eq(quotations.supplierId, input.id))
        .orderBy(desc(quotations.quotationDate))
        .limit(20);
      return { ...supplier, recentQuotations };
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().max(2).optional(),
      phone: z.string().optional(),
      whatsapp: z.string().optional(),
      email: z.string().email().optional().or(z.literal('')),
      website: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [result] = await db.insert(suppliers).values({
        name: input.name,
        address: input.address,
        city: input.city,
        state: input.state,
        phone: input.phone,
        whatsapp: input.whatsapp,
        email: input.email || undefined,
        website: input.website,
        notes: input.notes,
        active: 1,
        createdBy: ctx.user.id,
      });
      return { id: (result as any).insertId, ...input };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).max(255),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().max(2).optional(),
      phone: z.string().optional(),
      whatsapp: z.string().optional(),
      email: z.string().email().optional().or(z.literal('')),
      website: z.string().optional(),
      notes: z.string().optional(),
      active: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...data } = input;
      await db.update(suppliers).set({
        ...data,
        email: data.email || undefined,
      }).where(eq(suppliers.id, id));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(suppliers).set({ active: 0 }).where(eq(suppliers.id, input.id));
      return { success: true };
    }),
});
