// Comunicação com a SEFAZ (Ambiente Nacional) para as NF-e de compra:
//   · Distribuição DF-e (NFeDistribuicaoDFe): baixa resumos e XMLs destinados ao CNPJ da empresa
//   · Recepção de Evento (NFeRecepcaoEvento4): envia a "Ciência da Operação" (210210), que libera o XML completo
// Usa o certificado e-CNPJ A1 (.pfx). Sem dependências novas: TLS mútuo pelo https do Node, assinatura XML montada
// à mão (forma canônica C14N gerada direto) e chave privada extraída do .pfx com o "openssl" do sistema.
import fs from "fs";
import path from "path";
import https from "https";
import tls from "tls";
import crypto from "crypto";
import zlib from "zlib";
import { execFileSync } from "child_process";

export type Ambiente = "producao" | "homologacao";

/**
 * Modo do módulo:
 *  · "importacao" (padrão): as notas chegam por importação dos XMLs baixados do Conta Azul. O sistema NÃO consulta a
 *    SEFAZ, porque a Distribuição DF-e entrega cada nota a um só sistema por CNPJ e o Conta Azul já faz essa busca
 *    (duas buscas em paralelo geram o erro 656 e uma "rouba" as notas da outra).
 *  · "sefaz": o próprio sistema busca na SEFAZ (só ligar se a busca automática do Conta Azul for desligada).
 */
export const modoSefaz = () => (process.env.NFE_COMPRAS_MODO ?? "").toLowerCase() === "sefaz";

export function ambienteAtual(): Ambiente {
  return (process.env.NFE_COMPRAS_AMBIENTE ?? "").toLowerCase().startsWith("homolog") ? "homologacao" : "producao";
}
const tpAmb = (a: Ambiente) => (a === "producao" ? "1" : "2");

const URLS = {
  producao: {
    dist: "https://www1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx",
    evento: "https://www.nfe.fazenda.gov.br/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx",
  },
  homologacao: {
    dist: "https://hom1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx",
    evento: "https://hom1.nfe.fazenda.gov.br/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx",
  },
} as const;

// UF do autor da consulta (Paraná = 41). Pode ser trocado por NFE_COMPRAS_UF (código IBGE).
const cUFAutor = () => (process.env.NFE_COMPRAS_UF ?? "41").replace(/\D/g, "") || "41";

// ── Certificado ─────────────────────────────────────────────────────────────
export type Certificado = {
  pfx: Buffer; senha: string; cnpj: string; nome: string; validoAte: string; // ISO
  agente: https.Agent;
};
let certCache: Certificado | null = null;
let chaveCache: { keyPem: string; certB64: string } | null = null;

function caminhoCert() {
  const p = process.env.NFE_CERT_PATH || process.env.SICOOB_CERT_PATH;
  const senha = process.env.NFE_CERT_PASSPHRASE ?? process.env.SICOOB_CERT_PASSPHRASE ?? "";
  if (!p) throw new Error("Certificado não configurado (NFE_CERT_PATH ou SICOOB_CERT_PATH no .env)");
  const resolvido = path.resolve(process.cwd(), p);
  if (!fs.existsSync(resolvido)) throw new Error(`Arquivo do certificado não encontrado: ${resolvido}`);
  return { arquivo: resolvido, senha };
}

export function carregarCertificado(): Certificado {
  if (certCache) return certCache;
  const { arquivo, senha } = caminhoCert();
  const pfx = fs.readFileSync(arquivo);
  const ctx = tls.createSecureContext({ pfx, passphrase: senha });
  const sock = new tls.TLSSocket(null as any, { secureContext: ctx });
  const c: any = sock.getCertificate();
  sock.destroy();
  const cn = String(c?.subject?.CN ?? "");
  const cnpj = (cn.match(/(\d{14})\s*$/)?.[1] ?? process.env.NFE_COMPRAS_CNPJ ?? "").replace(/\D/g, "");
  if (cnpj.length !== 14) throw new Error("Não consegui ler o CNPJ do certificado; defina NFE_COMPRAS_CNPJ no .env");
  certCache = {
    pfx, senha, cnpj,
    nome: cn.replace(/:\d{14}\s*$/, "").trim(),
    validoAte: new Date(c?.valid_to).toISOString(),
    // A SEFAZ usa certificados da ICP-Brasil, que não estão na lista padrão de autoridades do Node; a conexão continua
    // cifrada e autenticada pelo nosso certificado (prática comum em integrações de NF-e).
    agente: new https.Agent({ pfx, passphrase: senha, rejectUnauthorized: false, keepAlive: true }),
  };
  return certCache;
}

