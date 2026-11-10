// Regras puras do módulo de custos lançados à mão (Contas a Pagar): validação, normalização e hash.
import { createHash } from "node:crypto";

export const FORMAS_PAGAMENTO = [
  "dinheiro", "pix", "cartao_credito", "cartao_debito", "transferencia", "boleto", "debito_conta", "outro",
] as const;
export type FormaPagamento = typeof FORMAS_PAGAMENTO[number];

export const FORMA_LABEL: Record<FormaPagamento, string> = {
  dinheiro: "Dinheiro",
  pix: "Pix",
  cartao_credito: "Cartão de crédito",
  cartao_debito: "Cartão de débito",
  transferencia: "Transferência",
  boleto: "Boleto",
  debito_conta: "Débito em conta",
  outro: "Outro",
};

export const exigeCartao = (forma: string | null | undefined) => forma === "cartao_credito" || forma === "cartao_debito";

// Categorias semeadas na primeira utilização (editáveis depois).
export const CATEGORIAS_PADRAO: { nome: string; tipo: "fixo" | "variavel"; automatica: boolean; icone: string; ordem: number }[] = [
  { nome: "Combustível", tipo: "variavel", automatica: true, icone: "fuel", ordem: 1 },
  { nome: "Alimentação", tipo: "variavel", automatica: false, icone: "utensils", ordem: 2 },
  { nome: "Manutenção", tipo: "variavel", automatica: false, icone: "wrench", ordem: 3 },
  { nome: "Compra de material", tipo: "variavel", automatica: false, icone: "package", ordem: 4 },
  { nome: "Serviço terceirizado", tipo: "variavel", automatica: false, icone: "users", ordem: 5 },
  { nome: "Aluguel", tipo: "fixo", automatica: false, icone: "home", ordem: 6 },
  { nome: "Energia", tipo: "fixo", automatica: false, icone: "zap", ordem: 7 },
  { nome: "Água", tipo: "fixo", automatica: false, icone: "droplet", ordem: 8 },
  { nome: "Internet e telefone", tipo: "fixo", automatica: false, icone: "wifi", ordem: 9 },
  { nome: "Pedágio / TAG", tipo: "variavel", automatica: false, icone: "route", ordem: 10 },
  { nome: "Outros", tipo: "variavel", automatica: false, icone: "more", ordem: 99 },
];

/** Converte "1.234,56", "1234.56", "R$ 12,00" ou número em número com 2 casas. Retorna null se inválido. */
export function parseValor(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? Math.round(raw * 100) / 100 : null;
  let s = String(raw).replace(/[R$\s]/g, "");
  if (!s) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if ((s.match(/\./g) ?? []).length > 1) s = s.replace(/\./g, "");
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

/** Soma meses a uma data AAAA-MM-DD mantendo o dia (e usando o último dia do mês quando ele não existe). */
export function somarMeses(data: string, meses: number): string {
  const [a, m, d] = data.split("-").map(Number);
  const alvo = new Date(Date.UTC(a, m - 1 + meses, 1));
  const ultimo = new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0)).getUTCDate();
  alvo.setUTCDate(Math.min(d, ultimo));
  return alvo.toISOString().slice(0, 10);
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;
export function dataValida(s: string | null | undefined): boolean {
  if (!s || !ISO.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export type EntradaCusto = {
  valor: number;
  descricao: string;
  plantaId: number | null;
  categoriaId: number | null;
  dataCompetencia: string;
  formaPagamento?: string | null;
  cartaoId?: number | null;
};

/** Valida o mínimo para salvar. Mensagens em português simples. */
export function validarCusto(e: EntradaCusto, opts: { plantaObrigatoria?: boolean } = {}): string[] {
  const erros: string[] = [];
  if (!(e.valor > 0)) erros.push("Informe o valor");
  if (!e.descricao || !e.descricao.trim()) erros.push("Diga o que foi o gasto");
  if (opts.plantaObrigatoria !== false && !e.plantaId) erros.push("Escolha a planta");
  if (!e.categoriaId) erros.push("Escolha o tipo de gasto");
  if (!dataValida(e.dataCompetencia)) erros.push("Data inválida");
  if (exigeCartao(e.formaPagamento) && !e.cartaoId) erros.push("Escolha o cartão");
  return erros;
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/** Hash para evitar duplicata em importação (data + valor + descrição + planta). */
export function hashImportacao(e: { data: string; valor: number; descricao: string; plantaId: number | null }): string {
  return createHash("sha1").update(`${e.data}|${e.valor.toFixed(2)}|${norm(e.descricao)}|${e.plantaId ?? 0}`).digest("hex");
}
