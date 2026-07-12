-- ============================================================
-- SCRIPT DE MIGRAÇÃO: Módulo de Porteiras Virtuais (Geofence GPS)
-- Data: 12/07/2026
-- Executar no banco de dados MySQL da Hostinger (produção)
-- ============================================================

-- 1. Tabela de Porteiras Virtuais
CREATE TABLE IF NOT EXISTS `geofences` (
  `id`                   INT AUTO_INCREMENT PRIMARY KEY,
  `name`                 VARCHAR(255) NOT NULL,
  `lat`                  VARCHAR(30)  NOT NULL,
  `lng`                  VARCHAR(30)  NOT NULL,
  `radius_meters`        INT          NOT NULL DEFAULT 300,
  `is_active`            TINYINT      NOT NULL DEFAULT 1,
  `traccar_device_id`    INT          DEFAULT NULL COMMENT 'ID do dispositivo no Traccar (ex: Scania Julieta)',
  `traccar_geofence_id`  INT          DEFAULT NULL COMMENT 'ID da cerca no Traccar (para sincronização futura)',
  `default_origin_name`  VARCHAR(255) DEFAULT 'SIMFLOR' COMMENT 'Nome de origem padrão dos fretes',
  `notes`                TEXT         DEFAULT NULL,
  `created_by`           INT          DEFAULT NULL,
  `created_at`           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tabela de Fretes GPS (abertos/fechados automaticamente pela porteira)
CREATE TABLE IF NOT EXISTS `freight_trips` (
  `id`                      INT AUTO_INCREMENT PRIMARY KEY,
  `geofence_id`             INT          NOT NULL,
  `vehicle_id`              INT          DEFAULT NULL COMMENT 'ID do equipamento (Scania Julieta)',
  `vehicle_name`            VARCHAR(255) DEFAULT NULL COMMENT 'Nome do veículo (cache)',
  `driver_id`               INT          DEFAULT NULL COMMENT 'ID do motorista',
  `driver_name`             VARCHAR(255) DEFAULT NULL COMMENT 'Nome do motorista (cache)',
  `status`                  ENUM('open','closed','cancelled') NOT NULL DEFAULT 'open',
  `origin_name`             VARCHAR(255) NOT NULL DEFAULT 'SIMFLOR',
  `destination_name`        VARCHAR(255) DEFAULT NULL COMMENT 'Preenchido manualmente depois',
  `entry_at`                DATETIME     NOT NULL COMMENT 'Quando entrou na geofence',
  `exit_at`                 DATETIME     DEFAULT NULL COMMENT 'Quando saiu da geofence',
  `distance_km`             VARCHAR(20)  DEFAULT NULL COMMENT 'Km percorridos (calculado via Traccar)',
  `route_notes`             TEXT         DEFAULT NULL,
  `toll_cost`               VARCHAR(20)  DEFAULT '0' COMMENT 'Custo de pedágio',
  `maintenance_cost`        VARCHAR(20)  DEFAULT '0' COMMENT 'Custo de manutenção',
  `fuel_cost`               VARCHAR(20)  DEFAULT '0' COMMENT 'Custo de combustível',
  `total_cost`              VARCHAR(20)  DEFAULT '0' COMMENT 'Custo total calculado',
  `traccar_positions_json`  TEXT         DEFAULT NULL COMMENT 'Rota GPS em JSON',
  `schedule_cron_task_uid`  VARCHAR(255) DEFAULT NULL,
  `created_at`              TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`              TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_freight_trips_geofence`
    FOREIGN KEY (`geofence_id`) REFERENCES `geofences` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- VERIFICAÇÃO: confirmar que as tabelas foram criadas
-- ============================================================
SHOW TABLES LIKE 'geofences';
SHOW TABLES LIKE 'freight_trips';

-- ============================================================
-- OPCIONAL: Cadastrar a porteira SIMFLOR (ajuste lat/lng/traccar_device_id)
-- ============================================================
-- INSERT INTO `geofences` (name, lat, lng, radius_meters, is_active, traccar_device_id, default_origin_name, notes)
-- VALUES ('SIMFLOR', '-23.123456', '-51.654321', 300, 1, 1, 'SIMFLOR', 'Porteira principal da fazenda SIMFLOR');
-- (Substitua lat/lng pelas coordenadas reais e traccar_device_id pelo ID da Scania Julieta no Traccar)
