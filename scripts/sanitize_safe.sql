-- ============================================================
-- SCRIPT SEGURO DE SANITIZAÇÃO DE CAMPOS NUMÉRICOS
-- Substitui vírgula por ponto em campos numéricos VARCHAR
-- Usa IGNORE para pular erros de colunas inexistentes
-- Execute no phpMyAdmin do Hostinger
-- ============================================================

-- Desabilitar verificação de FK para evitar erros durante update
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- collaborator_attendance
-- ============================================================
UPDATE `collaborator_attendance` SET `daily_value` = REPLACE(`daily_value`, ',', '.') WHERE `daily_value` LIKE '%,%';

-- ============================================================
-- vehicle_records
-- ============================================================
UPDATE `vehicle_records` SET `liters` = REPLACE(`liters`, ',', '.') WHERE `liters` LIKE '%,%';
UPDATE `vehicle_records` SET `fuel_cost` = REPLACE(`fuel_cost`, ',', '.') WHERE `fuel_cost` LIKE '%,%';
UPDATE `vehicle_records` SET `price_per_liter` = REPLACE(`price_per_liter`, ',', '.') WHERE `price_per_liter` LIKE '%,%';
UPDATE `vehicle_records` SET `maintenance_cost` = REPLACE(`maintenance_cost`, ',', '.') WHERE `maintenance_cost` LIKE '%,%';
UPDATE `vehicle_records` SET `charged_value` = REPLACE(`charged_value`, ',', '.') WHERE `charged_value` LIKE '%,%';

-- ============================================================
-- extra_expenses
-- ============================================================
UPDATE `extra_expenses` SET `amount` = REPLACE(`amount`, ',', '.') WHERE `amount` LIKE '%,%';

-- ============================================================
-- financial_entries
-- ============================================================
UPDATE `financial_entries` SET `amount` = REPLACE(`amount`, ',', '.') WHERE `amount` LIKE '%,%';

-- ============================================================
-- fuel_suppliers
-- ============================================================
UPDATE `fuel_suppliers` SET `price_per_liter` = REPLACE(`price_per_liter`, ',', '.') WHERE `price_per_liter` LIKE '%,%';
UPDATE `fuel_suppliers` SET `tank_capacity` = REPLACE(`tank_capacity`, ',', '.') WHERE `tank_capacity` LIKE '%,%';
UPDATE `fuel_suppliers` SET `tank_alert_threshold` = REPLACE(`tank_alert_threshold`, ',', '.') WHERE `tank_alert_threshold` LIKE '%,%';

-- ============================================================
-- fuel_invoices
-- ============================================================
UPDATE `fuel_invoices` SET `total_amount` = REPLACE(`total_amount`, ',', '.') WHERE `total_amount` LIKE '%,%';
UPDATE `fuel_invoices` SET `liters` = REPLACE(`liters`, ',', '.') WHERE `liters` LIKE '%,%';
UPDATE `fuel_invoices` SET `price_per_liter` = REPLACE(`price_per_liter`, ',', '.') WHERE `price_per_liter` LIKE '%,%';

-- ============================================================
-- fuel_records (tabela legada de abastecimento)
-- ============================================================
UPDATE `fuel_records` SET `liters` = REPLACE(`liters`, ',', '.') WHERE `liters` LIKE '%,%';
UPDATE `fuel_records` SET `price_per_liter` = REPLACE(`price_per_liter`, ',', '.') WHERE `price_per_liter` LIKE '%,%';
UPDATE `fuel_records` SET `total_cost` = REPLACE(`total_cost`, ',', '.') WHERE `total_cost` LIKE '%,%';

-- ============================================================
-- machine_fuel (tabela legada de abastecimento de máquinas)
-- ============================================================
UPDATE `machine_fuel` SET `liters` = REPLACE(`liters`, ',', '.') WHERE `liters` LIKE '%,%';
UPDATE `machine_fuel` SET `price_per_liter` = REPLACE(`price_per_liter`, ',', '.') WHERE `price_per_liter` LIKE '%,%';
UPDATE `machine_fuel` SET `total_cost` = REPLACE(`total_cost`, ',', '.') WHERE `total_cost` LIKE '%,%';

