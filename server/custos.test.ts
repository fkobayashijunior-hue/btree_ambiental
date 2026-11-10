import { describe, it, expect } from "vitest";
import { parseValor, validarCusto, hashImportacao, dataValida, exigeCartao } from "./utils/custos";

describe("parseValor", () => {
  it("aceita formatos brasileiros e simples", () => {
    expect(parseValor("1.234,56")).toBe(1234.56);
    expect(parseValor("R$ 12,00")).toBe(12);
    expect(parseValor("1234.56")).toBe(1234.56);
    expect(parseValor("1.234.567")).toBe(1234567);
    expect(parseValor(10.456)).toBe(10.46);
  });
  it("rejeita vazio e texto", () => {
    expect(parseValor("")).toBeNull();
    expect(parseValor("abc")).toBeNull();
    expect(parseValor(null)).toBeNull();
  });
});

describe("validarCusto", () => {
  const ok = { valor: 50, descricao: "Energia", plantaId: 1, categoriaId: 2, dataCompetencia: "2026-11-04" };
  it("aceita o mínimo", () => expect(validarCusto(ok)).toEqual([]));
  it("pede o que falta em português claro", () => {
    expect(validarCusto({ ...ok, valor: 0 })[0]).toBe("Informe o valor");
    expect(validarCusto({ ...ok, plantaId: null })[0]).toBe("Escolha a planta");
    expect(validarCusto({ ...ok, categoriaId: null })[0]).toBe("Escolha o tipo de gasto");
    expect(validarCusto({ ...ok, descricao: "  " })[0]).toBe("Diga o que foi o gasto");
  });
  it("exige cartão quando a forma é cartão", () => {
    expect(validarCusto({ ...ok, formaPagamento: "cartao_credito" })).toContain("Escolha o cartão");
    expect(validarCusto({ ...ok, formaPagamento: "cartao_credito", cartaoId: 3 })).toEqual([]);
    expect(exigeCartao("pix")).toBe(false);
  });
});

describe("hash e datas", () => {
  it("hash ignora acento, caixa e espaços", () => {
    const a = hashImportacao({ data: "2026-11-01", valor: 10, descricao: "Água  da Sede", plantaId: 1 });
    const b = hashImportacao({ data: "2026-11-01", valor: 10.0, descricao: "agua da sede", plantaId: 1 });
    expect(a).toBe(b);
    expect(hashImportacao({ data: "2026-11-01", valor: 10, descricao: "x", plantaId: 2 })).not.toBe(hashImportacao({ data: "2026-11-01", valor: 10, descricao: "x", plantaId: 1 }));
  });
  it("valida data real", () => {
    expect(dataValida("2026-02-30")).toBe(false);
    expect(dataValida("2026-02-28")).toBe(true);
  });
});

import { somarMeses } from "./utils/custos";
describe("somarMeses", () => {
  it("mantém o dia e ajusta fim de mês", () => {
    expect(somarMeses("2026-11-05", 1)).toBe("2026-12-05");
    expect(somarMeses("2026-12-15", 2)).toBe("2027-02-15");
    expect(somarMeses("2026-01-31", 1)).toBe("2026-02-28");
    expect(somarMeses("2026-01-31", 3)).toBe("2026-04-30");
  });
});

