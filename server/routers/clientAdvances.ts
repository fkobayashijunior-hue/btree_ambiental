import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { clientAdvances, clientAdvanceDeductions, clients } from "../../drizzle/schema";
import { eq, desc, and, asc } from "drizzle-orm";
import { storagePut } from "../storage";

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

  // Abatimento automático: aplica o saldo do adiantamento nas cargas entregues em ordem cronológica
  applyAutoDeductionByLoads: protectedProcedure
    .input(z.object({
      clientId: z.number(),
      advanceId: z.number(),
      // Cargas a abater: array de { id, date, valueAmount } ordenadas da mais antiga para a mais nova
      loads: z.array(z.object({
        id: z.number(),
        date: z.string(),
        valueAmount: z.number(), // valor em R$ desta carga
        description: z.string().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      // Buscar o adiantamento
      const [advance] = await db.select().from(clientAdvances)
        .where(and(eq(clientAdvances.id, input.advanceId), eq(clientAdvances.clientId, input.clientId)));
      if (!advance) throw new TRPCError({ code: "NOT_FOUND", message: "Adiantamento não encontrado" });

      let balanceRemaining = parseFloat(advance.balanceRemaining || '0');
      if (balanceRemaining <= 0) throw new TRPCError({ code: "BAD_REQUEST", message: "Saldo do adiantamento já esgotado" });

      const results: Array<{
        loadId: number;
        date: string;
        loadValue: number;
        deducted: number;
        balanceBefore: number;
        balanceAfter: number;
        status: 'abatido_total' | 'abatido_parcial' | 'saldo_insuficiente';
      }> = [];

      // Ordenar cargas por data (mais antiga primeiro)
      const sortedLoads = [...input.loads].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      for (const load of sortedLoads) {
        if (balanceRemaining <= 0) {
          results.push({
            loadId: load.id,
            date: load.date,
            loadValue: load.valueAmount,
            deducted: 0,
            balanceBefore: 0,
            balanceAfter: 0,
            status: 'saldo_insuficiente',
          });
          continue;
        }

        const balanceBefore = balanceRemaining;
        const deducted = Math.min(load.valueAmount, balanceRemaining);
        const balanceAfter = balanceRemaining - deducted;

        // Registrar a dedução no banco
        await db.insert(clientAdvanceDeductions).values({
          advanceId: input.advanceId,
          clientId: input.clientId,
          cargoLoadId: load.id,
          amount: String(deducted),
          balanceBefore: String(balanceBefore),
          balanceAfter: String(balanceAfter),
          description: load.description || `Abatimento carga #${load.id} - ${new Date(load.date).toLocaleDateString('pt-BR')}`,
          date: load.date,
        });

        balanceRemaining = balanceAfter;

        results.push({
          loadId: load.id,
          date: load.date,
          loadValue: load.valueAmount,
          deducted,
          balanceBefore,
          balanceAfter,
          status: deducted >= load.valueAmount ? 'abatido_total' : 'abatido_parcial',
        });
      }

      // Atualizar saldo do adiantamento
      await db.update(clientAdvances)
        .set({
          balanceRemaining: String(balanceRemaining),
          status: balanceRemaining <= 0 ? 'quitado' : 'ativo',
        })
        .where(eq(clientAdvances.id, input.advanceId));

      return {
        results,
        finalBalance: balanceRemaining,
        totalDeducted: parseFloat(advance.balanceRemaining || '0') - balanceRemaining,
      };
    }),

  // Upload de comprovante para um adiantamento
  uploadReceipt: protectedProcedure
    .input(z.object({
      advanceId: z.number(),
      fileBase64: z.string(),
      mimeType: z.string().default('image/jpeg'),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const buffer = Buffer.from(input.fileBase64, 'base64');
      const ext = input.mimeType.includes('pdf') ? 'pdf' : (input.mimeType.split('/')[1] || 'jpg');
      const key = `client-advances/${input.advanceId}/comprovante-${Date.now()}.${ext}`;
      const { url } = await storagePut(key, buffer, input.mimeType);
      await db.update(clientAdvances)
        .set({ receiptUrl: url })
        .where(eq(clientAdvances.id, input.advanceId));
      return { url };
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
