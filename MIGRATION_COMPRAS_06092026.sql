-- ============================================================
-- BTREE Ambiental — Reformulação do módulo Solicitações de Compras
-- Data: 06/09/2026
-- Execute no phpMyAdmin (banco u629128033_btree).
-- Recomendado: backup/export antes de rodar.
-- O script é idempotente: pode ser reexecutado sem erro
-- (usa verificações de coluna existente).
-- ============================================================

-- 1) Coluna de equipamento vinculado (opcional)
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'purchase_requests' AND COLUMN_NAME = 'equipment_id');
SET @sql := IF(@col = 0,
  'ALTER TABLE purchase_requests ADD COLUMN equipment_id INT NULL',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2) Resposta/parecer do responsável
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'purchase_requests' AND COLUMN_NAME = 'response_notes');
SET @sql := IF(@col = 0,
  'ALTER TABLE purchase_requests ADD COLUMN response_notes TEXT NULL',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3) Quem respondeu (responsável que visualizou/comprou/negou)
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'purchase_requests' AND COLUMN_NAME = 'responded_by');
SET @sql := IF(@col = 0,
  'ALTER TABLE purchase_requests ADD COLUMN responded_by INT NULL',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4) Data da resposta
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'purchase_requests' AND COLUMN_NAME = 'responded_at');
SET @sql := IF(@col = 0,
  'ALTER TABLE purchase_requests ADD COLUMN responded_at DATETIME NULL',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 5) Motivo da negativa (quando status = negada)
SET @col := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'purchase_requests' AND COLUMN_NAME = 'denial_reason');
SET @sql := IF(@col = 0,
  'ALTER TABLE purchase_requests ADD COLUMN denial_reason TEXT NULL',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 6) Ampliar ENUM de status para incluir 'negada'
--    (MySQL exige recriar o ENUM; valores antigos em inglês já foram
--     normalizados para português nas leituras anteriores, mas o
--     ALTER aceita valores existentes)
SET @coltype := (SELECT COLUMN_TYPE FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'purchase_requests' AND COLUMN_NAME = 'status');
-- Se a coluna for ENUM sem 'negada', recria incluindo o novo valor
SET @need := IF(@coltype LIKE '%''negada''%', 0, 1);
SET @sql := IF(@need = 1,
  'ALTER TABLE purchase_requests MODIFY COLUMN status ENUM(''pendente'',''lida'',''aprovada'',''comprada'',''recebida'',''cancelada'',''negada'',''pending'',''read'',''approved'',''purchased'',''received'',''cancelled'',''canceled'') NOT NULL DEFAULT ''pendente''',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 7) Normalizar registros legados em inglês para português
UPDATE purchase_requests SET status = 'pendente'  WHERE status = 'pending';
UPDATE purchase_requests SET status = 'lida'      WHERE status = 'read';
UPDATE purchase_requests SET status = 'aprovada'  WHERE status = 'approved';
UPDATE purchase_requests SET status = 'comprada'  WHERE status = 'purchased';
UPDATE purchase_requests SET status = 'recebida'  WHERE status = 'received';
UPDATE purchase_requests SET status = 'cancelada' WHERE status IN ('cancelled','canceled');
UPDATE purchase_requests SET urgency = 'baixa'   WHERE urgency = 'low';
UPDATE purchase_requests SET urgency = 'media'   WHERE urgency = 'medium';
UPDATE purchase_requests SET urgency = 'alta'    WHERE urgency = 'high';
UPDATE purchase_requests SET urgency = 'critica' WHERE urgency = 'critical';

-- 8) (Verificação) listar colunas finais
-- SHOW COLUMNS FROM purchase_requests;
