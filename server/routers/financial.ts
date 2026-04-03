import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { financialEntries, clients, collaboratorAttendance } from "../../drizzle/schema";
import { desc, eq, and, gte, lte, sql } from "drizzle-orm";

const INCOME_CATEGORIES = [
  "venda_madeira",
  "servico_corte",
  "servico_plantio",
  "servico_transporte",
  "servico_consultoria",
  "outro_receita",
] as const;

const EXPENSE_CATEGORIES = [
  "folha_pagamento",
  "combustivel",
  "manutencao",
  "material",
  "alimentacao",
  "transporte",
  "impostos",
  "aluguel",
  "servico_terceiro",
  "outro_despesa",
] as const;

export const financialRouter = router({
  // ── Listar lançamentos ──────────────────────────────────────────────────
  list: protectedProcedure
    .input(z.object({
      type: z.enum(["receita", "despesa", "all"]).default("all"),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      referenceMonth: z.string().optional(), // "2026-04"
      status: z.string().optional(),
      category: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const conditions = [];
      if (input.type !== "all") {
        conditions.push(eq(financialEntries.type, input.type));
      }
      if (input.dateFrom) {
        conditions.push(gte(financialEntries.date, new Date(input.dateFrom)));
      }
      if (input.dateTo) {
        const to = new Date(input.dateTo);
        to.setHours(23, 59, 59, 999);
        conditions.push(lte(financialEntries.date, to));
      }
      if (input.referenceMonth) {
        conditions.push(eq(financialEntries.referenceMonth, input.referenceMonth));
      }
      if (input.status) {
        conditions.push(eq(financialEntries.status, input.status as any));
      }
      if (input.category) {
        conditions.push(eq(financialEntries.category, input.category));
      }
      return db
        .select()
        .from(financialEntries)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(financialEntries.date));
    }),

  // ── Resumo mensal ────────────────────────────────────────────────────────
  monthlySummary: protectedProcedure
    .input(z.object({
      referenceMonth: z.string(), // "2026-04"
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { totalReceitas: 0, totalDespesas: 0, saldo: 0, entries: [] };

      const [year, month] = input.referenceMonth.split("-").map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);

      const entries = await db
        .select()
        .from(financialEntries)
        .where(and(
          gte(financialEntries.date, startDate),
          lte(financialEntries.date, endDate),
          eq(financialEntries.status, "confirmado")
        ))
        .orderBy(desc(financialEntries.date));

      const totalReceitas = entries
        .filter(e => e.type === "receita")
        .reduce((s, e) => s + parseFloat(e.amount || "0"), 0);
      const totalDespesas = entries
        .filter(e => e.type === "despesa")
        .reduce((s, e) => s + parseFloat(e.amount || "0"), 0);

      return {
        totalReceitas,
        totalDespesas,
        saldo: totalReceitas - totalDespesas,
        entries,
      };
    }),

  // ── Resumo por categoria ─────────────────────────────────────────────────
  categoryBreakdown: protectedProcedure
    .input(z.object({
      referenceMonth: z.string(),
      type: z.enum(["receita", "despesa"]),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const [year, month] = input.referenceMonth.split("-").map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);

      const rows = await db
        .select({
          category: financialEntries.category,
          total: sql<number>`coalesce(sum(cast(amount as decimal(10,2))), 0)`,
          count: sql<number>`count(*)`,
        })
        .from(financialEntries)
        .where(and(
          eq(financialEntries.type, input.type),
          gte(financialEntries.date, startDate),
          lte(financialEntries.date, endDate),
          eq(financialEntries.status, "confirmado")
        ))
        .groupBy(financialEntries.category)
        .orderBy(sql`total desc`);

      return rows.map(r => ({
        category: r.category,
        total: Number(r.total),
        count: Number(r.count),
      }));
    }),

  // ── Histórico mensal (últimos 12 meses) ──────────────────────────────────
  monthlyHistory: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) return [];

      const rows = await db
        .select({
          referenceMonth: financialEntries.referenceMonth,
          type: financialEntries.type,
          total: sql<number>`coalesce(sum(cast(amount as decimal(10,2))), 0)`,
        })
        .from(financialEntries)
        .where(and(
          eq(financialEntries.status, "confirmado"),
          sql`reference_month >= DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 11 MONTH), '%Y-%m')`
        ))
        .groupBy(financialEntries.referenceMonth, financialEntries.type)
        .orderBy(financialEntries.referenceMonth);

      // Agrupar por mês
      const byMonth: Record<string, { month: string; receitas: number; despesas: number; saldo: number }> = {};
      for (const r of rows) {
        const m = r.referenceMonth || "desconhecido";
        if (!byMonth[m]) byMonth[m] = { month: m, receitas: 0, despesas: 0, saldo: 0 };
        if (r.type === "receita") byMonth[m].receitas += Number(r.total);
        else byMonth[m].despesas += Number(r.total);
        byMonth[m].saldo = byMonth[m].receitas - byMonth[m].despesas;
      }

      return Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month));
    }),

  // ── Criar lançamento ─────────────────────────────────────────────────────
  create: protectedProcedure
    .input(z.object({
      type: z.enum(["receita", "despesa"]),
      category: z.string().min(1),
      description: z.string().min(1),
      amount: z.string().min(1),
      date: z.string(),
      paymentMethod: z.enum(["dinheiro", "pix", "cartao", "transferencia", "boleto", "cheque"]).default("pix"),
      status: z.enum(["pendente", "confirmado", "cancelado"]).default("confirmado"),
      clientId: z.number().optional(),
      clientName: z.string().optional(),
      receiptImageUrl: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const dateObj = new Date(input.date);
      const refMonth = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}`;
      const [result] = await db.insert(financialEntries).values({
        type: input.type,
        category: input.category,
        description: input.description,
        amount: input.amount,
        date: dateObj,
        referenceMonth: refMonth,
        paymentMethod: input.paymentMethod,
        status: input.status,
        clientId: input.clientId,
        clientName: input.clientName,
        receiptImageUrl: input.receiptImageUrl,
        notes: input.notes,
        registeredBy: ctx.user.id,
        registeredByName: ctx.user.name,
      });
      return { id: (result as any).insertId };
    }),

  // ── Atualizar lançamento ─────────────────────────────────────────────────
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      type: z.enum(["receita", "despesa"]).optional(),
      category: z.string().optional(),
      description: z.string().optional(),
      amount: z.string().optional(),
      date: z.string().optional(),
      paymentMethod: z.enum(["dinheiro", "pix", "cartao", "transferencia", "boleto", "cheque"]).optional(),
      status: z.enum(["pendente", "confirmado", "cancelado"]).optional(),
      clientName: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const { id, date, ...rest } = input;
      const updateData: any = { ...rest };
      if (date) {
        const dateObj = new Date(date);
        updateData.date = dateObj;
        updateData.referenceMonth = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}`;
      }
      await db.update(financialEntries).set(updateData).where(eq(financialEntries.id, id));
      return { success: true };
    }),

  // ──   // ── Excluir lançamento ───────────────────────────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.delete(financialEntries).where(eq(financialEntries.id, input.id));
      return { success: true };
    }),

  // ── Lançar folha de pagamento automaticamente ──────────────────────
  launchPayroll: protectedProcedure
    .input(z.object({
      referenceMonth: z.string(), // "YYYY-MM"
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      // Verificar se já existe lançamento de folha para este mês
      const existing = await db.select({ id: financialEntries.id })
        .from(financialEntries)
        .where(and(
          eq(financialEntries.referenceMonth, input.referenceMonth),
          eq(financialEntries.category, "folha_pagamento"),
          eq(financialEntries.type, "despesa")
        ))
        .limit(1);

      if (existing.length > 0) {
        return { success: false, alreadyExists: true, message: "Folha de pagamento já foi lançada para este mês." };
      }

      // Buscar todas as presenças do mês
      const [year, month] = input.referenceMonth.split("-").map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      const attendances = await db.select()
        .from(collaboratorAttendance)
        .where(and(
          gte(collaboratorAttendance.date, startDate),
          lte(collaboratorAttendance.date, endDate)
        ));

      if (attendances.length === 0) {
        return { success: false, alreadyExists: false, message: "Nenhuma presença registrada neste mês." };
      }

      // Calcular total de diárias
      const totalAmount = attendances.reduce((sum, a) => {
        return sum + parseFloat(a.dailyValue || "0");
      }, 0);

      const totalDays = attendances.length;

      // Formatar mês para descrição
      const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
      const monthLabel = `${monthNames[month - 1]} ${year}`;

      // Criar o lançamento
      await db.insert(financialEntries).values({
        type: "despesa",
        category: "folha_pagamento",
        description: `Folha de Pagamento — ${monthLabel} (${totalDays} diárias)`,
        amount: totalAmount.toFixed(2),
        date: endDate,
        referenceMonth: input.referenceMonth,
        paymentMethod: "pix",
        status: "confirmado",
        notes: `Lançamento automático gerado a partir de ${totalDays} registros de presença em ${monthLabel}.`,
        registeredBy: ctx.user.id,
        registeredByName: ctx.user.name,
      });

      return {
        success: true,
        alreadyExists: false,
        totalAmount: totalAmount.toFixed(2),
        totalDays,
        message: `Folha de ${monthLabel} lançada com sucesso: ${totalDays} diárias totalizando R$ ${totalAmount.toFixed(2)}.`,
      };
    }),

  // ── Verificar se folha já foi lançada ──────────────────────────────
  checkPayrollStatus: protectedProcedure
    .input(z.object({ referenceMonth: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const existing = await db.select({ id: financialEntries.id, amount: financialEntries.amount, description: financialEntries.description })
        .from(financialEntries)
        .where(and(
          eq(financialEntries.referenceMonth, input.referenceMonth),
          eq(financialEntries.category, "folha_pagamento"),
          eq(financialEntries.type, "despesa")
        ))
        .limit(1);
      return { launched: existing.length > 0, entry: existing[0] || null };
    }),
});
