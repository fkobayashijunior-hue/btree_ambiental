// @ts-nocheck
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { clientAdvances, clientAdvanceDeductions, clients, financialEntries, cargoLoads, cargoWeeklyClosings } from "../../drizzle/schema";
import { eq, desc, and, asc, ne, sql } from "drizzle-orm";
import { areaScopeCondition, getCargoFinancialValue, getClientArea, normalizeAreaId, requireConfirmedArea, sameArea } from "../lib/clientAreaScope";

const advanceAreaId = (clientAdvances as any).areaId;
const cargoAreaId = (cargoLoads as any).areaId;
const closingAreaId = (cargoWeeklyClosings as any).areaId;
const hasField = (value: unknown, key: string) => !!value && Object.prototype.hasOwnProperty.call(value, key);
const inputArea = (value: any) => normalizeAreaId(value?.areaId);
const listArea = (input: any) => hasField(input, "areaId") ? areaScopeCondition(advanceAreaId, inputArea(input)) : sql`1 = 1`;
const assertArea = (left: unknown, right: unknown) => { if (!sameArea(left, right)) throw new TRPCError({ code: "BAD_REQUEST", message: "Os registros pertencem a áreas financeiras diferentes." }); };
async function checkedArea(db: any, clientId: number, areaId: number | null, confirmed = false) { const area = await getClientArea(db, clientId, areaId); if (confirmed && areaId !== null) requireConfirmedArea(area); return area; }
async function scopedAdvance(db: any, id: number, clientId?: number, areaId?: number | null) { const c: any[] = [eq(clientAdvances.id, id), areaScopeCondition(advanceAreaId, areaId)]; if (clientId !== undefined) c.push(eq(clientAdvances.clientId, clientId)); const [row] = await db.select().from(clientAdvances).where(and(...c)).limit(1); return row; }

export function planScopedDeductions(balance: number, loads: Array<{ id: number; value: number }>) {
  let remaining = Math.max(0, Number(balance) || 0);
  return loads.map(load => { const value = Math.max(0, Number(load.value) || 0); const before = remaining; const deducted = Math.min(value, remaining); remaining = Math.max(0, remaining - deducted); return { loadId: load.id, loadValue: value, deducted, balanceBefore: before, balanceAfter: remaining, status: deducted >= value ? "abatido_total" : deducted > 0 ? "abatido_parcial" : "saldo_insuficiente" } as const; });
}

import { storagePut } from "../storage";

