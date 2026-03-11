-- ============================================================
-- BTREE Ambiental - Atualização do Banco de Dados v3
-- Data: Março 2026
-- Execute este script no painel MySQL da Hostinger
-- ============================================================

-- 1. Adicionar coluna photo_url na tabela parts (se ainda não existir)
ALTER TABLE parts ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- 2. Adicionar coluna password na tabela clients (se ainda não existir)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS password VARCHAR(255);

-- 3. Criar tabela de pedidos de compra
CREATE TABLE IF NOT EXISTS purchase_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  status ENUM('rascunho','enviado','aprovado','rejeitado','comprado') NOT NULL DEFAULT 'rascunho',
  notes TEXT,
  created_by INT,
  approved_by INT,
  approved_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 4. Criar tabela de itens dos pedidos de compra
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  part_id INT,
  part_name VARCHAR(255) NOT NULL,
  part_code VARCHAR(50),
  part_category VARCHAR(100),
  supplier VARCHAR(255),
  unit VARCHAR(20) DEFAULT 'un',
  quantity INT NOT NULL,
  unit_cost VARCHAR(20),
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE
);

-- ============================================================
-- FIM DO SCRIPT
-- ============================================================
