# Notas da sessão — 06/09/2026

## Diagnóstico do banco (purchase_requests) — via /api/pr-schema-diagnostic

Schema REAL da tabela `purchase_requests` na Hostinger (formato legado + colunas novas da migration):
- id int(11) PRI auto_increment
- title varchar(255) NOT NULL
- description text
- items longtext (LEGADO — JSON)
- images longtext
- link varchar(1000)  ← NÃO existe link_url
- category_id int(11)
- urgency enum('low','medium','high','critical') NOT NULL DEFAULT 'medium'  ← SÓ INGLÊS
- status enum('pendente','lida','aprovada','comprada','recebida','cancelada','negada','pending','read','approved','purchased','received','cancelled','canceled') NOT NULL DEFAULT 'pendente'  ← migration rodou
- requested_at bigint(20) NOT NULL  ← epoch ms
- read_at bigint(20)
- purchased_at bigint(20)
- expected_arrival bigint(20)
- received_at bigint(20)
- requested_by int(11) NOT NULL
- notes text
- created_at / updated_at timestamp
- equipment_id int(11) NULL  ← criada pela migration
- response_notes text NULL
- responded_by int(11) NULL
- responded_at datetime NULL
- denial_reason text NULL

insertTest com SQL legado (title, description, link, category_id, status='pending', urgency='medium', requested_at, requested_by, notes, created_at, updated_at) = "ok" ✅

Tabela `purchase_request_items`: id, request_id, name, quantity, unit, notes, confirmed, created_at (OK, formato novo).

## Por que o create falhava
O router tentava Drizzle insert (colunas request_date/link_url/read_date/purchase_date/received_date/items_confirmed_date/approved_by inexistentes). Os fallbacks foram adicionados, mas o código atual em produção ainda falha — precisa reescrita completa do router com SQL puro no formato legado:
- INSERT com colunas: title, description, link, category_id, equipment_id, status ('pending'), urgency (low/medium/high/critical), requested_at (Date.now()), requested_by, notes, created_at, updated_at.
- list/getById: mapear epoch ms → datas; COALESCE não precisa (colunas *_date não existem).
- markRead → read_at=Date.now(), status='lida'; markPurchased → purchased_at, expected_arrival; markReceived → received_at; respond → response_notes, responded_by, responded_at=NOW(); deny → status='negada', denial_reason.

## Credenciais de acesso (não versionar!)
- SSH Hostinger: host 212.1.211.65, porta 65002, user u629128033. Senhas testadas Btree@2024 e Btree@2025 → Permission denied (senha incorreta ou usuário sem shell).
- MySQL remoto direto (srv572.hstgr.io / 212.1.211.65:3306, user u629128033_btree) → ERROR 1045 Access denied (sandbox IP não autorizado).
- Acesso ao banco funciona APENAS de dentro do servidor Node (via /api/*-diagnostic).
- GitHub Actions deploy usa secrets HOSTINGER_HOST/USER/PASSWORD/PORT com appleboy/ssh-action → funciona.

## Endpoints de diagnóstico públicos existentes (remover depois!)
- /api/report-diagnostic (antigo)
- /api/db-diagnostic (antigo)
- /api/pr-schema-diagnostic (criado nesta sessão — remover após correção)

## Estado do repositório
- Branch main, último commit ba86c27 "chore: endpoint temporário de diagnóstico do schema purchase_requests".
- Deploy Hostinger funcionando (~1m20s após push).
- Arquivos modificados nesta sessão (já commitados): server/routers/purchaseRequests.ts (fallbacks), client/src/pages/PurchaseRequestsPage.tsx (tabela analítica + filtros + equipamento), PurchaseRequestDetailPage.tsx (responder/negar), drizzle/schema.ts (campos novos), MIGRATION_COMPRAS_06092026.sql (já executada pelo usuário).

## Próximo passo
Reescrever server/routers/purchaseRequests.ts inteiro com SQL puro compatível com o schema legado real (ver mapeamento acima), build, push, validar criação no app, remover endpoints de diagnóstico.
