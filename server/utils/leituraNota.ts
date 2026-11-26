// Leitura da foto/PDF da nota ou comprovante por IA (Claude Sonnet 5.5) para pré-preencher o formulário de gasto.
// O resultado é só sugestão: a pessoa confere antes de salvar. Conferências feitas aqui, sem depender da IA:
//   · chave de acesso válida (dígito verificador) → CNPJ do fornecedor, série e número saem da própria chave
//   · CNPJ da BTREE nunca é o fornecedor (é o comprador)
//   · data no futuro ou muito antiga gera aviso
import Anthropic from "@anthropic-ai/sdk";

export const MODELO_LEITURA = "claude-sonnet-5-5";
const FORMAS = ["dinheiro", "pix", "cartao_credito", "cartao_debito", "transferencia", "boleto", "cheque", "debito_conta", "outro", ""] as const;

let cliente: Anthropic | null = null;
function getCliente() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY não configurada no servidor");
  if (!cliente) cliente = new Anthropic({ apiKey: key, baseURL: "https://api.anthropic.com", timeout: 90_000, maxRetries: 2 });
  return cliente;
}

// ── Conferências ────────────────────────────────────────────────────────────
export function cnpjValido(c: string): boolean {
  const d = c.replace(/\D/g, "");
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
  const dv = (base: string, pesos: number[]) => { const s = base.split("").reduce((t, n, i) => t + Number(n) * pesos[i], 0) % 11; return s < 2 ? 0 : 11 - s; };
  const d1 = dv(d.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = dv(d.slice(0, 12) + d1, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d.endsWith(`${d1}${d2}`);
}

export function chaveValida(k: string): boolean {
  const d = k.replace(/\D/g, "");
  if (d.length !== 44) return false;
  let s = 0, p = 2;
  for (let i = 42; i >= 0; i--) { s += Number(d[i]) * p; p = p === 9 ? 2 : p + 1; }
  const dv = s % 11 < 2 ? 0 : 11 - (s % 11);
  return Number(d[43]) === dv;
}

export type LeituraBruta = {
  tipo_documento: string; emitente_nome: string; emitente_cnpj: string; numero_nf: string; serie: string; data_emissao: string;
  valor_total: number; chave_acesso: string; forma_pagamento: string; itens_resumo: string; categoria: string; legivel: boolean; observacoes: string;
};

export type LeituraNota = {
  valor: number | null; descricao: string | null; data: string | null; favorecido: string | null; favorecidoCnpj: string | null;
  nfNumero: string | null; serie: string | null; chave: string | null; categoria: string | null; formaPagamento: string | null;
  tipoDocumento: string; legivel: boolean; avisos: string[];
};

/** Aplica as conferências à leitura da IA. Função pura (testável). */
export function conferirLeitura(b: LeituraBruta, cnpjEmpresa: string | null, hojeISO: string): LeituraNota {
  const avisos: string[] = [];
  const so = (s: string) => (s ?? "").replace(/\D/g, "");
  let cnpj = so(b.emitente_cnpj);
  let numero = (b.numero_nf ?? "").replace(/\D/g, "").replace(/^0+/, "");
  let serie = (b.serie ?? "").replace(/\D/g, "").replace(/^0+/, "") || null;
  let chave: string | null = so(b.chave_acesso) || null;

  if (chave && chaveValida(chave)) {
    // a chave confere: CNPJ do emitente, série e número vêm dela (mais confiável que a leitura de cada campo)
    cnpj = chave.slice(6, 20);
    serie = String(Number(chave.slice(22, 25)));
    numero = String(Number(chave.slice(25, 34)));
  } else if (chave) {
    avisos.push("A chave de acesso não foi lida corretamente; confira o nº da NF e o fornecedor.");
    chave = null;
  }
  if (cnpj && cnpjEmpresa && cnpj === cnpjEmpresa) {
    avisos.push("A leitura confundiu o comprador (BTREE) com o fornecedor; o CNPJ do fornecedor ficou em branco.");
    cnpj = "";
  }
  if (cnpj && !cnpjValido(cnpj)) {
    avisos.push("O CNPJ do fornecedor não confere; foi deixado em branco.");
    cnpj = "";
  }
  let data: string | null = /^\d{4}-\d{2}-\d{2}$/.test(b.data_emissao ?? "") ? b.data_emissao : null;
  if (data) {
    const dias = (Date.parse(hojeISO) - Date.parse(data)) / 86_400_000;
    if (dias < -1) { avisos.push("A data lida está no futuro; confira."); }
    else if (dias > 180) { avisos.push(`A data lida (${data.split("-").reverse().join("/")}) é antiga; confira o ano.`); }
  } else if (b.data_emissao) avisos.push("Não deu para ler a data; confira.");
  const valor = Number(b.valor_total) > 0 ? Math.round(Number(b.valor_total) * 100) / 100 : null;
  if (!valor) avisos.push("Não deu para ler o valor total.");
  if (!b.legivel) avisos.push("A foto está difícil de ler; confira todos os campos ou tire outra foto.");
  if (b.tipo_documento === "cupom_nao_fiscal" || b.tipo_documento === "recibo" || b.tipo_documento === "outro") {
    avisos.push("O documento não parece ser uma nota fiscal (pedido, recibo ou comprovante).");
  }
  const nome = (b.emitente_nome ?? "").trim() || null;
  const itens = (b.itens_resumo ?? "").trim();
  // Combustível não é lançado aqui (vai pelo Controle de Abastecimento): não sugere categoria e avisa
  const combustivel = /gasolina|diesel|etanol|combust[ií]vel/i.test(itens);
  if (combustivel) avisos.push("Parece ser combustível: ele é lançado no Controle de Abastecimento, não aqui.");
  return {
    valor, data,
    descricao: itens ? `${itens}${nome ? ` - ${nome}` : ""}`.slice(0, 200) : nome,
    favorecido: nome, favorecidoCnpj: cnpj || null,
    nfNumero: numero || null, serie, chave,
    categoria: combustivel ? null : (b.categoria ?? "").trim() || null,
    formaPagamento: (FORMAS as readonly string[]).includes(b.forma_pagamento) && b.forma_pagamento ? b.forma_pagamento : null,
    tipoDocumento: b.tipo_documento, legivel: !!b.legivel, avisos,
  };
}

// ── Leitura ────────────────────────────────────────────────────────────────
const CLOUDINARY = /^https:\/\/res\.cloudinary\.com\/[\w-]+\/(image|raw)\/upload\//;

/** Baixa o arquivo (só do Cloudinary do sistema). Fotos vêm convertidas para JPG e limitadas a 2000 px. */
async function baixar(url: string): Promise<{ data: string; mime: "application/pdf" | "image/jpeg" }> {
  if (!CLOUDINARY.test(url)) throw new Error("Endereço do arquivo não permitido");
  const pdf = /\.pdf($|\?)/i.test(url);
  const alvo = pdf ? url : url.replace("/image/upload/", "/image/upload/f_jpg,q_85,w_2000,h_2000,c_limit/");
  const r = await fetch(alvo);
  if (!r.ok) throw new Error(`Não consegui baixar o arquivo (${r.status})`);
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length > 20_000_000) throw new Error("Arquivo grande demais para leitura automática");
  return { data: buf.toString("base64"), mime: pdf ? "application/pdf" : "image/jpeg" };
}

const SISTEMA = "Você lê fotos e PDFs de notas fiscais e comprovantes brasileiros (DANFE de NF-e, cupom NFC-e, cupom de posto, recibo, nota de serviço) para preencher um lançamento de despesa. Responda só com os dados pedidos.";

/** Qual IA usa: LEITURA_NOTA_IA=claude|gemini no .env; sem isso, Claude se houver chave, senão Gemini. */
export function provedorLeitura(): "claude" | "gemini" | null {
  const escolha = (process.env.LEITURA_NOTA_IA ?? "").toLowerCase();
  const temClaude = !!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY.startsWith("sua-chave");
  const temGemini = !!process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.startsWith("sua-chave");
  if (escolha === "gemini") return temGemini ? "gemini" : null;
  if (escolha === "claude") return temClaude ? "claude" : null;
  return temClaude ? "claude" : temGemini ? "gemini" : null;
}

async function viaClaude(arq: { data: string; mime: string }, pedido: string, schema: object): Promise<string> {
  const bloco: Anthropic.Beta.Messages.BetaContentBlockParam = arq.mime === "application/pdf"
    ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: arq.data } }
    : { type: "image", source: { type: "base64", media_type: "image/jpeg", data: arq.data } };
  const r = await getCliente().beta.messages.create({
    model: MODELO_LEITURA,
    max_tokens: 8000,
    // se o filtro de segurança recusar (raríssimo aqui), a própria API refaz com o modelo reserva
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SISTEMA,
    messages: [{ role: "user", content: [bloco, { type: "text", text: pedido }] }],
    output_config: { format: { type: "json_schema", schema: schema as any } },
  });
  if (r.stop_reason === "refusal") throw new Error("A leitura automática foi recusada; preencha os campos à mão");
  if (r.stop_reason === "max_tokens") throw new Error("A leitura automática não terminou; preencha os campos à mão");
  return (r.content as any[]).find((b) => b.type === "text")?.text ?? "";
}

