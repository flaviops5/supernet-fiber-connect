-- Criar tabela para templates de email
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_plain TEXT,
  description TEXT,
  variables JSONB DEFAULT '[]'::jsonb,
  category TEXT DEFAULT 'geral',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices
CREATE INDEX idx_email_templates_slug ON public.email_templates(slug);
CREATE INDEX idx_email_templates_category ON public.email_templates(category);
CREATE INDEX idx_email_templates_active ON public.email_templates(is_active);

-- RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins podem gerenciar templates de email"
  ON public.email_templates
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Editors podem gerenciar templates de email"
  ON public.email_templates
  FOR ALL
  USING (has_role(auth.uid(), 'editor'::user_role));

CREATE POLICY "Templates ativos são visíveis"
  ON public.email_templates
  FOR SELECT
  USING (is_active = true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Inserir templates exemplo
INSERT INTO public.email_templates (name, slug, subject, body_html, description, variables, category) VALUES
('Contrato de Instalação', 'contrato-instalacao', 'Seu Contrato SUPERNET FIBRA', 
'<h1>Olá, {{nome_cliente}}!</h1>
<p>Seu contrato de internet fibra está pronto para assinatura.</p>
<h2>Detalhes do Plano</h2>
<ul>
  <li><strong>Plano:</strong> {{plano_nome}}</li>
  <li><strong>Velocidade:</strong> {{plano_velocidade}}</li>
  <li><strong>Valor:</strong> R$ {{plano_preco}}</li>
</ul>
<p><a href="{{link_assinatura}}" style="background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Assinar Contrato</a></p>
<p>Qualquer dúvida, entre em contato conosco!</p>',
'Template para envio de contrato de instalação',
'["nome_cliente", "plano_nome", "plano_velocidade", "plano_preco", "link_assinatura"]'::jsonb,
'contratos'),

('Confirmação de Agendamento', 'confirmacao-agendamento', 'Agendamento Confirmado - SUPERNET FIBRA',
'<h1>Olá, {{nome_cliente}}!</h1>
<p>Seu agendamento de instalação foi confirmado!</p>
<h2>Detalhes</h2>
<ul>
  <li><strong>Data:</strong> {{data_agendamento}}</li>
  <li><strong>Período:</strong> {{periodo_agendamento}}</li>
  <li><strong>Endereço:</strong> {{endereco}}</li>
</ul>
<p>Nossa equipe técnica entrará em contato antes da instalação.</p>',
'Template para confirmação de agendamento de instalação',
'["nome_cliente", "data_agendamento", "periodo_agendamento", "endereco"]'::jsonb,
'agendamentos');
