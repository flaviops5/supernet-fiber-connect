-- ==========================================================
-- PR#53 - UNIFIED QA ORCHESTRATOR (MIGRATION COMPLETA)
-- Execute este arquivo completo no SQL Editor do Supabase
-- ==========================================================

-- 1) CASOS DE REGRESSÃO (BASELINE FIXA)
CREATE TABLE IF NOT EXISTS public.qa_regression_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('tecnico','financeiro','comercial','geral')),
  prompt TEXT NOT NULL,
  expected_agent TEXT NOT NULL CHECK (expected_agent IN ('cloe','luan','julia','vicente')),
  -- campos de histórico
  last_passed BOOLEAN DEFAULT false,
  last_routing_score NUMERIC,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qa_regression_cases_cat ON public.qa_regression_cases (category);
CREATE INDEX IF NOT EXISTS idx_qa_regression_cases_expected ON public.qa_regression_cases (expected_agent);

-- 1.1) SEED BASELINE (17 casos canônicos)
INSERT INTO public.qa_regression_cases (scenario_name, category, prompt, expected_agent) VALUES
-- Técnico (Luan)
('A1: Offline básico','tecnico','Minha internet caiu do nada','luan'),
('B1: Lento vídeos','tecnico','Vídeos do YouTube ficam travando','luan'),
('C1: Cai toda hora','tecnico','Minha conexão cai de 5 em 5 minutos','luan'),
('D1: Já reiniciei','tecnico','Eu já reiniciei o roteador e continua ruim','luan'),
('E1: Senha Wi-Fi','tecnico','Qual a senha do Wi-Fi?','luan'),
('E2: Netflix travando','tecnico','Netflix trava toda hora','luan'),
-- Financeiro (Julia)
('F1: Boleto','financeiro','Quero o boleto para pagar','julia'),
('F2: PIX','financeiro','Pode me passar o PIX da fatura?','julia'),
('F3: Paguei e bloqueado','financeiro','Paguei ontem e ainda estou bloqueado','julia'),
('F4: Negociar','financeiro','Consigo parcelar minhas pendências?','julia'),
('F5: Desbloqueio','financeiro','Quero desbloquear minha internet','julia'),
-- Comercial (Vicente)
('C1: Cobertura','comercial','Vocês atendem aqui na minha rua?','vicente'),
('C2: Novo contrato','comercial','Quero instalar internet na minha casa nova','vicente'),
('C3: Upgrade','comercial','Quero aumentar a velocidade do meu plano','vicente'),
('C4: Promo','comercial','Tem alguma promoção disponível?','vicente'),
('C5: Consulta cobertura','comercial','Tem disponibilidade na minha região?','vicente'),
('C6: Downgrade','comercial','Quero reduzir meu plano','vicente')
ON CONFLICT DO NOTHING;

-- 2) RELATÓRIOS DE EXECUÇÃO (HEADERS POR RODADA)
CREATE TABLE IF NOT EXISTS public.qa_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  run_finished_at TIMESTAMPTZ,
  total_tests INTEGER,
  total_pass INTEGER,
  total_fail INTEGER,
  regression_pass INTEGER,
  regression_fail INTEGER,
  exploratory_pass INTEGER,
  exploratory_fail INTEGER,
  avg_latency_ms INTEGER,
  avg_score NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qa_reports_time ON public.qa_reports (run_started_at DESC);

-- 3) VIEWS PARA DASHBOARD

-- 3.1) Sumário por categoria (últimos 7 dias)
CREATE OR REPLACE VIEW public.qa_summary AS
SELECT
  category,
  ROUND(AVG(routing_score),2) AS routing_avg,
  ROUND(AVG(clarity_score),2) AS clarity_avg,
  ROUND(AVG(context_score),2) AS context_avg,
  ROUND(AVG(tone_score),2) AS tone_avg,
  ROUND(AVG(timing_score),2) AS timing_avg,
  ROUND(AVG((routing_score+clarity_score+context_score+tone_score+timing_score)/5),2) AS score_medio,
  ROUND(SUM(CASE WHEN pass THEN 1 ELSE 0 END)*100.0/COUNT(*),2) AS taxa_sucesso_pct,
  COUNT(*) AS total_testes
FROM public.llm_test_results
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY category;

