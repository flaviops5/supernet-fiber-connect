-- PR#55: Expansão QA Orchestrator - Adicionar colunas para Wave 1 + Wave 2
-- Adiciona colunas necessárias para classificação e ponderação de casos

ALTER TABLE qa_regression_cases
ADD COLUMN IF NOT EXISTS case_group text CHECK (case_group IN ('baseline', 'edge', 'linguistic', 'malicious', 'adversarial')),
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS weight numeric DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;

-- Atualiza casos existentes para serem 'baseline'
UPDATE qa_regression_cases 
SET case_group = 'baseline', 
    description = scenario_name,
    active = true
WHERE case_group IS NULL;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_qa_cases_active ON qa_regression_cases(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_qa_cases_group ON qa_regression_cases(case_group);