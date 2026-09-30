-- ============================================================
-- Comissão Fixa (valor mensal fixo, não calculado por carga/tonelada)
-- Sistema: BTREE Ambiental | Data: 2026-09-30
-- ============================================================
-- Adiciona a opção "Fixo" à unidade de comissão de Motorista/Terceirizado
-- (antes só existiam "carga" e "tonelada"). Quando commission_unit = 'fixo',
-- a comissão do mês não é recalculada a partir das cargas entregues — usa
-- sempre o valor fixo cadastrado em payroll_commission_rates (chave
-- "motorista_fixo", por colaborador).
--
-- Rodar em produção quando for fazer o deploy desta mudança.
-- ============================================================

ALTER TABLE collaborators
  MODIFY COLUMN commission_unit ENUM('carga','tonelada','fixo') NOT NULL DEFAULT 'carga';

-- Everson Moreira dos Santos: comissão automática por carga não se aplica a ele —
-- passa a ser fixa, com valor padrão zerado (ajustável na Folha > janela de Comissão).
UPDATE collaborators SET commission_unit = 'fixo'
  WHERE name LIKE '%Everson Moreira dos Santos%';

-- Paulo Sérgio Mota da Silva: já tinha comissão totalmente manual (commission_auto = 0,
-- digitada direto na Folha). Passa a usar o mesmo fluxo automático dos demais motoristas,
-- só que com unidade "Fixo" em vez de por carga/tonelada — valor padrão R$ 1.000,00.
UPDATE collaborators SET commission_unit = 'fixo', commission_auto = 1
  WHERE name LIKE '%Paulo%S%rgio%Mota%Silva%';

INSERT INTO payroll_commission_rates (collaborator_id, chave, valor)
SELECT id, 'motorista_fixo', '0.00' FROM collaborators WHERE name LIKE '%Everson Moreira dos Santos%'
UNION ALL
SELECT id, 'motorista_fixo', '1000.00' FROM collaborators WHERE name LIKE '%Paulo%S%rgio%Mota%Silva%'
ON DUPLICATE KEY UPDATE valor = VALUES(valor);