export const clientAdvancesRouter = router({
  // Listar adiantamentos de um cliente
  list: protectedProcedure
    .input(z.object({ clientId: z.number(), areaId: z.number().nullable().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      return db.select().from(clientAdvances)
        .where(and(eq(clientAdvances.clientId, input.clientId), listArea(input)))
        .orderBy(desc(clientAdvances.date));
    }),

  // Listar adiantamentos de um cliente (alias para uso no CargoControl)
  listByClient: protectedProcedure
    .input(z.object({ clientId: z.number(), areaId: z.number().nullable().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      return db.select().from(clientAdvances)
        .where(and(eq(clientAdvances.clientId, input.clientId), listArea(input)))
        .orderBy(desc(clientAdvances.date));
    }),

  // Listar todos os adiantamentos (para uso no PDF do CargoControl)
  listAll: protectedProcedure
    .input(z.object({ areaId: z.number().nullable().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      return db.select().from(clientAdvances)
        .where(listArea(input))
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
      startDate: z.string().optional(),  // data de início dos abatimentos
      areaId: z.number().nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const areaId = inputArea(input);
      const [client] = await db.select().from(clients).where(eq(clients.id, input.clientId)).limit(1);
      if (!client) throw new TRPCError({ code: "BAD_REQUEST", message: "Cliente inválido." });
      const area = await checkedArea(db, input.clientId, areaId, areaId !== null);
      const clientName = client?.name || `Cliente #${input.clientId}`;

      const [result] = await db.insert(clientAdvances).values({
        clientId: input.clientId,
        areaId,
        amount: String(input.amount),
        balanceRemaining: String(input.amount),
        description: input.description,
        receiptUrl: input.receiptUrl,
        date: input.date,
        startDate: input.startDate || null,
        status: 'ativo',
        createdBy: ctx.user.id,
      });
      const advanceId = (result as any).insertId;

      // O financeiro geral continua recebendo a saída, identificada pela área.
      try {
        const refMonth = input.date.slice(0, 7); // "2026-05"
        const desc = input.description
          ? `Adiantamento para ${clientName} - ${input.description}`
          : `Adiantamento para ${clientName}`;
        await db.insert(financialEntries).values({
          type: 'despesa',
          category: 'adiantamento_cliente',
          description: area ? `${desc} — ${area.fieldName ? area.fieldName + " — " : ""}${area.name}` : desc,
          areaId,
          amount: String(input.amount),
          date: input.date,
          referenceMonth: refMonth,
          paymentMethod: area ? area.paymentMethod : 'pix',
          status: 'confirmado',
          clientId: input.clientId,
          clientName,
          notes: `Adiantamento ID #${advanceId} registrado automaticamente${area ? `; Área: ${area.name}; acordo: ${area.paymentMethod}` : ""}`,
          registeredBy: ctx.user.id,
          registeredByName: ctx.user.name,
          autoGenerated: 1,
        });
      } catch (e) {
        // Não bloquear criação do adiantamento se o lançamento financeiro falhar
        console.error('[clientAdvances] Erro ao lançar no financeiro:', e);
      }

      return { id: advanceId };
    }),

  // Buscar saldo total de adiantamentos ativos de um cliente
  getBalance: protectedProcedure
    .input(z.object({ clientId: z.number(), areaId: z.number().nullable().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const advances = await db.select().from(clientAdvances)
        .where(and(
          eq(clientAdvances.clientId, input.clientId),
          eq(clientAdvances.status, 'ativo'), listArea(input)
        ));
      const totalBalance = advances.reduce((sum, a) => sum + parseFloat(a.balanceRemaining || '0'), 0);
      return { totalBalance, advances };
    }),

  // Listar deduções de um adiantamento
  listDeductions: protectedProcedure
    .input(z.object({ clientId: z.number(), areaId: z.number().nullable().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      if (!hasField(input, "areaId")) {
        return db.select().from(clientAdvanceDeductions)
          .where(eq(clientAdvanceDeductions.clientId, input.clientId))
          .orderBy(desc(clientAdvanceDeductions.date));
      }
      const scoped = await db.select({ id: clientAdvances.id }).from(clientAdvances)
        .where(and(eq(clientAdvances.clientId, input.clientId), areaScopeCondition(advanceAreaId, inputArea(input))));
      const ids = scoped.map((row: any) => row.id);
      if (!ids.length) return [];
      return db.select().from(clientAdvanceDeductions)
        .where(and(eq(clientAdvanceDeductions.clientId, input.clientId), sql`${clientAdvanceDeductions.advanceId} IN (${sql.join(ids.map((id: number) => sql`${id}`), sql`, `)})`))
        .orderBy(desc(clientAdvanceDeductions.date));
    }),

  // Listar TODAS as deduções (para o controle de cargas sem filtro de cliente)
  listAllDeductions: protectedProcedure
    .input(z.object({ areaId: z.number().nullable().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      if (!hasField(input, "areaId")) return db.select().from(clientAdvanceDeductions).orderBy(desc(clientAdvanceDeductions.date));
      const advances = await db.select({ id: clientAdvances.id }).from(clientAdvances).where(areaScopeCondition(advanceAreaId, inputArea(input)));
      const ids = advances.map((row: any) => row.id);
      if (!ids.length) return [];
      return db.select().from(clientAdvanceDeductions).where(sql`${clientAdvanceDeductions.advanceId} IN (${sql.join(ids.map((id: number) => sql`${id}`), sql`, `)})`).orderBy(desc(clientAdvanceDeductions.date));
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
      areaId: z.number().nullable().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      const areaId = inputArea(input);
      const advance = await scopedAdvance(db, input.advanceId, input.clientId, areaId);
      if (!advance) throw new TRPCError({ code: "NOT_FOUND", message: "Adiantamento não encontrado" });
      assertArea(advance.areaId, areaId);
      await checkedArea(db, advance.clientId, normalizeAreaId(advance.areaId), normalizeAreaId(advance.areaId) !== null);
      if (input.cargoLoadId) {
        const [cargo] = await db.select({ id: cargoLoads.id, clientId: cargoLoads.clientId, areaId: cargoAreaId }).from(cargoLoads).where(eq(cargoLoads.id, input.cargoLoadId)).limit(1);
        if (!cargo) throw new TRPCError({ code: "NOT_FOUND", message: "Carga não encontrada" });
        if (cargo.clientId !== advance.clientId) throw new TRPCError({ code: "BAD_REQUEST", message: "Carga e adiantamento pertencem a clientes diferentes." });
        assertArea(cargo.areaId, advance.areaId);
      }
      if (input.weeklyClosingId) {
        const [closing] = await db.select().from(cargoWeeklyClosings).where(and(eq(cargoWeeklyClosings.id, input.weeklyClosingId), eq(cargoWeeklyClosings.clientId, advance.clientId), areaScopeCondition(closingAreaId, normalizeAreaId(advance.areaId)))).limit(1);
        if (!closing || closing.clientId !== advance.clientId) throw new TRPCError({ code: "BAD_REQUEST", message: "Fechamento inválido para este adiantamento." });
        assertArea(closing.areaId, advance.areaId);
      }

      const balanceBefore = parseFloat(advance.balanceRemaining || '0');
      if (balanceBefore <= 0) throw new TRPCError({ code: "BAD_REQUEST", message: "Saldo insuficiente" });

      const deductAmount = Math.min(input.amount, balanceBefore);
      const balanceAfter = balanceBefore - deductAmount;

      // Registrar a dedução
      await db.insert(clientAdvanceDeductions).values({
        advanceId: input.advanceId,
        clientId: advance.clientId,
        cargoLoadId: input.cargoLoadId,
        weeklyClosingId: input.weeklyClosingId,
        amount: String(deductAmount),
        balanceBefore: String(balanceBefore),
        balanceAfter: String(balanceAfter),
        description: input.description,
        date: input.date,
      });

      // Marcar carga como paga se foi abatida via adiantamento
      if (input.cargoLoadId && deductAmount > 0) {
        try {
          const [cargoForPayment] = await db.select().from(cargoLoads).where(and(eq(cargoLoads.id, input.cargoLoadId), eq(cargoLoads.clientId, advance.clientId), areaScopeCondition(cargoAreaId, normalizeAreaId(advance.areaId)))).limit(1);
          const [clientForPayment] = await db.select().from(clients).where(eq(clients.id, advance.clientId)).limit(1);
          const paymentArea = normalizeAreaId(advance.areaId) === null ? null : await checkedArea(db, advance.clientId, normalizeAreaId(advance.areaId), true);
          const cargoValue = cargoForPayment ? getCargoFinancialValue(cargoForPayment as any, clientForPayment as any, paymentArea as any) : null;
          if (cargoValue != null && deductAmount >= cargoValue - 0.01) {
            await db.update(cargoLoads)
              .set({ paymentStatus: 'pago', paidAt: new Date().toISOString().slice(0, 19).replace('T', ' ') })
              .where(and(eq(cargoLoads.id, input.cargoLoadId), eq(cargoLoads.clientId, advance.clientId), areaScopeCondition(cargoAreaId, normalizeAreaId(advance.areaId))));
          }
        } catch (e) { console.error('[clientAdvances] Erro ao marcar carga como paga:', e); }
      }

      // Se vinculado a um fechamento semanal, verificar se o fechamento está totalmente coberto
      if (input.weeklyClosingId && deductAmount > 0) {
        try {
          // Buscar o fechamento
          const [closing] = await db.select().from(cargoWeeklyClosings)
            .where(and(eq(cargoWeeklyClosings.id, input.weeklyClosingId), eq(cargoWeeklyClosings.clientId, advance.clientId), areaScopeCondition(closingAreaId, normalizeAreaId(advance.areaId)))).limit(1);
          if (closing && closing.status !== 'pago') {
            // Calcular total já deduzido para este fechamento (incluindo a dedução recém criada)
            const deductions = await db.select().from(clientAdvanceDeductions)
              .where(and(eq(clientAdvanceDeductions.weeklyClosingId, input.weeklyClosingId), eq(clientAdvanceDeductions.clientId, advance.clientId)));
            const totalDeducted = deductions.reduce((sum, d) => sum + parseFloat(d.amount || '0'), 0);
            const totalAmount = parseFloat(closing.totalAmount || '0');
            if (totalAmount > 0 && totalDeducted >= totalAmount * 0.99) {
              const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
              await db.update(cargoWeeklyClosings)
                .set({ status: 'pago', paidAt: now })
                .where(and(eq(cargoWeeklyClosings.id, input.weeklyClosingId), eq(cargoWeeklyClosings.clientId, advance.clientId), areaScopeCondition(closingAreaId, normalizeAreaId(advance.areaId))));
            }
          }
        } catch (e) { console.error('[clientAdvances] Erro ao atualizar fechamento:', e); }
      }

      // Atualizar saldo do adiantamento
      await db.update(clientAdvances)
        .set({
          balanceRemaining: String(balanceAfter),
          status: balanceAfter <= 0 ? 'quitado' : 'ativo',
        })
        .where(and(eq(clientAdvances.id, input.advanceId), eq(clientAdvances.clientId, advance.clientId), areaScopeCondition(advanceAreaId, normalizeAreaId(advance.areaId))));

      return { deductAmount, balanceAfter };
    }),

  // Abatimento automático: aplica o saldo do adiantamento nas cargas entregues em ordem cronológica
  applyAutoDeductionByLoads: protectedProcedure
    .input(z.object({
      clientId: z.number(),
      advanceId: z.number(),
      areaId: z.number().nullable().optional(),
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

      const areaId = inputArea(input);
      const advance = await scopedAdvance(db, input.advanceId, input.clientId, areaId);
      if (!advance) throw new TRPCError({ code: "NOT_FOUND", message: "Adiantamento não encontrado" });
      assertArea(advance.areaId, areaId);
      const advanceArea = normalizeAreaId(advance.areaId);
      const [client] = await db.select().from(clients).where(eq(clients.id, advance.clientId)).limit(1);
      const area = advanceArea === null ? null : await checkedArea(db, advance.clientId, advanceArea, true);

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

      const ids = input.loads.map((load: any) => load.id);
      const authoritativeLoads = ids.length ? await db.select().from(cargoLoads).where(and(eq(cargoLoads.clientId, advance.clientId), areaScopeCondition(cargoAreaId, advanceArea), sql`${cargoLoads.id} IN (${sql.join(ids.map((id: number) => sql`${id}`), sql`, `)})`)) : [];
      if (new Set(ids).size !== ids.length || authoritativeLoads.length !== ids.length) throw new TRPCError({code: 'BAD_REQUEST', message: 'Uma das cargas não pertence ao cliente e à área selecionados.'});
      if (authoritativeLoads.some((load: any) => load.status !== 'entregue' || load.paymentStatus === 'pago')) throw new TRPCError({code: 'BAD_REQUEST', message: 'Selecione somente cargas entregues ainda não pagas.'});
      const sortedLoads = authoritativeLoads.sort((a: any, b: any) => new Date(String(a.date)).getTime() - new Date(String(b.date)).getTime());

      for (const load of sortedLoads) {
        const loadValue = getCargoFinancialValue(load as any, client as any, area as any);
        if (loadValue == null || loadValue <= 0) continue;
        const duplicate = await db.select({ id: clientAdvanceDeductions.id }).from(clientAdvanceDeductions).where(eq(clientAdvanceDeductions.cargoLoadId, load.id)).limit(1);
        if (duplicate.length) continue;
        if (balanceRemaining <= 0) {
          results.push({
            loadId: load.id,
            date: load.date,
            loadValue: loadValue,
            deducted: 0,
            balanceBefore: 0,
            balanceAfter: 0,
            status: 'saldo_insuficiente',
          });
          continue;
        }

        const balanceBefore = balanceRemaining;
        const deducted = Math.min(loadValue, balanceRemaining);
        const balanceAfter = balanceRemaining - deducted;

        // Só uma dedução integral quita a carga; uma parcial mantém o pagamento pendente.
        if (deducted >= loadValue - 0.01) {
          try {
            await db.update(cargoLoads)
              .set({ paymentStatus: 'pago', paidAt: new Date().toISOString().slice(0, 19).replace('T', ' ') })
              .where(and(eq(cargoLoads.id, load.id), eq(cargoLoads.clientId, advance.clientId), areaScopeCondition(cargoAreaId, advanceArea)));
          } catch (e) { console.error('[clientAdvances] Erro ao marcar carga como paga:', e); }
        }
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
          loadValue,
          deducted,
          balanceBefore,
          balanceAfter,
          status: deducted >= loadValue ? 'abatido_total' : 'abatido_parcial',
        });
      }

      // Atualizar saldo do adiantamento
      await db.update(clientAdvances)
        .set({
          balanceRemaining: String(balanceRemaining),
          status: balanceRemaining <= 0 ? 'quitado' : 'ativo',
        })
        .where(and(eq(clientAdvances.id, input.advanceId), eq(clientAdvances.clientId, advance.clientId), areaScopeCondition(advanceAreaId, advanceArea)));

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
      areaId: z.number().nullable().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const advance = await scopedAdvance(db, input.advanceId, undefined, inputArea(input));
      if (!advance) throw new TRPCError({ code: "NOT_FOUND", message: "Adiantamento não encontrado" });
      assertArea(advance.areaId, inputArea(input));
      const buffer = Buffer.from(input.fileBase64, 'base64');
      const ext = input.mimeType.includes('pdf') ? 'pdf' : (input.mimeType.split('/')[1] || 'jpg');
      const key = `client-advances/${input.advanceId}/comprovante-${Date.now()}.${ext}`;
      const { url } = await storagePut(key, buffer, input.mimeType);
      await db.update(clientAdvances)
        .set({ receiptUrl: url })
        .where(and(eq(clientAdvances.id, advance.id), eq(clientAdvances.clientId, advance.clientId), areaScopeCondition(advanceAreaId, normalizeAreaId(advance.areaId))));
      return { url };
    }),

  // Atualizar adiantamento (amount, description, date, receiptUrl)
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      areaId: z.number().nullable().optional(),
      amount: z.number().positive().optional(),
      description: z.string().optional().nullable(),
      date: z.string().optional(),
      receiptUrl: z.string().optional().nullable(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });

      const advance = await scopedAdvance(db, input.id, undefined, inputArea(input));
      if (!advance) throw new TRPCError({ code: "NOT_FOUND", message: "Adiantamento não encontrado" });
      assertArea(advance.areaId, inputArea(input));

      const updateData: any = {};
      if (input.description !== undefined) updateData.description = input.description;
      if (input.date !== undefined) updateData.date = input.date;
      if (input.receiptUrl !== undefined) updateData.receiptUrl = input.receiptUrl;
      if (input.amount !== undefined) {
        // Recalcular balanceRemaining: novo amount - (amount original - balance atual)
        const originalAmount = parseFloat(advance.amount || '0');
        const currentBalance = parseFloat(advance.balanceRemaining || '0');
        const deducted = originalAmount - currentBalance;
        if (input.amount < deducted - 0.005) throw new TRPCError({code: 'BAD_REQUEST', message: 'O valor não pode ser menor que os abatimentos já realizados.'});
        const newBalance = Math.max(0, input.amount - deducted);
        updateData.amount = String(input.amount);
        updateData.balanceRemaining = String(newBalance);
        updateData.status = newBalance <= 0 ? 'quitado' : 'ativo';
      }

      await db.update(clientAdvances).set(updateData).where(and(eq(clientAdvances.id, input.id), areaScopeCondition(advanceAreaId, normalizeAreaId(advance.areaId))));
      return { success: true };
    }),

  // Deletar adiantamento
  // Se force=true, remove deduções e reverte paymentStatus das cargas abatidas
  delete: protectedProcedure
    .input(z.object({ id: z.number(), force: z.boolean().optional(), areaId: z.number().nullable().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
      const advance = await scopedAdvance(db, input.id, undefined, inputArea(input));
      if (!advance) throw new TRPCError({ code: "NOT_FOUND", message: "Adiantamento não encontrado" });
      assertArea(advance.areaId, inputArea(input));
      const deductions = await db.select().from(clientAdvanceDeductions).where(eq(clientAdvanceDeductions.advanceId, advance.id));
      if (deductions.length > 0 && !input.force) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Este adiantamento possui ${deductions.length} abatimento(s). Use a opção 'Forçar exclusão' para remover tudo.` });
      }
      if (deductions.length > 0 && input.force) {
        // Reverter paymentStatus APENAS das cargas que foram pagas EXCLUSIVAMENTE via este adiantamento
        // Cargas pagas manualmente (sem deduções vinculadas a este adiantamento, ou com paymentStatus='pago' por outra razão) NÃO devem ser revertidas
        const loadIds = deductions.map(d => d.cargoLoadId).filter(Boolean) as number[];
        for (const loadId of loadIds) {
          try {
            // Verificar se a carga foi paga manualmente (não via adiantamento)
            // Uma carga paga manualmente terá paymentStatus='pago' mas NÃO terá deduções de OUTROS adiantamentos
            // Buscar TODAS as deduções desta carga (de qualquer adiantamento)
            const allCargoDeductions = await db.select()
              .from(clientAdvanceDeductions)
              .where(eq(clientAdvanceDeductions.cargoLoadId, loadId));

            // Deduções de OUTROS adiantamentos (não o que está sendo excluído)
            const otherDeductions = allCargoDeductions.filter(d => d.advanceId !== input.id);

            // Buscar a carga para verificar o status atual
            const [cargo] = await db.select({ paymentStatus: cargoLoads.paymentStatus })
              .from(cargoLoads)
              .where(and(eq(cargoLoads.id, loadId), eq(cargoLoads.clientId, advance.clientId), areaScopeCondition(cargoAreaId, normalizeAreaId(advance.areaId))));

            // Só reverter se:
            // 1. A carga está marcada como paga
            // 2. NÃO há deduções de outros adiantamentos (o pagamento veio APENAS deste adiantamento)
            // 3. A carga não foi paga manualmente (se tiver paidAt mas sem nenhuma dedução, foi manual)
            if (cargo?.paymentStatus === 'pago' && otherDeductions.length === 0) {
              // Verificar se a carga tem deduções deste adiantamento que cobrem 100% do valor
              // Se a soma das deduções deste adiantamento = totalDeducted e não há outros, reverter
              const thisAdvanceDeductions = allCargoDeductions.filter(d => d.advanceId === input.id);
              const totalThisAdvance = thisAdvanceDeductions.reduce((sum, d) => sum + parseFloat(d.amount || '0'), 0);
              // Só reverter se o adiantamento que está sendo excluído foi responsável pelo pagamento
              if (totalThisAdvance > 0) {
                await db.update(cargoLoads)
                  .set({ paymentStatus: 'sem_boleto', paidAt: null } as any)
                  .where(and(eq(cargoLoads.id, loadId), eq(cargoLoads.clientId, advance.clientId), areaScopeCondition(cargoAreaId, normalizeAreaId(advance.areaId))));
              }
            }
            // Se a carga foi paga manualmente (paymentStatus='pago' sem deduções deste adiantamento marcando como pago)
            // ou se há outros adiantamentos cobrindo, NÃO reverter
          } catch (e) { console.error('[clientAdvances] Erro ao reverter carga:', e); }
        }
        // Excluir deduções
        await db.delete(clientAdvanceDeductions).where(eq(clientAdvanceDeductions.advanceId, input.id));
      }
      await db.delete(clientAdvances).where(and(eq(clientAdvances.id, advance.id), eq(clientAdvances.clientId, advance.clientId), areaScopeCondition(advanceAreaId, normalizeAreaId(advance.areaId))));
      return { success: true };
    }),

  // Limpar deduções duplicadas de um adiantamento (manter apenas a mais antiga por cargo_load_id)
  cleanDuplicateDeductions: protectedProcedure
    .input(z.object({ advanceId: z.number(), areaId: z.number().nullable().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Banco indisponível' });
      const advance = await scopedAdvance(db, input.advanceId, undefined, inputArea(input));
      if (!advance) throw new TRPCError({ code: "NOT_FOUND", message: "Adiantamento não encontrado" });
      assertArea(advance.areaId, inputArea(input));
      // Buscar todas as deduções do adiantamento ordenadas por id (mais antiga primeiro)
      const allDeductions = await db.select()
        .from(clientAdvanceDeductions)
        .where(eq(clientAdvanceDeductions.advanceId, input.advanceId))
        .orderBy(asc(clientAdvanceDeductions.id));
      // Agrupar por cargo_load_id e manter apenas a primeira (mais antiga)
      const seen = new Map();
      const toDelete = [];
      for (const d of allDeductions) {
        const key = d.cargoLoadId;
        if (key === null || key === undefined) continue; // deduções manuais sem carga, manter
        if (!seen.has(key)) {
          seen.set(key, d.id);
        } else {
          toDelete.push(d.id); // duplicata
        }
      }
      for (const id of toDelete) {
        await db.delete(clientAdvanceDeductions).where(eq(clientAdvanceDeductions.id, id));
      }
      // Recalcular saldo do adiantamento com base nas deduções restantes
      const remaining = await db.select()
        .from(clientAdvanceDeductions)
        .where(eq(clientAdvanceDeductions.advanceId, input.advanceId));
      const totalDeducted = remaining.reduce((sum, d) => sum + parseFloat(d.amount || '0'), 0);
      const [currentAdvance] = await db.select().from(clientAdvances).where(and(eq(clientAdvances.id, advance.id), eq(clientAdvances.clientId, advance.clientId), areaScopeCondition(advanceAreaId, normalizeAreaId(advance.areaId)))).limit(1);
      if (currentAdvance) {
        const originalAmount = parseFloat(currentAdvance.amount || '0');
        const newBalance = Math.max(0, originalAmount - totalDeducted);
        await db.update(clientAdvances).set({
          balanceRemaining: String(newBalance.toFixed(2)),
          status: newBalance <= 0 ? 'quitado' : 'ativo',
        }).where(and(eq(clientAdvances.id, currentAdvance.id), eq(clientAdvances.clientId, currentAdvance.clientId), areaScopeCondition(advanceAreaId, normalizeAreaId(currentAdvance.areaId))));
        return { success: true, deletedCount: toDelete.length, newBalance: newBalance.toFixed(2) };
      }
      return { success: true, deletedCount: toDelete.length, newBalance: null };
    }),

  // Processar abatimentos retroativos: abate automaticamente cargas entregues sem dedução
  processRetroactiveDeductions: protectedProcedure
    .input(z.object({ clientId: z.number(), areaId: z.number().nullable().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Banco indisponível' });

      const areaId = inputArea(input);
      const [client] = await db.select().from(clients).where(eq(clients.id, input.clientId)).limit(1);
      if (!client) throw new TRPCError({ code: "BAD_REQUEST", message: "Cliente inválido." });
      const area = areaId === null ? null : await checkedArea(db, input.clientId, areaId, true);
      const advances = await db.select().from(clientAdvances)
        .where(and(eq(clientAdvances.clientId, input.clientId), eq(clientAdvances.status, 'ativo'), areaScopeCondition(advanceAreaId, areaId)))
        .orderBy(asc(clientAdvances.date));
      if (advances.length === 0) return { success: true, processed: 0, message: 'Nenhum adiantamento ativo' };

      // Buscar cargas entregues do cliente sem dedução
      const deliveredCargos = await db.select().from(cargoLoads)
        .where(and(
          eq(cargoLoads.clientId, input.clientId),
          eq(cargoLoads.status, 'entregue'), ne(cargoLoads.paymentStatus, 'pago'), areaScopeCondition(cargoAreaId, areaId),
        ))
        .orderBy(cargoLoads.date);

      // Prices and unit are resolved from snapshots/confirmed area; never from a caller amount.


      let processed = 0;
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

      for (const cargo of deliveredCargos) {
        // Verificar se já tem dedução (independente do paymentStatus)
        const existing = await db.select({ id: clientAdvanceDeductions.id })
          .from(clientAdvanceDeductions)
          .where(eq(clientAdvanceDeductions.cargoLoadId, cargo.id))
          .limit(1);
        if (existing.length > 0) continue;

        const loadValue = getCargoFinancialValue(cargo as any, client as any, area as any);
        if (loadValue == null || loadValue <= 0) continue;
        if (loadValue <= 0) continue;

        const cargoDateStr = typeof cargo.date === 'string' ? cargo.date.slice(0, 10) : new Date(cargo.date).toISOString().slice(0, 10);
        let remainingToDeduct = loadValue;

        for (const advance of advances) {
          if (remainingToDeduct <= 0) break;
          let balanceRemaining = parseFloat(advance.balanceRemaining || '0');
          if (balanceRemaining <= 0) continue;
          if (advance.startDate && cargoDateStr < String(advance.startDate).slice(0,10)) continue;
          const deducted = Math.min(remainingToDeduct, balanceRemaining);
          const balanceBefore = balanceRemaining;
          const balanceAfter = balanceRemaining - deducted;
          await db.insert(clientAdvanceDeductions).values({
            advanceId: advance.id,
            clientId: input.clientId,
            cargoLoadId: cargo.id,
            amount: String(deducted.toFixed(2)),
            balanceBefore: String(balanceBefore.toFixed(2)),
            balanceAfter: String(balanceAfter.toFixed(2)),
            description: `Abatimento retroativo carga #${cargo.id} - ${cargoDateStr}`,
            date: cargoDateStr,
          });
          await db.update(clientAdvances).set({
            balanceRemaining: String(balanceAfter.toFixed(2)),
            status: balanceAfter <= 0 ? 'quitado' : 'ativo',
          }).where(and(eq(clientAdvances.id, advance.id), eq(clientAdvances.clientId, input.clientId), areaScopeCondition(advanceAreaId, areaId)));
          advance.balanceRemaining = String(balanceAfter.toFixed(2));
          remainingToDeduct -= deducted;
        }
        if (remainingToDeduct <= 0.01) {
          await db.update(cargoLoads)
            .set({ paymentStatus: 'pago', paidAt: now })
            .where(and(eq(cargoLoads.id, cargo.id), eq(cargoLoads.clientId, input.clientId), areaScopeCondition(cargoAreaId, areaId)));
        }
        processed++;
      }
      return { success: true, processed };
    }),

});
