// Leitura dos documentos que a SEFAZ distribui (resumo, XML completo, eventos) e dos XMLs importados à mão.
import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", removeNSPrefix: true, parseTagValue: false, trimValues: true });
export const lerXml = (xml: string): any => parser.parse(xml);

const arr = <T,>(v: T | T[] | undefined | null): T[] => (v == null ? [] : Array.isArray(v) ? v : [v]);
const num = (v: any) => { const n = Number(String(v ?? "").replace(",", ".")); return Number.isFinite(n) ? n : 0; };
const txt = (v: any) => (v == null ? null : typeof v === "object" ? (v["#text"] != null ? String(v["#text"]) : null) : String(v));
/** "2026-11-19T10:22:33-03:00" → "2026-11-19 10:22:33" (horário local da nota, sem conversão de fuso). */
export const dataLocal = (v: any): string | null => {
  const s = txt(v);
  if (!s) return null;
  const m = s.match(/^(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2}:\d{2}))?/);
  return m ? `${m[1]} ${m[2] ?? "00:00:00"}` : null;
};

export type NotaExtraida = {
  chave: string; emitenteCnpj: string | null; emitenteNome: string | null; emitenteIe: string | null;
  destCnpj: string | null; numero: string | null; serie: string | null; dataEmissao: string | null;
  valorTotal: number; situacao: "autorizada" | "cancelada" | "denegada"; protocolo: string | null; natureza: string | null;
};

export type DocLido =
  | { tipo: "resumo"; nota: NotaExtraida }
  | { tipo: "completa"; nota: NotaExtraida }
  | { tipo: "evento"; chave: string; tpEvento: string; descricao: string | null; data: string | null }
  | { tipo: "outro"; motivo: string };

const SIT_RESUMO: Record<string, NotaExtraida["situacao"]> = { "1": "autorizada", "2": "denegada", "3": "cancelada" };

/** XML completo (nfeProc ou NFe solta). */
export function extrairCompleta(p: any): NotaExtraida | null {
  const proc = p.nfeProc ?? null;
  const nfe = proc?.NFe ?? p.NFe ?? null;
  const inf = nfe?.infNFe;
  if (!inf) return null;
  const chave = String(inf["@_Id"] ?? "").replace(/^NFe/, "") || txt(proc?.protNFe?.infProt?.chNFe) || "";
  if (!/^\d{44}$/.test(chave)) return null;
  const ide = inf.ide ?? {}, emit = inf.emit ?? {}, dest = inf.dest ?? {};
  const cStatProt = txt(proc?.protNFe?.infProt?.cStat);
  return {
    chave,
    emitenteCnpj: txt(emit.CNPJ) ?? txt(emit.CPF), emitenteNome: txt(emit.xNome), emitenteIe: txt(emit.IE),
    destCnpj: txt(dest.CNPJ) ?? txt(dest.CPF),
    numero: txt(ide.nNF), serie: txt(ide.serie), dataEmissao: dataLocal(ide.dhEmi ?? ide.dEmi),
    valorTotal: num(inf.total?.ICMSTot?.vNF),
    situacao: cStatProt && ["110", "301", "302", "303"].includes(cStatProt) ? "denegada" : "autorizada",
    protocolo: txt(proc?.protNFe?.infProt?.nProt), natureza: txt(ide.natOp),
  };
}

/** Lê um documento distribuído pela SEFAZ (já descompactado). */
export function lerDocumento(xml: string): DocLido {
  let p: any;
  try { p = lerXml(xml); } catch { return { tipo: "outro", motivo: "XML inválido" }; }
  if (p.resNFe) {
    const r = p.resNFe;
    const chave = txt(r.chNFe) ?? "";
    if (!/^\d{44}$/.test(chave)) return { tipo: "outro", motivo: "resumo sem chave" };
    return {
      tipo: "resumo",
      nota: {
        chave, emitenteCnpj: txt(r.CNPJ) ?? txt(r.CPF), emitenteNome: txt(r.xNome), emitenteIe: txt(r.IE), destCnpj: null,
        // número e série estão dentro da chave (posições 26-34 e 23-25)
        numero: String(Number(chave.slice(25, 34))), serie: String(Number(chave.slice(22, 25))),
        dataEmissao: dataLocal(r.dhEmi), valorTotal: num(r.vNF),
        situacao: SIT_RESUMO[String(txt(r.cSitNFe) ?? "1")] ?? "autorizada", protocolo: txt(r.nProt), natureza: null,
      },
    };
  }
  if (p.nfeProc || p.NFe) {
    const nota = extrairCompleta(p);
    return nota ? { tipo: "completa", nota } : { tipo: "outro", motivo: "NF-e sem chave" };
  }
  const ev = p.resEvento ?? p.procEventoNFe?.evento?.infEvento ?? null;
  if (ev) {
    return {
      tipo: "evento", chave: txt(ev.chNFe) ?? "", tpEvento: txt(ev.tpEvento) ?? "",
      descricao: txt(ev.xEvento) ?? txt(ev.detEvento?.descEvento), data: dataLocal(ev.dhEvento),
    };
  }
  return { tipo: "outro", motivo: `documento não tratado (${Object.keys(p).filter((k) => k !== "?xml")[0] ?? "?"})` };
}

/** Itens, impostos e dados extras da nota, para a tela de detalhe e o DANFE. */
export function detalharCompleta(xml: string) {
  const p = lerXml(xml);
  const inf = (p.nfeProc?.NFe ?? p.NFe)?.infNFe ?? {};
  const t = inf.total?.ICMSTot ?? {};
  return {
    itens: arr(inf.det).map((d: any) => ({
      item: Number(d["@_nItem"] ?? 0), codigo: txt(d.prod?.cProd), descricao: txt(d.prod?.xProd), ncm: txt(d.prod?.NCM),
      cfop: txt(d.prod?.CFOP), unidade: txt(d.prod?.uCom), quantidade: num(d.prod?.qCom), valorUnitario: num(d.prod?.vUnCom),
      valorTotal: num(d.prod?.vProd),
    })),
    totais: {
      produtos: num(t.vProd), frete: num(t.vFrete), seguro: num(t.vSeg), desconto: num(t.vDesc), outros: num(t.vOutro),
      icms: num(t.vICMS), icmsSt: num(t.vST), ipi: num(t.vIPI), nota: num(t.vNF),
    },
    pagamentos: arr(inf.pag?.detPag).map((x: any) => ({ forma: txt(x.tPag), valor: num(x.vPag) })),
    duplicatas: arr(inf.cobr?.dup).map((x: any) => ({ numero: txt(x.nDup), vencimento: txt(x.dVenc), valor: num(x.vDup) })),
    informacoes: txt(inf.infAdic?.infCpl),
  };
}
