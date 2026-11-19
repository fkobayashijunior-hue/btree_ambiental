import { describe, it, expect } from "vitest";
import { calcularDataPrevisaoPagamento } from "./prazoPagamento";

const regras = [{ cnpj: "12345678000190", tipoRegra: "dias_corridos", parametros: '{"dias":3,"modo":"uteis"}' }];

describe("Aurora: entrega + 3 dias úteis", () => {
  it("entrega na segunda 2026-11-16 -> quinta 2026-11-19", () => {
    expect(calcularDataPrevisaoPagamento("12.345.678/0001-90", "2026-11-10", regras, "2026-11-16")).toBe("2026-11-19");
  });
  it("entrega na quinta 2026-11-12 -> terça 2026-11-17 (pula o fim de semana)", () => {
    expect(calcularDataPrevisaoPagamento("12345678000190", "2026-11-01", regras, "2026-11-12")).toBe("2026-11-17");
  });
  it("entrega na sexta 2026-11-13 -> quarta 2026-11-18", () => {
    expect(calcularDataPrevisaoPagamento("12345678000190", "2026-11-01", regras, "2026-11-13")).toBe("2026-11-18");
  });
  it("entrega no sábado 2026-11-14 -> quarta 2026-11-18", () => {
    expect(calcularDataPrevisaoPagamento("12345678000190", "2026-11-01", regras, "2026-11-14")).toBe("2026-11-18");
  });
});
