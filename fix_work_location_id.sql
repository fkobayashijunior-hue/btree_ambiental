-- Script para corrigir registros antigos de presença que têm location_name mas não work_location_id
-- Isso garante que o Dashboard Executivo encontre todos os registros ao filtrar por local

-- Verificar quantos registros precisam ser corrigidos
SELECT COUNT(*) AS registros_para_corrigir
FROM collaborator_attendance ca
WHERE ca.location_name IS NOT NULL 
  AND ca.location_name != ''
  AND (ca.work_location_id IS NULL OR ca.work_location_id = 0);

-- Atualizar work_location_id baseado no location_name correspondente na tabela gps_locations
UPDATE collaborator_attendance ca
INNER JOIN gps_locations gl ON gl.name = ca.location_name
SET ca.work_location_id = gl.id
WHERE ca.location_name IS NOT NULL 
  AND ca.location_name != ''
  AND (ca.work_location_id IS NULL OR ca.work_location_id = 0);

-- Verificar resultado após a correção
SELECT COUNT(*) AS registros_ainda_sem_work_location_id
FROM collaborator_attendance ca
WHERE ca.location_name IS NOT NULL 
  AND ca.location_name != ''
  AND (ca.work_location_id IS NULL OR ca.work_location_id = 0);