export const MODELO_GEMINI = process.env.LEITURA_NOTA_GEMINI_MODELO || "gemini-3.5-flash-lite";

/** Gemini pela API REST do Google (sem biblioteca extra). Tenta de novo quando o Google responde "sobrecarga" (503/429). */
async function viaGemini(arq: { data: string; mime: string }, pedido: string, schema: object): Promise<string> {
  const semAdditional = JSON.parse(JSON.stringify(schema, (k, v) => (k === "additionalProperties" ? undefined : v)));
  const corpo = {
    systemInstruction: { parts: [{ text: SISTEMA }] },
    contents: [{ role: "user", parts: [{ inline_data: { mime_type: arq.mime, data: arq.data } }, { text: pedido }] }],
    generationConfig: { responseMimeType: "application/json", responseJsonSchema: semAdditional },
  };
  let ultimo = "";
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    if (tentativa) await new Promise((ok) => setTimeout(ok, 2000 * tentativa));
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODELO_GEMINI}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY ?? "" },
      body: JSON.stringify(corpo),
      signal: AbortSignal.timeout(90_000),
    });
    const j: any = await r.json().catch(() => ({}));
    if (r.ok) {
      const texto = (j?.candidates?.[0]?.content?.parts ?? []).map((p: any) => p.text ?? "").join("");
      if (!texto) throw new Error("A leitura automática não devolveu dados; preencha os campos à mão");
      return texto;
    }
    ultimo = `${r.status} ${j?.error?.message ?? ""}`.trim();
    if (r.status !== 503 && r.status !== 429 && r.status !== 500) break;
  }
  throw new Error(`O Gemini não respondeu (${ultimo.slice(0, 160)}); preencha os campos à mão`);
}

