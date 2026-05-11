import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { fuelSuppliers, fuelPriceHistory, fuelInvoices } from "../../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";

export const fuelSuppliersRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(fuelSuppliers).orderBy(desc(fuelSuppliers.id));
  }),

  listActive: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(fuelSuppliers).where(eq(fuelSuppliers.isActive, 1)).orderBy(fuelSuppliers.name);
  }),

  listActiveByLocation: protectedProcedure
    .input(z.object({ locationType: z.enum(["simflor", "astorga", "postos"]) }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return db.select().from(fuelSuppliers)
        .where(and(
          eq(fuelSuppliers.isActive, 1),
          eq(fuelSuppliers.locationType, input.locationType)
        ))
        .orderBy(fuelSuppliers.name);
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      tradeName: z.string().optional(),
      cnpj: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      contactName: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      fuelType: z.enum(["diesel", "gasolina", "etanol", "gnv"]).default("diesel"),
      pricePerLiter: z.string().min(1),
      locationType: z.enum(["simflor", "astorga", "postos"]).default("simflor"),
      location: z.string().optional(),
      workLocationId: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.insert(fuelSuppliers).values({
        name: input.name,
        tradeName: input.tradeName || null,
        cnpj: input.cnpj || null,
        phone: input.phone || null,
        email: input.email || null,
        contactName: input.contactName || null,
        address: input.address || null,
        city: input.city || null,
        state: input.state || null,
        fuelType: input.fuelType,
        pricePerLiter: input.pricePerLiter,
        locationType: input.locationType,
        location: input.location || null,
        workLocationId: input.workLocationId || null,
        notes: input.notes || null,
      });
      return { success: true };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      tradeName: z.string().nullable().optional(),
      cnpj: z.string().nullable().optional(),
      phone: z.string().nullable().optional(),
      email: z.string().nullable().optional(),
      contactName: z.string().nullable().optional(),
      address: z.string().nullable().optional(),
      city: z.string().nullable().optional(),
      state: z.string().nullable().optional(),
      fuelType: z.enum(["diesel", "gasolina", "etanol", "gnv"]).optional(),
      pricePerLiter: z.string().optional(),
      locationType: z.enum(["simflor", "astorga", "postos"]).optional(),
      location: z.string().nullable().optional(),
      workLocationId: z.number().nullable().optional(),
      isActive: z.number().optional(),
      notes: z.string().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...data } = input;
      const updateData: any = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.tradeName !== undefined) updateData.tradeName = data.tradeName;
      if (data.cnpj !== undefined) updateData.cnpj = data.cnpj;
      if (data.phone !== undefined) updateData.phone = data.phone;
      if (data.email !== undefined) updateData.email = data.email;
      if (data.contactName !== undefined) updateData.contactName = data.contactName;
      if (data.address !== undefined) updateData.address = data.address;
      if (data.city !== undefined) updateData.city = data.city;
      if (data.state !== undefined) updateData.state = data.state;
      if (data.fuelType !== undefined) updateData.fuelType = data.fuelType;
      if (data.pricePerLiter !== undefined) updateData.pricePerLiter = data.pricePerLiter;
      if (data.locationType !== undefined) updateData.locationType = data.locationType;
      if (data.location !== undefined) updateData.location = data.location;
      if (data.workLocationId !== undefined) updateData.workLocationId = data.workLocationId;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;
      if (data.notes !== undefined) updateData.notes = data.notes;
      // If price changed, record in history
      if (data.pricePerLiter !== undefined) {
        const [existing] = await db.select({ pricePerLiter: fuelSuppliers.pricePerLiter }).from(fuelSuppliers).where(eq(fuelSuppliers.id, id));
        if (existing && existing.pricePerLiter !== data.pricePerLiter) {
          await db.insert(fuelPriceHistory).values({
            supplierId: id,
            oldPrice: existing.pricePerLiter,
            newPrice: data.pricePerLiter,
            changedBy: ctx.user?.id || null,
          });
        }
      }
      await db.update(fuelSuppliers).set(updateData).where(eq(fuelSuppliers.id, id));
      return { success: true };
    }),

  priceHistory: protectedProcedure
    .input(z.object({ supplierId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      if (input.supplierId) {
        return db.select().from(fuelPriceHistory)
          .where(eq(fuelPriceHistory.supplierId, input.supplierId))
          .orderBy(desc(fuelPriceHistory.changedAt));
      }
      return db.select().from(fuelPriceHistory).orderBy(desc(fuelPriceHistory.changedAt));
    }),

  fuelReport: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Get all vehicle records of type abastecimento
      const { vehicleRecords } = await import('../../drizzle/schema');
      const { gte, lte } = await import('drizzle-orm');
      let conditions: any[] = [eq(vehicleRecords.recordType, 'abastecimento')];
      if (input.startDate) {
        conditions.push(gte(vehicleRecords.date, input.startDate));
      }
      if (input.endDate) {
        conditions.push(lte(vehicleRecords.date, input.endDate));
      }
      const records = await db.select().from(vehicleRecords).where(and(...conditions)).orderBy(desc(vehicleRecords.date));
      return records;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(fuelSuppliers).where(eq(fuelSuppliers.id, input.id));
      return { success: true };
    }),

  // ===== CONTAS A PAGAR (NOTAS FISCAIS / BOLETOS) =====
  listInvoices: protectedProcedure
    .input(z.object({
      supplierId: z.number().optional(),
      status: z.enum(["pendente", "pago", "vencido", "cancelado"]).optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      let conditions: any[] = [];
      if (input?.supplierId) conditions.push(eq(fuelInvoices.supplierId, input.supplierId));
      if (input?.status) conditions.push(eq(fuelInvoices.status, input.status));
      const invoices = conditions.length > 0
        ? await db.select().from(fuelInvoices).where(and(...conditions)).orderBy(desc(fuelInvoices.id))
        : await db.select().from(fuelInvoices).orderBy(desc(fuelInvoices.id));
      // Enrich with supplier name
      const suppliers = await db.select().from(fuelSuppliers);
      const supplierMap = Object.fromEntries(suppliers.map(s => [s.id, s]));
      return invoices.map(inv => ({
        ...inv,
        supplierName: supplierMap[inv.supplierId]?.name || `Fornecedor #${inv.supplierId}`,
        supplierTradeName: supplierMap[inv.supplierId]?.tradeName || null,
      }));
    }),

  createInvoice: protectedProcedure
    .input(z.object({
      supplierId: z.number(),
      invoiceNumber: z.string().min(1),
      invoiceDate: z.string().min(1),
      dueDate: z.string().min(1),
      totalAmount: z.string().min(1),
      liters: z.string().optional(),
      pricePerLiter: z.string().optional(),
      fuelType: z.enum(["diesel", "gasolina", "etanol", "gnv"]).default("diesel"),
      paymentMethod: z.string().optional(),
      bankName: z.string().optional(),
      barcodeNumber: z.string().optional(),
      transporterName: z.string().optional(),
      transporterPlate: z.string().optional(),
      deliveryLocation: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.insert(fuelInvoices).values({
        supplierId: input.supplierId,
        invoiceNumber: input.invoiceNumber,
        invoiceDate: input.invoiceDate,
        dueDate: input.dueDate,
        totalAmount: input.totalAmount,
        liters: input.liters || null,
        pricePerLiter: input.pricePerLiter || null,
        fuelType: input.fuelType,
        paymentMethod: input.paymentMethod || null,
        bankName: input.bankName || null,
        barcodeNumber: input.barcodeNumber || null,
        transporterName: input.transporterName || null,
        transporterPlate: input.transporterPlate || null,
        deliveryLocation: input.deliveryLocation || null,
        notes: input.notes || null,
        registeredBy: ctx.user?.id || null,
      });
      return { success: true };
    }),

  updateInvoice: protectedProcedure
    .input(z.object({
      id: z.number(),
      supplierId: z.number().optional(),
      invoiceNumber: z.string().optional(),
      invoiceDate: z.string().optional(),
      dueDate: z.string().optional(),
      totalAmount: z.string().optional(),
      liters: z.string().nullable().optional(),
      pricePerLiter: z.string().nullable().optional(),
      fuelType: z.enum(["diesel", "gasolina", "etanol", "gnv"]).optional(),
      paymentMethod: z.string().nullable().optional(),
      bankName: z.string().nullable().optional(),
      barcodeNumber: z.string().nullable().optional(),
      status: z.enum(["pendente", "pago", "vencido", "cancelado"]).optional(),
      paidAt: z.string().nullable().optional(),
      paidAmount: z.string().nullable().optional(),
      transporterName: z.string().nullable().optional(),
      transporterPlate: z.string().nullable().optional(),
      deliveryLocation: z.string().nullable().optional(),
      notes: z.string().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...data } = input;
      const updateData: any = {};
      for (const [key, val] of Object.entries(data)) {
        if (val !== undefined) updateData[key] = val;
      }
      await db.update(fuelInvoices).set(updateData).where(eq(fuelInvoices.id, id));
      return { success: true };
    }),

  markInvoicePaid: protectedProcedure
    .input(z.object({
      id: z.number(),
      paidAt: z.string().min(1),
      paidAmount: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(fuelInvoices).set({
        status: "pago",
        paidAt: input.paidAt,
        paidAmount: input.paidAmount || null,
      }).where(eq(fuelInvoices.id, input.id));
      return { success: true };
    }),

  deleteInvoice: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(fuelInvoices).where(eq(fuelInvoices.id, input.id));
      return { success: true };
    }),
});
