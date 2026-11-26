// DANFE (retrato, A4) gerado no navegador a partir do XML da NF-e, com jsPDF (já usado no projeto).
// A SEFAZ não fornece o PDF: o DANFE é sempre montado a partir do XML, que é o documento fiscal válido.
import { jsPDF } from "jspdf";

// ── Código de barras CODE-128C (só dígitos, pares) ──────────────────────────
export const CODE128 = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
  "114131", "311141", "411131", "211412", "211214", "211232",
];
const STOP = "2331112";

/** Sequência de larguras (barra, espaço, barra...) do CODE-128C para uma string de dígitos de tamanho par. */
export function code128C(digitos: string): string {
  if (!/^(\d\d)+$/.test(digitos)) throw new Error("CODE-128C exige quantidade par de dígitos");
  const valores = [105];
  for (let i = 0; i < digitos.length; i += 2) valores.push(Number(digitos.slice(i, i + 2)));
  const soma = valores.reduce((s, v, i) => s + v * (i === 0 ? 1 : i), 0);
  valores.push(soma % 103);
  return valores.map((v) => CODE128[v]).join("") + STOP;
}

function desenharBarras(doc: jsPDF, digitos: string, x: number, y: number, w: number, h: number) {
  const larguras = code128C(digitos);
  const total = larguras.split("").reduce((s, c) => s + Number(c), 0);
  const m = w / total;
  let cx = x;
  doc.setFillColor(0, 0, 0);
  larguras.split("").forEach((c, i) => {
    const lw = Number(c) * m;
    if (i % 2 === 0) doc.rect(cx, y, lw, h, "F");
    cx += lw;
  });
}

// ── Leitura do XML ──────────────────────────────────────────────────────────
type El = Element | null | undefined;
const filho = (el: El, nome: string): Element | null => {
  if (!el) return null;
  for (const c of Array.from(el.children)) if (c.localName === nome) return c;
  return null;
};
const caminho = (el: El, p: string): Element | null => p.split("/").reduce<Element | null>((a, n) => filho(a, n), (el ?? null) as Element | null);
const v = (el: El, p: string) => caminho(el, p)?.textContent?.trim() ?? "";
const filhos = (el: El, nome: string) => (el ? Array.from(el.children).filter((c) => c.localName === nome) : []);

const n2 = (s: string, casas = 2) => (s === "" ? "" : Number(s).toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas }));
const qtd = (s: string) => (s === "" ? "" : Number(s).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 4 }));
const cnpjCpf = (s: string) => s.length === 14 ? s.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")
  : s.length === 11 ? s.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4") : s;
const cep = (s: string) => s.replace(/^(\d{5})(\d{3})$/, "$1-$2");
const dataBR = (s: string) => (s ? s.slice(0, 10).split("-").reverse().join("/") : "");
const horaBR = (s: string) => (s && s.length > 16 ? s.slice(11, 19) : "");
const fone = (s: string) => s.replace(/^(\d{2})(\d{4,5})(\d{4})$/, "($1) $2-$3");
const MOD_FRETE: Record<string, string> = { "0": "0-Emitente", "1": "1-Destinatário", "2": "2-Terceiros", "3": "3-Próprio Remet.", "4": "4-Próprio Dest.", "9": "9-Sem Frete" };

