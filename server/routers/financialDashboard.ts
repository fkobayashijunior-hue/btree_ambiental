import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  extraExpenses, fuelRecords, machineFuel, equipmentMaintenance,
  machineMaintenance, cargoLoads, buyerPayments,
  financialEntries, collaboratorAttendance, fuelInvoices,
  equipmentOilRecords,
} from "../../drizzle/schema";
import { and, gte, lte, sql, desc, eq } from "drizzle-orm";

function toNum(v: string | null | undefined): number {
  if (!v) return 0;
  return parseFloat(String(v).replace(",", ".")) || 0;
}

export const financialDashboardRouter = router({

  consolidated: protectedProcedure
    .input(z.object({
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { kpis: { totalReceitas: 0, totalCustos: 0, saldo: 0 }, byCategory: [], byLocation: [], transactions: [] };

      const { dateFrom, dateTo } = input;

      type Tx = {
        id: string;
        date: string;
        type: "receita" | "custo";
        category: string;
        subcategory: string;
        description: string;
        amount: number;
        location: string;
        source: string;
        equipmentName?: string;
        clientName?: string;
      };
      const transactions: Tx[] = [];

      // ── 1. Gastos Extras ──────────────────────────────────────────────────
      try {
        const rows = await db.select().from(extraExpenses).where(and(
          dateFrom ? gte(extraExpenses.date, dateFrom) : undefined,
          dateTo ? lte(extraExpenses.date, dateTo + " 23:59:59") : undefined,
        ) as any).orderBy(desc(extraExpenses.date));
        const catLabel: Record<string, string> = {
          abastecimento: "Abastecimento", refeicao: "Refeição",
          compra_material: "Compra de Material", servico_terceiro: "Serviço Terceiro",
          pedagio: "Pedágio", outro: "Outros",
        };
        for (const e of rows) {
          transactions.push({
            id: `extra_${e.id}`,
            date: String(e.date).slice(0, 10),
            type: "custo",
            category: "Gastos Extras",
            subcategory: catLabel[e.category] || e.category,
            description: e.description,
            amount: toNum(e.amount),
            location: (e as any).clientName || "Geral",
            source: "Gastos Extras",
            clientName: (e as any).clientName || undefined,
          });
        }
      } catch (_) {}

      // ── 2. Abastecimento (fuel_records) ───────────────────────────────────
      try {
        const rows = await db.select().from(fuelRecords).where(and(
          dateFrom ? gte(fuelRecords.date, dateFrom) : undefined,
          dateTo ? lte(fuelRecords.date, dateTo + " 23:59:59") : undefined,
        ) as any).orderBy(desc(fuelRecords.date));
        for (const f of rows) {
          transactions.push({
            id: `fuel_${f.id}`,
            date: String(f.date).slice(0, 10),
            type: "custo",
            category: "Combustível",
            subcategory: "Abastecimento Veículo",
            description: `Abastecimento — ${toNum(f.liters).toFixed(1)}L`,
            amount: toNum(f.totalValue),
            location: "Geral",
            source: "Abastecimento",
          });
        }
      } catch (_) {}

      // ── 3. Abastecimento Máquinas (machine_fuel) ──────────────────────────
      try {
        const rows = await db.select().from(machineFuel).where(and(
          dateFrom ? gte(machineFuel.date, dateFrom) : undefined,
          dateTo ? lte(machineFuel.date, dateTo + " 23:59:59") : undefined,
        ) as any).orderBy(desc(machineFuel.date));
        for (const f of rows) {
          transactions.push({
            id: `mfuel_${f.id}`,
            date: String(f.date).slice(0, 10),
            type: "custo",
            category: "Combustível",
            subcategory: "Abastecimento Máquina",
            description: `Abastecimento máquina — ${toNum(f.liters).toFixed(1)}L`,
            amount: toNum(f.totalValue),
            location: "Geral",
            source: "Abastecimento Máquinas",
          });
        }
      } catch (_) {}

      // ── 4. Manutenção de Equipamentos (equipment_maintenance) ─────────────
      try {
        const rows = await db.select().from(equipmentMaintenance).where(and(
          dateFrom ? gte(equipmentMaintenance.performedAt, dateFrom) : undefined,
          dateTo ? lte(equipmentMaintenance.performedAt, dateTo + " 23:59:59") : undefined,
        ) as any).orderBy(desc(equipmentMaintenance.performedAt));
        for (const m of rows) {
          const cost = toNum(m.cost);
          if (cost > 0) {
            transactions.push({
              id: `maint_${m.id}`,
              date: String(m.performedAt).slice(0, 10),
              type: "custo",
              category: "Manutenção",
              subcategory: "Manutenção Equipamento",
              description: String(m.description) || "Manutenção de equipamento",
              amount: cost,
              location: "Geral",
              source: "Manutenção",
            });
          }
        }
      } catch (_) {}

      // ── 5. Manutenção de Máquinas (machine_maintenance) ───────────────────
      try {
        const rows = await db.select().from(machineMaintenance).where(and(
          dateFrom ? gte(machineMaintenance.date, dateFrom) : undefined,
          dateTo ? lte(machineMaintenance.date, dateTo + " 23:59:59") : undefined,
        ) as any).orderBy(desc(machineMaintenance.date));
        for (const m of rows) {
          const cost = toNum(m.totalCost);
          if (cost > 0) {
            transactions.push({
              id: `mmaint_${m.id}`,
              date: String(m.date).slice(0, 10),
              type: "custo",
              category: "Manutenção",
              subcategory: "Manutenção Máquina",
              description: String(m.description || "Manutenção de máquina"),
              amount: cost,
              location: "Geral",
              source: "Manutenção Máquinas",
            });
          }
        }
      } catch (_) {}

      // ── 6. Óleo (equipment_oil_records) ───────────────────────────────────
      try {
        const rows = await db.select().from(equipmentOilRecords).where(and(
          dateFrom ? gte(equipmentOilRecords.date, dateFrom) : undefined,
          dateTo ? lte(equipmentOilRecords.date, dateTo + " 23:59:59") : undefined,
        ) as any).orderBy(desc(equipmentOilRecords.date));
        for (const o of rows) {
          const cost = toNum(o.totalValue);
          if (cost > 0) {
            transactions.push({
              id: `oil_${o.id}`,
              date: String(o.date).slice(0, 10),
              type: "custo",
              category: "Manutenção",
              subcategory: "Troca de Óleo",
              description: `Óleo ${o.oilType} — ${toNum(o.quantityLiters).toFixed(1)}L`,
              amount: cost,
              location: "Geral",
              source: "Controle de Óleo",
            });
          }
        }
      } catch (_) {}

      // ── 7. Cargas (receita + custo terceiro) ──────────────────────────────
      try {
        const rows = await db.select().from(cargoLoads).where(and(
          dateFrom ? gte(cargoLoads.date, dateFrom) : undefined,
          dateTo ? lte(cargoLoads.date, dateTo + " 23:59:59") : undefined,
        ) as any).orderBy(desc(cargoLoads.date));
        for (const c of rows) {
          const revenue = toNum(c.boletoAmount);
          if (revenue > 0) {
            transactions.push({
              id: `cargo_rev_${c.id}`,
              date: String(c.date).slice(0, 10),
              type: "receita",
              category: "Receita de Cargas",
              subcategory: "Venda de Madeira",
              description: `Carga #${c.id} — ${c.clientName || "Cliente"} (${toNum(c.volumeM3).toFixed(2)}m³)`,
              amount: revenue,
              location: c.clientName || "Geral",
              source: "Controle de Cargas",
              clientName: c.clientName || undefined,
            });
          }
          const thirdCost = toNum(c.thirdPartyCost);
          if (thirdCost > 0) {
            transactions.push({
              id: `cargo_third_${c.id}`,
              date: String(c.date).slice(0, 10),
              type: "custo",
              category: "Terceirizados",
              subcategory: "Frete Terceiro",
              description: `Frete terceiro — Carga #${c.id} (${c.thirdPartyContractor || ""})`,
              amount: thirdCost,
              location: c.clientName || "Geral",
              source: "Controle de Cargas",
            });
          }
        }
      } catch (_) {}

      // ── 8. Pagamentos de Compradores (receita confirmada) ─────────────────
      try {
        const rows = await db.select().from(buyerPayments).where(and(
          dateFrom ? gte(buyerPayments.paymentDate, dateFrom) : undefined,
          dateTo ? lte(buyerPayments.paymentDate, dateTo) : undefined,
          eq(buyerPayments.status, "pago"),
        ) as any).orderBy(desc(buyerPayments.paymentDate));
        for (const p of rows) {
          transactions.push({
            id: `bpay_${p.id}`,
            date: String(p.paymentDate).slice(0, 10),
            type: "receita",
            category: "Receita Confirmada",
            subcategory: "Pagamento de Comprador",
            description: `Pagamento recebido — Comprador #${p.buyerId}`,
            amount: toNum(p.amount),
            location: "Geral",
            source: "Compradores",
          });
        }
      } catch (_) {}

      // ── 9. Presenças (custo folha) ────────────────────────────────────────
      try {
        const rows = await db.select().from(collaboratorAttendance).where(and(
          dateFrom ? gte(collaboratorAttendance.date, dateFrom) : undefined,
          dateTo ? lte(collaboratorAttendance.date, dateTo + " 23:59:59") : undefined,
        ) as any).orderBy(desc(collaboratorAttendance.date));
        for (const a of rows) {
          const val = toNum(a.dailyValue);
          if (val > 0) {
            transactions.push({
              id: `att_${a.id}`,
              date: String(a.date).slice(0, 10),
              type: "custo",
              category: "Folha de Pagamento",
              subcategory: "Diária",
              description: `Diária — Colaborador #${a.collaboratorId}`,
              amount: val,
              location: a.locationName || "Geral",
              source: "Presenças",
            });
          }
        }
      } catch (_) {}

      // ── 10. Notas Fiscais de Combustível ──────────────────────────────────
      try {
        const rows = await db.select().from(fuelInvoices).where(and(
          dateFrom ? gte(fuelInvoices.invoiceDate, dateFrom) : undefined,
          dateTo ? lte(fuelInvoices.invoiceDate, dateTo) : undefined,
        ) as any).orderBy(desc(fuelInvoices.invoiceDate));
        for (const inv of rows) {
          const total = toNum(inv.totalAmount);
          if (total > 0) {
            transactions.push({
              id: `finv_${inv.id}`,
              date: String(inv.invoiceDate).slice(0, 10),
              type: "custo",
              category: "Combustível",
              subcategory: "Nota Fiscal Combustível",
              description: `NF Combustível #${inv.invoiceNumber} — ${inv.deliveryLocation || "Geral"}`,
              amount: total,
              location: inv.deliveryLocation || "Geral",
              source: "Combustível (NF)",
            });
          }
        }
      } catch (_) {}

      // ── 11. Lançamentos Manuais (financial_entries, não auto-gerados) ─────
      try {
        const rows = await db.select().from(financialEntries).where(and(
          dateFrom ? gte(financialEntries.date, dateFrom) : undefined,
          dateTo ? lte(financialEntries.date, dateTo + " 23:59:59") : undefined,
          eq(financialEntries.status, "confirmado"),
          eq(financialEntries.autoGenerated, 0),
        ) as any).orderBy(desc(financialEntries.date));
        for (const e of rows) {
          transactions.push({
            id: `fin_${e.id}`,
            date: String(e.date).slice(0, 10),
            type: e.type as "receita" | "custo",
            category: e.type === "receita" ? "Receita Manual" : "Despesa Manual",
            subcategory: e.category,
            description: e.description,
            amount: toNum(e.amount),
            location: e.clientName || "Geral",
            source: "Financeiro (Manual)",
            clientName: e.clientName || undefined,
            equipmentName: e.equipmentName || undefined,
          });
        }
      } catch (_) {}

      // ── Calcular KPIs ─────────────────────────────────────────────────────
      const totalReceitas = transactions.filter(t => t.type === "receita").reduce((s, t) => s + t.amount, 0);
      const totalCustos = transactions.filter(t => t.type === "custo").reduce((s, t) => s + t.amount, 0);

      // ── Agrupar por categoria ─────────────────────────────────────────────
      const catMap: Record<string, { category: string; type: "receita" | "custo"; total: number; count: number }> = {};
      for (const t of transactions) {
        const key = `${t.type}_${t.category}`;
        if (!catMap[key]) catMap[key] = { category: t.category, type: t.type, total: 0, count: 0 };
        catMap[key].total += t.amount;
        catMap[key].count++;
      }
      const byCategory = Object.values(catMap).sort((a, b) => b.total - a.total);

      // ── Agrupar por local de trabalho ─────────────────────────────────────
      const locMap: Record<string, { location: string; custos: number; receitas: number }> = {};
      for (const t of transactions) {
        const loc = t.location || "Geral";
        if (!locMap[loc]) locMap[loc] = { location: loc, custos: 0, receitas: 0 };
        if (t.type === "custo") locMap[loc].custos += t.amount;
        else locMap[loc].receitas += t.amount;
      }
      const byLocation = Object.values(locMap)
        .map(l => ({ ...l, saldo: l.receitas - l.custos }))
        .sort((a, b) => b.receitas - a.receitas);

      transactions.sort((a, b) => b.date.localeCompare(a.date));

      return {
        kpis: { totalReceitas, totalCustos, saldo: totalReceitas - totalCustos },
        byCategory,
        byLocation,
        transactions,
      };
    }),
});
