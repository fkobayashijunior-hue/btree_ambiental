import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { suppliers, quotations, quotationResponses } from "../../drizzle/schema";
import { eq, desc, sql } from "drizzle-orm";

export const suppliersRouter = router({
  list: protectedProcedure
    .input(z.object({ activeOnly: z.boolean().optional().default(true) }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const query = db.select().from(suppliers);
      if (input?.activeOnly !== false) {
        return await query.where(eq(suppliers.isActive, 1)).orderBy(suppliers.companyName);
      }
      return await query.orderBy(suppliers.companyName);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, input.id));
      if (!supplier) throw new TRPCError({ code: "NOT_FOUND" });
      const recentQuotations = await db.select({
        id: quotations.id,
        productName: quotations.productName,
        unitPrice: quotations.unitPrice,
        unit: quotations.unit,
        quotedAt: quotations.quotedAt,
        categoryId: quotations.categoryId,
        notes: quotations.notes,
      })
        .from(quotations)
        .where(eq(quotations.supplierId, input.id))
        .orderBy(desc(quotations.quotedAt))
        .limit(20);
      return { ...supplier, recentQuotations };
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      tradeName: z.string().optional(),
      cnpj: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().max(2).optional(),
      zipCode: z.string().optional(),
      phone: z.string().optional(),
      whatsapp: z.string().optional(),
      email: z.string().email().optional().or(z.literal('')),
      contactName: z.string().optional(),
      website: z.string().optional(),
      notes: z.string().optional(),
      sellerName: z.string().optional(),
      pixKey: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [result] = await db.insert(suppliers).values({
        companyName: input.name,
        tradeName: input.tradeName,
        cnpj: input.cnpj,
        address: input.address,
        city: input.city,
        state: input.state,
        zipCode: input.zipCode,
        phone: input.phone,
        whatsapp: input.whatsapp,
        email: input.email || undefined,
        contactName: input.contactName,
        website: input.website,
        notes: input.notes,
        sellerName: input.sellerName,
        pixKey: input.pixKey,
        isActive: 1,
        createdBy: ctx.user.id,
      });
      return { id: (result as any).insertId, ...input };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).max(255),
      tradeName: z.string().optional(),
      cnpj: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().max(2).optional(),
      zipCode: z.string().optional(),
      phone: z.string().optional(),
      whatsapp: z.string().optional(),
      email: z.string().email().optional().or(z.literal('')),
      contactName: z.string().optional(),
      website: z.string().optional(),
      notes: z.string().optional(),
      active: z.number().optional(),
      sellerName: z.string().optional(),
      pixKey: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, name, active, ...rest } = input;
      await db.update(suppliers).set({
        companyName: name,
        ...rest,
        email: rest.email || undefined,
        isActive: active !== undefined ? active : undefined,
      }).where(eq(suppliers.id, id));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(suppliers).set({ isActive: 0 }).where(eq(suppliers.id, input.id));
      return { success: true };
    }),

  syncFromQuotationResponses: protectedProcedure
    .mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const responses = await db.select().from(quotationResponses);
      let created = 0;
      let skipped = 0;
      for (const resp of responses) {
        if (!resp.supplierName?.trim()) continue;
        const trimmedName = resp.supplierName.trim();
        const rows = await db.execute(
          sql`SELECT id FROM suppliers WHERE company_name = ${trimmedName} LIMIT 1`
        );
        const existing = (rows as any)[0] as Array<{ id: number }>;
        if (existing.length > 0) { skipped++; continue; }
        await db.insert(suppliers).values({
          companyName: trimmedName,
          cnpj: resp.cnpj ?? null,
          address: resp.address ?? null,
          phone: resp.sellerPhone ?? null,
          whatsapp: resp.sellerPhone ?? null,
          email: resp.sellerEmail ?? null,
          contactName: resp.sellerName ?? null,
          isActive: 1,
          createdBy: ctx.user.id,
        });
        created++;
      }
      return { created, skipped };
    }),
});
