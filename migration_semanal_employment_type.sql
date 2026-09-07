-- ============================================================
-- Adiciona 'semanal' como Tipo de Vínculo dos colaboradores
-- Sistema: BTREE Ambiental | Data: 2026-08-25
-- ============================================================
-- Já aplicado no banco de staging. Rodar em produção quando for
-- fazer o deploy desta mudança.
-- ============================================================

ALTER TABLE collaborators
  MODIFY COLUMN employment_type ENUM('clt','terceirizado','diarista','pj','semanal') DEFAULT 'diarista';

ALTER TABLE payroll_entries
  MODIFY COLUMN employment_type ENUM('clt','terceirizado','diarista','pj','semanal') NOT NULL;
