-- ============================================================
-- Corrige fechamentos semanais (cargo_weekly_closings) duplicados
-- Sistema: BTREE Ambiental | Data: 2026-08-24
-- ============================================================
-- Causa: o cron de fechamento automático (toda sexta 22h) fazia um
-- SELECT (existe?) seguido de INSERT sem transação/lock e sem
-- constraint única no banco. Quando dois processos rodavam ao mesmo
-- tempo contra o mesmo banco (ex: staging na Hostinger + ambiente
-- local, já que o .env local aponta para o banco de staging), os
-- dois passavam pelo SELECT antes de qualquer um inserir, e ambos
-- criavam a mesma linha (mesmo client_id + week_start).
--
-- Este script:
--   1) Mostra os grupos duplicados (client_id + week_start)
--   2) Realoca client_advance_deductions.weekly_closing_id da(s)
--      linha(s) que serão apagadas para a linha que ficará (evita
--      referências órfãs, já que não há FK formal nessa coluna)
--   3) Apaga as duplicatas, preferindo manter a que já está paga
--      (status = 'pago') ou, se nenhuma estiver paga, a de menor id
--   4) Cria o índice único (client_id, week_start) para impedir que
--      o problema volte a ocorrer, independente de quantos processos
--      rodarem o cron ao mesmo tempo
--
-- EXECUTE CADA BLOCO SEPARADAMENTE (ex: via phpMyAdmin) e confira o
-- resultado do BLOCO 1 antes de rodar os blocos de escrita.
-- ============================================================

-- ── BLOCO 1: Ver os grupos duplicados (confirme antes de continuar) ──
SELECT client_id, week_start, COUNT(*) AS qtd, GROUP_CONCAT(id ORDER BY id) AS ids
FROM cargo_weekly_closings
GROUP BY client_id, week_start
HAVING COUNT(*) > 1;

-- ============================================================
-- ── BLOCO 2: Determinar, por grupo duplicado, qual id manter ──
-- (mantém o pago, se houver algum pago no grupo; senão o de menor id)
-- Cria tabela temporária só para os próximos blocos.
-- ============================================================
DROP TEMPORARY TABLE IF EXISTS tmp_weekly_closing_keep;

CREATE TEMPORARY TABLE tmp_weekly_closing_keep AS
SELECT
  client_id,
  week_start,
  COALESCE(
    MIN(CASE WHEN status = 'pago' THEN id END),
    MIN(id)
  ) AS keep_id
FROM cargo_weekly_closings
GROUP BY client_id, week_start
HAVING COUNT(*) > 1;

SELECT * FROM tmp_weekly_closing_keep;

-- ============================================================
-- ── BLOCO 3: Realocar deduções de adiantamento antes de apagar ──
-- ============================================================
UPDATE client_advance_deductions cad
JOIN cargo_weekly_closings cwc ON cad.weekly_closing_id = cwc.id
JOIN tmp_weekly_closing_keep k
  ON k.client_id = cwc.client_id AND k.week_start = cwc.week_start
SET cad.weekly_closing_id = k.keep_id
WHERE cwc.id <> k.keep_id;

-- ============================================================
-- ── BLOCO 4: Apagar as duplicatas (mantendo apenas keep_id) ──
-- ============================================================
DELETE cwc FROM cargo_weekly_closings cwc
JOIN tmp_weekly_closing_keep k
  ON k.client_id = cwc.client_id AND k.week_start = cwc.week_start
WHERE cwc.id <> k.keep_id;

DROP TEMPORARY TABLE IF EXISTS tmp_weekly_closing_keep;

-- ============================================================
-- ── BLOCO 5: Confirmar que não restaram duplicatas ──
-- (deve retornar 0 linhas)
-- ============================================================
SELECT client_id, week_start, COUNT(*) AS qtd
FROM cargo_weekly_closings
GROUP BY client_id, week_start
HAVING COUNT(*) > 1;

-- ============================================================
-- ── BLOCO 6: Criar o índice único (impede duplicata futura) ──
-- Só roda com sucesso se o BLOCO 5 confirmou 0 duplicatas.
-- ============================================================
ALTER TABLE cargo_weekly_closings
  ADD UNIQUE INDEX cargo_weekly_closings_client_week_unique (client_id, week_start);
