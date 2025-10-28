-- PR10A - KPI por Região
-- Adiciona função SQL para análise de suporte técnico por cidade/bairro

CREATE OR REPLACE FUNCTION calc_support_kpis_by_region_last_7_days()
RETURNS TABLE (
  ts TEXT,
  cidade TEXT,
  bairro TEXT,
  total_count BIGINT,
  tickets_count BIGINT,
  rx_critico_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validação de segurança: apenas admin e gestor podem executar
  IF NOT (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gestor')
  ) THEN
    RAISE EXCEPTION 'Access denied: requires admin or gestor role';
  END IF;

  RETURN QUERY
  SELECT
    to_char(date_trunc('day', r.created_at), 'YYYY-MM-DD') AS ts,
    COALESCE((r.detalhes->>'cidade')::TEXT, 'Desconhecido') AS cidade,
    (r.detalhes->>'bairro')::TEXT AS bairro,
    COUNT(*)::BIGINT AS total_count,
    SUM(CASE WHEN r.acao ILIKE '%ticket%' THEN 1 ELSE 0 END)::BIGINT AS tickets_count,
    SUM(CASE WHEN r.acao = 'scenario_d_detected' THEN 1 ELSE 0 END)::BIGINT AS rx_critico_count
  FROM registros_de_monitoramento r
  WHERE r.fluxo = 'support-tech'
    AND r.created_at >= now() - interval '7 days'
    AND r.detalhes->>'cidade' IS NOT NULL
  GROUP BY 1, 2, 3
  ORDER BY 1 ASC, 4 DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION calc_support_kpis_by_region_last_7_days() TO authenticated;

COMMENT ON FUNCTION calc_support_kpis_by_region_last_7_days() IS 
'Retorna KPIs de suporte técnico agrupados por cidade/bairro nos últimos 7 dias. Requer role admin ou gestor.';