import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { clientAdvances, clientAdvanceDeductions } from "../../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";

export const clientAdvancesRouter = router({
  // Listar adiantamentos de um cliente
  list: protectedProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      return db.select().from(clientAdvances)
        .where(eq(clientAdvances.clientId, input.clientId))
        .orderBy(desc(clientAdvances.date));
    }),

  // Criar novo adiantamento
  create: protectedProcedure
    .input(z.object({
      clientId: z.number(),
      amount: z.number().positive(),
      description: z.string().optional(),
      receiptUrl: z.string().optional(),
      date: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const [result] = await db.insert(clientAdvances).values({
        clientId: input.clientId,
        amount: String(input.amount),
        balanceRemaining: String(input.amount),
        description: input.description,
        receiptUrl: input.receiptUrl,
        date: input.date,
        status: 'ativo',
        createdBy: ctx.user.id,
      });
      return { id: (result as any).insertId };
    }),

  // Buscar saldo total de adiantamentos ativos de um cliente
  getBalance: protectedProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const advances = await db.select().from(clientAdvances)
        .where(and(
          eq(clientAdvances.clientId, input.clientId),
          eq(clientAdvances.status, 'ativo')
        ));
      const totalBalance = advances.reduce((sum, a) => sum + parseFloat(a.balanceRemaining || '0'), 0);
      return { totalBalance, advances };
    }),

  // Listar deduções de um adiantamento
  listDeductions: protectedProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      return db.select().from(clientAdvanceDeductions)
        .where(eq(clientAdvanceDeductions.clientId, input.clientId))
        .orderBy(desc(clientAdvanceDeductions.date));
    }),

  // Aplicar abatimento manual em um adiantamento (para fechamento semanal)
  applyDeduction: protectedProcedure
    .input(z.object({
      advanceId: z.number(),
      clientId: z.number(),
      amount: z.number().positive(),
      description: z.string().optional(),
      weeklyClosingId: z.number().optional(),
      cargoLoadId: z.number().optional(),
      date: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      // Buscar o adiantamento
      const [advance] = await db.select().from(clientAdvances)
        .where(eq(clientAdvances.id, input.advanceId));
      if (!advance) throw new TRPCError({ code: "NOT_FOUND", message: "Adiantamento não encontrado" });

      const balanceBefore = parseFloat(advance.balanceRemaining || '0');
      if (balanceBefore <= 0) throw new TRPCError({ code: "BAD_REQUEST", message: "Saldo insuficiente" });

      const deductAmount = Math.min(input.amount, balanceBefore);
      const balanceAfter = balanceBefore - deductAmount;

      // Registrar a dedução
      await db.insert(clientAdvanceDeductions).values({
        advanceId: input.advanceId,
        clientId: input.clientId,
        cargoLoadId: input.cargoLoadId,
        weeklyClosingId: input.weeklyClosingId,
        amount: String(deductAmount),
        balanceBefore: String(balanceBefore),
        balanceAfter: String(balanceAfter),
        description: input.description,
        date: input.date,
      });

      // Atualizar saldo do adiantamento
      await db.update(clientAdvances)
        .set({
          balanceRemaining: String(balanceAfter),
          status: balanceAfter <= 0 ? 'quitado' : 'ativo',
        })
        .where(eq(clientAdvances.id, input.advanceId));

      return { deductAmount, balanceAfter };
    }),

  // Deletar adiantamento (apenas se não tiver deduções)
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const deductions = await db.select().from(clientAdvanceDeductions)
        .where(eq(clientAdvanceDeductions.advanceId, input.id));
      if (deductions.length > 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Não é possível excluir um adiantamento com abatimentos registrados" });
      }
      await db.delete(clientAdvances).where(eq(clientAdvances.id, input.id));
      return { success: true };
    }),
});
