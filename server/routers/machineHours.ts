import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { machineHours, machineMaintenance, machineFuel } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

export const machineHoursRouter = router({
  // === HORAS TRABALHADAS ===
  listHours: protectedProcedure
    .input(z.object({ equipmentId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const results = await db.select().from(machineHours).orderBy(desc(machineHours.createdAt));
      if (input?.equipmentId) return results.filter(r => r.equipmentId === input.equipmentId);
      return results;
    }),

  createHours: protectedProcedure
    .input(z.object({
      equipmentId: z.number(),
      operatorCollaboratorId: z.number().optional(),
      date: z.string(),
      startHourMeter: z.string(),
      endHourMeter: z.string(),
      hoursWorked: z.string(),
      activity: z.string().optional(),
      location: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      await db.insert(machineHours).values({
        ...input,
        date: new Date(input.date),
        registeredBy: ctx.user.id,
      });
      return { success: true };
    }),

  deleteHours: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      await db.delete(machineHours).where(eq(machineHours.id, input.id));
      return { success: true };
    }),

  // === MANUTENÇÕES ===
  listMaintenance: protectedProcedure
    .input(z.object({ equipmentId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const results = await db.select().from(machineMaintenance).orderBy(desc(machineMaintenance.createdAt));
      if (input?.equipmentId) return results.filter(r => r.equipmentId === input.equipmentId);
      return results;
    }),

  createMaintenance: protectedProcedure
    .input(z.object({
      equipmentId: z.number(),
      date: z.string(),
      hourMeter: z.string().optional(),
      type: z.enum(["preventiva", "corretiva", "revisao"]),
      serviceType: z.enum(["proprio", "terceirizado"]),
      mechanicCollaboratorId: z.number().optional(),
      mechanicName: z.string().optional(),
      thirdPartyCompany: z.string().optional(),
      partsReplaced: z.string().optional(), // JSON string
      laborCost: z.string().optional(),
      totalCost: z.string().optional(),
      description: z.string().optional(),
      nextMaintenanceHours: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      await db.insert(machineMaintenance).values({
        ...input,
        date: new Date(input.date),
        registeredBy: ctx.user.id,
      });
      return { success: true };
    }),

  deleteMaintenance: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      await db.delete(machineMaintenance).where(eq(machineMaintenance.id, input.id));
      return { success: true };
    }),

  // === ABASTECIMENTO ===
  listFuel: protectedProcedure
    .input(z.object({ equipmentId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const results = await db.select().from(machineFuel).orderBy(desc(machineFuel.createdAt));
      if (input?.equipmentId) return results.filter(r => r.equipmentId === input.equipmentId);
      return results;
    }),

  createFuel: protectedProcedure
    .input(z.object({
      equipmentId: z.number(),
      date: z.string(),
      hourMeter: z.string().optional(),
      fuelType: z.enum(["diesel", "gasolina", "mistura_2t", "arla"]),
      liters: z.string(),
      pricePerLiter: z.string().optional(),
      totalValue: z.string().optional(),
      supplier: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      await db.insert(machineFuel).values({
        ...input,
        date: new Date(input.date),
        registeredBy: ctx.user.id,
      });
      return { success: true };
    }),

  deleteFuel: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      await db.delete(machineFuel).where(eq(machineFuel.id, input.id));
      return { success: true };
    }),
});
