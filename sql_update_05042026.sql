-- =====================================================
-- BTREE Ambiental — Script SQL de Atualização
-- Data: 05/04/2026
-- Sprint: Simplificação Controle de Cargas + Motorista
-- =====================================================

-- 1. Nova tabela: cargo_tracking_photos
-- Armazena fotos de cada etapa do tracking de carga
CREATE TABLE IF NOT EXISTS `cargo_tracking_photos` (
  `id` int AUTO_INCREMENT NOT NULL,
  `cargo_id` int NOT NULL,
  `stage` varchar(50) NOT NULL,
  `photo_url` text NOT NULL,
  `notes` text,
  `registered_by` int,
  `registered_by_name` varchar(255),
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `cargo_tracking_photos_id` PRIMARY KEY(`id`),
  CONSTRAINT `cargo_tracking_photos_cargo_id_fk` FOREIGN KEY (`cargo_id`) REFERENCES `cargo_loads`(`id`) ON DELETE CASCADE,
  CONSTRAINT `cargo_tracking_photos_registered_by_fk` FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`)
);

-- 2. Novos campos em cargo_loads: peso saída/chegada e metragem final
ALTER TABLE `cargo_loads` ADD COLUMN IF NOT EXISTS `weight_out_kg` varchar(20);
ALTER TABLE `cargo_loads` ADD COLUMN IF NOT EXISTS `weight_in_kg` varchar(20);
ALTER TABLE `cargo_loads` ADD COLUMN IF NOT EXISTS `final_height_m` varchar(20);
ALTER TABLE `cargo_loads` ADD COLUMN IF NOT EXISTS `final_width_m` varchar(20);
ALTER TABLE `cargo_loads` ADD COLUMN IF NOT EXISTS `final_length_m` varchar(20);
ALTER TABLE `cargo_loads` ADD COLUMN IF NOT EXISTS `final_volume_m3` varchar(20);

-- 3. Novos campos em equipment: medidas padrão por caminhão
ALTER TABLE `equipment` ADD COLUMN IF NOT EXISTS `default_height_m` varchar(20);
ALTER TABLE `equipment` ADD COLUMN IF NOT EXISTS `default_width_m` varchar(20);
ALTER TABLE `equipment` ADD COLUMN IF NOT EXISTS `default_length_m` varchar(20);

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================
