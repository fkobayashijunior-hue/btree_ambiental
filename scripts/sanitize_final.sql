-- ============================================================
-- SCRIPT DEFINITIVO DE SANITIZAÇÃO DE CAMPOS NUMÉRICOS
-- Estrutura verificada via SSH direto no banco do Hostinger
-- Execute no phpMyAdmin do Hostinger (banco u629128033_btree_ambienta)
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- vehicle_records (liters, fuel_cost, price_per_liter, odometer,
--                  km_driven, maintenance_cost, charged_value)
-- ============================================================
UPDATE `vehicle_records` SET `liters` = REPLACE(`liters`, ',', '.') WHERE `liters` LIKE '%,%';
UPDATE `vehicle_records` SET `fuel_cost` = REPLACE(`fuel_cost`, ',', '.') WHERE `fuel_cost` LIKE '%,%';
UPDATE `vehicle_records` SET `price_per_liter` = REPLACE(`price_per_liter`, ',', '.') WHERE `price_per_liter` LIKE '%,%';
UPDATE `vehicle_records` SET `odometer` = REPLACE(`odometer`, ',', '.') WHERE `odometer` LIKE '%,%';
UPDATE `vehicle_records` SET `km_driven` = REPLACE(`km_driven`, ',', '.') WHERE `km_driven` LIKE '%,%';
UPDATE `vehicle_records` SET `maintenance_cost` = REPLACE(`maintenance_cost`, ',', '.') WHERE `maintenance_cost` LIKE '%,%';
UPDATE `vehicle_records` SET `charged_value` = REPLACE(`charged_value`, ',', '.') WHERE `charged_value` LIKE '%,%';

-- ============================================================
-- collaborator_attendance (daily_value)
-- ============================================================
UPDATE `collaborator_attendance` SET `daily_value` = REPLACE(`daily_value`, ',', '.') WHERE `daily_value` LIKE '%,%';

-- ============================================================
-- extra_expenses (amount)
-- ============================================================
UPDATE `extra_expenses` SET `amount` = REPLACE(`amount`, ',', '.') WHERE `amount` LIKE '%,%';

-- ============================================================
-- financial_entries (amount)
-- ============================================================
UPDATE `financial_entries` SET `amount` = REPLACE(`amount`, ',', '.') WHERE `amount` LIKE '%,%';

-- ============================================================
-- fuel_suppliers (price_per_liter, price_per_liter_s10,
--                 tank_capacity, tank_alert_threshold)
-- ============================================================
UPDATE `fuel_suppliers` SET `price_per_liter` = REPLACE(`price_per_liter`, ',', '.') WHERE `price_per_liter` LIKE '%,%';
UPDATE `fuel_suppliers` SET `price_per_liter_s10` = REPLACE(`price_per_liter_s10`, ',', '.') WHERE `price_per_liter_s10` LIKE '%,%';
UPDATE `fuel_suppliers` SET `tank_capacity` = REPLACE(`tank_capacity`, ',', '.') WHERE `tank_capacity` LIKE '%,%';
UPDATE `fuel_suppliers` SET `tank_alert_threshold` = REPLACE(`tank_alert_threshold`, ',', '.') WHERE `tank_alert_threshold` LIKE '%,%';

-- ============================================================
-- fuel_invoices (total_amount, liters, price_per_liter,
--                paid_amount, liters_used)
-- ============================================================
UPDATE `fuel_invoices` SET `total_amount` = REPLACE(`total_amount`, ',', '.') WHERE `total_amount` LIKE '%,%';
UPDATE `fuel_invoices` SET `liters` = REPLACE(`liters`, ',', '.') WHERE `liters` LIKE '%,%';
UPDATE `fuel_invoices` SET `price_per_liter` = REPLACE(`price_per_liter`, ',', '.') WHERE `price_per_liter` LIKE '%,%';
UPDATE `fuel_invoices` SET `paid_amount` = REPLACE(`paid_amount`, ',', '.') WHERE `paid_amount` LIKE '%,%';
UPDATE `fuel_invoices` SET `liters_used` = REPLACE(`liters_used`, ',', '.') WHERE `liters_used` LIKE '%,%';

