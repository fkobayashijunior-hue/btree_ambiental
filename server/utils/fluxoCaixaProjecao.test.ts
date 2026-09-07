import { describe, expect, it } from "vitest";
import { mergeDiasFluxoCaixa } from "./fluxoCaixaProjecao";

describe("mergeDiasFluxoCaixa", () => {
  it("dia com extrato realizado nunca recebe projeção da planilha (evita dupla contagem)", () => {
    const dias = mergeDiasFluxoCaixa(
      [{ data: "2026-08-10", recebimentos: 100, pagamentos: 50 }],
      [{ data: "2026-08-10", recebimentos: 999, pagamentos: 999 }],
      [],
      0
    );
    expect(dias).toHaveLength(1);
    expect(dias[0]).toMatchObject({ data: "2026-08-10", recebimentos: 100, pagamentos: 50, projetado: false });
  });

  it("dia com extrato realizado ainda soma o saldo residual de Contas a Receber não pago (ex: 2 boletos previstos, só 1 pago)", () => {
    const dias = mergeDiasFluxoCaixa(
      [{ data: "2026-08-24", recebimentos: 6000, pagamentos: 6288.08 }], // só o boleto de 6000 foi pago
      [],
      [{ data: "2026-08-24", valor: 433.80 }], // o segundo boleto continua em aberto
      0
    );
    expect(dias).toHaveLength(1);
    expect(dias[0]).toMatchObject({ data: "2026-08-24", recebimentos: 6433.80, pagamentos: 6288.08, projetado: true });
  });

  it("dia sem extrato soma projeções da planilha e de contas a receber", () => {
    const dias = mergeDiasFluxoCaixa(
      [],
      [{ data: "2026-08-15", recebimentos: 0, pagamentos: 300 }],
      [{ data: "2026-08-15", valor: 500 }],
      0
    );
    expect(dias).toHaveLength(1);
    expect(dias[0]).toMatchObject({ data: "2026-08-15", recebimentos: 500, pagamentos: 300, projetado: true });
  });

  it("dias distintos de cada fonte aparecem todos, ordenados", () => {
    const dias = mergeDiasFluxoCaixa(
      [{ data: "2026-08-05", recebimentos: 100, pagamentos: 0 }],
      [{ data: "2026-08-20", recebimentos: 0, pagamentos: 200 }],
      [{ data: "2026-08-12", valor: 50 }],
      0
    );
    expect(dias.map(d => d.data)).toEqual(["2026-08-05", "2026-08-12", "2026-08-20"]);
  });

  it("saldo acumulado parte do saldo inicial e soma dia a dia", () => {
    const dias = mergeDiasFluxoCaixa(
      [{ data: "2026-08-05", recebimentos: 100, pagamentos: 30 }],
      [],
      [{ data: "2026-08-10", valor: 50 }],
      1000
    );
    expect(dias[0].saldoAcumulado).toBe(1070); // 1000 + 100 - 30
    expect(dias[1].saldoAcumulado).toBe(1120); // 1070 + 50
  });

  it("múltiplas NFs/boletos projetados no mesmo dia se acumulam", () => {
    const dias = mergeDiasFluxoCaixa(
      [],
      [],
      [{ data: "2026-08-10", valor: 100 }, { data: "2026-08-10", valor: 200 }],
      0
    );
    expect(dias[0].recebimentos).toBe(300);
  });

  it("sem nenhuma fonte retorna lista vazia", () => {
    expect(mergeDiasFluxoCaixa([], [], [], 500)).toEqual([]);
  });
});
