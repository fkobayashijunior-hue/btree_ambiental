-- ============================================================
-- BTREE Ambiental — Script de sincronização do banco de produção
-- Execute este SQL no phpMyAdmin do banco de produção (Hostinger)
-- Banco: u629128033_btree_ambienta
-- Data: 23/03/2026
--
-- Este script usa CREATE TABLE IF NOT EXISTS em todas as tabelas,
-- portanto é SEGURO rodar mesmo que algumas já existam.
-- Dados existentes NÃO serão apagados.
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- 1. REGISTRO DE PRESENÇAS DE COLABORADORES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `collaborator_attendance` (
  `id`                  int          AUTO_INCREMENT NOT NULL,
  `collaborator_id`     int          NOT NULL,
  `date`                timestamp    NOT NULL,
  `employment_type_ca`  enum('clt','terceirizado','diarista') NOT NULL DEFAULT 'diarista',
  `daily_value`         varchar(20)  NOT NULL DEFAULT '0',
  `pix_key`             varchar(255),
  `activity`            varchar(255),
  `observations`        text,
  `payment_status_ca`   enum('pendente','pago') NOT NULL DEFAULT 'pendente',
  `paid_at`             timestamp    NULL,
  `registered_by`       int          NULL,
  `created_at`          timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`          timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `collaborator_attendance_id` PRIMARY KEY (`id`),
  KEY `idx_ca_collaborator_id` (`collaborator_id`),
  KEY `idx_ca_date` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─────────────────────────────────────────────────────────────
-- 2. CONTROLE DE HORAS DE MÁQUINAS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `machine_hours` (
  `id`                        int          AUTO_INCREMENT NOT NULL,
  `equipment_id`              int          NOT NULL,
  `operator_collaborator_id`  int          NULL,
  `date`                      timestamp    NOT NULL,
  `start_hour_meter`          varchar(20)  NOT NULL,
  `end_hour_meter`            varchar(20)  NOT NULL,
  `hours_worked`              varchar(20)  NOT NULL,
  `activity`                  varchar(255),
  `location`                  varchar(255),
  `notes`                     text,
  `registered_by`             int          NULL,
  `created_at`                timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `machine_hours_id` PRIMARY KEY (`id`),
  KEY `idx_mh_equipment_id` (`equipment_id`),
  KEY `idx_mh_date` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─────────────────────────────────────────────────────────────
-- 3. MANUTENÇÃO DE MÁQUINAS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `machine_maintenance` (
  `id`                        int          AUTO_INCREMENT NOT NULL,
  `equipment_id`              int          NOT NULL,
  `date`                      timestamp    NOT NULL,
  `hour_meter`                varchar(20),
  `type`                      enum('preventiva','corretiva','revisao') NOT NULL DEFAULT 'corretiva',
  `service_type`              enum('proprio','terceirizado') NOT NULL DEFAULT 'proprio',
  `mechanic_collaborator_id`  int          NULL,
  `mechanic_name`             varchar(255),
  `third_party_company`       varchar(255),
  `parts_replaced`            text,
  `labor_cost`                varchar(20),
  `total_cost`                varchar(20),
  `description`               text,
  `next_maintenance_hours`    varchar(20),
  `registered_by`             int          NULL,
  `created_at`                timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`                timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `machine_maintenance_id` PRIMARY KEY (`id`),
  KEY `idx_mm_equipment_id` (`equipment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─────────────────────────────────────────────────────────────
-- 4. ABASTECIMENTO DE MÁQUINAS (por horímetro)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `machine_fuel` (
  `id`              int          AUTO_INCREMENT NOT NULL,
  `equipment_id`    int          NOT NULL,
  `date`            timestamp    NOT NULL,
  `hour_meter`      varchar(20),
  `fuel_type`       enum('diesel','gasolina','mistura_2t','arla') NOT NULL,
  `liters`          varchar(20)  NOT NULL,
  `price_per_liter` varchar(20),
  `total_value`     varchar(20),
  `supplier`        varchar(255),
  `notes`           text,
  `registered_by`   int          NULL,
  `created_at`      timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `machine_fuel_id` PRIMARY KEY (`id`),
  KEY `idx_mf_equipment_id` (`equipment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─────────────────────────────────────────────────────────────
-- 5. CONTROLE DE VEÍCULOS (abastecimento, km, manutenção)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `vehicle_records` (
  `id`                      int          AUTO_INCREMENT NOT NULL,
  `equipment_id`            int          NOT NULL,
  `date`                    timestamp    NOT NULL,
  `record_type`             enum('abastecimento','manutencao','km') NOT NULL,
  `fuel_type`               enum('diesel','gasolina','etanol','gnv'),
  `liters`                  varchar(20),
  `fuel_cost`               varchar(20),
  `price_per_liter`         varchar(20),
  `supplier`                varchar(255),
  `odometer`                varchar(20),
  `km_driven`               varchar(20),
  `maintenance_type`        varchar(255),
  `maintenance_cost`        varchar(20),
  `service_type`            enum('proprio','terceirizado'),
  `mechanic_name`           varchar(255),
  `driver_collaborator_id`  int          NULL,
  `photo_url`               text,
  `notes`                   text,
  `registered_by`           int          NULL,
  `created_at`              timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `vehicle_records_id` PRIMARY KEY (`id`),
  KEY `idx_vr_equipment_id` (`equipment_id`),
  KEY `idx_vr_date` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─────────────────────────────────────────────────────────────
-- 6. PEDIDOS DE COMPRA
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `purchase_orders` (
  `id`          int          AUTO_INCREMENT NOT NULL,
  `title`       varchar(255) NOT NULL,
  `status`      enum('rascunho','enviado','aprovado','rejeitado','comprado') NOT NULL DEFAULT 'rascunho',
  `notes`       text,
  `created_by`  int          NULL,
  `approved_by` int          NULL,
  `approved_at` timestamp    NULL,
  `created_at`  timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `purchase_orders_id` PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─────────────────────────────────────────────────────────────
-- 7. ITENS DE PEDIDOS DE COMPRA
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `purchase_order_items` (
  `id`            int          AUTO_INCREMENT NOT NULL,
  `order_id`      int          NOT NULL,
  `part_id`       int          NULL,
  `part_name`     varchar(255) NOT NULL,
  `part_code`     varchar(50),
  `part_category` varchar(100),
  `supplier`      varchar(255),
  `unit`          varchar(20)  DEFAULT 'un',
  `quantity`      int          NOT NULL,
  `unit_cost`     varchar(20),
  `notes`         text,
  `created_at`    timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `purchase_order_items_id` PRIMARY KEY (`id`),
  KEY `idx_poi_order_id` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─────────────────────────────────────────────────────────────
-- 8. REPLANTIO (Portal do Cliente)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `replanting_records` (
  `id`             int          AUTO_INCREMENT NOT NULL,
  `client_id`      int          NOT NULL,
  `date`           timestamp    NOT NULL,
  `area`           varchar(100),
  `species`        varchar(100) DEFAULT 'Eucalipto',
  `quantity`       int,
  `area_hectares`  varchar(20),
  `notes`          text,
  `photos_json`    text,
  `registered_by`  int          NULL,
  `created_at`     timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `replanting_records_id` PRIMARY KEY (`id`),
  KEY `idx_rr_client_id` (`client_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─────────────────────────────────────────────────────────────
-- 9. FOTOS DE EQUIPAMENTOS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `equipment_photos` (
  `id`           int           AUTO_INCREMENT NOT NULL,
  `equipment_id` int           NOT NULL,
  `photo_url`    varchar(1000) NOT NULL,
  `caption`      varchar(255),
  `uploaded_by`  int           NULL,
  `created_at`   timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `equipment_photos_id` PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─────────────────────────────────────────────────────────────
-- 10. HISTÓRICO DE MANUTENÇÕES DE EQUIPAMENTOS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `equipment_maintenance` (
  `id`                    int          AUTO_INCREMENT NOT NULL,
  `equipment_id`          int          NOT NULL,
  `type`                  enum('manutencao','limpeza','afiacao','revisao','troca_oleo','outros') NOT NULL DEFAULT 'manutencao',
  `description`           text         NOT NULL,
  `performed_by`          varchar(255),
  `cost`                  varchar(20),
  `next_maintenance_date` timestamp    NULL,
  `photos_json`           text,
  `registered_by`         int          NULL,
  `performed_at`          timestamp    NOT NULL,
  `created_at`            timestamp    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `equipment_maintenance_id` PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─────────────────────────────────────────────────────────────
-- 11. DOCUMENTOS DE COLABORADORES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `collaborator_documents` (
  `id`              int           AUTO_INCREMENT NOT NULL,
  `collaborator_id` int           NOT NULL,
  `type`            enum('cnh','certificado','aso','contrato','rg','cpf','outros') NOT NULL DEFAULT 'outros',
  `title`           varchar(255)  NOT NULL,
  `file_url`        varchar(1000) NOT NULL,
  `file_type`       varchar(50),
  `issue_date`      timestamp     NULL,
  `expiry_date`     timestamp     NULL,
  `notes`           text,
  `uploaded_by`     int           NULL,
  `created_at`      timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `collaborator_documents_id` PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─────────────────────────────────────────────────────────────
-- 12. CONTRATOS DE CLIENTES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `client_contracts` (
  `id`              int           AUTO_INCREMENT NOT NULL,
  `client_id`       int           NOT NULL,
  `title`           varchar(255)  NOT NULL,
  `file_url`        varchar(1000) NOT NULL,
  `signed_at`       timestamp     NULL,
  `expires_at`      timestamp     NULL,
  `notes`           text,
  `uploaded_by`     int           NULL,
  `created_at`      timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `client_contracts_id` PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─────────────────────────────────────────────────────────────
-- 13. RECIBOS DE PAGAMENTO AO CLIENTE
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `client_payment_receipts` (
  `id`          int           AUTO_INCREMENT NOT NULL,
  `payment_id`  int           NOT NULL,
  `file_url`    varchar(1000) NOT NULL,
  `uploaded_by` int           NULL,
  `created_at`  timestamp     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `client_payment_receipts_id` PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─────────────────────────────────────────────────────────────
-- 14. PERMISSÕES DE PAPÉIS (role_permissions)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `role_permissions` (
  `id`          int         AUTO_INCREMENT NOT NULL,
  `role_name`   varchar(50) NOT NULL,
  `module`      varchar(50) NOT NULL,
  `can_view`    int         NOT NULL DEFAULT 0,
  `can_create`  int         NOT NULL DEFAULT 0,
  `can_edit`    int         NOT NULL DEFAULT 0,
  `can_delete`  int         NOT NULL DEFAULT 0,
  `updated_at`  timestamp   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by`  int         NULL,
  CONSTRAINT `role_permissions_id` PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ─────────────────────────────────────────────────────────────
-- FIM DO SCRIPT
-- Verifique as tabelas criadas com:
-- SHOW TABLES;
-- ─────────────────────────────────────────────────────────────
