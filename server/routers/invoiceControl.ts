// @ts-nocheck
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { cargoLoads, cargoDestinations, clients } from "../../drizzle/schema";
import { eq, desc, and, sql } from "drizzle-orm";

export const invoiceControlRouter = router({
  // Listar notas com filtros — mostra todas as cargas (sem filtro de status)
  list: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      destinationId: z.number().optional(),
      clientId: z.number().optional(),
      checked: z.boolean().optional(), // undefined = todos, true = conferidos, false = não conferidos
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      limit: z.number().optional().default(200),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      const results = await db
        .select({
          id: cargoLoads.id,
          date: cargoLoads.date,
          deliveryDate: cargoLoads.deliveryDate,
          invoiceNumber: cargoLoads.invoiceNumber,
          invoiceUrl: cargoLoads.invoiceUrl,
          clientId: cargoLoads.clientId,
          clientName: cargoLoads.clientName,
          destinationId: cargoLoads.destinationId,
          destination: cargoLoads.destination,
          vehiclePlate: cargoLoads.vehiclePlate,
          driverName: cargoLoads.driverName,
          weightNetKg: cargoLoads.weightNetKg,
          weightKg: cargoLoads.weightKg,
          volumeM3: cargoLoads.volumeM3,
          status: cargoLoads.status,
          receivedByBuyer: cargoLoads.receivedByBuyer,
          invoiceChecked: cargoLoads.invoiceChecked,
          invoiceCheckedAt: cargoLoads.invoiceCheckedAt,
          // Joins
          destinationName: cargoDestinations.name,
          clientNameJoined: clients.name,
        })
        .from(cargoLoads)
        .leftJoin(cargoDestinations, eq(cargoLoads.destinationId, cargoDestinations.id))
        .leftJoin(clients, eq(cargoLoads.clientId, clients.id))
        .orderBy(desc(cargoLoads.date))
        .limit(input?.limit ?? 200);

      let filtered = results.map(r => ({
        ...r,
        clientName: r.clientNameJoined || r.clientName,
        destinationName: r.destinationName || r.destination,
      }));

      if (input?.search) {
        const s = input.search.toLowerCase();
        filtered = filtered.filter(r =>
          r.invoiceNumber?.toLowerCase().includes(s) ||
          r.clientName?.toLowerCase().includes(s) ||
          r.destinationName?.toLowerCase().includes(s) ||
          r.vehiclePlate?.toLowerCase().includes(s) ||
          r.driverName?.toLowerCase().includes(s)
        );
      }
      if (input?.destinationId) filtered = filtered.filter(r => r.destinationId === input.destinationId);
      if (input?.clientId) filtered = filtered.filter(r => r.clientId === input.clientId);
      if (input?.checked !== undefined) {
        filtered = filtered.filter(r => (r.invoiceChecked === 1) === input.checked);
      }
      if (input?.dateFrom) filtered = filtered.filter(r => r.date && r.date >= input.dateFrom!);
      if (input?.dateTo) filtered = filtered.filter(r => r.date && r.date <= input.dateTo!);

      return filtered;
    }),

  // Marcar/desmarcar nota como conferida (sem colunas extras que podem não existir)
  toggleChecked: protectedProcedure
    .input(z.object({ id: z.number(), checked: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      await db.update(cargoLoads).set({
        invoiceChecked: input.checked ? 1 : 0,
        invoiceCheckedAt: input.checked ? Date.now() : 0,
      }).where(eq(cargoLoads.id, input.id));

      return { success: true };
    }),

  // Estatísticas resumidas — todas as cargas
  stats: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

    const all = await db
      .select({
        invoiceChecked: cargoLoads.invoiceChecked,
        invoiceNumber: cargoLoads.invoiceNumber,
      })
      .from(cargoLoads);

    const total = all.length;
    const checked = all.filter(r => r.invoiceChecked === 1).length;
    const withInvoice = all.filter(r => r.invoiceNumber && r.invoiceNumber.trim() !== '').length;

    return {
      total,
      checked,
      pending: total - checked,
      withInvoice,
      withoutInvoice: total - withInvoice,
    };
  }),
});
