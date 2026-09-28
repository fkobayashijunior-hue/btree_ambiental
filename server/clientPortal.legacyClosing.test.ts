import { describe, expect, it } from "vitest";
import { calculatePortalTotals, decorateClosings, legacyClosingLive } from "./routers/clientPortal";

// Regra B: área original (sem área) recalcula fechamentos pelas cargas ATUAIS; áreas novas continuam congeladas.
const price = 100;
const load = (id: number, day: string, kg: number, status = "entregue") =>
  ({ id, status, deliveryDate: `${day} 00:00:00`, weightNetKg: String(kg), portalValue: (kg / 1000) * price });

describe("Regra B — fechamento da área original recalculado ao vivo", () => {
  const closing = { id: 1, areaId: null, status: "aberto", weekStart: "2026-09-12", weekEnd: "2026-09-18", totalAmount: "1000.00", pricePerTon: "100" };

  it("inclui carga do primeiro e do último dia da semana (comparação por dia, sem fuso)", () => {
    const loads = [load(1, "2026-09-12", 10000), load(2, "2026-09-18", 5000), load(3, "2026-09-19", 9000)];
    expect(legacyClosingLive(closing, loads)?.amount).toBe(1500);
  });

  it("valor gravado defasado não vale: usa as cargas atuais", async () => {
    const loads = [load(1, "2026-09-14", 20000)];
    const [out] = await decorateClosings([closing], loads, false, { legacyPricePerTon: 100 });
    expect(out.portalAmount).toBe(2000); // gravado dizia 1000
  });

  it("A Receber = fechamentos abertos ao vivo + cargas fora de fechamento, e Total = Pago + A Receber", () => {
    const paid = { ...closing, id: 2, status: "pago", weekStart: "2026-09-05", weekEnd: "2026-09-11", portalAmount: 700 };
    const open = { ...closing, portalAmount: 2000 };
    const loads = [load(1, "2026-09-14", 20000), load(2, "2026-09-08", 7000), load(3, "2026-09-22", 3000)];
    const t = calculatePortalTotals({ loads, advances: [], deductions: [], weeklyClosings: [], areaId: null, legacyClosings: [paid, open], legacyPricePerTon: 100 });
    expect(t.valorPago).toBe(700);
    expect(t.valorAReceber).toBe(2300); // 2000 aberto + 300 da carga de 22/09 sem fechamento
    expect(t.valorTotal).toBe(3000);
    expect(t.valorPago + t.valorAReceber).toBe(t.valorTotal);
  });

  it("cliente com adiantamento mantém Total − Pago (Pago = abatido)", () => {
    const t = calculatePortalTotals({
      loads: [load(1, "2026-09-14", 20000)], advances: [{ status: "ativo", balanceRemaining: "0" }],
      deductions: [{ amount: 500 }], weeklyClosings: [], areaId: null, legacyClosings: [{ ...closing, portalAmount: 2000 }], legacyPricePerTon: 100,
    });
    expect(t.valorPago).toBe(500);
    expect(t.valorAReceber).toBe(1500);
  });

  it("fechamento de área nova continua congelado", async () => {
    const [out] = await decorateClosings([{ ...closing, areaId: 2, totalAmount: "1000.00" }], [load(1, "2026-09-14", 20000)], false, { legacyPricePerTon: 100 });
    expect(out.portalAmount).toBe(1000);
  });
});
