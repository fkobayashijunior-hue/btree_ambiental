/**
 * AUDITORIA DE DADOS — Exclusivo para administradores
 *
 * Agrega TODOS os registros de custo e receita do sistema em uma única consulta,
 * com metadados técnicos (tabela de origem, campo, categoria) para facilitar
 * a conferência e comunicação de melhorias.
 *
 * Fontes de dados:
 *  CUSTOS:
 *   1. collaborator_attendance      → mão de obra (diárias/pagamentos)
 *   2. vehicle_records (abastecimento, proprio) → combustível de veículos próprios
 *   3. vehicle_records (manutencao)    → manutenção de veículos
 *   4. fuel_records                 → combustível de máquinas/motosserras
 *   5. machine_maintenance          → manutenção de máquinas
 *   6. extra_expenses               → despesas extras
 *   7. third_party_fuel             → combustível de terceirizados (caminhões)
 *   8. vehicle_records (abastecimento, terceirizado) → combustível caminhões terceirizados
 *   9. cargo_loads (thirdPartyContractor) → corte terceirizado
 *  10. financial_entries (type=despesa) → despesas manuais
 *  RECEITAS:
 *  11. buyer_payments (status=pago) → pagamentos de compradores (Líder, Sonoco...)
 *  12. financial_entries (type=receita) → receitas manuais e auto-geradas
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import {
  collaboratorAttendance,
  collaborators,
  vehicleRecords,
  equipment,
  fuelRecords,
  machineMaintenance,
  extraExpenses,
  thirdPartyFuel,
  cargoLoads,
  buyerPayments,
  buyerClients,
  financialEntries,
  gpsLocations,
} from "../../drizzle/schema";
import { eq, and, gte, lte, isNotNull } from "drizzle-orm";

export type AuditRow = {
  id: string;
  date: string;
  tipo: "custo" | "receita";
  categoria: string;
  subcategoria: string;
  descricao: string;
  valor: number;
  localId: number | null;
  localNome: string | null;
  origem_tabela: string;
  origem_campo: string;
  origem_id: number;
  registradoPor: string | null;
  observacoes: string | null;
};

export const auditDataRouter = router({
  list: protectedProcedure
    .input(z.object({
      dateFrom: z.string(), // YYYY-MM-DD
      dateTo: z.string(),
      tipo: z.enum(["todos", "custo", "receita"]).default("todos"),
      categoria: z.string().optional(),
      localId: z.number().optional(),
    }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a administradores." });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const dateFrom = input.dateFrom + " 00:00:00";
      const dateTo = input.dateTo + " 23:59:59";
      const rows: AuditRow[] = [];

      // ── Resolver nomes dos locais ──────────────────────────────────────────
      const allLocations = await db.select({ id: gpsLocations.id, name: gpsLocations.name }).from(gpsLocations);
      const locMap: Record<number, string> = {};
      for (const l of allLocations) locMap[l.id] = l.name;
      const locName = (id: number | null | undefined): string | null => (id ? (locMap[id] ?? `Local #${id}`) : null);

      const matchLocal = (locId: number | null | undefined) => !input.localId || locId === input.localId;
      const matchCat = (cat: string) => !input.categoria || input.categoria === cat;

      // ── 1. MÃO DE OBRA — collaborator_attendance ───────────────────────────
      if (input.tipo === "todos" || input.tipo === "custo") {
        const att = await db
          .select({
            id: collaboratorAttendance.id,
            date: collaboratorAttendance.date,
            dailyValue: collaboratorAttendance.dailyValue,
            workLocationId: collaboratorAttendance.workLocationId,
            employmentTypeCa: collaboratorAttendance.employmentTypeCa,
            observations: collaboratorAttendance.observations,
            activity: collaboratorAttendance.activity,
            collaboratorName: collaborators.name,
          })
          .from(collaboratorAttendance)
          .leftJoin(collaborators, eq(collaboratorAttendance.collaboratorId, collaborators.id))
          .where(and(gte(collaboratorAttendance.date, dateFrom), lte(collaboratorAttendance.date, dateTo)));

        for (const r of att) {
          const locId = r.workLocationId ?? null;
          if (!matchLocal(locId)) continue;
          const cat = "Mão de Obra";
          if (!matchCat(cat)) continue;
          rows.push({
            id: `att-${r.id}`,
            date: (r.date as string).slice(0, 10),
            tipo: "custo",
            categoria: cat,
            subcategoria: r.employmentTypeCa === "terceirizado" ? "Terceirizado" : r.employmentTypeCa === "diarista" ? "Diarista" : "CLT",
            descricao: `Diária — ${r.collaboratorName ?? "Colaborador"}${r.activity ? ` | ${r.activity}` : ""}`,
            valor: parseFloat(r.dailyValue || "0"),
            localId: locId,
            localNome: locName(locId),
            origem_tabela: "collaborator_attendance",
            origem_campo: "daily_value",
            origem_id: r.id,
            registradoPor: null,
            observacoes: r.observations ?? null,
          });
        }
      }

      // ── 2. COMBUSTÍVEL DE VEÍCULOS PRÓPRIOS — vehicle_records ─────────────
      if (input.tipo === "todos" || input.tipo === "custo") {
        const vf = await db
          .select({
            id: vehicleRecords.id,
            date: vehicleRecords.date,
            fuelCost: vehicleRecords.fuelCost,
            liters: vehicleRecords.liters,
            supplier: vehicleRecords.supplier,
            workLocationId: vehicleRecords.workLocationId,
            serviceType: vehicleRecords.serviceType,
            equipName: equipment.name,
            notes: vehicleRecords.notes,
          })
          .from(vehicleRecords)
          .leftJoin(equipment, eq(vehicleRecords.equipmentId, equipment.id))
          .where(and(
            eq(vehicleRecords.recordType, "abastecimento"),
            gte(vehicleRecords.date, dateFrom),
            lte(vehicleRecords.date, dateTo),
          ));

        for (const r of vf) {
          const locId = r.workLocationId ?? null;
          if (!matchLocal(locId)) continue;
          const cat = "Combustível";
          if (!matchCat(cat)) continue;
          const sub = r.serviceType === "terceirizado" ? "Veículo Terceirizado" : "Veículo Próprio";
          rows.push({
            id: `vf-${r.id}`,
            date: (r.date as string).slice(0, 10),
            tipo: "custo",
            categoria: cat,
            subcategoria: sub,
            descricao: `Abastecimento — ${r.equipName ?? "Veículo"} | ${r.liters ?? "?"}L${r.supplier ? ` @ ${r.supplier}` : ""}`,
            valor: parseFloat(r.fuelCost || "0"),
            localId: locId,
            localNome: locName(locId),
            origem_tabela: "vehicle_records",
            origem_campo: "fuel_cost [recordType=abastecimento]",
            origem_id: r.id,
            registradoPor: null,
            observacoes: r.notes ?? null,
          });
        }
      }

      // ── 3. MANUTENÇÃO DE VEÍCULOS — vehicle_records (manutencao) ───────────
      if (input.tipo === "todos" || input.tipo === "custo") {
        const vm = await db
          .select({
            id: vehicleRecords.id,
            date: vehicleRecords.date,
            maintenanceCost: vehicleRecords.maintenanceCost,
            maintenanceType: vehicleRecords.maintenanceType,
            workLocationId: vehicleRecords.workLocationId,
            equipName: equipment.name,
            notes: vehicleRecords.notes,
          })
          .from(vehicleRecords)
          .leftJoin(equipment, eq(vehicleRecords.equipmentId, equipment.id))
          .where(and(
            eq(vehicleRecords.recordType, "manutencao"),
            gte(vehicleRecords.date, dateFrom),
            lte(vehicleRecords.date, dateTo),
          ));

        for (const r of vm) {
          const locId = r.workLocationId ?? null;
          if (!matchLocal(locId)) continue;
          const cat = "Manutenção";
          if (!matchCat(cat)) continue;
          rows.push({
            id: `vm-${r.id}`,
            date: (r.date as string).slice(0, 10),
            tipo: "custo",
            categoria: cat,
            subcategoria: "Veículo",
            descricao: `Manutenção — ${r.equipName ?? "Veículo"} | ${r.maintenanceType ?? "Tipo não informado"}`,
            valor: parseFloat(r.maintenanceCost || "0"),
            localId: locId,
            localNome: locName(locId),
            origem_tabela: "vehicle_records",
            origem_campo: "maintenance_cost [recordType=manutencao]",
            origem_id: r.id,
            registradoPor: null,
            observacoes: r.notes ?? null,
          });
        }
      }

      // ── 4. COMBUSTÍVEL DE MÁQUINAS — fuel_records ──────────────────────────
      if (input.tipo === "todos" || input.tipo === "custo") {
        const mf = await db
          .select({
            id: fuelRecords.id,
            date: fuelRecords.date,
            totalValue: fuelRecords.totalValue,
            liters: fuelRecords.liters,
            station: fuelRecords.station,
            workLocationId: fuelRecords.workLocationId,
            equipName: equipment.name,
          })
          .from(fuelRecords)
          .leftJoin(equipment, eq(fuelRecords.equipmentId, equipment.id))
          .where(and(gte(fuelRecords.date, dateFrom), lte(fuelRecords.date, dateTo)));

        for (const r of mf) {
          const locId = r.workLocationId ?? null;
          if (!matchLocal(locId)) continue;
          const cat = "Combustível";
          if (!matchCat(cat)) continue;
          rows.push({
            id: `mf-${r.id}`,
            date: (r.date as string).slice(0, 10),
            tipo: "custo",
            categoria: cat,
            subcategoria: "Máquina/Motosserra",
            descricao: `Abastecimento — ${r.equipName ?? "Máquina"} | ${r.liters ?? "?"}L${r.station ? ` @ ${r.station}` : ""}`,
            valor: parseFloat(r.totalValue || "0"),
            localId: locId,
            localNome: locName(locId),
            origem_tabela: "fuel_records",
            origem_campo: "total_value",
            origem_id: r.id,
            registradoPor: null,
            observacoes: null,
          });
        }
      }

      // ── 5. MANUTENÇÃO DE MÁQUINAS — machine_maintenance ────────────────────
      if (input.tipo === "todos" || input.tipo === "custo") {
        const mm = await db
          .select({
            id: machineMaintenance.id,
            date: machineMaintenance.date,
            totalCost: machineMaintenance.totalCost,
            type: machineMaintenance.type,
            serviceType: machineMaintenance.serviceType,
            description: machineMaintenance.description,
            equipName: equipment.name,
          })
          .from(machineMaintenance)
          .leftJoin(equipment, eq(machineMaintenance.equipmentId, equipment.id))
          .where(and(gte(machineMaintenance.date, dateFrom), lte(machineMaintenance.date, dateTo)));

        for (const r of mm) {
          const cat = "Manutenção";
          if (!matchLocal(null)) continue; // machine_maintenance não tem workLocationId
          if (!matchCat(cat)) continue;
          rows.push({
            id: `mm-${r.id}`,
            date: (r.date as string).slice(0, 10),
            tipo: "custo",
            categoria: cat,
            subcategoria: `Máquina (${r.serviceType === "terceirizado" ? "Terceirizado" : "Próprio"})`,
            descricao: `Manutenção ${r.type ?? ""} — ${r.equipName ?? "Máquina"}${r.description ? ` | ${r.description}` : ""}`,
            valor: parseFloat(r.totalCost || "0"),
            localId: null,
            localNome: null,
            origem_tabela: "machine_maintenance",
            origem_campo: "total_cost",
            origem_id: r.id,
            registradoPor: null,
            observacoes: null,
          });
        }
      }

      // ── 6. DESPESAS EXTRAS — extra_expenses ────────────────────────────────
      if (input.tipo === "todos" || input.tipo === "custo") {
        const ee = await db
          .select({
            id: extraExpenses.id,
            date: extraExpenses.date,
            amount: extraExpenses.amount,
            category: extraExpenses.category,
            description: extraExpenses.description,
            workLocationId: extraExpenses.workLocationId,
            registeredByName: extraExpenses.registeredByName,
            notes: extraExpenses.notes,
          })
          .from(extraExpenses)
          .where(and(gte(extraExpenses.date, dateFrom), lte(extraExpenses.date, dateTo)));

        const catLabels: Record<string, string> = {
          abastecimento: "Combustível",
          refeicao: "Alimentação",
          compra_material: "Material",
          servico_terceiro: "Serviço Terceiro",
          pedagio: "Pedágio/Transporte",
          outro: "Outro",
        };

        for (const r of ee) {
          const locId = r.workLocationId ?? null;
          if (!matchLocal(locId)) continue;
          const cat = "Despesa Extra";
          if (!matchCat(cat)) continue;
          rows.push({
            id: `ee-${r.id}`,
            date: (r.date as string).slice(0, 10),
            tipo: "custo",
            categoria: cat,
            subcategoria: catLabels[r.category ?? "outro"] ?? r.category ?? "Outro",
            descricao: r.description ?? "Despesa extra",
            valor: parseFloat(r.amount || "0"),
            localId: locId,
            localNome: locName(locId),
            origem_tabela: "extra_expenses",
            origem_campo: "amount",
            origem_id: r.id,
            registradoPor: r.registeredByName ?? null,
            observacoes: r.notes ?? null,
          });
        }
      }

      // ── 7. COMBUSTÍVEL TERCEIRIZADOS — third_party_fuel ────────────────────
      if (input.tipo === "todos" || input.tipo === "custo") {
        const tpf = await db
          .select({
            id: thirdPartyFuel.id,
            date: thirdPartyFuel.date,
            total: thirdPartyFuel.total,
            liters: thirdPartyFuel.liters,
            location: thirdPartyFuel.location,
            notes: thirdPartyFuel.notes,
            equipName: equipment.name,
          })
          .from(thirdPartyFuel)
          .leftJoin(equipment, eq(thirdPartyFuel.equipmentId, equipment.id))
          .where(and(gte(thirdPartyFuel.date, dateFrom), lte(thirdPartyFuel.date, dateTo)));

        for (const r of tpf) {
          if (input.localId) continue; // third_party_fuel não tem workLocationId
          const cat = "Combustível";
          if (!matchCat(cat)) continue;
          rows.push({
            id: `tpf-${r.id}`,
            date: (r.date as string).slice(0, 10),
            tipo: "custo",
            categoria: cat,
            subcategoria: "Caminhão Terceirizado",
            descricao: `Abastecimento terceirizado — ${r.equipName ?? "Caminhão"} | ${r.liters ?? "?"}L${r.location ? ` @ ${r.location}` : ""}`,
            valor: parseFloat(r.total || "0"),
            localId: null,
            localNome: null,
            origem_tabela: "third_party_fuel",
            origem_campo: "total",
            origem_id: r.id,
            registradoPor: null,
            observacoes: r.notes ?? null,
          });
        }
      }

      // ── 8. CORTE TERCEIRIZADO — cargo_loads.third_party_cost ───────────────
      if (input.tipo === "todos" || input.tipo === "custo") {
        const ct = await db
          .select({
            id: cargoLoads.id,
            date: cargoLoads.date,
            thirdPartyCost: cargoLoads.thirdPartyCost,
            thirdPartyContractor: cargoLoads.thirdPartyContractor,
            workLocationId: cargoLoads.workLocationId,
            destination: cargoLoads.destination,
          })
          .from(cargoLoads)
          .where(and(
            gte(cargoLoads.date, dateFrom),
            lte(cargoLoads.date, dateTo),
            isNotNull(cargoLoads.thirdPartyContractor),
          ));

        for (const r of ct) {
          if (!r.thirdPartyContractor || r.thirdPartyContractor.trim() === "") continue;
          const locId = r.workLocationId ?? null;
          if (!matchLocal(locId)) continue;
          const cat = "Corte Terceirizado";
          if (!matchCat(cat)) continue;
          rows.push({
            id: `ct-${r.id}`,
            date: (r.date as string).slice(0, 10),
            tipo: "custo",
            categoria: cat,
            subcategoria: r.thirdPartyContractor,
            descricao: `Corte terceirizado — Carga #${r.id} | Destino: ${r.destination ?? "N/A"}`,
            valor: parseFloat(r.thirdPartyCost || "0"),
            localId: locId,
            localNome: locName(locId),
            origem_tabela: "cargo_loads",
            origem_campo: "third_party_cost",
            origem_id: r.id,
            registradoPor: null,
            observacoes: null,
          });
        }
      }

      // ── 9. DESPESAS FINANCEIRAS MANUAIS — financial_entries (despesa) ──────
      if (input.tipo === "todos" || input.tipo === "custo") {
        const ft = await db
          .select({
            id: financialEntries.id,
            date: financialEntries.date,
            amount: financialEntries.amount,
            description: financialEntries.description,
            category: financialEntries.category,
            registeredByName: financialEntries.registeredByName,
            notes: financialEntries.notes,
          })
          .from(financialEntries)
          .where(and(
            eq(financialEntries.type, "despesa"),
            gte(financialEntries.date, dateFrom),
            lte(financialEntries.date, dateTo),
          ));

        const catMap: Record<string, string> = {
          folha_pagamento: "Mão de Obra",
          combustivel: "Combustível",
          manutencao: "Manutenção",
          material: "Material",
          alimentacao: "Alimentação",
          transporte: "Transporte",
          impostos: "Impostos",
          aluguel: "Aluguel",
          servico_terceiro: "Serviço Terceiro",
          outro_despesa: "Outro",
          frete_terceirizado: "Frete Terceirizado",
          servico_corte: "Corte Terceirizado",
        };

        for (const r of ft) {
          if (input.localId) continue; // financial_entries não tem workLocationId
          const cat = catMap[r.category] ?? r.category ?? "Despesa";
          if (!matchCat(cat)) continue;
          rows.push({
            id: `fe-${r.id}`,
            date: (r.date as string).slice(0, 10),
            tipo: "custo",
            categoria: cat,
            subcategoria: `financial_entries.category = '${r.category}'`,
            descricao: r.description ?? "Despesa financeira",
            valor: parseFloat(r.amount || "0"),
            localId: null,
            localNome: null,
            origem_tabela: "financial_entries",
            origem_campo: "amount [type=despesa]",
            origem_id: r.id,
            registradoPor: r.registeredByName ?? null,
            observacoes: r.notes ?? null,
          });
        }
      }

      // ── 10. RECEITA — buyer_payments (status=pago) ─────────────────────────
      if (input.tipo === "todos" || input.tipo === "receita") {
        const bp = await db
          .select({
            id: buyerPayments.id,
            paymentDate: buyerPayments.paymentDate,
            amount: buyerPayments.amount,
            buyerName: buyerClients.name,
            invoiceNumber: buyerPayments.invoiceNumber,
            notes: buyerPayments.notes,
          })
          .from(buyerPayments)
          .leftJoin(buyerClients, eq(buyerPayments.buyerId, buyerClients.id))
          .where(and(
            eq(buyerPayments.status, "pago"),
            gte(buyerPayments.paymentDate, input.dateFrom),
            lte(buyerPayments.paymentDate, input.dateTo),
          ));

        for (const r of bp) {
          if (input.localId) continue; // buyer_payments não tem localId
          const cat = "Receita — Venda de Madeira";
          if (!matchCat(cat)) continue;
          rows.push({
            id: `bp-${r.id}`,
            date: r.paymentDate?.slice(0, 10) ?? "",
            tipo: "receita",
            categoria: cat,
            subcategoria: r.buyerName ?? "Comprador",
            descricao: `Pagamento — ${r.buyerName ?? "Comprador"}${r.invoiceNumber ? ` | NF: ${r.invoiceNumber}` : ""}`,
            valor: parseFloat(r.amount || "0"),
            localId: null,
            localNome: null,
            origem_tabela: "buyer_payments",
            origem_campo: "amount [status=pago]",
            origem_id: r.id,
            registradoPor: null,
            observacoes: r.notes ?? null,
          });
        }
      }

      // ── 11. RECEITA FINANCEIRA — financial_entries (type=receita) ──────────
      if (input.tipo === "todos" || input.tipo === "receita") {
        const fr = await db
          .select({
            id: financialEntries.id,
            date: financialEntries.date,
            amount: financialEntries.amount,
            description: financialEntries.description,
            category: financialEntries.category,
            clientName: financialEntries.clientName,
            autoGenerated: financialEntries.autoGenerated,
            registeredByName: financialEntries.registeredByName,
            notes: financialEntries.notes,
          })
          .from(financialEntries)
          .where(and(
            eq(financialEntries.type, "receita"),
            gte(financialEntries.date, dateFrom),
            lte(financialEntries.date, dateTo),
          ));

        const catMap: Record<string, string> = {
          venda_madeira: "Receita — Venda de Madeira",
          servico_corte: "Receita — Serviço de Corte",
          servico_plantio: "Receita — Serviço de Plantio",
          servico_transporte: "Receita — Serviço de Transporte",
          servico_consultoria: "Receita — Consultoria",
          outro_receita: "Receita — Outro",
        };

        for (const r of fr) {
          if (input.localId) continue; // financial_entries não tem localId
          const cat = catMap[r.category] ?? `Receita — ${r.category ?? "Outro"}`;
          if (!matchCat(cat)) continue;
          rows.push({
            id: `fr-${r.id}`,
            date: (r.date as string).slice(0, 10),
            tipo: "receita",
            categoria: cat,
            subcategoria: r.autoGenerated ? `Auto-gerado | ${r.clientName ?? ""}` : `Manual | ${r.clientName ?? ""}`,
            descricao: r.description ?? "Receita financeira",
            valor: parseFloat(r.amount || "0"),
            localId: null,
            localNome: null,
            origem_tabela: "financial_entries",
            origem_campo: `amount [type=receita, auto_generated=${r.autoGenerated ?? 0}]`,
            origem_id: r.id,
            registradoPor: r.registeredByName ?? null,
            observacoes: r.notes ?? null,
          });
        }
      }

      // ── Ordenar por data desc ──────────────────────────────────────────────
      rows.sort((a, b) => b.date.localeCompare(a.date));

      // ── Totais e resumo por categoria ──────────────────────────────────────
      const totalCusto = rows.filter(r => r.tipo === "custo").reduce((s, r) => s + r.valor, 0);
      const totalReceita = rows.filter(r => r.tipo === "receita").reduce((s, r) => s + r.valor, 0);

      const byCat: Record<string, { tipo: string; total: number; qtd: number }> = {};
      for (const r of rows) {
        if (!byCat[r.categoria]) byCat[r.categoria] = { tipo: r.tipo, total: 0, qtd: 0 };
        byCat[r.categoria].total += r.valor;
        byCat[r.categoria].qtd += 1;
      }

      return {
        rows,
        summary: {
          totalCusto,
          totalReceita,
          lucro: totalReceita - totalCusto,
          totalRegistros: rows.length,
          byCat: Object.entries(byCat)
            .map(([cat, v]) => ({ categoria: cat, ...v }))
            .sort((a, b) => b.total - a.total),
        },
      };
    }),
});
