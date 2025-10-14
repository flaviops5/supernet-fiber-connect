-- Criar função para sincronizar automaticamente a base de conhecimento
CREATE OR REPLACE FUNCTION auto_sync_knowledge_base()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Chamar a edge function de sincronização de forma assíncrona
  PERFORM net.http_post(
    url := 'https://mxdupkbpxjcfxdgrwknp.supabase.co/functions/v1/sync-chatbot-knowledge',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14ZHVwa2JweGpjZnhkZ3J3a25wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3NTg4ODYsImV4cCI6MjA3NDMzNDg4Nn0.np4wHopAwI7HOTsYPaAUSWbe_qVxMBSIHjYv4PnKL6I"}'::jsonb,
    body := '{}'::jsonb
  );
  
  RETURN NEW;
END;
$$;

-- Trigger para sincronizar quando planos são modificados
DROP TRIGGER IF EXISTS trigger_sync_on_plans_change ON plans;
CREATE TRIGGER trigger_sync_on_plans_change
  AFTER INSERT OR UPDATE OR DELETE ON plans
  FOR EACH STATEMENT
  EXECUTE FUNCTION auto_sync_knowledge_base();

-- Trigger para sincronizar quando FAQs são modificadas
DROP TRIGGER IF EXISTS trigger_sync_on_faqs_change ON faqs;
CREATE TRIGGER trigger_sync_on_faqs_change
  AFTER INSERT OR UPDATE OR DELETE ON faqs
  FOR EACH STATEMENT
  EXECUTE FUNCTION auto_sync_knowledge_base();

-- Trigger para sincronizar quando configurações da empresa mudam
DROP TRIGGER IF EXISTS trigger_sync_on_company_change ON company_settings;
CREATE TRIGGER trigger_sync_on_company_change
  AFTER UPDATE ON company_settings
  FOR EACH STATEMENT
  EXECUTE FUNCTION auto_sync_knowledge_base();

COMMENT ON FUNCTION auto_sync_knowledge_base() IS 'Sincroniza automaticamente a base de conhecimento dos agentes quando planos, FAQs ou configurações da empresa são modificados';