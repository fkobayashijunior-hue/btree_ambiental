-- ============================================================
-- BTREE Ambiental — Script de Sanitização de Campos Numéricos
-- Substitui vírgula por ponto em todos os campos numéricos VARCHAR
-- Execute no phpMyAdmin do Hostinger (banco u629128033_btree_ambienta)
-- IMPORTANTE: Faça backup antes de executar!
-- ============================================================

START TRANSACTION;

-- Tabela: attendance_records
UPDATE `attendance_records` SET `daily_value` = REPLACE(`daily_value`, ',', '.') WHERE `daily_value` LIKE '%,%';

-- Tabela: cargo_destinations
UPDATE `cargo_destinations` SET `price_per_ton` = REPLACE(`price_per_ton`, ',', '.') WHERE `price_per_ton` LIKE '%,%';
UPDATE `cargo_destinations` SET `price_per_m3` = REPLACE(`price_per_m3`, ',', '.') WHERE `price_per_m3` LIKE '%,%';

-- Tabela: cargo_loads
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
UPDATE `cargo_loads` SET `third_party_cost` = REPLACE(`third_party_cost`, ',', '.') WHERE `third_party_cost` LIKE '%,%';

-- Tabela: cargo_shipments
UPDATE `cargo_shipments` SET `height` = REPLACE(`height`, ',', '.') WHERE `height` LIKE '%,%';
UPDATE `cargo_shipments` SET `width` = REPLACE(`width`, ',', '.') WHERE `width` LIKE '%,%';
UPDATE `cargo_shipments` SET `length` = REPLACE(`length`, ',', '.') WHERE `length` LIKE '%,%';
UPDATE `cargo_shipments` SET `volume` = REPLACE(`volume`, ',', '.') WHERE `volume` LIKE '%,%';

-- Tabela: chainsaw_part_movements
UPDATE `chainsaw_part_movements` SET `quantity` = REPLACE(`quantity`, ',', '.') WHERE `quantity` LIKE '%,%';

-- Tabela: chainsaw_parts
UPDATE `chainsaw_parts` SET `current_stock` = REPLACE(`current_stock`, ',', '.') WHERE `current_stock` LIKE '%,%';
UPDATE `chainsaw_parts` SET `min_stock` = REPLACE(`min_stock`, ',', '.') WHERE `min_stock` LIKE '%,%';

-- Tabela: chainsaw_service_parts
UPDATE `chainsaw_service_parts` SET `quantity` = REPLACE(`quantity`, ',', '.') WHERE `quantity` LIKE '%,%';

-- Tabela: client_contracts
UPDATE `client_contracts` SET `estimated_volume` = REPLACE(`estimated_volume`, ',', '.') WHERE `estimated_volume` LIKE '%,%';
UPDATE `client_contracts` SET `total_amount` = REPLACE(`total_amount`, ',', '.') WHERE `total_amount` LIKE '%,%';

-- Tabela: client_payment_receipts
UPDATE `client_payment_receipts` SET `amount` = REPLACE(`amount`, ',', '.') WHERE `amount` LIKE '%,%';

-- Tabela: client_payments
UPDATE `client_payments` SET `amount` = REPLACE(`amount`, ',', '.') WHERE `amount` LIKE '%,%';

-- Tabela: clients
UPDATE `clients` SET `price_per_ton` = REPLACE(`price_per_ton`, ',', '.') WHERE `price_per_ton` LIKE '%,%';
UPDATE `clients` SET `residue_per_ton` = REPLACE(`residue_per_ton`, ',', '.') WHERE `residue_per_ton` LIKE '%,%';

-- Tabela: collaborator_attendance
UPDATE `collaborator_attendance` SET `daily_value` = REPLACE(`daily_value`, ',', '.') WHERE `daily_value` LIKE '%,%';

-- Tabela: collaborators
UPDATE `collaborators` SET `daily_rate` = REPLACE(`daily_rate`, ',', '.') WHERE `daily_rate` LIKE '%,%';

-- Tabela: equipment
UPDATE `equipment` SET `default_height_m` = REPLACE(`default_height_m`, ',', '.') WHERE `default_height_m` LIKE '%,%';
UPDATE `equipment` SET `default_width_m` = REPLACE(`default_width_m`, ',', '.') WHERE `default_width_m` LIKE '%,%';
UPDATE `equipment` SET `default_length_m` = REPLACE(`default_length_m`, ',', '.') WHERE `default_length_m` LIKE '%,%';
UPDATE `equipment` SET `accumulated_hours` = REPLACE(`accumulated_hours`, ',', '.') WHERE `accumulated_hours` LIKE '%,%';
UPDATE `equipment` SET `accumulated_km` = REPLACE(`accumulated_km`, ',', '.') WHERE `accumulated_km` LIKE '%,%';

-- Tabela: equipment_maintenance
UPDATE `equipment_maintenance` SET `cost` = REPLACE(`cost`, ',', '.') WHERE `cost` LIKE '%,%';

