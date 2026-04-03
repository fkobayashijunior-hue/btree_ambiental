-- ============================================================
-- PROMOVER DIRETORES A ADMIN — BTREE Ambiental
-- Execute no phpMyAdmin → banco u629128033_btree_ambienta
-- ============================================================

-- Ver usuários atuais para confirmar os nomes
SELECT id, name, email, role FROM users ORDER BY id;

-- Promover TODOS os usuários com esses nomes a admin
-- (ajuste o email se necessário)
UPDATE users
SET role = 'admin'
WHERE name LIKE '%Fabio%Kobayashi%'
   OR name LIKE '%Fábio%Kobayashi%'
   OR name LIKE '%Julia%Yui%'
   OR name LIKE '%Julia%Sonohara%'
   OR email LIKE '%fabio%kobayashi%'
   OR email LIKE '%julia%yui%';

-- Confirmar resultado
SELECT id, name, email, role FROM users WHERE role = 'admin';

-- ============================================================
-- IMPORTANTE: Após executar, faça logout e login novamente
-- no sistema para que as permissões sejam atualizadas.
-- ============================================================
