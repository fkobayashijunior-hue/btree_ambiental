import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { vehicleRecords } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

export const vehicleRecordsRouter = router({
  list: protectedProcedure
    .input(z.object({
      equipmentId: z.number().optional(),
      recordType: z.enum(["abastecimento", "manutencao", "km"]).optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const results = await db.select().from(vehicleRecords).orderBy(desc(vehicleRecords.createdAt));
      let filtered = results;
      if (input?.equipmentId) filtered = filtered.filter(r => r.equipmentId === input.equipmentId);
      if (input?.recordType) filtered = filtered.filter(r => r.recordType === input.recordType);
      return filtered;
    }),

  create: protectedProcedure
    .input(z.object({
      equipmentId: z.number(),
      date: z.string(),
      recordType: z.enum(["abastecimento", "manutencao", "km"]),
      fuelType: z.enum(["diesel", "gasolina", "etanol", "gnv"]).optional(),
      liters: z.string().optional(),
      fuelCost: z.string().optional(),
      pricePerLiter: z.string().optional(),
      supplier: z.string().optional(),
      odometer: z.string().optional(),
      kmDriven: z.string().optional(),
      maintenanceType: z.string().optional(),
      maintenanceCost: z.string().optional(),
      serviceType: z.enum(["proprio", "terceirizado"]).optional(),
      mechanicName: z.string().optional(),
      driverCollaboratorId: z.number().optional(),
      photoBase64: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      let photoUrl: string | undefined;
      if (input.photoBase64 && input.photoBase64.startsWith("data:")) {
        const { cloudinaryUpload } = await import("../cloudinary");
        const result = await cloudinaryUpload(input.photoBase64, "btree/vehicle-records");
        photoUrl = result.url;
      }
      const { photoBase64, ...rest } = input;
      await db.insert(vehicleRecords).values({
        ...rest,
        date: new Date(input.date),
        photoUrl,
        registeredBy: ctx.user.id,
      });
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      await db.delete(vehicleRecords).where(eq(vehicleRecords.id, input.id));
      return { success: true };
    }),
});
