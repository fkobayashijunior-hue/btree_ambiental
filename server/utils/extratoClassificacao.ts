// Classificação de lançamentos do extrato bancário para o Dashboard Financeiro Real.
//
// Precedência: ajuste manual (por lançamento) > regra (texto/documento/comprador cadastrado)
// > classificação do favorecido (favorecido_categoria) > sem classificação.
// Função pura (sem acesso a banco) para ser testável; o router carrega os dados e chama aqui.

export type TipoLancamento = "DEBITO" | "CREDITO";
export type TipoResultado = "resultado" | "financeiro_nao_resultado" | "transferencia_propria";
export type OrigemClassificacao = "manual" | "regra" | "favorecido" | "nenhuma";

export type LinhaExtrato = {
  id: number;
  dataLancamento: string;
  descricao: string | null;
  complemento: string | null;
  numeroDocumento: string | null;
  tipo: TipoLancamento;
  /** valor absoluto (sempre positivo) */
  valor: number;
  /** nome da conta (Sicoob ou conta importada) */
  conta?: string | null;
};

export type Classificacao = {
  grupo: string | null;
  centroCusto: string | null;
  natureza: string | null;
  tipoResultado: TipoResultado;
  origem: OrigemClassificacao;
  regraId: number | null;
  regraNome: string | null;
};

export type Regra = {
  id: number;
  nome: string;
  campo: "descricao" | "complemento" | "documento" | "texto";
  /** DEBITO, CREDITO ou AMBOS */
  tipoLancamento: "DEBITO" | "CREDITO" | "AMBOS";
  /** substring (sem diferenciar maiúsculas/acentos) ou regex quando começa com "re:" */
  padrao: string;
  grupo: string | null;
  centroCusto: string | null;
  natureza: string | null;
  tipoResultado: TipoResultado;
  prioridade: number;
  ativa: boolean;
};

export type ManualClassificacao = {
  grupo: string | null;
  centroCusto: string | null;
  natureza: string | null;
  tipoResultado: TipoResultado;
};

export type FavorecidoClassificacao = {
  grupo: string | null;
  centroCusto: string | null;
  natureza: string | null;
};

export const GRUPO_RECEITAS = "Receitas";

// Regras de partida (definidas com o usuário a partir do extrato real). Gravadas na tabela
// extrato_regras na primeira execução; depois são editáveis na tela.
export const REGRAS_PADRAO: Omit<Regra, "id">[] = [
  {
    nome: "Pagamento de madeira — Fazenda Simflor",
    campo: "texto", tipoLancamento: "DEBITO", padrao: "FAZENDA SIMFLOR SPE",
    grupo: "Produção", centroCusto: "Compra de Madeira", natureza: "Madeira (fornecedor)",
    tipoResultado: "resultado", prioridade: 10, ativa: true,
  },
  {
    nome: "Empréstimo — parcela",
    campo: "descricao", tipoLancamento: "DEBITO", padrao: "EMPRESTIMO",
    grupo: "Financeiro", centroCusto: "Empréstimos", natureza: "Parcela de empréstimo",
    tipoResultado: "financeiro_nao_resultado", prioridade: 20, ativa: true,
  },
  {
    nome: "Pedágio / TAG",
    campo: "documento", tipoLancamento: "DEBITO", padrao: "re:^TAG\\.",
    grupo: "Logística", centroCusto: "Frota", natureza: "Pedágio/TAG",
    tipoResultado: "resultado", prioridade: 30, ativa: true,
  },
  {
    nome: "Boleto liquidado (cobrança)",
    campo: "descricao", tipoLancamento: "CREDITO", padrao: "LIQUIDACAO COBRANCA",
    grupo: GRUPO_RECEITAS, centroCusto: "Venda de madeira", natureza: "Boleto liquidado",
    tipoResultado: "resultado", prioridade: 40, ativa: true,
  },
  {
    nome: "Antecipação de cartão (loja/mudas)",
    campo: "descricao", tipoLancamento: "CREDITO", padrao: "re:ANTECIPACAO (VISA|MASTERCARD)",
    grupo: GRUPO_RECEITAS, centroCusto: "Outras atividades", natureza: "Vendas no cartão (loja/mudas)",
    tipoResultado: "resultado", prioridade: 50, ativa: true,
  },
];

