-- ============================================================
-- SCRIPT DE ATUALIZAÇÃO: Módulo GPS (Traccar) - BTREE Ambiental
-- Data: 28/03/2026
-- Executar no phpMyAdmin da Hostinger (banco de produção)
-- ============================================================

-- 1. Tabela de vinculação GPS ↔ Equipamento
CREATE TABLE IF NOT EXISTS `gps_device_links` (
  `id` int NOT NULL AUTO_INCREMENT,
  `equipment_id` int NOT NULL,
  `traccar_device_id` int NOT NULL COMMENT 'ID do dispositivo no Traccar',
  `traccar_device_name` varchar(255) DEFAULT NULL COMMENT 'Nome no Traccar (cache)',
  `traccar_unique_id` varchar(100) DEFAULT NULL COMMENT 'IMEI/ID único do rastreador',
  `active` int NOT NULL DEFAULT '1',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `equipment_id` (`equipment_id`),
  CONSTRAINT `gps_device_links_equipment_fk` FOREIGN KEY (`equipment_id`) REFERENCES `equipment` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tabela de log de horas acumuladas via GPS
CREATE TABLE IF NOT EXISTS `gps_hours_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `equipment_id` int NOT NULL,
  `gps_device_link_id` int DEFAULT NULL,
  `date` timestamp NOT NULL COMMENT 'Dia do registro',
  `hours_worked` varchar(10) NOT NULL COMMENT 'Horas trabalhadas nesse dia',
  `source` enum('gps_auto','manual') NOT NULL DEFAULT 'gps_auto',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `equipment_id` (`equipment_id`),
  KEY `gps_device_link_id` (`gps_device_link_id`),
  CONSTRAINT `gps_hours_log_equipment_fk` FOREIGN KEY (`equipment_id`) REFERENCES `equipment` (`id`),
  CONSTRAINT `gps_hours_log_link_fk` FOREIGN KEY (`gps_device_link_id`) REFERENCES `gps_device_links` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabela de planos de manutenção preventiva por horímetro GPS
CREATE TABLE IF NOT EXISTS `preventive_maintenance_plans` (
  `id` int NOT NULL AUTO_INCREMENT,
  `equipment_id` int NOT NULL,
  `name` varchar(255) NOT NULL COMMENT 'Ex: Troca de óleo, Engraxamento',
  `type` enum('troca_oleo','engraxamento','filtro_ar','filtro_combustivel','correia','revisao_geral','abastecimento','outros') NOT NULL,
  `interval_hours` int NOT NULL COMMENT 'A cada quantas horas realizar',
  `last_done_hours` varchar(20) DEFAULT '0' COMMENT 'Horímetro na última execução',
  `last_done_at` timestamp NULL DEFAULT NULL,
  `alert_threshold_hours` int DEFAULT '10' COMMENT 'Alertar X horas antes do vencimento',
  `notes` text DEFAULT NULL,
  `active` int NOT NULL DEFAULT '1',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `equipment_id` (`equipment_id`),
  CONSTRAINT `preventive_plans_equipment_fk` FOREIGN KEY (`equipment_id`) REFERENCES `equipment` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Tabela de alertas de manutenção preventiva gerados automaticamente
CREATE TABLE IF NOT EXISTS `preventive_maintenance_alerts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `equipment_id` int NOT NULL,
  `plan_id` int NOT NULL,
  `status` enum('pendente','concluido','ignorado') NOT NULL DEFAULT 'pendente',
  `current_hours` varchar(20) DEFAULT NULL COMMENT 'Horímetro quando o alerta foi gerado',
  `due_hours` varchar(20) DEFAULT NULL COMMENT 'Horímetro previsto para a manutenção',
  `generated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `resolved_at` timestamp NULL DEFAULT NULL,
  `resolved_by` int DEFAULT NULL,
  `notes` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `equipment_id` (`equipment_id`),
  KEY `plan_id` (`plan_id`),
  CONSTRAINT `preventive_alerts_equipment_fk` FOREIGN KEY (`equipment_id`) REFERENCES `equipment` (`id`),
  CONSTRAINT `preventive_alerts_plan_fk` FOREIGN KEY (`plan_id`) REFERENCES `preventive_maintenance_plans` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- VERIFICAÇÃO FINAL
-- ============================================================
SELECT 'gps_device_links' AS tabela, COUNT(*) AS registros FROM gps_device_links
UNION ALL
SELECT 'gps_hours_log', COUNT(*) FROM gps_hours_log
UNION ALL
SELECT 'preventive_maintenance_plans', COUNT(*) FROM preventive_maintenance_plans
UNION ALL
SELECT 'preventive_maintenance_alerts', COUNT(*) FROM preventive_maintenance_alerts;
