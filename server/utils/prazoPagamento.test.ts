import { describe, expect, it } from "vitest";
import { calcularDataPrevisaoPagamento, normalizarCnpj, somarDiasCorridos } from "./prazoPagamento";

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

describe("Sonoco: 7 dias corridos + 1 a partir da entrega", () => {
  const SONOCO_NOVA = [{ cnpj: "00496586000631", tipoRegra: "dias_corridos", parametros: '{"dias":7,"modo":"corridos","extra":1}' }];

  it("exemplo do negócio: entrega 28/10 -> previsão 05/11", () => {
    expect(calcularDataPrevisaoPagamento("00496586000631", "2026-10-30", SONOCO_NOVA, "2026-10-28")).toBe("2026-11-05");
  });
  it("sem carga vinculada usa a emissão como base", () => {
    expect(calcularDataPrevisaoPagamento("00.496.586/0006-31", "2026-10-28", SONOCO_NOVA)).toBe("2026-11-05");
  });
  it("conta dias corridos (fim de semana no meio do prazo não alonga)", () => {
    expect(calcularDataPrevisaoPagamento("00496586000631", "2026-10-20", SONOCO_NOVA, "2026-10-20")).toBe("2026-10-28");
  });
  it("se cair em sábado, passa para a segunda", () => {
    // entrega 2026-10-17 (sábado) + 8 = 2026-10-25 (domingo) -> segunda 26/10
    expect(calcularDataPrevisaoPagamento("00496586000631", "2026-10-17", SONOCO_NOVA, "2026-10-17")).toBe("2026-10-26");
    // entrega 2026-10-16 (sexta) + 8 = 2026-10-24 (sábado) -> segunda 26/10
    expect(calcularDataPrevisaoPagamento("00496586000631", "2026-10-16", SONOCO_NOVA, "2026-10-16")).toBe("2026-10-26");
  });
  it("se cair em feriado, passa para o próximo dia útil", () => {
    // entrega 2026-11-07 + 8 = 2026-11-15 (domingo e Proclamação da República) -> segunda 16/11
    expect(calcularDataPrevisaoPagamento("00496586000631", "2026-11-07", SONOCO_NOVA, "2026-11-07")).toBe("2026-11-16");
    // entrega 2026-11-06 + 8 = 2026-11-14 (sábado) -> segunda 16/11
    expect(calcularDataPrevisaoPagamento("00496586000631", "2026-11-06", SONOCO_NOVA, "2026-11-06")).toBe("2026-11-16");
    // entrega 2026-12-17 + 8 = 2026-12-25 (Natal, sexta) -> segunda 28/12
    expect(calcularDataPrevisaoPagamento("00496586000631", "2026-12-17", SONOCO_NOVA, "2026-12-17")).toBe("2026-12-28");
  });
  it("vira o mês e o ano", () => {
    expect(calcularDataPrevisaoPagamento("00496586000631", "2026-12-28", SONOCO_NOVA, "2026-12-28")).toBe("2027-01-05"); // terça
  });
  it("regras antigas (sem modo) continuam em dias úteis", () => {
    expect(calcularDataPrevisaoPagamento("00496586000631", "2026-08-10", REGRAS)).toBe("2026-08-19");
  });
  it("somarDiasCorridos soma no calendário", () => {
    expect(somarDiasCorridos("2026-02-27", 3)).toBe("2026-03-02");
  });
});
