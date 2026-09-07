# Contexto: Módulo Financeiro (Sicoob + Conta Azul) — BTREE Ambiental

Resumo técnico de tudo que foi implementado numa sessão de desenvolvimento,
para retomar o contexto em uma conversa futura sem precisar reler tudo.

**Stack do projeto:** React 19 + TypeScript + tRPC 11 + Drizzle ORM (MySQL) +
Express, hospedado na Hostinger. Produção: `btreeambiental.com` (deploy
automático via GitHub Actions ao push em `principal`). Staging:
`staging.btreeambiental.com` (deploy manual via zip — ver
`GUIA_DEPLOY_STAGING_HOSTINGER.md`).

---

## 1. Visão geral do que foi construído

Um módulo financeiro completo dentro do menu **Financeiro**, com 5 sub-abas:

| Aba | Rota | Arquivo |
|---|---|---|
| Contas a Receber | `/contas-a-receber` | `client/src/pages/ContasAReceberPage.tsx` |
| Extrato Movimentações | `/extrato-movimentacoes` | `client/src/pages/ExtratoMovimentacoesPage.tsx` |
| Fluxo de Caixa | `/fluxo-de-caixa` | `client/src/pages/FluxoCaixaPage.tsx` |
| Contas a Pagar | `/contas-a-pagar` | `client/src/pages/ContasAPagarPage.tsx` |

Backend em dois routers tRPC:
- `server/routers/sicoob.ts` — boletos, extrato bancário, fluxo de caixa,
  contas a pagar, categorias financeiras
- `server/routers/contaazul.ts` — notas fiscais, OAuth2, status manual

---

## 2. Integração Sicoob (boletos + extrato bancário)

### Autenticação
- mTLS com certificado `.pfx` (`SICOOB_CERT_PATH` + `SICOOB_CERT_PASSPHRASE`)
- Token OAuth2 (`client_credentials`) cacheado em memória, com `id_token`
  enviado em todas as chamadas
- Variáveis: `SICOOB_CLIENT_ID`, `SICOOB_NUMERO_CLIENTE`, `SICOOB_NUMERO_CONTA`,
  `SICOOB_CODIGO_MODALIDADE`, `SICOOB_TOKEN_URL` (opcional, tem default)

### Boletos → aba "Contas a Receber"
- Sync busca boletos por CNPJ de `buyer_clients` ativos, em janelas de
  **35 dias** (limite da API), 6 meses pra trás e 6 meses pra frente
- Tabela `sicoob_boletos`: `nossoNumero` (UNIQUE), `seuNumero`,
  `dataEmissao`, `nfReferente` (extraído via regex de `mensagensInstrucao`),
  `valor`, `valorEditado` (protege edição manual de sobrescrita no sync),
  `situacao` (1=Em Aberto, 2=Baixado, 3=Liquidado — extraído do campo string
  `situacaoBoleto`, não `codigoSituacao`)
- **Baixado (2) não entra em nenhum total** dos cards; Liquidado (3) conta
  como Recebido
- Coluna "Total (R$)" editável inline (clique → input → Enter/blur)
- Sincronização automática via cron (7h, 12h, 18h) em `server/_core/index.ts`

### Extrato bancário → aba "Extrato Movimentações"
- Endpoint: `GET /conta-corrente/v4/extrato/{mes}/{ano}`, também limitado a
  35 dias por chamada (chunking)
- Tabela `sicoob_extrato`: UNIQUE em `(numero_lancamento, mes, ano)`,
  guarda `saldoAnterior`/`saldoAtual` em `sicoob_saldo_mes` (usado como
  saldo inicial do Fluxo de Caixa)
- Filtros: período de datas, **Tipo (Débito/Crédito)**, ordenação clicável
  em todas as colunas
- Campo `categoria` (ver seção 6 — categorização automática)

---

## 3. Fluxo de Caixa

Mescla **3 fontes** numa timeline diária, com regra de dedução cuidadosa
(módulo puro testado: `server/utils/fluxoCaixaProjecao.ts`):

