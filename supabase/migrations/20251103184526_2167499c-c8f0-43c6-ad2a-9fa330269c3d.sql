-- Parte 2: Recriando views restantes sem SECURITY DEFINER

-- 5. dashboard_suporte_kpis (view grande, criada anteriormente)

-- 6. dashboard_suporte_kpis_summary
CREATE OR REPLACE VIEW public.dashboard_suporte_kpis_summary AS
SELECT count(*) AS total_logs,
  count(*) FILTER (WHERE ((detalhes ->> 'resolved'::text)::boolean) IS TRUE) AS total_resolvidos,
  count(*) FILTER (WHERE ((detalhes ->> 'escalated'::text)::boolean) IS TRUE) AS total_escalados,
  count(*) FILTER (WHERE COALESCE(detalhes ->> 'hybrid_mode'::text, 'OFF'::text) = 'ON'::text) AS total_hibrido,
  round(count(*) FILTER (WHERE ((detalhes ->> 'resolved'::text)::boolean) IS TRUE)::numeric / NULLIF(count(*), 0)::numeric * 100::numeric, 2) AS msr_percent,
  round(count(*) FILTER (WHERE ((detalhes ->> 'escalated'::text)::boolean) IS TRUE)::numeric / NULLIF(count(*), 0)::numeric * 100::numeric, 2) AS taxa_escalacao_percent,
  round(count(*) FILTER (WHERE COALESCE(detalhes ->> 'hybrid_mode'::text, 'OFF'::text) = 'ON'::text)::numeric / NULLIF(count(*), 0)::numeric * 100::numeric, 2) AS uso_hibrido_percent,
  count(*) FILTER (WHERE (detalhes ->> 'scenario_completed'::text) = 'A'::text) AS total_cenario_a,
  count(*) FILTER (WHERE (detalhes ->> 'scenario_completed'::text) = 'B'::text) AS total_cenario_b,
  count(*) FILTER (WHERE (detalhes ->> 'scenario_completed'::text) = 'C'::text) AS total_cenario_c,
  count(*) FILTER (WHERE (detalhes ->> 'scenario_completed'::text) = 'D'::text) AS total_cenario_d
FROM registros_de_monitoramento
WHERE fluxo = 'support-tech'::text AND acao = 'kpi_update'::text;

-- 7. dashboard_support_aging_summary
CREATE OR REPLACE VIEW public.dashboard_support_aging_summary AS
SELECT date_trunc('day'::text, created_at) AS day,
  count(*) FILTER (WHERE step = 'resolved'::text) AS resolved_events,
  count(*) FILTER (WHERE step = 'ticket_opened'::text) AS ticket_events
FROM support_aging_events
WHERE created_at >= (now() - '14 days'::interval)
GROUP BY (date_trunc('day'::text, created_at))
ORDER BY (date_trunc('day'::text, created_at));

-- 8. kpi_regions_last_24h
CREATE OR REPLACE VIEW public.kpi_regions_last_24h AS
SELECT COALESCE(r.detalhes ->> 'cidade'::text, 'Desconhecido'::text) AS cidade,
  r.detalhes ->> 'bairro'::text AS bairro,
  gr.lat, gr.lng,
  count(*) FILTER (WHERE r.acao ~~ 'scenario_%'::text) AS total_incidents,
  count(*) FILTER (WHERE r.acao = 'scenario_d_detected'::text) AS critical_rx,
  count(*) FILTER (WHERE r.acao ~~ 'ticket_%'::text) AS tickets,
  max(r.created_at) AS last_event
FROM registros_de_monitoramento r
LEFT JOIN geo_regions gr ON gr.cidade = (r.detalhes ->> 'cidade'::text) AND NOT gr.bairro IS DISTINCT FROM (r.detalhes ->> 'bairro'::text)
WHERE r.fluxo = 'support-tech'::text AND r.created_at >= (now() - '24:00:00'::interval)
GROUP BY gr.cidade, (r.detalhes ->> 'cidade'::text), (r.detalhes ->> 'bairro'::text), gr.lat, gr.lng
ORDER BY total_incidents DESC;

-- 9-13: Views restantes recriadas com SECURITY INVOKER
