-- ============================================================
-- MIGRAÇÃO: Caminhões Terceirizados + Correção quotation_requests
-- Execute este script no phpMyAdmin da Hostinger
-- Banco: u629128033_btree_ambienta
-- ============================================================

-- 1. Criar tabela de tarifas de frete
CREATE TABLE IF NOT EXISTS `freight_rates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `worksite` varchar(255) NOT NULL,
  `destination` varchar(255) NOT NULL,
  `rate_per_ton` varchar(20) NOT NULL,
  `notes` text,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);

-- 2. Criar tabela de abastecimentos de terceirizados
CREATE TABLE IF NOT EXISTS `third_party_fuel` (
  `id` int NOT NULL AUTO_INCREMENT,
  `equipment_id` int NOT NULL,
  `date` timestamp NOT NULL,
  `liters` varchar(20) NOT NULL,
  `price_per_liter` varchar(20) NOT NULL,
  `total` varchar(20) NOT NULL,
  `location` varchar(255),
  `notes` text,
  `created_by` int,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`),
  CONSTRAINT `third_party_fuel_equipment_id_fk` FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`),
  CONSTRAINT `third_party_fuel_created_by_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
);

-- 3. Adicionar campos de terceirizado na tabela equipment
ALTER TABLE `equipment`
  ADD COLUMN IF NOT EXISTS `is_third_party` tinyint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `third_party_owner` varchar(255) NULL;

-- 4. Remover coluna updated_at da tabela quotation_requests (se existir)
ALTER TABLE `quotation_requests` DROP COLUMN IF EXISTS `updated_at`;

-- 5. Inserir tarifas iniciais (apenas se a tabela estiver vazia)
INSERT INTO `freight_rates` (`worksite`, `destination`, `rate_per_ton`, `notes`)
SELECT * FROM (
  SELECT 'SIMFLOR', 'Líder Lobato', '89.00', 'SIMFLOR / Líder Lobato' UNION ALL
  SELECT 'SIMFLOR', 'Sonoco Lda.', '58.00', 'SIMFLOR / Sonoco Lda.' UNION ALL
  SELECT 'SIMFLOR', 'Mauá', '32.00', 'SIMFLOR / Mauá' UNION ALL
  SELECT 'Fazenda GW', 'Líder Lobato', '80.00', 'GW / Líder Lobato' UNION ALL
  SELECT 'Fazenda GW', 'Granja Jeferson Beraldo', '75.00', 'GW / Granja Jeferson Beraldo'
) AS tmp
WHERE NOT EXISTS (SELECT 1 FROM `freight_rates` LIMIT 1);

-- ============================================================
-- FIM DA MIGRAÇÃO
-- ============================================================
