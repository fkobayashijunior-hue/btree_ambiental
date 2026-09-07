// Cálculo puro de "Data Previsão de Pagamento" com base em regras de prazo por cliente.
// Todas as datas de entrada/saída estão no formato "YYYY-MM-DD".
import { proximoDiaUtil, somarDiasUteis } from "./feriadosBrasil";

export type RegraPrazo =
  | { tipoRegra: "dias_corridos"; parametros: { dias: number } }
  | { tipoRegra: "faixa_mensal"; parametros: Record<string, never> }
  | { tipoRegra: "semanal_quarta"; parametros: Record<string, never> };

export function normalizarCnpj(cnpj: string | null | undefined): string {
  return (cnpj ?? "").replace(/\D/g, "");
}

function parseDataISO(data: string): { ano: number; mes: number; dia: number } {
  const [ano, mes, dia] = data.split("-").map(Number);
  return { ano, mes, dia };
}

function toISO(ano: number, mes: number, dia: number): string {
  const mm = String(mes).padStart(2, "0");
  const dd = String(dia).padStart(2, "0");
  return `${ano}-${mm}-${dd}`;
}

function ultimoDiaDoMes(ano: number, mes: number): number {
  // mes 1-indexado; dia 0 do mês seguinte = último dia do mês atual
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

// Regra Rebnic: faixas de emissão dentro do mês
//  - dia 20 do mês anterior até último dia do mês anterior -> dia 10 do mês corrente
//  - dia 01 a 09 do mês corrente -> dia 20 do mês corrente
//  - dia 10 a 19 do mês corrente -> dia 30 do mês corrente (ou último dia útil se não existir dia 30, ex: fevereiro)
function calcularFaixaMensalRebnic(dataEmissaoISO: string): string {
  const { ano, mes, dia } = parseDataISO(dataEmissaoISO);

  if (dia >= 20) {
    // Paga no dia 10 do mês seguinte
    let anoPagamento = ano;
    let mesPagamento = mes + 1;
    if (mesPagamento > 12) { mesPagamento = 1; anoPagamento++; }
    return toISO(anoPagamento, mesPagamento, 10);
  }
  if (dia <= 9) {
    // Paga no dia 20 do mesmo mês
    return toISO(ano, mes, 20);
  }
  // dia 10 a 19 -> paga no dia 30 do mesmo mês (ajusta se o mês não tem dia 30, ex: fevereiro)
  const ultimoDia = ultimoDiaDoMes(ano, mes);
  const diaPagamento = Math.min(30, ultimoDia);
  return toISO(ano, mes, diaPagamento);
}

// Regra semanal: paga toda quarta-feira, referente às cargas da semana anterior (domingo a
// sábado) — a data de referência (emissão) cai dentro dessa semana anterior, e o pagamento é
// na quarta da semana SEGUINTE a ela. Se a quarta cair em feriado, empurra pro próximo dia útil.
// Exemplo: semana 30/08 (dom) - 05/09 (sáb) -> paga quarta 09/09.
function calcularQuartaSemanaSeguinte(dataReferenciaISO: string): string {
  const { ano, mes, dia } = parseDataISO(dataReferenciaISO);
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  const domingoDaSemana = d.getUTCDay(); // 0 = domingo
  d.setUTCDate(d.getUTCDate() - domingoDaSemana); // volta pro domingo que inicia a semana da referência
  d.setUTCDate(d.getUTCDate() + 10); // domingo + 10 dias = quarta-feira da semana seguinte
  const quarta = toISO(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  return proximoDiaUtil(quarta);
}

/**
 * Calcula a Data Previsão de Pagamento para uma NF, com base no CNPJ do destinatário
 * e na Data de Emissão. Retorna null se não houver regra cadastrada para o CNPJ
 * (regra default: sem previsão).
 */
export function calcularDataPrevisaoPagamento(
  cnpj: string | null | undefined,
  dataEmissao: string | null | undefined,
  regras: { cnpj: string; tipoRegra: string; parametros: string }[],
  dataEntregaCarga?: string | null
): string | null {
  if (!dataEmissao) return null;
  const cnpjNorm = normalizarCnpj(cnpj);
  if (!cnpjNorm) return null;

  const regra = regras.find(r => normalizarCnpj(r.cnpj) === cnpjNorm);
  if (!regra) return null;

  if (regra.tipoRegra === "dias_corridos") {
    let dias = 0;
    try { dias = JSON.parse(regra.parametros)?.dias ?? 0; } catch { dias = 0; }
    // Sonoco/Enerbio/A.R.C. Logística: o prazo conta a partir da ENTREGA da carga vinculada à NF,
    // não da emissão da NF (que pode sair antes ou depois da entrega efetiva). Sem carga vinculada
    // (ou sem data de entrega registrada), cai de volta pra data de emissão. Os dias são ÚTEIS
    // (pula sábado/domingo/feriado nacional), não corridos.
    const baseISO = (dataEntregaCarga ?? dataEmissao).slice(0, 10);
    return somarDiasUteis(baseISO, dias);
  }
  if (regra.tipoRegra === "faixa_mensal") {
    return calcularFaixaMensalRebnic(dataEmissao.slice(0, 10));
  }
  if (regra.tipoRegra === "semanal_quarta") {
    return calcularQuartaSemanaSeguinte(dataEmissao.slice(0, 10));
  }
  return null;
}
