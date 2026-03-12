-- ============================================================
-- BTREE Ambiental - Atualização do Banco de Dados v4
-- Execute este script no painel MySQL da Hostinger
-- ============================================================

-- 1. Adicionar coluna password na tabela clients (para Portal do Cliente)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS password VARCHAR(255) NULL;

-- 2. Adicionar coluna photo_url na tabela parts (para foto de peças)
ALTER TABLE parts ADD COLUMN IF NOT EXISTS photo_url TEXT NULL;

-- 3. Adicionar coluna sector_id na tabela equipment (para vincular equipamento ao setor)
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS sector_id INT NULL;

-- 4. Adicionar coluna photo_url na tabela vehicle_records (para foto em abastecimento/manutenção)
ALTER TABLE vehicle_records ADD COLUMN IF NOT EXISTS photo_url TEXT NULL;

-- 5. Criar tabela purchase_orders (pedidos de compra - carrinho de peças)
CREATE TABLE IF NOT EXISTS purchase_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  notes TEXT,
  status ENUM('rascunho', 'enviado', 'aprovado', 'comprado') NOT NULL DEFAULT 'rascunho',
  created_by INT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
);

-- 6. Criar tabela purchase_order_items (itens dos pedidos de compra)
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  part_id INT REFERENCES parts(id),
  part_name VARCHAR(255) NOT NULL,
  part_code VARCHAR(50),
  part_category VARCHAR(100),
  supplier VARCHAR(255),
  unit VARCHAR(20) NOT NULL DEFAULT 'un',
  quantity INT NOT NULL DEFAULT 1,
  unit_cost VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================
-- FIM DO SCRIPT
-- ============================================================
