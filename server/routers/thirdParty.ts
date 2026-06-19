import { z } from "zod";
import { eq, desc, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  freightRates,
  thirdPartyFuel,
  equipment,
  financialEntries,
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
});
