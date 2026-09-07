-- ============================================================
-- Controle de pagamento por semana — Folha de Pagamento (tipo "Semanal")
-- Sistema: BTREE Ambiental | Data: 2026-08-25
-- ============================================================
-- Colaboradores com Tipo de Vínculo "Semanal" (ex: Fernando Kobayashi
-- Junior) são pagos toda sexta-feira, com valor fixo (sem contar dias
-- trabalhados). Diferente de CLT/PJ, cujo "Pagar" na Folha trava o mês
-- inteiro de uma vez, aqui cada sexta-feira precisa de seu próprio
-- controle — senão marcar a 1ª semana como paga esconderia as semanas
-- seguintes (que ainda não aconteceram) da projeção do Fluxo de Caixa.
--
-- Já aplicada automaticamente no banco de staging pelo backend
-- (server/routers/payroll.ts -> ensurePayrollTable). Este script é só
-- para aplicar manualmente em produção, se necessário.
-- ============================================================

CREATE TABLE IF NOT EXISTS payroll_weekly_payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  collaborator_id INT NOT NULL,
  week_friday VARCHAR(10) NOT NULL,     -- "YYYY-MM-DD" da sexta-feira da semana
  paid TINYINT(1) NOT NULL DEFAULT 0,
  paid_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY payroll_weekly_payments_collab_friday_unique (collaborator_id, week_friday)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
