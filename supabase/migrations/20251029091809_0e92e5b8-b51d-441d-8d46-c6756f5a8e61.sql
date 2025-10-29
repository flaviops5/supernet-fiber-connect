-- PR #20 - Função dedicada para Top 5 regiões críticas (sem granularidade diária)
-- Retorna exatamente as 5 regiões mais críticas dos últimos 7 dias

CREATE OR REPLACE FUNCTION public.get_top5_critical_regions()
RETURNS TABLE(
  cidade TEXT,
  bairro TEXT,
  tickets_count BIGINT,
  rx_critico_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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
    COALESCE((r.detalhes->>'cidade')::TEXT, 'Desconhecido') AS cidade,
    (r.detalhes->>'bairro')::TEXT AS bairro,
    SUM(CASE WHEN r.acao ILIKE '%ticket%' THEN 1 ELSE 0 END)::BIGINT AS tickets_count,
    SUM(CASE WHEN r.acao = 'scenario_d_detected' THEN 1 ELSE 0 END)::BIGINT AS rx_critico_count
  FROM registros_de_monitoramento r
  WHERE r.fluxo = 'support-tech'
    AND r.created_at >= now() - interval '7 days'
    AND r.detalhes->>'cidade' IS NOT NULL
  GROUP BY 1, 2
  ORDER BY 4 DESC, 3 DESC
  LIMIT 5;
END;
$$;

-- Grant de execução para usuários autenticados
GRANT EXECUTE ON FUNCTION public.get_top5_critical_regions() TO authenticated;

COMMENT ON FUNCTION public.get_top5_critical_regions() IS 
'Retorna as 5 regiões mais críticas dos últimos 7 dias, agregando toda a janela de tempo. Ordenado por rx_critico_count DESC, depois tickets_count DESC.';