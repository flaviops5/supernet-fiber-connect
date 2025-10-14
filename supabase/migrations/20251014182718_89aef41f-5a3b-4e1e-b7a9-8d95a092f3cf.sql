-- 1. Garantir enum com 'routing'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'agent_department' AND e.enumlabel = 'routing'
  ) THEN
    ALTER TYPE agent_department ADD VALUE 'routing';
  END IF;
END$$;

-- 2. Garantir coluna metadata e current_department na conversations
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS current_department agent_department;

-- 3. Índices úteis
CREATE INDEX IF NOT EXISTS idx_conversations_current_department
  ON public.conversations (current_department);

CREATE INDEX IF NOT EXISTS idx_conversations_metadata_gin
  ON public.conversations USING GIN (metadata);

-- 4. Tabela de regras de escalonamento (se não existir)
CREATE TABLE IF NOT EXISTS public.escalation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_department agent_department NOT NULL,
  to_department agent_department NOT NULL,
  priority int NOT NULL DEFAULT 1,
  conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_escalation_rules_from_to_enabled
  ON public.escalation_rules (from_department, to_department, enabled);

-- 6. Policies simples: leitura para autenticados
ALTER TABLE public.escalation_rules ENABLE ROW LEVEL SECURITY;
DO $$BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'escalation_rules' AND policyname = 'read_authenticated_escalation_rules'
  ) THEN
    CREATE POLICY read_authenticated_escalation_rules
      ON public.escalation_rules
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END$$;