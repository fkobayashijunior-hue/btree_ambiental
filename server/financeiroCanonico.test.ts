import { describe, it, expect } from "vitest";
import { casarPagamentos, sqlNum, type PagamentoSistema, type DebitoBanco } from "./utils/financeiroCanonico";

const pag = (p: Partial<PagamentoSistema>): PagamentoSistema => ({
  tipo: "fatura_combustivel", tipoLabel: "Fatura", refId: 1, descricao: "NF", valor: 100, data: "2026-09-10",
  sugestao: { grupo: "g", centroCusto: "c", natureza: "n" }, ...p,
});
const deb = (d: Partial<DebitoBanco>): DebitoBanco => ({
  id: 1, data: "2026-09-10", valor: 100, descricao: null, complemento: null,
  classificado: false, grupo: null, centroCusto: null, natureza: null, tipoResultado: "resultado", ...d,
});

describe("casarPagamentos", () => {
  it("casa por valor em centavos e data próxima", () => {
    const r = casarPagamentos([pag({ valor: 16350, data: "2026-08-26" })], [deb({ id: 7, valor: 16350, data: "2026-08-28" })]);
    expect(r.casados).toHaveLength(1);
    expect(r.casados[0].debito.id).toBe(7);
    expect(r.casados[0].diasDiferenca).toBe(2);
    expect(r.pagamentosSemBanco).toHaveLength(0);
    expect(r.debitosSemSistema).toHaveLength(0);
  });

  it("não casa fora da tolerância de dias nem com valor diferente", () => {
    const r = casarPagamentos([pag({ valor: 100, data: "2026-09-01" })], [deb({ valor: 100, data: "2026-09-20" }), deb({ id: 2, valor: 100.02, data: "2026-09-01" })]);
    expect(r.casados).toHaveLength(0);
    expect(r.pagamentosSemBanco).toHaveLength(1);
    expect(r.debitosSemSistema).toHaveLength(2);
  });

  it("1 para 1: dois pagamentos iguais usam débitos diferentes, o mais próximo primeiro", () => {
    const r = casarPagamentos(
      [pag({ refId: 1, data: "2026-09-10" }), pag({ refId: 2, data: "2026-09-12" })],
      [deb({ id: 10, data: "2026-09-12" }), deb({ id: 11, data: "2026-09-10" })]
    );
    expect(r.casados).toHaveLength(2);
    expect(r.casados.find(c => c.pagamento.refId === 1)!.debito.id).toBe(11);
    expect(r.casados.find(c => c.pagamento.refId === 2)!.debito.id).toBe(10);
  });

  it("débito usado só uma vez", () => {
    const r = casarPagamentos([pag({ refId: 1 }), pag({ refId: 2 })], [deb({ id: 1 })]);
    expect(r.casados).toHaveLength(1);
    expect(r.pagamentosSemBanco).toHaveLength(1);
  });
});

describe("sqlNum", () => {
  it("gera expressão que trata vírgula decimal e valores vazios", () => {
    const s = sqlNum("x");
    expect(s).toContain("LIKE '%,%'");
    expect(s).toContain("x IS NULL OR x = ''");
  });
});
