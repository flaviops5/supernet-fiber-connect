
-- Configurar agente técnico para testes
-- Usando o usuário Flavio Vicente como agente técnico

-- 1. Garantir que tem atribuição ao departamento técnico
INSERT INTO agent_department_assignments (user_id, department, is_universal)
VALUES ('c14740c7-baea-4b11-bb29-a51810853811', 'tecnico', false)
ON CONFLICT (user_id, department) 
DO UPDATE SET is_universal = false;

-- 2. Colocar o agente online
INSERT INTO agent_presence (user_id, status, department, current_conversations, max_conversations, feedback_enabled)
VALUES ('c14740c7-baea-4b11-bb29-a51810853811', 'online', 'tecnico', 0, 5, true)
ON CONFLICT (user_id) 
DO UPDATE SET 
  status = 'online',
  department = 'tecnico',
  current_conversations = 0,
  last_activity = now(),
  updated_at = now();
