import { describe, expect, it } from "vitest";
import zlib from "zlib";
import { lerDocumento, detalharCompleta, extrairCompleta, lerXml } from "./xml";
import { criarZip, crc32, lerZip } from "./zip";
import { CODE128, code128C } from "../../../client/src/lib/danfe";

import { CHAVE, XML_COMPLETO, XML_RESUMO } from "./fixtures";

describe("leitura dos documentos da SEFAZ", () => {
  it("lê o resumo (resNFe), tirando número e série da chave", () => {
    const d = lerDocumento(XML_RESUMO);
    expect(d.tipo).toBe("resumo");
    if (d.tipo !== "resumo") return;
    expect(d.nota).toMatchObject({ chave: CHAVE, emitenteCnpj: "12345678000190", numero: "15995", serie: "1", valorTotal: 156.69, situacao: "autorizada", dataEmissao: "2026-11-19 10:22:33" });
  });

  it("lê o XML completo (nfeProc), mantendo zeros à esquerda e a data local", () => {
    const d = lerDocumento(XML_COMPLETO);
    expect(d.tipo).toBe("completa");
    if (d.tipo !== "completa") return;
    expect(d.nota).toMatchObject({ chave: CHAVE, numero: "15995", serie: "1", destCnpj: "58616075000181", protocolo: "141260000000001", natureza: "VENDA DE COMBUSTIVEL", emitenteIe: "9012345678" });
  });

  it("resumo cancelado vira situação cancelada", () => {
    const d = lerDocumento(XML_RESUMO.replace("<cSitNFe>1</cSitNFe>", "<cSitNFe>3</cSitNFe>"));
    expect(d.tipo === "resumo" && d.nota.situacao).toBe("cancelada");
  });

  it("lê evento de cancelamento (resEvento)", () => {
    const d = lerDocumento(`<resEvento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.01"><cOrgao>41</cOrgao><CNPJ>12345678000190</CNPJ><chNFe>${CHAVE}</chNFe><dhEvento>2026-11-19T12:00:00-03:00</dhEvento><tpEvento>110111</tpEvento><nSeqEvento>1</nSeqEvento><xEvento>Cancelamento</xEvento></resEvento>`);
    expect(d).toMatchObject({ tipo: "evento", chave: CHAVE, tpEvento: "110111" });
  });

  it("detalha itens e totais", () => {
    const det = detalharCompleta(XML_COMPLETO);
    expect(det.itens).toHaveLength(1);
    expect(det.itens[0]).toMatchObject({ codigo: "001", descricao: "OLEO DIESEL S10", quantidade: 25.123, valorTotal: 156.69 });
    expect(det.totais.nota).toBe(156.69);
    expect(det.informacoes).toBe("PLACA ABC1D23");
  });

  it("XML que não é NF-e não é aceito na importação", () => {
    expect(extrairCompleta(lerXml("<foo><bar>1</bar></foo>"))).toBeNull();
  });
});

describe("ZIP", () => {
  it("CRC32 confere com o zlib", () => {
    const b = Buffer.from("teste de crc 123");
    expect(crc32(b)).toBe(zlib.crc32 ? zlib.crc32(b) : crc32(b));
  });
  it("gera um ZIP com assinatura e diretório central corretos", () => {
    const z = criarZip([{ nome: "a.xml", conteudo: XML_COMPLETO }, { nome: "b.xml", conteudo: XML_RESUMO }]);
    expect(z.readUInt32LE(0)).toBe(0x04034b50);
    const fim = z.length - 22;
    expect(z.readUInt32LE(fim)).toBe(0x06054b50);
    expect(z.readUInt16LE(fim + 10)).toBe(2);
    // conteúdo do primeiro arquivo descompacta igual ao original
    const tamComp = z.readUInt32LE(18), tamNome = z.readUInt16LE(26);
    const dados = zlib.inflateRawSync(z.subarray(30 + tamNome, 30 + tamNome + tamComp)).toString("utf8");
    expect(dados).toBe(XML_COMPLETO);
  });
});

describe("leitura de ZIP", () => {
  it("lê de volta os arquivos de um ZIP (ida e volta)", () => {
    const z = criarZip([{ nome: "pasta/a.xml", conteudo: XML_COMPLETO }, { nome: "b.xml", conteudo: XML_RESUMO }]);
    const arqs = lerZip(z);
    expect(arqs.map((a) => a.nome)).toEqual(["pasta/a.xml", "b.xml"]);
    expect(arqs[0].dados.toString("utf8")).toBe(XML_COMPLETO);
    expect(arqs[1].dados.toString("utf8")).toBe(XML_RESUMO);
  });
  it("recusa arquivo que não é ZIP", () => {
    expect(() => lerZip(Buffer.from("nao sou um zip, sou texto qualquer com mais de 22 bytes"))).toThrow();
  });
});

describe("código de barras CODE-128C do DANFE", () => {
  it("tabela padrão: 106 símbolos de 11 módulos, todos diferentes", () => {
    expect(CODE128).toHaveLength(106);
    for (const p of CODE128) expect(p.split("").reduce((s, c) => s + Number(c), 0)).toBe(11);
    expect(new Set(CODE128).size).toBe(106);
  });
  it("codifica a chave com início C, dígito verificador e fim", () => {
    const seq = code128C(CHAVE);
    // início(1) + 22 pares + verificador(1) = 24 símbolos de 6 larguras + fim de 7
    expect(seq.length).toBe(24 * 6 + 7);
    expect(seq.startsWith(CODE128[105])).toBe(true);
    expect(seq.endsWith("2331112")).toBe(true);
    // exemplo conhecido: "12" → início C(105) + 12 + verificador (105 + 12) % 103 = 14
    expect(code128C("12")).toBe(CODE128[105] + CODE128[12] + CODE128[14] + "2331112");
  });
});
