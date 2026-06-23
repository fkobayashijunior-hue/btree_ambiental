import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { quotations, suppliers, purchaseCategories } from "../../drizzle/schema";
import { eq, desc, asc, sql } from "drizzle-orm";

export const quotationsRouter = router({
  // List all quotations, optionally filtered by category or supplier
  list: protectedProcedure
    .input(z.object({
      categoryId: z.number().optional(),
      supplierId: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db.select({
        id: quotations.id,
        supplierId: quotations.supplierId,
        supplierName: suppliers.companyName,
        supplierPhone: suppliers.phone,
        supplierWhatsapp: suppliers.whatsapp,
        categoryId: quotations.categoryId,
        categoryName: purchaseCategories.name,
        categoryColor: purchaseCategories.color,
        productName: quotations.productName,
        unit: quotations.unit,
        quantity: quotations.quantity,
        unitPrice: quotations.unitPrice,
        totalPrice: quotations.totalPrice,
        currency: quotations.currency,
        quotedAt: quotations.quotedAt,
        notes: quotations.notes,
        createdAt: quotations.createdAt,
      })
        .from(quotations)
        .leftJoin(suppliers, eq(quotations.supplierId, suppliers.id))
        .leftJoin(purchaseCategories, eq(quotations.categoryId, purchaseCategories.id))
        .orderBy(desc(quotations.quotedAt));
      return rows;
    }),

  // List by product name — price history across suppliers, lowest price first
  listByProduct: protectedProcedure
    .input(z.object({ productName: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db.select({
        id: quotations.id,
        supplierId: quotations.supplierId,
        supplierName: suppliers.companyName,
        supplierPhone: suppliers.phone,
        supplierWhatsapp: suppliers.whatsapp,
        categoryId: quotations.categoryId,
        productName: quotations.productName,
        unit: quotations.unit,
        quantity: quotations.quantity,
        unitPrice: quotations.unitPrice,
        totalPrice: quotations.totalPrice,
        quotedAt: quotations.quotedAt,
        notes: quotations.notes,
      })
        .from(quotations)
        .leftJoin(suppliers, eq(quotations.supplierId, suppliers.id))
        .where(eq(quotations.productName, input.productName))
        .orderBy(asc(sql`CAST(${quotations.unitPrice} AS DECIMAL(10,2))`), desc(quotations.quotedAt));
      return rows;
    }),

  // List grouped by category — returns categories with their products and price history
  listByCategory: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const rows = await db.select({
      id: quotations.id,
      supplierId: quotations.supplierId,
      supplierName: suppliers.companyName,
      supplierPhone: suppliers.phone,
      supplierWhatsapp: suppliers.whatsapp,
      categoryId: quotations.categoryId,
      categoryName: purchaseCategories.name,
      categoryColor: purchaseCategories.color,
      productName: quotations.productName,
      unit: quotations.unit,
      quantity: quotations.quantity,
      unitPrice: quotations.unitPrice,
      totalPrice: quotations.totalPrice,
      quotedAt: quotations.quotedAt,
      notes: quotations.notes,
    })
      .from(quotations)
      .leftJoin(suppliers, eq(quotations.supplierId, suppliers.id))
      .leftJoin(purchaseCategories, eq(quotations.categoryId, purchaseCategories.id))
      .orderBy(
        purchaseCategories.name,
        quotations.productName,
        asc(sql`CAST(${quotations.unitPrice} AS DECIMAL(10,2))`)
      );

    // Group by category → product → price history
    const grouped: Record<string, {
      categoryId: number | null;
      categoryName: string;
      categoryColor: string;
      products: Record<string, {
        productName: string;
        unit: string | null;
        lowestPrice: string;
        latestDate: number;
        quotes: typeof rows;
      }>;
    }> = {};

    for (const row of rows) {
      const catKey = row.categoryId?.toString() ?? 'sem_categoria';
      const catName = row.categoryName ?? 'Sem Categoria';
      const catColor = row.categoryColor ?? '#6B7280';

      if (!grouped[catKey]) {
        grouped[catKey] = {
          categoryId: row.categoryId,
          categoryName: catName,
          categoryColor: catColor,
          products: {},
        };
      }

      const prodKey = row.productName;
      if (!grouped[catKey]!.products[prodKey]) {
        grouped[catKey]!.products[prodKey] = {
          productName: row.productName,
          unit: row.unit,
          lowestPrice: row.unitPrice,
          latestDate: row.quotedAt,
          quotes: [],
        };
      }

      const prod = grouped[catKey]!.products[prodKey]!;
      prod.quotes.push(row);

      // Track lowest price
      const currentPrice = parseFloat(row.unitPrice);
      const lowestPrice = parseFloat(prod.lowestPrice);
      if (currentPrice < lowestPrice) {
        prod.lowestPrice = row.unitPrice;
      }

      // Track latest date
      if (row.quotedAt > prod.latestDate) {
        prod.latestDate = row.quotedAt;
      }
    }

    return Object.values(grouped).map(cat => ({
      ...cat,
      products: Object.values(cat.products).sort((a, b) =>
        parseFloat(a.lowestPrice) - parseFloat(b.lowestPrice)
      ),
    }));
  }),

  create: protectedProcedure
    .input(z.object({
      supplierId: z.number(),
      categoryId: z.number().optional(),
      productName: z.string().min(1).max(255),
      unit: z.string().optional(),
      quantity: z.string().optional(),
      unitPrice: z.string().min(1),
      totalPrice: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const now = Date.now();
      const [result] = await db.insert(quotations).values({
        supplierId: input.supplierId,
        categoryId: input.categoryId,
        productName: input.productName,
        unit: input.unit,
        quantity: input.quantity,
        unitPrice: input.unitPrice,
        totalPrice: input.totalPrice,
        currency: 'BRL',
        quotedAt: now,
        notes: input.notes,
        createdBy: ctx.user.id,
      });
      return { id: (result as any).insertId, ...input };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      supplierId: z.number().optional(),
      categoryId: z.number().optional(),
      productName: z.string().optional(),
      unit: z.string().optional(),
      quantity: z.string().optional(),
      unitPrice: z.string().optional(),
      totalPrice: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...data } = input;
      await db.update(quotations).set(data).where(eq(quotations.id, id));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(quotations).where(eq(quotations.id, input.id));
      return { success: true };
    }),
});
