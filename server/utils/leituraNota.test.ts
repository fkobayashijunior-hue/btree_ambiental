import { describe, expect, it } from "vitest";
import { chaveValida, cnpjValido, conferirLeitura, type LeituraBruta } from "./leituraNota";

const BTREE = "58616075000181";
const base: LeituraBruta = {
  tipo_documento: "nfe_danfe", emitente_nome: "MENEGATTI CADEADO COMERCIO DE COMBUSTIVEIS LTDA", emitente_cnpj: "30166354000171",
  numero_nf: "153391", serie: "2", data_emissao: "2026-11-08", valor_total: 286.95,
  chave_acesso: "41261130166354000171550020001533911020358579", forma_pagamento: "cartao_credito",
  itens_resumo: "Graxeta 7 un", categoria: "Manutenção", legivel: true, observacoes: "",
};

describe("conferências da leitura da nota", () => {
  it("dígitos verificadores", () => {
    expect(cnpjValido(BTREE)).toBe(true);
    expect(cnpjValido("58616075000182")).toBe(false);
    expect(chaveValida(base.chave_acesso)).toBe(true);
    expect(chaveValida("41261130166354000171550020001536131020524990")).toBe(false);
  });

  it("leitura boa passa sem avisos e monta a descrição", () => {
    const r = conferirLeitura(base, BTREE, "2026-11-10");
    expect(r.avisos).toEqual([]);
    expect(r).toMatchObject({ valor: 286.95, data: "2026-11-08", nfNumero: "153391", serie: "2", favorecidoCnpj: "30166354000171", formaPagamento: "cartao_credito" });
    expect(r.descricao).toBe("Graxeta 7 un - MENEGATTI CADEADO COMERCIO DE COMBUSTIVEIS LTDA");
  });

  it("chave válida corrige número, série e CNPJ lidos errado", () => {
    // caso real do teste: nº lido 153613 numa nota cuja chave válida diz 153013
    const r = conferirLeitura({ ...base, numero_nf: "153613", emitente_cnpj: BTREE, chave_acesso: "41261130166354000171550020001530131020324990" }, BTREE, "2026-11-10");
    expect(r.nfNumero).toBe("153013");
    expect(r.favorecidoCnpj).toBe("30166354000171");
    expect(r.avisos).toEqual([]);
  });

  it("chave inválida é descartada com aviso", () => {
    const r = conferirLeitura({ ...base, chave_acesso: "41261130166354000171550020001536131020524990", numero_nf: "153613" }, BTREE, "2026-11-10");
    expect(r.chave).toBeNull();
    expect(r.nfNumero).toBe("153613");
    expect(r.avisos.join(" ")).toMatch(/chave de acesso não foi lida/);
  });

  it("CNPJ da BTREE nunca vira fornecedor", () => {
    const r = conferirLeitura({ ...base, chave_acesso: "", emitente_cnpj: BTREE }, BTREE, "2026-11-10");
    expect(r.favorecidoCnpj).toBeNull();
    expect(r.avisos.join(" ")).toMatch(/comprador \(BTREE\)/);
  });

  it("ano errado e documento não fiscal geram aviso", () => {
    const r = conferirLeitura({ ...base, chave_acesso: "", data_emissao: "2024-11-08", tipo_documento: "cupom_nao_fiscal" }, BTREE, "2026-11-10");
    expect(r.avisos.join(" ")).toMatch(/antiga/);
    expect(r.avisos.join(" ")).toMatch(/não parece ser uma nota fiscal/);
  });

  it("combustível: não sugere categoria e avisa para usar o Controle de Abastecimento", () => {
    const r = conferirLeitura({ ...base, itens_resumo: "Gasolina comum 47,9 L" }, BTREE, "2026-11-10");
    expect(r.categoria).toBeNull();
    expect(r.avisos.join(" ")).toMatch(/Controle de Abastecimento/);
    expect(conferirLeitura(base, BTREE, "2026-11-10").categoria).toBe("Manutenção");
  });

  it("forma de pagamento fora da lista é ignorada", () => {
    expect(conferirLeitura({ ...base, forma_pagamento: "" }, BTREE, "2026-11-10").formaPagamento).toBeNull();
  });
});
