// XMLs de exemplo (fictícios) usados nos testes
export const CHAVE = "41261112345678000190550010000159951000159950";

export const XML_COMPLETO = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><NFe><infNFe Id="NFe${CHAVE}" versao="4.00">
<ide><cUF>41</cUF><natOp>VENDA DE COMBUSTIVEL</natOp><mod>55</mod><serie>1</serie><nNF>15995</nNF><dhEmi>2026-11-19T10:22:33-03:00</dhEmi><tpNF>1</tpNF></ide>
<emit><CNPJ>12345678000190</CNPJ><xNome>AUTO POSTO BUENO BRANDAO LTDA</xNome><enderEmit><xLgr>RUA A</xLgr><nro>10</nro><xBairro>CENTRO</xBairro><xMun>ASTORGA</xMun><UF>PR</UF><CEP>86730000</CEP></enderEmit><IE>9012345678</IE></emit>
<dest><CNPJ>58616075000181</CNPJ><xNome>BTREE EMPREENDIMENTOS LTDA</xNome><IE>ISENTO</IE></dest>
<det nItem="1"><prod><cProd>001</cProd><xProd>OLEO DIESEL S10</xProd><NCM>27101921</NCM><CFOP>5656</CFOP><uCom>L</uCom><qCom>25.1230</qCom><vUnCom>6.2370000000</vUnCom><vProd>156.69</vProd></prod>
<imposto><ICMS><ICMS61><orig>0</orig><CST>61</CST></ICMS61></ICMS></imposto></det>
<total><ICMSTot><vBC>0.00</vBC><vICMS>0.00</vICMS><vST>0.00</vST><vProd>156.69</vProd><vFrete>0.00</vFrete><vSeg>0.00</vSeg><vDesc>0.00</vDesc><vIPI>0.00</vIPI><vOutro>0.00</vOutro><vNF>156.69</vNF></ICMSTot></total>
<transp><modFrete>9</modFrete></transp><pag><detPag><tPag>01</tPag><vPag>156.69</vPag></detPag></pag>
<infAdic><infCpl>PLACA ABC1D23</infCpl></infAdic></infNFe></NFe>
<protNFe versao="4.00"><infProt><tpAmb>1</tpAmb><chNFe>${CHAVE}</chNFe><dhRecbto>2026-11-19T10:22:40-03:00</dhRecbto><nProt>141260000000001</nProt><cStat>100</cStat></infProt></protNFe></nfeProc>`;

export const XML_RESUMO = `<resNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.01"><chNFe>${CHAVE}</chNFe><CNPJ>12345678000190</CNPJ><xNome>AUTO POSTO BUENO BRANDAO LTDA</xNome><IE>9012345678</IE><dhEmi>2026-11-19T10:22:33-03:00</dhEmi><tpNF>1</tpNF><vNF>156.69</vNF><digVal>abc=</digVal><dhRecbto>2026-11-19T10:22:40-03:00</dhRecbto><nProt>141260000000001</nProt><cSitNFe>1</cSitNFe></resNFe>`;

