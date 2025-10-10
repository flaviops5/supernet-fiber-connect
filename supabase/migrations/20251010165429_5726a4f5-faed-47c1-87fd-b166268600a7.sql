-- FASE 1: Sistema de Atribuição de Agentes e Departamento Logística

-- 1. Adicionar 'logistica' ao enum agent_department
ALTER TYPE agent_department ADD VALUE IF NOT EXISTS 'logistica';

-- 2. Criar tabela de atribuições múltiplas de agentes a departamentos
CREATE TABLE IF NOT EXISTS public.agent_department_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  department agent_department NOT NULL,
  is_universal BOOLEAN DEFAULT FALSE,
  assigned_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, department)
);

-- 3. Índices para performance
CREATE INDEX IF NOT EXISTS idx_agent_dept_user ON agent_department_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_dept_department ON agent_department_assignments(department);
CREATE INDEX IF NOT EXISTS idx_agent_dept_universal ON agent_department_assignments(is_universal) WHERE is_universal = TRUE;

-- 4. RLS policies
ALTER TABLE public.agent_department_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view their own assignments"
  ON public.agent_department_assignments
  FOR SELECT
  USING (
    auth.uid() = user_id OR
    has_role(auth.uid(), 'admin'::user_role) OR
    has_role(auth.uid(), 'editor'::user_role)
  );

CREATE POLICY "Admins can manage all assignments"
  ON public.agent_department_assignments
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Editors can insert assignments"
  ON public.agent_department_assignments
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'editor'::user_role) OR has_role(auth.uid(), 'admin'::user_role));

-- 5. Trigger para atualizar updated_at
CREATE TRIGGER update_agent_dept_assignments_updated_at
  BEFORE UPDATE ON public.agent_department_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Adicionar campos para busca nas conversas (se ainda não existem)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'conversations' AND column_name = 'search_vector') THEN
    ALTER TABLE public.conversations 
    ADD COLUMN search_vector tsvector;
  END IF;
END $$;

-- 7. Criar índice de busca full-text
CREATE INDEX IF NOT EXISTS idx_conversations_search 
  ON public.conversations 
  USING GIN(search_vector);

-- 8. Função para atualizar o vetor de busca
CREATE OR REPLACE FUNCTION update_conversation_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('portuguese', COALESCE(NEW.customer_name, '')), 'A') ||
    setweight(to_tsvector('portuguese', COALESCE(NEW.customer_phone, '')), 'B') ||
    setweight(to_tsvector('portuguese', COALESCE(NEW.customer_cpf, '')), 'B') ||
    setweight(to_tsvector('portuguese', COALESCE(NEW.customer_email, '')), 'C') ||
    setweight(to_tsvector('portuguese', COALESCE(array_to_string(NEW.tags, ' '), '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Trigger para atualizar search_vector automaticamente
DROP TRIGGER IF EXISTS trigger_update_conversation_search ON public.conversations;
CREATE TRIGGER trigger_update_conversation_search
  BEFORE INSERT OR UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_search_vector();

-- 10. Atualizar conversas existentes com search_vector
UPDATE public.conversations
SET search_vector = 
  setweight(to_tsvector('portuguese', COALESCE(customer_name, '')), 'A') ||
  setweight(to_tsvector('portuguese', COALESCE(customer_phone, '')), 'B') ||
  setweight(to_tsvector('portuguese', COALESCE(customer_cpf, '')), 'B') ||
  setweight(to_tsvector('portuguese', COALESCE(customer_email, '')), 'C') ||
  setweight(to_tsvector('portuguese', COALESCE(array_to_string(tags, ' '), '')), 'D')
WHERE search_vector IS NULL;

-- 11. Função helper para buscar agentes disponíveis por departamento
CREATE OR REPLACE FUNCTION get_available_agents_for_department(
  dept agent_department,
  include_universal BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
  user_id UUID,
  current_load INTEGER,
  max_load INTEGER,
  is_universal BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ap.user_id,
    ap.current_conversations,
    ap.max_conversations,
    COALESCE(ada.is_universal, FALSE) as is_universal
  FROM agent_presence ap
  INNER JOIN agent_department_assignments ada ON ada.user_id = ap.user_id
  WHERE ap.status = 'online'
    AND ap.current_conversations < ap.max_conversations
    AND (
      ada.department = dept OR
      (include_universal AND ada.is_universal = TRUE)
    )
  ORDER BY 
    CASE WHEN ada.department = dept THEN 0 ELSE 1 END, -- Prioriza agentes específicos
    ap.current_conversations ASC; -- Depois por carga
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE public.agent_department_assignments IS 'Atribuição de agentes a múltiplos departamentos';
COMMENT ON COLUMN public.agent_department_assignments.is_universal IS 'Se TRUE, o agente atende todos os departamentos como backup';
COMMENT ON FUNCTION get_available_agents_for_department IS 'Retorna agentes disponíveis para um departamento, priorizando especialistas';