-- ============================================================
-- equipment_maintenance
-- ============================================================
UPDATE `equipment_maintenance` SET `cost` = REPLACE(`cost`, ',', '.') WHERE `cost` LIKE '%,%';

-- ============================================================
-- equipment_oil_records
-- ============================================================
UPDATE `equipment_oil_records` SET `liters` = REPLACE(`liters`, ',', '.') WHERE `liters` LIKE '%,%';
UPDATE `equipment_oil_records` SET `cost` = REPLACE(`cost`, ',', '.') WHERE `cost` LIKE '%,%';

-- ============================================================
-- cargo_loads
-- ============================================================
UPDATE `cargo_loads` SET `gross_weight` = REPLACE(`gross_weight`, ',', '.') WHERE `gross_weight` LIKE '%,%';
UPDATE `cargo_loads` SET `tare_weight` = REPLACE(`tare_weight`, ',', '.') WHERE `tare_weight` LIKE '%,%';
UPDATE `cargo_loads` SET `net_weight` = REPLACE(`net_weight`, ',', '.') WHERE `net_weight` LIKE '%,%';
UPDATE `cargo_loads` SET `price_per_ton` = REPLACE(`price_per_ton`, ',', '.') WHERE `price_per_ton` LIKE '%,%';
UPDATE `cargo_loads` SET `total_value` = REPLACE(`total_value`, ',', '.') WHERE `total_value` LIKE '%,%';
UPDATE `cargo_loads` SET `freight_cost` = REPLACE(`freight_cost`, ',', '.') WHERE `freight_cost` LIKE '%,%';
UPDATE `cargo_loads` SET `client_measurement` = REPLACE(`client_measurement`, ',', '.') WHERE `client_measurement` LIKE '%,%';
UPDATE `cargo_loads` SET `exit_weight` = REPLACE(`exit_weight`, ',', '.') WHERE `exit_weight` LIKE '%,%';
UPDATE `cargo_loads` SET `entry_weight` = REPLACE(`entry_weight`, ',', '.') WHERE `entry_weight` LIKE '%,%';

-- ============================================================
-- cargo_destinations
-- ============================================================
UPDATE `cargo_destinations` SET `price_per_ton` = REPLACE(`price_per_ton`, ',', '.') WHERE `price_per_ton` LIKE '%,%';
UPDATE `cargo_destinations` SET `price_per_meter` = REPLACE(`price_per_meter`, ',', '.') WHERE `price_per_meter` LIKE '%,%';

-- ============================================================
-- cargo_weekly_closings
-- ============================================================
UPDATE `cargo_weekly_closings` SET `total_value` = REPLACE(`total_value`, ',', '.') WHERE `total_value` LIKE '%,%';
UPDATE `cargo_weekly_closings` SET `total_weight` = REPLACE(`total_weight`, ',', '.') WHERE `total_weight` LIKE '%,%';

-- ============================================================
-- client_payments
-- ============================================================
UPDATE `client_payments` SET `amount` = REPLACE(`amount`, ',', '.') WHERE `amount` LIKE '%,%';

-- ============================================================
-- client_contracts
-- ============================================================
UPDATE `client_contracts` SET `price_per_ton` = REPLACE(`price_per_ton`, ',', '.') WHERE `price_per_ton` LIKE '%,%';
UPDATE `client_contracts` SET `price_per_meter` = REPLACE(`price_per_meter`, ',', '.') WHERE `price_per_meter` LIKE '%,%';

-- ============================================================
-- collaborators
-- ============================================================
UPDATE `collaborators` SET `daily_rate` = REPLACE(`daily_rate`, ',', '.') WHERE `daily_rate` LIKE '%,%';
UPDATE `collaborators` SET `salary` = REPLACE(`salary`, ',', '.') WHERE `salary` LIKE '%,%';

