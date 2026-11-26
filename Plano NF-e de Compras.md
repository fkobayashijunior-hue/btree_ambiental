# Plano: Módulo "Notas de Compra" (NF-e recebidas via SEFAZ)

## Objetivo
Buscar automaticamente na SEFAZ as NF-e emitidas **contra o CNPJ da BTREE** (notas de compra) e guardar no site o
**XML** e o **PDF (DANFE)** de cada uma, com uma tela parecida com a "Notas de compras" do Conta Azul.

**Módulo independente (fase de teste):** não lança nada em Contas a Pagar, Abastecimento, Estoque ou outro módulo.
Só busca, guarda, lista e permite baixar. Integrações ficam para depois, se o teste der certo.

## Como funciona a SEFAZ (o que define o desenho)
- **Serviço "Distribuição de DF-e"** (Ambiente Nacional, `NFeDistribuicaoDFe`): devolve os documentos fiscais destinados
  ao CNPJ. Cada documento tem um número sequencial (**NSU**); o sistema guarda o último NSU recebido e pede "a partir dele".
  Vem no máximo 50 documentos por consulta, compactados (gzip + base64).
- **Autenticação:** certificado digital **e-CNPJ A1** (o mesmo `.pfx` já usado na integração Sicoob, via `SICOOB_CERT_PATH`).
  A consulta não precisa de assinatura no XML, só o certificado na conexão (TLS mútuo), como já é feito no Sicoob.
- **Resumo × XML completo:** em geral a SEFAZ entrega primeiro um **resumo** (`resNFe`: chave, CNPJ e nome do emitente,
  valor, data, situação). O **XML completo** (`procNFe`) só é liberado depois que a empresa envia a manifestação
  **"Ciência da Operação"** (evento 210210), que é **neutra** (só registra que tomou conhecimento; não aceita nem recusa).
  Esse evento precisa ser **assinado** com o certificado (assinatura XML).
- **Limites:** quando não há nada novo (código 137), é obrigatório esperar **1 hora** antes de consultar de novo; abusar
  gera bloqueio temporário ("consumo indevido", código 656). Por isso a busca é periódica, não instantânea.
- **Janela:** a SEFAZ só distribui documentos dos últimos **~90 dias**. Notas mais antigas entram por
  "Buscar pela chave" (consulta por chave de acesso, também pela Distribuição DF-e) ou por "Importar XML" (upload manual).
- **PDF:** a SEFAZ **não fornece PDF**. O DANFE é gerado pelo próprio sistema a partir do XML, no layout padrão.
- **Fora do escopo do serviço:** NFS-e (notas de serviço, de prefeitura) e CT-e de frete não fazem parte desta fase.

## Fluxo
1. **Rotina automática** no servidor (a cada 1 hora, das 6h às 22h; respeita a espera de 1 hora exigida pela SEFAZ):
   consulta a partir do último NSU e repete enquanto houver mais documentos (`ultNSU < maxNSU`).
2. Para cada documento recebido:
   - **Resumo (`resNFe`)** → grava a nota como "Resumo" e envia a **Ciência da Operação** automaticamente.
   - **XML completo (`procNFe`)** → grava o XML, extrai os dados (emitente, número, série, valor, data, itens) e marca "Completa".
   - **Evento de cancelamento** do emitente → marca a nota como "Cancelada pelo emitente".
3. Na consulta seguinte (1 hora depois), as notas que receberam a Ciência chegam com o XML completo.
4. **PDF (DANFE):** gerado no servidor a partir do XML e guardado na primeira vez em que alguém pedir (ou logo que o XML
   completo chegar). Botão "Baixar PDF" na tela.

## Banco de dados (tabelas criadas sob demanda, padrão `ensureTables`)
- **`nfe_compras`**: `chave` (44 dígitos, UNIQUE), `nsu`, `emitente_cnpj`, `emitente_nome`, `emitente_ie`, `numero`, `serie`,
  `data_emissao`, `valor_total`, `situacao` (autorizada | cancelada | denegada), `tipo` (resumo | completa),
  `manifestacao` (nenhuma | ciencia_enviada | ciencia_erro), `manifestacao_em`, `xml` (MEDIUMTEXT, o XML completo),
  `xml_resumo` (TEXT), `pdf_url` (Cloudinary, raw) , `origem` (sefaz | chave | upload), `recebida_em`, `atualizada_em`.
  O XML fica no banco: cada nota tem ~5–30 KB; 60–100 notas/mês é pouco espaço.
- **`nfe_compras_itens`** (opcional nesta fase, ajuda a pesquisar): `nfe_id`, `codigo`, `descricao`, `ncm`, `cfop`,
  `quantidade`, `unidade`, `valor_unitario`, `valor_total`.
- **`nfe_compras_controle`**: `cnpj`, `ult_nsu`, `max_nsu`, `ultima_consulta`, `proxima_consulta_permitida`,
  `ultimo_status` (código e mensagem da SEFAZ), `ultimo_erro`.
- **`nfe_compras_log`**: cada consulta/evento (data, tipo, código SEFAZ, mensagem, quantos documentos) para diagnóstico.

## Servidor
- **`server/utils/sefazCertificado.ts`**: carrega o `.pfx` (reaproveita `SICOOB_CERT_PATH`/`SICOOB_CERT_PASSPHRASE`,
  ou variáveis próprias `NFE_CERT_PATH`/`NFE_CERT_PASSPHRASE` que, se vazias, caem nas do Sicoob), cria o agente HTTPS e
  extrai chave privada e certificado para assinar eventos. Mostra a **validade do certificado** (avisar 30 dias antes de vencer).
