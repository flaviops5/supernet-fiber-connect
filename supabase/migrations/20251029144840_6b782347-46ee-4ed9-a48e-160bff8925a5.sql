-- PR #25 — Mapa DF: Tabela de regiões com índices e view otimizada

-- 1) Tabela de regiões com coordenadas
CREATE TABLE IF NOT EXISTS geo_regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cidade text NOT NULL,
  bairro text,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Índice único composto para evitar duplicatas
CREATE UNIQUE INDEX IF NOT EXISTS idx_geo_regions_cidade_bairro ON geo_regions(cidade, bairro);

-- Índice espacial para queries geográficas futuras
CREATE INDEX IF NOT EXISTS idx_geo_regions_coords ON geo_regions(lat, lng);

-- 2) Índice crítico em registros_de_monitoramento para JOIN performático
CREATE INDEX IF NOT EXISTS idx_registros_cidade 
ON registros_de_monitoramento ((detalhes->>'cidade'));

CREATE INDEX IF NOT EXISTS idx_registros_bairro 
ON registros_de_monitoramento ((detalhes->>'bairro'));

-- 3) View agregada por região (últimas 24h) com tipos explícitos
CREATE OR REPLACE VIEW kpi_regions_last_24h AS
SELECT
  COALESCE(r.detalhes->>'cidade', 'Desconhecido') AS cidade,
  (r.detalhes->>'bairro') AS bairro,
  gr.lat,
  gr.lng,
  COUNT(*) FILTER (WHERE r.acao LIKE 'scenario_%')::bigint AS total_incidents,
  COUNT(*) FILTER (WHERE r.acao = 'scenario_d_detected')::bigint AS critical_rx,
  COUNT(*) FILTER (WHERE r.acao LIKE 'ticket_%')::bigint AS tickets,
  MAX(r.created_at) AS last_event
FROM registros_de_monitoramento r
LEFT JOIN geo_regions gr
  ON gr.cidade = (r.detalhes->>'cidade')
 AND (gr.bairro IS NOT DISTINCT FROM (r.detalhes->>'bairro'))
WHERE r.fluxo = 'support-tech'
  AND r.created_at >= now() - interval '24 hours'
GROUP BY gr.cidade, r.detalhes->>'cidade', r.detalhes->>'bairro', gr.lat, gr.lng
ORDER BY total_incidents DESC;

-- RLS para geo_regions
ALTER TABLE geo_regions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_geo_regions"
  ON geo_regions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "admin_manage_geo_regions"
  ON geo_regions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Seed inicial com principais regiões de Brasília
INSERT INTO geo_regions (cidade, bairro, lat, lng)
VALUES
('Brasília', 'Plano Piloto', -15.793889, -47.882778),
('Brasília', 'Águas Claras', -15.833056, -48.026389),
('Brasília', 'Taguatinga', -15.839444, -48.048889),
('Brasília', 'Ceilândia', -15.817778, -48.107222),
('Brasília', 'Samambaia', -15.881111, -48.094444),
('Brasília', 'Guará', -15.824167, -47.968889),
('Brasília', 'Sobradinho', -15.653611, -47.786944),
('Brasília', 'Planaltina', -15.452500, -47.614167),
('Brasília', 'Gama', -16.013889, -48.063056),
('Brasília', 'Santa Maria', -16.000278, -48.020833)
ON CONFLICT (cidade, bairro) DO NOTHING;