// @ts-nocheck
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { sql } from "drizzle-orm";

// Helper: converte string monetária para número
// Suporta ambos os formatos:
//   Formato BR: "1.234,56" (ponto = milhar, vírgula = decimal)
//   Formato EN: "1234.56" ou "946.03" (ponto = decimal)
function toNum(v: string | null | undefined): number {
  if (!v) return 0;
  const s = String(v).replace(/R\$\s*/g, "").trim();
  // Se tem vírgula, é formato BR: remove pontos de milhar, troca vírgula por ponto
  if (s.includes(",")) {
    return parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0;
  }
  // Se tem ponto, é formato EN (ponto decimal) — não remover
  return parseFloat(s) || 0;
}

// Mapa de local de trabalho (work_location_id → nome)
const LOCATION_NAMES: Record<number, string> = {
  1: "Astorga / Sede",
  2: "Fazenda GW",
  3: "SIMFLOR",
};

function getLocationName(id: number | null | undefined): string {
  if (!id) return "Sem Local";
  return LOCATION_NAMES[id] || `Local #${id}`;
}

// Mapa de fuel_location → nome legível
const FUEL_LOCATION_NAMES: Record<string, string> = {
  simflor: "SIMFLOR",
  astorga: "Astorga / Sede",
  postos: "Postos Externos",
};