-- Tabela: extra_expenses
UPDATE `extra_expenses` SET `amount` = REPLACE(`amount`, ',', '.') WHERE `amount` LIKE '%,%';

-- Tabela: financial_entries
UPDATE `financial_entries` SET `amount` = REPLACE(`amount`, ',', '.') WHERE `amount` LIKE '%,%';

-- Tabela: fuel_container_events
UPDATE `fuel_container_events` SET `cost_per_liter` = REPLACE(`cost_per_liter`, ',', '.') WHERE `cost_per_liter` LIKE '%,%';
UPDATE `fuel_container_events` SET `total_cost` = REPLACE(`total_cost`, ',', '.') WHERE `total_cost` LIKE '%,%';

-- Tabela: fuel_records
UPDATE `fuel_records` SET `liters` = REPLACE(`liters`, ',', '.') WHERE `liters` LIKE '%,%';
UPDATE `fuel_records` SET `total_value` = REPLACE(`total_value`, ',', '.') WHERE `total_value` LIKE '%,%';
UPDATE `fuel_records` SET `price_per_liter` = REPLACE(`price_per_liter`, ',', '.') WHERE `price_per_liter` LIKE '%,%';
UPDATE `fuel_records` SET `odometer` = REPLACE(`odometer`, ',', '.') WHERE `odometer` LIKE '%,%';

-- Tabela: gps_hours_log
UPDATE `gps_hours_log` SET `hours_worked` = REPLACE(`hours_worked`, ',', '.') WHERE `hours_worked` LIKE '%,%';
UPDATE `gps_hours_log` SET `hour_meter_start` = REPLACE(`hour_meter_start`, ',', '.') WHERE `hour_meter_start` LIKE '%,%';
UPDATE `gps_hours_log` SET `hour_meter_end` = REPLACE(`hour_meter_end`, ',', '.') WHERE `hour_meter_end` LIKE '%,%';
UPDATE `gps_hours_log` SET `distance_km` = REPLACE(`distance_km`, ',', '.') WHERE `distance_km` LIKE '%,%';

-- Tabela: machine_fuel
UPDATE `machine_fuel` SET `hour_meter` = REPLACE(`hour_meter`, ',', '.') WHERE `hour_meter` LIKE '%,%';
UPDATE `machine_fuel` SET `liters` = REPLACE(`liters`, ',', '.') WHERE `liters` LIKE '%,%';
UPDATE `machine_fuel` SET `price_per_liter` = REPLACE(`price_per_liter`, ',', '.') WHERE `price_per_liter` LIKE '%,%';
UPDATE `machine_fuel` SET `total_value` = REPLACE(`total_value`, ',', '.') WHERE `total_value` LIKE '%,%';

-- Tabela: machine_hours
UPDATE `machine_hours` SET `start_hour_meter` = REPLACE(`start_hour_meter`, ',', '.') WHERE `start_hour_meter` LIKE '%,%';
UPDATE `machine_hours` SET `end_hour_meter` = REPLACE(`end_hour_meter`, ',', '.') WHERE `end_hour_meter` LIKE '%,%';
UPDATE `machine_hours` SET `hours_worked` = REPLACE(`hours_worked`, ',', '.') WHERE `hours_worked` LIKE '%,%';

-- Tabela: equipment_oil_records
UPDATE `equipment_oil_records` SET `hour_meter` = REPLACE(`hour_meter`, ',', '.') WHERE `hour_meter` LIKE '%,%';
UPDATE `equipment_oil_records` SET `quantity_liters` = REPLACE(`quantity_liters`, ',', '.') WHERE `quantity_liters` LIKE '%,%';
UPDATE `equipment_oil_records` SET `price_per_liter` = REPLACE(`price_per_liter`, ',', '.') WHERE `price_per_liter` LIKE '%,%';
UPDATE `equipment_oil_records` SET `total_value` = REPLACE(`total_value`, ',', '.') WHERE `total_value` LIKE '%,%';

-- Tabela: oil_stock
UPDATE `oil_stock` SET `quantity_liters` = REPLACE(`quantity_liters`, ',', '.') WHERE `quantity_liters` LIKE '%,%';
UPDATE `oil_stock` SET `purchase_quantity_liters` = REPLACE(`purchase_quantity_liters`, ',', '.') WHERE `purchase_quantity_liters` LIKE '%,%';
UPDATE `oil_stock` SET `price_per_liter` = REPLACE(`price_per_liter`, ',', '.') WHERE `price_per_liter` LIKE '%,%';
UPDATE `oil_stock` SET `total_value` = REPLACE(`total_value`, ',', '.') WHERE `total_value` LIKE '%,%';

