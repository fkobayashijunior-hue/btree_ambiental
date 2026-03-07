import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { cargoLoads, collaborators, clients, equipment } from "../../drizzle/schema";
import { eq, desc, like, or, and, gte, lte } from "drizzle-orm";

export const cargoLoadsRouter = router({
  list: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      clientId: z.number().optional(),
      status: z.enum(["pendente", "entregue", "cancelado"]).optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      const results = await db.select().from(cargoLoads).orderBy(desc(cargoLoads.createdAt));

      let filtered = results;
      if (input?.search) {
        const s = input.search.toLowerCase();
        filtered = filtered.filter(r =>
          r.driverName?.toLowerCase().includes(s) ||
          r.clientName?.toLowerCase().includes(s) ||
          r.destination?.toLowerCase().includes(s) ||
          r.invoiceNumber?.toLowerCase().includes(s) ||
          r.vehiclePlate?.toLowerCase().includes(s)
        );
      }
      if (input?.clientId) filtered = filtered.filter(r => r.clientId === input.clientId);
      if (input?.status) filtered = filtered.filter(r => r.status === input.status);

      return filtered;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const result = await db.select().from(cargoLoads).where(eq(cargoLoads.id, input.id)).limit(1);
      if (!result.length) throw new TRPCError({ code: "NOT_FOUND" });
      return result[0];
    }),

  create: protectedProcedure
    .input(z.object({
      date: z.string(),
      vehicleId: z.number().optional(),
      vehiclePlate: z.string().optional(),
      driverCollaboratorId: z.number().optional(),
      driverName: z.string().optional(),
      heightM: z.string(),
      widthM: z.string(),
      lengthM: z.string(),
      volumeM3: z.string(),
      woodType: z.string().optional(),
      destination: z.string().optional(),
      invoiceNumber: z.string().optional(),
      clientId: z.number().optional(),
      clientName: z.string().optional(),
      photosJson: z.string().optional(),
      notes: z.string().optional(),
      status: z.enum(["pendente", "entregue", "cancelado"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      await db.insert(cargoLoads).values({
        ...input,
        date: new Date(input.date),
        status: input.status || "pendente",
        registeredBy: ctx.user.id,
      });
      return { success: true };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      date: z.string().optional(),
      vehicleId: z.number().optional(),
      vehiclePlate: z.string().optional(),
      driverCollaboratorId: z.number().optional(),
      driverName: z.string().optional(),
      heightM: z.string().optional(),
      widthM: z.string().optional(),
      lengthM: z.string().optional(),
      volumeM3: z.string().optional(),
      woodType: z.string().optional(),
      destination: z.string().optional(),
      invoiceNumber: z.string().optional(),
      clientId: z.number().optional(),
      clientName: z.string().optional(),
      photosJson: z.string().optional(),
      notes: z.string().optional(),
      status: z.enum(["pendente", "entregue", "cancelado"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      const { id, date, ...rest } = input;
      const updateData: Record<string, unknown> = { ...rest, updatedAt: new Date() };
      if (date) updateData.date = new Date(date);

      await db.update(cargoLoads).set(updateData).where(eq(cargoLoads.id, id));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      await db.delete(cargoLoads).where(eq(cargoLoads.id, input.id));
      return { success: true };
    }),
});
