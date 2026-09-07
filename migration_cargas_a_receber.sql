-- ============================================================
-- Nova sub-aba "Cargas Entregues a Receber" (Contas a Receber)
-- Sistema: BTREE Ambiental | Data: 2026-08-25
-- ============================================================
-- Para compradores que NÃO emitem boleto/NF (ex: Enerbio), o controle de
-- recebimento passa a vir direto das cargas entregues no Controle de Cargas,
-- com vencimento = data da entrega + "Prazo de pagamento após entrega".
--
-- Já aplicada no banco de staging. Rodar em produção quando for fazer o
-- deploy desta mudança.
-- ============================================================

ALTER TABLE cargo_destinations
  ADD COLUMN payment_term_days_after_delivery INT NULL;

-- Campo próprio para "comprador pagou esta carga" — NÃO é o mesmo que payment_status
-- (que controla o pagamento da BTREE ao cliente/fornecedor daquela carga, fluxo oposto).
ALTER TABLE cargo_loads
  ADD COLUMN buyer_paid_at TIMESTAMP NULL;

-- Configuração da Enerbio (TH BENTLIN LTDA): pagamento = entrega + 1 dia.
-- Ajuste o WHERE (id ou name) conforme o id real dela em produção.
UPDATE cargo_destinations
  SET payment_term_days_after_delivery = 1,
      name = 'TH BENTLIN LTDA',
      cnpj_cpf = '43.328.496/0001-30'
  WHERE name LIKE '%ENERBIO%' OR nickname = 'ENERBIO';
