import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { quotations, suppliers, purchaseCategories } from "../../drizzle/schema";
import { eq, desc, asc, and, sql } from "drizzle-orm";

export const quotationsRouter = router({
  // List all quotations, optionally filtered by category or supplier
  list: protectedProcedure
    .input(z.object({
      categoryId: z.number().optional(),
      supplierId: z.number().optional(),
      requestId: z.number().optional(),
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
        requestId: quotations.requestId,
        productName: quotations.productName,
        unit: quotations.unit,
        price: quotations.price,
        quotationDate: quotations.quotationDate,
        notes: quotations.notes,
        createdAt: quotations.createdAt,
      })
        .from(quotations)
        .leftJoin(suppliers, eq(quotations.supplierId, suppliers.id))
        .leftJoin(purchaseCategories, eq(quotations.categoryId, purchaseCategories.id))
        .orderBy(desc(quotations.quotationDate));
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
        price: quotations.price,
        quotationDate: quotations.quotationDate,
        notes: quotations.notes,
      })
        .from(quotations)
        .leftJoin(suppliers, eq(quotations.supplierId, suppliers.id))
        .where(eq(quotations.productName, input.productName))
        .orderBy(asc(sql`CAST(${quotations.price} AS DECIMAL(10,2))`), desc(quotations.quotationDate));
      return rows;
    }),

  // List grouped by category — returns categories with their products and price history
  listByCategory: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    // Get all quotations with supplier and category info
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
      price: quotations.price,
      quotationDate: quotations.quotationDate,
      notes: quotations.notes,
    })
      .from(quotations)
      .leftJoin(suppliers, eq(quotations.supplierId, suppliers.id))
      .leftJoin(purchaseCategories, eq(quotations.categoryId, purchaseCategories.id))
      .orderBy(
        purchaseCategories.name,
        quotations.productName,
        asc(sql`CAST(${quotations.price} AS DECIMAL(10,2))`)
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
        latestDate: string;
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
      if (!grouped[catKey].products[prodKey]) {
        grouped[catKey].products[prodKey] = {
          productName: row.productName,
          unit: row.unit,
          lowestPrice: row.price,
          latestDate: row.quotationDate,
          quotes: [],
        };
      }

      const prod = grouped[catKey].products[prodKey];
      prod.quotes.push(row);

      // Track lowest price
      const currentPrice = parseFloat(row.price);
      const lowestPrice = parseFloat(prod.lowestPrice);
      if (currentPrice < lowestPrice) {
        prod.lowestPrice = row.price;
      }

      // Track latest date
      if (row.quotationDate > prod.latestDate) {
        prod.latestDate = row.quotationDate;
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
      requestId: z.number().optional(),
      productName: z.string().min(1).max(255),
      unit: z.string().optional(),
      price: z.string().min(1),
      quotationDate: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [result] = await db.insert(quotations).values({
        supplierId: input.supplierId,
        categoryId: input.categoryId,
        requestId: input.requestId,
        productName: input.productName,
        unit: input.unit,
        price: input.price,
        quotationDate: input.quotationDate || new Date().toISOString().slice(0, 19).replace('T', ' '),
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
      price: z.string().optional(),
      quotationDate: z.string().optional(),
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
