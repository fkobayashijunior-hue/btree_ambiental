import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import {
  collaboratorAttendance,
  collaborators,
  fuelRecords,
  machineFuel,
  extraExpenses,
  cargoLoads,
  equipment,
  gpsLocations,
} from "../../drizzle/schema";
import { eq, desc, and, gte, lte, sql, isNull } from "drizzle-orm";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString("pt-BR");
}

function generatePdfHtml(data: any, locationName: string, periodo: string, sections: { maoDeObra: boolean; consumo: boolean; cargas: boolean }) {
  const styles = `
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; font-size: 11px; }
      .page { padding: 20px 30px; }
      .header { background: linear-gradient(135deg, #0d4f2e, #1a7a47); color: white; padding: 20px 25px; border-radius: 8px; margin-bottom: 20px; }
      .header h1 { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
      .header p { font-size: 12px; opacity: 0.9; }
      .header .meta { display: flex; justify-content: space-between; margin-top: 10px; font-size: 11px; opacity: 0.85; }
      .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
      .summary-card { background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 6px; padding: 12px; text-align: center; }
      .summary-card .label { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
      .summary-card .value { font-size: 16px; font-weight: 700; margin-top: 4px; }
      .summary-card .value.red { color: #dc3545; }
      .summary-card .value.blue { color: #0d6efd; }
      .summary-card .value.amber { color: #d97706; }
      .summary-card .value.green { color: #198754; }
      .section { margin-bottom: 20px; }
      .section-title { font-size: 13px; font-weight: 700; color: #0d4f2e; border-bottom: 2px solid #0d4f2e; padding-bottom: 4px; margin-bottom: 10px; }
      table { width: 100%; border-collapse: collapse; font-size: 10px; }
      th { background: #f1f3f5; color: #495057; font-weight: 600; text-align: left; padding: 6px 8px; border-bottom: 2px solid #dee2e6; }
      td { padding: 5px 8px; border-bottom: 1px solid #e9ecef; }
      tr:nth-child(even) { background: #f8f9fa; }
      .text-right { text-align: right; }
      .text-center { text-align: center; }
      .font-bold { font-weight: 700; }
      .total-row { background: #e8f5e9 !important; font-weight: 700; }
      .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 9px; font-weight: 600; }
      .badge-clt { background: #dbeafe; color: #1d4ed8; }
      .badge-terceirizado { background: #ede9fe; color: #7c3aed; }
      .badge-diarista { background: #fef3c7; color: #d97706; }
      .badge-pago { background: #d1fae5; color: #059669; }
      .badge-pendente { background: #fee2e2; color: #dc2626; }
      .footer { text-align: center; font-size: 9px; color: #999; margin-top: 20px; padding-top: 10px; border-top: 1px solid #e9ecef; }
      @media print { .page { padding: 10px; } }
    </style>
  `;

  let html = `<!DOCTYPE html><html><head><meta charset="utf-8">${styles}</head><body><div class="page">`;

  // Header
  html += `
    <div class="header">
      <h1>BTREE Ambiental — Relatório</h1>
      <p>${locationName}</p>
      <div class="meta">
        <span>Período: ${periodo}</span>
        <span>Gerado em: ${new Date().toLocaleDateString("pt-BR")} ${new Date().toLocaleTimeString("pt-BR")}</span>
      </div>
    </div>
  `;

  // Summary cards
  html += `
    <div class="summary-grid">
      <div class="summary-card">
        <div class="label">Custo Total</div>
        <div class="value red">${formatCurrency(data.resumo.custoTotal)}</div>
      </div>
      <div class="summary-card">
        <div class="label">Mão de Obra</div>
        <div class="value blue">${formatCurrency(data.resumo.totalMaoDeObra)}</div>
      </div>
      <div class="summary-card">
        <div class="label">Consumo</div>
        <div class="value amber">${formatCurrency(data.resumo.totalConsumo)}</div>
      </div>
      <div class="summary-card">
        <div class="label">Cargas</div>
        <div class="value green">${data.resumo.totalCargas} (${data.resumo.totalVolumeM3.toFixed(1)}m³)</div>
      </div>
    </div>
  `;

  // Mão de Obra
  if (sections.maoDeObra && data.maoDeObra.registros.length > 0) {
    html += `
      <div class="section">
        <div class="section-title">Mão de Obra — ${data.maoDeObra.totalDias} registros</div>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Colaborador</th>
              <th>Atividade</th>
              <th>Vínculo</th>
              <th class="text-right">Valor</th>
              <th class="text-center">Status</th>
            </tr>
          </thead>
          <tbody>
    `;
    for (const r of data.maoDeObra.registros) {
      const empBadge = r.employmentType === "clt" ? "badge-clt" : r.employmentType === "terceirizado" ? "badge-terceirizado" : "badge-diarista";
      const empLabel = r.employmentType === "clt" ? "CLT" : r.employmentType === "terceirizado" ? "Terceirizado" : "Diarista";
      const payBadge = r.paymentStatus === "pago" ? "badge-pago" : "badge-pendente";
      const payLabel = r.paymentStatus === "pago" ? "Pago" : "Pendente";
      html += `
        <tr>
          <td>${formatDate(r.date)}</td>
          <td class="font-bold">${r.collaboratorName}</td>
          <td>${r.activity || "—"}</td>
          <td><span class="badge ${empBadge}">${empLabel}</span></td>
          <td class="text-right">${formatCurrency(parseFloat(r.dailyValue || "0"))}</td>
          <td class="text-center"><span class="badge ${payBadge}">${payLabel}</span></td>
        </tr>
      `;
    }
    html += `
        <tr class="total-row">
          <td colspan="4">Total Mão de Obra</td>
          <td class="text-right">${formatCurrency(data.maoDeObra.totalValor)}</td>
          <td class="text-center">${data.maoDeObra.pendentes} pend. / ${data.maoDeObra.pagos} pagos</td>
        </tr>
      </tbody></table></div>
    `;
  }

  // Combustível Veículos
  if (sections.consumo && data.consumo.veiculos.length > 0) {
    html += `
      <div class="section">
        <div class="section-title">Combustível — Veículos (${data.consumo.veiculos.length} registros)</div>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Veículo</th>
              <th>Tipo</th>
              <th class="text-right">Litros</th>
              <th class="text-right">R$/L</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
    `;
    for (const r of data.consumo.veiculos) {
      html += `
        <tr>
          <td>${formatDate(r.date)}</td>
          <td class="font-bold">${r.equipmentName} ${r.equipmentPlate ? `(${r.equipmentPlate})` : ""}</td>
          <td style="text-transform:capitalize">${r.fuelType}</td>
          <td class="text-right">${parseFloat(r.liters || "0").toFixed(1)}L</td>
          <td class="text-right">${formatCurrency(parseFloat(r.pricePerLiter || "0"))}</td>
          <td class="text-right font-bold">${formatCurrency(parseFloat(r.totalValue || "0"))}</td>
        </tr>
      `;
    }
    html += `</tbody></table></div>`;
  }

  // Combustível Máquinas
  if (sections.consumo && data.consumo.maquinas.length > 0) {
    html += `
      <div class="section">
        <div class="section-title">Combustível — Máquinas (${data.consumo.maquinas.length} registros)</div>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Máquina</th>
              <th>Tipo</th>
              <th class="text-right">Litros</th>
              <th class="text-right">R$/L</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
    `;
    for (const r of data.consumo.maquinas) {
      html += `
        <tr>
          <td>${formatDate(r.date)}</td>
          <td class="font-bold">${r.equipmentName}</td>
          <td style="text-transform:capitalize">${r.fuelType}</td>
          <td class="text-right">${parseFloat(r.liters || "0").toFixed(1)}L</td>
          <td class="text-right">${formatCurrency(parseFloat(r.pricePerLiter || "0"))}</td>
          <td class="text-right font-bold">${formatCurrency(parseFloat(r.totalValue || "0"))}</td>
        </tr>
      `;
    }
    html += `</tbody></table></div>`;
  }

  // Despesas Extras
  if (sections.consumo && data.consumo.despesasExtras.length > 0) {
    html += `
      <div class="section">
        <div class="section-title">Despesas Extras (${data.consumo.despesasExtras.length} registros)</div>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Categoria</th>
              <th>Descrição</th>
              <th>Pagamento</th>
              <th class="text-right">Valor</th>
            </tr>
          </thead>
          <tbody>
    `;
    for (const r of data.consumo.despesasExtras) {
      html += `
        <tr>
          <td>${formatDate(r.date)}</td>
          <td style="text-transform:capitalize">${r.category || "—"}</td>
          <td>${r.description || "—"}</td>
          <td style="text-transform:capitalize">${r.paymentMethod || "—"}</td>
          <td class="text-right font-bold">${formatCurrency(parseFloat(r.amount || "0"))}</td>
        </tr>
      `;
    }
    html += `</tbody></table></div>`;
  }

  // Cargas
  if (sections.cargas && data.cargas.registros.length > 0) {
    html += `
      <div class="section">
        <div class="section-title">Cargas (${data.cargas.totalCargas} registros — ${data.cargas.totalVolumeM3.toFixed(1)}m³)</div>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Motorista</th>
              <th>Placa</th>
              <th>Madeira</th>
              <th class="text-right">Volume (m³)</th>
              <th>Destino</th>
            </tr>
          </thead>
          <tbody>
    `;
    for (const r of data.cargas.registros) {
      html += `
        <tr>
          <td>${formatDate(r.date)}</td>
          <td class="font-bold">${r.driverName || "—"}</td>
          <td>${r.vehiclePlate || "—"}</td>
          <td style="text-transform:capitalize">${r.woodType || "—"}</td>
          <td class="text-right">${parseFloat(r.volumeM3 || "0").toFixed(2)}</td>
          <td>${r.destination || "—"}</td>
        </tr>
      `;
    }
    html += `</tbody></table></div>`;
  }

  // Footer
  html += `
    <div class="footer">
      BTREE Ambiental — Sistema de Gestão | Relatório gerado automaticamente
    </div>
  </div></body></html>`;

  return html;
}

