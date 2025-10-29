-- PR #20 - Otimização da função de regiões críticas
-- Adiciona LIMIT 5 diretamente na query SQL para melhor performance

CREATE OR REPLACE FUNCTION public.calc_support_kpis_by_region_last_7_days()
RETURNS TABLE(
  ts text,
  cidade text,
  bairro text,
  total_count bigint,
  tickets_count bigint,
  rx_critico_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  ORDER BY 6 DESC, 5 DESC, 1 ASC
  LIMIT 5;
END;
$function$;