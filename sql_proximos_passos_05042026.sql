-- =====================================================
-- BTREE Ambiental - Script SQL - Próximos Passos 05/04/2026
-- Medidas padrão por caminhão + peso/metragem final
-- =====================================================

-- 1. Adicionar medidas padrão ao equipamento (caminhão)
-- Esses campos já foram adicionados no sprint anterior (sql_update_05042026.sql)
-- Se ainda não existirem, executar:
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS default_height_m VARCHAR(20) DEFAULT NULL;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS default_width_m VARCHAR(20) DEFAULT NULL;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS default_length_m VARCHAR(20) DEFAULT NULL;

-- 2. Campos de peso e metragem final na carga
-- Esses campos já foram adicionados no sprint anterior (sql_update_05042026.sql)
-- Se ainda não existirem, executar:
ALTER TABLE cargo_loads ADD COLUMN IF NOT EXISTS weight_out_kg VARCHAR(20) DEFAULT NULL;
ALTER TABLE cargo_loads ADD COLUMN IF NOT EXISTS weight_in_kg VARCHAR(20) DEFAULT NULL;
ALTER TABLE cargo_loads ADD COLUMN IF NOT EXISTS final_height_m VARCHAR(20) DEFAULT NULL;
ALTER TABLE cargo_loads ADD COLUMN IF NOT EXISTS final_width_m VARCHAR(20) DEFAULT NULL;
ALTER TABLE cargo_loads ADD COLUMN IF NOT EXISTS final_length_m VARCHAR(20) DEFAULT NULL;

-- 3. Tabela de fotos de tracking (criada no sprint anterior)
-- Se ainda não existir:
CREATE TABLE IF NOT EXISTS cargo_tracking_photos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cargo_load_id INT NOT NULL,
  stage VARCHAR(50) NOT NULL,
  photo_url TEXT NOT NULL,
  notes TEXT DEFAULT NULL,
  registered_by INT DEFAULT NULL,
  registered_by_name VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Nota: Não há novas tabelas neste sprint.
-- As alterações foram apenas:
-- - Backend: procedures linkUser e listAvailableUsers no router de collaborators
-- - Backend: campos defaultHeightM/defaultWidthM/defaultLengthM no createEquipment/updateEquipment
-- - Frontend: formulário de medidas padrão no cadastro de equipamentos
-- - Frontend: card de vincular usuário no detalhe do colaborador
-- - Frontend: peso saída/chegada e metragem final nos detalhes da carga (admin e cliente)
