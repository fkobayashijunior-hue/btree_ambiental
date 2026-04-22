-- ============================================
-- BTREE Ambiental - Scripts SQL 22/04/2026
-- Documentos Financeiros nas Cargas
-- ============================================

-- Novas colunas na tabela cargo_loads para documentos financeiros
ALTER TABLE cargo_loads ADD COLUMN invoice_url TEXT NULL;
ALTER TABLE cargo_loads ADD COLUMN boleto_url TEXT NULL;
ALTER TABLE cargo_loads ADD COLUMN boleto_amount VARCHAR(20) NULL;
ALTER TABLE cargo_loads ADD COLUMN boleto_due_date TIMESTAMP NULL;
ALTER TABLE cargo_loads ADD COLUMN payment_receipt_url TEXT NULL;
ALTER TABLE cargo_loads ADD COLUMN payment_status ENUM('sem_boleto','a_pagar','pago') DEFAULT 'sem_boleto';
ALTER TABLE cargo_loads ADD COLUMN paid_at TIMESTAMP NULL;
