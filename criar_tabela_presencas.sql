-- ============================================================
-- BTREE Ambiental — Script de criação da tabela de presenças
-- Execute este SQL no phpMyAdmin do banco de produção (Hostinger)
-- Banco: u629128033_btree_ambienta
-- Data: 23/03/2026
-- ============================================================

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
  KEY `idx_collaborator_attendance_collaborator_id` (`collaborator_id`),
  KEY `idx_collaborator_attendance_date` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verificar se a tabela foi criada com sucesso:
-- SELECT COUNT(*) FROM collaborator_attendance;
