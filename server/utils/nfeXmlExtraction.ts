import { XMLParser } from "fast-xml-parser";

/**
 * Extrai número da NF, quantidade e unidade direto do XML oficial da NFe (Nota Fiscal
 * Eletrônica) — muito mais confiável e sem custo que pedir pra uma IA "ler" o PDF/imagem,
 * já que o XML é o documento estruturado original (o PDF/DANFE é só a versão impressa dele).
 */
export function extractNfDataFromXml(xml: string): {
  invoiceNumber: string | null;
  quantity: string | null;
  unit: "ton" | "m3" | null;
} {
  const fallback = { invoiceNumber: null, quantity: null, unit: null } as const;
  try {
    const parser = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true });
    const parsed = parser.parse(xml);

    const nNF = findFirstTag(parsed, "nNF");
    const invoiceNumber = nNF ? String(nNF).trim() : null;

    // Quantidade/unidade do primeiro item da nota (produto)
    const det = findFirstTag(parsed, "det");
    const prod = det ? (Array.isArray(det) ? det[0]?.prod : det.prod) : null;
    const qCom = prod?.qCom ?? findFirstTag(parsed, "qCom");
    const uComRaw = prod?.uCom ?? findFirstTag(parsed, "uCom");
    const uCom = uComRaw ? String(uComRaw).toUpperCase().trim() : null;

    let quantity: string | null = null;
    let unit: "ton" | "m3" | null = null;
    if (qCom !== null && qCom !== undefined && uCom) {
      const qtyNum = parseFloat(String(qCom));
      if (!isNaN(qtyNum)) {
        if (uCom === "TON" || uCom === "T" || uCom === "TN") {
          quantity = String(qtyNum);
          unit = "ton";
        } else if (uCom === "KG") {
          quantity = String(qtyNum / 1000);
          unit = "ton";
        } else if (uCom === "M3" || uCom === "M³" || uCom === "MC") {
          quantity = String(qtyNum);
          unit = "m3";
        }
      }
    }

    // Fallback: peso líquido total do transporte (kg), quando não deu pra achar pela unidade do produto
    if (!quantity) {
      const pesoL = findFirstTag(parsed, "pesoL");
      if (pesoL !== null && pesoL !== undefined) {
        const pesoNum = parseFloat(String(pesoL));
        if (!isNaN(pesoNum) && pesoNum > 0) {
          quantity = String(pesoNum / 1000);
          unit = "ton";
        }
      }
    }

    return { invoiceNumber, quantity, unit };
  } catch (e) {
    console.error("[extractNfDataFromXml] Falha ao interpretar o XML:", e);
    return fallback;
  }
}

// Busca a primeira ocorrência de uma tag em qualquer nível da árvore (robusto a variações
// de namespace/estrutura entre o XML "NFe" puro e o envelope "nfeProc" com protocolo anexado).
function findFirstTag(obj: any, tagName: string): any {
  if (obj === null || obj === undefined || typeof obj !== "object") return undefined;
  if (tagName in obj) return obj[tagName];
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    if (Array.isArray(value)) {
      for (const item of value) {
        const found = findFirstTag(item, tagName);
        if (found !== undefined) return found;
      }
    } else if (typeof value === "object") {
      const found = findFirstTag(value, tagName);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}
