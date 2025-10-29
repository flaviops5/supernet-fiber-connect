-- =========================================
-- PR #22 - Lista de clientes afetados por região (CORRIGIDO)
-- =========================================

CREATE OR REPLACE FUNCTION get_customers_by_region_last_outage()
RETURNS TABLE (
  cidade TEXT,
  bairro TEXT,
  nome TEXT,
  cpf TEXT,
  ixc_client_id TEXT,
  last_event TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Security: Only admin and gestor roles can execute
  IF NOT (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gestor')
  ) THEN
    RAISE EXCEPTION 'Access denied: requires admin or gestor role';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE((detalhes->>'cidade')::TEXT, 'Desconhecido') AS cidade,
    (detalhes->>'bairro')::TEXT AS bairro,
    (detalhes->>'nome')::TEXT AS nome,
    (detalhes->>'cpf')::TEXT AS cpf,
    (detalhes->>'ixc_client_id')::TEXT AS ixc_client_id,
    MAX(created_at) AS last_event
  FROM registros_de_monitoramento
  WHERE fluxo = 'support-tech'
    AND acao IN ('scenario_d_detected', 'scenario_a_detected')
    AND created_at >= now() - interval '6 hours'
  GROUP BY 1, 2, 3, 4, 5
  ORDER BY last_event DESC
  LIMIT 100;
END;
$$;

GRANT EXECUTE ON FUNCTION get_customers_by_region_last_outage() TO authenticated;