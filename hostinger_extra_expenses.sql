-- ============================================================
-- SQL DE MIGRAÇÃO: Módulo de Gastos Extras
-- Data: 03/04/2026
-- Banco: u629128033_btree_ambienta (Hostinger MySQL)
-- ============================================================

-- Criar tabela extra_expenses
CREATE TABLE IF NOT EXISTS `extra_expenses` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `date` DATETIME NOT NULL,
  `category` ENUM('abastecimento', 'refeicao', 'compra_material', 'servico_terceiro', 'pedagio', 'outro') NOT NULL,
  `description` VARCHAR(500) NOT NULL,
  `amount` VARCHAR(20) NOT NULL,
  `payment_method` ENUM('dinheiro', 'pix', 'cartao', 'transferencia') NOT NULL DEFAULT 'dinheiro',
  `receipt_image_url` TEXT,
  `notes` TEXT,
  `registered_by` INT,
  `registered_by_name` VARCHAR(255),
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verificar se a tabela foi criada
SELECT 'Tabela extra_expenses criada com sucesso!' AS status;
SELECT COUNT(*) AS total_registros FROM extra_expenses;
