-- ============================================================
-- Memória de classificação de gastos por favorecido (extrato bancário)
-- Sistema: BTREE Ambiental | Data: 2026-08-31
-- ============================================================
-- Guarda a categoria financeira já resolvida para um favorecido do extrato
-- (identificado por CNPJ completo, nome, ou fragmento de CPF mascarado pelo
-- banco), para reaplicar automaticamente em lançamentos futuros do mesmo
-- favorecido, e o resultado em cache da consulta de CNPJ na BrasilAPI
-- (razão social + CNAE) para não reconsultar o mesmo CNPJ duas vezes.
--
-- Já aplicado no banco de staging (server/_core/index.ts cria a tabela
-- automaticamente no boot caso não exista — este arquivo é só referência
-- para produção).
-- ============================================================

CREATE TABLE IF NOT EXISTS favorecido_categoria (
  id int AUTO_INCREMENT NOT NULL,
  chave varchar(255) NOT NULL,
  tipo_chave enum('cnpj','nome','cpf_fragmento') NOT NULL,
  categoria varchar(100),
  origem enum('manual','api') NOT NULL,
  razao_social varchar(255),
  cnae_codigo varchar(20),
  cnae_descricao varchar(255),
  created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT favorecido_categoria_pk PRIMARY KEY(id),
  UNIQUE KEY favorecido_categoria_chave_unique (chave)
);