/** Maiúsculas, sem acentos e com espaços normalizados — para comparar textos do banco. */
export function normalizarTexto(s: string | null | undefined): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

function textoDoCampo(linha: LinhaExtrato, campo: Regra["campo"]): string {
  switch (campo) {
    case "descricao": return normalizarTexto(linha.descricao);
    case "complemento": return normalizarTexto(linha.complemento);
    case "documento": return normalizarTexto(linha.numeroDocumento);
    default: return normalizarTexto(`${linha.descricao ?? ""} ${linha.complemento ?? ""} ${linha.numeroDocumento ?? ""}`);
  }
}

export function regraCasa(regra: Regra, linha: LinhaExtrato): boolean {
  if (!regra.ativa) return false;
  if (regra.tipoLancamento !== "AMBOS" && regra.tipoLancamento !== linha.tipo) return false;
  const texto = textoDoCampo(linha, regra.campo);
  if (regra.padrao.startsWith("re:")) {
    try {
      return new RegExp(regra.padrao.slice(3), "i").test(texto);
    } catch {
      return false; // regex inválida nunca derruba a tela
    }
  }
  const alvo = normalizarTexto(regra.padrao);
  return alvo.length > 0 && texto.includes(alvo);
}

const CNPJ_REGEX = /(\d{2}\.\d{3}\.\d{3})[\/\s](\d{4}-\d{2})/g;

/** CNPJs (14 dígitos) citados no texto do lançamento. */
export function cnpjsDoTexto(linha: LinhaExtrato): string[] {
  const texto = `${linha.descricao ?? ""} ${linha.complemento ?? ""}`;
  const out: string[] = [];
  const re = new RegExp(CNPJ_REGEX.source, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(texto)) !== null) {
    const d = (m[1] + m[2]).replace(/\D/g, "");
    if (d.length === 14) out.push(d);
  }
  return out;
}

export type ContextoClassificacao = {
  manual: Map<number, ManualClassificacao>;
  regras: Regra[];
  /** classificação do favorecido, já resolvida para esta linha (ou null) */
  favorecido: FavorecidoClassificacao | null;
  /** CNPJs (14 dígitos) de compradores — PIX recebido deles é venda de madeira */
  compradoresCnpj: Set<string>;
};

const SEM_CLASSIFICACAO: Classificacao = {
  grupo: null, centroCusto: null, natureza: null,
  tipoResultado: "resultado", origem: "nenhuma", regraId: null, regraNome: null,
};

export function classificarLinha(linha: LinhaExtrato, ctx: ContextoClassificacao): Classificacao {
  const manual = ctx.manual.get(linha.id);
  if (manual) {
    return { ...manual, origem: "manual", regraId: null, regraNome: null };
  }

  const regras = [...ctx.regras].sort((a, b) => a.prioridade - b.prioridade || a.id - b.id);
  for (const r of regras) {
    if (regraCasa(r, linha)) {
      return {
        grupo: r.grupo, centroCusto: r.centroCusto, natureza: r.natureza,
        tipoResultado: r.tipoResultado, origem: "regra", regraId: r.id, regraNome: r.nome,
      };
    }
  }

  // PIX recebido de um comprador cadastrado (CNPJ em cargo_destinations / notas_fiscais) = venda
  if (linha.tipo === "CREDITO" && ctx.compradoresCnpj.size > 0) {
    if (cnpjsDoTexto(linha).some(c => ctx.compradoresCnpj.has(c))) {
      return {
        grupo: GRUPO_RECEITAS, centroCusto: "Venda de madeira", natureza: "PIX de comprador",
        tipoResultado: "resultado", origem: "regra", regraId: null, regraNome: "Comprador cadastrado",
      };
    }
  }

  const fav = ctx.favorecido;
  if (linha.tipo === "DEBITO" && fav && (fav.grupo || fav.centroCusto || fav.natureza)) {
    return {
      grupo: fav.grupo, centroCusto: fav.centroCusto, natureza: fav.natureza,
      tipoResultado: "resultado", origem: "favorecido", regraId: null, regraNome: null,
    };
  }

  return SEM_CLASSIFICACAO;
}

export function estaClassificado(c: Classificacao): boolean {
  return c.origem !== "nenhuma";
}
