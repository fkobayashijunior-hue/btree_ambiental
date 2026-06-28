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
  machineMaintenance,
  equipmentMaintenance,
  thirdPartyFuel,
  financialEntries,
  cargoDestinations,
  buyerPayments,
  buyerClients,
  equipmentOilRecords,
  maintenanceParts,
  freightRates,
  clientPayments,
  clients,
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
      locationId: z.number().optional(),
      dateFrom: z.string(),
      dateTo: z.string(),
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
        maoDeObra = await db
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
      }

      // ── CONSUMO (Combustível veículos) ──
      let consumoVeiculos: any[] = [];
      if (input.includeConsumo) {
        consumoVeiculos = await db
          .select({
            id: fuelRecords.id,
            date: fuelRecords.date,
            equipmentName: equipment.name,
            equipmentPlate: equipment.licensePlate,
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
      locationId: z.number().optional(), // filtro por local específico
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB indisponível" });

      const dateFrom = input.dateFrom + " 00:00:00";
      const dateTo = input.dateTo + " 23:59:59";

      // Buscar todos os locais ativos
      const locations = await db.select({ id: gpsLocations.id, name: gpsLocations.name })
        .from(gpsLocations)
        .where(eq(gpsLocations.isActive, 1))
        .orderBy(gpsLocations.name);

      // Buscar IDs de caminhões terceirizados (para frete terceirizado)
      const thirdPartyTrucks = await db.select({ id: equipment.id })
        .from(equipment)
        .where(eq(equipment.isThirdParty, 1));
      const thirdPartyIds = thirdPartyTrucks.map(t => t.id);

      // Buscar tarifas de frete para calcular custo de frete terceirizado
      const allFreightRates = await db.select().from(freightRates);
      const locationRows = await db.select({ id: gpsLocations.id, name: gpsLocations.name }).from(gpsLocations);
      const locationMap = new Map(locationRows.map(l => [l.id, l.name]));

      // Helper fuzzy match para tarifas de frete (fallback)
      const fuzzyMatch = (a: string, b: string) => {
        const aL = a.toLowerCase().trim();
        const bL = b.toLowerCase().trim();
        if (aL === bL) return true;
        if (aL.includes(bL) || bL.includes(aL)) return true;
        const bWords = bL.split(/\s+/).filter((w: string) => w.length > 2);
        return bWords.length > 0 && bWords.every((w: string) => aL.includes(w));
      };

      // Buscar nome do destino por destinationId (para match com freight_rates)
      const destNameMap = new Map<number, string>();
      const allDestinations = await db.select({ id: cargoDestinations.id, name: cargoDestinations.name }).from(cargoDestinations);
      for (const d of allDestinations) destNameMap.set(d.id, d.name);

      // Helper: calcular custo de frete por carga (usando tarifas cadastradas)
      // Prioridade: 1) destination_id → nome exato, 2) destination text fuzzy match
      const calcFreightCost = (cargo: { vehicleId: number | null; workLocationId: number | null; destination: string | null; destinationId: number | null; weightNetKg: string | null }) => {
        if (!cargo.vehicleId || !thirdPartyIds.includes(cargo.vehicleId)) return 0;
        const worksiteName = cargo.workLocationId ? (locationMap.get(cargo.workLocationId) ?? '') : '';
        // Usar nome do destino via destinationId se disponível, senão usar campo texto
        const destName = (cargo.destinationId ? destNameMap.get(cargo.destinationId) : null) ?? cargo.destination ?? '';
        const weightTons = parseFloat(cargo.weightNetKg || '0') / 1000;
        // 1. Match exato por worksite + destination
        let rate = allFreightRates.find(r =>
          r.worksite.toLowerCase() === worksiteName.toLowerCase() &&
          r.destination.toLowerCase() === destName.toLowerCase()
        );
        // 2. Fuzzy match por worksite + destination
        if (!rate) rate = allFreightRates.find(r => fuzzyMatch(worksiteName, r.worksite) && fuzzyMatch(destName, r.destination));
        // 3. Fuzzy match só por destination
        if (!rate) rate = allFreightRates.find(r => fuzzyMatch(destName, r.destination));
        // 4. Fuzzy match só por worksite (último recurso)
        if (!rate && worksiteName) rate = allFreightRates.find(r => fuzzyMatch(worksiteName, r.worksite));
        return rate ? parseFloat(rate.ratePerTon) * weightTons : 0;
      };

      // ── DADOS GLOBAIS ──
      const locFilter = input.locationId ? [eq(collaboratorAttendance.workLocationId, input.locationId)] : [];
      const locCargoFilter = input.locationId ? [eq(cargoLoads.workLocationId, input.locationId)] : [];
      const locFuelFilter = input.locationId ? [eq(vehicleRecords.workLocationId, input.locationId)] : [];
      const locMFuelFilter = input.locationId ? [eq(machineFuel.workLocationId, input.locationId)] : [];
      const locExtrasFilter = input.locationId ? [eq(extraExpenses.workLocationId, input.locationId)] : [];
      const locVehicleMaintFilter = input.locationId ? [eq(vehicleRecords.workLocationId, input.locationId)] : [];

      // Mão de obra
      const allAttendance = await db
        .select({ dailyValue: collaboratorAttendance.dailyValue, workLocationId: collaboratorAttendance.workLocationId })
        .from(collaboratorAttendance)
        .where(and(gte(collaboratorAttendance.date, dateFrom), lte(collaboratorAttendance.date, dateTo), ...locFilter));

      // Combustível veículos (vehicle_records com recordType='abastecimento')
      const allVehicleFuel = await db
        .select({ fuelCost: vehicleRecords.fuelCost, liters: vehicleRecords.liters, workLocationId: vehicleRecords.workLocationId })
        .from(vehicleRecords)
        .where(and(eq(vehicleRecords.recordType, 'abastecimento'), gte(vehicleRecords.date, dateFrom), lte(vehicleRecords.date, dateTo), ...locFuelFilter));

      // Manutenções de veículos
      const allVehicleMaints = await db
        .select({ maintenanceCost: vehicleRecords.maintenanceCost, workLocationId: vehicleRecords.workLocationId })
        .from(vehicleRecords)
        .where(and(eq(vehicleRecords.recordType, 'manutencao'), gte(vehicleRecords.date, dateFrom), lte(vehicleRecords.date, dateTo), ...locVehicleMaintFilter));

      // Combustível máquinas
      const allMFuel = await db
        .select({ totalValue: machineFuel.totalValue, liters: machineFuel.liters, workLocationId: machineFuel.workLocationId })
        .from(machineFuel)
        .where(and(gte(machineFuel.date, dateFrom), lte(machineFuel.date, dateTo), ...locMFuelFilter));

      // Despesas extras
      const allExtras = await db
        .select({ amount: extraExpenses.amount, workLocationId: extraExpenses.workLocationId })
        .from(extraExpenses)
        .where(and(gte(extraExpenses.date, dateFrom), lte(extraExpenses.date, dateTo), ...locExtrasFilter));

      // Manutenções de equipamentos
      const allEquipMaints = await db
        .select({ cost: equipmentMaintenance.cost })
        .from(equipmentMaintenance)
        .where(and(gte(equipmentMaintenance.performedAt, dateFrom), lte(equipmentMaintenance.performedAt, dateTo)));

      const allEquipMaintsIds = await db
        .select({ id: equipmentMaintenance.id })
        .from(equipmentMaintenance)
        .where(and(gte(equipmentMaintenance.performedAt, dateFrom), lte(equipmentMaintenance.performedAt, dateTo)));
      const maintIds = allEquipMaintsIds.map(m => m.id);
      const allParts = maintIds.length > 0
        ? await db.select({ totalCost: maintenanceParts.totalCost })
          .from(maintenanceParts)
          .where(inArray(maintenanceParts.maintenanceId, maintIds))
        : [];

      // Manutenções de máquinas
      const allMachMaints = await db
        .select({ totalCost: machineMaintenance.totalCost })
        .from(machineMaintenance)
        .where(and(gte(machineMaintenance.date, dateFrom), lte(machineMaintenance.date, dateTo)));

      // Óleos de equipamentos
      const allOilRecords = await db
        .select({ totalValue: equipmentOilRecords.totalValue })
        .from(equipmentOilRecords)
        .where(and(gte(equipmentOilRecords.date, dateFrom), lte(equipmentOilRecords.date, dateTo)));

      // Combustível terceirizados
      const allTPFuel = await db
        .select({ total: thirdPartyFuel.total })
        .from(thirdPartyFuel)
        .where(and(gte(thirdPartyFuel.date, dateFrom), lte(thirdPartyFuel.date, dateTo)));

      // Cargas com destinationId para calcular receita estimada
      const allCargos = await db
        .select({
          id: cargoLoads.id,
          date: cargoLoads.date,
          deliveryDate: cargoLoads.deliveryDate,
          vehicleId: cargoLoads.vehicleId,
          vehiclePlate: cargoLoads.vehiclePlate,
          driverName: cargoLoads.driverName,
          volumeM3: cargoLoads.volumeM3,
          weightNetKg: cargoLoads.weightNetKg,
          workLocationId: cargoLoads.workLocationId,
          thirdPartyCost: cargoLoads.thirdPartyCost,
          thirdPartyContractor: cargoLoads.thirdPartyContractor,
          destinationId: cargoLoads.destinationId,
          destination: cargoLoads.destination,
          clientId: cargoLoads.clientId,
          clientName: cargoLoads.clientName,
          paymentStatus: cargoLoads.paymentStatus,
          invoiceNumber: cargoLoads.invoiceNumber,
          status: cargoLoads.status,
        })
        .from(cargoLoads)
        .where(and(gte(cargoLoads.date, dateFrom), lte(cargoLoads.date, dateTo), ...locCargoFilter));

      // Buscar destinos para calcular receita estimada (pricePerTon / pricePerM3)
      const destIds = Array.from(new Set(allCargos.map(c => c.destinationId).filter(Boolean))) as number[];
      const destMap = new Map<number, { pricePerTon: string | null; pricePerM3: string | null; priceType: string | null }>();
      if (destIds.length > 0) {
        const dests = await db.select({ id: cargoDestinations.id, pricePerTon: cargoDestinations.pricePerTon, pricePerM3: cargoDestinations.pricePerM3, priceType: cargoDestinations.priceType })
          .from(cargoDestinations)
          .where(inArray(cargoDestinations.id, destIds));
        for (const d of dests) destMap.set(d.id, d);
      }

      // Helper: calcular receita estimada por carga
      const calcEstimatedRevenue = (cargo: { destinationId: number | null; weightNetKg: string | null; volumeM3: string | null }) => {
        if (!cargo.destinationId) return 0;
        const dest = destMap.get(cargo.destinationId);
        if (!dest) return 0;
        const priceType = dest.priceType ?? 'ton';
        if (priceType === 'ton' || priceType === 'peso') {
          const price = parseFloat(dest.pricePerTon || '0');
          const weightTons = parseFloat(cargo.weightNetKg || '0') / 1000;
          return price * weightTons;
        } else {
          const price = parseFloat(dest.pricePerM3 || '0');
          const vol = parseFloat(cargo.volumeM3 || '0');
          return price * vol;
        }
      };

      // Buscar pagamentos de clientes (despesa: o que pagamos ao cliente fornecedor)
      const clientPaymentsData = await db
        .select({
          id: clientPayments.id,
          clientId: clientPayments.clientId,
          clientName: clients.name,
          grossAmount: clientPayments.grossAmount,
          netAmount: clientPayments.netAmount,
          status: clientPayments.status,
          referenceDate: clientPayments.referenceDate,
        })
        .from(clientPayments)
        .leftJoin(clients, eq(clientPayments.clientId, clients.id))
        .where(and(
          gte(clientPayments.referenceDate, dateFrom),
          lte(clientPayments.referenceDate, dateTo),
        ));

      // Receita: buyerPayments pagos no período
      const allBuyerPayments = await db
        .select({
          amount: buyerPayments.amount,
          paymentDate: buyerPayments.paymentDate,
          buyerId: buyerPayments.buyerId,
          buyerName: buyerClients.name,
          invoiceNumber: buyerPayments.invoiceNumber,
          notes: buyerPayments.notes,
        })
        .from(buyerPayments)
        .leftJoin(buyerClients, eq(buyerPayments.buyerId, buyerClients.id))
        .where(and(
          eq(buyerPayments.status, 'pago'),
          gte(buyerPayments.paymentDate, input.dateFrom),
          lte(buyerPayments.paymentDate, input.dateTo),
        ))
        .orderBy(desc(buyerPayments.paymentDate));

      // Receita: financialEntries manuais (autoGenerated=0)
      const allFinReceitas = await db
        .select({
          amount: financialEntries.amount,
          description: financialEntries.description,
          clientName: financialEntries.clientName,
          date: financialEntries.date,
        })
        .from(financialEntries)
        .where(and(
          eq(financialEntries.type, "receita"),
          eq(financialEntries.autoGenerated, 0),
          gte(financialEntries.date, dateFrom),
          lte(financialEntries.date, dateTo),
        ))
        .orderBy(desc(financialEntries.date));

      // ── CALCULAR TOTAIS ──
      const totalMaoDeObraGlobal = allAttendance.reduce((s, r) => s + parseFloat(r.dailyValue || "0"), 0);
      const totalVehicleFuelGlobal = allVehicleFuel.reduce((s, r) => s + parseFloat(r.fuelCost || "0"), 0);
      const totalMFuelGlobal = allMFuel.reduce((s, r) => s + parseFloat(r.totalValue || "0"), 0);
      const totalExtrasGlobal = allExtras.reduce((s, r) => s + parseFloat(r.amount || "0"), 0);
      const totalEquipMaintCost = allEquipMaints.reduce((s, r) => s + parseFloat(r.cost || "0"), 0);
      const totalPartsCost = allParts.reduce((s, r) => s + parseFloat(r.totalCost || "0"), 0);
      const totalMachMaintGlobal = allMachMaints.reduce((s, r) => s + parseFloat(r.totalCost || "0"), 0);
      const totalOilGlobal = allOilRecords.reduce((s, r) => s + parseFloat(r.totalValue || "0"), 0);
      const totalVehicleMaintGlobal = allVehicleMaints.reduce((s, r) => s + parseFloat(r.maintenanceCost || "0"), 0);
      const totalManutencaoGlobal = totalEquipMaintCost + totalPartsCost + totalMachMaintGlobal + totalOilGlobal + totalVehicleMaintGlobal;
      const totalTPFuelGlobal = allTPFuel.reduce((s, r) => s + parseFloat(r.total || "0"), 0);

      // CORTE terceirizado: cargas com thirdPartyContractor preenchido (campo thirdPartyCost = custo do corte)
      const corteTerceirizadoCargos = allCargos.filter(c =>
        c.thirdPartyContractor && c.thirdPartyContractor.trim() !== ''
      );
      const totalCorteTerceirizadoGlobal = corteTerceirizadoCargos.reduce((s, r) => s + parseFloat(r.thirdPartyCost || "0"), 0);

      // FRETE terceirizado: cargas de caminhões terceirizados — custo calculado pela tarifa (R$/ton × peso)
      const freteTercCargos = thirdPartyIds.length > 0
        ? allCargos.filter(c => c.vehicleId && thirdPartyIds.includes(c.vehicleId))
        : [];
      const totalFreteTerceirizadoGlobal = freteTercCargos.reduce((s, c) => s + calcFreightCost(c), 0);

      // PAGAMENTO DE CLIENTES (despesa com fornecedores de madeira)
      const totalPagamentoClientesGlobal = clientPaymentsData.reduce((s, r) => s + parseFloat(r.netAmount || "0"), 0);

      // RECEITA ESTIMADA: soma da receita estimada de todas as cargas
      const totalReceitaEstimadaGlobal = allCargos.reduce((s, c) => s + calcEstimatedRevenue(c), 0);

      // RECEITA REAL: buyerPayments pagos + financialEntries manuais
      const buyerPaymentsTotal = allBuyerPayments.reduce((s, r) => s + parseFloat(r.amount || "0"), 0);
      const finReceitasManualTotal = allFinReceitas.reduce((s, r) => s + parseFloat(r.amount || "0"), 0);
      const totalReceitaReal = buyerPaymentsTotal + finReceitasManualTotal;

      const totalCustoGlobal = totalMaoDeObraGlobal + totalVehicleFuelGlobal + totalMFuelGlobal + totalExtrasGlobal + totalManutencaoGlobal + totalCorteTerceirizadoGlobal + totalFreteTerceirizadoGlobal + totalTPFuelGlobal + totalPagamentoClientesGlobal;
      const lucroEstimadoGlobal = totalReceitaEstimadaGlobal - totalCustoGlobal;
      const lucroRealGlobal = totalReceitaReal - totalCustoGlobal;

      // ── ANÁLISE DIÁRIA GLOBAL ──
      const dailyMapGlobal = new Map<string, { cargas: number; volumeM3: number; receitaEstimada: number; receitaReal: number; custo: number }>();
      for (const c of allCargos) {
        const day = (c.date || '').slice(0, 10);
        if (!day) continue;
        const prev = dailyMapGlobal.get(day) || { cargas: 0, volumeM3: 0, receitaEstimada: 0, receitaReal: 0, custo: 0 };
        const recEst = calcEstimatedRevenue(c);
        // Custo por carga: corte + frete
        const cargoCusto = parseFloat(c.thirdPartyCost || '0') * (c.thirdPartyContractor ? 1 : 0)
          + calcFreightCost(c);
        dailyMapGlobal.set(day, {
          cargas: prev.cargas + 1,
          volumeM3: prev.volumeM3 + parseFloat(c.volumeM3 || '0'),
          receitaEstimada: prev.receitaEstimada + recEst,
          receitaReal: prev.receitaReal,
          custo: prev.custo + cargoCusto,
        });
      }
      // Adicionar receita real por dia (buyerPayments)
      for (const p of allBuyerPayments) {
        const day = p.paymentDate?.slice(0, 10) ?? '';
        if (!day) continue;
        const prev = dailyMapGlobal.get(day) || { cargas: 0, volumeM3: 0, receitaEstimada: 0, receitaReal: 0, custo: 0 };
        dailyMapGlobal.set(day, { ...prev, receitaReal: prev.receitaReal + parseFloat(p.amount || '0') });
      }
      const dailyBreakdownGlobal = Array.from(dailyMapGlobal.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, v]) => ({ date, ...v, receita: v.receitaEstimada }));

      // ── DADOS POR LOCAL (para tabela detalhada) ──
      const locationData = locations.map(loc => {
        const locAttendance = allAttendance.filter(r => r.workLocationId === loc.id);
        const locVehicleFuel = allVehicleFuel.filter(r => r.workLocationId === loc.id);
        const locVehicleMaints = allVehicleMaints.filter(r => r.workLocationId === loc.id);
        const locMFuel = allMFuel.filter(r => r.workLocationId === loc.id);
        const locExtras = allExtras.filter(r => r.workLocationId === loc.id);
        const locCargos = allCargos.filter(r => r.workLocationId === loc.id);
        const locClientPayments = clientPaymentsData.filter(r => {
          // Associar pagamentos de clientes ao local via clientId das cargas
          const clientIds = locCargos.map(c => c.clientId).filter(Boolean);
          return clientIds.includes(r.clientId);
        });

        const totalMO = locAttendance.reduce((s, r) => s + parseFloat(r.dailyValue || "0"), 0);
        const totalVehicleMaintLoc = locVehicleMaints.reduce((s, r) => s + parseFloat(r.maintenanceCost || "0"), 0);
        const totalComb = locVehicleFuel.reduce((s, r) => s + parseFloat(r.fuelCost || "0"), 0)
          + locMFuel.reduce((s, r) => s + parseFloat(r.totalValue || "0"), 0);
        const totalExt = locExtras.reduce((s, r) => s + parseFloat(r.amount || "0"), 0);
        const totalVol = locCargos.reduce((s, r) => s + parseFloat(r.volumeM3 || "0"), 0);

        // Corte terceirizado por local (thirdPartyCost = custo do corte)
        const locCorte = locCargos.filter(c => c.thirdPartyContractor && c.thirdPartyContractor.trim() !== '');
        const totalLocCorte = locCorte.reduce((s, r) => s + parseFloat(r.thirdPartyCost || "0"), 0);

        // Frete terceirizado por local (calculado pela tarifa)
        const locFreteTer = thirdPartyIds.length > 0
          ? locCargos.filter(c => c.vehicleId && thirdPartyIds.includes(c.vehicleId))
          : [];
        const totalLocFrete = locFreteTer.reduce((s, c) => s + calcFreightCost(c), 0);

        // Pagamento de clientes por local
        const totalLocClientPayments = locClientPayments.reduce((s, r) => s + parseFloat(r.netAmount || "0"), 0);

        // Receita estimada por local
        const totalLocReceitaEstimada = locCargos.reduce((s, c) => s + calcEstimatedRevenue(c), 0);

        const custo = totalMO + totalComb + totalExt + totalLocCorte + totalLocFrete + totalVehicleMaintLoc + totalLocClientPayments;

        // Análise diária por local
        const dailyMap = new Map<string, { cargas: number; volumeM3: number; receitaEstimada: number }>();
        for (const c of locCargos) {
          const day = (c.date || '').slice(0, 10);
          if (!day) continue;
          const prev = dailyMap.get(day) || { cargas: 0, volumeM3: 0, receitaEstimada: 0 };
          dailyMap.set(day, {
            cargas: prev.cargas + 1,
            volumeM3: prev.volumeM3 + parseFloat(c.volumeM3 || '0'),
            receitaEstimada: prev.receitaEstimada + calcEstimatedRevenue(c),
          });
        }
        const dailyBreakdown = Array.from(dailyMap.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([date, v]) => ({ date, ...v, receita: v.receitaEstimada }));

        // Detalhamento de cargas por local
        const cargasDetalhadas = locCargos.map(c => ({
          id: c.id,
          date: (c.date || '').slice(0, 10),
          deliveryDate: c.deliveryDate ? (c.deliveryDate || '').slice(0, 10) : null,
          vehiclePlate: c.vehiclePlate,
          driverName: c.driverName,
          destination: c.destination,
          volumeM3: parseFloat(c.volumeM3 || '0'),
          weightNetKg: parseFloat(c.weightNetKg || '0'),
          invoiceNumber: c.invoiceNumber,
          paymentStatus: c.paymentStatus,
          status: c.status,
          receitaEstimada: calcEstimatedRevenue(c),
          custoCorteTerceirizado: c.thirdPartyContractor ? parseFloat(c.thirdPartyCost || '0') : 0,
          custoFreteTerceirizado: calcFreightCost(c),
        }));

        return {
          locationId: loc.id,
          locationName: loc.name,
          maoDeObra: { total: totalMO, dias: locAttendance.length },
          combustivel: {
            total: totalComb,
            litros: locVehicleFuel.reduce((s, r) => s + parseFloat(r.liters || "0"), 0)
              + locMFuel.reduce((s, r) => s + parseFloat(r.liters || "0"), 0),
          },
          despesasExtras: { total: totalExt, qtd: locExtras.length },
          manutencao: { total: totalVehicleMaintLoc, qtd: locVehicleMaints.length },
          freteTerceirizado: { total: totalLocFrete, qtd: locFreteTer.length },
          corteTerceirizado: { total: totalLocCorte, qtd: locCorte.length },
          pagamentoClientes: { total: totalLocClientPayments, qtd: locClientPayments.length },
          cargas: { total: locCargos.length, volumeM3: totalVol },
          receitaEstimada: totalLocReceitaEstimada,
          receita: totalLocReceitaEstimada,
          custoTotal: custo,
          lucro: totalLocReceitaEstimada - custo,
          dailyBreakdown,
          cargasDetalhadas,
        };
      });

      return {
        locations: locationData,
        unassigned: {
          maoDeObra: {
            total: allAttendance.filter(r => !r.workLocationId).reduce((s, r) => s + parseFloat(r.dailyValue || "0"), 0),
            dias: allAttendance.filter(r => !r.workLocationId).length,
          },
        },
        totals: {
          custoTotal: totalCustoGlobal,
          totalMaoDeObra: totalMaoDeObraGlobal,
          totalCombustivel: totalVehicleFuelGlobal + totalMFuelGlobal,
          totalDespesas: totalExtrasGlobal,
          totalManutencao: totalManutencaoGlobal,
          totalCorteTerceirizado: totalCorteTerceirizadoGlobal,
          totalFreteTerceirizado: totalFreteTerceirizadoGlobal + totalTPFuelGlobal,
          totalPagamentoClientes: totalPagamentoClientesGlobal,
          totalCargas: allCargos.length,
          totalVolumeM3: allCargos.reduce((s, r) => s + parseFloat(r.volumeM3 || "0"), 0),
          totalReceita: totalReceitaReal,
          totalReceitaEstimada: totalReceitaEstimadaGlobal,
          lucroTotal: lucroRealGlobal,
          lucroEstimado: lucroEstimadoGlobal,
          dailyBreakdown: dailyBreakdownGlobal,
          receitaBreakdown: {
            byBuyer: (() => {
              const map: Record<string, { buyerId: number; buyerName: string; total: number; payments: { amount: number; paymentDate: string; invoiceNumber: string | null; notes: string | null }[] }> = {};
              for (const p of allBuyerPayments) {
                const key = String(p.buyerId);
                const name = p.buyerName || `Comprador #${p.buyerId}`;
                if (!map[key]) map[key] = { buyerId: p.buyerId, buyerName: name, total: 0, payments: [] };
                const val = parseFloat(p.amount || '0');
                map[key].total += val;
                map[key].payments.push({ amount: val, paymentDate: p.paymentDate, invoiceNumber: p.invoiceNumber ?? null, notes: p.notes ?? null });
              }
              return Object.values(map).sort((a, b) => b.total - a.total);
            })(),
            manualEntries: allFinReceitas.map(r => ({
              amount: parseFloat(r.amount || '0'),
              description: r.description,
              clientName: r.clientName ?? null,
              date: r.date,
            })),
            totalBuyerPayments: buyerPaymentsTotal,
            totalManual: finReceitasManualTotal,
          },
        },
      };
    }),
});