-- ============================================================
-- fuel_records (liters, total_value, price_per_liter, odometer)
-- NOTA: coluna é total_value (não total_cost)
-- ============================================================
UPDATE `fuel_records` SET `liters` = REPLACE(`liters`, ',', '.') WHERE `liters` LIKE '%,%';
UPDATE `fuel_records` SET `total_value` = REPLACE(`total_value`, ',', '.') WHERE `total_value` LIKE '%,%';
UPDATE `fuel_records` SET `price_per_liter` = REPLACE(`price_per_liter`, ',', '.') WHERE `price_per_liter` LIKE '%,%';
UPDATE `fuel_records` SET `odometer` = REPLACE(`odometer`, ',', '.') WHERE `odometer` LIKE '%,%';

-- ============================================================
-- fuel_container_events (volume_liters, cost_per_liter, total_cost)
-- ============================================================
UPDATE `fuel_container_events` SET `volume_liters` = REPLACE(`volume_liters`, ',', '.') WHERE `volume_liters` LIKE '%,%';
UPDATE `fuel_container_events` SET `cost_per_liter` = REPLACE(`cost_per_liter`, ',', '.') WHERE `cost_per_liter` LIKE '%,%';
UPDATE `fuel_container_events` SET `total_cost` = REPLACE(`total_cost`, ',', '.') WHERE `total_cost` LIKE '%,%';

-- ============================================================
-- machine_fuel (hour_meter, liters, price_per_liter, total_value)
-- NOTA: coluna é total_value (não total_cost)
-- ============================================================
UPDATE `machine_fuel` SET `hour_meter` = REPLACE(`hour_meter`, ',', '.') WHERE `hour_meter` LIKE '%,%';
UPDATE `machine_fuel` SET `liters` = REPLACE(`liters`, ',', '.') WHERE `liters` LIKE '%,%';
UPDATE `machine_fuel` SET `price_per_liter` = REPLACE(`price_per_liter`, ',', '.') WHERE `price_per_liter` LIKE '%,%';
UPDATE `machine_fuel` SET `total_value` = REPLACE(`total_value`, ',', '.') WHERE `total_value` LIKE '%,%';

-- ============================================================
-- machine_hours (start_hour_meter, end_hour_meter, hours_worked)
-- NOTA: coluna é start_hour_meter (não hour_meter_start)
-- ============================================================
UPDATE `machine_hours` SET `start_hour_meter` = REPLACE(`start_hour_meter`, ',', '.') WHERE `start_hour_meter` LIKE '%,%';
UPDATE `machine_hours` SET `end_hour_meter` = REPLACE(`end_hour_meter`, ',', '.') WHERE `end_hour_meter` LIKE '%,%';
UPDATE `machine_hours` SET `hours_worked` = REPLACE(`hours_worked`, ',', '.') WHERE `hours_worked` LIKE '%,%';

-- ============================================================
-- machine_maintenance (hour_meter, labor_cost, total_cost,
--                      next_maintenance_hours)
-- ============================================================
UPDATE `machine_maintenance` SET `hour_meter` = REPLACE(`hour_meter`, ',', '.') WHERE `hour_meter` LIKE '%,%';
UPDATE `machine_maintenance` SET `labor_cost` = REPLACE(`labor_cost`, ',', '.') WHERE `labor_cost` LIKE '%,%';
UPDATE `machine_maintenance` SET `total_cost` = REPLACE(`total_cost`, ',', '.') WHERE `total_cost` LIKE '%,%';
UPDATE `machine_maintenance` SET `next_maintenance_hours` = REPLACE(`next_maintenance_hours`, ',', '.') WHERE `next_maintenance_hours` LIKE '%,%';

-- ============================================================
-- maintenance_parts (unit_cost, total_cost)
-- ============================================================
UPDATE `maintenance_parts` SET `unit_cost` = REPLACE(`unit_cost`, ',', '.') WHERE `unit_cost` LIKE '%,%';
UPDATE `maintenance_parts` SET `total_cost` = REPLACE(`total_cost`, ',', '.') WHERE `total_cost` LIKE '%,%';

