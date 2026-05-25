-- ============================================================
-- SCRIPT DE MIGRAÇÃO - BTREE AMBIENTAL
-- Execute este script no phpMyAdmin ou MySQL CLI da Hostinger
-- ============================================================

-- 1. ADICIONAR COLUNAS FALTANTES NA TABELA users
-- ============================================================
ALTER TABLE users ADD COLUMN password_hash varchar(255);
ALTER TABLE users ADD COLUMN lastSignedIn timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users ADD COLUMN loginMethod varchar(64) NOT NULL DEFAULT 'email';

-- 2. ADICIONAR COLUNAS FALTANTES NA TABELA cargo_loads
-- ============================================================
ALTER TABLE cargo_loads ADD COLUMN humidity varchar(20);
ALTER TABLE cargo_loads ADD COLUMN delivery_date timestamp NULL;
ALTER TABLE cargo_loads ADD COLUMN received_by_buyer varchar(255);
ALTER TABLE cargo_loads ADD COLUMN received_at timestamp NULL;
ALTER TABLE cargo_loads ADD COLUMN weight_net_kg varchar(20);
ALTER TABLE cargo_loads ADD COLUMN weight_in_kg varchar(20);
ALTER TABLE cargo_loads ADD COLUMN weight_out_kg varchar(20);
ALTER TABLE cargo_loads ADD COLUMN weight_in_photo_url text;
ALTER TABLE cargo_loads ADD COLUMN weight_out_photo_url text;
ALTER TABLE cargo_loads ADD COLUMN tracking_status varchar(50) DEFAULT 'em_carregamento';
ALTER TABLE cargo_loads ADD COLUMN tracking_notes text;
ALTER TABLE cargo_loads ADD COLUMN tracking_updated_at timestamp NULL;
ALTER TABLE cargo_loads ADD COLUMN photos_json text;
ALTER TABLE cargo_loads ADD COLUMN boleto_amount varchar(20);
ALTER TABLE cargo_loads ADD COLUMN boleto_due_date timestamp NULL;
ALTER TABLE cargo_loads ADD COLUMN boleto_url text;
ALTER TABLE cargo_loads ADD COLUMN paid_at timestamp NULL;
ALTER TABLE cargo_loads ADD COLUMN payment_status varchar(30) DEFAULT 'pendente';
ALTER TABLE cargo_loads ADD COLUMN payment_receipt_url text;
ALTER TABLE cargo_loads ADD COLUMN invoice_url text;
ALTER TABLE cargo_loads ADD COLUMN final_height_m varchar(20);
ALTER TABLE cargo_loads ADD COLUMN final_width_m varchar(20);
ALTER TABLE cargo_loads ADD COLUMN final_length_m varchar(20);
ALTER TABLE cargo_loads ADD COLUMN final_volume_m3 varchar(20);
ALTER TABLE cargo_loads ADD COLUMN images_urls text;

-- 3. REMOVER FOREIGN KEYS PROBLEMÁTICAS DA TABELA cargo_loads
-- ============================================================
-- (Se algum comando der erro "Can't DROP; check that column/key exists", ignore - significa que já foi removido)
ALTER TABLE cargo_loads DROP FOREIGN KEY cargo_loads_vehicle_id_equipment_id_fk;
ALTER TABLE cargo_loads DROP FOREIGN KEY cargo_loads_driver_collaborator_id_collaborators_id_fk;
ALTER TABLE cargo_loads DROP FOREIGN KEY cargo_loads_client_id_clients_id_fk;
ALTER TABLE cargo_loads DROP FOREIGN KEY cargo_loads_registered_by_users_id_fk;
ALTER TABLE cargo_loads DROP FOREIGN KEY cargo_loads_destination_id_cargo_destinations_id_fk;

-- 4. ADICIONAR COLUNAS FALTANTES NA TABELA financial_entries
-- ============================================================
ALTER TABLE financial_entries ADD COLUMN cargo_load_id int;
ALTER TABLE financial_entries ADD COLUMN auto_generated int DEFAULT 0;

-- ============================================================
-- PRONTO! Após executar, reinicie o servidor na Hostinger.
-- Erros "Duplicate column name" podem ser ignorados (coluna já existe).
-- Erros "Can't DROP" em FK podem ser ignorados (FK já removida).
-- ============================================================
