-- ============================================
-- SCRIPT DE VALIDAÇÃO: SECURITY DEFINER Functions
-- ============================================
-- Detecta funções SECURITY DEFINER sem SET search_path
-- Previne ataques de schema hijacking (OWASP A01:2021)
--
-- USO:
-- psql -d postgres -f scripts/validate-security-definer.sql
-- OU via Supabase SQL Editor

DO $$
DECLARE
  v_vulnerable_count INTEGER := 0;
  v_total_count INTEGER := 0;
  v_protected_count INTEGER := 0;
  v_function RECORD;
  v_has_vulnerabilities BOOLEAN := false;
BEGIN
  RAISE NOTICE '🔍 ============================================';
  RAISE NOTICE '🔍 VALIDAÇÃO: SECURITY DEFINER Functions';
  RAISE NOTICE '🔍 ============================================';
  RAISE NOTICE '';

  -- Contar funções protegidas
  SELECT COUNT(*)
  INTO v_protected_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE p.prosecdef = true
    AND n.nspname = 'public'
    AND pg_get_functiondef(p.oid) ILIKE '%SET search_path%'
    AND p.proname NOT LIKE 'vector%'
    AND p.proname NOT LIKE '%handler%'
    AND p.proname NOT LIKE 'ivf%'
    AND p.proname NOT LIKE 'hnsw%'
    AND p.proname NOT LIKE 'halfvec%'
    AND p.proname NOT LIKE 'sparsevec%';

  -- Contar total de funções
  SELECT COUNT(*)
  INTO v_total_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE p.prosecdef = true
    AND n.nspname = 'public'
    AND p.proname NOT LIKE 'vector%'
    AND p.proname NOT LIKE '%handler%'
    AND p.proname NOT LIKE 'ivf%'
    AND p.proname NOT LIKE 'hnsw%'
    AND p.proname NOT LIKE 'halfvec%'
    AND p.proname NOT LIKE 'sparsevec%';

  -- Listar funções vulneráveis
  RAISE NOTICE '📊 RESUMO:';
  RAISE NOTICE '   Total de funções SECURITY DEFINER: %', v_total_count;
  RAISE NOTICE '   Funções protegidas: %', v_protected_count;
  RAISE NOTICE '';

  FOR v_function IN
    SELECT 
      p.proname as function_name,
      pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.prosecdef = true
      AND n.nspname = 'public'
      AND pg_get_functiondef(p.oid) NOT ILIKE '%SET search_path%'
      AND p.proname NOT LIKE 'vector%'
      AND p.proname NOT LIKE '%handler%'
      AND p.proname NOT LIKE 'ivf%'
      AND p.proname NOT LIKE 'hnsw%'
      AND p.proname NOT LIKE 'halfvec%'
      AND p.proname NOT LIKE 'sparsevec%'
    ORDER BY p.proname
  LOOP
    IF v_vulnerable_count = 0 THEN
      RAISE NOTICE '🚨 FUNÇÕES VULNERÁVEIS ENCONTRADAS:';
      RAISE NOTICE '';
    END IF;
    
    v_vulnerable_count := v_vulnerable_count + 1;
    v_has_vulnerabilities := true;
    
    RAISE NOTICE '❌ Função %: %(%)', 
      v_vulnerable_count,
      v_function.function_name,
      v_function.args;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '============================================';

  IF v_has_vulnerabilities THEN
    RAISE NOTICE '🚨 VALIDAÇÃO FALHOU';
    RAISE NOTICE '';
    RAISE NOTICE '❌ % funções vulneráveis encontradas', v_vulnerable_count;
    RAISE NOTICE '';
    RAISE NOTICE '🔒 CORREÇÃO NECESSÁRIA:';
    RAISE NOTICE '   Adicione "SET search_path TO ''public''" em todas';
    RAISE NOTICE '   as funções SECURITY DEFINER listadas acima.';
    RAISE NOTICE '';
    RAISE NOTICE '📖 Exemplo:';
    RAISE NOTICE '   CREATE OR REPLACE FUNCTION public.my_function()';
    RAISE NOTICE '   RETURNS void';
    RAISE NOTICE '   LANGUAGE plpgsql';
    RAISE NOTICE '   SECURITY DEFINER';
    RAISE NOTICE '   SET search_path TO ''public''  -- ← ADICIONAR ESTA LINHA';
    RAISE NOTICE '   AS $$';
    RAISE NOTICE '   BEGIN';
    RAISE NOTICE '     -- função code';
    RAISE NOTICE '   END;';
    RAISE NOTICE '   $$;';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  RISCO: Schema hijacking attack (OWASP A01:2021)';
    RAISE NOTICE '   Ref: docs/ACT-003-SECURITY-DEFINER-AUDIT.md';
    RAISE NOTICE '';
    RAISE EXCEPTION 'Validation failed: % vulnerable functions found', v_vulnerable_count;
  ELSE
    RAISE NOTICE '✅ VALIDAÇÃO PASSOU';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Todas as % funções SECURITY DEFINER estão protegidas', v_total_count;
    RAISE NOTICE '✅ SET search_path configurado corretamente';
    RAISE NOTICE '';
  END IF;
  
  RAISE NOTICE '============================================';
END $$;