-- ============================================================
-- oil_stock (quantity_liters, purchase_quantity_liters,
--            price_per_liter, total_value)
-- ============================================================
UPDATE `oil_stock` SET `quantity_liters` = REPLACE(`quantity_liters`, ',', '.') WHERE `quantity_liters` LIKE '%,%';
UPDATE `oil_stock` SET `purchase_quantity_liters` = REPLACE(`purchase_quantity_liters`, ',', '.') WHERE `purchase_quantity_liters` LIKE '%,%';
UPDATE `oil_stock` SET `price_per_liter` = REPLACE(`price_per_liter`, ',', '.') WHERE `price_per_liter` LIKE '%,%';
UPDATE `oil_stock` SET `total_value` = REPLACE(`total_value`, ',', '.') WHERE `total_value` LIKE '%,%';

-- ============================================================
-- parts_requests (estimated_cost)
-- NOTA: não existe unit_cost nem total_cost nesta tabela
-- ============================================================
UPDATE `parts_requests` SET `estimated_cost` = REPLACE(`estimated_cost`, ',', '.') WHERE `estimated_cost` LIKE '%,%';

-- ============================================================
-- parts_stock_movements (unit_cost)
-- ============================================================
UPDATE `parts_stock_movements` SET `unit_cost` = REPLACE(`unit_cost`, ',', '.') WHERE `unit_cost` LIKE '%,%';

-- ============================================================
-- chainsaw_service_parts (unit_cost)
-- ============================================================
UPDATE `chainsaw_service_parts` SET `unit_cost` = REPLACE(`unit_cost`, ',', '.') WHERE `unit_cost` LIKE '%,%';

-- ============================================================
-- collaborators (daily_rate)
-- NOTA: não existe coluna salary nesta tabela
-- ============================================================
UPDATE `collaborators` SET `daily_rate` = REPLACE(`daily_rate`, ',', '.') WHERE `daily_rate` LIKE '%,%';

-- ============================================================
-- cargo_loads (height_m, width_m, length_m, volume_m3,
--              weight_kg, weight_out_kg, weight_in_kg,
--              final_height_m, final_width_m, final_length_m,
--              final_volume_m3, weight_net_kg, boleto_amount, humidity)
-- NOTA: não existem gross_weight, tare_weight, net_weight, price_per_ton, etc.
-- ============================================================
UPDATE `cargo_loads` SET `height_m` = REPLACE(`height_m`, ',', '.') WHERE `height_m` LIKE '%,%';
UPDATE `cargo_loads` SET `width_m` = REPLACE(`width_m`, ',', '.') WHERE `width_m` LIKE '%,%';
UPDATE `cargo_loads` SET `length_m` = REPLACE(`length_m`, ',', '.') WHERE `length_m` LIKE '%,%';
UPDATE `cargo_loads` SET `volume_m3` = REPLACE(`volume_m3`, ',', '.') WHERE `volume_m3` LIKE '%,%';
UPDATE `cargo_loads` SET `weight_kg` = REPLACE(`weight_kg`, ',', '.') WHERE `weight_kg` LIKE '%,%';
UPDATE `cargo_loads` SET `weight_out_kg` = REPLACE(`weight_out_kg`, ',', '.') WHERE `weight_out_kg` LIKE '%,%';
UPDATE `cargo_loads` SET `weight_in_kg` = REPLACE(`weight_in_kg`, ',', '.') WHERE `weight_in_kg` LIKE '%,%';
UPDATE `cargo_loads` SET `final_height_m` = REPLACE(`final_height_m`, ',', '.') WHERE `final_height_m` LIKE '%,%';
UPDATE `cargo_loads` SET `final_width_m` = REPLACE(`final_width_m`, ',', '.') WHERE `final_width_m` LIKE '%,%';
UPDATE `cargo_loads` SET `final_length_m` = REPLACE(`final_length_m`, ',', '.') WHERE `final_length_m` LIKE '%,%';
UPDATE `cargo_loads` SET `final_volume_m3` = REPLACE(`final_volume_m3`, ',', '.') WHERE `final_volume_m3` LIKE '%,%';
UPDATE `cargo_loads` SET `weight_net_kg` = REPLACE(`weight_net_kg`, ',', '.') WHERE `weight_net_kg` LIKE '%,%';
UPDATE `cargo_loads` SET `boleto_amount` = REPLACE(`boleto_amount`, ',', '.') WHERE `boleto_amount` LIKE '%,%';
UPDATE `cargo_loads` SET `humidity` = REPLACE(`humidity`, ',', '.') WHERE `humidity` LIKE '%,%';

