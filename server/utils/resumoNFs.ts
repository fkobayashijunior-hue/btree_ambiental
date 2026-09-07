// Agregação pura dos cards de resumo (Vencidos, Vencem hoje, A vencer, Recebidos, Total)
// para as NFs da Conta Azul que NÃO têm boleto Sicoob correspondente.
// NFs com boleto correspondente já são contabilizadas via summaryBoletos (Sicoob) e
// não devem ser passadas para esta função.

export type NFParaResumo = {
  valor: number;
  statusNfInterno: "em_aberto" | "pago" | "cancelado";
  dataPagamentoConfirmado: string | null; // "YYYY-MM-DD"
  dataPrevisaoPagamento: string | null;   // "YYYY-MM-DD"
};

export type ResumoNFs = {
  vencidos: number;
  vencemHoje: number;
  aVencer: number;
  recebidos: number;
  total: number;
};

function pertenceAoPeriodo(dataISO: string | null, mes: number, ano: number): boolean {
  if (!dataISO) return false;
  const [a, m] = dataISO.split("-").map(Number);
  return a === ano && m === mes;
}

export function calcularResumoNFsSemBoleto(
  nfs: NFParaResumo[],
  mes: number,
  ano: number,
  hojeISO: string
): ResumoNFs {
  let vencidos = 0, vencemHoje = 0, aVencer = 0, recebidos = 0;

  for (const nf of nfs) {
    if (nf.statusNfInterno === "cancelado") continue;

    if (nf.statusNfInterno === "pago") {
      if (pertenceAoPeriodo(nf.dataPagamentoConfirmado, mes, ano)) {
        recebidos += nf.valor;
      }
      continue;
    }

    // em_aberto
    if (!nf.dataPrevisaoPagamento) continue; // regra default: sem previsão, não entra em nenhum card
    if (!pertenceAoPeriodo(nf.dataPrevisaoPagamento, mes, ano)) continue;

    if (nf.dataPrevisaoPagamento < hojeISO) vencidos += nf.valor;
    else if (nf.dataPrevisaoPagamento === hojeISO) vencemHoje += nf.valor;
    else aVencer += nf.valor;
  }

  return {
    vencidos,
    vencemHoje,
    aVencer,
    recebidos,
    total: vencidos + vencemHoje + aVencer + recebidos,
  };
}