export async function lerNotaPorIA(url: string, categorias: string[], cnpjEmpresa: string | null): Promise<LeituraNota & { ia: string }> {
  if (!provedorLeitura()) throw new Error("Leitura automática indisponível: nenhuma chave de IA configurada no servidor (ANTHROPIC_API_KEY ou GEMINI_API_KEY)");
  return lerArquivoPorIA(await baixar(url), categorias, cnpjEmpresa);
}

/** Lê um arquivo já em memória (base64). Separado para poder testar com fotos locais. */
export async function lerArquivoPorIA(arq: { data: string; mime: string }, categorias: string[], cnpjEmpresa: string | null): Promise<LeituraNota & { ia: string }> {
  const provedor = provedorLeitura();
  if (!provedor) throw new Error("Leitura automática indisponível: nenhuma chave de IA configurada no servidor (ANTHROPIC_API_KEY ou GEMINI_API_KEY)");
  const cats = categorias.length ? categorias : ["Outros"];
  const schema = {
    type: "object",
    properties: {
      tipo_documento: { type: "string", enum: ["nfe_danfe", "nfce_cupom", "cupom_nao_fiscal", "recibo", "nfse", "outro"] },
      emitente_nome: { type: "string" }, emitente_cnpj: { type: "string" }, numero_nf: { type: "string" }, serie: { type: "string" },
      data_emissao: { type: "string" }, valor_total: { type: "number" }, chave_acesso: { type: "string" },
      forma_pagamento: { type: "string", enum: [...FORMAS] }, itens_resumo: { type: "string" },
      categoria: { type: "string", enum: cats }, legivel: { type: "boolean" }, observacoes: { type: "string" },
    },
    required: ["tipo_documento", "emitente_nome", "emitente_cnpj", "numero_nf", "serie", "data_emissao", "valor_total",
      "chave_acesso", "forma_pagamento", "itens_resumo", "categoria", "legivel", "observacoes"],
    additionalProperties: false,
  };
  const pedido = `Extraia os dados deste comprovante de despesa da empresa${cnpjEmpresa ? ` (a empresa compradora tem CNPJ ${cnpjEmpresa}; ela NUNCA é o fornecedor)` : ""}.
Regras:
- emitente = quem vendeu/prestou o serviço (o fornecedor), não o comprador.
- emitente_cnpj e chave_acesso: só os dígitos (CNPJ com 14, chave com 44). Se não aparecer, deixe "".
- data_emissao no formato AAAA-MM-DD.
- valor_total = valor final pago (depois de descontos), em reais, com ponto decimal.
- numero_nf e serie sem zeros à esquerda. Em pedido/recibo sem número de nota fiscal, deixe numero_nf "".
- itens_resumo: uma linha curta com o que foi comprado (ex.: "Gasolina comum 45,2 L", "2 refeições").
- forma_pagamento: a que aparecer no comprovante, ou "" se não aparecer.
- categoria: a que melhor descreve o gasto.
- Se um campo não estiver legível ou não existir, use "" (ou 0 no valor). Nunca invente.
- legivel = false se a foto estiver ruim a ponto de comprometer valor, data ou fornecedor.`;

  const texto = provedor === "claude" ? await viaClaude(arq, pedido, schema) : await viaGemini(arq, pedido, schema);
  let bruta: LeituraBruta;
  try { bruta = JSON.parse(texto); } catch { throw new Error("A leitura automática devolveu um formato inesperado"); }
  const hoje = new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10);
  return { ...conferirLeitura(bruta, cnpjEmpresa, hoje), ia: provedor === "claude" ? MODELO_LEITURA : MODELO_GEMINI };
}
