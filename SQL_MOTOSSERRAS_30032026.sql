-- ============================================================
-- SQL MÓDULO MOTOSSERRAS - BTREE AMBIENTAL
-- Data: 30/03/2026
-- Execute este SQL no phpMyAdmin da Hostinger
-- Banco: u629128033_btree_ambienta
-- ============================================================

-- Usar PROCEDURE para verificar se coluna/tabela existe antes de criar
-- Compatível com MySQL 5.7+

DELIMITER //

-- ============================================================
-- 1. TABELA: chainsaws (motosserras)
-- ============================================================
DROP PROCEDURE IF EXISTS create_chainsaws //
CREATE PROCEDURE create_chainsaws()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = DATABASE() AND table_name = 'chainsaws'
  ) THEN
    CREATE TABLE `chainsaws` (
      `id` INT AUTO_INCREMENT PRIMARY KEY,
      `name` VARCHAR(255) NOT NULL,
      `brand` VARCHAR(100),
      `model` VARCHAR(100),
      `serial_number` VARCHAR(100),
      `chain_type` VARCHAR(20) DEFAULT '30',
      `status` ENUM('ativa','oficina','inativa') DEFAULT 'ativa',
      `notes` TEXT,
      `created_by` VARCHAR(255),
      `created_at` BIGINT NOT NULL,
      `updated_at` BIGINT NOT NULL
    );
  END IF;
END //
CALL create_chainsaws() //
DROP PROCEDURE IF EXISTS create_chainsaws //

-- ============================================================
-- 2. TABELA: fuel_containers (galões de combustível)
-- ============================================================
DROP PROCEDURE IF EXISTS create_fuel_containers //
CREATE PROCEDURE create_fuel_containers()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = DATABASE() AND table_name = 'fuel_containers'
  ) THEN
    CREATE TABLE `fuel_containers` (
      `id` INT AUTO_INCREMENT PRIMARY KEY,
      `name` VARCHAR(255) NOT NULL,
      `color` VARCHAR(50) DEFAULT 'vermelho',
      `type` ENUM('puro','mistura') DEFAULT 'puro',
      `capacity_liters` DECIMAL(10,2) DEFAULT 20.00,
      `current_volume_liters` DECIMAL(10,2) DEFAULT 0.00,
      `oil2t_ratio_ml_per_liter` DECIMAL(10,2) DEFAULT 20.00,
      `created_by` VARCHAR(255),
      `created_at` BIGINT NOT NULL,
      `updated_at` BIGINT NOT NULL
    );
  END IF;
END //
CALL create_fuel_containers() //
DROP PROCEDURE IF EXISTS create_fuel_containers //

-- ============================================================
-- 3. TABELA: fuel_events (eventos de combustível)
-- ============================================================
DROP PROCEDURE IF EXISTS create_fuel_events //
CREATE PROCEDURE create_fuel_events()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = DATABASE() AND table_name = 'fuel_events'
  ) THEN
    CREATE TABLE `fuel_events` (
      `id` INT AUTO_INCREMENT PRIMARY KEY,
      `container_id` INT NOT NULL,
      `event_type` ENUM('abastecimento','uso','transferencia') NOT NULL,
      `volume_liters` DECIMAL(10,2) NOT NULL,
      `oil2t_ml` DECIMAL(10,2),
      `cost_per_liter` DECIMAL(10,2),
      `total_cost` DECIMAL(10,2),
      `chainsaw_id` INT,
      `target_container_id` INT,
      `notes` TEXT,
      `event_date` BIGINT NOT NULL,
      `created_by` VARCHAR(255),
      `created_at` BIGINT NOT NULL
    );
  END IF;
END //
CALL create_fuel_events() //
DROP PROCEDURE IF EXISTS create_fuel_events //

