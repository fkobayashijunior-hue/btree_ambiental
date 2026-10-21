import { describe, it, expect } from "vitest";
import {
  classificarLinha, regraCasa, normalizarTexto, cnpjsDoTexto, REGRAS_PADRAO,
  type LinhaExtrato, type Regra, type ContextoClassificacao,
} from "./utils/extratoClassificacao";

const regras: Regra[] = REGRAS_PADRAO.map((r, i) => ({ ...r, id: i + 1 }));

function linha(p: Partial<LinhaExtrato>): LinhaExtrato {
  return {
    id: 1, dataLancamento: "2026-09-10", descricao: null, complemento: null,
    numeroDocumento: null, tipo: "DEBITO", valor: 100, ...p,
  };
}

function ctx(p: Partial<ContextoClassificacao> = {}): ContextoClassificacao {
  return { manual: new Map(), regras, favorecido: null, compradoresCnpj: new Set(), ...p };
}

describe("normalizarTexto", () => {
  it("remove acentos, maiúsculas e espaços extras", () => {
    expect(normalizarTexto("  Antecipação   Visa ")).toBe("ANTECIPACAO VISA");
    expect(normalizarTexto(null)).toBe("");
  });
});

describe("regras padrão (extrato real set/2026)", () => {
  it("PIX para Fazenda Simflor = madeira (fornecedor), dentro do resultado", () => {
    const c = classificarLinha(linha({
      descricao: "DÉB.TRANSF.CONTAS DIF.TIT. INTERCREDIS",
      complemento: "FAV.: FAZENDA SIMFLOR SPE LTDA Transferência Pix BTREE EMPRE",
    }), ctx());
    expect(c.origem).toBe("regra");
    expect(c.centroCusto).toBe("Compra de Madeira");
    expect(c.tipoResultado).toBe("resultado");
  });

  it("empréstimo fica fora do resultado", () => {
    const c = classificarLinha(linha({ descricao: "DÉB.EMPRÉSTIMO" }), ctx());
    expect(c.tipoResultado).toBe("financeiro_nao_resultado");
    expect(c.natureza).toBe("Parcela de empréstimo");
  });

  it("documento TAG.* = pedágio", () => {
    const c = classificarLinha(linha({ descricao: "DÉBITO PEDÁGIO SICOOB TAG", numeroDocumento: "TAG.PG.PED" }), ctx());
    expect(c.natureza).toBe("Pedágio/TAG");
  });

  it("antecipação de cartão e liquidação de cobrança são receitas, só em crédito", () => {
    const cartao = classificarLinha(linha({ tipo: "CREDITO", descricao: "CR ANTECIPAÇÃO VISA" }), ctx());
    expect(cartao.centroCusto).toBe("Outras atividades");
    const boleto = classificarLinha(linha({ tipo: "CREDITO", descricao: "CRÉD.LIQUIDAÇÃO COBRANÇA" }), ctx());
    expect(boleto.natureza).toBe("Boleto liquidado");
    // a mesma descrição em débito não casa com regra de crédito
    const deb = linha({ tipo: "DEBITO", descricao: "CR ANTECIPAÇÃO VISA" });
    expect(regraCasa(regras.find(r => r.nome.startsWith("Antecipação"))!, deb)).toBe(false);
  });
});

describe("precedência", () => {
  const simflor = linha({ complemento: "FAV.: FAZENDA SIMFLOR SPE LTDA" });

  it("manual vence regra", () => {
    const manual = new Map([[1, { grupo: "Administrativo", centroCusto: "Diretoria", natureza: "Despesas", tipoResultado: "resultado" as const }]]);
    const c = classificarLinha(simflor, ctx({ manual }));
    expect(c.origem).toBe("manual");
    expect(c.grupo).toBe("Administrativo");
  });

  it("regra vence favorecido", () => {
    const c = classificarLinha(simflor, ctx({ favorecido: { grupo: "Outro", centroCusto: "X", natureza: "Y" } }));
    expect(c.origem).toBe("regra");
  });

  it("favorecido classifica débito sem regra", () => {
    const c = classificarLinha(linha({ descricao: "PIX EMITIDO" }), ctx({ favorecido: { grupo: "Produção", centroCusto: "Manutenção de Máquinas", natureza: "Pneus" } }));
    expect(c.origem).toBe("favorecido");
    expect(c.natureza).toBe("Pneus");
  });

  it("sem nada = sem classificação (resultado por padrão)", () => {
    const c = classificarLinha(linha({ descricao: "PIX EMITIDO" }), ctx());
    expect(c.origem).toBe("nenhuma");
    expect(c.tipoResultado).toBe("resultado");
  });

  it("favorecido não classifica crédito", () => {
    const c = classificarLinha(linha({ tipo: "CREDITO", descricao: "PIX RECEBIDO" }), ctx({ favorecido: { grupo: "Produção", centroCusto: null, natureza: null } }));
    expect(c.origem).toBe("nenhuma");
  });
});

describe("compradores cadastrados", () => {
  const pix = linha({
    tipo: "CREDITO", descricao: "PIX RECEBIDO - OUTRA IF",
    complemento: "Recebimento Pix REBNIC MADEIRAS LTDA 72.274.095 0001-42",
  });

  it("extrai CNPJ do texto", () => {
    expect(cnpjsDoTexto(pix)).toEqual(["72274095000142"]);
  });

  it("PIX de comprador vira venda de madeira", () => {
    const c = classificarLinha(pix, ctx({ compradoresCnpj: new Set(["72274095000142"]) }));
    expect(c.centroCusto).toBe("Venda de madeira");
    expect(c.regraNome).toBe("Comprador cadastrado");
  });

  it("PIX de CNPJ desconhecido fica sem classificação", () => {
    expect(classificarLinha(pix, ctx()).origem).toBe("nenhuma");
  });
});

describe("regras personalizadas", () => {
  it("regex inválida não quebra", () => {
    const r: Regra = { ...regras[0], padrao: "re:(" };
    expect(regraCasa(r, linha({ descricao: "x" }))).toBe(false);
  });

  it("regra inativa é ignorada e prioridade menor vence", () => {
    const a: Regra = { ...regras[0], id: 100, padrao: "PIX", prioridade: 5, ativa: false, centroCusto: "A" };
    const b: Regra = { ...regras[0], id: 101, padrao: "PIX", prioridade: 6, centroCusto: "B" };
    const c = classificarLinha(linha({ descricao: "PIX EMITIDO" }), ctx({ regras: [a, b] }));
    expect(c.centroCusto).toBe("B");
  });
});
