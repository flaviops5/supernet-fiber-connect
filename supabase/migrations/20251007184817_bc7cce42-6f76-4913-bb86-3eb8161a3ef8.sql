-- ============================================
-- SISTEMA DE MANUTENÇÃO INTELIGENTE COM PRIORIDADES
-- ============================================

-- Enum para prioridades de manutenção
CREATE TYPE maintenance_priority AS ENUM ('high', 'medium', 'low');

-- Enum para status de execução
CREATE TYPE task_status AS ENUM ('pending', 'running', 'completed', 'failed', 'skipped');

-- Tabela de tarefas de manutenção
CREATE TABLE IF NOT EXISTS public.network_maintenance_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  priority maintenance_priority NOT NULL,
  task_type TEXT NOT NULL, -- 'monitoring', 'correction', 'metrics', 'backup', 'prediction', 'cleanup'
  command TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  retry_count INTEGER NOT NULL DEFAULT 3,
  timeout_seconds INTEGER NOT NULL DEFAULT 300,
  execution_interval_minutes INTEGER NOT NULL DEFAULT 5,
  last_execution TIMESTAMP WITH TIME ZONE,
  next_execution TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de log de execuções
CREATE TABLE IF NOT EXISTS public.maintenance_execution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.network_maintenance_tasks(id) ON DELETE CASCADE,
  execution_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  execution_end TIMESTAMP WITH TIME ZONE,
  status task_status NOT NULL DEFAULT 'pending',
  priority maintenance_priority NOT NULL,
  result JSONB,
  error_message TEXT,
  retry_attempt INTEGER DEFAULT 0,
  duration_ms INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de configurações do sistema de manutenção
CREATE TABLE IF NOT EXISTS public.maintenance_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled BOOLEAN NOT NULL DEFAULT true,
  high_priority_interval_minutes INTEGER NOT NULL DEFAULT 5,
  medium_priority_interval_minutes INTEGER NOT NULL DEFAULT 15,
  low_priority_interval_minutes INTEGER NOT NULL DEFAULT 60,
  max_concurrent_tasks INTEGER NOT NULL DEFAULT 3,
  alert_email TEXT DEFAULT 'gestor@supernet.com',
  alert_webhook TEXT,
  network_stable_threshold_minutes INTEGER NOT NULL DEFAULT 10,
  auto_escalate_failures BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID
);

-- Inserir configuração padrão
INSERT INTO public.maintenance_settings (enabled) VALUES (true) ON CONFLICT DO NOTHING;

-- Inserir tarefas de PRIORIDADE ALTA
INSERT INTO public.network_maintenance_tasks (name, description, priority, task_type, command, execution_interval_minutes) VALUES
('Monitoramento de Disponibilidade', 'Verifica disponibilidade de routers, OLT, ONU e servidores PPPoE', 'high', 'monitoring', 'check_network_availability', 1),
('Validação de Latência', 'Testa latência e perda de pacotes em equipamentos core', 'high', 'monitoring', 'test_latency', 2),
('Correção Automática de Serviços', 'Reinicia serviços críticos em caso de falha', 'high', 'correction', 'restart_services', 5);

-- Inserir tarefas de PRIORIDADE MÉDIA
INSERT INTO public.network_maintenance_tasks (name, description, priority, task_type, command, execution_interval_minutes) VALUES
('Coleta de Métricas', 'Coleta métricas de performance de equipamentos', 'medium', 'metrics', 'collect_metrics', 10),
('Verificação de Firmware', 'Verifica atualizações de firmware disponíveis', 'medium', 'monitoring', 'check_firmware_updates', 60),
('Backup de Configurações', 'Realiza backup de configurações dos equipamentos', 'medium', 'backup', 'backup_configs', 30);

-- Inserir tarefas de PRIORIDADE BAIXA
INSERT INTO public.network_maintenance_tasks (name, description, priority, task_type, command, execution_interval_minutes) VALUES
('Análise Preditiva', 'Analisa padrões para prever falhas futuras', 'low', 'prediction', 'predict_failures', 120),
('Relatório Diário', 'Gera relatório de status da rede', 'low', 'monitoring', 'generate_report', 1440),
('Limpeza de Logs', 'Remove logs antigos para liberar espaço', 'low', 'cleanup', 'clean_old_logs', 1440);

-- RLS Policies
ALTER TABLE public.network_maintenance_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_execution_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_settings ENABLE ROW LEVEL SECURITY;

-- Admins podem gerenciar tudo
CREATE POLICY "Admins podem gerenciar tasks"
ON public.network_maintenance_tasks FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins podem visualizar logs"
ON public.maintenance_execution_log FOR SELECT
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins podem gerenciar configurações"
ON public.maintenance_settings FOR ALL
USING (has_role(auth.uid(), 'admin'::user_role));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_maintenance_tasks_updated_at
BEFORE UPDATE ON public.network_maintenance_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_maintenance_settings_updated_at
BEFORE UPDATE ON public.maintenance_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_maintenance_tasks_priority ON public.network_maintenance_tasks(priority, enabled);
CREATE INDEX idx_maintenance_tasks_next_execution ON public.network_maintenance_tasks(next_execution);
CREATE INDEX idx_maintenance_log_task_id ON public.maintenance_execution_log(task_id);
CREATE INDEX idx_maintenance_log_status ON public.maintenance_execution_log(status, priority);
CREATE INDEX idx_maintenance_log_created_at ON public.maintenance_execution_log(created_at DESC);