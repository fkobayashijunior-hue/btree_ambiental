import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { freightCalculations } from "../../drizzle/schema";
import { eq, desc, sql } from "drizzle-orm";

export const freightRouter = router({
  list: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      let query = `SELECT * FROM freight_calculations ORDER BY id DESC`;
      if (input?.startDate && input?.endDate) {
        query = `SELECT * FROM freight_calculations WHERE date >= '${input.startDate}' AND date <= '${input.endDate}' ORDER BY id DESC`;
      }
      const [rows] = await db.execute(sql.raw(query)) as any;
      return rows || [];
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [rows] = await db.execute(sql`SELECT * FROM freight_calculations WHERE id = ${input.id}`) as any;
      if (!rows || rows.length === 0) throw new TRPCError({ code: "NOT_FOUND" });
      return rows[0];
    }),

  create: protectedProcedure
    .input(z.object({
      cargoLoadId: z.number().optional(),
      date: z.string().min(1),
      vehiclePlate: z.string().optional(),
      driverName: z.string().optional(),
      driverType: z.enum(['proprio', 'terceirizado']).optional(),
      origin: z.string().optional(),
      destination: z.string().optional(),
      distanceKm: z.string().optional(),
      fuelLiters: z.string().optional(),
      fuelCostPerLiter: z.string().optional(),
      fuelTotalCost: z.string().optional(),
      driverCost: z.string().optional(),
      tollCost: z.string().optional(),
      maintenanceCost: z.string().optional(),
      otherCosts: z.string().optional(),
      otherCostsDescription: z.string().optional(),
      totalCost: z.string().optional(),
      costPerKm: z.string().optional(),
      costPerTon: z.string().optional(),
      weightTon: z.string().optional(),
      revenuePerTon: z.string().optional(),
      totalRevenue: z.string().optional(),
      profit: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      await db.execute(sql`
        INSERT INTO freight_calculations (cargo_load_id, date, vehicle_plate, driver_name, driver_type, origin, destination, distance_km, fuel_liters, fuel_cost_per_liter, fuel_total_cost, driver_cost, toll_cost, maintenance_cost, other_costs, other_costs_description, total_cost, cost_per_km, cost_per_ton, weight_ton, revenue_per_ton, total_revenue, profit, notes, created_by, created_at)
        VALUES (${input.cargoLoadId || null}, ${input.date}, ${input.vehiclePlate || null}, ${input.driverName || null}, ${input.driverType || 'proprio'}, ${input.origin || null}, ${input.destination || null}, ${input.distanceKm || null}, ${input.fuelLiters || null}, ${input.fuelCostPerLiter || null}, ${input.fuelTotalCost || null}, ${input.driverCost || null}, ${input.tollCost || null}, ${input.maintenanceCost || null}, ${input.otherCosts || null}, ${input.otherCostsDescription || null}, ${input.totalCost || null}, ${input.costPerKm || null}, ${input.costPerTon || null}, ${input.weightTon || null}, ${input.revenuePerTon || null}, ${input.totalRevenue || null}, ${input.profit || null}, ${input.notes || null}, ${ctx.user.id}, ${now})
      `);
      return { success: true };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      cargoLoadId: z.number().optional(),
      date: z.string().optional(),
      vehiclePlate: z.string().optional(),
      driverName: z.string().optional(),
      driverType: z.enum(['proprio', 'terceirizado']).optional(),
      origin: z.string().optional(),
      destination: z.string().optional(),
      distanceKm: z.string().optional(),
      fuelLiters: z.string().optional(),
      fuelCostPerLiter: z.string().optional(),
      fuelTotalCost: z.string().optional(),
      driverCost: z.string().optional(),
      tollCost: z.string().optional(),
      maintenanceCost: z.string().optional(),
      otherCosts: z.string().optional(),
      otherCostsDescription: z.string().optional(),
      totalCost: z.string().optional(),
      costPerKm: z.string().optional(),
      costPerTon: z.string().optional(),
      weightTon: z.string().optional(),
      revenuePerTon: z.string().optional(),
      totalRevenue: z.string().optional(),
      profit: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...data } = input;
      await db.update(freightCalculations).set({
        cargoLoadId: data.cargoLoadId || null,
        date: data.date || undefined,
        vehiclePlate: data.vehiclePlate || null,
        driverName: data.driverName || null,
        driverType: data.driverType || 'proprio',
        origin: data.origin || null,
        destination: data.destination || null,
        distanceKm: data.distanceKm || null,
        fuelLiters: data.fuelLiters || null,
        fuelCostPerLiter: data.fuelCostPerLiter || null,
        fuelTotalCost: data.fuelTotalCost || null,
        driverCost: data.driverCost || null,
        tollCost: data.tollCost || null,
        maintenanceCost: data.maintenanceCost || null,
        otherCosts: data.otherCosts || null,
        otherCostsDescription: data.otherCostsDescription || null,
        totalCost: data.totalCost || null,
        costPerKm: data.costPerKm || null,
        costPerTon: data.costPerTon || null,
        weightTon: data.weightTon || null,
        revenuePerTon: data.revenuePerTon || null,
        totalRevenue: data.totalRevenue || null,
        profit: data.profit || null,
        notes: data.notes || null,
      } as any).where(eq(freightCalculations.id, id));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(freightCalculations).where(eq(freightCalculations.id, input.id));
      return { success: true };
    }),

  // Resumo de fretes por período
  summary: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      let whereClause = '';
      if (input?.startDate && input?.endDate) {
        whereClause = `WHERE date >= '${input.startDate}' AND date <= '${input.endDate}'`;
      }
      const [rows] = await db.execute(sql.raw(`
        SELECT 
          COUNT(*) as totalTrips,
          COALESCE(SUM(CAST(total_cost AS DECIMAL(10,2))), 0) as totalCost,
          COALESCE(SUM(CAST(total_revenue AS DECIMAL(10,2))), 0) as totalRevenue,
          COALESCE(SUM(CAST(profit AS DECIMAL(10,2))), 0) as totalProfit,
          COALESCE(SUM(CAST(distance_km AS DECIMAL(10,2))), 0) as totalKm,
          COALESCE(SUM(CAST(fuel_liters AS DECIMAL(10,2))), 0) as totalFuel
        FROM freight_calculations ${whereClause}
      `)) as any;
      return rows?.[0] || { totalTrips: 0, totalCost: 0, totalRevenue: 0, totalProfit: 0, totalKm: 0, totalFuel: 0 };
    }),
});
