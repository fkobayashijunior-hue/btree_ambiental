// Confere a assinatura do evento com o certificado real (só roda se o .pfx estiver configurado na máquina).
import "dotenv/config";
import { describe, expect, it } from "vitest";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { montarEventoAssinado } from "./sefaz";

const p = process.env.NFE_CERT_PATH || process.env.SICOOB_CERT_PATH;
const temCert = !!p && fs.existsSync(path.resolve(process.cwd(), p));

describe.skipIf(!temCert)("assinatura do evento Ciência da Operação", () => {
  it("digest e assinatura conferem com a forma canônica", () => {
    const chave = "41261112345678000190550010000159951000159950";
    const xml = montarEventoAssinado(chave, "58616075000181", "homologacao");
    const id = `ID210210${chave}01`;
    expect(xml).toContain(`<infEvento Id="${id}">`);
    const miolo = xml.match(/<infEvento Id="[^"]+">([\s\S]*?)<\/infEvento>/)![1];
    const digest = crypto.createHash("sha1").update(`<infEvento xmlns="http://www.portalfiscal.inf.br/nfe" Id="${id}">${miolo}</infEvento>`).digest("base64");
    expect(xml).toContain(`<DigestValue>${digest}</DigestValue>`);
    const signedInfo = xml.match(/<SignedInfo>[\s\S]*?<\/SignedInfo>/)![0].replace("<SignedInfo>", `<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#">`);
    const assinatura = xml.match(/<SignatureValue>([^<]+)<\/SignatureValue>/)![1];
    const cert = xml.match(/<X509Certificate>([^<]+)<\/X509Certificate>/)![1];
    const pub = new crypto.X509Certificate(Buffer.from(cert, "base64")).publicKey;
    expect(crypto.createVerify("RSA-SHA1").update(signedInfo).verify(pub, assinatura, "base64")).toBe(true);
    expect(xml).toMatch(/<dhEvento>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-03:00<\/dhEvento>/);
  });
});
