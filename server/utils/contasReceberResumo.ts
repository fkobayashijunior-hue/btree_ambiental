// Cálculo puro dos cards de "Contas a Receber" (Vencidos, Vencem hoje, A vencer, Recebidos, Total).
// Recebe itens já normalizados de qualquer fonte (boletos Sicoob, NFs sem boleto, cargas a receber)
// para que os cards sigam exatamente os mesmos filtros das tabelas.

export type ItemReceber = {
  fonte: "boleto" | "nf" | "carga";
  valor: number;
  recebido: boolean;
  cancelado: boolean;
  /** YYYY-MM-DD: vencimento (boleto/carga) ou previsão de pagamento (NF). null = sem previsão */
  vencimento: string | null;
};

export type StatusFiltro = "todos" | "em_aberto" | "pago" | "cancelado";

export type CardsResumo = {
  vencidos: number;
  vencemHoje: number;
  aVencer: number;
  recebidos: number;
  total: number;
  /** NFs em aberto sem previsão de pagamento: não entram nos cards, mas são informadas */
  semPrevisao: { qtd: number; valor: number };
  porFonte: Record<"boleto" | "nf" | "carga", number>;
};

const r2 = (n: number) => Math.round(n * 100) / 100;

export function calcularCards(itens: ItemReceber[], hoje: string, status: StatusFiltro = "todos"): CardsResumo {
  let vencidos = 0, vencemHoje = 0, aVencer = 0, recebidos = 0;
  const semPrevisao = { qtd: 0, valor: 0 };
  const porFonte = { boleto: 0, nf: 0, carga: 0 };

  for (const it of itens) {
    if (it.cancelado) continue;          // cancelado/baixado nunca entra nos totais
    if (status === "cancelado") continue; // filtro "cancelado": cards zerados
    if (it.recebido) {
      if (status === "em_aberto") continue;
      recebidos += it.valor;
      porFonte[it.fonte] += it.valor;
      continue;
    }
    if (status === "pago") continue;
    if (!it.vencimento) {
      semPrevisao.qtd++; semPrevisao.valor += it.valor;
      continue;
    }
    if (it.vencimento < hoje) vencidos += it.valor;
    else if (it.vencimento === hoje) vencemHoje += it.valor;
    else aVencer += it.valor;
    porFonte[it.fonte] += it.valor;
  }

  return {
    vencidos: r2(vencidos), vencemHoje: r2(vencemHoje), aVencer: r2(aVencer), recebidos: r2(recebidos),
    total: r2(vencidos + vencemHoje + aVencer + recebidos),
    semPrevisao: { qtd: semPrevisao.qtd, valor: r2(semPrevisao.valor) },
    porFonte: { boleto: r2(porFonte.boleto), nf: r2(porFonte.nf), carga: r2(porFonte.carga) },
  };
}

/** Item vencido e não pago? (usado para pintar a data de vermelho) */
export function estaAtrasado(vencimento: string | null | undefined, recebido: boolean, cancelado: boolean, hoje: string): boolean {
  return !!vencimento && !recebido && !cancelado && vencimento.slice(0, 10) < hoje;
}

export function soDigitos(s: string | null | undefined): string {
  return (s ?? "").replace(/\D/g, "");
}
