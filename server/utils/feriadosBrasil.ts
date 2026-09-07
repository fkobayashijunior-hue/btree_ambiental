// Feriados nacionais brasileiros (+ Carnaval, que bancos tratam como não-útil mesmo não sendo
// feriado nacional oficial) — usado para calcular "próximo dia útil" em regras de pagamento.
// Não inclui feriados estaduais/municipais.

function toISO(ano: number, mes: number, dia: number): string {
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

// Domingo de Páscoa (algoritmo de Gauss/Meeus, calendário gregoriano)
function pascoa(ano: number): { mes: number; dia: number } {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return { mes, dia };
}

function addDiasData(ano: number, mes: number, dia: number, offset: number): { ano: number; mes: number; dia: number } {
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  d.setUTCDate(d.getUTCDate() + offset);
  return { ano: d.getUTCFullYear(), mes: d.getUTCMonth() + 1, dia: d.getUTCDate() };
}

// Feriados nacionais (fixos) + móveis (baseados na Páscoa) + Carnaval (não-útil bancário).
export function feriadosDoAno(ano: number): Set<string> {
  const datas = new Set<string>();

  const fixos: [number, number][] = [
    [1, 1],   // Confraternização Universal
    [4, 21],  // Tiradentes
    [5, 1],   // Dia do Trabalho
    [9, 7],   // Independência
    [10, 12], // Nossa Senhora Aparecida
    [11, 2],  // Finados
    [11, 15], // Proclamação da República
    [11, 20], // Consciência Negra (feriado nacional desde a Lei 14.759/2023)
    [12, 25], // Natal
  ];
  for (const [mes, dia] of fixos) datas.add(toISO(ano, mes, dia));

  const p = pascoa(ano);
  const sextaSanta = addDiasData(ano, p.mes, p.dia, -2);
  const corpusChristi = addDiasData(ano, p.mes, p.dia, 60);
  const carnavalSegunda = addDiasData(ano, p.mes, p.dia, -48);
  const carnavalTerca = addDiasData(ano, p.mes, p.dia, -47);

  datas.add(toISO(sextaSanta.ano, sextaSanta.mes, sextaSanta.dia));
  datas.add(toISO(corpusChristi.ano, corpusChristi.mes, corpusChristi.dia));
  datas.add(toISO(carnavalSegunda.ano, carnavalSegunda.mes, carnavalSegunda.dia));
  datas.add(toISO(carnavalTerca.ano, carnavalTerca.mes, carnavalTerca.dia));

  return datas;
}

const cacheAnos = new Map<number, Set<string>>();

export function ehFeriado(dataISO: string): boolean {
  const ano = parseInt(dataISO.slice(0, 4));
  if (!cacheAnos.has(ano)) cacheAnos.set(ano, feriadosDoAno(ano));
  return cacheAnos.get(ano)!.has(dataISO);
}

export function ehDiaUtil(dataISO: string): boolean {
  const [ano, mes, dia] = dataISO.split("-").map(Number);
  const dow = new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay();
  if (dow === 0 || dow === 6) return false;
  return !ehFeriado(dataISO);
}

// Empurra a data pro próximo dia útil (sábado/domingo/feriado) — se a própria data já for
// dia útil, retorna ela mesma.
export function proximoDiaUtil(dataISO: string): string {
  let [ano, mes, dia] = dataISO.split("-").map(Number);
  let atual = dataISO;
  while (!ehDiaUtil(atual)) {
    const d = new Date(Date.UTC(ano, mes - 1, dia));
    d.setUTCDate(d.getUTCDate() + 1);
    ano = d.getUTCFullYear(); mes = d.getUTCMonth() + 1; dia = d.getUTCDate();
    atual = toISO(ano, mes, dia);
  }
  return atual;
}

// Soma N dias ÚTEIS à data (pula sábado/domingo/feriado) — a data de partida não conta como um
// dos dias somados, só serve de base; cada passo avança um dia e só "consome" a soma quando cai
// num dia útil.
export function somarDiasUteis(dataISO: string, dias: number): string {
  let [ano, mes, dia] = dataISO.split("-").map(Number);
  let atual = dataISO;
  let restantes = dias;
  while (restantes > 0) {
    const d = new Date(Date.UTC(ano, mes - 1, dia));
    d.setUTCDate(d.getUTCDate() + 1);
    ano = d.getUTCFullYear(); mes = d.getUTCMonth() + 1; dia = d.getUTCDate();
    atual = toISO(ano, mes, dia);
    if (ehDiaUtil(atual)) restantes--;
  }
  return atual;
}