-- ============================================================
-- third_party_fuel (liters, price_per_liter, total)
-- ============================================================
UPDATE `third_party_fuel` SET `liters` = REPLACE(`liters`, ',', '.') WHERE `liters` LIKE '%,%';
UPDATE `third_party_fuel` SET `price_per_liter` = REPLACE(`price_per_liter`, ',', '.') WHERE `price_per_liter` LIKE '%,%';
UPDATE `third_party_fuel` SET `total` = REPLACE(`total`, ',', '.') WHERE `total` LIKE '%,%';

-- ============================================================
-- purchase_order_items (unit_cost)
-- ============================================================
UPDATE `purchase_order_items` SET `unit_cost` = REPLACE(`unit_cost`, ',', '.') WHERE `unit_cost` LIKE '%,%';

-- ============================================================
-- parts (unit_cost, unit_value)
-- ============================================================
UPDATE `parts` SET `unit_cost` = REPLACE(`unit_cost`, ',', '.') WHERE `unit_cost` LIKE '%,%';
UPDATE `parts` SET `unit_value` = REPLACE(`unit_value`, ',', '.') WHERE `unit_value` LIKE '%,%';

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- VERIFICAÇÃO FINAL — todos os valores devem ser 0
-- ============================================================
SELECT 'vehicle_records.liters' as campo, COUNT(*) as com_virgula FROM `vehicle_records` WHERE `liters` LIKE '%,%'
UNION ALL SELECT 'vehicle_records.fuel_cost', COUNT(*) FROM `vehicle_records` WHERE `fuel_cost` LIKE '%,%'
UNION ALL SELECT 'vehicle_records.maintenance_cost', COUNT(*) FROM `vehicle_records` WHERE `maintenance_cost` LIKE '%,%'
UNION ALL SELECT 'fuel_records.liters', COUNT(*) FROM `fuel_records` WHERE `liters` LIKE '%,%'
UNION ALL SELECT 'fuel_records.total_value', COUNT(*) FROM `fuel_records` WHERE `total_value` LIKE '%,%'
UNION ALL SELECT 'machine_fuel.liters', COUNT(*) FROM `machine_fuel` WHERE `liters` LIKE '%,%'
UNION ALL SELECT 'machine_fuel.total_value', COUNT(*) FROM `machine_fuel` WHERE `total_value` LIKE '%,%'
UNION ALL SELECT 'machine_hours.start_hour_meter', COUNT(*) FROM `machine_hours` WHERE `start_hour_meter` LIKE '%,%'
UNION ALL SELECT 'machine_maintenance.total_cost', COUNT(*) FROM `machine_maintenance` WHERE `total_cost` LIKE '%,%'
UNION ALL SELECT 'maintenance_parts.unit_cost', COUNT(*) FROM `maintenance_parts` WHERE `unit_cost` LIKE '%,%'
UNION ALL SELECT 'cargo_loads.volume_m3', COUNT(*) FROM `cargo_loads` WHERE `volume_m3` LIKE '%,%'
UNION ALL SELECT 'cargo_loads.weight_kg', COUNT(*) FROM `cargo_loads` WHERE `weight_kg` LIKE '%,%'
UNION ALL SELECT 'extra_expenses.amount', COUNT(*) FROM `extra_expenses` WHERE `amount` LIKE '%,%'
UNION ALL SELECT 'financial_entries.amount', COUNT(*) FROM `financial_entries` WHERE `amount` LIKE '%,%'
UNION ALL SELECT 'collaborator_attendance.daily_value', COUNT(*) FROM `collaborator_attendance` WHERE `daily_value` LIKE '%,%'
UNION ALL SELECT 'third_party_fuel.liters', COUNT(*) FROM `third_party_fuel` WHERE `liters` LIKE '%,%'
UNION ALL SELECT 'oil_stock.price_per_liter', COUNT(*) FROM `oil_stock` WHERE `price_per_liter` LIKE '%,%';
