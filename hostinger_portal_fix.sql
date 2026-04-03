-- ============================================================
-- BTREE Ambiental — Correção Portal do Cliente + Destinos
-- Execute DENTRO do banco u629128033_btree_ambienta
-- ============================================================

-- ============================================================
-- PASSO 1: DIAGNÓSTICO — Ver clientes cadastrados e suas cargas
-- ============================================================
-- Execute esta query primeiro para ver os clientes e quantas cargas têm:
SELECT 
  c.id, 
  c.name AS cliente_nome, 
  c.email,
  COUNT(cl.id) AS cargas_por_clientId,
  (SELECT COUNT(*) FROM cargo_loads cl2 
   WHERE cl2.client_name LIKE CONCAT('%', c.name, '%') 
   AND cl2.client_id IS NULL) AS cargas_por_nome_sem_id
FROM clients c
LEFT JOIN cargo_loads cl ON cl.client_id = c.id
WHERE c.active = 1
GROUP BY c.id, c.name, c.email
ORDER BY c.name;

-- ============================================================
-- PASSO 2: Ver cargas com client_name preenchido mas sem client_id
-- ============================================================
SELECT id, client_name, date, destination, status
FROM cargo_loads
WHERE client_id IS NULL 
  AND client_name IS NOT NULL 
  AND client_name != ''
ORDER BY date DESC
LIMIT 30;

-- ============================================================
-- PASSO 3: Vincular cargas ao cliente pelo nome (SUBSTITUA o nome)
-- Após ver o resultado do PASSO 1, substitua 'NOME_DO_CLIENTE'
-- pelo nome exato que aparece na coluna client_name das cargas
-- e 'ID_DO_CLIENTE' pelo id do cliente na tabela clients
-- ============================================================
-- UPDATE cargo_loads 
-- SET client_id = ID_DO_CLIENTE
-- WHERE client_name LIKE '%NOME_DO_CLIENTE%'
--   AND client_id IS NULL;

-- Exemplo para Fazenda GW (substitua 123 pelo id real):
-- UPDATE cargo_loads SET client_id = 123 WHERE client_name LIKE '%GW%' AND client_id IS NULL;

-- ============================================================
-- PASSO 4: Ver destinos cadastrados
-- ============================================================
SELECT id, name, city, state, client_id, active
FROM cargo_destinations
WHERE active = 1
ORDER BY name;

-- ============================================================
-- PASSO 5: Se não há destinos cadastrados, inserir os principais
-- (Substitua pelos destinos reais da operação)
-- ============================================================
-- INSERT INTO cargo_destinations (name, city, state, active) VALUES
--   ('Usina São Martinho', 'Pradópolis', 'SP', 1),
--   ('Usina Raízen', 'Piracicaba', 'SP', 1),
--   ('Pátio BTREE', 'Astorga', 'PR', 1);