-- ============================================================
-- 4. TABELA: chainsaw_chain_stock (estoque de correntes)
-- ============================================================
DROP PROCEDURE IF EXISTS create_chain_stock //
CREATE PROCEDURE create_chain_stock()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = DATABASE() AND table_name = 'chainsaw_chain_stock'
  ) THEN
    CREATE TABLE `chainsaw_chain_stock` (
      `id` INT AUTO_INCREMENT PRIMARY KEY,
      `chain_type` VARCHAR(20) NOT NULL UNIQUE,
      `sharpened_in_box` INT DEFAULT 0,
      `in_field` INT DEFAULT 0,
      `in_workshop` INT DEFAULT 0,
      `total_stock` INT DEFAULT 0,
      `updated_at` BIGINT NOT NULL
    );
  END IF;
END //
CALL create_chain_stock() //
DROP PROCEDURE IF EXISTS create_chain_stock //

-- ============================================================
-- 5. TABELA: chainsaw_chain_events (movimentações de correntes)
-- ============================================================
DROP PROCEDURE IF EXISTS create_chain_events //
CREATE PROCEDURE create_chain_events()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = DATABASE() AND table_name = 'chainsaw_chain_events'
  ) THEN
    CREATE TABLE `chainsaw_chain_events` (
      `id` INT AUTO_INCREMENT PRIMARY KEY,
      `chain_type` VARCHAR(20) NOT NULL,
      `event_type` ENUM('envio_campo','retorno_oficina','afiacao_concluida','baixa_estoque','entrada_estoque') NOT NULL,
      `quantity` INT NOT NULL DEFAULT 1,
      `chainsaw_id` INT,
      `notes` TEXT,
      `event_date` BIGINT NOT NULL,
      `created_by` VARCHAR(255),
      `created_at` BIGINT NOT NULL
    );
  END IF;
END //
CALL create_chain_events() //
DROP PROCEDURE IF EXISTS create_chain_events //

-- ============================================================
-- 6. TABELA: chainsaw_parts (peças e consumíveis de motosserra)
-- ============================================================
DROP PROCEDURE IF EXISTS create_chainsaw_parts //
CREATE PROCEDURE create_chainsaw_parts()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = DATABASE() AND table_name = 'chainsaw_parts'
  ) THEN
    CREATE TABLE `chainsaw_parts` (
      `id` INT AUTO_INCREMENT PRIMARY KEY,
      `code` VARCHAR(100),
      `name` VARCHAR(255) NOT NULL,
      `category` VARCHAR(100),
      `unit` VARCHAR(20) DEFAULT 'un',
      `current_stock` DECIMAL(10,2) DEFAULT 0,
      `min_stock` DECIMAL(10,2) DEFAULT 0,
      `unit_cost` DECIMAL(10,2),
      `notes` TEXT,
      `created_by` VARCHAR(255),
      `created_at` BIGINT NOT NULL,
      `updated_at` BIGINT NOT NULL
    );
  END IF;
END //
CALL create_chainsaw_parts() //
DROP PROCEDURE IF EXISTS create_chainsaw_parts //

-- ============================================================
-- 7. TABELA: chainsaw_parts_events (movimentações de estoque de peças)
-- ============================================================
DROP PROCEDURE IF EXISTS create_parts_events //
CREATE PROCEDURE create_parts_events()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = DATABASE() AND table_name = 'chainsaw_parts_events'
  ) THEN
    CREATE TABLE `chainsaw_parts_events` (
      `id` INT AUTO_INCREMENT PRIMARY KEY,
      `part_id` INT NOT NULL,
      `event_type` ENUM('entrada','saida','baixa_os') NOT NULL,
      `quantity` DECIMAL(10,2) NOT NULL,
      `unit_cost` DECIMAL(10,2),
      `os_id` INT,
      `notes` TEXT,
      `event_date` BIGINT NOT NULL,
      `created_by` VARCHAR(255),
      `created_at` BIGINT NOT NULL
    );
  END IF;
END //
CALL create_parts_events() //
DROP PROCEDURE IF EXISTS create_parts_events //