1. **Extrato realizado** (Sicoob) — fonte de verdade pros dias já ocorridos
2. **Lançamentos futuros importados via planilha Excel** (botão "Importar
   planilha futura", tabela `sicoob_lancamentos_futuros`) — só conta se o
   dia ainda **não tem** extrato realizado (evita dupla contagem)
3. **Boletos "Em Aberto" do Sicoob** (por data de vencimento) — **sempre
   somados**, mesmo em dias com extrato realizado, porque a query já filtra
   só o que continua pendente (`situacao = 1`); representa saldo residual
   ainda não pago (ex: 2 boletos previstos, só 1 pago no dia)

> **Decisão explícita do usuário:** a projeção de **NFs da Conta Azul foi
> removida** do Fluxo de Caixa — só boletos Sicoob entram na projeção de
> recebimentos futuros.

Cada dia projetado tem um badge "previsto" (fundo amarelo/itálico) e é
**expansível** (clique) mostrando o detalhamento de quais boletos específicos
ainda não foram pagos naquele dia (`pendenciasPorDia` no endpoint
`fluxoCaixaDiario`).

---

## 4. Integração Conta Azul (Notas Fiscais)

### Autenticação (OAuth2 com refresh_token rotativo)
- `CONTAAZUL_CLIENT_ID` / `CONTAAZUL_CLIENT_SECRET` no `.env`
- `refresh_token` **não é env var** — fica salvo na tabela `contaazul_tokens`
  (configurado pela UI: Contas a Receber → aba Notas Fiscais → "Configurar")
- A cada renovação, salva o novo `refresh_token` **antes** de usar o
  `access_token` (evita perda em caso de falha no meio do processo)
- Cache de `access_token` em memória, renovado 5 min antes de expirar

### Sync de NFs
- `GET /v1/notas-fiscais` em chunks de **15 dias** (limite da API), com
  paginação dentro de cada chunk
- Para cada NF, busca o **XML completo** (`GET /v1/notas-fiscais/{chave}`)
  e faz parsing via regex (`parseNFXml`) pra extrair CNPJ destinatário, nome,
  valor total, data emissão, número da NF
- Processamento em batches de 3 (rate limiting)
- Tabela `notas_fiscais`: UNIQUE em `chave_acesso`

### Deduplicação com Sicoob
NFs e boletos são cruzados via `nf_referente = numero_nota AND
cnpj_pagador = cnpj_destinatario` (JOIN). Uma NF com boleto correspondente
mostra ícone de link verde e usa a data de vencimento do boleto; sem boleto,
mostra ícone cinza e usa a Data Previsão de Pagamento própria (seção 5).

---

## 5. Status NF (controle manual) + Data Previsão de Pagamento

### Status NF — campo interno, separado do status fiscal
- `notas_fiscais.statusFiscalContaAzul` = status vindo da API (ex: EMITIDA) —
  **nunca reflete se foi pago**
- `notas_fiscais.statusNfInterno` = `em_aberto` | `pago` | `cancelado` —
  controle manual via dropdown na tabela
- Ao marcar **Pago**: pede a data de confirmação (prompt), salva em
  `dataPagamentoConfirmado`
- Ao marcar **Cancelado**: confirma antes; sai de todos os cálculos
- **Cancelamento automático**: se o status fiscal da Conta Azul indicar
  cancelamento (regex `/cancel/i`), o sync marca `statusNfInterno = 'cancelado'`
  automaticamente (mas o campo continua editável manualmente por cima)
- Toda mudança de status é logada em `notas_fiscais_status_log` (usuário,
  valor anterior → novo, timestamp) — auditoria

### Data Previsão de Pagamento
Calculada **apenas para NFs sem boleto correspondente**, via módulo puro
testado `server/utils/prazoPagamento.ts` (17 testes). Regras cadastradas em
`cliente_prazo_pagamento` (CNPJ, tipo de regra, parâmetros JSON):

| Cliente | CNPJ | Regra |
|---|---|---|
| Sonoco | 00.496.586/0006-31 | Emissão + 7 dias corridos |
| Rebnic | 72.274.095/0001-42 | Faixa mensal (dia 20-31→dia 10 mês seguinte; dia 1-9→dia 20; dia 10-19→dia 30, ou último dia útil se o mês não tiver dia 30, ex: fevereiro) |
| Enerbio | 43.328.496/0001-30 | Emissão + 1 dia corrido |
| A.R.C. Logística | 11.609.581/0004-22 | Emissão + 21 dias corridos |
| Outros (default) | — | Fica em branco — não entra em nenhum card até ter regra |

Datas do Rebnic são **fixas** (não ajustam por fim de semana/feriado).

### Cards de resumo combinados
`Vencidos / Vencem hoje / A vencer / Recebidos / Total do período` agora
somam **Sicoob (`summaryBoletos`) + NFs sem boleto (`summaryNFsSemBoleto`)**.
Lógica pura testada em `server/utils/resumoNFs.ts` (9 testes):
- NF cancelada → nunca entra
- NF paga → soma em Recebidos pela `dataPagamentoConfirmado`
- NF em aberto → usa `dataPrevisaoPagamento` pra decidir vencido/hoje/a vencer,
  só se pertencer ao período filtrado na tela

### Valor editável
Coluna "Valor (R$)" das NFs editável inline (mesmo padrão dos boletos),
protegida por `valor_editado` (não é sobrescrita em sync futuro).

### Filtros na aba Notas Fiscais
Dropdown de **Destinatário** (populado dinamicamente) e **Status NF**
(Todos/Em aberto/Pago/Cancelado) — filtragem client-side.

---

## 6. Contas a Pagar (nova aba)

Puxa **débitos do extrato Sicoob** (mostrados como "Pago") + **lançamentos
futuros negativos** importados via planilha (mesma tabela
`sicoob_lancamentos_futuros` do Fluxo de Caixa, mesmo botão de import),
mostrados como Vencido/Vence hoje/A vencer conforme a data.

### Categorização
- Tabela `categorias_financeiras` (nome, tipo `receita`/`despesa`, ativo) —
  CRUD completo (criar, editar inline, **excluir** via soft-delete
  `ativo=0`, preserva histórico)
- Seed automático com 21 categorias do negócio (Combustível, Pedágio,
  Manutenção, Compra de Equipamento, Frete Terceirizado, Multas, Seguros,
  Pneus, Folha CLT, Diaristas, Benefícios, Encargos, Refeição, Hospedagem,
  Administrativo, Fornecedores, Impostos e Taxas, Tarifas Bancárias,
  Contabilidade/Jurídico, Recebimento de Frete, Outras Receitas)
- Coluna "Categoria" editável por dropdown em cada linha

### Categorização automática
Módulo puro `server/utils/categorizacaoAutomatica.ts` (15 testes) —
`inferirCategoria(descricao, complemento)` casa palavras-chave (ex:
"PEDÁGIO/SICOOB TAG" → Pedágio, "TARIFA BANCÁRIA" → Tarifas Bancárias,
"HOTEL/HOSPEDAGEM" → Hospedagem/Diária de Viagem). Aplicada:
- No sync do extrato e na importação da planilha — só preenche se
  `categoria IS NULL` (nunca sobrescreve edição manual)
- Backfill automático na migration pra lançamentos já sincronizados sem categoria

### Ordenação
Todas as colunas da tabela são clicáveis (Vencimento, Pagamento, Descrição,
Nº Documento, Categoria, Valor, Situação) — mesmo padrão do Extrato
Movimentações.

---

## 7. Schema do banco (tabelas novas/alteradas nesta sessão)

```
sicoob_boletos           + seu_numero, data_emissao, nf_referente, valor_editado, UNIQUE(nosso_numero)
sicoob_extrato            + numero_documento, categoria; saldo em sicoob_saldo_mes
sicoob_saldo_mes          NOVA — saldo_inicial/saldo_final por mês (UNIQUE mes+ano)
sicoob_lancamentos_futuros NOVA — importação de planilha, + categoria
categorias_financeiras    NOVA — nome (UNIQUE), tipo, ativo
contaazul_tokens          NOVA — refresh_token/access_token (linha única id=1)
notas_fiscais             NOVA — chave_acesso (UNIQUE), status_fiscal_conta_azul,
                                 status_nf_interno, data_pagamento_confirmado,
                                 data_previsao_pagamento, valor_editado
notas_fiscais_status_log  NOVA — auditoria de mudança de status
cliente_prazo_pagamento   NOVA — regras de prazo por CNPJ (seed automático)
```

Todas as migrations são **idempotentes** (`CREATE TABLE IF NOT EXISTS` +
`ALTER TABLE ADD COLUMN` em `try/catch`) e rodam automaticamente no startup
do app (`runAutoMigrations()` em `server/_core/index.ts`) — **não precisa
rodar SQL manual em nenhum ambiente**, só reiniciar o app.

---

## 8. Módulos puros testados (`server/utils/`)

| Arquivo | O que testa | Testes |
|---|---|---|
| `prazoPagamento.ts` | Cálculo de Data Previsão de Pagamento por cliente | 17 |
| `resumoNFs.ts` | Agregação dos cards (NFs sem boleto) | 9 |
| `fluxoCaixaProjecao.ts` | Merge das 3 fontes do Fluxo de Caixa | 7 |
| `categorizacaoAutomatica.ts` | Sugestão de categoria por palavra-chave | 15 |

Total: 48 testes, todos passando (`npx vitest run server/utils`).

---

## 9. Deploy para staging (Hostinger)

Guia completo em **`GUIA_DEPLOY_STAGING_HOSTINGER.md`**, script pronto em
**`scripts/build-staging-package.ps1`**. Resumo:

1. `.\scripts\build-staging-package.ps1` — builda tudo, corrige CRLF do
   `build.sh`, empacota (sem `.env`/`.git`/`node_modules`), zipa com
   caminhos `/` (nunca usar `Compress-Archive` do PowerShell — quebra no Linux)
2. Upload manual na tela **Implantações** do hPanel, sempre conferindo que o
   site selecionado é `staging.btreeambiental.com`
3. **Pegadinha importante descoberta**: a tela de Implantações usa build
   **versionado** — cada deploy roda numa pasta nova
   `hbuilds/versions/<uuid>/nodejs/`, diferente da pasta estática `nodejs/`
   visível no Gerenciador de Arquivos. Qualquer variável de ambiente com
   caminho de arquivo (ex: `SICOOB_CERT_PATH`) **precisa ser caminho
   absoluto** apontando pra pasta estática, nunca relativo — senão nunca
   encontra o arquivo em deploys futuros
4. `build.sh` foi corrigido pra **nunca** arriscar sobrescrever produção:
   só copia assets pro `public_html` se achar essa pasta **um nível acima**
   de onde está rodando (nunca sobe mais que isso)

### Variáveis de ambiente necessárias no staging (além das já existentes)
```
SICOOB_CLIENT_ID, SICOOB_NUMERO_CLIENTE, SICOOB_NUMERO_CONTA,
SICOOB_CODIGO_MODALIDADE, SICOOB_CERT_PASSPHRASE,
SICOOB_CERT_PATH=<caminho ABSOLUTO da pasta estática nodejs/certs/...>
CONTAAZUL_CLIENT_ID, CONTAAZUL_CLIENT_SECRET
```
O `refresh_token` da Conta Azul precisa ser configurado de novo no staging
pela própria UI (banco separado do de produção).

---

## 10. Pendências / próximos passos possíveis

- Confirmar que a sincronização do Sicoob funciona no staging depois da
  correção do `SICOOB_CERT_PATH` (caminho absoluto)
- Configurar o `refresh_token` da Conta Azul no ambiente de staging
- Cadastrar regras de prazo de pagamento pra clientes fora da lista atual,
  conforme forem aparecendo NFs sem boleto e sem previsão
- Avaliar se vale adicionar `.gitattributes` forçando `LF` em `*.sh` pra
  evitar o problema de CRLF se o `build.sh` for editado de novo no Windows
  (foi oferecido, ainda não decidido)