/** Gera o PDF do DANFE e devolve o jsPDF (o chamador decide salvar ou abrir). */
export function gerarDanfe(xml: string): jsPDF {
  const docXml = new DOMParser().parseFromString(xml, "application/xml");
  if (docXml.getElementsByTagName("parsererror").length) throw new Error("XML inválido");
  const inf = Array.from(docXml.getElementsByTagName("*")).find((e) => e.localName === "infNFe") ?? null;
  if (!inf) throw new Error("XML sem infNFe (talvez seja só o resumo da nota)");
  const prot = Array.from(docXml.getElementsByTagName("*")).find((e) => e.localName === "infProt") ?? null;
  const chave = (inf.getAttribute("Id") ?? "").replace(/^NFe/, "");
  const ide = filho(inf, "ide"), emit = filho(inf, "emit"), dest = filho(inf, "dest");
  const ender = filho(emit, "enderEmit"), endD = filho(dest, "enderDest");
  const tot = caminho(inf, "total/ICMSTot"), transp = filho(inf, "transp");
  const dets = filhos(inf, "det");

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const M = 5, W = 200; // margem e largura útil
  doc.setLineWidth(0.2);

  const campo = (x: number, y: number, w: number, h: number, rotulo: string, valor: string, opt: { alinhar?: "left" | "right" | "center"; tam?: number; negrito?: boolean } = {}) => {
    doc.rect(x, y, w, h);
    doc.setFont("helvetica", "normal"); doc.setFontSize(5); doc.text(rotulo.toUpperCase(), x + 0.8, y + 2);
    doc.setFont("helvetica", opt.negrito ? "bold" : "normal"); doc.setFontSize(opt.tam ?? 7.5);
    const linhas = doc.splitTextToSize(valor ?? "", w - 1.6) as string[];
    const al = opt.alinhar ?? "left";
    const tx = al === "right" ? x + w - 0.8 : al === "center" ? x + w / 2 : x + 0.8;
    doc.text(linhas.slice(0, Math.max(1, Math.floor((h - 2.5) / 3))), tx, y + 5, { align: al });
  };
  const secao = (y: number, t: string) => { doc.setFont("helvetica", "bold"); doc.setFontSize(6); doc.text(t, M, y + 2.2); return y + 3; };

  const numero = v(ide, "nNF").padStart(9, "0").replace(/^(\d{3})(\d{3})(\d{3})$/, "$1.$2.$3");
  const serie = v(ide, "serie").padStart(3, "0");

  // Cabeçalho (emitente, DANFE, chave) — repetido em todas as folhas
  const cabecalho = (y: number, folha: number, totalFolhas: number) => {
    // emitente
    doc.rect(M, y, 80, 32);
    doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
    doc.text(doc.splitTextToSize(v(emit, "xNome"), 76) as string[], M + 40, y + 6, { align: "center" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(6.5);
    const end = [`${v(ender, "xLgr")}, ${v(ender, "nro")}${v(ender, "xCpl") ? " " + v(ender, "xCpl") : ""}`, `${v(ender, "xBairro")} - ${cep(v(ender, "CEP"))}`,
      `${v(ender, "xMun")} - ${v(ender, "UF")}${v(ender, "fone") ? "  Fone: " + fone(v(ender, "fone")) : ""}`];
    doc.text(end, M + 40, y + 17, { align: "center" });
    // DANFE
    doc.rect(M + 80, y, 35, 32);
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.text("DANFE", M + 97.5, y + 5, { align: "center" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(5.5);
    doc.text(["Documento Auxiliar da", "Nota Fiscal Eletrônica"], M + 97.5, y + 8, { align: "center" });
    doc.setFontSize(6.5); doc.text(["0 - ENTRADA", "1 - SAÍDA"], M + 83, y + 15);
    doc.rect(M + 104, y + 12.5, 6, 5); doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.text(v(ide, "tpNF"), M + 107, y + 16.4, { align: "center" });
    doc.setFontSize(8); doc.text(`Nº ${numero}`, M + 97.5, y + 23, { align: "center" }); doc.text(`SÉRIE ${serie}`, M + 97.5, y + 26.5, { align: "center" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.text(`Folha ${folha}/${totalFolhas}`, M + 97.5, y + 30, { align: "center" });
    // chave
    doc.rect(M + 115, y, 85, 32);
    if (/^\d{44}$/.test(chave)) desenharBarras(doc, chave, M + 119, y + 2, 77, 10);
    doc.rect(M + 115, y + 13, 85, 8);
    doc.setFontSize(5); doc.text("CHAVE DE ACESSO", M + 116, y + 15);
    doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.text(chave.replace(/(\d{4})(?=\d)/g, "$1 "), M + 157.5, y + 19.5, { align: "center" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(6.5);
    doc.text(["Consulta de autenticidade no portal nacional da NF-e", "www.nfe.fazenda.gov.br/portal ou no site da Sefaz Autorizadora"], M + 157.5, y + 25, { align: "center" });
    y += 32;
    campo(M, y, 115, 7, "Natureza da operação", v(ide, "natOp"));
    campo(M + 115, y, 85, 7, "Protocolo de autorização de uso", prot ? `${v(prot, "nProt")} - ${dataBR(v(prot, "dhRecbto"))} ${horaBR(v(prot, "dhRecbto"))}` : "", { alinhar: "center" });
    y += 7;
    campo(M, y, 67, 7, "Inscrição estadual", v(emit, "IE"));
    campo(M + 67, y, 67, 7, "Insc. estadual do subst. trib.", v(emit, "IEST"));
    campo(M + 134, y, 66, 7, "CNPJ / CPF", cnpjCpf(v(emit, "CNPJ") || v(emit, "CPF")));
    return y + 7;
  };

  // Folha 1: canhoto
  let y = M;
  doc.rect(M, y, 160, 8); doc.rect(M + 160, y, 40, 17);
  doc.setFontSize(5.5);
  doc.text(doc.splitTextToSize(`RECEBEMOS DE ${v(emit, "xNome")} OS PRODUTOS E/OU SERVIÇOS CONSTANTES DA NOTA FISCAL ELETRÔNICA INDICADA AO LADO. EMISSÃO: ${dataBR(v(ide, "dhEmi") || v(ide, "dEmi"))} VALOR TOTAL: R$ ${n2(v(tot, "vNF"))} DESTINATÁRIO: ${v(dest, "xNome")}`, 157) as string[], M + 1, y + 2.5);
  campo(M, y + 8, 40, 9, "Data de recebimento", "");
  campo(M + 40, y + 8, 120, 9, "Identificação e assinatura do recebedor", "");
  doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.text("NF-e", M + 180, y + 5, { align: "center" });
  doc.setFontSize(8); doc.text(`Nº ${numero}`, M + 180, y + 10, { align: "center" }); doc.text(`SÉRIE ${serie}`, M + 180, y + 14, { align: "center" });
  doc.setLineDashPattern([1, 1], 0); doc.line(M, y + 19, M + W, y + 19); doc.setLineDashPattern([], 0);
  y += 21;

  // Paginação dos produtos: calcula as linhas antes para saber o total de folhas
  doc.setFontSize(6);
  const colunas = [
    { t: "Código", w: 16 }, { t: "Descrição do produto / serviço", w: 54 }, { t: "NCM/SH", w: 12 }, { t: "CST", w: 7 }, { t: "CFOP", w: 8 },
    { t: "Un", w: 8 }, { t: "Quant.", w: 14, r: true }, { t: "Valor unit.", w: 15, r: true }, { t: "Valor total", w: 16, r: true },
    { t: "BC ICMS", w: 14, r: true }, { t: "Valor ICMS", w: 12, r: true }, { t: "Valor IPI", w: 10, r: true }, { t: "Alíq. ICMS", w: 7, r: true }, { t: "Alíq. IPI", w: 7, r: true },
  ];
  const linhasProd = dets.map((d) => {
    const prod = filho(d, "prod"), imp = filho(d, "imposto");
    const icms = filho(filho(imp, "ICMS"), Array.from(filho(imp, "ICMS")?.children ?? [])[0]?.localName ?? "");
    const ipi = caminho(imp, "IPI/IPITrib");
    const cst = v(icms, "orig") + (v(icms, "CST") || v(icms, "CSOSN"));
    const desc = v(prod, "xProd") + (v(d, "infAdProd") ? ` ${v(d, "infAdProd")}` : "");
    const valores = [v(prod, "cProd"), desc, v(prod, "NCM"), cst, v(prod, "CFOP"), v(prod, "uCom"), qtd(v(prod, "qCom")),
      n2(v(prod, "vUnCom"), 4).replace(/0{1,2}$/, ""), n2(v(prod, "vProd")), n2(v(icms, "vBC")), n2(v(icms, "vICMS")), n2(v(ipi, "vIPI")), n2(v(icms, "pICMS")), n2(v(ipi, "pIPI"))];
    const quebrado = valores.map((s, i) => doc.splitTextToSize(s ?? "", colunas[i].w - 1) as string[]);
    const h = Math.max(...quebrado.map((l) => l.length)) * 2.5 + 1;
    return { quebrado, h };
  });

  const ALTURA_ADICIONAIS = 30;
  // alturas fixas: cabeçalho 46 mm; destinatário+fatura+imposto+transporte 75 mm; título e cabeçalho da tabela 8 mm
  const fimPagina = 297 - M;
  const folhas: (typeof linhasProd)[] = [[]];
  let disponivel = (fimPagina - ALTURA_ADICIONAIS - 3) - (y + 46 + 75 + 8);
  for (const l of linhasProd) {
    if (l.h > disponivel && folhas[folhas.length - 1].length) { folhas.push([]); disponivel = fimPagina - (M + 46 + 8); }
    folhas[folhas.length - 1].push(l);
    disponivel -= l.h;
  }

  y = cabecalho(y, 1, folhas.length);

  // Destinatário
  y = secao(y, "DESTINATÁRIO / REMETENTE");
  campo(M, y, 120, 7, "Nome / razão social", v(dest, "xNome"));
  campo(M + 120, y, 50, 7, "CNPJ / CPF", cnpjCpf(v(dest, "CNPJ") || v(dest, "CPF")));
  campo(M + 170, y, 30, 7, "Data da emissão", dataBR(v(ide, "dhEmi") || v(ide, "dEmi")), { alinhar: "center" }); y += 7;
  campo(M, y, 100, 7, "Endereço", `${v(endD, "xLgr")}, ${v(endD, "nro")}${v(endD, "xCpl") ? " " + v(endD, "xCpl") : ""}`);
  campo(M + 100, y, 45, 7, "Bairro / distrito", v(endD, "xBairro"));
  campo(M + 145, y, 25, 7, "CEP", cep(v(endD, "CEP")), { alinhar: "center" });
  campo(M + 170, y, 30, 7, "Data da saída/entrada", dataBR(v(ide, "dhSaiEnt")), { alinhar: "center" }); y += 7;
  campo(M, y, 80, 7, "Município", v(endD, "xMun"));
  campo(M + 80, y, 35, 7, "Fone / fax", fone(v(endD, "fone")));
  campo(M + 115, y, 10, 7, "UF", v(endD, "UF"), { alinhar: "center" });
  campo(M + 125, y, 45, 7, "Inscrição estadual", v(dest, "IE"));
  campo(M + 170, y, 30, 7, "Hora da saída/entrada", horaBR(v(ide, "dhSaiEnt")), { alinhar: "center" }); y += 7;

  // Fatura / duplicatas
  y = secao(y, "FATURA / DUPLICATAS");
  const dups = filhos(caminho(inf, "cobr"), "dup");
  const txtDup = dups.length
    ? dups.map((d) => `${v(d, "nDup")}  ${dataBR(v(d, "dVenc"))}  R$ ${n2(v(d, "vDup"))}`).join("     ")
    : (filhos(caminho(inf, "pag"), "detPag").some((p) => v(p, "tPag") === "01") ? "PAGAMENTO À VISTA" : "");
  campo(M, y, W, 7, "", txtDup, { tam: 6.5 }); y += 7;

  // Cálculo do imposto
  y = secao(y, "CÁLCULO DO IMPOSTO");
  const c1 = [["Base de cálc. do ICMS", "vBC"], ["Valor do ICMS", "vICMS"], ["Base de cálc. ICMS S.T.", "vBCST"], ["Valor do ICMS subst.", "vST"], ["V. imp. importação", "vII"], ["V. total produtos", "vProd"]];
  const c2 = [["Valor do frete", "vFrete"], ["Valor do seguro", "vSeg"], ["Desconto", "vDesc"], ["Outras desp. acess.", "vOutro"], ["Valor total do IPI", "vIPI"], ["V. total da nota", "vNF"]];
  const wc = W / 6;
  c1.forEach(([r, k], i) => campo(M + i * wc, y, wc, 7, r, n2(v(tot, k) || "0"), { alinhar: "right" })); y += 7;
  c2.forEach(([r, k], i) => campo(M + i * wc, y, wc, 7, r, n2(v(tot, k) || "0"), { alinhar: "right", negrito: k === "vNF" })); y += 7;

  // Transportador
  y = secao(y, "TRANSPORTADOR / VOLUMES TRANSPORTADOS");
  const tr = filho(transp, "transporta"), veic = filho(transp, "veicTransp"), vol = filho(transp, "vol");
  campo(M, y, 70, 7, "Nome / razão social", v(tr, "xNome"));
  campo(M + 70, y, 28, 7, "Frete por conta", MOD_FRETE[v(transp, "modFrete")] ?? v(transp, "modFrete"));
  campo(M + 98, y, 20, 7, "Código ANTT", v(veic, "RNTC"));
  campo(M + 118, y, 22, 7, "Placa do veículo", v(veic, "placa"));
  campo(M + 140, y, 10, 7, "UF", v(veic, "UF"), { alinhar: "center" });
  campo(M + 150, y, 50, 7, "CNPJ / CPF", cnpjCpf(v(tr, "CNPJ") || v(tr, "CPF"))); y += 7;
  campo(M, y, 80, 7, "Endereço", v(tr, "xEnder"));
  campo(M + 80, y, 50, 7, "Município", v(tr, "xMun"));
  campo(M + 130, y, 10, 7, "UF", v(tr, "UF"), { alinhar: "center" });
  campo(M + 140, y, 60, 7, "Inscrição estadual", v(tr, "IE")); y += 7;
  const wv = W / 6;
  [["Quantidade", qtd(v(vol, "qVol"))], ["Espécie", v(vol, "esp")], ["Marca", v(vol, "marca")], ["Numeração", v(vol, "nVol")],
    ["Peso bruto", v(vol, "pesoB") ? n2(v(vol, "pesoB"), 3) : ""], ["Peso líquido", v(vol, "pesoL") ? n2(v(vol, "pesoL"), 3) : ""]]
    .forEach(([r, val], i) => campo(M + i * wv, y, wv, 7, r, val, { alinhar: i >= 4 ? "right" : "left" }));
  y += 7;

  // Produtos
  const tabela = (yIni: number, linhas: typeof linhasProd, yFim: number) => {
    let yy = secao(yIni, "DADOS DOS PRODUTOS / SERVIÇOS");
    let x = M;
    doc.setFont("helvetica", "normal"); doc.setFontSize(5);
    for (const c of colunas) { doc.rect(x, yy, c.w, 5); doc.text(doc.splitTextToSize(c.t.toUpperCase(), c.w - 1) as string[], x + c.w / 2, yy + 2, { align: "center" }); x += c.w; }
    yy += 5;
    const topo = yy;
    doc.setFontSize(6);
    for (const l of linhas) {
      x = M;
      l.quebrado.forEach((txt, i) => {
        const c = colunas[i] as any;
        doc.text(txt, c.r ? x + c.w - 0.6 : x + 0.6, yy + 2.3, { align: c.r ? "right" : "left" });
        x += c.w;
      });
      yy += l.h;
      doc.setDrawColor(200); doc.line(M, yy, M + W, yy); doc.setDrawColor(0);
    }
    // linhas verticais até o fim da área da tabela
    x = M;
    for (const c of colunas) { doc.line(x, topo, x, yFim); x += c.w; }
    doc.line(M + W, topo, M + W, yFim); doc.line(M, yFim, M + W, yFim);
  };

  const fimTabela1 = fimPagina - ALTURA_ADICIONAIS - 3;
  tabela(y, folhas[0], fimTabela1);

  // Dados adicionais (folha 1)
  let ya = secao(fimTabela1, "DADOS ADICIONAIS");
  const infCpl = [v(caminho(inf, "infAdic"), "infCpl"), v(caminho(inf, "infAdic"), "infAdFisco")].filter(Boolean).join(" ");
  doc.rect(M, ya, 130, ALTURA_ADICIONAIS - 3); doc.rect(M + 130, ya, 70, ALTURA_ADICIONAIS - 3);
  doc.setFontSize(5); doc.text("INFORMAÇÕES COMPLEMENTARES", M + 0.8, ya + 2); doc.text("RESERVADO AO FISCO", M + 130.8, ya + 2);
  doc.setFontSize(6); doc.text((doc.splitTextToSize(infCpl, 128) as string[]).slice(0, 9), M + 0.8, ya + 4.5);

  // Folhas seguintes
  for (let f = 1; f < folhas.length; f++) {
    doc.addPage();
    const yc = cabecalho(M, f + 1, folhas.length);
    tabela(yc, folhas[f], fimPagina);
  }
  return doc;
}
