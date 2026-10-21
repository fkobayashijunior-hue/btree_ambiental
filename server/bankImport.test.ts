import { describe, it, expect } from "vitest";
import { parseOfx, parseCsv, parseExtrato, parseValorBR, parseDataFlex } from "./utils/bankImport";

describe("parseValorBR", () => {
  it("formatos brasileiros e internacionais", () => {
    expect(parseValorBR("1.234,56")).toBe(1234.56);
    expect(parseValorBR("-1.234,56")).toBe(-1234.56);
    expect(parseValorBR("1234.56")).toBe(1234.56);
    expect(parseValorBR("R$ 99,90")).toBe(99.9);
    expect(parseValorBR("(150,00)")).toBe(-150);
    expect(parseValorBR("200,00 D")).toBe(-200);
    expect(parseValorBR("200,00 C")).toBe(200);
    expect(parseValorBR("150,00-")).toBe(-150);
    expect(parseValorBR("abc")).toBeNull();
    expect(parseValorBR("")).toBeNull();
  });
});

describe("parseDataFlex", () => {
  it("aceita vários formatos", () => {
    expect(parseDataFlex("15/09/2026")).toBe("2026-09-15");
    expect(parseDataFlex("2026-09-15")).toBe("2026-09-15");
    expect(parseDataFlex("15-09-26")).toBe("2026-09-15");
    expect(parseDataFlex("20260915120000[-3:BRT]")).toBe("2026-09-15");
    expect(parseDataFlex("xx")).toBeNull();
  });
});

const OFX_SGML = `OFXHEADER:100
<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260910120000[-3:BRT]
<TRNAMT>-250.00
<FITID>A1
<MEMO>COMPRA POSTO
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260911
<TRNAMT>1000.50
<FITID>A2
<NAME>PIX RECEBIDO
<MEMO>CLIENTE X
</STMTTRN>
</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;

describe("parseOfx", () => {
  it("lê OFX no formato SGML (sem fechamento de tags)", () => {
    const r = parseOfx(OFX_SGML);
    expect(r.transacoes).toHaveLength(2);
    expect(r.transacoes[0]).toMatchObject({ data: "2026-09-10", valor: -250, descricao: "COMPRA POSTO", documento: "A1" });
    expect(r.transacoes[1]).toMatchObject({ data: "2026-09-11", valor: 1000.5, descricao: "PIX RECEBIDO — CLIENTE X" });
  });

  it("hash estável ao reimportar e distinto para linhas idênticas no mesmo dia", () => {
    const a = parseOfx(OFX_SGML).transacoes.map(t => t.hash);
    const b = parseOfx(OFX_SGML).transacoes.map(t => t.hash);
    expect(a).toEqual(b);
    const dup = OFX_SGML.replace("</BANKTRANLIST>", `<STMTTRN>\n<DTPOSTED>20260910\n<TRNAMT>-250.00\n<FITID>A1\n<MEMO>COMPRA POSTO\n</STMTTRN></BANKTRANLIST>`);
    const hs = parseOfx(dup).transacoes.map(t => t.hash);
    expect(new Set(hs).size).toBe(hs.length);
  });
});

describe("parseCsv", () => {
  it("CSV com ; e coluna Valor", () => {
    const csv = `Extrato do cartão\nData;Descrição;Valor\n10/09/2026;POSTO SHELL;-120,50\n11/09/2026;ESTORNO;30,00\nTotal;;-90,50`;
    const r = parseCsv(csv);
    expect(r.transacoes).toHaveLength(2);
    expect(r.transacoes[0]).toMatchObject({ data: "2026-09-10", descricao: "POSTO SHELL", valor: -120.5 });
    expect(r.transacoes[1].valor).toBe(30);
  });

  it("CSV com colunas Débito e Crédito e campos entre aspas", () => {
    const csv = `Data,Histórico,Débito,Crédito\n"01/09/2026","PAGTO, FORNECEDOR","1.200,00",\n"02/09/2026","DEPÓSITO",,"500,00"`;
    const r = parseCsv(csv);
    expect(r.transacoes.map(t => t.valor)).toEqual([-1200, 500]);
    expect(r.transacoes[0].descricao).toBe("PAGTO, FORNECEDOR");
  });

  it("cabeçalho desconhecido gera aviso, não erro", () => {
    const r = parseCsv("a;b;c\n1;2;3");
    expect(r.transacoes).toHaveLength(0);
    expect(r.avisos[0]).toMatch(/Cabeçalho/);
  });
});

describe("parseExtrato", () => {
  it("detecta o formato", () => {
    expect(parseExtrato(OFX_SGML).formato).toBe("ofx");
    expect(parseExtrato("Data;Valor\n01/01/2026;10,00", "x.csv").formato).toBe("csv");
  });
});
