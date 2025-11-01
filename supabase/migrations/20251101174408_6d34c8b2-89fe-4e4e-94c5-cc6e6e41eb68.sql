-- PR#47 - Gerenciador de Números de Notificação (Melhorado)

-- 1. Criar tabela notification_targets
CREATE TABLE IF NOT EXISTS public.notification_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  telefone text NOT NULL CHECK (telefone ~ '^\+[1-9]\d{1,14}$'),
  tipo text NOT NULL CHECK (tipo IN ('instalacao', 'financeiro', 'comercial', 'tecnico')) DEFAULT 'instalacao',
  ativo boolean DEFAULT true,
  observacoes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 2. Indexes para performance
CREATE INDEX idx_notification_targets_tipo_ativo 
ON public.notification_targets(tipo, ativo) 
WHERE ativo = true;

CREATE INDEX idx_notification_targets_created_at 
ON public.notification_targets(created_at DESC);

-- 3. Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_notification_targets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_notification_targets_updated_at
BEFORE UPDATE ON public.notification_targets
FOR EACH ROW
EXECUTE FUNCTION public.update_notification_targets_updated_at();

-- 4. Tabela de auditoria
CREATE TABLE IF NOT EXISTS public.notification_targets_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id uuid,
  action text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data jsonb,
  new_data jsonb,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at timestamptz DEFAULT now()
);

CREATE INDEX idx_notification_targets_audit_target_id 
ON public.notification_targets_audit(target_id);

CREATE INDEX idx_notification_targets_audit_changed_at 
ON public.notification_targets_audit(changed_at DESC);

-- 5. Trigger de auditoria
CREATE OR REPLACE FUNCTION public.audit_notification_targets()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    INSERT INTO public.notification_targets_audit (target_id, action, old_data, changed_by)
    VALUES (OLD.id, TG_OP, to_jsonb(OLD), auth.uid());
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO public.notification_targets_audit (target_id, action, old_data, new_data, changed_by)
    VALUES (OLD.id, TG_OP, to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO public.notification_targets_audit (target_id, action, new_data, changed_by)
    VALUES (NEW.id, TG_OP, to_jsonb(NEW), auth.uid());
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_audit_notification_targets
AFTER INSERT OR UPDATE OR DELETE ON public.notification_targets
FOR EACH ROW
EXECUTE FUNCTION public.audit_notification_targets();

-- 6. Ativar RLS
ALTER TABLE public.notification_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_targets_audit ENABLE ROW LEVEL SECURITY;

-- 7. Policies para notification_targets
CREATE POLICY "Admins podem gerenciar notification_targets"
ON public.notification_targets
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- 8. Policies para auditoria (apenas leitura para admins)
CREATE POLICY "Admins podem visualizar auditoria"
ON public.notification_targets_audit
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- 9. Migrar dados existentes de company_settings
DO $$
DECLARE
  phone text;
  phones_array text[];
BEGIN
  -- Buscar telefones da company_settings
  SELECT whatsapp_notification_phones INTO phones_array
  FROM public.company_settings
  LIMIT 1;
  
  -- Inserir cada telefone na nova tabela
  IF phones_array IS NOT NULL THEN
    FOREACH phone IN ARRAY phones_array
    LOOP
      INSERT INTO public.notification_targets (nome, telefone, tipo, ativo, observacoes)
      VALUES (
        'Migrado de company_settings',
        phone,
        'instalacao',
        true,
        'Número migrado automaticamente do sistema anterior'
      )
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
END $$;

-- 10. Comentários deprecando campos antigos (não removemos para compatibilidade)
COMMENT ON COLUMN public.company_settings.whatsapp_notification_phones IS 
  'DEPRECATED: Use notification_targets table instead. Mantido apenas para compatibilidade.';
COMMENT ON COLUMN public.company_settings.whatsapp_instance_name IS 
  'DEPRECATED: Use notification_targets table instead. Mantido apenas para compatibilidade.';