/** Chave privada (PEM) e certificado (base64) para assinar eventos. Extraídos uma vez com o openssl do sistema. */
function chaveParaAssinar() {
  if (chaveCache) return chaveCache;
  const { arquivo, senha } = caminhoCert();
  const env = { ...process.env, NFE_PFX_SENHA: senha };
  let saida = "";
  let ultimoErro = "";
  for (const extra of [[], ["-legacy"]]) {
    try {
      saida = execFileSync("openssl", ["pkcs12", "-in", arquivo, "-nodes", "-passin", "env:NFE_PFX_SENHA", ...extra], { env, stdio: ["ignore", "pipe", "pipe"] }).toString();
      if (saida.includes("PRIVATE KEY-----")) break;
    } catch (e: any) { ultimoErro = String(e?.stderr ?? e?.message ?? e).split("\n")[0]; saida = ""; }
  }
  const key = saida.match(/-----BEGIN (?:RSA |ENCRYPTED )?PRIVATE KEY-----[\s\S]+?-----END (?:RSA |ENCRYPTED )?PRIVATE KEY-----/)?.[0];
  if (!key) throw new Error(`Não consegui ler a chave do certificado com o openssl${ultimoErro ? `: ${ultimoErro}` : ""}`);
  // certificado do titular (o que tem a chave pública correspondente)
  const pub = crypto.createPublicKey(key).export({ type: "spki", format: "der" }).toString("base64");
  const certs = saida.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g) ?? [];
  const titular = certs.find((c) => {
    try { return new crypto.X509Certificate(c).publicKey.export({ type: "spki", format: "der" }).toString("base64") === pub; } catch { return false; }
  }) ?? certs[0];
  if (!titular) throw new Error("Certificado do titular não encontrado no .pfx");
  chaveCache = { keyPem: key, certB64: titular.replace(/-----(BEGIN|END) CERTIFICATE-----|\s/g, "") };
  return chaveCache;
}

// ── SOAP ────────────────────────────────────────────────────────────────────
function postSoap(url: string, action: string, corpo: string, agente: https.Agent): Promise<string> {
  const envelope = `<?xml version="1.0" encoding="utf-8"?><soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"><soap12:Body>${corpo}</soap12:Body></soap12:Envelope>`;
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: "POST", agent: agente, timeout: 60_000,
      headers: { "Content-Type": `application/soap+xml; charset=utf-8; action="${action}"`, "Content-Length": Buffer.byteLength(envelope) },
    }, (res) => {
      const partes: Buffer[] = [];
      res.on("data", (d) => partes.push(d));
      res.on("end", () => {
        const txt = Buffer.concat(partes).toString("utf8");
        if ((res.statusCode ?? 500) >= 400) reject(new Error(`SEFAZ respondeu HTTP ${res.statusCode}: ${txt.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 300)}`));
        else resolve(txt);
      });
    });
    req.on("timeout", () => req.destroy(new Error("Tempo esgotado esperando a SEFAZ")));
    req.on("error", reject);
    req.write(envelope);
    req.end();
  });
}

const tag = (xml: string, nome: string) => xml.match(new RegExp(`<(?:\\w+:)?${nome}[^>]*>([\\s\\S]*?)</(?:\\w+:)?${nome}>`))?.[1] ?? null;

// ── Distribuição DF-e ───────────────────────────────────────────────────────
export type DocDistribuido = { nsu: string; schema: string; xml: string };
export type RespostaDist = { cStat: string; xMotivo: string; ultNSU: string; maxNSU: string; dhResp: string | null; docs: DocDistribuido[] };

export async function consultarDistribuicao(opts: { ultNSU?: string; chave?: string; ambiente?: Ambiente }): Promise<RespostaDist> {
  const amb = opts.ambiente ?? ambienteAtual();
  const cert = carregarCertificado();
  const filtro = opts.chave
    ? `<consChNFe><chNFe>${opts.chave}</chNFe></consChNFe>`
    : `<distNSU><ultNSU>${String(opts.ultNSU ?? "0").padStart(15, "0")}</ultNSU></distNSU>`;
  const corpo = `<nfeDistDFeInteresse xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe"><nfeDadosMsg><distDFeInt xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.01"><tpAmb>${tpAmb(amb)}</tpAmb><cUFAutor>${cUFAutor()}</cUFAutor><CNPJ>${cert.cnpj}</CNPJ>${filtro}</distDFeInt></nfeDadosMsg></nfeDistDFeInteresse>`;
  const resp = await postSoap(URLS[amb].dist, "http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe/nfeDistDFeInteresse", corpo, cert.agente);
  const ret = tag(resp, "retDistDFeInt");
  if (!ret) throw new Error(`Resposta inesperada da SEFAZ: ${resp.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 300)}`);
  const docs: DocDistribuido[] = [];
  for (const m of Array.from(ret.matchAll(/<(?:\w+:)?docZip([^>]*)>([^<]+)<\/(?:\w+:)?docZip>/g))) {
    const attrs = m[1];
    const nsu = attrs.match(/NSU="(\d+)"/)?.[1] ?? "";
    const schema = attrs.match(/schema="([^"]+)"/)?.[1] ?? "";
    try { docs.push({ nsu, schema, xml: zlib.gunzipSync(Buffer.from(m[2].trim(), "base64")).toString("utf8") }); }
    catch { /* documento corrompido: ignora, o NSU avança mesmo assim */ }
  }
  return {
    cStat: tag(ret, "cStat") ?? "", xMotivo: tag(ret, "xMotivo") ?? "",
    ultNSU: tag(ret, "ultNSU") ?? "0", maxNSU: tag(ret, "maxNSU") ?? "0", dhResp: tag(ret, "dhResp"), docs,
  };
}