-- 3.2) Últimas reprovações com justificativa
CREATE OR REPLACE VIEW public.qa_last_failures AS
SELECT
  id,
  scenario,
  category,
  expected_agent,
  detected_agent,
  routing_score,
  clarity_score,
  context_score,
  tone_score,
  timing_score,
  (evaluation::jsonb) ->> 'justification' AS justificativa,
  created_at
FROM public.llm_test_results
WHERE pass = false
ORDER BY created_at DESC
LIMIT 50;

-- 3.3) Baseline atual (status dos casos de regressão)
CREATE OR REPLACE VIEW public.qa_baseline_status AS
SELECT
  scenario_name,
  category,
  expected_agent,
  last_passed,
  last_routing_score,
  last_run_at,
  CASE 
    WHEN last_run_at IS NULL THEN 'nunca_executado'
    WHEN last_passed = true THEN 'passou'
    WHEN last_passed = false THEN 'falhou'
    ELSE 'desconhecido'
  END AS status
FROM public.qa_regression_cases
ORDER BY category, scenario_name;

-- 4) RPC HELPERS PARA UI

-- 4.1) Função para obter baseline cases
CREATE OR REPLACE FUNCTION public.get_qa_baseline_cases()
RETURNS TABLE (
  id UUID,
  scenario_name TEXT,
  category TEXT,
  expected_agent TEXT,
  last_passed BOOLEAN,
  last_routing_score NUMERIC,
  last_run_at TIMESTAMPTZ
) 
LANGUAGE SQL
STABLE
AS $$
  SELECT 
    id,
    scenario_name,
    category,
    expected_agent,
    last_passed,
    last_routing_score,
    last_run_at
  FROM public.qa_regression_cases
  ORDER BY category ASC, scenario_name ASC;
$$;

-- 4.2) Função para obter último relatório
CREATE OR REPLACE FUNCTION public.get_last_qa_report()
RETURNS TABLE (
  id UUID,
  run_started_at TIMESTAMPTZ,
  total_tests INTEGER,
  total_pass INTEGER,
  total_fail INTEGER,
  regression_pass INTEGER,
  regression_fail INTEGER,
  avg_latency_ms INTEGER,
  avg_score NUMERIC
)
LANGUAGE SQL
STABLE
AS $$
  SELECT 
    id,
    run_started_at,
    total_tests,
    total_pass,
    total_fail,
    regression_pass,
    regression_fail,
    avg_latency_ms,
    avg_score
  FROM public.qa_reports
  ORDER BY run_started_at DESC
  LIMIT 1;
$$;

-- 4.3) Função para obter últimas falhas
CREATE OR REPLACE FUNCTION public.get_last_qa_failures()
RETURNS TABLE (
  scenario TEXT,
  category TEXT,
  expected_agent TEXT,
  detected_agent TEXT,
  justificativa TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE SQL
STABLE
AS $$
  SELECT 
    scenario,
    category,
    expected_agent,
    detected_agent,
    (evaluation::jsonb) ->> 'justification' AS justificativa,
    created_at
  FROM public.llm_test_results
  WHERE pass = false
  ORDER BY created_at DESC
  LIMIT 5;
$$;

-- 5) RLS POLICIES

ALTER TABLE public.qa_regression_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_reports ENABLE ROW LEVEL SECURITY;

-- Admins podem gerenciar tudo
CREATE POLICY "Admins manage qa_regression_cases" ON public.qa_regression_cases
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins manage qa_reports" ON public.qa_reports
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

-- Editors podem ver
CREATE POLICY "Editors view qa_regression_cases" ON public.qa_regression_cases
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('admin', 'editor')
    )
  );

CREATE POLICY "Editors view qa_reports" ON public.qa_reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('admin', 'editor')
    )
  );

-- Service role tem acesso total
CREATE POLICY "Service role full access qa_regression_cases" ON public.qa_regression_cases
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access qa_reports" ON public.qa_reports
  FOR ALL USING (true) WITH CHECK (true);

-- 6) GRANTS PARA RPCS
GRANT EXECUTE ON FUNCTION public.get_qa_baseline_cases() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_last_qa_report() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_last_qa_failures() TO authenticated;

-- ==========================================================
-- FIM DA MIGRATION PR#53
-- ==========================================================

-- VERIFICAÇÃO FINAL
SELECT 'PR#53 Migration Complete!' AS status,
       (SELECT COUNT(*) FROM public.qa_regression_cases) AS baseline_cases_count,
       (SELECT COUNT(*) FROM public.qa_reports) AS reports_count;
