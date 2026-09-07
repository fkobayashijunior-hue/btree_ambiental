-- Adiciona salário mensal ao cadastro de colaboradores (para CLT)
ALTER TABLE collaborators ADD COLUMN monthly_salary VARCHAR(20) NULL AFTER daily_rate;