- **`server/utils/sefazDistribuicao.ts`**: monta o envelope SOAP `nfeDistDFeInteresse` (`distNSU` e `consChNFe`),
  envia, descompacta os `docZip` e devolve os documentos já identificados (resNFe, procNFe, resEvento, procEventoNFe).
- **`server/utils/sefazManifestacao.ts`**: monta e **assina** o evento 210210 (Ciência da Operação) e envia ao
  `NFeRecepcaoEvento4` do Ambiente Nacional; até 20 eventos por lote.
- **`server/utils/danfe.ts`**: gera o PDF do DANFE a partir do XML (layout padrão retrato: emitente, destinatário,
  chave com código de barras, impostos, transportador, itens, informações adicionais).
- **`server/routers/nfeCompras.ts`** (`moduleProcedure("notas-compra")`):
  `listar` (mês, busca por fornecedor/número/chave, paginação), `detalhe`, `baixarXml`, `baixarPdf`,
  `atualizarAgora` (respeita o intervalo da SEFAZ e avisa "próxima consulta permitida às HH:MM"),
  `buscarPorChave`, `importarXml` (upload manual), `status` (última atualização, último NSU, validade do certificado, erros),
  `baixarZipMes` (todos os XMLs do mês em um ZIP, para o contador).
- **Agendamento** em `server/_core/index.ts`, no mesmo padrão do `scheduleSicoobSync` (PM2 roda 1 instância, sem risco
  de duas rotinas ao mesmo tempo). Variável `NFE_COMPRAS_ATIVO=1` liga a rotina (desligada por padrão até o teste).
- **Dependências novas:** `node-forge` (ler o `.pfx` e assinar), `xml-crypto` (assinatura XML), `pdfkit` + `bwip-js`
  (DANFE e código de barras), `jszip` se ainda não estiver no projeto. Avaliar antes uma biblioteca pronta de NF-e para Node
  (ex.: geração de DANFE); se não for confiável, usar as acima.

## Tela "Notas de Compra" (menu Compras ou Financeiro)
Baseada na tela do Conta Azul:
- **Aviso no topo:** "Busca automática de NF-e — última atualização com a Receita Federal em 20/11/2026 às 07:11"
  (+ alerta se o certificado estiver perto de vencer ou se a última consulta deu erro).
- **Período:** `< Novembro de 2026 >` e botão **"Atualizar lista de notas"** (desabilitado com aviso quando a SEFAZ ainda
  não permite nova consulta).
- **Tabela:** Emissão · Fornecedor · Série - NF · Valor (R$) · Situação (Completa / Só resumo / Cancelada) ·
  ações **XML** e **PDF**. Paginação "10 registros por página", "Mostrando 1–10 de 63".
- **Pesquisar:** por fornecedor, CNPJ, número ou chave.
- **Detalhe da nota** (ao clicar): dados do emitente, valores, itens e histórico (recebida, ciência enviada, XML completo).
- **Botões extras:** "Buscar pela chave" (44 dígitos), "Importar XML" (upload), "Baixar XMLs do mês (ZIP)".
- **Celular:** cartões em vez de tabela, como nas outras telas.

## Permissão e menu
- Novo módulo `notas-compra` ("Notas de Compra") em `server/routers/permissions.ts` (grupo Compras), entrada no menu em
  `client/src/components/DashboardLayout.tsx` e no acesso rápido (`client/src/lib/quickAccessCatalog.ts`).
- Só quem tiver o módulo liberado vê; no início, só administradores.

## Fases
| Fase | O que entrega | Estimativa |
|---|---|---|
| 0 | Conferir o certificado (é e-CNPJ A1 da BTREE? validade?) e testar a conexão no **ambiente de homologação** da SEFAZ | ~0,5 dia |
| 1 | Distribuição DF-e: tabelas, consulta por NSU, gravar resumos e XMLs, rotina automática, log | ~2 dias |
| 2 | Manifestação "Ciência da Operação" automática (assinatura do evento) para liberar o XML completo | ~1,5 dia |
| 3 | Tela: lista por mês, pesquisa, detalhe, baixar XML, status da busca | ~1,5 dia |
| 4 | DANFE em PDF gerado a partir do XML, guardado no Cloudinary | ~1,5 dia |
| 5 | Extras: buscar pela chave, importar XML, ZIP do mês | ~1 dia |
| **Total** | | **≈ 8 dias** |

## Verificação
1. **Testes (vitest)** com XMLs reais de exemplo: descompactar `docZip`, identificar resumo/completo/evento, extrair dados,
   montar e assinar o evento (validar a assinatura), gerar o DANFE sem erro.
2. **Homologação da SEFAZ** primeiro (`tpAmb=2`), depois produção.
3. **Produção controlada:** ligar `NFE_COMPRAS_ATIVO=1`, rodar 1 consulta manual, conferir que as notas de novembro batem
   com a lista do Conta Azul (63 notas no print), conferir 2–3 PDFs contra o DANFE original.
4. Acompanhar o log por alguns dias (sem erro 656 de consumo indevido).

## Pontos de atenção
- **Ciência da Operação é automática:** ela é exigida para baixar o XML completo e não tem efeito de aceite. As
  manifestações conclusivas (Confirmação, Desconhecimento, Operação não realizada) **não** serão enviadas pelo sistema.
- **Conta Azul também consulta:** o NSU é por CNPJ, mas cada sistema guarda o seu; os dois podem consultar sem conflito.
  A Ciência já enviada pelo Conta Azul não atrapalha (a SEFAZ responde "evento já registrado", tratado como sucesso).
- **Certificado:** fica só na VPS (fora do GitHub). Quando vencer, a busca para; a tela avisa antes.
- **Notas antigas** (mais de ~90 dias): só por chave ou upload do XML.
- **Backup:** os XMLs ficam no banco, então entram no backup normal (`mysqldump`).