-- Tabela: machine_maintenance
UPDATE `machine_maintenance` SET `hour_meter` = REPLACE(`hour_meter`, ',', '.') WHERE `hour_meter` LIKE '%,%';
UPDATE `machine_maintenance` SET `labor_cost` = REPLACE(`labor_cost`, ',', '.') WHERE `labor_cost` LIKE '%,%';
UPDATE `machine_maintenance` SET `total_cost` = REPLACE(`total_cost`, ',', '.') WHERE `total_cost` LIKE '%,%';
UPDATE `machine_maintenance` SET `next_maintenance_hours` = REPLACE(`next_maintenance_hours`, ',', '.') WHERE `next_maintenance_hours` LIKE '%,%';

-- Tabela: maintenance_parts
UPDATE `maintenance_parts` SET `total_cost` = REPLACE(`total_cost`, ',', '.') WHERE `total_cost` LIKE '%,%';

-- Tabela: maintenance_templates
UPDATE `maintenance_templates` SET `estimated_cost` = REPLACE(`estimated_cost`, ',', '.') WHERE `estimated_cost` LIKE '%,%';

-- Tabela: parts_requests
UPDATE `parts_requests` SET `estimated_cost` = REPLACE(`estimated_cost`, ',', '.') WHERE `estimated_cost` LIKE '%,%';

-- Tabela: preventive_maintenance_alerts
UPDATE `preventive_maintenance_alerts` SET `current_hours` = REPLACE(`current_hours`, ',', '.') WHERE `current_hours` LIKE '%,%';
UPDATE `preventive_maintenance_alerts` SET `due_hours` = REPLACE(`due_hours`, ',', '.') WHERE `due_hours` LIKE '%,%';

-- Tabela: preventive_maintenance_plans
UPDATE `preventive_maintenance_plans` SET `last_done_hours` = REPLACE(`last_done_hours`, ',', '.') WHERE `last_done_hours` LIKE '%,%';

-- Tabela: replanting_records
UPDATE `replanting_records` SET `area_hectares` = REPLACE(`area_hectares`, ',', '.') WHERE `area_hectares` LIKE '%,%';

-- Tabela: vehicle_records
UPDATE `vehicle_records` SET `liters` = REPLACE(`liters`, ',', '.') WHERE `liters` LIKE '%,%';
UPDATE `vehicle_records` SET `fuel_cost` = REPLACE(`fuel_cost`, ',', '.') WHERE `fuel_cost` LIKE '%,%';
UPDATE `vehicle_records` SET `price_per_liter` = REPLACE(`price_per_liter`, ',', '.') WHERE `price_per_liter` LIKE '%,%';
UPDATE `vehicle_records` SET `odometer` = REPLACE(`odometer`, ',', '.') WHERE `odometer` LIKE '%,%';
UPDATE `vehicle_records` SET `km_driven` = REPLACE(`km_driven`, ',', '.') WHERE `km_driven` LIKE '%,%';
UPDATE `vehicle_records` SET `maintenance_cost` = REPLACE(`maintenance_cost`, ',', '.') WHERE `maintenance_cost` LIKE '%,%';

-- Tabela: cargo_weekly_closings
UPDATE `cargo_weekly_closings` SET `total_weight_kg` = REPLACE(`total_weight_kg`, ',', '.') WHERE `total_weight_kg` LIKE '%,%';
UPDATE `cargo_weekly_closings` SET `total_amount` = REPLACE(`total_amount`, ',', '.') WHERE `total_amount` LIKE '%,%';
UPDATE `cargo_weekly_closings` SET `price_per_ton` = REPLACE(`price_per_ton`, ',', '.') WHERE `price_per_ton` LIKE '%,%';

-- Tabela: fuel_suppliers
UPDATE `fuel_suppliers` SET `price_per_liter` = REPLACE(`price_per_liter`, ',', '.') WHERE `price_per_liter` LIKE '%,%';

-- Tabela: fuel_price_history
UPDATE `fuel_price_history` SET `old_price` = REPLACE(`old_price`, ',', '.') WHERE `old_price` LIKE '%,%';
UPDATE `fuel_price_history` SET `new_price` = REPLACE(`new_price`, ',', '.') WHERE `new_price` LIKE '%,%';

-- Tabela: fuel_invoices
UPDATE `fuel_invoices` SET `total_amount` = REPLACE(`total_amount`, ',', '.') WHERE `total_amount` LIKE '%,%';
UPDATE `fuel_invoices` SET `liters` = REPLACE(`liters`, ',', '.') WHERE `liters` LIKE '%,%';
UPDATE `fuel_invoices` SET `price_per_liter` = REPLACE(`price_per_liter`, ',', '.') WHERE `price_per_liter` LIKE '%,%';
UPDATE `fuel_invoices` SET `paid_amount` = REPLACE(`paid_amount`, ',', '.') WHERE `paid_amount` LIKE '%,%';
UPDATE `fuel_invoices` SET `liters_used` = REPLACE(`liters_used`, ',', '.') WHERE `liters_used` LIKE '%,%';

-- Tabela: third_party_contractors
UPDATE `third_party_contractors` SET `rate_per_m3` = REPLACE(`rate_per_m3`, ',', '.') WHERE `rate_per_m3` LIKE '%,%';

COMMIT;

-- Total de statements: 96 em 37 tabelas