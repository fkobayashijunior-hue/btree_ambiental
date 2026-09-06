# Estado da sessão — 06/09/2026 (v2)

## SSH/Deploy
- SSH: u629128033@212.1.211.65 porta 65002, senha Fkob*jr14 (usuário deve trocar depois).
- DB_PASSWORD real é lido do /proc/<PID>/environ do processo lsnode de PRODUÇÃO (não staging). PID varia.
- Atualização manual: cd ~/domains/btreeambiental.com/nodejs && git pull origin main && cp dist/index.js ~/domains/btreeambiental.com/hbuilds/current/nodejs/dist/index.js && cp -r dist/public/* ~/domains/btreeambiental.com/hbuilds/current/nodejs/dist/public/ && touch ~/domains/btreeambiental.com/hbuilds/current/nodejs/tmp/restart.txt
- Deploy automático nem sempre reinicia o Node — às vezes precisa do restart manual.

## Compras (purchase_requests)
- Router reescrito com sql`` template (placeholders ? NÃO funcionam no driver MariaDB deste projeto).
- Banco real: colunas link, requested_at/read_at/purchased_at/expected_arrival/received_at BIGINT (epoch ms), status ENUM ampliado com analisando/comprando, urgency low/medium/high/critical.
- Página de detalhe reescrita: visão Ficha + Grade editável (updateStatus, updateDates), excluir, responder, rejeitar.
- Listagem com coluna Cód. # (adicionada, pendente de commit).
- Imagens antigas com valor inválido foram limpas no banco (images=NULL). Frontend protegido com try/catch.
- Frontend JSON.parse de images protegido.

## Orçamentos (quotationRequests)
- Router: server/routers/quotationRequests.ts (569 linhas). Tabela quotations no schema.
- Página: client/src/pages/QuotationsPage.tsx e PublicQuotationPage.tsx.
- Pedidos do usuário pendentes:
  1. Link de resposta para fornecedor NÃO pedir recadastro (só respostas).
  2. Nome fantasia (trade_name) — suppliers já tem tradeName; verificar se exibido.
  3. Perguntar ao fornecedor o que ele vende (categorias) — sugerir campo.
  4. Editar categorias do fornecedor.
  5. Resumo em planilha com melhores preços no topo + lista de fornecedores (nome fantasia) com valores e marcas; quantidade solicitada e valores totais no topo.
  6. Opção de mandar pelo WhatsApp só melhores preços com link para detalhamento.

## v3 — Orçamentos (em andamento)
- Tabelas: quotation_requests (items_json dos itens solicitados), quotation_responses (items_json com name,quantity,unit,price,brand,notes + supplierName,cnpj,sellerName,sellerPhone,sellerEmail,notes).
- PublicQuotationPage.tsx (588 linhas) já tem: formulário do fornecedor com campos de empresa + itens com brand/notes, addExtraItem, edit via getMyResponse por supplierName.
- submitResponse já aceita brand/notes por item e cria responseToken.
- PENDENTE de implementar:
  1. Edição de urgência na Grade do detalhe (FEITO no código, falta build/push).
  2. Campo "packaging" (embalagem: 1L,5L,10L,20L,200L) por item de resposta — adicionar no zod schema do submitResponse/updateResponse e salvar no itemsJson (não precisa migration no banco pois itemsJson é JSON).
  3. Nome fantasia (trade_name) — suppliers já tem tradeName; garantir exibição na página do fornecedor e no resumo interno.
  4. Página de detalhamento de orçamento (QuotationsPage ou nova rota /orcamentos/:token/resumo) com: melhores preços no topo, lista de fornecedores (nome fantasia) com valores/marcas, quantidade solicitada e totais no topo; botão WhatsApp com resumo + link.
  5. Fornecedor: link de resposta SEM recadastro — hoje getMyResponse exige supplierName; melhorar para carregar dados direto pelo token quando já houver resposta (responseToken) ou pré-preencher.
  6. Pergunta "o que você vende" (categorias) — adicionar campo categories na resposta ou no supplier; permitir edição interna.
- Padrão do projeto: driver mysql2 NÃO suporta db.execute(sql, params) com ?; SEMPRE usar sql`` template do drizzle.
