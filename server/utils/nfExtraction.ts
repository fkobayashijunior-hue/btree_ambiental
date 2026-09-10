import { invokeLLM } from "../_core/llm";
import { extractNfDataFromXml } from "./nfeXmlExtraction";
import { extractNfDataFromPdfText } from "./nfePdfTextExtraction";

function isComplete(data: { invoiceNumber: string | null; quantity: string | null; unit: "ton" | "m3" | null }): boolean {
  return !!data.invoiceNumber && !!data.quantity && !!data.unit;
}

/**
 * Extrai número da NF, quantidade e unidade do arquivo anexado — usado só pra preencher
 * automaticamente os campos que o responsável deixou em branco ao anexar a NF (nunca
 * sobrescreve o que foi digitado). Falha silenciosa: em caso de erro, retorna tudo null e
 * o fluxo de upload segue normal.
 *
 * Ordem de tentativa, da mais confiável e barata pra mais cara:
 * 1. XML da NFe (documento estruturado oficial) — determinístico, sem custo.
 * 2. Texto selecionável do PDF (regex na chave de acesso) — sem custo, funciona quando o
 *    DANFE foi gerado digitalmente (não é foto/scan).
 * 3. Visão de IA — cobre fotos/PDFs escaneados, mas custa e depende de uma chave configurada.
 */
export async function extractNfDataFromFile(fileUrl: string, mimeType?: string): Promise<{
  invoiceNumber: string | null;
  quantity: string | null;
  unit: "ton" | "m3" | null;
}> {
  const fallback = { invoiceNumber: null, quantity: null, unit: null } as const;
  const isXml = (mimeType || '').includes('xml') || fileUrl.toLowerCase().endsWith('.xml');
  if (isXml) {
    try {
      const res = await fetch(fileUrl);
      if (res.ok) {
        const xmlText = await res.text();
        return extractNfDataFromXml(xmlText);
      }
      console.error('[extractNfDataFromFile] Falha ao baixar XML da NF:', res.status);
    } catch (e) {
      console.error('[extractNfDataFromFile] Erro ao baixar/ler XML da NF:', e);
    }
    return fallback;
  }

  const isPdf = (mimeType || '').includes('pdf') || fileUrl.toLowerCase().endsWith('.pdf');
  if (isPdf) {
    try {
      const res = await fetch(fileUrl);
      if (res.ok) {
        const buffer = Buffer.from(await res.arrayBuffer());
        const fromText = await extractNfDataFromPdfText(buffer);
        if (isComplete(fromText)) return fromText;
        // PDF sem texto suficiente (provável scan/foto) — tenta IA a seguir, aproveitando
        // o que já foi encontrado no texto (ex: número da NF pode ter vindo, quantidade não).
        const fromAi = await extractNfDataFromAi(fileUrl, mimeType);
        return {
          invoiceNumber: fromText.invoiceNumber || fromAi.invoiceNumber,
          quantity: fromText.quantity || fromAi.quantity,
          unit: fromText.unit || fromAi.unit,
        };
      }
      console.error('[extractNfDataFromFile] Falha ao baixar PDF da NF:', res.status);
    } catch (e) {
      console.error('[extractNfDataFromFile] Erro ao ler texto do PDF da NF:', e);
    }
  }

  return extractNfDataFromAi(fileUrl, mimeType);
}

async function extractNfDataFromAi(fileUrl: string, mimeType?: string): Promise<{
  invoiceNumber: string | null;
  quantity: string | null;
  unit: "ton" | "m3" | null;
}> {
  const fallback = { invoiceNumber: null, quantity: null, unit: null } as const;
  try {
    const isPdf = (mimeType || '').includes('pdf') || fileUrl.toLowerCase().endsWith('.pdf');
    const fileContent = isPdf
      ? { type: "file_url", file_url: { url: fileUrl, mime_type: "application/pdf" } }
      : { type: "image_url", image_url: { url: fileUrl, detail: "high" } };

    const result = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `Você é um assistente especializado em extrair dados de notas fiscais brasileiras de venda de madeira/biomassa.
Analise o documento e extraia:
- invoiceNumber: número da nota fiscal (apenas números)
- quantity: quantidade/peso líquido da mercadoria (apenas números, use ponto decimal, ex: 63.36)
- unit: "ton" se a quantidade estiver em toneladas/kg (converta kg para toneladas dividindo por 1000), ou "m3" se estiver em metros cúbicos/estéreos
Retorne APENAS o JSON. Se um campo não for encontrado com certeza, use null.`,
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Extraia os dados desta nota fiscal:" },
            fileContent as any,
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "nf_data",
          strict: true,
          schema: {
            type: "object",
            properties: {
              invoiceNumber: { type: ["string", "null"] },
              quantity: { type: ["string", "null"] },
              unit: { type: ["string", "null"], enum: ["ton", "m3", null] },
            },
            required: ["invoiceNumber", "quantity", "unit"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = result.choices?.[0]?.message?.content;
    let extracted: any = null;
    try {
      extracted = typeof content === "string" ? JSON.parse(content) : null;
    } catch {
      const jsonMatch = typeof content === "string" ? content.match(/\{[\s\S]*\}/) : null;
      if (jsonMatch) { try { extracted = JSON.parse(jsonMatch[0]); } catch { /* ignore */ } }
    }
    if (!extracted) return fallback;
    return {
      invoiceNumber: extracted.invoiceNumber || null,
      quantity: extracted.quantity || null,
      unit: extracted.unit === 'ton' || extracted.unit === 'm3' ? extracted.unit : null,
    };
  } catch (e) {
    console.error('[extractNfDataFromFile] Falha na extração via IA:', e);
    return fallback;
  }
}
