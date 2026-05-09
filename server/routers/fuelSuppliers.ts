import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { fuelSuppliers, fuelPriceHistory } from "../../drizzle/schema";
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
});