-- ============================================================
-- 8. TABELA: chainsaw_service_orders (ordens de serviço)
-- ============================================================
DROP PROCEDURE IF EXISTS create_chainsaw_os //
CREATE PROCEDURE create_chainsaw_os()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = DATABASE() AND table_name = 'chainsaw_service_orders'
  ) THEN
    CREATE TABLE `chainsaw_service_orders` (
      `id` INT AUTO_INCREMENT PRIMARY KEY,
      `chainsaw_id` INT NOT NULL,
      `problem_type` ENUM('motor_falhando','nao_liga','superaquecimento','vazamento','corrente_problema','sabre_problema','manutencao_preventiva','outro') NOT NULL,
      `problem_description` TEXT,
      `priority` ENUM('baixa','media','alta','urgente') DEFAULT 'media',
      `status` ENUM('aberta','em_andamento','concluida','cancelada') DEFAULT 'aberta',
      `service_description` TEXT,
      `opened_by` VARCHAR(255),
      `opened_at` BIGINT NOT NULL,
      `started_at` BIGINT,
      `completed_at` BIGINT,
      `completed_by` VARCHAR(255),
      `created_at` BIGINT NOT NULL,
      `updated_at` BIGINT NOT NULL
    );
  END IF;
END //
CALL create_chainsaw_os() //
DROP PROCEDURE IF EXISTS create_chainsaw_os //

-- ============================================================
-- 9. TABELA: chainsaw_os_parts (peças usadas em cada OS)
-- ============================================================
DROP PROCEDURE IF EXISTS create_os_parts //
CREATE PROCEDURE create_os_parts()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = DATABASE() AND table_name = 'chainsaw_os_parts'
  ) THEN
    CREATE TABLE `chainsaw_os_parts` (
      `id` INT AUTO_INCREMENT PRIMARY KEY,
      `os_id` INT NOT NULL,
      `part_id` INT,
      `part_name` VARCHAR(255) NOT NULL,
      `quantity` DECIMAL(10,2) NOT NULL,
      `unit` VARCHAR(20) DEFAULT 'un',
      `unit_cost` DECIMAL(10,2),
      `from_stock` TINYINT(1) DEFAULT 1,
      `created_at` BIGINT NOT NULL
    );
  END IF;
END //
CALL create_os_parts() //
DROP PROCEDURE IF EXISTS create_os_parts //

-- ============================================================
-- 10. TABELA: user_permissions (controle de acesso)
-- ============================================================
DROP PROCEDURE IF EXISTS create_user_permissions //
CREATE PROCEDURE create_user_permissions()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = DATABASE() AND table_name = 'user_permissions'
  ) THEN
    CREATE TABLE `user_permissions` (
      `id` INT AUTO_INCREMENT PRIMARY KEY,
      `user_id` VARCHAR(255) NOT NULL UNIQUE,
      `user_name` VARCHAR(255),
      `modules` TEXT NOT NULL DEFAULT '[]',
      `created_at` BIGINT NOT NULL,
      `updated_at` BIGINT NOT NULL
    );
  END IF;
END //
CALL create_user_permissions() //
DROP PROCEDURE IF EXISTS create_user_permissions //

DELIMITER ;

-- ============================================================
-- VERIFICAÇÃO FINAL
-- ============================================================
SELECT 
  table_name AS 'Tabela',
  table_rows AS 'Registros (aprox.)',
  ROUND((data_length + index_length) / 1024, 2) AS 'Tamanho (KB)'
FROM information_schema.tables 
WHERE table_schema = DATABASE()
  AND table_name IN (
    'chainsaws', 'fuel_containers', 'fuel_events',
    'chainsaw_chain_stock', 'chainsaw_chain_events',
    'chainsaw_parts', 'chainsaw_parts_events',
    'chainsaw_service_orders', 'chainsaw_os_parts',
    'user_permissions'
  )
ORDER BY table_name;