// ── Evento: Ciência da Operação (210210) ────────────────────────────────────
/** Data/hora no fuso de Brasília (-03:00), 1 minuto no passado para não "adiantar" o relógio da SEFAZ. */
function dhBrasilia() {
  const d = new Date(Date.now() - 3 * 3600_000 - 60_000);
  return d.toISOString().slice(0, 19) + "-03:00";
}

const C14N = "http://www.w3.org/TR/2001/REC-xml-c14n-20010315";
/** Monta e assina um evento. A forma canônica (C14N) já é gerada direto: sem espaços, namespace herdado declarado. */
export function montarEventoAssinado(chave: string, cnpj: string, amb: Ambiente, tpEvento = "210210", descEvento = "Ciencia da Operacao") {
  const { keyPem, certB64 } = chaveParaAssinar();
  const id = `ID${tpEvento}${chave}01`;
  const miolo = `<cOrgao>91</cOrgao><tpAmb>${tpAmb(amb)}</tpAmb><CNPJ>${cnpj}</CNPJ><chNFe>${chave}</chNFe><dhEvento>${dhBrasilia()}</dhEvento><tpEvento>${tpEvento}</tpEvento><nSeqEvento>1</nSeqEvento><verEvento>1.00</verEvento><detEvento versao="1.00"><descEvento>${descEvento}</descEvento></detEvento>`;
  const infCanonico = `<infEvento xmlns="http://www.portalfiscal.inf.br/nfe" Id="${id}">${miolo}</infEvento>`;
  const digest = crypto.createHash("sha1").update(infCanonico, "utf8").digest("base64");
  const signedInfo = (ns: string) => `<SignedInfo${ns}><CanonicalizationMethod Algorithm="${C14N}"></CanonicalizationMethod><SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"></SignatureMethod><Reference URI="#${id}"><Transforms><Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"></Transform><Transform Algorithm="${C14N}"></Transform></Transforms><DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"></DigestMethod><DigestValue>${digest}</DigestValue></Reference></SignedInfo>`;
  const assinatura = crypto.createSign("RSA-SHA1").update(signedInfo(` xmlns="http://www.w3.org/2000/09/xmldsig#"`), "utf8").sign(keyPem, "base64");
  return `<evento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00"><infEvento Id="${id}">${miolo}</infEvento><Signature xmlns="http://www.w3.org/2000/09/xmldsig#">${signedInfo("")}<SignatureValue>${assinatura}</SignatureValue><KeyInfo><X509Data><X509Certificate>${certB64}</X509Certificate></X509Data></KeyInfo></Signature></evento>`;
}

export type RetornoEvento = { chave: string; cStat: string; xMotivo: string; ok: boolean };

/** Envia até 20 eventos de Ciência da Operação num lote. "Já registrado" (573) conta como sucesso. */
export async function enviarCiencia(chaves: string[], ambiente?: Ambiente): Promise<{ cStatLote: string; xMotivoLote: string; retornos: RetornoEvento[] }> {
  const amb = ambiente ?? ambienteAtual();
  const cert = carregarCertificado();
  const lote = chaves.slice(0, 20);
  const eventos = lote.map((c) => montarEventoAssinado(c, cert.cnpj, amb)).join("");
  const idLote = String(Date.now()).slice(-15);
  const corpo = `<nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4"><envEvento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00"><idLote>${idLote}</idLote>${eventos}</envEvento></nfeDadosMsg>`;
  const resp = await postSoap(URLS[amb].evento, "http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4/nfeRecepcaoEventoNF", corpo, cert.agente);
  const ret = tag(resp, "retEnvEvento");
  if (!ret) throw new Error(`Resposta inesperada da SEFAZ: ${resp.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 300)}`);
  const retornos: RetornoEvento[] = [];
  for (const m of Array.from(ret.matchAll(/<(?:\w+:)?retEvento[^>]*>([\s\S]*?)<\/(?:\w+:)?retEvento>/g))) {
    const r = m[1];
    const cStat = tag(r, "cStat") ?? "";
    retornos.push({ chave: tag(r, "chNFe") ?? "", cStat, xMotivo: tag(r, "xMotivo") ?? "", ok: ["135", "136", "573"].includes(cStat) });
  }
  return { cStatLote: tag(ret, "cStat") ?? "", xMotivoLote: tag(ret, "xMotivo") ?? "", retornos };
}

export function infoCertificado() {
  try {
    const c = carregarCertificado();
    const dias = Math.floor((new Date(c.validoAte).getTime() - Date.now()) / 86_400_000);
    return { ok: true as const, cnpj: c.cnpj, nome: c.nome, validoAte: c.validoAte, diasRestantes: dias };
  } catch (e: any) {
    return { ok: false as const, erro: String(e?.message ?? e) };
  }
}
