import { describe, it, expect } from "vitest";
import { calcularCards, estaAtrasado, soDigitos, type ItemReceber } from "./utils/contasReceberResumo";

const HOJE = "2026-10-28";
const item = (p: Partial<ItemReceber>): ItemReceber => ({ fonte: "nf", valor: 100, recebido: false, cancelado: false, vencimento: "2026-11-05", ...p });

describe("calcularCards", () => {
  const itens: ItemReceber[] = [
    item({ valor: 100, vencimento: "2026-10-20" }),                    // vencido
    item({ valor: 200, vencimento: "2026-10-28" }),                    // vence hoje
    item({ valor: 300, vencimento: "2026-11-05" }),                    // a vencer
    item({ valor: 400, recebido: true, vencimento: "2026-10-10" }),    // recebido
    item({ valor: 999, cancelado: true }),                             // cancelado: ignorado
    item({ valor: 50, vencimento: null }),                             // sem previsão
    item({ fonte: "boleto", valor: 10, vencimento: "2026-10-01" }),    // boleto vencido
  ];

  it("classifica por vencimento e soma o total", () => {
    const c = calcularCards(itens, HOJE);
    expect(c.vencidos).toBe(110);
    expect(c.vencemHoje).toBe(200);
    expect(c.aVencer).toBe(300);
    expect(c.recebidos).toBe(400);
    expect(c.total).toBe(1010);
  });

  it("NF sem previsão não entra nos cards, mas é informada", () => {
    const c = calcularCards(itens, HOJE);
    expect(c.semPrevisao).toEqual({ qtd: 1, valor: 50 });
  });

  it("filtro em aberto ignora recebidos; pago só considera recebidos; cancelado zera", () => {
    const aberto = calcularCards(itens, HOJE, "em_aberto");
    expect(aberto.recebidos).toBe(0);
    expect(aberto.total).toBe(610);
    const pago = calcularCards(itens, HOJE, "pago");
    expect(pago.total).toBe(400);
    expect(pago.vencidos).toBe(0);
    const canc = calcularCards(itens, HOJE, "cancelado");
    expect(canc.total).toBe(0);
  });

  it("separa por fonte", () => {
    const c = calcularCards(itens, HOJE);
    expect(c.porFonte.boleto).toBe(10);
    expect(c.porFonte.nf).toBe(1000);
  });

  it("lista vazia dá zeros", () => {
    expect(calcularCards([], HOJE).total).toBe(0);
  });
});

describe("estaAtrasado", () => {
  it("só marca vencido e não pago", () => {
    expect(estaAtrasado("2026-10-27", false, false, HOJE)).toBe(true);
    expect(estaAtrasado("2026-10-28", false, false, HOJE)).toBe(false); // vence hoje ainda não é atraso
    expect(estaAtrasado("2026-10-27", true, false, HOJE)).toBe(false);  // pago
    expect(estaAtrasado("2026-10-27", false, true, HOJE)).toBe(false);  // cancelado
    expect(estaAtrasado(null, false, false, HOJE)).toBe(false);
  });
});

describe("soDigitos", () => {
  it("remove pontuação do CNPJ", () => {
    expect(soDigitos("00.496.586/0006-31")).toBe("00496586000631");
    expect(soDigitos(null)).toBe("");
  });
});
