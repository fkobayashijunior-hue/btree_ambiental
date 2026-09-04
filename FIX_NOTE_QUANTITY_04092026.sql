-- ============================================================
-- BTREE Ambiental — Reconciliação de vínculos carga ↔ ação (AC)
-- Data: 04/09/2026
-- Objetivo: garantir que cargas que já usaram uma AC tenham
-- fiscal_note_id preenchido, para que a "Quantidade da Nota"
-- apareça fixada no formulário de edição.
--
-- Execute no phpMyAdmin (banco u629128033_btree).
-- Recomendado: faça um backup/export antes de rodar o UPDATE.
-- ============================================================

-- 1) (OPCIONAL - apenas verificação) Ver cargas que usaram AC mas estão sem vínculo:
-- SELECT cl.id, cl.invoice_number, cl.fiscal_note_id, fn.id AS fn_id, fn.action_code, fn.quantity
-- FROM cargo_loads cl
-- JOIN fiscal_notes fn ON fn.used_by_cargo_id = cl.id
-- WHERE cl.fiscal_note_id IS NULL OR cl.fiscal_note_id = 0;

-- 2) Vincular cargas às ações que foram usadas por elas:
UPDATE cargo_loads cl
JOIN fiscal_notes fn ON fn.used_by_cargo_id = cl.id
SET cl.fiscal_note_id = fn.id
WHERE cl.fiscal_note_id IS NULL OR cl.fiscal_note_id = 0;

-- 3) (OPCIONAL - verificação) Conferir resultado:
-- SELECT cl.id, cl.invoice_number, cl.fiscal_note_id, fn.action_code, fn.quantity
-- FROM cargo_loads cl
-- LEFT JOIN fiscal_notes fn ON fn.id = cl.fiscal_note_id
-- ORDER BY cl.id DESC
-- LIMIT 30;
