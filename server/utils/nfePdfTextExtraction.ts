import { PDFParse } from "pdf-parse";

/**
 * Extrai número da NF (e, quando possível, peso líquido) do texto de um DANFE em PDF —
 * só funciona quando o PDF tem camada de texto selecionável (gerado digitalmente, não uma
 * foto/scan da nota). Não usa IA: é regex sobre o texto puro, sem custo e determinístico.
 *
 * Estratégia principal: toda NFe tem uma "chave de acesso" de 44 dígitos impressa no DANFE,
 * com estrutura fixa — os 9 dígitos nas posições 26 a 34 SÃO o número da nota (nNF), com
 * zeros à esquerda. Isso é bem mais confiável que tentar achar "Nº" no layout (que varia
 * muito de emissor pra emissor).
 */
export async function extractNfDataFromPdfText(buffer: Buffer): Promise<{
  invoiceNumber: string | null;
  quantity: string | null;
  unit: "ton" | "m3" | null;
}> {
  const fallback = { invoiceNumber: null, quantity: null, unit: null } as const;
  try {
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy();
    const text = result.text || "";
    if (!text.trim()) return fallback; // PDF sem camada de texto (escaneado) — nada a fazer

    let invoiceNumber: string | null = null;

    // Chave de acesso: 44 dígitos, impressa como 11 grupos de 4 (ex: "4126 0958 6160 ...").
    // Separador restrito a espaço/tab (não quebra de linha) pra não "vazar" pra números
    // vizinhos em outras linhas do DANFE. Cada candidato é validado pelo dígito verificador
    // (módulo 11) antes de aceitar — só assim garante que achou a chave de verdade, e não
    // um trecho de texto que por acaso também tem 44 dígitos.
    const candidates = [
      ...(text.match(/\d{4}(?:[ \t]\d{4}){10}/g) || []).map(m => m.replace(/[ \t]/g, "")),
      ...(text.match(/\d{44}/g) || []),
    ];
    for (const digits of candidates) {
      if (digits.length === 44 && validateNfeAccessKey(digits)) {
        invoiceNumber = digits.slice(25, 34).replace(/^0+/, "") || "0";
        break;
      }
    }

    // Fallback secundário: rótulo "Nº" perto de "NF-e" no cabeçalho do DANFE (formato comum:
    // "Nº 000.000.449" ou "N° 449")
    if (!invoiceNumber) {
      const labelMatch = text.match(/N[ºo°]\.?\s*[:.]?\s*(\d{1,3}(?:[.\s]\d{3}){0,2})/i);
      if (labelMatch) {
        const digits = labelMatch[1].replace(/\D/g, "").replace(/^0+/, "") || "0";
        if (digits.length > 0 && digits.length <= 9) invoiceNumber = digits;
      }
    }

    // Quantidade/unidade direto da linha do produto (padrão comum do DANFE: "... TON 40 ...",
    // "... M3 63,3600 ..." na coluna UNID/QUANT.).
    let quantity: string | null = null;
    let unit: "ton" | "m3" | null = null;
    const itemMatch = text.match(/\b(TON|M3|M³|KG)\b\s+(\d+(?:[.,]\d+)?)/i);
    if (itemMatch) {
      const rawUnit = itemMatch[1].toUpperCase();
      const num = parseFloat(itemMatch[2].replace(",", "."));
      if (!isNaN(num) && num > 0) {
        if (rawUnit === "TON") { quantity = String(num); unit = "ton"; }
        else if (rawUnit === "KG") { quantity = String(num / 1000); unit = "ton"; }
        else if (rawUnit === "M3" || rawUnit === "M³") { quantity = String(num); unit = "m3"; }
      }
    }
    // Fallback: peso líquido total do transporte — formato comum "PESO LÍQUIDO 35.000"
    if (!quantity) {
      const pesoMatch = text.match(/PESO\s*L[IÍ]QUIDO[^\d]{0,15}([\d.,]+)/i);
      if (pesoMatch) {
        const num = parseFloat(pesoMatch[1].replace(/\./g, "").replace(",", "."));
        if (!isNaN(num) && num > 0) {
          // Números grandes (>100) provavelmente estão em kg; menores já em toneladas
          quantity = num > 100 ? String(num / 1000) : String(num);
          unit = "ton";
        }
      }
    }

    return { invoiceNumber, quantity, unit };
  } catch (e) {
    console.error("[extractNfDataFromPdfText] Falha ao ler texto do PDF:", e);
    return fallback;
  }
}

// Valida o dígito verificador (módulo 11) da chave de acesso da NFe — confirma que os 44
// dígitos encontrados são de fato a chave, e não um trecho de texto que por coincidência
// também tem 44 dígitos.
function validateNfeAccessKey(key44: string): boolean {
  if (!/^\d{44}$/.test(key44)) return false;
  const digits = key44.slice(0, 43).split("").map(Number);
  const weights = [2, 3, 4, 5, 6, 7, 8, 9];
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    sum += digits[digits.length - 1 - i] * weights[i % weights.length];
  }
  const remainder = sum % 11;
  const expectedDv = remainder < 2 ? 0 : 11 - remainder;
  return expectedDv === Number(key44[43]);
}