export const reportPdfRouter = router({
  generatePdfHtml: protectedProcedure
    .input(z.object({
      locationId: z.number().optional(),
      dateFrom: z.string(),
      dateTo: z.string(),
      includeMaoDeObra: z.boolean().default(true),
      includeConsumo: z.boolean().default(true),
      includeCargas: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB indisponível" });

      const dateFrom = input.dateFrom + " 00:00:00";
      const dateTo = input.dateTo + " 23:59:59";

      // Buscar nome do local
      let locationName = "Todos os Locais";
      if (input.locationId) {
        const loc = await db.select({ name: gpsLocations.name }).from(gpsLocations).where(eq(gpsLocations.id, input.locationId));
        if (loc.length > 0) locationName = loc[0].name;
      }

      // ── MÃO DE OBRA ──
      let maoDeObra: any[] = [];
      if (input.includeMaoDeObra) {
        maoDeObra = await db
          .select({
            id: collaboratorAttendance.id,
            collaboratorName: collaborators.name,
            date: collaboratorAttendance.date,
            employmentType: collaboratorAttendance.employmentTypeCa,
            dailyValue: collaboratorAttendance.dailyValue,
            activity: collaboratorAttendance.activity,
            paymentStatus: collaboratorAttendance.paymentStatusCa,
          })
          .from(collaboratorAttendance)
          .innerJoin(collaborators, eq(collaboratorAttendance.collaboratorId, collaborators.id))
          .where(and(
            gte(collaboratorAttendance.date, dateFrom),
            lte(collaboratorAttendance.date, dateTo),
            ...(input.locationId ? [eq(collaboratorAttendance.workLocationId, input.locationId)] : [])
          ))
          .orderBy(desc(collaboratorAttendance.date));
      }

      // ── COMBUSTÍVEL VEÍCULOS ──
      let consumoVeiculos: any[] = [];
      if (input.includeConsumo) {
        consumoVeiculos = await db
          .select({
            id: fuelRecords.id,
            date: fuelRecords.date,
            equipmentName: equipment.name,
            equipmentPlate: equipment.plate,
            fuelType: fuelRecords.fuelType,
            liters: fuelRecords.liters,
            totalValue: fuelRecords.totalValue,
            pricePerLiter: fuelRecords.pricePerLiter,
          })
          .from(fuelRecords)
          .innerJoin(equipment, eq(fuelRecords.equipmentId, equipment.id))
          .where(and(
            gte(fuelRecords.date, dateFrom),
            lte(fuelRecords.date, dateTo),
            ...(input.locationId ? [eq(fuelRecords.workLocationId, input.locationId)] : [])
          ))
          .orderBy(desc(fuelRecords.date));
      }

      // ── COMBUSTÍVEL MÁQUINAS ──
      let consumoMaquinas: any[] = [];
      if (input.includeConsumo) {
        consumoMaquinas = await db
          .select({
            id: machineFuel.id,
            date: machineFuel.date,
            equipmentName: equipment.name,
            fuelType: machineFuel.fuelType,
            liters: machineFuel.liters,
            totalValue: machineFuel.totalValue,
            pricePerLiter: machineFuel.pricePerLiter,
          })
          .from(machineFuel)
          .innerJoin(equipment, eq(machineFuel.equipmentId, equipment.id))
          .where(and(
            gte(machineFuel.date, dateFrom),
            lte(machineFuel.date, dateTo),
            ...(input.locationId ? [eq(machineFuel.workLocationId, input.locationId)] : [])
          ))
          .orderBy(desc(machineFuel.date));
      }

      // ── DESPESAS EXTRAS ──
      let despesasExtras: any[] = [];
      if (input.includeConsumo) {
        despesasExtras = await db
          .select({
            id: extraExpenses.id,
            date: extraExpenses.date,
            category: extraExpenses.category,
            description: extraExpenses.description,
            amount: extraExpenses.amount,
            paymentMethod: extraExpenses.paymentMethod,
          })
          .from(extraExpenses)
          .where(and(
            gte(extraExpenses.date, dateFrom),
            lte(extraExpenses.date, dateTo),
            ...(input.locationId ? [eq(extraExpenses.workLocationId, input.locationId)] : [])
          ))
          .orderBy(desc(extraExpenses.date));
      }

      // ── CARGAS ──
      let cargas: any[] = [];
      if (input.includeCargas) {
        cargas = await db
          .select({
            id: cargoLoads.id,
            date: cargoLoads.date,
            vehiclePlate: cargoLoads.vehiclePlate,
            driverName: cargoLoads.driverName,
            volumeM3: cargoLoads.volumeM3,
            woodType: cargoLoads.woodType,
            destination: cargoLoads.destination,
          })
          .from(cargoLoads)
          .where(and(
            gte(cargoLoads.date, dateFrom),
            lte(cargoLoads.date, dateTo),
            ...(input.locationId ? [eq(cargoLoads.workLocationId, input.locationId)] : [])
          ))
          .orderBy(desc(cargoLoads.date));
      }

      // Calcular totais
      const totalMaoDeObra = maoDeObra.reduce((s, r) => s + parseFloat(r.dailyValue || "0"), 0);
      const totalCombV = consumoVeiculos.reduce((s, r) => s + parseFloat(r.totalValue || "0"), 0);
      const totalCombM = consumoMaquinas.reduce((s, r) => s + parseFloat(r.totalValue || "0"), 0);
      const totalDespesas = despesasExtras.reduce((s, r) => s + parseFloat(r.amount || "0"), 0);
      const totalVolume = cargas.reduce((s, r) => s + parseFloat(r.volumeM3 || "0"), 0);

      const reportData = {
        maoDeObra: {
          registros: maoDeObra,
          totalDias: maoDeObra.length,
          totalValor: totalMaoDeObra,
          pendentes: maoDeObra.filter(r => r.paymentStatus === "pendente").length,
          pagos: maoDeObra.filter(r => r.paymentStatus === "pago").length,
        },
        consumo: {
          veiculos: consumoVeiculos,
          maquinas: consumoMaquinas,
          despesasExtras,
          totalConsumo: totalCombV + totalCombM + totalDespesas,
        },
        cargas: {
          registros: cargas,
          totalCargas: cargas.length,
          totalVolumeM3: totalVolume,
        },
        resumo: {
          custoTotal: totalMaoDeObra + totalCombV + totalCombM + totalDespesas,
          totalMaoDeObra,
          totalConsumo: totalCombV + totalCombM + totalDespesas,
          totalCargas: cargas.length,
          totalVolumeM3: totalVolume,
        },
      };

      const periodo = `${new Date(input.dateFrom).toLocaleDateString("pt-BR")} a ${new Date(input.dateTo).toLocaleDateString("pt-BR")}`;
      const htmlContent = generatePdfHtml(reportData, locationName, periodo, {
        maoDeObra: input.includeMaoDeObra,
        consumo: input.includeConsumo,
        cargas: input.includeCargas,
      });

      return { html: htmlContent };
    }),
});
