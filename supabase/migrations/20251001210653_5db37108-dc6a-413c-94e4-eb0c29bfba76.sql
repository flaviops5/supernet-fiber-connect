-- Criar enum para tipos de campanha
CREATE TYPE campaign_type AS ENUM ('marketing', 'alert', 'commemorative', 'network_outage');

-- Criar enum para status da campanha
CREATE TYPE campaign_status AS ENUM ('draft', 'scheduled', 'running', 'completed', 'paused', 'cancelled');

-- Criar enum para canais de envio
CREATE TYPE campaign_channel AS ENUM ('whatsapp', 'sms', 'email', 'call');

-- Criar enum para tipos de CTA
CREATE TYPE campaign_cta_type AS ENUM ('none', 'reply', 'contact_support', 'contact_agent', 'link');

-- Criar enum para status do recipient
CREATE TYPE recipient_status AS ENUM ('pending', 'sent', 'delivered', 'failed', 'opened', 'clicked', 'replied');

-- Tabela principal de campanhas
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  type campaign_type NOT NULL,
  status campaign_status NOT NULL DEFAULT 'draft',
  channels campaign_channel[] NOT NULL DEFAULT ARRAY['whatsapp']::campaign_channel[],
  
  -- Filtros de público-alvo (JSON com critérios)
  target_filters JSONB DEFAULT '{}'::jsonb,
  
  scheduled_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  created_by UUID REFERENCES profiles(user_id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Tabela de conteúdo da campanha
CREATE TABLE campaign_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  
  content_text TEXT,
  media_type TEXT, -- image, video, gif, audio
  media_url TEXT,
  
  -- Configuração do CTA
  cta_type campaign_cta_type NOT NULL DEFAULT 'none',
  cta_config JSONB DEFAULT '{}'::jsonb, -- {agent_id, department, link_url, button_text}
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de destinatários da campanha
CREATE TABLE campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  
  -- Dados do cliente (do IXC)
  ixc_client_id TEXT,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  customer_data JSONB DEFAULT '{}'::jsonb, -- plano, região, etc
  
  -- Status de envio por canal
  whatsapp_status recipient_status,
  sms_status recipient_status,
  email_status recipient_status,
  call_status recipient_status,
  
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  replied_at TIMESTAMP WITH TIME ZONE,
  
  -- Se houve resposta, criar conversa
  conversation_id UUID REFERENCES conversations(id),
  response_text TEXT,
  
  error_message TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de estatísticas agregadas
CREATE TABLE campaign_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE UNIQUE,
  
  total_recipients INTEGER DEFAULT 0,
  total_sent INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_failed INTEGER DEFAULT 0,
  total_opened INTEGER DEFAULT 0,
  total_clicked INTEGER DEFAULT 0,
  total_replied INTEGER DEFAULT 0,
  
  delivery_rate NUMERIC(5,2),
  open_rate NUMERIC(5,2),
  click_rate NUMERIC(5,2),
  reply_rate NUMERIC(5,2),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar índices para performance
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_type ON campaigns(type);
CREATE INDEX idx_campaigns_created_by ON campaigns(created_by);
CREATE INDEX idx_campaign_recipients_campaign ON campaign_recipients(campaign_id);
CREATE INDEX idx_campaign_recipients_statuses ON campaign_recipients(whatsapp_status, sms_status, email_status);

-- Triggers para updated_at
CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaign_content_updated_at
  BEFORE UPDATE ON campaign_content
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaign_recipients_updated_at
  BEFORE UPDATE ON campaign_recipients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaign_stats_updated_at
  BEFORE UPDATE ON campaign_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_stats ENABLE ROW LEVEL SECURITY;

-- Admins podem gerenciar tudo
CREATE POLICY "Admins can manage campaigns"
  ON campaigns FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage campaign content"
  ON campaign_content FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage campaign recipients"
  ON campaign_recipients FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view campaign stats"
  ON campaign_stats FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Editors podem visualizar e criar campanhas
CREATE POLICY "Editors can view campaigns"
  ON campaigns FOR SELECT
  USING (has_role(auth.uid(), 'editor') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Editors can create campaigns"
  ON campaigns FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'editor') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Editors can view campaign content"
  ON campaign_content FOR SELECT
  USING (has_role(auth.uid(), 'editor') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Editors can view campaign recipients"
  ON campaign_recipients FOR SELECT
  USING (has_role(auth.uid(), 'editor') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Editors can view campaign stats"
  ON campaign_stats FOR SELECT
  USING (has_role(auth.uid(), 'editor') OR has_role(auth.uid(), 'admin'));

-- Criar storage bucket para mídias de campanhas
INSERT INTO storage.buckets (id, name, public)
VALUES ('campaign-media', 'campaign-media', false)
ON CONFLICT (id) DO NOTHING;

-- RLS para storage bucket
CREATE POLICY "Admins can upload campaign media"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'campaign-media' 
    AND has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can view campaign media"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'campaign-media'
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'editor'))
  );

CREATE POLICY "Admins can delete campaign media"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'campaign-media'
    AND has_role(auth.uid(), 'admin')
  );