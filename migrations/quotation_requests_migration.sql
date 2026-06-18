-- ============================================================
-- MIGRAÇÃO: Módulo de Solicitação de Orçamento
-- Data: 18/06/2026
-- Executar no banco de dados da Hostinger (MySQL)
-- ============================================================

-- Tabela de solicitações de orçamento (criadas internamente)
CREATE TABLE IF NOT EXISTS `quotation_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(500) NOT NULL,
  `requester_id` int DEFAULT NULL,
  `requester_name` varchar(255) DEFAULT NULL,
  `requester_phone` varchar(30) DEFAULT NULL,
  `requester_email` varchar(255) DEFAULT NULL,
  `items_json` text NOT NULL COMMENT 'JSON array: [{name, quantity, unit}]',
  `token` varchar(128) NOT NULL UNIQUE COMMENT 'Token único para link público',
  `expires_at` bigint NOT NULL COMMENT 'Unix timestamp em ms',
  `status` enum('ativa','respondida','expirada','cancelada') NOT NULL DEFAULT 'ativa',
  `notes` text DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `quotation_requests_token_unique` (`token`),
  KEY `idx_quotation_requests_status` (`status`),
  KEY `idx_quotation_requests_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de respostas dos fornecedores
CREATE TABLE IF NOT EXISTS `quotation_responses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `quotation_request_id` int NOT NULL,
  `supplier_name` varchar(500) NOT NULL,
  `cnpj` varchar(20) DEFAULT NULL,
  `address` varchar(500) DEFAULT NULL,
  `seller_name` varchar(255) DEFAULT NULL,
  `seller_phone` varchar(30) DEFAULT NULL,
  `seller_email` varchar(255) DEFAULT NULL,
  `items_json` text NOT NULL COMMENT 'JSON array: [{name, quantity, unit, price, brand, notes}]',
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_quotation_responses_request_id` (`quotation_request_id`),
  CONSTRAINT `fk_quotation_responses_request`
    FOREIGN KEY (`quotation_request_id`)
    REFERENCES `quotation_requests` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- FIM DA MIGRAÇÃO
-- ============================================================
