import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { machineHours, machineMaintenance, machineFuel, equipment } from "../../drizzle/schema";
import { eq, desc, sql } from "drizzle-orm";

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
      workLocationId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const { workLocationId, ...rest } = input;
      await db.insert(machineHours).values({
        ...rest,
        date: new Date(input.date),
        registeredBy: ctx.user.id,
        workLocationId: workLocationId || null,
      });
      return { success: true };
    }),

  updateHours: protectedProcedure
    .input(z.object({
      id: z.number(),
      date: z.string().optional(),
      startHourMeter: z.string().optional(),
      endHourMeter: z.string().optional(),
      hoursWorked: z.string().optional(),
      activity: z.string().optional().nullable(),
      location: z.string().optional().nullable(),
      notes: z.string().optional().nullable(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const { id, date, ...rest } = input;
      await db.update(machineHours).set({
        ...rest,
        ...(date ? { date: new Date(date) } : {}),
      }).where(eq(machineHours.id, id));
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

  updateMaintenance: protectedProcedure
    .input(z.object({
      id: z.number(),
      date: z.string().optional(),
      hourMeter: z.string().optional().nullable(),
      type: z.enum(["preventiva", "corretiva", "revisao"]).optional(),
      serviceType: z.enum(["proprio", "terceirizado"]).optional(),
      mechanicName: z.string().optional().nullable(),
      thirdPartyCompany: z.string().optional().nullable(),
      description: z.string().optional().nullable(),
      laborCost: z.string().optional().nullable(),
      totalCost: z.string().optional().nullable(),
      nextMaintenanceHours: z.string().optional().nullable(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const { id, date, ...rest } = input;
      await db.update(machineMaintenance).set({
        ...rest,
        ...(date ? { date: new Date(date) } : {}),
      }).where(eq(machineMaintenance.id, id));
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
      workLocationId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const { workLocationId, ...rest } = input;
      await db.insert(machineFuel).values({
        ...rest,
        date: new Date(input.date),
        registeredBy: ctx.user.id,
        workLocationId: workLocationId || null,
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

  // === ALERTAS DE MANUTENÇÃO PREVENTIVA ===
  // Retorna equipamentos que estão próximos ou passaram da próxima manutenção programada
  maintenanceAlerts: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

    // Buscar última manutenção com nextMaintenanceHours definido por equipamento
    const maintenances = await db
      .select()
      .from(machineMaintenance)
      .orderBy(desc(machineMaintenance.createdAt));

    // Buscar último horímetro registrado por equipamento
    const hoursRecords = await db
      .select()
      .from(machineHours)
      .orderBy(desc(machineHours.createdAt));

    // Buscar equipamentos
    const equipmentList = await db.select().from(equipment);
    const equipMap = Object.fromEntries(equipmentList.map(e => [e.id, e.name]));

    // Agrupar: última manutenção com nextMaintenanceHours por equipamento
    const lastMaintByEquip: Record<number, typeof machineMaintenance.$inferSelect> = {};
    for (const m of maintenances) {
      if (m.nextMaintenanceHours && !lastMaintByEquip[m.equipmentId]) {
        lastMaintByEquip[m.equipmentId] = m;
      }
    }

    // Último horímetro por equipamento
    const lastHourByEquip: Record<number, string> = {};
    for (const h of hoursRecords) {
      if (!lastHourByEquip[h.equipmentId]) {
        lastHourByEquip[h.equipmentId] = h.endHourMeter;
      }
    }

    const alerts: Array<{
      equipmentId: number;
      equipmentName: string;
      currentHourMeter: number;
      nextMaintenanceHours: number;
      hoursRemaining: number;
      isOverdue: boolean;
      lastMaintenanceDate: Date;
      maintenanceType: string;
    }> = [];

    for (const [equipIdStr, maint] of Object.entries(lastMaintByEquip)) {
      const equipId = parseInt(equipIdStr);
      const currentHour = parseFloat(lastHourByEquip[equipId] || "0");
      const nextMaintHour = parseFloat(maint.nextMaintenanceHours!);

      if (isNaN(nextMaintHour)) continue;

      const hoursRemaining = nextMaintHour - currentHour;

      // Alertar se estiver dentro de 50 horas da próxima manutenção ou já passou
      if (hoursRemaining <= 50) {
        alerts.push({
          equipmentId: equipId,
          equipmentName: equipMap[equipId] || `Equipamento #${equipId}`,
          currentHourMeter: currentHour,
          nextMaintenanceHours: nextMaintHour,
          hoursRemaining,
          isOverdue: hoursRemaining < 0,
          lastMaintenanceDate: maint.date,
          maintenanceType: maint.type,
        });
      }
    }

    return alerts.sort((a, b) => a.hoursRemaining - b.hoursRemaining);
  }),

  // === RESUMO POR EQUIPAMENTO ===
  equipmentSummary: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

    const equipmentList = await db.select().from(equipment);
    const hoursRecords = await db.select().from(machineHours).orderBy(desc(machineHours.createdAt));
    const maintenances = await db.select().from(machineMaintenance).orderBy(desc(machineMaintenance.createdAt));
    const fuelRecords = await db.select().from(machineFuel).orderBy(desc(machineFuel.createdAt));

    return equipmentList.map(eq => {
      const eqHours = hoursRecords.filter(h => h.equipmentId === eq.id);
      const eqMaint = maintenances.filter(m => m.equipmentId === eq.id);
      const eqFuel = fuelRecords.filter(f => f.equipmentId === eq.id);

      const totalHours = eqHours.reduce((sum, h) => sum + (parseFloat(h.hoursWorked) || 0), 0);
      const totalFuelLiters = eqFuel.reduce((sum, f) => sum + (parseFloat(f.liters) || 0), 0);
      const totalFuelCost = eqFuel.reduce((sum, f) => sum + (parseFloat(f.totalValue || "0") || 0), 0);
      const lastHourMeter = eqHours.length > 0 ? eqHours[0].endHourMeter : null;
      const lastMaintenance = eqMaint.length > 0 ? eqMaint[0] : null;

      return {
        equipmentId: eq.id,
        equipmentName: eq.name,
        brand: eq.brand,
        model: eq.model,
        status: eq.status,
        totalHoursWorked: totalHours,
        lastHourMeter,
        totalFuelLiters,
        totalFuelCost,
        maintenanceCount: eqMaint.length,
        lastMaintenanceDate: lastMaintenance?.date || null,
        nextMaintenanceHours: lastMaintenance?.nextMaintenanceHours || null,
      };
    });
  }),
});
