import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { fuelSuppliers } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

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

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      fuelType: z.enum(["diesel", "gasolina", "etanol", "gnv"]).default("diesel"),
      pricePerLiter: z.string().min(1),
      location: z.string().optional(),
      workLocationId: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.insert(fuelSuppliers).values({
        name: input.name,
        fuelType: input.fuelType,
        pricePerLiter: input.pricePerLiter,
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
      fuelType: z.enum(["diesel", "gasolina", "etanol", "gnv"]).optional(),
      pricePerLiter: z.string().optional(),
      location: z.string().optional(),
      workLocationId: z.number().nullable().optional(),
      isActive: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...data } = input;
      const updateData: any = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.fuelType !== undefined) updateData.fuelType = data.fuelType;
      if (data.pricePerLiter !== undefined) updateData.pricePerLiter = data.pricePerLiter;
      if (data.location !== undefined) updateData.location = data.location;
      if (data.workLocationId !== undefined) updateData.workLocationId = data.workLocationId;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;
      if (data.notes !== undefined) updateData.notes = data.notes;
      await db.update(fuelSuppliers).set(updateData).where(eq(fuelSuppliers.id, id));
      return { success: true };
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
