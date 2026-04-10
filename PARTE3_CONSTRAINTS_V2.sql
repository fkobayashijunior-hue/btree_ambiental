-- ================================================================
-- BTREE AMBIENTAL - PARTE 3: CONSTRAINTS (V2 - com verificação de coluna)
-- Usa PROCEDURE para verificar se coluna existe antes de criar FK
-- ================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- Criar procedure auxiliar
DROP PROCEDURE IF EXISTS add_fk_if_col_exists;

DELIMITER //
CREATE PROCEDURE add_fk_if_col_exists(
  IN p_table VARCHAR(100),
  IN p_constraint VARCHAR(200),
  IN p_column VARCHAR(100),
  IN p_ref_table VARCHAR(100),
  IN p_ref_col VARCHAR(100),
  IN p_on_clause VARCHAR(200)
)
BEGIN
  DECLARE col_exists INT DEFAULT 0;
  DECLARE fk_exists INT DEFAULT 0;
  DECLARE ref_col_exists INT DEFAULT 0;

  -- Check if the column exists in the source table
  SELECT COUNT(*) INTO col_exists FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_table AND COLUMN_NAME = p_column;

  -- Check if the referenced column exists
  SELECT COUNT(*) INTO ref_col_exists FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_ref_table AND COLUMN_NAME = p_ref_col;

  -- Check if the constraint already exists
  SELECT COUNT(*) INTO fk_exists FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = p_table AND CONSTRAINT_NAME = p_constraint;

  IF col_exists > 0 AND ref_col_exists > 0 AND fk_exists = 0 THEN
    SET @ddl = CONCAT('ALTER TABLE `', p_table, '` ADD CONSTRAINT `', p_constraint,
      '` FOREIGN KEY (`', p_column, '`) REFERENCES `', p_ref_table, '`(`', p_ref_col, '`) ', p_on_clause);
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END //
DELIMITER ;

-- ================================================================
-- FOREIGN KEYS
-- ================================================================

