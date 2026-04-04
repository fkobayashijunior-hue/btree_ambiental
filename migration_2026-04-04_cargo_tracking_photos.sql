-- ============================================================
-- MIGRAÇÃO: 04/04/2026 - Tabela cargo_tracking_photos
-- Sistema de rastreamento de cargas com fotos por etapa
-- ============================================================

CREATE TABLE IF NOT EXISTS `cargo_tracking_photos` (
  `id` int AUTO_INCREMENT NOT NULL,
  `cargo_id` int NOT NULL,
  `stage` varchar(50) NOT NULL,
  `photo_url` text NOT NULL,
  `notes` text,
  `registered_by` int,
  `registered_by_name` varchar(255),
  `created_at` timestamp DEFAULT (now()),
  CONSTRAINT `cargo_tracking_photos_id` PRIMARY KEY(`id`)
);

-- Índice para busca rápida por carga
CREATE INDEX IF NOT EXISTS `idx_tracking_photos_cargo` ON `cargo_tracking_photos` (`cargo_id`);

-- ============================================================
-- NOTA: As tabelas replanting_records e client_payments já
-- existiam no banco. Nenhuma alteração estrutural foi feita
-- nessas tabelas nesta sessão.
-- ============================================================
