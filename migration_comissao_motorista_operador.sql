-- ============================================================
-- Comissão de Motorista (por carga/destino) e Operador (por tonelada)
-- Sistema: BTREE Ambiental | Data: 2026-08-26
-- ============================================================
-- Comissão do MOTORISTA: valor fixo por carga ENTREGUE no mês anterior,
-- dependendo da categoria do comprador de destino (Enerbio/Mabam/Líder/Sonoco).
-- Comissão do OPERADOR: toneladas líquidas entregues no mês anterior para o
-- cliente vinculado ao operador (collaborators.client_id), dividido pelo nº
-- de operadores ativos daquele mesmo cliente, x tarifa por tonelada.
--
-- Já aplicado no banco de staging. Rodar em produção quando for fazer o
-- deploy desta mudança — ajuste os UPDATEs de categoria conforme os ids
-- reais dos destinos em produção.
-- ============================================================

ALTER TABLE cargo_destinations
  ADD COLUMN commission_category ENUM('nenhuma','enerbio','mabam','lider','sonoco') DEFAULT 'nenhuma';

-- Ajuste os WHERE conforme o cadastro real de cada destino em produção.
UPDATE cargo_destinations SET commission_category = 'enerbio' WHERE name LIKE '%BENTLIN%' OR nickname = 'ENERBIO';
UPDATE cargo_destinations SET commission_category = 'sonoco'  WHERE name LIKE '%SONOCO%'  OR nickname = 'SONOCO';
UPDATE cargo_destinations SET commission_category = 'lider'   WHERE name LIKE '%L%DER%'   OR nickname LIKE '%L%DER%';
UPDATE cargo_destinations SET commission_category = 'mabam'   WHERE name LIKE '%REBNIC%'  OR nickname LIKE '%REBNIC%' OR name LIKE '%MABAM%';

-- collaborator_id = 0 é a tarifa padrão global; um id > 0 sobrepõe a tarifa só para aquele
-- motorista/terceirizado (ex: Samuel e Isaac têm tarifas diferentes do padrão do Ruan).
CREATE TABLE IF NOT EXISTS payroll_commission_rates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  collaborator_id INT NOT NULL DEFAULT 0,
  chave VARCHAR(50) NOT NULL,
  valor VARCHAR(20) NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY payroll_commission_rates_collab_chave_unique (collaborator_id, chave)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO payroll_commission_rates (collaborator_id, chave, valor) VALUES
  (0, 'motorista_enerbio', '32.00'),
  (0, 'motorista_mabam', '32.00'),
  (0, 'motorista_lider', '58.00'),
  (0, 'motorista_sonoco', '89.00'),
  (0, 'operador_por_tonelada', '1.50');

-- Se a tabela já existia de um deploy anterior (sem collaborator_id), migra:
-- ALTER TABLE payroll_commission_rates ADD COLUMN collaborator_id INT NOT NULL DEFAULT 0 AFTER id;
-- ALTER TABLE payroll_commission_rates DROP INDEX payroll_commission_rates_chave_unique;
-- ALTER TABLE payroll_commission_rates ADD UNIQUE KEY payroll_commission_rates_collab_chave_unique (collaborator_id, chave);

-- Tarifas próprias por motorista (sobrepõem o padrão global acima só para eles). Ajuste os
-- WHERE conforme o id/nome real em produção.
INSERT INTO payroll_commission_rates (collaborator_id, chave, valor)
SELECT id, 'motorista_enerbio', '90.00' FROM collaborators WHERE name LIKE '%Samuel Azarias Tavares%'
UNION ALL SELECT id, 'motorista_mabam', '90.00' FROM collaborators WHERE name LIKE '%Samuel Azarias Tavares%'
UNION ALL SELECT id, 'motorista_lider', '250.00' FROM collaborators WHERE name LIKE '%Samuel Azarias Tavares%'
UNION ALL SELECT id, 'motorista_sonoco', '250.00' FROM collaborators WHERE name LIKE '%Samuel Azarias Tavares%'
UNION ALL SELECT id, 'motorista_enerbio', '90.00' FROM collaborators WHERE name LIKE '%Isaac de Melo%'
UNION ALL SELECT id, 'motorista_mabam', '90.00' FROM collaborators WHERE name LIKE '%Isaac de Melo%'
UNION ALL SELECT id, 'motorista_lider', '250.00' FROM collaborators WHERE name LIKE '%Isaac de Melo%'
UNION ALL SELECT id, 'motorista_sonoco', '250.00' FROM collaborators WHERE name LIKE '%Isaac de Melo%'
UNION ALL SELECT id, 'motorista_enerbio', '32.00' FROM collaborators WHERE name LIKE '%Ruan Matheus%'
UNION ALL SELECT id, 'motorista_mabam', '32.00' FROM collaborators WHERE name LIKE '%Ruan Matheus%'
UNION ALL SELECT id, 'motorista_lider', '58.00' FROM collaborators WHERE name LIKE '%Ruan Matheus%'
UNION ALL SELECT id, 'motorista_sonoco', '89.00' FROM collaborators WHERE name LIKE '%Ruan Matheus%'
ON DUPLICATE KEY UPDATE valor = VALUES(valor);

-- Exceção por colaborador: permite marcar alguém como motorista/operador mas com
-- comissão manual (valor livre), sem entrar na regra automática. Default 1 (automático)
-- para não alterar o comportamento de ninguém além de quem for marcado explicitamente.
ALTER TABLE collaborators
  ADD COLUMN commission_auto TINYINT(1) NOT NULL DEFAULT 1;

-- José Marcelo (operador em SIMFLOR) e Paulo Sérgio Mota da Silva (motorista) têm
-- comissão fixa, não calculada automaticamente. Ajuste o WHERE conforme o id/nome
-- real em produção.
UPDATE collaborators SET commission_auto = 0 WHERE name LIKE '%Jos%Marcelo%Guerlinguer%';
UPDATE collaborators SET commission_auto = 0 WHERE name LIKE '%Paulo%S%rgio%Mota%Silva%';

-- Desconto de combustível (só Terceirizado): soma litros x "Valor a Cobrar do Terceirizado"
-- (vehicle_records.charged_value) do(s) veículo(s) do colaborador no mês da Folha.
ALTER TABLE payroll_entries ADD COLUMN discount VARCHAR(20) NOT NULL DEFAULT '0' AFTER commission;

-- Unidade de comissão de Motorista/Terceirizado: por carga (padrão) ou por tonelada líquida
-- entregue. Ruan Matheus é por tonelada; os demais continuam por carga.
ALTER TABLE collaborators ADD COLUMN commission_unit ENUM('carga','tonelada') NOT NULL DEFAULT 'carga';
UPDATE collaborators SET commission_unit = 'tonelada' WHERE name LIKE '%Ruan Matheus%';

-- Período de apuração e defasagem de pagamento próprios por colaborador (exceção pontual —
-- hoje só o Ruan): período sábado-sexta em vez de domingo-sábado, pago 14 dias após o fim do
-- período (ex: período 01/08-07/08 é pago em 21/08), em vez da sexta seguinte (padrão, 7 dias).
ALTER TABLE collaborators ADD COLUMN weekly_period_anchor ENUM('domingo','sabado') NOT NULL DEFAULT 'domingo';
ALTER TABLE collaborators ADD COLUMN payment_lag_days INT NOT NULL DEFAULT 7;
UPDATE collaborators SET weekly_period_anchor = 'sabado', payment_lag_days = 14 WHERE name LIKE '%Ruan Matheus%';
