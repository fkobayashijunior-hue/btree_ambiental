import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { vehicleRecords, users, gpsLocations } from "../../drizzle/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { notifyTeam } from "../notifyTeam";

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
      // Buscar nomes dos usuários que cadastraram
      const userIdsRaw = filtered.map(r => r.registeredBy).filter((id): id is number => id !== null && id !== undefined);
      const userIds = Array.from(new Set(userIdsRaw));
      let userMap: Record<number, string> = {};
      if (userIds.length > 0) {
        const usersData = await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, userIds));
        userMap = Object.fromEntries(usersData.map(u => [u.id, u.name]));
      }
      // Buscar nomes dos locais
      const locIdsRaw = filtered.map(r => r.workLocationId).filter((id): id is number => id !== null && id !== undefined);
      const locIds = Array.from(new Set(locIdsRaw));
      let locMap: Record<number, string> = {};
      if (locIds.length > 0) {
        const locsData = await db.select({ id: gpsLocations.id, name: gpsLocations.name }).from(gpsLocations).where(inArray(gpsLocations.id, locIds));
        locMap = Object.fromEntries(locsData.map(l => [l.id, l.name]));
      }
      return filtered.map(r => ({
        ...r,
        registeredByName: r.registeredBy ? userMap[r.registeredBy] || null : null,
        locationName: r.workLocationId ? locMap[r.workLocationId] || null : null,
      }));
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
      workLocationId: z.number().optional(),
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
      const { photoBase64, workLocationId, ...rest } = input;
      await db.insert(vehicleRecords).values({
        ...rest,
        date: new Date(input.date).toISOString().slice(0, 19).replace('T', ' '),
        photoUrl,
        registeredBy: ctx.user.id,
        workLocationId: workLocationId || null,
      });

      // Notificação por e-mail apenas para abastecimentos
      if (input.recordType === "abastecimento") {
        const dateFormatted = new Date(input.date).toLocaleDateString("pt-BR");
        const fuelLabels: Record<string, string> = { diesel: "Diesel", gasolina: "Gasolina", etanol: "Etanol", gnv: "GNV" };
        notifyTeam({
          event: "abastecimento_registrado",
          title: `Abastecimento registrado em ${dateFormatted}.`,
          details: {
            "Data": dateFormatted,
            "Combustível": input.fuelType ? fuelLabels[input.fuelType] || input.fuelType : "—",
            "Litros": input.liters ? `${input.liters} L` : "—",
            "Valor Total": input.fuelCost ? `R$ ${input.fuelCost}` : "—",
            "Preço / Litro": input.pricePerLiter ? `R$ ${input.pricePerLiter}` : "—",
            "Fornecedor": input.supplier || "—",
            "Odômetro": input.odometer ? `${input.odometer} km` : "—",
            "Observações": input.notes || "—",
          },
          registeredBy: ctx.user.name,
        }).catch(() => {});
      }

      return { success: true };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      date: z.string().optional(),
      recordType: z.enum(["abastecimento", "manutencao", "km"]).optional(),
      fuelType: z.enum(["diesel", "gasolina", "etanol", "gnv"]).optional().nullable(),
      liters: z.string().optional().nullable(),
      fuelCost: z.string().optional().nullable(),
      pricePerLiter: z.string().optional().nullable(),
      supplier: z.string().optional().nullable(),
      odometer: z.string().optional().nullable(),
      kmDriven: z.string().optional().nullable(),
      maintenanceType: z.string().optional().nullable(),
      maintenanceCost: z.string().optional().nullable(),
      serviceType: z.enum(["proprio", "terceirizado"]).optional().nullable(),
      mechanicName: z.string().optional().nullable(),
      driverCollaboratorId: z.number().optional().nullable(),
      photoBase64: z.string().optional().nullable(),
      notes: z.string().optional().nullable(),
      workLocationId: z.number().optional().nullable(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const { id, photoBase64, date, ...rest } = input;
      let photoUrl: string | undefined;
      if (photoBase64 && photoBase64.startsWith("data:")) {
        const { cloudinaryUpload } = await import("../cloudinary");
        const result = await cloudinaryUpload(photoBase64, "btree/vehicle-records");
        photoUrl = result.url;
      }
      const updateData: Record<string, unknown> = { ...rest };
      if (date) updateData.date = new Date(date);
      if (photoUrl) updateData.photoUrl = photoUrl;
      await db.update(vehicleRecords).set(updateData).where(eq(vehicleRecords.id, id));
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