CALL add_fk_if_col_exists('attendance_records', 'attendance_records_user_id_users_id_fk', 'user_id', 'users', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('attendance_records', 'attendance_records_paid_by_users_id_fk', 'paid_by', 'users', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('attendance_records', 'attendance_records_registered_by_users_id_fk', 'registered_by', 'users', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('cargo_shipments', 'cargo_shipments_truck_id_equipment_id_fk', 'truck_id', 'equipment', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('cargo_shipments', 'cargo_shipments_driver_id_users_id_fk', 'driver_id', 'users', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('cargo_shipments', 'cargo_shipments_registered_by_users_id_fk', 'registered_by', 'users', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('equipment', 'equipment_type_id_equipment_types_id_fk', 'type_id', 'equipment_types', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('fuel_records', 'fuel_records_equipment_id_equipment_id_fk', 'equipment_id', 'equipment', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('fuel_records', 'fuel_records_operator_id_users_id_fk', 'operator_id', 'users', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('fuel_records', 'fuel_records_registered_by_users_id_fk', 'registered_by', 'users', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('user_profiles', 'user_profiles_user_id_users_id_fk', 'user_id', 'users', 'id', 'ON DELETE cascade ON UPDATE no action');
CALL add_fk_if_col_exists('password_reset_tokens', 'password_reset_tokens_user_id_users_id_fk', 'user_id', 'users', 'id', 'ON DELETE cascade ON UPDATE no action');
CALL add_fk_if_col_exists('biometric_attendance', 'biometric_attendance_collaborator_id_collaborators_id_fk', 'collaborator_id', 'collaborators', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('biometric_attendance', 'biometric_attendance_registered_by_users_id_fk', 'registered_by', 'users', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('collaborators', 'collaborators_user_id_users_id_fk', 'user_id', 'users', 'id', 'ON DELETE set null ON UPDATE no action');
CALL add_fk_if_col_exists('collaborators', 'collaborators_created_by_users_id_fk', 'created_by', 'users', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('role_permissions', 'role_permissions_updated_by_users_id_fk', 'updated_by', 'users', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('sectors', 'sectors_created_by_users_id_fk', 'created_by', 'users', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('cargo_loads', 'cargo_loads_vehicle_id_equipment_id_fk', 'vehicle_id', 'equipment', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('cargo_loads', 'cargo_loads_driver_collaborator_id_collaborators_id_fk', 'driver_collaborator_id', 'collaborators', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('cargo_loads', 'cargo_loads_client_id_clients_id_fk', 'client_id', 'clients', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('cargo_loads', 'cargo_loads_registered_by_users_id_fk', 'registered_by', 'users', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('clients', 'clients_created_by_users_id_fk', 'created_by', 'users', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('machine_fuel', 'machine_fuel_equipment_id_equipment_id_fk', 'equipment_id', 'equipment', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('machine_fuel', 'machine_fuel_registered_by_users_id_fk', 'registered_by', 'users', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('machine_hours', 'machine_hours_equipment_id_equipment_id_fk', 'equipment_id', 'equipment', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('machine_hours', 'machine_hours_operator_collaborator_id_collaborators_id_fk', 'operator_collaborator_id', 'collaborators', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('machine_hours', 'machine_hours_registered_by_users_id_fk', 'registered_by', 'users', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('machine_maintenance', 'machine_maintenance_equipment_id_equipment_id_fk', 'equipment_id', 'equipment', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('machine_maintenance', 'machine_maintenance_mechanic_collaborator_id_collaborators_id_fk', 'mechanic_collaborator_id', 'collaborators', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('machine_maintenance', 'machine_maintenance_registered_by_users_id_fk', 'registered_by', 'users', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('parts', 'parts_created_by_users_id_fk', 'created_by', 'users', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('parts_requests', 'parts_requests_part_id_parts_id_fk', 'part_id', 'parts', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('parts_requests', 'parts_requests_equipment_id_equipment_id_fk', 'equipment_id', 'equipment', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('parts_requests', 'parts_requests_approved_by_users_id_fk', 'approved_by', 'users', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('parts_requests', 'parts_requests_requested_by_users_id_fk', 'requested_by', 'users', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('vehicle_records', 'vehicle_records_equipment_id_equipment_id_fk', 'equipment_id', 'equipment', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('vehicle_records', 'vehicle_records_driver_collaborator_id_collaborators_id_fk', 'driver_collaborator_id', 'collaborators', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('vehicle_records', 'vehicle_records_registered_by_users_id_fk', 'registered_by', 'users', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('client_payments', 'client_payments_client_id_clients_id_fk', 'client_id', 'clients', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('client_payments', 'client_payments_registered_by_users_id_fk', 'registered_by', 'users', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('client_portal_access', 'client_portal_access_client_id_clients_id_fk', 'client_id', 'clients', 'id', 'ON DELETE cascade ON UPDATE no action');
CALL add_fk_if_col_exists('client_portal_access', 'client_portal_access_created_by_users_id_fk', 'created_by', 'users', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('replanting_records', 'replanting_records_client_id_clients_id_fk', 'client_id', 'clients', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('replanting_records', 'replanting_records_registered_by_users_id_fk', 'registered_by', 'users', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('collaborator_documents', 'collaborator_documents_collaborator_id_collaborators_id_fk', 'collaborator_id', 'collaborators', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('collaborator_documents', 'collaborator_documents_uploaded_by_users_id_fk', 'uploaded_by', 'users', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('equipment_maintenance', 'equipment_maintenance_registered_by_users_id_fk', 'registered_by', 'users', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('equipment_photos', 'equipment_photos_uploaded_by_users_id_fk', 'uploaded_by', 'users', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('collaborator_attendance', 'collaborator_attendance_collaborator_id_collaborators_id_fk', 'collaborator_id', 'collaborators', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('collaborator_attendance', 'collaborator_attendance_registered_by_users_id_fk', 'registered_by', 'users', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('purchase_order_items', 'purchase_order_items_order_id_purchase_orders_id_fk', 'order_id', 'purchase_orders', 'id', 'ON DELETE cascade ON UPDATE no action');
CALL add_fk_if_col_exists('purchase_order_items', 'purchase_order_items_part_id_parts_id_fk', 'part_id', 'parts', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('purchase_orders', 'purchase_orders_created_by_users_id_fk', 'created_by', 'users', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('purchase_orders', 'purchase_orders_approved_by_users_id_fk', 'approved_by', 'users', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('gps_device_links', 'gps_device_links_equipment_id_equipment_id_fk', 'equipment_id', 'equipment', 'id', 'ON DELETE cascade ON UPDATE no action');
CALL add_fk_if_col_exists('gps_device_links', 'gps_device_links_created_by_users_id_fk', 'created_by', 'users', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('gps_hours_log', 'gps_hours_log_equipment_id_equipment_id_fk', 'equipment_id', 'equipment', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('gps_hours_log', 'gps_hours_log_gps_device_link_id_gps_device_links_id_fk', 'gps_device_link_id', 'gps_device_links', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('preventive_maintenance_alerts', 'preventive_maintenance_alerts_equipment_id_equipment_id_fk', 'equipment_id', 'equipment', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('preventive_maintenance_alerts', 'preventive_maintenance_alerts_plan_id_preventive_maintenance_plans_id_fk', 'plan_id', 'preventive_maintenance_plans', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('preventive_maintenance_alerts', 'preventive_maintenance_alerts_resolved_by_users_id_fk', 'resolved_by', 'users', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('preventive_maintenance_plans', 'preventive_maintenance_plans_equipment_id_equipment_id_fk', 'equipment_id', 'equipment', 'id', 'ON DELETE cascade ON UPDATE no action');
CALL add_fk_if_col_exists('preventive_maintenance_plans', 'preventive_maintenance_plans_created_by_users_id_fk', 'created_by', 'users', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('cargo_destinations', 'cargo_destinations_created_by_users_id_fk', 'created_by', 'users', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('cargo_loads', 'cargo_loads_destination_id_cargo_destinations_id_fk', 'destination_id', 'cargo_destinations', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('maintenance_parts', 'maintenance_parts_maintenance_id_equipment_maintenance_id_fk', 'maintenance_id', 'equipment_maintenance', 'id', 'ON DELETE cascade ON UPDATE no action');
CALL add_fk_if_col_exists('maintenance_parts', 'maintenance_parts_part_id_parts_id_fk', 'part_id', 'parts', 'id', 'ON DELETE set null ON UPDATE no action');
CALL add_fk_if_col_exists('maintenance_template_parts', 'maintenance_template_parts_template_id_maintenance_templates_id_fk', 'template_id', 'maintenance_templates', 'id', 'ON DELETE cascade ON UPDATE no action');
CALL add_fk_if_col_exists('maintenance_template_parts', 'maintenance_template_parts_part_id_parts_id_fk', 'part_id', 'parts', 'id', 'ON DELETE set null ON UPDATE no action');
CALL add_fk_if_col_exists('maintenance_templates', 'maintenance_templates_created_by_users_id_fk', 'created_by', 'users', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('parts_stock_movements', 'parts_stock_movements_part_id_parts_id_fk', 'part_id', 'parts', 'id', 'ON DELETE cascade ON UPDATE no action');
CALL add_fk_if_col_exists('parts_stock_movements', 'parts_stock_movements_registered_by_users_id_fk', 'registered_by', 'users', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('user_permissions', 'user_permissions_user_id_users_id_fk', 'user_id', 'users', 'id', 'ON DELETE cascade ON UPDATE no action');
CALL add_fk_if_col_exists('user_permissions', 'user_permissions_updated_by_users_id_fk', 'updated_by', 'users', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('chainsaw_chain_events', 'chainsaw_chain_events_chainsaw_id_chainsaws_id_fk', 'chainsaw_id', 'chainsaws', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('chainsaw_chain_events', 'chainsaw_chain_events_registered_by_users_id_fk', 'registered_by', 'users', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('chainsaw_part_movements', 'chainsaw_part_movements_part_id_chainsaw_parts_id_fk', 'part_id', 'chainsaw_parts', 'id', 'ON DELETE cascade ON UPDATE no action');
CALL add_fk_if_col_exists('chainsaw_part_movements', 'chainsaw_part_movements_registered_by_users_id_fk', 'registered_by', 'users', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('chainsaw_parts', 'chainsaw_parts_created_by_users_id_fk', 'created_by', 'users', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('chainsaw_service_orders', 'chainsaw_service_orders_chainsaw_id_chainsaws_id_fk', 'chainsaw_id', 'chainsaws', 'id', 'ON DELETE cascade ON UPDATE no action');
CALL add_fk_if_col_exists('chainsaw_service_orders', 'chainsaw_service_orders_mechanic_id_users_id_fk', 'mechanic_id', 'users', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('chainsaw_service_orders', 'chainsaw_service_orders_opened_by_users_id_fk', 'opened_by', 'users', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('chainsaw_service_parts', 'chainsaw_service_parts_service_order_id_chainsaw_service_orders_id_fk', 'service_order_id', 'chainsaw_service_orders', 'id', 'ON DELETE cascade ON UPDATE no action');
CALL add_fk_if_col_exists('chainsaw_service_parts', 'chainsaw_service_parts_part_id_chainsaw_parts_id_fk', 'part_id', 'chainsaw_parts', 'id', 'ON DELETE set null ON UPDATE no action');
CALL add_fk_if_col_exists('chainsaws', 'chainsaws_created_by_users_id_fk', 'created_by', 'users', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('fuel_container_events', 'fuel_container_events_container_id_fuel_containers_id_fk', 'container_id', 'fuel_containers', 'id', 'ON DELETE cascade ON UPDATE no action');
CALL add_fk_if_col_exists('fuel_container_events', 'fuel_container_events_source_container_id_fuel_containers_id_fk', 'source_container_id', 'fuel_containers', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('fuel_container_events', 'fuel_container_events_chainsaw_id_chainsaws_id_fk', 'chainsaw_id', 'chainsaws', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('fuel_container_events', 'fuel_container_events_registered_by_users_id_fk', 'registered_by', 'users', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('cargo_destinations', 'cargo_destinations_client_id_clients_id_fk', 'client_id', 'clients', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('extra_expenses', 'extra_expenses_registered_by_users_id_fk', 'registered_by', 'users', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('financial_entries', 'financial_entries_client_id_clients_id_fk', 'client_id', 'clients', 'id', 'ON DELETE set null ON UPDATE no action');
CALL add_fk_if_col_exists('financial_entries', 'financial_entries_registered_by_users_id_fk', 'registered_by', 'users', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('gps_locations', 'gps_locations_created_by_users_id_fk', 'created_by', 'users', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('cargo_tracking_photos', 'cargo_tracking_photos_cargo_id_cargo_loads_id_fk', 'cargo_id', 'cargo_loads', 'id', 'ON DELETE cascade ON UPDATE no action');
CALL add_fk_if_col_exists('cargo_tracking_photos', 'cargo_tracking_photos_registered_by_users_id_fk', 'registered_by', 'users', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('client_contracts', 'client_contracts_client_id_clients_id_fk', 'client_id', 'clients', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('client_contracts', 'client_contracts_registered_by_users_id_fk', 'registered_by', 'users', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('client_payment_receipts', 'client_payment_receipts_client_id_clients_id_fk', 'client_id', 'clients', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('client_payment_receipts', 'client_payment_receipts_contract_id_client_contracts_id_fk', 'contract_id', 'client_contracts', 'id', 'ON DELETE no action ON UPDATE no action');
CALL add_fk_if_col_exists('client_payment_receipts', 'client_payment_receipts_registered_by_users_id_fk', 'registered_by', 'users', 'id', 'ON DELETE no action ON UPDATE no action');

-- ================================================================
-- UNIQUE CONSTRAINTS
-- ================================================================

SET @idx_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND CONSTRAINT_NAME = 'users_email_unique');
SET @sql = IF(@idx_exists = 0, 'ALTER TABLE `users` ADD CONSTRAINT `users_email_unique` UNIQUE(`email`)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Limpar procedure auxiliar
DROP PROCEDURE IF EXISTS add_fk_if_col_exists;

SET FOREIGN_KEY_CHECKS = 1;

-- ================================================================
-- FIM DA PARTE 3
-- ================================================================