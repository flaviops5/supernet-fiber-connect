-- Tabela para mensagens de encerramento pré-definidas
CREATE TABLE IF NOT EXISTS public.closure_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Tabela para repositório de mídias
CREATE TABLE IF NOT EXISTS public.media_repository (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'image', 'video', 'audio', 'gif'
  file_size BIGINT,
  thumbnail_url TEXT,
  tags TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Tabela para atalhos de mensagens
CREATE TABLE IF NOT EXISTS public.message_shortcuts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  shortcut_key TEXT UNIQUE NOT NULL, -- Ex: '/reboot', '/connector'
  message_text TEXT,
  media_id UUID REFERENCES public.media_repository(id),
  department agent_department[], -- Quais departamentos podem usar
  ai_agents TEXT[], -- Quais agentes IA podem referenciar: ['sales', 'tech-support', 'financial']
  usage_context TEXT, -- Quando usar: 'retirar connector', 'reiniciar equipamento'
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_closure_messages_active ON public.closure_messages(is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_media_repository_active ON public.media_repository(is_active);
CREATE INDEX IF NOT EXISTS idx_media_repository_tags ON public.media_repository USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_message_shortcuts_key ON public.message_shortcuts(shortcut_key);
CREATE INDEX IF NOT EXISTS idx_message_shortcuts_active ON public.message_shortcuts(is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_message_shortcuts_ai ON public.message_shortcuts USING gin(ai_agents);

-- RLS Policies
ALTER TABLE public.closure_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_repository ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_shortcuts ENABLE ROW LEVEL SECURITY;

-- Closure Messages Policies
CREATE POLICY "Admins podem gerenciar mensagens de encerramento"
  ON public.closure_messages FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Editors podem ver mensagens ativas"
  ON public.closure_messages FOR SELECT
  USING (is_active = true AND (has_role(auth.uid(), 'editor') OR has_role(auth.uid(), 'admin')));

-- Media Repository Policies
CREATE POLICY "Admins podem gerenciar repositório de mídias"
  ON public.media_repository FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Editors podem ver e usar mídias ativas"
  ON public.media_repository FOR SELECT
  USING (is_active = true AND (has_role(auth.uid(), 'editor') OR has_role(auth.uid(), 'admin')));

CREATE POLICY "Editors podem inserir mídias"
  ON public.media_repository FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'editor') OR has_role(auth.uid(), 'admin'));

-- Message Shortcuts Policies
CREATE POLICY "Admins podem gerenciar atalhos"
  ON public.message_shortcuts FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Editors podem ver atalhos ativos"
  ON public.message_shortcuts FOR SELECT
  USING (is_active = true AND (has_role(auth.uid(), 'editor') OR has_role(auth.uid(), 'admin')));

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_closure_messages_updated_at
  BEFORE UPDATE ON public.closure_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_media_repository_updated_at
  BEFORE UPDATE ON public.media_repository
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_message_shortcuts_updated_at
  BEFORE UPDATE ON public.message_shortcuts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Inserir mensagens de encerramento padrão
INSERT INTO public.closure_messages (title, message, display_order) VALUES
('Falta de resposta', 'Olá! Estou encerrando este atendimento devido à falta de resposta. Caso precise de ajuda, estamos à disposição. Obrigado!', 1),
('Problema resolvido', 'Atendimento finalizado com sucesso! Problema resolvido. Caso precise de mais algo, entre em contato. Obrigado!', 2),
('Encaminhado para setor', 'Este atendimento foi encaminhado para o setor responsável. Você receberá um retorno em breve. Obrigado pela compreensão!', 3),
('Cliente solicitou encerramento', 'Atendimento encerrado conforme solicitado. Ficamos à disposição para futuras necessidades. Obrigado!', 4);

-- Inserir atalhos de exemplo
INSERT INTO public.message_shortcuts (title, shortcut_key, message_text, department, ai_agents, usage_context, display_order) VALUES
('Reiniciar equipamento', '/reiniciar', 'Por favor, reinicie seu equipamento desconectando da tomada por 30 segundos e reconectando.', ARRAY['tecnico'::agent_department], ARRAY['tech-support'], 'quando cliente relatar lentidão ou queda de conexão', 1),
('Verificar conectores', '/conectores', 'Verifique se todos os cabos estão firmemente conectados, especialmente o cabo de rede e de energia.', ARRAY['tecnico'::agent_department], ARRAY['tech-support'], 'quando suspeitar de problema físico de conexão', 2),
('Consultar fatura', '/fatura', 'Para consultar sua fatura, acesse nossa área do cliente ou solicite o envio por email.', ARRAY['financeiro'::agent_department], ARRAY['financial-support'], 'quando cliente perguntar sobre boleto ou pagamento', 3),
('Planos disponíveis', '/planos', 'Temos diversos planos que podem atender sua necessidade. Vou enviar as opções disponíveis para sua região.', ARRAY['comercial'::agent_department], ARRAY['sales'], 'quando cliente perguntar sobre contratar ou mudar plano', 4);