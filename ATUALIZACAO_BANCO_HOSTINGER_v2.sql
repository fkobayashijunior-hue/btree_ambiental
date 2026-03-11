-- ============================================================
-- ATUALIZAÇÃO DO BANCO HOSTINGER - v2 (11/03/2026)
-- Execute este script no banco MySQL da Hostinger
-- ============================================================

-- 1. Adicionar coluna password na tabela clients (para Portal do Cliente com e-mail+senha)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS password VARCHAR(255) NULL AFTER notes;

-- 2. Adicionar coluna photo_url na tabela parts (para upload de foto de peças)
ALTER TABLE parts ADD COLUMN IF NOT EXISTS photo_url TEXT NULL AFTER supplier;

-- ============================================================
-- VERIFICAÇÃO (opcional - execute para confirmar)
-- ============================================================
-- DESCRIBE clients;
-- DESCRIBE parts;
