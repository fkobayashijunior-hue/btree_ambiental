import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import {
  collaboratorAttendance,
  collaborators,
  fuelRecords,
  machineFuel,
  machineHours,
  extraExpenses,
  cargoLoads,
  equipment,
  gpsLocations,
  vehicleRecords,
} from "../../drizzle/schema";
import { eq, desc, and, gte, lte, sql, inArray, isNull } from "drizzle-orm";

export const reportsRouter = router({
  // ── Listar todos os locais de trabalho (para filtro) ──────────────────────
  locations: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB indisponível" });
    return db.select({ id: gpsLocations.id, name: gpsLocations.name, isActive: gpsLocations.isActive })
      .from(gpsLocations)
      .orderBy(gpsLocations.name);
  }),

  // ── Padronizar nomes de locais (atualizar locationName em registros antigos) ──
  standardizeLocationNames: protectedProcedure
    .input(z.object({
      oldName: z.string(),
      newLocationId: z.number(),
      newLocationName: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB indisponível" });

      // Atualizar locationName e workLocationId em presenças com o nome antigo
      await db.execute(sql`
        UPDATE collaborator_attendance 
        SET location_name = ${input.newLocationName}, work_location_id = ${input.newLocationId}
        WHERE location_name = ${input.oldName}
      `);

      return { success: true };
    }),

  // ── Listar nomes de locais únicos (para padronização) ──────────────────────
  uniqueLocationNames: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB indisponível" });

    const results = await db.execute(sql`
      SELECT DISTINCT location_name FROM collaborator_attendance 
      WHERE location_name IS NOT NULL AND location_name != ''
      ORDER BY location_name
    `);

    return (results as any)[0]?.map((r: any) => r.location_name) || [];
  }),

  // ── Relatório completo por local e período ─────────────────────────────────
  fullReport: protectedProcedure
    .input(z.object({
      locationId: z.number().optional(), // null = todos os locais
      dateFrom: z.string(), // YYYY-MM-DD
      dateTo: z.string(),   // YYYY-MM-DD
      includeMaoDeObra: z.boolean().default(true),
      includeConsumo: z.boolean().default(true),
      includeCargas: z.boolean().default(true),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB indisponível" });

      const dateFrom = input.dateFrom + " 00:00:00";
      const dateTo = input.dateTo + " 23:59:59";

      // ── MÃO DE OBRA (Presenças) ──
      let maoDeObra: any[] = [];
      if (input.includeMaoDeObra) {
        const attendanceQuery = db
          .select({
            id: collaboratorAttendance.id,
            collaboratorName: collaborators.name,
            collaboratorRole: collaborators.role,
            date: collaboratorAttendance.date,
            employmentType: collaboratorAttendance.employmentTypeCa,
            dailyValue: collaboratorAttendance.dailyValue,
            activity: collaboratorAttendance.activity,
            paymentStatus: collaboratorAttendance.paymentStatusCa,
            locationName: collaboratorAttendance.locationName,
            workLocationId: collaboratorAttendance.workLocationId,
          })
          .from(collaboratorAttendance)
          .innerJoin(collaborators, eq(collaboratorAttendance.collaboratorId, collaborators.id))
          .where(
            and(
              gte(collaboratorAttendance.date, dateFrom),
              lte(collaboratorAttendance.date, dateTo),
              ...(input.locationId ? [eq(collaboratorAttendance.workLocationId, input.locationId)] : [])
            )
          )
          .orderBy(desc(collaboratorAttendance.date));

        maoDeObra = await attendanceQuery;
      }

      // ── CONSUMO (Combustível veículos) ──
      let consumoVeiculos: any[] = [];
      if (input.includeConsumo) {
        consumoVeiculos = await db
          .select({
            id: fuelRecords.id,
            date: fuelRecords.date,
            equipmentName: equipment.name,
            equipmentPlate: equipment.plate,
            fuelType: fuelRecords.fuelType,
            liters: fuelRecords.liters,
            totalValue: fuelRecords.totalValue,
            pricePerLiter: fuelRecords.pricePerLiter,
            station: fuelRecords.station,
            workLocationId: fuelRecords.workLocationId,
          })
          .from(fuelRecords)
          .innerJoin(equipment, eq(fuelRecords.equipmentId, equipment.id))
          .where(
            and(
              gte(fuelRecords.date, dateFrom),
              lte(fuelRecords.date, dateTo),
              ...(input.locationId ? [eq(fuelRecords.workLocationId, input.locationId)] : [])
            )
          )
          .orderBy(desc(fuelRecords.date));
      }

      // ── CONSUMO (Combustível máquinas) ──
      let consumoMaquinas: any[] = [];
      if (input.includeConsumo) {
        consumoMaquinas = await db
          .select({
            id: machineFuel.id,
            date: machineFuel.date,
            equipmentName: equipment.name,
            fuelType: machineFuel.fuelType,
            liters: machineFuel.liters,
            totalValue: machineFuel.totalValue,
            pricePerLiter: machineFuel.pricePerLiter,
            supplier: machineFuel.supplier,
            workLocationId: machineFuel.workLocationId,
          })
          .from(machineFuel)
          .innerJoin(equipment, eq(machineFuel.equipmentId, equipment.id))
          .where(
            and(
              gte(machineFuel.date, dateFrom),
              lte(machineFuel.date, dateTo),
              ...(input.locationId ? [eq(machineFuel.workLocationId, input.locationId)] : [])
            )
          )
          .orderBy(desc(machineFuel.date));
      }

      // ── CONSUMO (Despesas extras) ──
      let despesasExtras: any[] = [];
      if (input.includeConsumo) {
        despesasExtras = await db
          .select({
            id: extraExpenses.id,
            date: extraExpenses.date,
            category: extraExpenses.category,
            description: extraExpenses.description,
            amount: extraExpenses.amount,
            paymentMethod: extraExpenses.paymentMethod,
            workLocationId: extraExpenses.workLocationId,
          })
          .from(extraExpenses)
          .where(
            and(
              gte(extraExpenses.date, dateFrom),
              lte(extraExpenses.date, dateTo),
              ...(input.locationId ? [eq(extraExpenses.workLocationId, input.locationId)] : [])
            )
          )
          .orderBy(desc(extraExpenses.date));
      }

      // ── CARGAS ──
      let cargas: any[] = [];
      if (input.includeCargas) {
        cargas = await db
          .select({
            id: cargoLoads.id,
            date: cargoLoads.date,
            vehiclePlate: cargoLoads.vehiclePlate,
            driverName: cargoLoads.driverName,
            heightM: cargoLoads.heightM,
            widthM: cargoLoads.widthM,
            lengthM: cargoLoads.lengthM,
            volumeM3: cargoLoads.volumeM3,
            woodType: cargoLoads.woodType,
            destination: cargoLoads.destination,
            status: cargoLoads.status,
            workLocationId: cargoLoads.workLocationId,
          })
          .from(cargoLoads)
          .where(
            and(
              gte(cargoLoads.date, dateFrom),
              lte(cargoLoads.date, dateTo),
              ...(input.locationId ? [eq(cargoLoads.workLocationId, input.locationId)] : [])
            )
          )
          .orderBy(desc(cargoLoads.date));
      }

      // ── RESUMO ──
      const totalMaoDeObra = maoDeObra.reduce((sum, r) => sum + parseFloat(r.dailyValue || "0"), 0);
      const totalCombustivelVeiculos = consumoVeiculos.reduce((sum, r) => sum + parseFloat(r.totalValue || "0"), 0);
      const totalCombustivelMaquinas = consumoMaquinas.reduce((sum, r) => sum + parseFloat(r.totalValue || "0"), 0);
      const totalDespesasExtras = despesasExtras.reduce((sum, r) => sum + parseFloat(r.amount || "0"), 0);
      const totalLitrosVeiculos = consumoVeiculos.reduce((sum, r) => sum + parseFloat(r.liters || "0"), 0);
      const totalLitrosMaquinas = consumoMaquinas.reduce((sum, r) => sum + parseFloat(r.liters || "0"), 0);
      const totalVolumeCargas = cargas.reduce((sum, r) => sum + parseFloat(r.volumeM3 || "0"), 0);

      return {
        periodo: { de: input.dateFrom, ate: input.dateTo },
        maoDeObra: {
          registros: maoDeObra,
          totalDias: maoDeObra.length,
          totalValor: totalMaoDeObra,
          colaboradoresUnicos: new Set(maoDeObra.map(r => r.collaboratorName)).size,
          pendentes: maoDeObra.filter(r => r.paymentStatus === "pendente").length,
          pagos: maoDeObra.filter(r => r.paymentStatus === "pago").length,
        },
        consumo: {
          veiculos: consumoVeiculos,
          maquinas: consumoMaquinas,
          despesasExtras: despesasExtras,
          totalCombustivelValor: totalCombustivelVeiculos + totalCombustivelMaquinas,
          totalCombustivelLitros: totalLitrosVeiculos + totalLitrosMaquinas,
          totalDespesasExtras: totalDespesasExtras,
          totalConsumo: totalCombustivelVeiculos + totalCombustivelMaquinas + totalDespesasExtras,
        },
        cargas: {
          registros: cargas,
          totalCargas: cargas.length,
          totalVolumeM3: totalVolumeCargas,
        },
        resumo: {
          custoTotal: totalMaoDeObra + totalCombustivelVeiculos + totalCombustivelMaquinas + totalDespesasExtras,
          totalMaoDeObra,
          totalConsumo: totalCombustivelVeiculos + totalCombustivelMaquinas + totalDespesasExtras,
          totalCargas: cargas.length,
          totalVolumeM3: totalVolumeCargas,
        },
      };
    }),

  // ── Dashboard resumo por local (para a tela executiva) ─────────────────────
  dashboardByLocation: protectedProcedure
    .input(z.object({
      dateFrom: z.string(),
      dateTo: z.string(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB indisponível" });

      const dateFrom = input.dateFrom + " 00:00:00";
      const dateTo = input.dateTo + " 23:59:59";

      // Buscar todos os locais
      const locations = await db.select({ id: gpsLocations.id, name: gpsLocations.name })
        .from(gpsLocations)
        .where(eq(gpsLocations.isActive, 1))
        .orderBy(gpsLocations.name);

      // Para cada local, buscar totais
      const locationData = await Promise.all(locations.map(async (loc) => {
        // Mão de obra
        const attendance = await db
          .select({ dailyValue: collaboratorAttendance.dailyValue })
          .from(collaboratorAttendance)
          .where(and(
            eq(collaboratorAttendance.workLocationId, loc.id),
            gte(collaboratorAttendance.date, dateFrom),
            lte(collaboratorAttendance.date, dateTo),
          ));
        const totalMaoDeObra = attendance.reduce((s, r) => s + parseFloat(r.dailyValue || "0"), 0);

        // Combustível veículos
        const fuel = await db
          .select({ totalValue: fuelRecords.totalValue, liters: fuelRecords.liters })
          .from(fuelRecords)
          .where(and(
            eq(fuelRecords.workLocationId, loc.id),
            gte(fuelRecords.date, dateFrom),
            lte(fuelRecords.date, dateTo),
          ));
        const totalFuel = fuel.reduce((s, r) => s + parseFloat(r.totalValue || "0"), 0);
        const totalFuelLiters = fuel.reduce((s, r) => s + parseFloat(r.liters || "0"), 0);

        // Combustível máquinas
        const mfuel = await db
          .select({ totalValue: machineFuel.totalValue, liters: machineFuel.liters })
          .from(machineFuel)
          .where(and(
            eq(machineFuel.workLocationId, loc.id),
            gte(machineFuel.date, dateFrom),
            lte(machineFuel.date, dateTo),
          ));
        const totalMFuel = mfuel.reduce((s, r) => s + parseFloat(r.totalValue || "0"), 0);
        const totalMFuelLiters = mfuel.reduce((s, r) => s + parseFloat(r.liters || "0"), 0);

        // Despesas extras
        const extras = await db
          .select({ amount: extraExpenses.amount })
          .from(extraExpenses)
          .where(and(
            eq(extraExpenses.workLocationId, loc.id),
            gte(extraExpenses.date, dateFrom),
            lte(extraExpenses.date, dateTo),
          ));
        const totalExtras = extras.reduce((s, r) => s + parseFloat(r.amount || "0"), 0);

        // Cargas
        const cargos = await db
          .select({ volumeM3: cargoLoads.volumeM3 })
          .from(cargoLoads)
          .where(and(
            eq(cargoLoads.workLocationId, loc.id),
            gte(cargoLoads.date, dateFrom),
            lte(cargoLoads.date, dateTo),
          ));
        const totalVolume = cargos.reduce((s, r) => s + parseFloat(r.volumeM3 || "0"), 0);

        return {
          locationId: loc.id,
          locationName: loc.name,
          maoDeObra: { total: totalMaoDeObra, dias: attendance.length },
          combustivel: { total: totalFuel + totalMFuel, litros: totalFuelLiters + totalMFuelLiters },
          despesasExtras: { total: totalExtras, qtd: extras.length },
          cargas: { total: cargos.length, volumeM3: totalVolume },
          custoTotal: totalMaoDeObra + totalFuel + totalMFuel + totalExtras,
        };
      }));

      // Sem local atribuído
      const unassignedAttendance = await db
        .select({ dailyValue: collaboratorAttendance.dailyValue })
        .from(collaboratorAttendance)
        .where(and(
          isNull(collaboratorAttendance.workLocationId),
          gte(collaboratorAttendance.date, dateFrom),
          lte(collaboratorAttendance.date, dateTo),
        ));

      const unassignedTotal = unassignedAttendance.reduce((s, r) => s + parseFloat(r.dailyValue || "0"), 0);

      return {
        locations: locationData,
        unassigned: {
          maoDeObra: { total: unassignedTotal, dias: unassignedAttendance.length },
        },
        totals: {
          custoTotal: locationData.reduce((s, l) => s + l.custoTotal, 0) + unassignedTotal,
          totalMaoDeObra: locationData.reduce((s, l) => s + l.maoDeObra.total, 0) + unassignedTotal,
          totalCombustivel: locationData.reduce((s, l) => s + l.combustivel.total, 0),
          totalDespesas: locationData.reduce((s, l) => s + l.despesasExtras.total, 0),
          totalCargas: locationData.reduce((s, l) => s + l.cargas.total, 0),
          totalVolumeM3: locationData.reduce((s, l) => s + l.cargas.volumeM3, 0),
        },
      };
    }),
});
