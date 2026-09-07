-- ============================================================
-- Nova tabela: Folha de Pagamento (payroll_entries)
-- Sistema: BTREE Ambiental | Data: 2026-08-25
-- ============================================================
-- Usada pela nova sub-aba "Folha de Pagamento" em Financeiro.
-- Independente do "Lançar Folha" existente (financial_entries,
-- categoria folha_pagamento) — essa lógica antiga NÃO foi alterada.
--
-- Já aplicada automaticamente no banco de staging pelo próprio
-- backend (server/routers/payroll.ts -> ensurePayrollTable), que
-- roda "CREATE TABLE IF NOT EXISTS" a cada consulta. Este script é
-- só para aplicar manualmente em produção, se necessário.
-- ============================================================

CREATE TABLE IF NOT EXISTS payroll_entries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  collaborator_id INT NOT NULL,
  reference_month VARCHAR(7) NOT NULL,           -- "YYYY-MM"
  collaborator_name VARCHAR(255) NOT NULL,        -- snapshot do nome no fechamento
  cpf VARCHAR(14),                                -- snapshot do CPF no fechamento
  employment_type ENUM('clt','terceirizado','diarista','pj') NOT NULL,
  base_value VARCHAR(20) NOT NULL,                -- salário (CLT/PJ) ou valor da diária
  days_worked INT,                                -- só diarista/terceirizado
  commission VARCHAR(20) NOT NULL DEFAULT '0',
  total_amount VARCHAR(20) NOT NULL,
  status ENUM('fechado','pago') NOT NULL DEFAULT 'fechado',
  paid_at TIMESTAMP NULL,
  notes TEXT,
  closed_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY payroll_entries_collab_month_unique (collaborator_id, reference_month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
