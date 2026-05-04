import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { machineHours, machineMaintenance, machineFuel, equipment, gpsLocations, userPermissions, collaborators } from "../../drizzle/schema";
import { eq, desc, sql, inArray } from "drizzle-orm";

// Helper: resolve allowedClientIds for the current user
async function resolveAllowedClientIds(db: any, ctx: any): Promise<number[] | null> {
  if (ctx.user.role === "admin") return null;

  let allowedClientIds: number[] | null = null;

  // Tentar buscar da tabela user_permissions
  try {
    const [perm] = await db.select().from(userPermissions).where(eq(userPermissions.userId, ctx.user.id));
    if (perm?.allowedClientIds) {
      allowedClientIds = JSON.parse(perm.allowedClientIds) as number[];
    }
  } catch {
    try {
      const [rows] = await db.execute(sql`SELECT allowed_client_ids FROM user_permissions WHERE user_id = ${ctx.user.id} LIMIT 1`);
      const row = (rows as any[])?.[0];
      if (row?.allowed_client_ids) {
        allowedClientIds = JSON.parse(row.allowed_client_ids) as number[];
      }
    } catch {
      // Ignorar
    }
  }

  // Fallback: verificar collaborator.client_id
  if (!allowedClientIds) {
    try {
      const [collab] = await db.select({ clientId: collaborators.clientId })
        .from(collaborators).where(eq(collaborators.userId, ctx.user.id));
      if (collab?.clientId) {
        allowedClientIds = [collab.clientId];
      }
    } catch {
      // Ignorar
    }
  }

  return allowedClientIds;
}

// Helper: get location IDs linked to allowed clients
async function getAllowedLocationIds(db: any, allowedClientIds: number[]): Promise<number[]> {
  const locs = await db.select({ id: gpsLocations.id })
    .from(gpsLocations)
    .where(inArray(gpsLocations.clientId, allowedClientIds));
  return locs.map((l: any) => l.id);
}

