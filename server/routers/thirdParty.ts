import { z } from "zod";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  freightRates,
  thirdPartyFuel,
  equipment,
  financialEntries,
  cargoLoads,
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

  // Buscar tarifa por worksite + destination (para cálculo automático)
  getRate: protectedProcedure
    .input(z.object({ worksite: z.string(), destination: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [rate] = await db.select().from(freightRates).where(
        and(eq(freightRates.worksite, input.worksite), eq(freightRates.destination, input.destination))
      );
      return rate ?? null;
    }),

  // ===== ABASTECIMENTOS DE TERCEIRIZADOS =====

  listFuel: protectedProcedure
    .input(z.object({
      equipmentId: z.number().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Buscar abastecimentos com nome do equipamento
      const rows = await db
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

      return rows;
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

  // ===== CÁLCULO DE FRETE TERCEIRIZADO =====
  // Calcula frete bruto = tarifa × toneladas, desconta combustível do período
  calculateFreight: protectedProcedure
    .input(z.object({
      worksite: z.string(),
      destination: z.string(),
      weightNetTons: z.number(),
      equipmentId: z.number(),
      date: z.string(), // YYYY-MM-DD — para buscar combustível do dia
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Buscar tarifa
      const [rate] = await db.select().from(freightRates).where(
        and(eq(freightRates.worksite, input.worksite), eq(freightRates.destination, input.destination))
      );
      if (!rate) return { found: false as const };

      const rateVal = parseFloat(rate.ratePerTon);
      const grossFreight = rateVal * input.weightNetTons;

      // Buscar combustível do terceirizado no mesmo dia
      const fuelRows = await db.select().from(thirdPartyFuel).where(
        and(eq(thirdPartyFuel.equipmentId, input.equipmentId))
      );
      const dayFuel = fuelRows.filter(f => f.date?.startsWith(input.date));
      const fuelCost = dayFuel.reduce((acc, f) => acc + parseFloat(f.total || '0'), 0);

      const netFreight = grossFreight - fuelCost;

      return {
        found: true as const,
        ratePerTon: rateVal,
        grossFreight,
        fuelCost,
        netFreight,
      };
    }),

  // ===== LISTAGEM DE FRETES DE TERCEIRIZADOS =====
  // Lista cargas onde o veículo é terceirizado, com cálculo de valor de frete
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

      // Filtrar por IDs dos terceirizados usando IN manual
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

      // Para cada carga, calcular o frete
      const result = await Promise.all(thirdPartyCargos.map(async (cargo) => {
        const truck = cargo.vehicleId ? truckMap.get(cargo.vehicleId) : null;
        const weightTons = parseFloat(cargo.weightNetKg || '0') / 1000;

        // Tentar encontrar tarifa por destino
        const matchingRate = rates.find(r =>
          cargo.destination && cargo.destination.toLowerCase().includes(r.destination.toLowerCase())
        );

        const grossFreight = matchingRate ? parseFloat(matchingRate.ratePerTon) * weightTons : 0;

        // Buscar combustível do terceirizado no mesmo dia
        const dateStr = cargo.date?.slice(0, 10) ?? '';
        const fuelRows = cargo.vehicleId ? await db.select({ total: thirdPartyFuel.total })
          .from(thirdPartyFuel)
          .where(and(
            eq(thirdPartyFuel.equipmentId, cargo.vehicleId),
            gte(thirdPartyFuel.date, dateStr + " 00:00:00"),
            lte(thirdPartyFuel.date, dateStr + " 23:59:59"),
          )) : [];

        const fuelCost = fuelRows.reduce((acc, f) => acc + parseFloat(f.total || '0'), 0);
        const netFreight = grossFreight - fuelCost;

        return {
          ...cargo,
          truckName: truck?.name ?? cargo.vehiclePlate ?? 'Desconhecido',
          truckOwner: truck?.thirdPartyOwner ?? null,
          weightTons,
          ratePerTon: matchingRate ? parseFloat(matchingRate.ratePerTon) : null,
          grossFreight,
          fuelCost,
          netFreight,
          hasRate: !!matchingRate,
        };
      }));

      return result;
    }),

  // ===== MARCAR FRETE COMO PAGO =====
  markFreightPaid: protectedProcedure
    .input(z.object({
      cargoLoadId: z.number(),
      notes: z.string().optional(),
      // Valor pago (líquido = bruto - combustível)
      netAmount: z.string(),
      grossAmount: z.string(),
      fuelCost: z.string(),
      truckName: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const now = new Date();
      const nowStr = now.toISOString().slice(0, 10);

      // Marcar carga como paga
      await db.update(cargoLoads).set({
        thirdPartyPaid: 1,
        thirdPartyPaidAt: now,
        thirdPartyPaymentNotes: input.notes ?? null,
      }).where(eq(cargoLoads.id, input.cargoLoadId));

      // Criar lançamento financeiro como despesa
      try {
        const truckLabel = input.truckName ? ` — ${input.truckName}` : '';
        await db.insert(financialEntries).values({
          type: "despesa",
          category: "frete",
          description: `Frete terceirizado${truckLabel} (Carga #${input.cargoLoadId}) | Bruto: R$${input.grossAmount} - Comb: R$${input.fuelCost} = Líq: R$${input.netAmount}`,
          amount: input.netAmount,
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
