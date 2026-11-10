// @ts-nocheck
// Modelo de planilha para importar custos: abas "Lançamentos" (com listas suspensas), "Instruções" e "Listas".
// As colunas seguem a tabela de Custos. Títulos antigos (Planta, Tipo de gasto, Pago em, Observações...) continuam sendo lidos.
export const COLUNAS_MODELO = [
  { header: "Data de Vencimento", width: 18, campo: "vencimento" },
  { header: "Pagamento", width: 14, campo: "pagoEm" },
  { header: "Descrição", width: 38, campo: "descricao" },
  { header: "Complemento", width: 30, campo: "observacoes" },
  { header: "Nº Documento", width: 16, campo: "nfNumero" },
  { header: "Grupo", width: 20, campo: "tipo" },
  { header: "Centro de Custo", width: 26, campo: "centroCusto" },
  { header: "Categoria", width: 22, campo: "categoria" },
  { header: "Custo", width: 18, campo: "tipoCusto" },
  { header: "Local", width: 24, campo: "planta" },
  { header: "Quem gastou", width: 20, campo: "quemGastou" },
  { header: "Como pagou", width: 20, campo: "forma" },
  { header: "Cartão", width: 20, campo: "cartao" },
  { header: "Valor", width: 14, campo: "valor" },
  { header: "Situação", width: 14, campo: "situacao" },
  { header: "Repetir (meses)", width: 14, campo: "repetir" },
  { header: "Favorecido", width: 24, campo: "favorecido" },
] as const;

const simplif = (s: unknown) => String(s ?? "").normalize("NFKD").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
const ALIAS: Record<string, string> = {
  data: "data", vencimento: "vencimento", datadevencimento: "vencimento",
  pagamento: "pagoEm", pagoem: "pagoEm", datadepagamento: "pagoEm",
  descricao: "descricao", complemento: "observacoes", observacoes: "observacoes",
  nodocumento: "nfNumero", numerodocumento: "nfNumero", nodanf: "nfNumero", nf: "nfNumero", numerodanf: "nfNumero",
  grupo: "tipo", fixovariavel: "tipo", tipo: "tipo",
  centrodecusto: "centroCusto", centrocusto: "centroCusto", custo: "tipoCusto", tipocusto: "tipoCusto",
  categoria: "categoria", tipodegasto: "categoria",
  local: "planta", planta: "planta",
  quemgastou: "quemGastou", comopagou: "forma", formadepagamento: "forma", cartao: "cartao",
  valor: "valor", situacao: "situacao", repetirmeses: "repetir", repetir: "repetir", favorecido: "favorecido",
};

/** Descobre a linha de cabeçalho e devolve as linhas (com o número da linha da planilha) prontas para enviar ao servidor. */
export function lerLinhasPlanilha(matriz: any[][]): { linhas: any[]; erro?: string } {
  let cab = -1;
  let mapa: Record<number, string> = {};
  for (let i = 0; i < Math.min(matriz.length, 15); i++) {
    const m: Record<number, string> = {};
    (matriz[i] ?? []).forEach((c, j) => { const k = ALIAS[simplif(c)]; if (k) m[j] = k; });
    if ((Object.values(m).includes("data") || Object.values(m).includes("vencimento")) && Object.values(m).includes("valor") && Object.values(m).includes("descricao")) { cab = i; mapa = m; break; }
  }
  if (cab < 0) return { linhas: [], erro: "Não encontrei o cabeçalho. Use o modelo (colunas Data de Vencimento, Descrição e Valor são obrigatórias)." };
  const linhas: any[] = [];
  for (let i = cab + 1; i < matriz.length; i++) {
    const row = matriz[i] ?? [];
    const obj: any = { linha: i + 1 };
    let algum = false;
    for (const [j, campo] of Object.entries(mapa)) {
      const v = row[Number(j)];
      if (v !== undefined && v !== null && String(v).trim() !== "") { obj[campo] = typeof v === "number" ? v : String(v); algum = true; }
    }
    if (algum) linhas.push(obj);
  }
  return { linhas };
}