export const machineHoursRouter = router({
  // === HORAS TRABALHADAS ===
  listHours: protectedProcedure
    .input(z.object({ equipmentId: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      // Resolve allowed client IDs
      const allowedClientIds = await resolveAllowedClientIds(db, ctx);
      let allowedLocationIds: number[] | null = null;
      if (allowedClientIds && allowedClientIds.length > 0) {
        allowedLocationIds = await getAllowedLocationIds(db, allowedClientIds);
      }

      const results = await db.select().from(machineHours).orderBy(desc(machineHours.createdAt));
      let filtered = input?.equipmentId ? results.filter((r: any) => r.equipmentId === input.equipmentId) : results;

      // Filtro server-side por allowedClientIds (via workLocationId)
      if (allowedClientIds && allowedClientIds.length > 0 && allowedLocationIds) {
        filtered = filtered.filter((r: any) => {
          if (r.workLocationId && allowedLocationIds!.includes(r.workLocationId)) return true;
          return false;
        });
      }

      // Resolver nomes dos locais
      const locIdsRaw = filtered.map((r: any) => r.workLocationId).filter((id: any): id is number => id !== null && id !== undefined);
      const locIds = Array.from(new Set(locIdsRaw));
      let locMap: Record<number, string> = {};
      if (locIds.length > 0) {
        const locsData = await db.select({ id: gpsLocations.id, name: gpsLocations.name }).from(gpsLocations).where(inArray(gpsLocations.id, locIds as number[]));
        locMap = Object.fromEntries(locsData.map((l: any) => [l.id, l.name]));
      }
      return filtered.map((r: any) => ({ ...r, locationName: r.workLocationId ? locMap[r.workLocationId] || null : null }));
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
        date: input.date,
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
      workLocationId: z.number().optional().nullable(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const { id, date, ...rest } = input;
      await db.update(machineHours).set({
        ...rest,
        ...(date ? { date } : {}),
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
      if (input?.equipmentId) return results.filter((r: any) => r.equipmentId === input.equipmentId);
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
        date: input.date,
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
        ...(date ? { date } : {}),
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
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      // Resolve allowed client IDs
      const allowedClientIds = await resolveAllowedClientIds(db, ctx);
      let allowedLocationIds: number[] | null = null;
      if (allowedClientIds && allowedClientIds.length > 0) {
        allowedLocationIds = await getAllowedLocationIds(db, allowedClientIds);
      }

      const results = await db.select().from(machineFuel).orderBy(desc(machineFuel.createdAt));
      let filteredFuel = input?.equipmentId ? results.filter((r: any) => r.equipmentId === input.equipmentId) : results;

      // Filtro server-side por allowedClientIds (via workLocationId)
      if (allowedClientIds && allowedClientIds.length > 0 && allowedLocationIds) {
        filteredFuel = filteredFuel.filter((r: any) => {
          if (r.workLocationId && allowedLocationIds!.includes(r.workLocationId)) return true;
          return false;
        });
      }

      const fuelLocIdsRaw = filteredFuel.map((r: any) => r.workLocationId).filter((id: any): id is number => id !== null && id !== undefined);
      const fuelLocIds = Array.from(new Set(fuelLocIdsRaw));
      let fuelLocMap: Record<number, string> = {};
      if (fuelLocIds.length > 0) {
        const locsData = await db.select({ id: gpsLocations.id, name: gpsLocations.name }).from(gpsLocations).where(inArray(gpsLocations.id, fuelLocIds as number[]));
        fuelLocMap = Object.fromEntries(locsData.map((l: any) => [l.id, l.name]));
      }
      return filteredFuel.map((r: any) => ({ ...r, locationName: r.workLocationId ? fuelLocMap[r.workLocationId] || null : null }));
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
        date: input.date,
        registeredBy: ctx.user.id,
        workLocationId: workLocationId || null,
      });
      return { success: true };
    }),

  updateFuel: protectedProcedure
    .input(z.object({
      id: z.number(),
      workLocationId: z.number().optional().nullable(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const { id, ...rest } = input;
      await db.update(machineFuel).set(rest).where(eq(machineFuel.id, id));
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
  maintenanceAlerts: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

    const maintenances = await db
      .select()
      .from(machineMaintenance)
      .orderBy(desc(machineMaintenance.createdAt));

    const hoursRecords = await db
      .select()
      .from(machineHours)
      .orderBy(desc(machineHours.createdAt));

    const equipmentList = await db.select().from(equipment);
    const equipMap = Object.fromEntries(equipmentList.map((e: any) => [e.id, e.name]));

    const lastMaintByEquip: Record<number, any> = {};
    for (const m of maintenances) {
      if (m.nextMaintenanceHours && !lastMaintByEquip[m.equipmentId]) {
        lastMaintByEquip[m.equipmentId] = m;
      }
    }

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
      lastMaintenanceDate: string;
      maintenanceType: string;
    }> = [];

    for (const [equipIdStr, maint] of Object.entries(lastMaintByEquip)) {
      const equipId = parseInt(equipIdStr);
      const currentHour = parseFloat(lastHourByEquip[equipId] || "0");
      const nextMaintHour = parseFloat(maint.nextMaintenanceHours!);

      if (isNaN(nextMaintHour)) continue;

      const hoursRemaining = nextMaintHour - currentHour;

      if (hoursRemaining <= 50) {
        alerts.push({
          equipmentId: equipId,
          equipmentName: equipMap[equipId] || `Equipamento #${equipId}`,
          currentHourMeter: currentHour,
          nextMaintenanceHours: nextMaintHour,
          hoursRemaining,
          isOverdue: hoursRemaining < 0,
          lastMaintenanceDate: maint.date as string,
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

    return equipmentList.map((eq: any) => {
      const eqHours = hoursRecords.filter((h: any) => h.equipmentId === eq.id);
      const eqMaint = maintenances.filter((m: any) => m.equipmentId === eq.id);
      const eqFuel = fuelRecords.filter((f: any) => f.equipmentId === eq.id);

      const totalHours = eqHours.reduce((sum: number, h: any) => sum + (parseFloat(h.hoursWorked) || 0), 0);
      const totalFuelLiters = eqFuel.reduce((sum: number, f: any) => sum + (parseFloat(f.liters) || 0), 0);
      const totalFuelCost = eqFuel.reduce((sum: number, f: any) => sum + (parseFloat(f.totalValue || "0") || 0), 0);
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
