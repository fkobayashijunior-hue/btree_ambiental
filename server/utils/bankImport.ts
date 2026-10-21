// Importação de extratos de OUTRAS contas/cartões (OFX ou CSV) para o Dashboard Financeiro Real.
// Funções puras: recebem o texto do arquivo e devolvem transações normalizadas.
import { createHash } from "crypto";

export type TransacaoImportada = {
  /** YYYY-MM-DD */
  data: string;
  descricao: string;
  /** assinado: negativo = saída, positivo = entrada */
  valor: number;
  documento: string | null;
  /** identidade estável da linha (evita duplicar ao reimportar o mesmo arquivo) */
  hash: string;
};

export type ResultadoParse = { transacoes: TransacaoImportada[]; formato: "ofx" | "csv"; avisos: string[] };

function semAcento(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function normalizaDescricao(s: string): string {
  return semAcento(s).toUpperCase().replace(/\s+/g, " ").trim();
}

/** Atribui hash estável; linhas idênticas no mesmo dia recebem sequência (1ª, 2ª...) para não colidirem. */
function comHash(base: Omit<TransacaoImportada, "hash">[]): TransacaoImportada[] {
  const vistos = new Map<string, number>();
  return base.map(t => {
    const chave = `${t.data}|${t.valor.toFixed(2)}|${normalizaDescricao(t.descricao)}|${t.documento ?? ""}`;
    const n = (vistos.get(chave) ?? 0) + 1;
    vistos.set(chave, n);
    return { ...t, hash: createHash("sha1").update(`${chave}|${n}`).digest("hex") };
  });
}

export function parseValorBR(raw: string): number | null {
  let s = raw.trim();
  if (!s) return null;
  let negativo = false;
  if (/^\(.*\)$/.test(s)) { negativo = true; s = s.slice(1, -1); }
  if (/[dD]$/.test(s)) { negativo = true; s = s.slice(0, -1); }
  else if (/[cC]$/.test(s)) { s = s.slice(0, -1); }
  if (s.trim().endsWith("-")) { negativo = true; s = s.trim().slice(0, -1); }
  s = s.replace(/R\$/gi, "").replace(/\s/g, "");
  if (s.startsWith("-")) { negativo = !negativo ? true : negativo; s = s.slice(1); }
  if (s.startsWith("+")) s = s.slice(1);
  if (s.includes(",") && s.includes(".")) {
    // o separador decimal é o que aparece por último
    s = s.lastIndexOf(",") > s.lastIndexOf(".") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (s.includes(",")) {
    s = s.replace(",", ".");
  }
  const n = parseFloat(s);
  if (!Number.isFinite(n)) return null;
  return negativo ? -Math.abs(n) : n;
}

export function parseDataFlex(raw: string): string | null {
  const s = raw.trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{2})[\/.-](\d{2})[\/.-](\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  m = s.match(/^(\d{2})[\/.-](\d{2})[\/.-](\d{2})$/);
  if (m) return `20${m[3]}-${m[2]}-${m[1]}`;
  m = s.match(/^(\d{4})(\d{2})(\d{2})/); // OFX: 20260915120000
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return null;
}

export function parseOfx(texto: string): ResultadoParse {
  const avisos: string[] = [];
  const blocos = texto.split(/<STMTTRN>/i).slice(1);
  const base: Omit<TransacaoImportada, "hash">[] = [];
  const tag = (bloco: string, nome: string): string | null => {
    const m = bloco.match(new RegExp(`<${nome}>([^<\\r\\n]*)`, "i"));
    return m ? m[1].trim() : null;
  };
  for (const b of blocos) {
    const data = parseDataFlex(tag(b, "DTPOSTED") ?? "");
    const valor = parseValorBR(tag(b, "TRNAMT") ?? "");
    if (!data || valor === null) { avisos.push("Transação OFX ignorada (data ou valor inválido)."); continue; }
    const nome = tag(b, "NAME");
    const memo = tag(b, "MEMO");
    const descricao = [nome, memo && memo !== nome ? memo : null].filter(Boolean).join(" — ") || "(sem descrição)";
    base.push({ data, descricao, valor, documento: tag(b, "FITID") || tag(b, "CHECKNUM") });
  }
  return { transacoes: comHash(base), formato: "ofx", avisos };
}

function dividirLinhaCsv(linha: string, sep: string): string[] {
  const out: string[] = [];
  let atual = "";
  let aspas = false;
  for (let i = 0; i < linha.length; i++) {
    const ch = linha[i];
    if (ch === '"') {
      if (aspas && linha[i + 1] === '"') { atual += '"'; i++; } else aspas = !aspas;
    } else if (ch === sep && !aspas) {
      out.push(atual); atual = "";
    } else atual += ch;
  }
  out.push(atual);
  return out.map(c => c.trim());
}

export function parseCsv(texto: string): ResultadoParse {
  const avisos: string[] = [];
  const linhas = texto.replace(/^﻿/, "").split(/\r?\n/).filter(l => l.trim() !== "");
  if (linhas.length < 2) return { transacoes: [], formato: "csv", avisos: ["Arquivo CSV sem linhas de dados."] };

  const cont = (c: string) => (linhas[0].match(new RegExp(`\\${c}`, "g")) ?? []).length;
  const sep = [";", "\t", ","].sort((a, b) => cont(b) - cont(a))[0];

  // procura a linha de cabeçalho nas primeiras 15 linhas
  const norm = (s: string) => semAcento(s).toLowerCase().trim();
  let idxCab = -1;
  let cab: string[] = [];
  for (let i = 0; i < Math.min(linhas.length, 15); i++) {
    const cols = dividirLinhaCsv(linhas[i], sep).map(norm);
    if (cols.some(c => c.startsWith("data")) && cols.some(c => /valor|debito|credito|saida|entrada/.test(c))) {
      idxCab = i; cab = cols; break;
    }
  }
  if (idxCab < 0) return { transacoes: [], formato: "csv", avisos: ["Cabeçalho não reconhecido. O CSV precisa ter colunas Data e Valor (ou Débito/Crédito)."] };

  const achar = (re: RegExp) => cab.findIndex(c => re.test(c));
  const iData = achar(/^data/);
  const iDesc = achar(/descri|historico|lancamento|estabelecimento|memo/);
  const iValor = achar(/^valor/);
  const iDeb = achar(/debito|saida/);
  const iCred = achar(/credito|entrada/);
  const iDoc = achar(/documento|^doc|^id$|numero/);

  const base: Omit<TransacaoImportada, "hash">[] = [];
  for (let i = idxCab + 1; i < linhas.length; i++) {
    const cols = dividirLinhaCsv(linhas[i], sep);
    const data = parseDataFlex(cols[iData] ?? "");
    if (!data) continue; // linha de total/saldo/rodapé
    let valor: number | null = null;
    if (iValor >= 0) valor = parseValorBR(cols[iValor] ?? "");
    if (valor === null && (iDeb >= 0 || iCred >= 0)) {
      const d = iDeb >= 0 ? parseValorBR(cols[iDeb] ?? "") : null;
      const c = iCred >= 0 ? parseValorBR(cols[iCred] ?? "") : null;
      if (d) valor = -Math.abs(d); else if (c) valor = Math.abs(c);
    }
    if (valor === null || valor === 0) continue;
    base.push({
      data, valor,
      descricao: (iDesc >= 0 ? cols[iDesc] : "") || "(sem descrição)",
      documento: iDoc >= 0 ? (cols[iDoc] || null) : null,
    });
  }
  if (base.length === 0) avisos.push("Nenhuma transação válida encontrada no CSV.");
  return { transacoes: comHash(base), formato: "csv", avisos };
}

export function parseExtrato(texto: string, nomeArquivo?: string): ResultadoParse {
  const ehOfx = /<OFX>|<STMTTRN>/i.test(texto) || /\.ofx$/i.test(nomeArquivo ?? "");
  return ehOfx ? parseOfx(texto) : parseCsv(texto);
}
