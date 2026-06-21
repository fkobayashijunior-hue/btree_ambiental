import { z } from "zod";
import { eq, desc, and, gte, lte, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  freightRates,
  thirdPartyFuel,
  equipment,
  financialEntries,
  cargoLoads,
  fuelRecords,
  gpsLocations,
} from "../../drizzle/schema";

export const thirdPartyRouter = router({

  // ===== TARIFAS DE FRETE =====

  listRates: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(freightRates).orderBy(freightRates.worksite, freightRates.destination);
  }),

  createRate: protectedProcedure
    .input(z.object({
      worksite: z.string().min(1),
      destination: z.string().min(1),
      ratePerTon: z.string().min(1),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [result] = await db.insert(freightRates).values({
        worksite: input.worksite,
        destination: input.destination,
        ratePerTon: input.ratePerTon,
        notes: input.notes,
      });
      return { id: (result as { insertId: number }).insertId };
    }),

  updateRate: protectedProcedure
    .input(z.object({
      id: z.number(),
      worksite: z.string().min(1),
      destination: z.string().min(1),
      ratePerTon: z.string().min(1),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(freightRates).set({
        worksite: input.worksite,
        destination: input.destination,
        ratePerTon: input.ratePerTon,
        notes: input.notes ?? null,
      }).where(eq(freightRates.id, input.id));
      return { success: true };
    }),

  deleteRate: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(freightRates).where(eq(freightRates.id, input.id));
      return { success: true };
    }),

  // ===== ABASTECIMENTOS DE TERCEIRIZADOS =====
  // Retorna TANTO os registros de third_party_fuel QUANTO os fuel_records de caminhões terceirizados

  listFuel: protectedProcedure
    .input(z.object({
      equipmentId: z.number().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Buscar IDs dos caminhões terceirizados
      const thirdPartyTrucks = await db.select({ id: equipment.id, name: equipment.name })
        .from(equipment)
        .where(eq(equipment.isThirdParty, 1));
      const thirdPartyIds = thirdPartyTrucks.map(t => t.id);

      // 1) Abastecimentos da tabela third_party_fuel (lançados manualmente)
      const tpFuelRows = await db
        .select({
          id: thirdPartyFuel.id,
          equipmentId: thirdPartyFuel.equipmentId,
          equipmentName: equipment.name,
          date: thirdPartyFuel.date,
          liters: thirdPartyFuel.liters,
          pricePerLiter: thirdPartyFuel.pricePerLiter,
          total: thirdPartyFuel.total,
          location: thirdPartyFuel.location,
          notes: thirdPartyFuel.notes,
          createdAt: thirdPartyFuel.createdAt,
        })
        .from(thirdPartyFuel)
        .leftJoin(equipment, eq(thirdPartyFuel.equipmentId, equipment.id))
        .orderBy(desc(thirdPartyFuel.date));

      // 2) Abastecimentos de fuel_records para caminhões terceirizados
      let fuelRecordsRows: any[] = [];
      if (thirdPartyIds.length > 0) {
        const frRows = await db
          .select({
            id: fuelRecords.id,
            equipmentId: fuelRecords.equipmentId,
            equipmentName: equipment.name,
            date: fuelRecords.date,
            liters: fuelRecords.liters,
            pricePerLiter: fuelRecords.pricePerLiter,
            total: fuelRecords.totalValue,
            location: fuelRecords.station,
            notes: fuelRecords.odometer,
            createdAt: fuelRecords.createdAt,
          })
          .from(fuelRecords)
          .leftJoin(equipment, eq(fuelRecords.equipmentId, equipment.id))
          .where(inArray(fuelRecords.equipmentId, thirdPartyIds))
          .orderBy(desc(fuelRecords.date));

        fuelRecordsRows = frRows.map(r => ({
          ...r,
          fromFuelRecords: true,
          notes: r.notes ? `Hodômetro: ${r.notes}` : null,
        }));
      }

      // Combinar e ordenar por data
      const combined = [
        ...tpFuelRows.map(r => ({ ...r, fromFuelRecords: false })),
        ...fuelRecordsRows,
      ].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));

      return combined;
    }),

  createFuel: protectedProcedure
    .input(z.object({
      equipmentId: z.number(),
      date: z.string(),
      liters: z.string(),
      pricePerLiter: z.string(),
      total: z.string(),
      location: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [result] = await db.insert(thirdPartyFuel).values({
        equipmentId: input.equipmentId,
        date: input.date,
        liters: input.liters,
        pricePerLiter: input.pricePerLiter,
        total: input.total,
        location: input.location,
        notes: input.notes,
        createdBy: ctx.user.id,
      });

      const id = (result as { insertId: number }).insertId;

      // Lançar como despesa no financeiro automaticamente
      try {
        const eq2 = await db.select({ name: equipment.name }).from(equipment).where(eq(equipment.id, input.equipmentId));
        const equipName = eq2[0]?.name ?? `Equipamento #${input.equipmentId}`;
        await db.insert(financialEntries).values({
          type: "despesa",
          category: "combustivel",
          description: `Combustível terceirizado — ${equipName} (${input.liters}L @ R$${input.pricePerLiter}/L)`,
          amount: input.total,
          date: input.date.slice(0, 10),
          status: "confirmado",
          paymentMethod: "dinheiro",
          notes: input.notes ?? null,
          registeredBy: ctx.user.id,
        });
      } catch (_) {
        // Não bloquear se financeiro falhar
      }

      return { id };
    }),

  updateFuel: protectedProcedure
    .input(z.object({
      id: z.number(),
      equipmentId: z.number(),
      date: z.string(),
      liters: z.string(),
      pricePerLiter: z.string(),
      total: z.string(),
      location: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(thirdPartyFuel).set({
        equipmentId: input.equipmentId,
        date: input.date,
        liters: input.liters,
        pricePerLiter: input.pricePerLiter,
        total: input.total,
        location: input.location ?? null,
        notes: input.notes ?? null,
      }).where(eq(thirdPartyFuel.id, input.id));
      return { success: true };
    }),

  deleteFuel: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(thirdPartyFuel).where(eq(thirdPartyFuel.id, input.id));
      return { success: true };
    }),

  // ===== CAMINHÕES TERCEIRIZADOS =====

  listThirdPartyTrucks: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(equipment).where(eq(equipment.isThirdParty, 1));
  }),

  setThirdParty: protectedProcedure
    .input(z.object({
      id: z.number(),
      isThirdParty: z.boolean(),
      thirdPartyOwner: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(equipment).set({
        isThirdParty: input.isThirdParty ? 1 : 0,
        thirdPartyOwner: input.thirdPartyOwner ?? null,
      }).where(eq(equipment.id, input.id));
      return { success: true };
    }),

  // ===== LISTAGEM DE FRETES DE TERCEIRIZADOS =====
  // Lista cargas onde o veículo é terceirizado, com cálculo de valor de frete
  // Busca tarifa por: (1) worksite+destination exato, (2) worksite parcial + destination parcial
  listFreights: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      equipmentId: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Buscar IDs dos caminhões terceirizados
      const thirdPartyTrucks = await db.select({ id: equipment.id, name: equipment.name, thirdPartyOwner: equipment.thirdPartyOwner })
        .from(equipment)
        .where(eq(equipment.isThirdParty, 1));

      if (thirdPartyTrucks.length === 0) return [];

      const truckIds = thirdPartyTrucks.map(t => t.id);
      const truckMap = new Map(thirdPartyTrucks.map(t => [t.id, t]));

      // Buscar cargas desses caminhões
      const conditions: ReturnType<typeof and>[] = [];
      if (input?.startDate) conditions.push(gte(cargoLoads.date, input.startDate + " 00:00:00"));
      if (input?.endDate) conditions.push(lte(cargoLoads.date, input.endDate + " 23:59:59"));
      if (input?.equipmentId) conditions.push(eq(cargoLoads.vehicleId, input.equipmentId));

      const allCargos = await db.select({
        id: cargoLoads.id,
        date: cargoLoads.date,
        vehicleId: cargoLoads.vehicleId,
        vehiclePlate: cargoLoads.vehiclePlate,
        driverName: cargoLoads.driverName,
        destination: cargoLoads.destination,
        weightNetKg: cargoLoads.weightNetKg,
        workLocationId: cargoLoads.workLocationId,
        thirdPartyPaid: cargoLoads.thirdPartyPaid,
        thirdPartyPaidAt: cargoLoads.thirdPartyPaidAt,
        thirdPartyPaymentNotes: cargoLoads.thirdPartyPaymentNotes,
        status: cargoLoads.status,
      })
      .from(cargoLoads)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(cargoLoads.date));

      // Filtrar apenas cargas de terceirizados
      const thirdPartyCargos = allCargos.filter(c => c.vehicleId && truckIds.includes(c.vehicleId));

      // Buscar todas as tarifas de frete
      const rates = await db.select().from(freightRates);

      // Buscar nomes dos locais de trabalho para matching de tarifa
      const locationRows = await db.select({ id: gpsLocations.id, name: gpsLocations.name }).from(gpsLocations);
      const locationMap = new Map(locationRows.map(l => [l.id, l.name]));

      // Para cada carga, calcular o frete
      const result = await Promise.all(thirdPartyCargos.map(async (cargo) => {
        const truck = cargo.vehicleId ? truckMap.get(cargo.vehicleId) : null;
        const weightTons = parseFloat(cargo.weightNetKg || '0') / 1000;

        // Nome do local de trabalho da carga
        const worksiteName = cargo.workLocationId ? (locationMap.get(cargo.workLocationId) ?? '') : '';
        const destName = cargo.destination ?? '';

        // Busca de tarifa com múltiplas estratégias:
        // Helper: verifica se texto A contém todas as palavras-chave de texto B (ou vice-versa)
        const fuzzyMatch = (a: string, b: string) => {
          const aL = a.toLowerCase().trim();
          const bL = b.toLowerCase().trim();
          if (aL === bL) return true;
          if (aL.includes(bL) || bL.includes(aL)) return true;
          // Verifica se todas as palavras de b estão em a
          const bWords = bL.split(/\s+/).filter(w => w.length > 2);
          return bWords.length > 0 && bWords.every(w => aL.includes(w));
        };

        // 1. Exata: worksite == worksiteName E destination == destName
        let matchingRate = rates.find(r =>
          r.worksite.toLowerCase() === worksiteName.toLowerCase() &&
          r.destination.toLowerCase() === destName.toLowerCase()
        );
        // 2. Fuzzy: worksite E destination
        if (!matchingRate) {
          matchingRate = rates.find(r =>
            fuzzyMatch(worksiteName, r.worksite) &&
            fuzzyMatch(destName, r.destination)
          );
        }
        // 3. Só destination (fuzzy)
        if (!matchingRate) {
          matchingRate = rates.find(r => fuzzyMatch(destName, r.destination));
        }
        // 4. Só worksite (fuzzy)
        if (!matchingRate && worksiteName) {
          matchingRate = rates.find(r => fuzzyMatch(worksiteName, r.worksite));
        }

        const grossFreight = matchingRate ? parseFloat(matchingRate.ratePerTon) * weightTons : 0;

        // Buscar combustível do terceirizado no mesmo dia (third_party_fuel + fuel_records)
        const dateStr = cargo.date?.slice(0, 10) ?? '';
        let fuelCost = 0;
        if (cargo.vehicleId && dateStr) {
          const tpFuel = await db.select({ total: thirdPartyFuel.total })
            .from(thirdPartyFuel)
            .where(and(
              eq(thirdPartyFuel.equipmentId, cargo.vehicleId),
              gte(thirdPartyFuel.date, dateStr + " 00:00:00"),
              lte(thirdPartyFuel.date, dateStr + " 23:59:59"),
            ));
          const frFuel = await db.select({ totalValue: fuelRecords.totalValue })
            .from(fuelRecords)
            .where(and(
              eq(fuelRecords.equipmentId, cargo.vehicleId),
              gte(fuelRecords.date, dateStr + " 00:00:00"),
              lte(fuelRecords.date, dateStr + " 23:59:59"),
            ));
          fuelCost = tpFuel.reduce((acc, f) => acc + parseFloat(f.total || '0'), 0)
            + frFuel.reduce((acc, f) => acc + parseFloat(f.totalValue || '0'), 0);
        }

        const netFreight = grossFreight - fuelCost;

        return {
          ...cargo,
          truckName: truck?.name ?? cargo.vehiclePlate ?? 'Desconhecido',
          truckOwner: truck?.thirdPartyOwner ?? null,
          worksiteName,
          weightTons,
          ratePerTon: matchingRate ? parseFloat(matchingRate.ratePerTon) : null,
          grossFreight,
          fuelCost,
          netFreight,
          hasRate: !!matchingRate,
          matchedRateWorksite: matchingRate?.worksite ?? null,
          matchedRateDestination: matchingRate?.destination ?? null,
        };
      }));

      return result;
    }),

  // ===== MARCAR FRETE COMO PAGO =====
  markFreightPaid: protectedProcedure
    .input(z.object({
      cargoLoadId: z.number(),
      notes: z.string().optional(),
      netAmount: z.string(),
      grossAmount: z.string(),
      fuelCost: z.string(),
      truckName: z.string().optional(),
      // Valor manual (quando não há tarifa cadastrada)
      manualAmount: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const now = new Date();
      const nowStr = now.toISOString().slice(0, 10);

      // Usar valor manual se fornecido, senão usar netAmount calculado
      const finalAmount = input.manualAmount && parseFloat(input.manualAmount) > 0
        ? input.manualAmount
        : input.netAmount;

      // Marcar carga como paga
      await db.update(cargoLoads).set({
        thirdPartyPaid: 1,
        thirdPartyPaidAt: now,
        thirdPartyPaymentNotes: input.notes ?? null,
      }).where(eq(cargoLoads.id, input.cargoLoadId));

      // Criar lançamento financeiro como despesa
      try {
        const truckLabel = input.truckName ? ` — ${input.truckName}` : '';
        const isManual = input.manualAmount && parseFloat(input.manualAmount) > 0;
        const desc = isManual
          ? `Frete terceirizado${truckLabel} (Carga #${input.cargoLoadId}) | Valor manual: R$${finalAmount}`
          : `Frete terceirizado${truckLabel} (Carga #${input.cargoLoadId}) | Bruto: R$${input.grossAmount} - Comb: R$${input.fuelCost} = Líq: R$${finalAmount}`;
        await db.insert(financialEntries).values({
          type: "despesa",
          category: "frete",
          description: desc,
          amount: finalAmount,
          date: nowStr,
          status: "confirmado",
          paymentMethod: "pix",
          cargoLoadId: input.cargoLoadId,
          notes: input.notes ?? null,
          registeredBy: ctx.user.id,
        });
      } catch (_) {
        // Não bloquear se financeiro falhar
      }

      return { success: true };
    }),
});
