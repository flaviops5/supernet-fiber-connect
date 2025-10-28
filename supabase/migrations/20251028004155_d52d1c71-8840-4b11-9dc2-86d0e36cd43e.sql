-- >>> PR9 v3: KPI Dashboard - Add gestor role and KPI function

-- 1. Add 'gestor' to user_role enum if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'gestor' 
    AND enumtypid = 'user_role'::regtype
  ) THEN
    ALTER TYPE user_role ADD VALUE 'gestor';
  END IF;
END $$;

-- 2. Create function to calculate support KPIs for last 7 days
CREATE OR REPLACE FUNCTION calc_support_kpis_last_7_days()
RETURNS TABLE (
  ts timestamptz,
  total_count bigint,
  resolved_remote_count bigint,
  tickets_count bigint
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
    date_trunc('day', created_at) AS ts,
    COUNT(*) AS total_count,
    COUNT(*) FILTER (
      WHERE COALESCE((detalhes->>'resolved_remote')::boolean, false) = true
    ) AS resolved_remote_count,
    COUNT(*) FILTER (
      WHERE acao ILIKE '%ticket%'
    ) AS tickets_count
  FROM registros_de_monitoramento
  WHERE fluxo = 'support-tech'
    AND created_at >= now() - interval '7 days'
  GROUP BY date_trunc('day', created_at)
  ORDER BY ts ASC;
END;
$$;

-- 3. Grant execute permission
GRANT EXECUTE ON FUNCTION calc_support_kpis_last_7_days() TO authenticated;

COMMENT ON FUNCTION calc_support_kpis_last_7_days IS 
  'Calculates daily KPIs for support-tech flow (last 7 days). Restricted to admin/gestor roles.';

-- <<< PR9 v3