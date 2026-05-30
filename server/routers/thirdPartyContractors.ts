import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { thirdPartyContractors } from "../../drizzle/schema";
import { eq, desc, asc } from "drizzle-orm";

export const thirdPartyContractorsRouter = router({
  list: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const rows = await db
        .select()
        .from(thirdPartyContractors)
        .orderBy(asc(thirdPartyContractors.name));
      return rows;
    }),

  listActive: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const rows = await db
        .select()
        .from(thirdPartyContractors)
        .where(eq(thirdPartyContractors.isActive, 1))
        .orderBy(asc(thirdPartyContractors.name));
      return rows;
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1, "Nome obrigatório"),
      ratePerM3: z.string().default("0"),
      phone: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      await db.insert(thirdPartyContractors).values({
        name: input.name.trim(),
        ratePerM3: input.ratePerM3.replace(',', '.'),
        phone: input.phone || null,
        notes: input.notes || null,
        isActive: 1,
        createdBy: ctx.user.id,
      });
      return { success: true };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      ratePerM3: z.string().optional(),
      phone: z.string().optional(),
      notes: z.string().optional(),
      isActive: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const { id, ...rest } = input;
      const updateData: Record<string, unknown> = {};
      if (rest.name !== undefined) updateData.name = rest.name.trim();
      if (rest.ratePerM3 !== undefined) updateData.ratePerM3 = rest.ratePerM3.replace(',', '.');
      if (rest.phone !== undefined) updateData.phone = rest.phone || null;
      if (rest.notes !== undefined) updateData.notes = rest.notes || null;
      if (rest.isActive !== undefined) updateData.isActive = rest.isActive;
      await db.update(thirdPartyContractors).set(updateData as any).where(eq(thirdPartyContractors.id, id));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      await db.delete(thirdPartyContractors).where(eq(thirdPartyContractors.id, input.id));
      return { success: true };
    }),
});
