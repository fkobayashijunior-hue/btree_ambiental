-- ============================================
-- SQL para rodar na Hostinger (phpMyAdmin)
-- Data: 03/05/2026
-- ============================================

-- 1. Verificar se a coluna client_id existe em collaborators (já deve existir)
-- Se não existir, rodar:
-- ALTER TABLE collaborators ADD COLUMN client_id INT NULL;

-- 2. Verificar se a coluna client_id existe em equipment
-- Se não existir, rodar:
-- ALTER TABLE equipment ADD COLUMN client_id INT NULL;

-- 3. Verificar qual é o ID do Juliano na tabela users
-- (ele deve ter feito login e ter um registro lá)
SELECT id, name, email FROM users WHERE email = 'jmoro1980@gmail.com';

-- 4. Vincular o Juliano (collaborator id=12) ao user dele
-- IMPORTANTE: Substitua o XXX pelo ID retornado na query acima
-- UPDATE collaborators SET user_id = XXX WHERE id = 12;

-- 5. Verificar qual é o ID do cliente SIMFLOR
SELECT id, name FROM clients WHERE name LIKE '%SIMFLOR%' OR name LIKE '%simflor%';

-- 6. Vincular o Juliano ao cliente SIMFLOR
-- IMPORTANTE: Substitua o YYY pelo ID do cliente SIMFLOR retornado acima
-- UPDATE collaborators SET client_id = YYY WHERE id = 12;

-- 7. Vincular equipamentos da SIMFLOR (se necessário)
-- UPDATE equipment SET client_id = YYY WHERE id IN (lista_de_ids);

-- 8. Configurar permissões do Juliano (após vincular user_id)
-- Isso será feito automaticamente pelo sistema quando o admin configurar
-- no Controle de Acesso, ou pode ser feito manualmente:
-- INSERT INTO user_permissions (user_id, modules, profile, allowed_client_ids)
-- VALUES (XXX, '["cargas","minha-carga","gastos-extras","abastecimento","equipamentos","colaboradores","presencas","manutencao"]', 'encarregado', '[YYY]');