export const financialConsolidatedRouter = router({

  // ─── RESUMO GERAL (cards de totais por categoria) ─────────────────────────
  getSummary: protectedProcedure
    .input(z.object({
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      workLocationId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco de dados não disponível");

      const { dateFrom, dateTo, workLocationId } = input;

      type CategorySummary = {
        category: string;
        label: string;
        color: string;
        icon: string;
        total: number;
        count: number;
        subcategories: Record<string, { label: string; total: number; count: number }>;
      };

      const categories: Record<string, CategorySummary> = {
        combustivel: { category: "combustivel", label: "Combustível", color: "#f97316", icon: "fuel", total: 0, count: 0, subcategories: {} },
        manutencao: { category: "manutencao", label: "Manutenção", color: "#3b82f6", icon: "wrench", total: 0, count: 0, subcategories: {} },
        oleos: { category: "oleos", label: "Óleos", color: "#8b5cf6", icon: "droplet", total: 0, count: 0, subcategories: {} },
        pecas: { category: "pecas", label: "Peças", color: "#ec4899", icon: "cog", total: 0, count: 0, subcategories: {} },
        pedagio: { category: "pedagio", label: "Pedágio", color: "#14b8a6", icon: "road", total: 0, count: 0, subcategories: {} },
        refeicao: { category: "refeicao", label: "Refeição", color: "#f59e0b", icon: "utensils", total: 0, count: 0, subcategories: {} },
        servico_terceiro: { category: "servico_terceiro", label: "Serviços Terceiros", color: "#6366f1", icon: "users", total: 0, count: 0, subcategories: {} },
        compra_material: { category: "compra_material", label: "Compra de Material", color: "#10b981", icon: "package", total: 0, count: 0, subcategories: {} },
        folha: { category: "folha", label: "Folha de Pagamento", color: "#ef4444", icon: "users", total: 0, count: 0, subcategories: {} },
        frete: { category: "frete", label: "Frete / Terceirizados", color: "#64748b", icon: "truck", total: 0, count: 0, subcategories: {} },
        financeiro: { category: "financeiro", label: "Lançamentos Financeiros", color: "#0ea5e9", icon: "dollar", total: 0, count: 0, subcategories: {} },
        outros: { category: "outros", label: "Outros", color: "#94a3b8", icon: "more", total: 0, count: 0, subcategories: {} },
      };

      function addToCategory(cat: string, subcat: string, amount: number) {
        if (!categories[cat]) cat = "outros";
        categories[cat].total += amount;
        categories[cat].count++;
        if (!categories[cat].subcategories[subcat]) {
          categories[cat].subcategories[subcat] = { label: subcat, total: 0, count: 0 };
        }
        categories[cat].subcategories[subcat].total += amount;
        categories[cat].subcategories[subcat].count++;
      }

      // ── 1. COMBUSTÍVEL - Veículos (vehicle_records) ────────────────────────
      try {
        let q = `SELECT vr.*, e.name as equipment_name, e.client_id as equip_client_id
                 FROM vehicle_records vr
                 LEFT JOIN equipment e ON vr.equipment_id = e.id
                 WHERE vr.record_type = 'abastecimento'
                   AND vr.fuel_cost IS NOT NULL AND vr.fuel_cost != '' AND vr.fuel_cost != '0'`;
        if (dateFrom) q += ` AND vr.date >= '${dateFrom}'`;
        if (dateTo) q += ` AND vr.date <= '${dateTo} 23:59:59'`;
        if (workLocationId) q += ` AND vr.work_location_id = ${workLocationId}`;
        const [rows] = await db.execute(sql.raw(q));
        for (const r of rows as any[]) {
          const fuelTypeLabel: Record<string, string> = {
            diesel: "Diesel", diesel_s10: "Diesel S10", gasolina: "Gasolina",
            etanol: "Etanol", gnv: "GNV",
          };
          const subcat = fuelTypeLabel[r.fuel_type] || r.fuel_type || "Combustível";
          addToCategory("combustivel", subcat, toNum(r.fuel_cost));
        }
      } catch (e) { console.error("vehicle_records fuel:", e); }

      // ── 2. COMBUSTÍVEL - Máquinas (machine_fuel) ──────────────────────────
      try {
        let q = `SELECT mf.*, e.name as equipment_name FROM machine_fuel mf LEFT JOIN equipment e ON mf.equipment_id = e.id WHERE 1=1`;
        if (dateFrom) q += ` AND mf.date >= '${dateFrom}'`;
        if (dateTo) q += ` AND mf.date <= '${dateTo} 23:59:59'`;
        if (workLocationId) q += ` AND mf.work_location_id = ${workLocationId}`;
        const [rows] = await db.execute(sql.raw(q));
        for (const r of rows as any[]) {
          const fuelTypeLabel: Record<string, string> = {
            diesel: "Diesel", diesel_s10: "Diesel S10", gasolina: "Gasolina",
            mistura_2t: "Mistura 2T", arla: "Arla",
          };
          const subcat = fuelTypeLabel[r.fuel_type] || r.fuel_type || "Combustível Máquina";
          addToCategory("combustivel", `Máquinas - ${subcat}`, toNum(r.total_value));
        }
      } catch (e) { console.error("machine_fuel:", e); }

      // ── 3. MANUTENÇÃO - Máquinas (machine_maintenance) ────────────────────
      try {
        let q = `SELECT mm.*, e.name as equipment_name FROM machine_maintenance mm LEFT JOIN equipment e ON mm.equipment_id = e.id WHERE 1=1`;
        if (dateFrom) q += ` AND mm.date >= '${dateFrom}'`;
        if (dateTo) q += ` AND mm.date <= '${dateTo} 23:59:59'`;
        const [rows] = await db.execute(sql.raw(q));
        for (const r of rows as any[]) {
          const cost = toNum(r.total_cost);
          if (cost > 0) addToCategory("manutencao", "Manutenção Máquinas", cost);
        }
      } catch (e) { console.error("machine_maintenance:", e); }

      // ── 4. MANUTENÇÃO - Equipamentos (equipment_maintenance) ──────────────
      try {
        let q = `SELECT em.*, e.name as equipment_name FROM equipment_maintenance em LEFT JOIN equipment e ON em.equipment_id = e.id WHERE 1=1`;
        if (dateFrom) q += ` AND em.performed_at >= '${dateFrom}'`;
        if (dateTo) q += ` AND em.performed_at <= '${dateTo} 23:59:59'`;
        const [rows] = await db.execute(sql.raw(q));
        for (const r of rows as any[]) {
          const cost = toNum(r.cost) + toNum(r.labor_cost);
          if (cost > 0) addToCategory("manutencao", "Manutenção Equipamentos", cost);
        }
      } catch (e) { console.error("equipment_maintenance:", e); }

      // ── 5. PEÇAS - Manutenção (maintenance_parts) ─────────────────────────
      try {
        const [rows] = await db.execute(sql.raw(`SELECT mp.*, em.performed_at FROM maintenance_parts mp LEFT JOIN equipment_maintenance em ON mp.maintenance_id = em.id WHERE 1=1`));
        for (const r of rows as any[]) {
          const cost = toNum(r.total_cost);
          if (cost > 0) addToCategory("pecas", "Peças de Manutenção", cost);
        }
      } catch (e) { console.error("maintenance_parts:", e); }

      // ── 6. PEÇAS - Motosserra (chainsaw_part_movements saídas) ────────────
      try {
        let q = `SELECT cpm.*, cp.name as part_name FROM chainsaw_part_movements cpm LEFT JOIN chainsaw_parts cp ON cpm.part_id = cp.id WHERE cpm.type = 'saida'`;
        if (dateFrom) q += ` AND cpm.created_at >= '${dateFrom}'`;
        if (dateTo) q += ` AND cpm.created_at <= '${dateTo} 23:59:59'`;
        const [rows] = await db.execute(sql.raw(q));
        for (const r of rows as any[]) {
          const qty = parseFloat(String(r.quantity).replace(",", ".")) || 1;
          const cost = toNum(r.unit_cost) * qty;
          if (cost > 0) addToCategory("pecas", "Peças Motosserra", cost);
        }
      } catch (e) { console.error("chainsaw_part_movements:", e); }

      // ── 7. PEÇAS - Ordens de Serviço Motosserra (chainsaw_service_parts) ──
      try {
        let q = `SELECT csp.* FROM chainsaw_service_parts csp WHERE 1=1`;
        if (dateFrom) q += ` AND csp.created_at >= '${dateFrom}'`;
        if (dateTo) q += ` AND csp.created_at <= '${dateTo} 23:59:59'`;
        const [rows] = await db.execute(sql.raw(q));
        for (const r of rows as any[]) {
          const qty = parseFloat(String(r.quantity).replace(",", ".")) || 1;
          const cost = toNum(r.unit_cost) * qty;
          if (cost > 0) addToCategory("pecas", "Peças OS Motosserra", cost);
        }
      } catch (e) { console.error("chainsaw_service_parts:", e); }

      // ── 8. ÓLEOS - Consumo (equipment_oil_records) ────────────────────────
      try {
        let q = `SELECT eor.*, e.name as equipment_name FROM equipment_oil_records eor LEFT JOIN equipment e ON eor.equipment_id = e.id WHERE 1=1`;
        if (dateFrom) q += ` AND eor.date >= '${dateFrom}'`;
        if (dateTo) q += ` AND eor.date <= '${dateTo} 23:59:59'`;
        const [rows] = await db.execute(sql.raw(q));
        const oilTypeLabel: Record<string, string> = {
          hidraulico: "Óleo Hidráulico", motor: "Óleo Motor",
          transmissao: "Óleo Transmissão", diferencial: "Óleo Diferencial", outros: "Outros Óleos",
        };
        for (const r of rows as any[]) {
          const cost = toNum(r.total_value);
          if (cost > 0) addToCategory("oleos", oilTypeLabel[r.oil_type] || r.oil_type, cost);
        }
      } catch (e) { console.error("equipment_oil_records:", e); }

      // ── 9. GASTOS EXTRAS (extra_expenses) ────────────────────────────────
      try {
        let q = `SELECT * FROM extra_expenses WHERE 1=1`;
        if (dateFrom) q += ` AND date >= '${dateFrom}'`;
        if (dateTo) q += ` AND date <= '${dateTo} 23:59:59'`;
        if (workLocationId) q += ` AND work_location_id = ${workLocationId}`;
        const [rows] = await db.execute(sql.raw(q));
        const catMap: Record<string, string> = {
          abastecimento: "combustivel",
          refeicao: "refeicao",
          compra_material: "compra_material",
          servico_terceiro: "servico_terceiro",
          pedagio: "pedagio",
          outro: "outros",
        };
        const catLabel: Record<string, string> = {
          abastecimento: "Abastecimento (Extra)",
          refeicao: "Refeição",
          compra_material: "Compra de Material",
          servico_terceiro: "Serviço Terceiro",
          pedagio: "Pedágio",
          outro: "Outros",
        };
        for (const r of rows as any[]) {
          const cat = catMap[r.category] || "outros";
          const label = catLabel[r.category] || r.category;
          addToCategory(cat, label, toNum(r.amount));
        }
      } catch (e) { console.error("extra_expenses:", e); }

      // ── 10. FOLHA - Presenças (collaborator_attendance) ───────────────────
      try {
        let q = `SELECT ca.*, c.name as collaborator_name FROM collaborator_attendance ca LEFT JOIN collaborators c ON ca.collaborator_id = c.id WHERE 1=1`;
        if (dateFrom) q += ` AND ca.date >= '${dateFrom}'`;
        if (dateTo) q += ` AND ca.date <= '${dateTo} 23:59:59'`;
        if (workLocationId) q += ` AND ca.work_location_id = ${workLocationId}`;
        const [rows] = await db.execute(sql.raw(q));
        for (const r of rows as any[]) {
          const val = toNum(r.daily_value);
          if (val > 0) addToCategory("folha", "Diárias Colaboradores", val);
        }
      } catch (e) { console.error("collaborator_attendance:", e); }

      // ── 11. FRETE - Terceiros (cargo_loads.third_party_cost) ──────────────
      try {
        let q = `SELECT * FROM cargo_loads WHERE third_party_cost IS NOT NULL AND third_party_cost > 0`;
        if (dateFrom) q += ` AND created_at >= '${dateFrom}'`;
        if (dateTo) q += ` AND created_at <= '${dateTo} 23:59:59'`;
        const [rows] = await db.execute(sql.raw(q));
        for (const r of rows as any[]) {
          addToCategory("frete", "Frete Terceirizado", toNum(r.third_party_cost));
        }
      } catch (e) { console.error("cargo_loads third_party:", e); }

      // ── 12. LANÇAMENTOS MANUAIS (financial_entries despesas, não auto) ────
      try {
        let q = `SELECT * FROM financial_entries WHERE type = 'despesa' AND status = 'confirmado' AND (auto_generated IS NULL OR auto_generated = 0)`;
        if (dateFrom) q += ` AND date >= '${dateFrom}'`;
        if (dateTo) q += ` AND date <= '${dateTo} 23:59:59'`;
        const [rows] = await db.execute(sql.raw(q));
        const catMap: Record<string, string> = {
          combustivel: "combustivel", manutencao: "manutencao",
          material: "compra_material", servico_terceiro: "servico_terceiro",
          transporte: "frete", folha_pagamento: "folha",
          outro_despesa: "outros",
        };
        for (const r of rows as any[]) {
          const cat = catMap[r.category] || "financeiro";
          addToCategory(cat, `Financeiro: ${r.category}`, toNum(r.amount));
        }
      } catch (e) { console.error("financial_entries despesas:", e); }

      // Calcular total geral
      const totalGeral = Object.values(categories).reduce((s, c) => s + c.total, 0);

      return {
        categories: Object.values(categories)
          .filter(c => c.total > 0)
          .sort((a, b) => b.total - a.total)
          .map(c => ({
            ...c,
            subcategories: Object.values(c.subcategories).sort((a, b) => b.total - a.total),
            percentage: totalGeral > 0 ? (c.total / totalGeral) * 100 : 0,
          })),
        totalGeral,
      };
    }),

  // ─── DETALHE POR CATEGORIA (listagem completa com paginação) ─────────────
  getDetailByCategory: protectedProcedure
    .input(z.object({
      category: z.string(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      workLocationId: z.number().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(50),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco de dados não disponível");

      const { category, dateFrom, dateTo, workLocationId, page, pageSize } = input;
      const offset = (page - 1) * pageSize;

      type DetailRow = {
        id: string;
        date: string;
        description: string;
        subcategory: string;
        amount: number;
        location: string;
        equipmentName?: string;
        collaboratorName?: string;
        notes?: string;
        source: string;
      };

      const rows: DetailRow[] = [];

      if (category === "combustivel") {
        // Veículos
        try {
          let q = `SELECT vr.id, vr.date, vr.fuel_type, vr.liters, vr.fuel_cost, vr.price_per_liter,
                          vr.supplier, vr.fuel_location, vr.work_location_id, vr.notes,
                          e.name as equipment_name
                   FROM vehicle_records vr
                   LEFT JOIN equipment e ON vr.equipment_id = e.id
                   WHERE vr.record_type = 'abastecimento'
                     AND vr.fuel_cost IS NOT NULL AND vr.fuel_cost != '' AND vr.fuel_cost != '0'`;
          if (dateFrom) q += ` AND vr.date >= '${dateFrom}'`;
          if (dateTo) q += ` AND vr.date <= '${dateTo} 23:59:59'`;
          if (workLocationId) q += ` AND vr.work_location_id = ${workLocationId}`;
          q += ` ORDER BY vr.date DESC`;
          const [dbRows] = await db.execute(sql.raw(q));
          const fuelTypeLabel: Record<string, string> = {
            diesel: "Diesel", diesel_s10: "Diesel S10", gasolina: "Gasolina", etanol: "Etanol", gnv: "GNV",
          };
          for (const r of dbRows as any[]) {
            rows.push({
              id: `vr_${r.id}`,
              date: String(r.date).slice(0, 10),
              description: `${r.equipment_name || "Veículo"} — ${toNum(r.liters).toFixed(1)}L @ R$ ${toNum(r.price_per_liter).toFixed(3)}/L${r.supplier ? ` (${r.supplier})` : ""}`,
              subcategory: fuelTypeLabel[r.fuel_type] || r.fuel_type || "Combustível",
              amount: toNum(r.fuel_cost),
              location: getLocationName(r.work_location_id),
              equipmentName: r.equipment_name,
              notes: r.notes,
              source: "Abastecimento Veículos",
            });
          }
        } catch (e) { console.error(e); }

        // Máquinas
        try {
          let q = `SELECT mf.id, mf.date, mf.fuel_type, mf.liters, mf.total_value, mf.price_per_liter,
                          mf.supplier, mf.work_location_id, mf.notes,
                          e.name as equipment_name
                   FROM machine_fuel mf
                   LEFT JOIN equipment e ON mf.equipment_id = e.id
                   WHERE 1=1`;
          if (dateFrom) q += ` AND mf.date >= '${dateFrom}'`;
          if (dateTo) q += ` AND mf.date <= '${dateTo} 23:59:59'`;
          if (workLocationId) q += ` AND mf.work_location_id = ${workLocationId}`;
          q += ` ORDER BY mf.date DESC`;
          const [dbRows] = await db.execute(sql.raw(q));
          const fuelTypeLabel: Record<string, string> = {
            diesel: "Diesel", diesel_s10: "Diesel S10", gasolina: "Gasolina",
            mistura_2t: "Mistura 2T", arla: "Arla",
          };
          for (const r of dbRows as any[]) {
            rows.push({
              id: `mf_${r.id}`,
              date: String(r.date).slice(0, 10),
              description: `${r.equipment_name || "Máquina"} — ${toNum(r.liters).toFixed(1)}L${r.supplier ? ` (${r.supplier})` : ""}`,
              subcategory: `Máquinas - ${fuelTypeLabel[r.fuel_type] || r.fuel_type}`,
              amount: toNum(r.total_value),
              location: getLocationName(r.work_location_id),
              equipmentName: r.equipment_name,
              notes: r.notes,
              source: "Abastecimento Máquinas",
            });
          }
        } catch (e) { console.error(e); }

        // Gastos extras de abastecimento
        try {
          let q = `SELECT id, date, description, amount, work_location_id, notes FROM extra_expenses WHERE category = 'abastecimento'`;
          if (dateFrom) q += ` AND date >= '${dateFrom}'`;
          if (dateTo) q += ` AND date <= '${dateTo} 23:59:59'`;
          if (workLocationId) q += ` AND work_location_id = ${workLocationId}`;
          const [dbRows] = await db.execute(sql.raw(q));
          for (const r of dbRows as any[]) {
            rows.push({
              id: `ee_fuel_${r.id}`,
              date: String(r.date).slice(0, 10),
              description: r.description,
              subcategory: "Abastecimento (Extra)",
              amount: toNum(r.amount),
              location: getLocationName(r.work_location_id),
              notes: r.notes,
              source: "Gastos Extras",
            });
          }
        } catch (e) { console.error(e); }
      }

      if (category === "manutencao") {
        // Manutenção Máquinas
        try {
          let q = `SELECT mm.id, mm.date, mm.description, mm.total_cost, mm.labor_cost,
                          mm.type, mm.service_type, mm.mechanic_name, mm.third_party_company,
                          e.name as equipment_name, e.client_id
                   FROM machine_maintenance mm
                   LEFT JOIN equipment e ON mm.equipment_id = e.id
                   WHERE 1=1`;
          if (dateFrom) q += ` AND mm.date >= '${dateFrom}'`;
          if (dateTo) q += ` AND mm.date <= '${dateTo} 23:59:59'`;
          q += ` ORDER BY mm.date DESC`;
          const [dbRows] = await db.execute(sql.raw(q));
          const typeLabel: Record<string, string> = { preventiva: "Preventiva", corretiva: "Corretiva", revisao: "Revisão" };
          for (const r of dbRows as any[]) {
            const cost = toNum(r.total_cost);
            if (cost > 0) {
              rows.push({
                id: `mm_${r.id}`,
                date: String(r.date).slice(0, 10),
                description: `${r.equipment_name || "Máquina"} — ${typeLabel[r.type] || r.type}${r.mechanic_name ? ` (${r.mechanic_name})` : ""}${r.third_party_company ? ` / ${r.third_party_company}` : ""}`,
                subcategory: "Manutenção Máquinas",
                amount: cost,
                location: r.client_id ? (LOCATION_NAMES[r.client_id] || `Local #${r.client_id}`) : "Sem Local",
                equipmentName: r.equipment_name,
                notes: r.description,
                source: "Manutenção Máquinas",
              });
            }
          }
        } catch (e) { console.error(e); }

        // Manutenção Equipamentos
        try {
          let q = `SELECT em.id, em.performed_at as date, em.description, em.cost, em.labor_cost,
                          em.type, em.mechanic_name, em.third_party_company,
                          e.name as equipment_name, e.client_id
                   FROM equipment_maintenance em
                   LEFT JOIN equipment e ON em.equipment_id = e.id
                   WHERE 1=1`;
          if (dateFrom) q += ` AND em.performed_at >= '${dateFrom}'`;
          if (dateTo) q += ` AND em.performed_at <= '${dateTo} 23:59:59'`;
          q += ` ORDER BY em.performed_at DESC`;
          const [dbRows] = await db.execute(sql.raw(q));
          for (const r of dbRows as any[]) {
            const cost = toNum(r.cost) + toNum(r.labor_cost);
            if (cost > 0) {
              rows.push({
                id: `em_${r.id}`,
                date: String(r.date).slice(0, 10),
                description: `${r.equipment_name || "Equipamento"} — ${r.type || "Manutenção"}${r.mechanic_name ? ` (${r.mechanic_name})` : ""}`,
                subcategory: "Manutenção Equipamentos",
                amount: cost,
                location: r.client_id ? (LOCATION_NAMES[r.client_id] || `Local #${r.client_id}`) : "Sem Local",
                equipmentName: r.equipment_name,
                notes: r.description,
                source: "Manutenção Equipamentos",
              });
            }
          }
        } catch (e) { console.error(e); }
      }

      if (category === "oleos") {
        try {
          let q = `SELECT eor.id, eor.date, eor.oil_type, eor.quantity_liters, eor.total_value,
                          eor.brand, eor.supplier, eor.price_per_liter, eor.notes,
                          e.name as equipment_name
                   FROM equipment_oil_records eor
                   LEFT JOIN equipment e ON eor.equipment_id = e.id
                   WHERE 1=1`;
          if (dateFrom) q += ` AND eor.date >= '${dateFrom}'`;
          if (dateTo) q += ` AND eor.date <= '${dateTo} 23:59:59'`;
          q += ` ORDER BY eor.date DESC`;
          const [dbRows] = await db.execute(sql.raw(q));
          const oilTypeLabel: Record<string, string> = {
            hidraulico: "Óleo Hidráulico", motor: "Óleo Motor",
            transmissao: "Óleo Transmissão", diferencial: "Óleo Diferencial", outros: "Outros Óleos",
          };
          for (const r of dbRows as any[]) {
            const cost = toNum(r.total_value);
            if (cost > 0) {
              rows.push({
                id: `oil_${r.id}`,
                date: String(r.date).slice(0, 10),
                description: `${r.equipment_name || "Equipamento"} — ${oilTypeLabel[r.oil_type] || r.oil_type} ${toNum(r.quantity_liters).toFixed(1)}L${r.brand ? ` (${r.brand})` : ""}${r.supplier ? ` / ${r.supplier}` : ""}`,
                subcategory: oilTypeLabel[r.oil_type] || r.oil_type,
                amount: cost,
                location: "Geral",
                equipmentName: r.equipment_name,
                notes: r.notes,
                source: "Controle de Óleos",
              });
            }
          }
        } catch (e) { console.error(e); }
      }

      if (category === "pecas") {
        // Peças de Manutenção
        try {
          const [dbRows] = await db.execute(sql.raw(
            `SELECT mp.id, em.performed_at as date, mp.part_name, mp.quantity, mp.unit_cost, mp.total_cost,
                    e.name as equipment_name
             FROM maintenance_parts mp
             LEFT JOIN equipment_maintenance em ON mp.maintenance_id = em.id
             LEFT JOIN equipment e ON em.equipment_id = e.id
             ORDER BY em.performed_at DESC`
          ));
          for (const r of dbRows as any[]) {
            const cost = toNum(r.total_cost);
            if (cost > 0) {
              rows.push({
                id: `mp_${r.id}`,
                date: r.date ? String(r.date).slice(0, 10) : "—",
                description: `${r.part_name} x${r.quantity} — ${r.equipment_name || "Equipamento"}`,
                subcategory: "Peças de Manutenção",
                amount: cost,
                location: "Geral",
                equipmentName: r.equipment_name,
                source: "Peças Manutenção",
              });
            }
          }
        } catch (e) { console.error(e); }

        // Peças Motosserra (saídas)
        try {
          let q = `SELECT cpm.id, cpm.created_at as date, cpm.quantity, cpm.unit_cost, cpm.reason,
                          cp.name as part_name
                   FROM chainsaw_part_movements cpm
                   LEFT JOIN chainsaw_parts cp ON cpm.part_id = cp.id
                   WHERE cpm.type = 'saida'`;
          if (dateFrom) q += ` AND cpm.created_at >= '${dateFrom}'`;
          if (dateTo) q += ` AND cpm.created_at <= '${dateTo} 23:59:59'`;
          q += ` ORDER BY cpm.created_at DESC`;
          const [dbRows] = await db.execute(sql.raw(q));
          for (const r of dbRows as any[]) {
            const qty = parseFloat(String(r.quantity).replace(",", ".")) || 1;
            const cost = toNum(r.unit_cost) * qty;
            if (cost > 0) {
              rows.push({
                id: `cpm_${r.id}`,
                date: String(r.date).slice(0, 10),
                description: `${r.part_name || "Peça"} x${r.quantity}${r.reason ? ` — ${r.reason}` : ""}`,
                subcategory: "Peças Motosserra",
                amount: cost,
                location: "Geral",
                source: "Peças Motosserra",
              });
            }
          }
        } catch (e) { console.error(e); }
      }

      if (category === "pedagio") {
        try {
          let q = `SELECT id, date, description, amount, work_location_id, notes FROM extra_expenses WHERE category = 'pedagio'`;
          if (dateFrom) q += ` AND date >= '${dateFrom}'`;
          if (dateTo) q += ` AND date <= '${dateTo} 23:59:59'`;
          if (workLocationId) q += ` AND work_location_id = ${workLocationId}`;
          q += ` ORDER BY date DESC`;
          const [dbRows] = await db.execute(sql.raw(q));
          for (const r of dbRows as any[]) {
            rows.push({
              id: `ped_${r.id}`,
              date: String(r.date).slice(0, 10),
              description: r.description,
              subcategory: "Pedágio",
              amount: toNum(r.amount),
              location: getLocationName(r.work_location_id),
              notes: r.notes,
              source: "Gastos Extras",
            });
          }
        } catch (e) { console.error(e); }
      }

      if (category === "refeicao") {
        try {
          let q = `SELECT id, date, description, amount, work_location_id, notes FROM extra_expenses WHERE category = 'refeicao'`;
          if (dateFrom) q += ` AND date >= '${dateFrom}'`;
          if (dateTo) q += ` AND date <= '${dateTo} 23:59:59'`;
          if (workLocationId) q += ` AND work_location_id = ${workLocationId}`;
          q += ` ORDER BY date DESC`;
          const [dbRows] = await db.execute(sql.raw(q));
          for (const r of dbRows as any[]) {
            rows.push({
              id: `ref_${r.id}`,
              date: String(r.date).slice(0, 10),
              description: r.description,
              subcategory: "Refeição",
              amount: toNum(r.amount),
              location: getLocationName(r.work_location_id),
              notes: r.notes,
              source: "Gastos Extras",
            });
          }
        } catch (e) { console.error(e); }
      }

      if (category === "servico_terceiro") {
        try {
          let q = `SELECT id, date, description, amount, work_location_id, notes FROM extra_expenses WHERE category = 'servico_terceiro'`;
          if (dateFrom) q += ` AND date >= '${dateFrom}'`;
          if (dateTo) q += ` AND date <= '${dateTo} 23:59:59'`;
          if (workLocationId) q += ` AND work_location_id = ${workLocationId}`;
          q += ` ORDER BY date DESC`;
          const [dbRows] = await db.execute(sql.raw(q));
          for (const r of dbRows as any[]) {
            rows.push({
              id: `st_${r.id}`,
              date: String(r.date).slice(0, 10),
              description: r.description,
              subcategory: "Serviço Terceiro",
              amount: toNum(r.amount),
              location: getLocationName(r.work_location_id),
              notes: r.notes,
              source: "Gastos Extras",
            });
          }
        } catch (e) { console.error(e); }
      }

      if (category === "compra_material") {
        try {
          let q = `SELECT id, date, description, amount, work_location_id, notes FROM extra_expenses WHERE category = 'compra_material'`;
          if (dateFrom) q += ` AND date >= '${dateFrom}'`;
          if (dateTo) q += ` AND date <= '${dateTo} 23:59:59'`;
          if (workLocationId) q += ` AND work_location_id = ${workLocationId}`;
          q += ` ORDER BY date DESC`;
          const [dbRows] = await db.execute(sql.raw(q));
          for (const r of dbRows as any[]) {
            rows.push({
              id: `cm_${r.id}`,
              date: String(r.date).slice(0, 10),
              description: r.description,
              subcategory: "Compra de Material",
              amount: toNum(r.amount),
              location: getLocationName(r.work_location_id),
              notes: r.notes,
              source: "Gastos Extras",
            });
          }
        } catch (e) { console.error(e); }
      }

      if (category === "folha") {
        try {
          let q = `SELECT ca.id, ca.date, ca.daily_value, ca.employment_type_ca, ca.activity,
                          ca.work_location_id, ca.location_name, ca.payment_status_ca,
                          c.name as collaborator_name
                   FROM collaborator_attendance ca
                   LEFT JOIN collaborators c ON ca.collaborator_id = c.id
                   WHERE 1=1`;
          if (dateFrom) q += ` AND ca.date >= '${dateFrom}'`;
          if (dateTo) q += ` AND ca.date <= '${dateTo} 23:59:59'`;
          if (workLocationId) q += ` AND ca.work_location_id = ${workLocationId}`;
          q += ` ORDER BY ca.date DESC`;
          const [dbRows] = await db.execute(sql.raw(q));
          for (const r of dbRows as any[]) {
            const val = toNum(r.daily_value);
            if (val > 0) {
              rows.push({
                id: `att_${r.id}`,
                date: String(r.date).slice(0, 10),
                description: `${r.collaborator_name || "Colaborador"} — ${r.activity || "Diária"}`,
                subcategory: `Diária (${r.employment_type_ca || "diarista"})`,
                amount: val,
                location: r.location_name || getLocationName(r.work_location_id),
                collaboratorName: r.collaborator_name,
                source: "Presenças",
              });
            }
          }
        } catch (e) { console.error(e); }
      }

      if (category === "frete") {
        try {
          let q = `SELECT cl.id, cl.created_at as date, cl.destination, cl.third_party_cost,
                          cl.third_party_contractor, cl.client_name
                   FROM cargo_loads cl
                   WHERE cl.third_party_cost IS NOT NULL AND cl.third_party_cost > 0`;
          if (dateFrom) q += ` AND cl.created_at >= '${dateFrom}'`;
          if (dateTo) q += ` AND cl.created_at <= '${dateTo} 23:59:59'`;
          q += ` ORDER BY cl.created_at DESC`;
          const [dbRows] = await db.execute(sql.raw(q));
          for (const r of dbRows as any[]) {
            rows.push({
              id: `frete_${r.id}`,
              date: String(r.date).slice(0, 10),
              description: `Frete Carga #${r.id} → ${r.destination || "Destino"}${r.third_party_contractor ? ` (${r.third_party_contractor})` : ""}`,
              subcategory: "Frete Terceirizado",
              amount: toNum(r.third_party_cost),
              location: r.client_name || "Geral",
              source: "Controle de Cargas",
            });
          }
        } catch (e) { console.error(e); }
      }

      if (category === "financeiro" || category === "outros") {
        try {
          let q = `SELECT * FROM financial_entries WHERE type = 'despesa' AND status = 'confirmado' AND (auto_generated IS NULL OR auto_generated = 0)`;
          if (dateFrom) q += ` AND date >= '${dateFrom}'`;
          if (dateTo) q += ` AND date <= '${dateTo} 23:59:59'`;
          q += ` ORDER BY date DESC`;
          const [dbRows] = await db.execute(sql.raw(q));
          for (const r of dbRows as any[]) {
            rows.push({
              id: `fin_${r.id}`,
              date: String(r.date).slice(0, 10),
              description: r.description,
              subcategory: r.category,
              amount: toNum(r.amount),
              location: r.client_name || "Geral",
              notes: r.notes,
              source: "Financeiro Manual",
            });
          }
        } catch (e) { console.error(e); }
      }

      // Ordenar por data desc e paginar
      rows.sort((a, b) => b.date.localeCompare(a.date));
      const total = rows.length;
      const paginated = rows.slice(offset, offset + pageSize);

      return {
        rows: paginated,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
        totalAmount: rows.reduce((s, r) => s + r.amount, 0),
      };
    }),

  // ─── BREAKDOWN POR LOCAL DE TRABALHO ─────────────────────────────────────
  getByLocation: protectedProcedure
    .input(z.object({
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco de dados não disponível");

      const { dateFrom, dateTo } = input;

      type LocationData = {
        locationId: number | null;
        locationName: string;
        categories: Record<string, number>;
        total: number;
      };

      const locations: Record<string, LocationData> = {};

      function addToLocation(locId: number | null, locName: string, category: string, amount: number) {
        const key = locId !== null ? String(locId) : "null";
        if (!locations[key]) {
          locations[key] = { locationId: locId, locationName: locName, categories: {}, total: 0 };
        }
        locations[key].total += amount;
        if (!locations[key].categories[category]) locations[key].categories[category] = 0;
        locations[key].categories[category] += amount;
      }

      // Combustível Veículos
      try {
        let q = `SELECT work_location_id, SUM(CAST(REPLACE(REPLACE(IFNULL(fuel_cost,'0'),'R$',''),',','.') AS DECIMAL(12,2))) as total
                 FROM vehicle_records WHERE record_type='abastecimento' AND fuel_cost IS NOT NULL AND fuel_cost != '' AND fuel_cost != '0'`;
        if (dateFrom) q += ` AND date >= '${dateFrom}'`;
        if (dateTo) q += ` AND date <= '${dateTo} 23:59:59'`;
        q += ` GROUP BY work_location_id`;
        const [rows] = await db.execute(sql.raw(q));
        for (const r of rows as any[]) {
          addToLocation(r.work_location_id, getLocationName(r.work_location_id), "Combustível", toNum(String(r.total)));
        }
      } catch (e) {}

      // Combustível Máquinas
      try {
        let q = `SELECT work_location_id, SUM(CAST(REPLACE(REPLACE(IFNULL(total_value,'0'),'R$',''),',','.') AS DECIMAL(12,2))) as total
                 FROM machine_fuel WHERE 1=1`;
        if (dateFrom) q += ` AND date >= '${dateFrom}'`;
        if (dateTo) q += ` AND date <= '${dateTo} 23:59:59'`;
        q += ` GROUP BY work_location_id`;
        const [rows] = await db.execute(sql.raw(q));
        for (const r of rows as any[]) {
          addToLocation(r.work_location_id, getLocationName(r.work_location_id), "Combustível", toNum(String(r.total)));
        }
      } catch (e) {}

      // Gastos Extras
      try {
        let q = `SELECT work_location_id, category, SUM(CAST(REPLACE(REPLACE(IFNULL(amount,'0'),'R$',''),',','.') AS DECIMAL(12,2))) as total
                 FROM extra_expenses WHERE 1=1`;
        if (dateFrom) q += ` AND date >= '${dateFrom}'`;
        if (dateTo) q += ` AND date <= '${dateTo} 23:59:59'`;
        q += ` GROUP BY work_location_id, category`;
        const [rows] = await db.execute(sql.raw(q));
        const catMap: Record<string, string> = {
          abastecimento: "Combustível", refeicao: "Refeição",
          compra_material: "Compra de Material", servico_terceiro: "Serviços Terceiros",
          pedagio: "Pedágio", outro: "Outros",
        };
        for (const r of rows as any[]) {
          const cat = catMap[r.category] || "Outros";
          addToLocation(r.work_location_id, getLocationName(r.work_location_id), cat, toNum(String(r.total)));
        }
      } catch (e) {}

      // Presenças
      try {
        let q = `SELECT work_location_id, location_name, SUM(CAST(REPLACE(REPLACE(IFNULL(daily_value,'0'),'R$',''),',','.') AS DECIMAL(12,2))) as total
                 FROM collaborator_attendance WHERE 1=1`;
        if (dateFrom) q += ` AND date >= '${dateFrom}'`;
        if (dateTo) q += ` AND date <= '${dateTo} 23:59:59'`;
        q += ` GROUP BY work_location_id, location_name`;
        const [rows] = await db.execute(sql.raw(q));
        for (const r of rows as any[]) {
          const locName = r.location_name || getLocationName(r.work_location_id);
          addToLocation(r.work_location_id, locName, "Folha de Pagamento", toNum(String(r.total)));
        }
      } catch (e) {}

      // Manutenção Máquinas (via equipment.client_id)
      try {
        let q = `SELECT e.client_id, SUM(CAST(REPLACE(REPLACE(IFNULL(mm.total_cost,'0'),'R$',''),',','.') AS DECIMAL(12,2))) as total
                 FROM machine_maintenance mm LEFT JOIN equipment e ON mm.equipment_id = e.id WHERE 1=1`;
        if (dateFrom) q += ` AND mm.date >= '${dateFrom}'`;
        if (dateTo) q += ` AND mm.date <= '${dateTo} 23:59:59'`;
        q += ` GROUP BY e.client_id`;
        const [rows] = await db.execute(sql.raw(q));
        for (const r of rows as any[]) {
          addToLocation(r.client_id, getLocationName(r.client_id), "Manutenção", toNum(String(r.total)));
        }
      } catch (e) {}

      return {
        locations: Object.values(locations)
          .sort((a, b) => b.total - a.total)
          .map(loc => ({
            ...loc,
            categories: Object.entries(loc.categories)
              .map(([cat, total]) => ({ category: cat, total }))
              .sort((a, b) => b.total - a.total),
          })),
        totalGeral: Object.values(locations).reduce((s, l) => s + l.total, 0),
      };
    }),
});
