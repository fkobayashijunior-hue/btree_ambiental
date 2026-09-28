import { describe, expect, it } from "vitest";
import {
  calculatePortalTotals,
  filterPortalLoadsForClosing,
  filterPortalRowsByArea,
  normalizePortalAreaId,
} from "./routers/clientPortal";

describe("client portal — invariantes de área", () => {
  it("normaliza somente legado como null e preserva ids positivos", () => {
    expect(normalizePortalAreaId(undefined)).toBeNull();
    expect(normalizePortalAreaId(null)).toBeNull();
    expect(normalizePortalAreaId(0)).toBeNull();
    expect(normalizePortalAreaId(2)).toBe(2);
  });

  it("filtra legado e área nova antes de qualquer cálculo", () => {
    const rows = [
      { id: 1, areaId: null, value: 1300 },
      { id: 2, areaId: 2, value: 800 },
      { id: 3, areaId: 3, value: 700 },
    ];
    expect(filterPortalRowsByArea(rows, null).map(row => row.id)).toEqual([1]);
    expect(filterPortalRowsByArea(rows, 2).map(row => row.id)).toEqual([2]);
  });

  it("não copia preço legado para área pendente e não expõe saldo financeiro como zero", () => {
    const totals = calculatePortalTotals({
      loads: [{ id: 1, status: "entregue", portalValue: 1300 }],
      advances: [{ id: 1, status: "ativo", balanceRemaining: "400" }],
      deductions: [{ amount: "100" }],
      weeklyClosings: [{ status: "pago", totalAmount: "1300" }],
      areaPending: true,
    });
    expect(totals).toEqual({
      totalAdvanceBalance: null,
      valorTotal: null,
      valorPago: null,
      valorAReceber: null,
      valorAbatidoAdiantamento: null,
    });
  });

  it("calcula valores apenas dos registros previamente selecionados da área", () => {
    const areaRows = filterPortalRowsByArea([
      { id: 1, areaId: null, status: "entregue", portalValue: 1300 },
      { id: 2, areaId: 2, status: "entregue", portalValue: 800 },
    ], 2);
    const totals = calculatePortalTotals({
      loads: areaRows,
      advances: [],
      deductions: [],
      weeklyClosings: [],
    });
    expect(totals.valorTotal).toBe(800);
    expect(totals.valorAReceber).toBe(800);
  });

  it("mantém somente cargas da área já filtrada no fechamento e no PDF", () => {
    const areaLoads = filterPortalRowsByArea([
      { id: 1, areaId: null, date: "2026-09-10", portalValue: 1300 },
      { id: 2, areaId: 2, date: "2026-09-10", portalValue: 800 },
      { id: 3, areaId: 2, date: "2026-10-10", portalValue: 900 },
    ], 2);
    const selected = filterPortalLoadsForClosing(areaLoads, {
      weekStart: "2026-09-06",
      weekEnd: "2026-09-12",
    });
    expect(selected.map(load => load.id)).toEqual([2]);
  });
});