export async function baixarModeloCustos(opts: { plantas: string[]; categorias: string[]; cartoes: string[]; formas: string[]; colaboradores?: string[] }) {
  const ExcelJS = await import("exceljs");
  const { saveAs } = await import("file-saver");
  const wb = new ExcelJS.Workbook();
  wb.creator = "BTREE Ambiental";

  const ws = wb.addWorksheet("Lançamentos", { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = COLUNAS_MODELO.map((c) => ({ header: c.header, width: c.width }));
  const cab = ws.getRow(1);
  cab.font = { bold: true, color: { argb: "FFFFFFFF" }, name: "Arial" };
  cab.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF047857" } };
  cab.alignment = { vertical: "middle", wrapText: true };
  cab.height = 28;

  const listas = wb.addWorksheet("Listas", { state: "hidden" });
  const colunasLista = [
    ["Locais", opts.plantas], ["Categorias", opts.categorias], ["Cartões", opts.cartoes],
    ["Como pagou", opts.formas], ["Grupo", ["Despesas Fixas", "Despesas Variáveis"]],
    ["Centro de Custo", ["Financeiro/Administrativo", "Produção", "Logístico"]], ["Colaboradores", opts.colaboradores ?? []],
    ["Situação", ["Pago", "A pagar"]],
    ["Custo", ["Custo Direto", "Custo Indireto"]],
  ] as const;
  colunasLista.forEach(([titulo, itens], c) => {
    listas.getCell(1, c + 1).value = titulo;
    itens.forEach((v, r) => { listas.getCell(r + 2, c + 1).value = v; });
  });
  const faixa = (c: number, n: number) => `Listas!$${String.fromCharCode(65 + c)}$2:$${String.fromCharCode(65 + c)}$${Math.max(2, n + 1)}`;
  const colDe = (campo: string) => COLUNAS_MODELO.findIndex((x) => x.campo === campo) + 1;
  const validacoes: [string, string][] = [
    ["planta", faixa(0, opts.plantas.length)], ["categoria", faixa(1, opts.categorias.length)], ["cartao", faixa(2, opts.cartoes.length)],
    ["forma", faixa(3, opts.formas.length)], ["tipo", faixa(4, 2)], ["centroCusto", faixa(5, 3)], ["quemGastou", faixa(6, (opts.colaboradores ?? []).length)], ["situacao", faixa(7, 2)], ["tipoCusto", faixa(8, 2)],
  ];
  for (let r = 2; r <= 501; r++) {
    for (const [campo, f] of validacoes) {
      ws.getCell(r, colDe(campo)).dataValidation = { type: "list", allowBlank: true, formulae: [f], showErrorMessage: false };
    }
    for (const campo of ["vencimento", "pagoEm"]) ws.getCell(r, colDe(campo)).numFmt = "dd/mm/yyyy";
    ws.getCell(r, colDe("valor")).numFmt = "#,##0.00";
  }

  const ins = wb.addWorksheet("Instruções");
  ins.getColumn(1).width = 26; ins.getColumn(2).width = 90;
  const linhas: [string, string][] = [
    ["COMO PREENCHER", ""],
    ["Uma linha = um gasto", "Preencha a aba “Lançamentos” a partir da linha 2. Não mude os títulos das colunas."],
    ["Obrigatórios", "Data de Vencimento, Descrição, Categoria e Valor. O Local é opcional."],
    ["Data de Vencimento", "É a única data do gasto: vale para o mês em que ele aparece. Para um gasto já pago na hora, use o dia do gasto."],
    ["Categoria, Local, Cartão", "Escolha na lista (setinha da célula). Precisam estar cadastrados no sistema."],
    ["Grupo", "Opcional: Despesas Fixas ou Despesas Variáveis. Se ficar vazio, vale o padrão (“Costuma ser”) da categoria."],
    ["Centro de Custo", "Opcional: Financeiro/Administrativo, Produção ou Logístico. Se ficar vazio, o responsável escolhe na conferência."],
    ["Custo", "Opcional: Custo Direto ou Custo Indireto."],
    ["Complemento", "Texto livre (observações do gasto). Nº Documento é o número da nota fiscal."],
    ["Quem gastou", "Escolha da lista de colaboradores cadastrados. Nome que não esteja na lista dá erro na importação."],
    ["Cartão", "Obrigatório quando “Como pagou” for cartão de crédito ou débito."],
    ["Pagamento", "Se preencher, o gasto entra como PAGO nessa data. Se deixar vazio, entra como A PAGAR (use Data de Vencimento)."],
    ["Situação", "Opcional: Pago ou A pagar. Com o Pagamento preenchido o gasto já é Pago. Se escolher Pago sem data de pagamento, vale a data de vencimento. Aceita também “A vencer” e “Vencido” como A pagar."],
    ["Gastos futuros", "Pode usar datas de meses futuros. Eles aparecem no mês correspondente como “a pagar”."],
    ["Repetir (meses)", "Opcional. Ex.: aluguel com 12 cria 12 lançamentos, um por mês (o 1º conforme as datas da linha, os outros a pagar)."],
    ["Combustível", "Não importe aqui: é lançado no Controle de Abastecimento."],
    ["Reimportar", "Importar o mesmo arquivo de novo não duplica nada, e a importação nunca apaga lançamentos."],
    ["", ""],
    ["EXEMPLO", ""],
    ["Data de Vencimento", "20/12/2026"], ["Descrição", "Conta de energia de dezembro"],
    ["Categoria", opts.categorias[0] ?? "Energia"], ["Centro de Custo", "Financeiro/Administrativo"],
    ["Local", opts.plantas[0] ?? "(seu local)"], ["Valor", "352,00"], ["Repetir (meses)", "12"],
  ];
  linhas.forEach(([a, b], i) => {
    const r = ins.getRow(i + 1);
    r.getCell(1).value = a; r.getCell(2).value = b;
    r.getCell(1).font = { bold: true, name: "Arial" };
    r.getCell(2).alignment = { wrapText: true, vertical: "top" };
  });
  ins.getCell(1, 1).font = { bold: true, size: 14, name: "Arial" };
  ins.getCell(19, 1).font = { bold: true, size: 12, name: "Arial", color: { argb: "FF047857" } };

  const buffer = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "modelo-importacao-custos.xlsx");
}
