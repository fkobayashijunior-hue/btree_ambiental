-- ============================================================
-- BTREE Ambiental — Índices de Performance (Fase 1C)
-- Execute no banco: u629128033_btree_ambienta
-- Data: 2026-07-18
-- ============================================================

-- machine_hours: índices de data e work_location_id
ALTER TABLE `machine_hours`
  ADD INDEX `idx_mh_date` (`date`),
  ADD INDEX `idx_mh_work_location` (`work_location_id`);

-- machine_fuel: índices de data e work_location_id
ALTER TABLE `machine_fuel`
  ADD INDEX `idx_mf_date` (`date`),
  ADD INDEX `idx_mf_work_location` (`work_location_id`);

-- machine_maintenance: índice de data
ALTER TABLE `machine_maintenance`
  ADD INDEX `idx_mm_date` (`date`),
  ADD INDEX `idx_mm_type` (`type`);

-- cargo_loads: índices de data e status (consultas mais frequentes)
ALTER TABLE `cargo_loads`
  ADD INDEX `idx_cl_date` (`date`),
  ADD INDEX `idx_cl_status` (`status`),
  ADD INDEX `idx_cl_work_location` (`work_location_id`);

-- extra_expenses: índices de data e work_location_id
ALTER TABLE `extra_expenses`
  ADD INDEX `idx_ee_date` (`date`),
  ADD INDEX `idx_ee_work_location` (`work_location_id`),
  ADD INDEX `idx_ee_category` (`category`);

-- collaborator_attendance: índice de work_location_id
ALTER TABLE `collaborator_attendance`
  ADD INDEX `idx_ca_work_location` (`work_location_id`);

-- oil_stock: índice de data e tipo
ALTER TABLE `oil_stock`
  ADD INDEX `idx_os_created_at` (`created_at`),
  ADD INDEX `idx_os_oil_type` (`oil_type`);

-- chainsaw_parts: índice de categoria e is_active
ALTER TABLE `chainsaw_parts`
  ADD INDEX `idx_cp_category` (`category`),
  ADD INDEX `idx_cp_is_active` (`is_active`);

-- vehicle_records: índice de data e work_location_id
ALTER TABLE `vehicle_records`
  ADD INDEX `idx_vr_date` (`date`),
  ADD INDEX `idx_vr_work_location` (`work_location_id`);

-- ============================================================
-- Verificação: listar índices criados
-- ============================================================
SELECT TABLE_NAME, INDEX_NAME, COLUMN_NAME
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = 'u629128033_btree_ambienta'
  AND INDEX_NAME LIKE 'idx_%'
ORDER BY TABLE_NAME, INDEX_NAME;
