-- ============================================================
-- CORREÇÃO: Remover FK constraints que causam erros de INSERT
-- Execute este SQL no banco de dados da Hostinger (phpMyAdmin)
--
-- PROBLEMA: As FKs abaixo referenciam a tabela `users`, mas os
-- IDs de usuário do sistema local não existem no banco da Hostinger.
-- Isso causa erros ao inserir registros sem o campo createdBy/registeredBy.
--
-- SOLUÇÃO: Remover as FKs opcionais (created_by, registered_by, etc.)
-- Os campos continuam existindo, mas sem a restrição de FK.
-- ============================================================

-- client_portal_access
ALTER TABLE `client_portal_access` DROP FOREIGN KEY IF EXISTS `client_portal_access_created_by_users_id_fk`;

-- clients
ALTER TABLE `clients` DROP FOREIGN KEY IF EXISTS `clients_created_by_users_id_fk`;

-- collaborators
ALTER TABLE `collaborators` DROP FOREIGN KEY IF EXISTS `collaborators_created_by_users_id_fk`;

-- collaborator_documents
ALTER TABLE `collaborator_documents` DROP FOREIGN KEY IF EXISTS `collaborator_documents_uploaded_by_users_id_fk`;

-- equipment_maintenance
ALTER TABLE `equipment_maintenance` DROP FOREIGN KEY IF EXISTS `equipment_maintenance_registered_by_users_id_fk`;

-- equipment_photos
ALTER TABLE `equipment_photos` DROP FOREIGN KEY IF EXISTS `equipment_photos_uploaded_by_users_id_fk`;

-- fuel_records
ALTER TABLE `fuel_records` DROP FOREIGN KEY IF EXISTS `fuel_records_registered_by_users_id_fk`;
ALTER TABLE `fuel_records` DROP FOREIGN KEY IF EXISTS `fuel_records_operator_id_users_id_fk`;

-- machine_fuel
ALTER TABLE `machine_fuel` DROP FOREIGN KEY IF EXISTS `machine_fuel_registered_by_users_id_fk`;

-- machine_hours
ALTER TABLE `machine_hours` DROP FOREIGN KEY IF EXISTS `machine_hours_registered_by_users_id_fk`;

-- machine_maintenance
ALTER TABLE `machine_maintenance` DROP FOREIGN KEY IF EXISTS `machine_maintenance_registered_by_users_id_fk`;

-- parts
ALTER TABLE `parts` DROP FOREIGN KEY IF EXISTS `parts_created_by_users_id_fk`;

-- parts_requests
ALTER TABLE `parts_requests` DROP FOREIGN KEY IF EXISTS `parts_requests_requested_by_users_id_fk`;
ALTER TABLE `parts_requests` DROP FOREIGN KEY IF EXISTS `parts_requests_approved_by_users_id_fk`;

-- replanting_records
ALTER TABLE `replanting_records` DROP FOREIGN KEY IF EXISTS `replanting_records_registered_by_users_id_fk`;

-- sectors
ALTER TABLE `sectors` DROP FOREIGN KEY IF EXISTS `sectors_created_by_users_id_fk`;

-- vehicle_records
ALTER TABLE `vehicle_records` DROP FOREIGN KEY IF EXISTS `vehicle_records_registered_by_users_id_fk`;

-- client_payments
ALTER TABLE `client_payments` DROP FOREIGN KEY IF EXISTS `client_payments_registered_by_users_id_fk`;

-- client_payment_receipts
ALTER TABLE `client_payment_receipts` DROP FOREIGN KEY IF EXISTS `client_payment_receipts_registered_by_users_id_fk`;

-- role_permissions
ALTER TABLE `role_permissions` DROP FOREIGN KEY IF EXISTS `role_permissions_updated_by_users_id_fk`;

-- biometric_attendance
ALTER TABLE `biometric_attendance` DROP FOREIGN KEY IF EXISTS `biometric_attendance_registered_by_users_id_fk`;

-- cargo_loads
ALTER TABLE `cargo_loads` DROP FOREIGN KEY IF EXISTS `cargo_loads_registered_by_users_id_fk`;

-- ============================================================
-- VERIFICAÇÃO: Após executar, rode este SELECT para confirmar
-- que as FKs foram removidas:
-- ============================================================
-- SELECT TABLE_NAME, CONSTRAINT_NAME, COLUMN_NAME
-- FROM information_schema.KEY_COLUMN_USAGE
-- WHERE REFERENCED_TABLE_NAME = 'users'
-- AND REFERENCED_COLUMN_NAME = 'id'
-- AND COLUMN_NAME IN ('created_by','registered_by','uploaded_by','operator_id','approved_by','requested_by','updated_by')
-- ORDER BY TABLE_NAME;
-- ============================================================
-- FIM DA CORREÇÃO
-- ============================================================
