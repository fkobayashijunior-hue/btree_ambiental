import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { freightTrips, geofences, equipment, collaborators } from "../../drizzle/schema";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível" });
  return db;
}

export const freightTripsRouter = router({
  // Listar fretes com filtro de data
  list: protectedProcedure
    .input(
      z.object({
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        status: z.enum(["open", "closed", "cancelled", "all"]).default("all"),
        geofenceId: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions = [];
      if (input.dateFrom) {
        conditions.push(gte(freightTrips.entryAt, input.dateFrom));
      }
      if (input.dateTo) {
        // Adiciona 1 dia para incluir o dia final
        const dateTo = new Date(input.dateTo);
        dateTo.setDate(dateTo.getDate() + 1);
        conditions.push(lte(freightTrips.entryAt, dateTo.toISOString().slice(0, 10)));
      }
      if (input.status !== "all") {
        conditions.push(eq(freightTrips.status, input.status));
      }
      if (input.geofenceId) {
        conditions.push(eq(freightTrips.geofenceId, input.geofenceId));
      }

      const rows = await db
        .select()
        .from(freightTrips)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(freightTrips.entryAt));
      return rows;
    }),

  // Buscar frete por ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const rows = await db.select().from(freightTrips).where(eq(freightTrips.id, input.id));
      return rows[0] ?? null;
    }),

  // Abrir frete manualmente
  open: protectedProcedure
    .input(
      z.object({
        geofenceId: z.number(),
        vehicleId: z.number().optional(),
        vehicleName: z.string().optional(),
        driverId: z.number().optional(),
        driverName: z.string().optional(),
        originName: z.string().default("SIMFLOR"),
        destinationName: z.string().optional(),
        entryAt: z.string().optional(), // ISO timestamp, default = now
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const entryAt = input.entryAt ?? new Date().toISOString().slice(0, 19).replace("T", " ");
      const [result] = await db.insert(freightTrips).values({
        geofenceId: input.geofenceId,
        vehicleId: input.vehicleId ?? null,
        vehicleName: input.vehicleName ?? null,
        driverId: input.driverId ?? null,
        driverName: input.driverName ?? null,
        status: "open",
        originName: input.originName,
        destinationName: input.destinationName ?? null,
        entryAt,
        tollCost: "0",
        maintenanceCost: "0",
        fuelCost: "0",
        totalCost: "0",
      });
      return { id: (result as any).insertId };
    }),

  // Fechar frete
  close: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        exitAt: z.string().optional(), // ISO timestamp, default = now
        distanceKm: z.string().optional(),
        traccarPositionsJson: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const exitAt = input.exitAt ?? new Date().toISOString().slice(0, 19).replace("T", " ");
      await db
        .update(freightTrips)
        .set({
          status: "closed",
          exitAt,
          distanceKm: input.distanceKm ?? null,
          traccarPositionsJson: input.traccarPositionsJson ?? null,
        })
        .where(eq(freightTrips.id, input.id));
      return { success: true };
    }),

  // Atualizar dados do frete (destino, notas, custos)
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        destinationName: z.string().nullable().optional(),
        routeNotes: z.string().nullable().optional(),
        tollCost: z.string().optional(),
        maintenanceCost: z.string().optional(),
        fuelCost: z.string().optional(),
        distanceKm: z.string().nullable().optional(),
        status: z.enum(["open", "closed", "cancelled"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const { id, ...fields } = input;
      const updateData: Record<string, unknown> = {};
      if (fields.destinationName !== undefined) updateData.destinationName = fields.destinationName;
      if (fields.routeNotes !== undefined) updateData.routeNotes = fields.routeNotes;
      if (fields.tollCost !== undefined) updateData.tollCost = fields.tollCost;
      if (fields.maintenanceCost !== undefined) updateData.maintenanceCost = fields.maintenanceCost;
      if (fields.fuelCost !== undefined) updateData.fuelCost = fields.fuelCost;
      if (fields.distanceKm !== undefined) updateData.distanceKm = fields.distanceKm;
      if (fields.status !== undefined) updateData.status = fields.status;

      // Recalcular custo total
      const [current] = await db.select().from(freightTrips).where(eq(freightTrips.id, id));
      if (current) {
        const toll = parseFloat((updateData.tollCost as string) ?? current.tollCost ?? "0") || 0;
        const maint = parseFloat((updateData.maintenanceCost as string) ?? current.maintenanceCost ?? "0") || 0;
        const fuel = parseFloat((updateData.fuelCost as string) ?? current.fuelCost ?? "0") || 0;
        updateData.totalCost = (toll + maint + fuel).toFixed(2);
      }

      await db.update(freightTrips).set(updateData as any).where(eq(freightTrips.id, id));
      return { success: true };
    }),

  // Cancelar frete
  cancel: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db
        .update(freightTrips)
        .set({ status: "cancelled" })
        .where(eq(freightTrips.id, input.id));
      return { success: true };
    }),

  // Buscar frete aberto para uma porteira específica
  getOpenTrip: protectedProcedure
    .input(z.object({ geofenceId: z.number() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const rows = await db
        .select()
        .from(freightTrips)
        .where(and(eq(freightTrips.geofenceId, input.geofenceId), eq(freightTrips.status, "open")))
        .orderBy(desc(freightTrips.entryAt))
        .limit(1);
      return rows[0] ?? null;
    }),

  // Estatísticas de fretes
  stats: protectedProcedure
    .input(
      z.object({
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        geofenceId: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions = [];
      if (input.dateFrom) conditions.push(gte(freightTrips.entryAt, input.dateFrom));
      if (input.dateTo) {
        const dateTo = new Date(input.dateTo);
        dateTo.setDate(dateTo.getDate() + 1);
        conditions.push(lte(freightTrips.entryAt, dateTo.toISOString().slice(0, 10)));
      }
      if (input.geofenceId) conditions.push(eq(freightTrips.geofenceId, input.geofenceId));

      const rows = await db
        .select()
        .from(freightTrips)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      const total = rows.length;
      const open = rows.filter((r) => r.status === "open").length;
      const closed = rows.filter((r) => r.status === "closed").length;
      const totalKm = rows.reduce((acc, r) => acc + (parseFloat(r.distanceKm ?? "0") || 0), 0);
      const totalCost = rows.reduce((acc, r) => acc + (parseFloat(r.totalCost ?? "0") || 0), 0);

      return { total, open, closed, totalKm: totalKm.toFixed(1), totalCost: totalCost.toFixed(2) };
    }),
});
