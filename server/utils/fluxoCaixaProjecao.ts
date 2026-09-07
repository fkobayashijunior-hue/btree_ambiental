// Mescla as quatro fontes de dados diários do Fluxo de Caixa em uma única linha do tempo:
//  1) Extrato realizado (Sicoob) — fonte de verdade para dias já ocorridos
//  2) Lançamentos futuros importados manualmente via planilha do banco
//  3) Projeção de "Contas a Receber" (boletos em aberto + NFs em aberto sem boleto correspondente)
//  4) Projeção de "Folha de Pagamento" (salários CLT/PJ pendentes + diárias de Presenças pendentes)
//
// Regras de dedução:
//  - Lançamentos futuros da planilha (fonte genérica, sem vínculo com um registro específico):
//    um dia que já tem extrato realizado NUNCA recebe essa projeção (evita contar duas vezes
//    o que já aconteceu).
//  - Contas a Receber (boletos/NFs "em aberto") e Folha (salários/diárias "pendentes"): SEMPRE
//    somados, mesmo em dias com extrato realizado. Como a consulta já filtra apenas o que
//    continua pendente, não há risco de dupla contagem — pelo contrário, é o saldo residual que
//    ainda não foi pago/recebido na data prevista e precisa continuar visível.

export type DiaValor = { data: string; recebimentos: number; pagamentos: number };
export type DiaRecebimentoProjetado = { data: string; valor: number };
export type DiaPagamentoProjetado = { data: string; valor: number };

export type DiaFluxoCaixa = {
  data: string;
  recebimentos: number;
  pagamentos: number;
  projetado: boolean;
  saldoAcumulado: number;
};

export function mergeDiasFluxoCaixa(
  diasRealizados: DiaValor[],
  diasFuturosExcel: DiaValor[],
  diasContasAReceber: DiaRecebimentoProjetado[],
  saldoInicial: number,
  diasFolhaPendente: DiaPagamentoProjetado[] = []
): DiaFluxoCaixa[] {
  const datasRealizadas = new Set(diasRealizados.map(d => d.data));
  const mapa = new Map<string, { data: string; recebimentos: number; pagamentos: number; projetado: boolean }>();

  for (const r of diasRealizados) {
    mapa.set(r.data, { data: r.data, recebimentos: r.recebimentos, pagamentos: r.pagamentos, projetado: false });
  }

  for (const f of diasFuturosExcel) {
    if (datasRealizadas.has(f.data)) continue;
    const atual = mapa.get(f.data) ?? { data: f.data, recebimentos: 0, pagamentos: 0, projetado: true };
    atual.recebimentos += f.recebimentos;
    atual.pagamentos += f.pagamentos;
    atual.projetado = true;
    mapa.set(f.data, atual);
  }

  for (const c of diasContasAReceber) {
    const atual = mapa.get(c.data) ?? { data: c.data, recebimentos: 0, pagamentos: 0, projetado: true };
    atual.recebimentos += c.valor;
    atual.projetado = true; // sinaliza que o dia inclui saldo residual ainda pendente
    mapa.set(c.data, atual);
  }

  for (const p of diasFolhaPendente) {
    const atual = mapa.get(p.data) ?? { data: p.data, recebimentos: 0, pagamentos: 0, projetado: true };
    atual.pagamentos += p.valor;
    atual.projetado = true;
    mapa.set(p.data, atual);
  }

  const dias = Array.from(mapa.values()).sort((a, b) => a.data.localeCompare(b.data));

  let acumulado = saldoInicial;
  return dias.map(d => {
    acumulado += d.recebimentos - d.pagamentos;
    return { ...d, saldoAcumulado: acumulado };
  });
}
