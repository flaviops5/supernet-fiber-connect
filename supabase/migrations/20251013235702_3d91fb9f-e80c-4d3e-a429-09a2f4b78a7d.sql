-- Tabela de análise financeira com histórico
CREATE TABLE IF NOT EXISTS public.financial_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  day_bucket DATE NOT NULL DEFAULT (now()::date),
  created_by UUID REFERENCES auth.users(id),
  
  -- Métricas principais
  mrr NUMERIC NOT NULL,
  arr NUMERIC NOT NULL,
  active_contracts INTEGER NOT NULL,
  total_contracts INTEGER NOT NULL,
  average_ticket NUMERIC NOT NULL,
  
  -- Inadimplência
  overdue_invoices INTEGER NOT NULL,
  overdue_amount NUMERIC NOT NULL,
  overdue_rate NUMERIC NOT NULL,
  
  -- Churn
  churned_contracts INTEGER NOT NULL,
  churn_rate NUMERIC NOT NULL,
  
  -- Projeções
  projected_mrr NUMERIC NOT NULL,
  projected_arr NUMERIC NOT NULL,
  
  -- Dados ricos em JSONB
  aging JSONB NOT NULL DEFAULT '{}'::jsonb,
  top_debtors JSONB NOT NULL DEFAULT '[]'::jsonb,
  plan_performance JSONB NOT NULL DEFAULT '{}'::jsonb,
  monthly_revenue JSONB NOT NULL DEFAULT '[]'::jsonb,
  raw_counts JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Metadados de performance
  computation_time_ms INTEGER,
  ixc_api_calls INTEGER,
  
  UNIQUE(day_bucket)
);

-- Índice para consultas por data
CREATE INDEX IF NOT EXISTS idx_financial_analytics_day 
  ON financial_analytics(day_bucket DESC);

-- Habilitar RLS
ALTER TABLE financial_analytics ENABLE ROW LEVEL SECURITY;

-- Admins podem tudo
CREATE POLICY "Admins can manage analytics"
  ON financial_analytics FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role));

-- Editors podem ver
CREATE POLICY "Editors can view analytics"
  ON financial_analytics FOR SELECT
  USING (
    has_role(auth.uid(), 'editor'::user_role) OR 
    has_role(auth.uid(), 'admin'::user_role)
  );

-- Service role pode inserir (para cron)
CREATE POLICY "Service role can insert"
  ON financial_analytics FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Comentários
COMMENT ON TABLE financial_analytics IS 'Histórico diário de análises financeiras do IXC';
COMMENT ON COLUMN financial_analytics.day_bucket IS 'Data do snapshot (1 registro por dia)';
COMMENT ON COLUMN financial_analytics.aging IS 'Aging de inadimplência: {days0_30:{count,amount}, days31_60, days61_90, days90Plus}';
COMMENT ON COLUMN financial_analytics.top_debtors IS 'Top 10 devedores: [{clientId, clientName, overdueAmount, invoicesCount, oldestInvoice}]';
COMMENT ON COLUMN financial_analytics.plan_performance IS 'Performance por plano: {plano:{activeCount, canceledCount, churnRate, revenue}}';
COMMENT ON COLUMN financial_analytics.monthly_revenue IS 'Série temporal: [{month, revenue, contracts}]';