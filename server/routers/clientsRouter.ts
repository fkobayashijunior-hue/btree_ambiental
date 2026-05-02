import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { clients } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

export const clientsRouter = router({
  list: protectedProcedure
    .input(z.object({ search: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const results = await db.select().from(clients).orderBy(desc(clients.createdAt));
      if (input?.search) {
        const s = input.search.toLowerCase();
        return results.filter(c =>
          c.name.toLowerCase().includes(s) ||
          c.document?.toLowerCase().includes(s) ||
          c.email?.toLowerCase().includes(s) ||
          c.phone?.toLowerCase().includes(s)
        );
      }
      return results.filter(c => c.active === null || c.active === undefined || c.active === 1);
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(2),
      document: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      notes: z.string().optional(),
      pricePerTon: z.string().optional(),
      paymentTermDays: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      await db.insert(clients).values({ ...input, createdBy: ctx.user.id });
      return { success: true };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      document: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      notes: z.string().optional(),
      active: z.number().optional(),
      pricePerTon: z.string().optional(),
      paymentTermDays: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const { id, ...rest } = input;
      await db.update(clients).set({ ...rest, updatedAt: new Date() }).where(eq(clients.id, id));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      // Soft delete
      await db.update(clients).set({ active: 0, updatedAt: new Date() }).where(eq(clients.id, input.id));
      return { success: true };
    }),
});
