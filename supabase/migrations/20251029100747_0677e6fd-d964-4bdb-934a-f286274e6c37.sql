-- PR #21 — Buscar clientes afetados por região (até 200)

CREATE OR REPLACE FUNCTION public.get_impacted_customers_by_region(
  region_cidade TEXT,
  region_bairro TEXT DEFAULT NULL
)
RETURNS TABLE (
  customer_phone TEXT,
  customer_name TEXT,
  last_event TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Apenas admin e gestor podem executar
  IF NOT (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'gestor')
  ) THEN
    RAISE EXCEPTION 'Access denied: requires admin or gestor role';
  END IF;

  RETURN QUERY
  SELECT DISTINCT ON ((r.detalhes->>'cliente_telefone'))
    (r.detalhes->>'cliente_telefone')::TEXT AS customer_phone,
    COALESCE((r.detalhes->>'cliente_nome')::TEXT, 'Cliente') AS customer_name,
    MAX(r.created_at) AS last_event
  FROM registros_de_monitoramento r
  WHERE
    fluxo = 'support-tech'
    AND r.created_at >= now() - interval '7 days'
    AND (r.detalhes->>'cidade') = region_cidade
    AND (region_bairro IS NULL OR (r.detalhes->>'bairro') = region_bairro)
    AND (r.detalhes->>'cliente_telefone') IS NOT NULL
    AND LENGTH(TRIM(r.detalhes->>'cliente_telefone')) >= 10
  GROUP BY (r.detalhes->>'cliente_telefone'), (r.detalhes->>'cliente_nome')
  ORDER BY (r.detalhes->>'cliente_telefone'), last_event DESC
  LIMIT 200;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_impacted_customers_by_region TO authenticated;

COMMENT ON FUNCTION public.get_impacted_customers_by_region IS 'PR#21: Retorna clientes afetados em uma região nos últimos 7 dias para notificação proativa';