import { interpretarLinha, parseDataFlex, atribuirHashes } from "./utils/custosImport";
const lookup = {
  plantas: [{ id: 1, nome: "Sede BTREE Astorga-PR" }, { id: 3, nome: "FAZENDA SIMFLOR" }],
  categorias: [
    { id: 1, nome: "Combustível", tipoPadrao: "variavel" as const, automatica: true },
    { id: 2, nome: "Energia", tipoPadrao: "fixo" as const, automatica: false },
  ],
  cartoes: [{ id: 5, nome: "Cartão Sicoob" }],
  plantasPermitidas: null,
};
describe("importação de planilha", () => {
  it("lê datas em vários formatos", () => {
    expect(parseDataFlex("05/12/2026")).toBe("2026-12-05");
    expect(parseDataFlex(46361)).toBe("2026-12-05");
    expect(parseDataFlex("2026-12-05")).toBe("2026-12-05");
    expect(parseDataFlex("31/02/2026")).toBeNull();
  });
  it("aceita linha válida e usa o padrão da categoria", () => {
    const r: any = interpretarLinha({ linha: 2, data: "05/12/2026", planta: "simflor", categoria: "energia", descricao: "Luz", valor: "352,00" }, lookup);
    expect(r.itens).toHaveLength(1);
    expect(r.itens[0]).toMatchObject({ plantaId: 3, categoriaId: 2, tipo: "fixo", status: "pendente", valor: 352 });
  });
  it("com 'Pago em' fica pago", () => {
    const r: any = interpretarLinha({ linha: 2, data: "05/12/2026", planta: "Sede", categoria: "Energia", descricao: "Luz", valor: 10, pagoEm: "06/12/2026" }, lookup);
    expect(r.itens[0].status).toBe("pago");
    expect(r.itens[0].dataPagamento).toBe("2026-12-06");
  });
  it("rejeita combustível, planta inexistente e cartão sem escolher", () => {
    expect((interpretarLinha({ linha: 2, data: "05/12/2026", planta: "Sede", categoria: "Combustível", descricao: "x", valor: 1 }, lookup) as any).erro).toMatch(/Abastecimento/);
    expect((interpretarLinha({ linha: 2, data: "05/12/2026", planta: "Lua", categoria: "Energia", descricao: "x", valor: 1 }, lookup) as any).erro).toMatch(/não encontrado/);
    expect((interpretarLinha({ linha: 2, data: "05/12/2026", planta: "Sede", categoria: "Energia", descricao: "x", valor: 1, forma: "Cartão de crédito" }, lookup) as any).erro).toMatch(/cartão/i);
  });
  it("local vazio é aceito (sem local)", () => {
    const r: any = interpretarLinha({ linha: 2, data: "05/12/2026", categoria: "Energia", descricao: "Luz", valor: 10 }, lookup);
    expect(r.itens[0].plantaId).toBeNull();
  });
  it("lê Grupo (Despesas Fixas/Variáveis) e Centro de Custo", () => {
    const r: any = interpretarLinha({ linha: 2, data: "05/12/2026", categoria: "Energia", descricao: "Luz", valor: 10, tipo: "Despesas Variáveis", centroCusto: "Produção" }, lookup);
    expect(r.itens[0]).toMatchObject({ tipo: "variavel", centroCusto: "Produção" });
    const r2: any = interpretarLinha({ linha: 2, data: "05/12/2026", categoria: "Energia", descricao: "Luz", valor: 10, centroCusto: "financeiro" }, lookup);
    expect(r2.itens[0].centroCusto).toBe("Financeiro/Administrativo");
    expect((interpretarLinha({ linha: 2, data: "05/12/2026", categoria: "Energia", descricao: "Luz", valor: 10, centroCusto: "Logístico" }, lookup) as any).itens[0].centroCusto).toBe("Logístico");
    expect((interpretarLinha({ linha: 2, data: "05/12/2026", categoria: "Energia", descricao: "Luz", valor: 10, centroCusto: "Outro" }, lookup) as any).erro).toMatch(/Centro de Custo/);
  });
  it("Quem gastou precisa ser colaborador cadastrado (quando a lista é informada)", () => {
    const comColabs = { ...lookup, colaboradores: [{ id: 7, nome: "Fábio Jundy Kobayashi" }] };
    const ok: any = interpretarLinha({ linha: 2, data: "05/12/2026", categoria: "Energia", descricao: "Luz", valor: 10, quemGastou: "fabio jundy kobayashi" }, comColabs);
    expect(ok.itens[0]).toMatchObject({ gastoPorNome: "Fábio Jundy Kobayashi", gastoPorColaboradorId: 7 });
    const ruim: any = interpretarLinha({ linha: 2, data: "05/12/2026", categoria: "Energia", descricao: "Luz", valor: 10, quemGastou: "Fulano" }, comColabs);
    expect(ruim.erro).toMatch(/não cadastrado/);
  });
  it("Situação: Pago sem data usa o vencimento; A pagar com pagamento dá erro", () => {
    const pago: any = interpretarLinha({ linha: 2, data: "05/12/2026", vencimento: "20/12/2026", categoria: "Energia", descricao: "Luz", valor: 10, situacao: "Pago" }, lookup);
    expect(pago.itens[0]).toMatchObject({ status: "pago", dataPagamento: "2026-12-20" });
    const avencer: any = interpretarLinha({ linha: 2, data: "05/12/2026", categoria: "Energia", descricao: "Luz", valor: 10, situacao: "A vencer" }, lookup);
    expect(avencer.itens[0].status).toBe("pendente");
    const conflito: any = interpretarLinha({ linha: 2, data: "05/12/2026", categoria: "Energia", descricao: "Luz", valor: 10, situacao: "A pagar", pagoEm: "06/12/2026" }, lookup);
    expect(conflito.erro).toMatch(/Pagamento/);
  });
  it("uma data só: o vencimento manda e a competência acompanha", () => {
    const r: any = interpretarLinha({ linha: 2, data: "01/12/2026", vencimento: "20/12/2026", categoria: "Energia", descricao: "Luz", valor: 10 }, lookup);
    expect(r.itens[0]).toMatchObject({ dataCompetencia: "2026-12-20", dataVencimento: "2026-12-20" });
    const antiga: any = interpretarLinha({ linha: 2, data: "01/12/2026", categoria: "Energia", descricao: "Luz", valor: 10 }, lookup);
    expect(antiga.itens[0]).toMatchObject({ dataCompetencia: "2026-12-01", dataVencimento: "2026-12-01" });
    const sem: any = interpretarLinha({ linha: 2, categoria: "Energia", descricao: "Luz", valor: 10 }, lookup);
    expect(sem.erro).toMatch(/Data de Vencimento/);
  });
  it("lê Custo Direto/Indireto", () => {
    const d: any = interpretarLinha({ linha: 2, data: "05/12/2026", categoria: "Energia", descricao: "Luz", valor: 10, tipoCusto: "Custo Direto" }, lookup);
    expect(d.itens[0].tipoCusto).toBe("direto");
    const i: any = interpretarLinha({ linha: 2, data: "05/12/2026", categoria: "Energia", descricao: "Luz", valor: 10, tipoCusto: "indireto" }, lookup);
    expect(i.itens[0].tipoCusto).toBe("indireto");
    expect((interpretarLinha({ linha: 2, data: "05/12/2026", categoria: "Energia", descricao: "Luz", valor: 10, tipoCusto: "talvez" }, lookup) as any).erro).toMatch(/Custo/);
  });
  it("repetir gera um lançamento por mês, futuros a pagar", () => {
    const r: any = interpretarLinha({ linha: 2, data: "31/01/2027", planta: "Sede", categoria: "Energia", descricao: "Aluguel", valor: 100, pagoEm: "31/01/2027", repetir: 3, nfNumero: "99" }, lookup);
    expect(r.itens.map((i: any) => i.dataCompetencia)).toEqual(["2027-01-31", "2027-02-28", "2027-03-31"]);
    expect(r.itens.map((i: any) => i.status)).toEqual(["pago", "pendente", "pendente"]);
    expect(r.itens[1].nfNumero).toBeNull();
  });
  it("linhas idênticas no mesmo arquivo ganham hashes diferentes e são estáveis ao reimportar", () => {
    const l: any = interpretarLinha({ linha: 2, data: "05/12/2026", planta: "Sede", categoria: "Energia", descricao: "Lanche", valor: 30 }, lookup);
    const a = atribuirHashes([l.itens[0], l.itens[0]]);
    expect(a[0].hash).not.toBe(a[1].hash);
    expect(atribuirHashes([l.itens[0], l.itens[0]]).map((x) => x.hash)).toEqual(a.map((x) => x.hash));
  });
});
