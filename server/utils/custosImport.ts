// Interpretação das linhas de uma planilha de custos (pura, sem banco): converte textos em dados validados.
import { FORMA_LABEL, FORMAS_PAGAMENTO, parseValor, dataValida, exigeCartao, somarMeses, hashImportacao, type FormaPagamento } from "./custos";

export type LinhaBruta = {
  linha: number;
  data?: unknown; planta?: unknown; categoria?: unknown; tipo?: unknown; descricao?: unknown; favorecido?: unknown;
  valor?: unknown; forma?: unknown; cartao?: unknown; quemGastou?: unknown; nfNumero?: unknown;
  vencimento?: unknown; pagoEm?: unknown; repetir?: unknown; observacoes?: unknown; centroCusto?: unknown; tipoCusto?: unknown; situacao?: unknown;
};

export const chave = (s: unknown) =>
  String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/** Aceita número serial do Excel, "dd/mm/aaaa", "dd/mm/aa" e "aaaa-mm-dd". Retorna AAAA-MM-DD ou null. */
export function parseDataFlex(raw: unknown): string | null {
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw === "number") {
    if (!Number.isFinite(raw) || raw < 1 || raw > 80000) return null;
    const d = new Date(Math.round((raw - 25569) * 86400000));
    const iso = d.toISOString().slice(0, 10);
    return dataValida(iso) ? iso : null;
  }
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) { const iso = s.slice(0, 10); return dataValida(iso) ? iso : null; }
  const m = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2}|\d{4})$/);
  if (!m) return null;
  const ano = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
  const iso = `${ano}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return dataValida(iso) ? iso : null;
}

const FORMA_POR_CHAVE: Record<string, FormaPagamento> = {};
for (const f of FORMAS_PAGAMENTO) { FORMA_POR_CHAVE[chave(f)] = f; FORMA_POR_CHAVE[chave(FORMA_LABEL[f])] = f; }
Object.assign(FORMA_POR_CHAVE, {
  "cartao": "cartao_credito", "credito": "cartao_credito", "cartao credito": "cartao_credito",
  "debito": "cartao_debito", "cartao debito": "cartao_debito", "ted": "transferencia", "doc": "transferencia",
});

export type Lookup = {
  plantas: { id: number; nome: string }[];
  categorias: { id: number; nome: string; tipoPadrao: "fixo" | "variavel"; automatica: boolean }[];
  cartoes: { id: number; nome: string }[];
  colaboradores?: { id: number; nome: string }[]; // quando informado, "Quem gastou" precisa estar na lista
  plantasPermitidas: number[] | null;
};

function acharPlanta(l: Lookup, texto: string) {
  const k = chave(texto);
  const exata = l.plantas.filter((p) => chave(p.nome) === k);
  if (exata.length === 1) return exata[0];
  const parcial = l.plantas.filter((p) => chave(p.nome).includes(k) || k.includes(chave(p.nome)));
  return parcial.length === 1 ? parcial[0] : null;
}

export type LancamentoPronto = {
  linha: number;
  dataCompetencia: string; dataVencimento: string | null; dataPagamento: string | null;
  status: "pago" | "pendente";
  plantaId: number | null; categoriaId: number; tipo: "fixo" | "variavel";
  descricao: string; favorecido: string | null; valor: number;
  formaPagamento: FormaPagamento | null; cartaoId: number | null; gastoPorNome: string | null; gastoPorColaboradorId: number | null;
  nfNumero: string | null; observacoes: string | null; centroCusto: string | null; tipoCusto: string | null;
};

const MAX_REPETIR = 36;

/** Valida uma linha e a expande em N lançamentos quando "Repetir (meses)" está preenchido. */
export function interpretarLinha(r: LinhaBruta, l: Lookup): { erro: string } | { itens: LancamentoPronto[] } {
  const txt = (v: unknown) => { const s = String(v ?? "").trim(); return s ? s : null; };

  // Uma data só: a Data de Vencimento (em planilhas antigas, vale a coluna Data)
  const dataVenc = txt(r.vencimento) ? parseDataFlex(r.vencimento) : null;
  const dataAntiga = txt(r.data) ? parseDataFlex(r.data) : null;
  if (txt(r.vencimento) && !dataVenc) return { erro: "Data de Vencimento inválida (use dia/mês/ano)" };
  const dataComp = dataVenc ?? dataAntiga;
  if (!dataComp) return { erro: "Informe a Data de Vencimento (dia/mês/ano)" };

  const descricao = txt(r.descricao);
  if (!descricao) return { erro: "Descrição vazia" };

  const valor = parseValor(r.valor);
  if (valor === null || valor <= 0) return { erro: "Valor inválido (precisa ser maior que zero)" };

  // O local é opcional: vazio = sem local. Se vier preenchido, precisa existir e estar liberado para o usuário.
  const plantaTxt = txt(r.planta);
  let planta: { id: number; nome: string } | null = null;
  if (plantaTxt) {
    planta = acharPlanta(l, plantaTxt);
    if (!planta) return { erro: `Local “${plantaTxt}” não encontrado` };
    if (l.plantasPermitidas && !l.plantasPermitidas.includes(planta.id)) return { erro: `Sem acesso ao local “${planta.nome}”` };
  }

  const catTxt = txt(r.categoria);
  if (!catTxt) return { erro: "Categoria vazia" };
  const cat = l.categorias.find((c) => chave(c.nome) === chave(catTxt));
  if (!cat) return { erro: `Categoria “${catTxt}” não existe` };
  if (cat.automatica) return { erro: `“${cat.nome}” é lançado no Controle de Abastecimento` };

  let tipo: "fixo" | "variavel" = cat.tipoPadrao;
  const tipoTxt = txt(r.tipo);
  if (tipoTxt) {
    const t = chave(tipoTxt);
    if (t.includes("fix")) tipo = "fixo";
    else if (t.includes("var")) tipo = "variavel";
    else return { erro: `Grupo deve ser “Despesas Fixas” ou “Despesas Variáveis” (veio “${tipoTxt}”)` };
  }

  let forma: FormaPagamento | null = null;
  const formaTxt = txt(r.forma);
  if (formaTxt) {
    forma = FORMA_POR_CHAVE[chave(formaTxt)] ?? null;
    if (!forma) return { erro: `Forma de pagamento “${formaTxt}” não reconhecida` };
  }

  let cartaoId: number | null = null;
  const cartaoTxt = txt(r.cartao);
  if (cartaoTxt) {
    const c = l.cartoes.find((x) => chave(x.nome) === chave(cartaoTxt));
    if (!c) return { erro: `Cartão “${cartaoTxt}” não cadastrado` };
    cartaoId = c.id;
  }
  if (exigeCartao(forma) && !cartaoId) return { erro: "Informe o cartão (forma de pagamento é cartão)" };
  if (!exigeCartao(forma)) cartaoId = null;

  const venc: string | null = dataComp;
  let pago: string | null = null;
  if (txt(r.pagoEm)) {
    pago = parseDataFlex(r.pagoEm);
    if (!pago) return { erro: "Pagamento inválido" };
  }

  // Situação (opcional): Pago ou A pagar. Pagamento preenchido já é Pago; "Pago" sem data usa o vencimento (ou a data do gasto).
  const sitTxt = txt(r.situacao);
  if (sitTxt) {
    const k = chave(sitTxt);
    const ehPago = k.startsWith("pag");
    const ehAPagar = k.startsWith("a pagar") || k.startsWith("a vencer") || k.startsWith("pend") || k.startsWith("venc");
    if (!ehPago && !ehAPagar) return { erro: `Situação deve ser “Pago” ou “A pagar” (veio “${sitTxt}”)` };
    if (ehAPagar && pago) return { erro: "Situação “A pagar”, mas o Pagamento está preenchido" };
    if (ehPago && !pago) pago = venc ?? dataComp;
  }

  let repetir = 1;
  if (txt(r.repetir)) {
    const n = Number(String(r.repetir).replace(",", "."));
    if (!Number.isInteger(n) || n < 1 || n > MAX_REPETIR) return { erro: `Repetir (meses) deve ser um número de 1 a ${MAX_REPETIR}` };
    repetir = n;
  }

  // Quem gastou: só colaborador cadastrado e ativo (o nome é padronizado como está no cadastro)
  let gastoPorNome = txt(r.quemGastou);
  let gastoPorColaboradorId: number | null = null;
  if (gastoPorNome && l.colaboradores) {
    const c = l.colaboradores.find((x) => chave(x.nome) === chave(gastoPorNome));
    if (!c) return { erro: `Colaborador “${gastoPorNome}” não cadastrado (ou inativo). Escolha da lista.` };
    gastoPorNome = c.nome; gastoPorColaboradorId = c.id;
  }

  // Centro de custo (opcional na planilha; se vazio, o responsável escolhe na conferência)
  let centroCusto: string | null = null;
  const centroTxt = txt(r.centroCusto);
  if (centroTxt) {
    const k = chave(centroTxt);
    if (k.startsWith("fin") || k.startsWith("adm")) centroCusto = "Financeiro/Administrativo";
    else if (k.startsWith("prod")) centroCusto = "Produção";
    else if (k.startsWith("log")) centroCusto = "Logístico";
    else return { erro: `Centro de Custo deve ser “Financeiro/Administrativo”, “Produção” ou “Logístico” (veio “${centroTxt}”)` };
  }

  // Custo Direto ou Custo Indireto (opcional)
  let tipoCusto: string | null = null;
  const custoTxt = txt(r.tipoCusto);
  if (custoTxt) {
    const k = chave(custoTxt);
    if (k.includes("indir")) tipoCusto = "indireto"; // testar "indir" antes: "indireto" também contém "dir"
    else if (k.includes("dir")) tipoCusto = "direto";
    else return { erro: `Custo deve ser “Custo Direto” ou “Custo Indireto” (veio “${custoTxt}”)` };
  }

  const base = {
    plantaId: planta ? planta.id : null, categoriaId: cat.id, tipo, descricao, favorecido: txt(r.favorecido), valor,
    formaPagamento: forma, cartaoId, gastoPorNome, gastoPorColaboradorId, observacoes: txt(r.observacoes), centroCusto, tipoCusto,
  };
  const itens: LancamentoPronto[] = [];
  for (let k = 0; k < repetir; k++) {
    const dc = somarMeses(dataComp, k);
    const primeiro = k === 0;
    itens.push({
      ...base, linha: r.linha, dataCompetencia: dc,
      dataVencimento: dc,
      dataPagamento: primeiro ? pago : null,
      status: primeiro && pago ? "pago" : "pendente",
      nfNumero: primeiro ? txt(r.nfNumero) : null,
    });
  }
  return { itens };
}

/** Hash por lançamento. Linhas idênticas dentro do mesmo arquivo recebem sequência (#1, #2...), então todas entram;
 *  reimportar o mesmo arquivo gera os mesmos hashes e nada duplica. */
export function atribuirHashes(itens: LancamentoPronto[]): (LancamentoPronto & { hash: string })[] {
  const vistos = new Map<string, number>();
  return itens.map((i) => {
    const base = hashImportacao({ data: i.dataCompetencia, valor: i.valor, descricao: i.descricao, plantaId: i.plantaId });
    const n = vistos.get(base) ?? 0;
    vistos.set(base, n + 1);
    const hash = n === 0 ? base : hashImportacao({ data: i.dataCompetencia, valor: i.valor, descricao: `${i.descricao} #${n + 1}`, plantaId: i.plantaId });
    return { ...i, hash };
  });
}
