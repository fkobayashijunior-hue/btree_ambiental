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
