-- ============================================================
-- BTREE Ambiental — Corrigir unidade (m³ vs ton) no Controle de Notas
-- Data: 04/09/2026
-- A unidade exibida vem do campo price_type do DESTINO cadastrado
-- (tabela cargo_destinations). Se um destino que trabalha em m³
-- está com price_type = 'ton', o Controle de Notas mostra toneladas.
-- ============================================================

-- PASSO 1 (verificação): liste todos os destinos e seus tipos de preço
SELECT id, name, nickname, price_type, price_per_ton, price_per_m3
FROM cargo_destinations
ORDER BY name;

-- PASSO 2 (correção): após identificar o ID do destino que deve ser m³
-- (ex.: "Líder"), rode o UPDATE abaixo trocando o valor de ID_PELO_ID_CORRETO.
-- Exemplo: se o destino Líder tem id = 5, fica: WHERE id = 5;

UPDATE cargo_destinations
SET price_type = 'm3'
WHERE id = ID_PELO_ID_CORRETO;

-- Dica: se quiser corrigir pelo nome (sem precisar do ID), pode usar:
-- UPDATE cargo_destinations SET price_type = 'm3' WHERE name LIKE '%Líder%' OR nickname LIKE '%Líder%';

-- PASSO 3 (verificação): confira se ficou correto
-- SELECT id, name, nickname, price_type FROM cargo_destinations WHERE name LIKE '%Líder%' OR nickname LIKE '%Líder%';
