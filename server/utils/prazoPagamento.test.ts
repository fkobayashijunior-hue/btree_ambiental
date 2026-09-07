import { describe, expect, it } from "vitest";
import { calcularDataPrevisaoPagamento, normalizarCnpj } from "./prazoPagamento";

const REGRAS = [
  { cnpj: "00496586000631", tipoRegra: "dias_corridos", parametros: '{"dias":7}' },   // Sonoco
  { cnpj: "72274095000142", tipoRegra: "faixa_mensal",   parametros: "{}" },           // Rebnic
  { cnpj: "43328496000130", tipoRegra: "dias_corridos", parametros: '{"dias":1}' },   // Enerbio
  { cnpj: "11609581000422", tipoRegra: "dias_corridos", parametros: '{"dias":21}' },  // A.R.C. Logística
];

describe("normalizarCnpj", () => {
  it("remove pontuação", () => {
    expect(normalizarCnpj("00.496.586/0006-31")).toBe("00496586000631");
  });
  it("lida com null/undefined", () => {
    expect(normalizarCnpj(null)).toBe("");
    expect(normalizarCnpj(undefined)).toBe("");
  });
});

describe("calcularDataPrevisaoPagamento", () => {
  it("Sonoco: emissão + 7 dias úteis", () => {
    expect(calcularDataPrevisaoPagamento("00.496.586/0006-31", "2026-08-10", REGRAS)).toBe("2026-08-19");
  });

  it("Enerbio: emissão + 1 dia útil", () => {
    expect(calcularDataPrevisaoPagamento("43.328.496/0001-30", "2026-08-10", REGRAS)).toBe("2026-08-11");
  });

  it("A.R.C. Logística: emissão + 21 dias úteis", () => {
    expect(calcularDataPrevisaoPagamento("11.609.581/0004-22", "2026-08-11", REGRAS)).toBe("2026-09-10");
  });

  it("A.R.C. Logística: vira o mês", () => {
    expect(calcularDataPrevisaoPagamento("11609581000422", "2026-08-20", REGRAS)).toBe("2026-09-21");
  });

  it("Sonoco: vira o mês e pula fim de semana", () => {
    // 2026-08-28 é sexta; +7 dias úteis pula os dois fins de semana no meio -> 09/09 (quarta)
    expect(calcularDataPrevisaoPagamento("00496586000631", "2026-08-28", REGRAS)).toBe("2026-09-09");
  });

  it("Sonoco: vira o ano", () => {
    expect(calcularDataPrevisaoPagamento("00496586000631", "2026-12-28", REGRAS)).toBe("2027-01-07");
  });

  it("Rebnic: emissão dia 20-31 do mês anterior -> dia 10 do mês corrente", () => {
    expect(calcularDataPrevisaoPagamento("72274095000142", "2026-08-20", REGRAS)).toBe("2026-09-10");
    expect(calcularDataPrevisaoPagamento("72274095000142", "2026-08-31", REGRAS)).toBe("2026-09-10");
  });

  it("Rebnic: emissão dia 01-09 -> dia 20 do mesmo mês", () => {
    expect(calcularDataPrevisaoPagamento("72274095000142", "2026-08-01", REGRAS)).toBe("2026-08-20");
    expect(calcularDataPrevisaoPagamento("72274095000142", "2026-08-09", REGRAS)).toBe("2026-08-20");
  });

  it("Rebnic: emissão dia 10-19 -> dia 30 do mesmo mês", () => {
    expect(calcularDataPrevisaoPagamento("72274095000142", "2026-08-10", REGRAS)).toBe("2026-08-30");
    expect(calcularDataPrevisaoPagamento("72274095000142", "2026-08-19", REGRAS)).toBe("2026-08-30");
  });

  it("Rebnic: virada de ano (emissão dia 20-31 de dezembro -> dia 10 de janeiro do ano seguinte)", () => {
    expect(calcularDataPrevisaoPagamento("72274095000142", "2026-12-25", REGRAS)).toBe("2027-01-10");
  });

  it("Rebnic: fevereiro sem dia 30 -> usa último dia do mês (28 ou 29)", () => {
    // 2026 não é bissexto -> fevereiro tem 28 dias
    expect(calcularDataPrevisaoPagamento("72274095000142", "2026-02-15", REGRAS)).toBe("2026-02-28");
    // 2028 é bissexto -> fevereiro tem 29 dias
    expect(calcularDataPrevisaoPagamento("72274095000142", "2028-02-15", REGRAS)).toBe("2028-02-29");
  });

  it("Rebnic: datas fixas, sem ajuste de fim de semana", () => {
    // 2026-08-30 cai num domingo; a regra não deve mover a data
    expect(calcularDataPrevisaoPagamento("72274095000142", "2026-08-10", REGRAS)).toBe("2026-08-30");
  });

  it("CNPJ fora da lista de regras -> null", () => {
    expect(calcularDataPrevisaoPagamento("11.222.333/0001-44", "2026-08-10", REGRAS)).toBeNull();
  });

  it("CNPJ vazio -> null", () => {
    expect(calcularDataPrevisaoPagamento(null, "2026-08-10", REGRAS)).toBeNull();
  });

  it("Data de emissão ausente -> null", () => {
    expect(calcularDataPrevisaoPagamento("00496586000631", null, REGRAS)).toBeNull();
  });
});