-- ============================================================
-- third_party_contractors
-- ============================================================
UPDATE `third_party_contractors` SET `rate_per_km` = REPLACE(`rate_per_km`, ',', '.') WHERE `rate_per_km` LIKE '%,%';
UPDATE `third_party_contractors` SET `rate_per_ton` = REPLACE(`rate_per_ton`, ',', '.') WHERE `rate_per_ton` LIKE '%,%';

-- ============================================================
-- chainsaw_parts
-- ============================================================
UPDATE `chainsaw_parts` SET `unit_cost` = REPLACE(`unit_cost`, ',', '.') WHERE `unit_cost` LIKE '%,%';
UPDATE `chainsaw_parts` SET `current_stock_value` = REPLACE(`current_stock_value`, ',', '.') WHERE `current_stock_value` LIKE '%,%';

-- ============================================================
-- chainsaw_service_parts
-- ============================================================
UPDATE `chainsaw_service_parts` SET `unit_cost` = REPLACE(`unit_cost`, ',', '.') WHERE `unit_cost` LIKE '%,%';

-- ============================================================
-- maintenance_parts
-- ============================================================
UPDATE `maintenance_parts` SET `unit_cost` = REPLACE(`unit_cost`, ',', '.') WHERE `unit_cost` LIKE '%,%';

-- ============================================================
-- parts_requests
-- ============================================================
UPDATE `parts_requests` SET `unit_cost` = REPLACE(`unit_cost`, ',', '.') WHERE `unit_cost` LIKE '%,%';
UPDATE `parts_requests` SET `total_cost` = REPLACE(`total_cost`, ',', '.') WHERE `total_cost` LIKE '%,%';

-- ============================================================
-- oil_stock
-- ============================================================
UPDATE `oil_stock` SET `price_per_liter` = REPLACE(`price_per_liter`, ',', '.') WHERE `price_per_liter` LIKE '%,%';
UPDATE `oil_stock` SET `total_value` = REPLACE(`total_value`, ',', '.') WHERE `total_value` LIKE '%,%';

-- ============================================================
-- fuel_container_events
-- ============================================================
UPDATE `fuel_container_events` SET `liters` = REPLACE(`liters`, ',', '.') WHERE `liters` LIKE '%,%';
UPDATE `fuel_container_events` SET `price_per_liter` = REPLACE(`price_per_liter`, ',', '.') WHERE `price_per_liter` LIKE '%,%';

-- ============================================================
-- machine_hours
-- ============================================================
UPDATE `machine_hours` SET `hour_meter_start` = REPLACE(`hour_meter_start`, ',', '.') WHERE `hour_meter_start` LIKE '%,%';
UPDATE `machine_hours` SET `hour_meter_end` = REPLACE(`hour_meter_end`, ',', '.') WHERE `hour_meter_end` LIKE '%,%';

-- ============================================================
-- machine_maintenance
-- ============================================================
UPDATE `machine_maintenance` SET `cost` = REPLACE(`cost`, ',', '.') WHERE `cost` LIKE '%,%';

-- Reabilitar verificação de FK
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- VERIFICAÇÃO FINAL - Contar registros com vírgula restantes
-- ============================================================
SELECT 'vehicle_records.liters' as campo, COUNT(*) as registros_com_virgula FROM `vehicle_records` WHERE `liters` LIKE '%,%'
UNION ALL SELECT 'vehicle_records.fuel_cost', COUNT(*) FROM `vehicle_records` WHERE `fuel_cost` LIKE '%,%'
UNION ALL SELECT 'extra_expenses.amount', COUNT(*) FROM `extra_expenses` WHERE `amount` LIKE '%,%'
UNION ALL SELECT 'financial_entries.amount', COUNT(*) FROM `financial_entries` WHERE `amount` LIKE '%,%'
UNION ALL SELECT 'collaborator_attendance.daily_value', COUNT(*) FROM `collaborator_attendance` WHERE `daily_value` LIKE '%,%';
