-- Adicionar 'cloe' como departamento válido no enum
ALTER TYPE agent_department ADD VALUE IF NOT EXISTS 'cloe';

-- Comentário: Permite que a Cloé (agente de roteamento) seja reconhecida 
-- como um departamento válido quando ela continua atendendo o cliente