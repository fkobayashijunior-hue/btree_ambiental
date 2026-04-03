import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock do banco de dados ───────────────────────────────────────────────────
vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

// ─── Helpers de negócio ───────────────────────────────────────────────────────

function calcReferenceMonth(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function calcSaldo(receitas: number, despesas: number): number {
  return receitas - despesas;
}

function formatAmount(value: string): number {
  return parseFloat(value || "0");
}

// ─── Testes ───────────────────────────────────────────────────────────────────

describe("Financial Module - Business Logic", () => {
  describe("calcReferenceMonth", () => {
    it("deve calcular o mês de referência corretamente para janeiro", () => {
      expect(calcReferenceMonth("2026-01-15")).toBe("2026-01");
    });

    it("deve calcular o mês de referência corretamente para dezembro", () => {
      expect(calcReferenceMonth("2026-12-31")).toBe("2026-12");
    });

    it("deve calcular o mês de referência corretamente para abril", () => {
      expect(calcReferenceMonth("2026-04-03")).toBe("2026-04");
    });

    it("deve formatar meses com zero à esquerda", () => {
      // Usa uma data no meio do mês para evitar problemas de timezone
      expect(calcReferenceMonth("2026-03-15")).toBe("2026-03");
    });
  });

  describe("calcSaldo", () => {
    it("deve retornar saldo positivo quando receitas > despesas", () => {
      expect(calcSaldo(10000, 6000)).toBe(4000);
    });

    it("deve retornar saldo negativo quando despesas > receitas", () => {
      expect(calcSaldo(3000, 5000)).toBe(-2000);
    });

    it("deve retornar zero quando receitas == despesas", () => {
      expect(calcSaldo(5000, 5000)).toBe(0);
    });

    it("deve lidar com valores zerados", () => {
      expect(calcSaldo(0, 0)).toBe(0);
    });
  });

  describe("formatAmount", () => {
    it("deve converter string de valor para número", () => {
      expect(formatAmount("1500.00")).toBe(1500);
    });

    it("deve retornar 0 para string vazia", () => {
      expect(formatAmount("")).toBe(0);
    });

    it("deve retornar 0 para undefined/null", () => {
      expect(formatAmount(undefined as any)).toBe(0);
    });

    it("deve lidar com valores decimais", () => {
      expect(formatAmount("99.99")).toBeCloseTo(99.99);
    });
  });

  describe("Categorias de Receita", () => {
    const INCOME_CATEGORIES = [
      "venda_madeira",
      "servico_corte",
      "servico_plantio",
      "servico_transporte",
      "servico_consultoria",
      "outro_receita",
    ];

    it("deve ter 6 categorias de receita", () => {
      expect(INCOME_CATEGORIES.length).toBe(6);
    });

    it("deve incluir venda_madeira como categoria", () => {
      expect(INCOME_CATEGORIES).toContain("venda_madeira");
    });

    it("deve incluir outro_receita como categoria genérica", () => {
      expect(INCOME_CATEGORIES).toContain("outro_receita");
    });
  });

  describe("Categorias de Despesa", () => {
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
    ];

    it("deve ter 10 categorias de despesa", () => {
      expect(EXPENSE_CATEGORIES.length).toBe(10);
    });

    it("deve incluir folha_pagamento como categoria", () => {
      expect(EXPENSE_CATEGORIES).toContain("folha_pagamento");
    });

    it("deve incluir combustivel como categoria", () => {
      expect(EXPENSE_CATEGORIES).toContain("combustivel");
    });
  });

  describe("Formas de Pagamento", () => {
    const PAYMENT_METHODS = ["dinheiro", "pix", "cartao", "transferencia", "boleto", "cheque"];

    it("deve ter 6 formas de pagamento", () => {
      expect(PAYMENT_METHODS.length).toBe(6);
    });

    it("deve incluir pix como forma de pagamento", () => {
      expect(PAYMENT_METHODS).toContain("pix");
    });
  });

  describe("Status de Lançamento", () => {
    const STATUSES = ["pendente", "confirmado", "cancelado"];

    it("deve ter 3 status possíveis", () => {
      expect(STATUSES.length).toBe(3);
    });

    it("deve incluir confirmado como status padrão", () => {
      expect(STATUSES).toContain("confirmado");
    });
  });

  describe("Agrupamento mensal", () => {
    const mockEntries = [
      { type: "receita", amount: "5000.00", status: "confirmado" },
      { type: "receita", amount: "3000.00", status: "confirmado" },
      { type: "despesa", amount: "2000.00", status: "confirmado" },
      { type: "despesa", amount: "1500.00", status: "cancelado" }, // cancelado não deve contar
    ];

    it("deve somar apenas entradas confirmadas", () => {
      const confirmed = mockEntries.filter(e => e.status === "confirmado");
      const totalReceitas = confirmed
        .filter(e => e.type === "receita")
        .reduce((s, e) => s + parseFloat(e.amount), 0);
      const totalDespesas = confirmed
        .filter(e => e.type === "despesa")
        .reduce((s, e) => s + parseFloat(e.amount), 0);

      expect(totalReceitas).toBe(8000);
      expect(totalDespesas).toBe(2000);
      expect(calcSaldo(totalReceitas, totalDespesas)).toBe(6000);
    });

    it("deve ignorar entradas canceladas no cálculo do saldo", () => {
      const confirmed = mockEntries.filter(e => e.status === "confirmado");
      expect(confirmed.length).toBe(3);
    });
  });
});

// ─── Testes de GPS na tela de presenças ──────────────────────────────────────

describe("Attendance GPS Logic", () => {
  function getDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  it("deve calcular distância zero para o mesmo ponto", () => {
    const dist = getDistanceMeters(-21.5, -48.5, -21.5, -48.5);
    expect(dist).toBe(0);
  });

  it("deve calcular distância positiva entre dois pontos diferentes", () => {
    const dist = getDistanceMeters(-21.5, -48.5, -21.6, -48.6);
    expect(dist).toBeGreaterThan(0);
  });

  it("deve detectar ponto dentro do raio de 5km", () => {
    const fazendaLat = -21.5;
    const fazendaLng = -48.5;
    const radius = 5000;
    // Ponto muito próximo da fazenda (mesmas coordenadas)
    const dist = getDistanceMeters(fazendaLat, fazendaLng, -21.5001, -48.5001);
    expect(dist).toBeLessThan(radius);
  });

  it("deve detectar ponto fora do raio de 5km", () => {
    const fazendaLat = -21.5;
    const fazendaLng = -48.5;
    const radius = 5000;
    // Ponto distante (São Paulo)
    const dist = getDistanceMeters(fazendaLat, fazendaLng, -23.5505, -46.6333);
    expect(dist).toBeGreaterThan(radius);
  });
});
