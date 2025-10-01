-- Adicionar tipo NPS ao enum de campanhas
ALTER TYPE campaign_type ADD VALUE IF NOT EXISTS 'nps';

-- Criar tabela para respostas NPS
CREATE TABLE nps_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES campaign_recipients(id) ON DELETE CASCADE,
  
  -- Dados do cliente
  ixc_client_id TEXT,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  
  -- Resposta NPS
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 10),
  category TEXT NOT NULL CHECK (category IN ('detractor', 'neutral', 'promoter')),
  
  -- Feedback adicional (opcional)
  feedback TEXT,
  
  -- Follow-up
  follow_up_needed BOOLEAN DEFAULT false,
  follow_up_completed BOOLEAN DEFAULT false,
  follow_up_conversation_id UUID REFERENCES conversations(id),
  follow_up_notes TEXT,
  
  -- Metadata
  response_channel TEXT, -- whatsapp, sms, email, web
  responded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de estatísticas NPS agregadas por campanha
CREATE TABLE nps_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE UNIQUE,
  
  -- Contadores
  total_responses INTEGER DEFAULT 0,
  total_promoters INTEGER DEFAULT 0,
  total_neutrals INTEGER DEFAULT 0,
  total_detractors INTEGER DEFAULT 0,
  
  -- Percentuais
  promoters_percentage NUMERIC(5,2) DEFAULT 0,
  neutrals_percentage NUMERIC(5,2) DEFAULT 0,
  detractors_percentage NUMERIC(5,2) DEFAULT 0,
  
  -- Score NPS (-100 a +100)
  nps_score INTEGER DEFAULT 0,
  
  -- Follow-up tracking
  follow_ups_needed INTEGER DEFAULT 0,
  follow_ups_completed INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de histórico NPS (para tracking ao longo do tempo)
CREATE TABLE nps_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Snapshot mensal
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Estatísticas do período
  total_responses INTEGER NOT NULL,
  nps_score INTEGER NOT NULL,
  promoters_count INTEGER NOT NULL,
  neutrals_count INTEGER NOT NULL,
  detractors_count INTEGER NOT NULL,
  
  -- Tendência
  trend TEXT, -- 'up', 'down', 'stable'
  previous_score INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_nps_responses_campaign ON nps_responses(campaign_id);
CREATE INDEX idx_nps_responses_score ON nps_responses(score);
CREATE INDEX idx_nps_responses_category ON nps_responses(category);
CREATE INDEX idx_nps_responses_date ON nps_responses(responded_at);
CREATE INDEX idx_nps_history_period ON nps_history(period_start, period_end);

-- Função para calcular categoria NPS baseada no score
CREATE OR REPLACE FUNCTION calculate_nps_category(score INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  IF score >= 9 THEN
    RETURN 'promoter';
  ELSIF score >= 7 THEN
    RETURN 'neutral';
  ELSE
    RETURN 'detractor';
  END IF;
END;
$$;

-- Função para atualizar estatísticas NPS
CREATE OR REPLACE FUNCTION update_nps_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total INTEGER;
  v_promoters INTEGER;
  v_neutrals INTEGER;
  v_detractors INTEGER;
  v_nps_score INTEGER;
BEGIN
  -- Contar respostas por categoria
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE category = 'promoter'),
    COUNT(*) FILTER (WHERE category = 'neutral'),
    COUNT(*) FILTER (WHERE category = 'detractor')
  INTO v_total, v_promoters, v_neutrals, v_detractors
  FROM nps_responses
  WHERE campaign_id = NEW.campaign_id;
  
  -- Calcular NPS Score
  IF v_total > 0 THEN
    v_nps_score := ROUND(((v_promoters::NUMERIC / v_total) - (v_detractors::NUMERIC / v_total)) * 100);
  ELSE
    v_nps_score := 0;
  END IF;
  
  -- Inserir ou atualizar stats
  INSERT INTO nps_stats (
    campaign_id,
    total_responses,
    total_promoters,
    total_neutrals,
    total_detractors,
    promoters_percentage,
    neutrals_percentage,
    detractors_percentage,
    nps_score,
    follow_ups_needed
  ) VALUES (
    NEW.campaign_id,
    v_total,
    v_promoters,
    v_neutrals,
    v_detractors,
    CASE WHEN v_total > 0 THEN ROUND((v_promoters::NUMERIC / v_total) * 100, 2) ELSE 0 END,
    CASE WHEN v_total > 0 THEN ROUND((v_neutrals::NUMERIC / v_total) * 100, 2) ELSE 0 END,
    CASE WHEN v_total > 0 THEN ROUND((v_detractors::NUMERIC / v_total) * 100, 2) ELSE 0 END,
    v_nps_score,
    (SELECT COUNT(*) FROM nps_responses WHERE campaign_id = NEW.campaign_id AND follow_up_needed = true AND follow_up_completed = false)
  )
  ON CONFLICT (campaign_id) 
  DO UPDATE SET
    total_responses = EXCLUDED.total_responses,
    total_promoters = EXCLUDED.total_promoters,
    total_neutrals = EXCLUDED.total_neutrals,
    total_detractors = EXCLUDED.total_detractors,
    promoters_percentage = EXCLUDED.promoters_percentage,
    neutrals_percentage = EXCLUDED.neutrals_percentage,
    detractors_percentage = EXCLUDED.detractors_percentage,
    nps_score = EXCLUDED.nps_score,
    follow_ups_needed = EXCLUDED.follow_ups_needed,
    updated_at = now();
  
  RETURN NEW;
END;
$$;

-- Trigger para atualizar stats automaticamente
CREATE TRIGGER trigger_update_nps_stats
AFTER INSERT OR UPDATE ON nps_responses
FOR EACH ROW
EXECUTE FUNCTION update_nps_stats();

-- Trigger para marcar follow-up necessário para detratores
CREATE OR REPLACE FUNCTION mark_detractor_followup()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.category = 'detractor' THEN
    NEW.follow_up_needed := true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_mark_detractor_followup
BEFORE INSERT ON nps_responses
FOR EACH ROW
EXECUTE FUNCTION mark_detractor_followup();

-- Triggers para updated_at
CREATE TRIGGER update_nps_responses_updated_at
  BEFORE UPDATE ON nps_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nps_stats_updated_at
  BEFORE UPDATE ON nps_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE nps_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE nps_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE nps_history ENABLE ROW LEVEL SECURITY;

-- Admins podem gerenciar tudo
CREATE POLICY "Admins can manage nps responses"
  ON nps_responses FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view nps stats"
  ON nps_stats FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view nps history"
  ON nps_history FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Editors podem visualizar
CREATE POLICY "Editors can view nps responses"
  ON nps_responses FOR SELECT
  USING (has_role(auth.uid(), 'editor') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Editors can view nps stats"
  ON nps_stats FOR SELECT
  USING (has_role(auth.uid(), 'editor') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Editors can view nps history"
  ON nps_history FOR SELECT
  USING (has_role(auth.uid(), 'editor') OR has_role(auth.uid(), 'admin'));