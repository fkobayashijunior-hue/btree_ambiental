-- Script SQL - Alterações 16/04/2026
-- Adicionar campo peso líquido na tabela cargo_loads
ALTER TABLE cargo_loads ADD COLUMN weight_net_kg VARCHAR(20) NULL;
