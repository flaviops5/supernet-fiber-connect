-- PR #24 — Tutoriais Reais: Tabela de mídias oficiais com RLS e índices corretos

CREATE TABLE IF NOT EXISTS official_media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('video','audio','image')),
  code text NOT NULL,
  storage_path text NOT NULL,
  duration_seconds int,
  locale text DEFAULT 'pt-BR',
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índice para queries por code (query mais frequente)
CREATE UNIQUE INDEX IF NOT EXISTS idx_official_media_code ON official_media_assets(code);

-- Índice para filtros por tipo
CREATE INDEX IF NOT EXISTS idx_official_media_kind ON official_media_assets(kind);

-- RLS
ALTER TABLE official_media_assets ENABLE ROW LEVEL SECURITY;

-- Authenticated users podem ler (agentes e sistema)
CREATE POLICY "authenticated_read_official_media"
  ON official_media_assets FOR SELECT
  TO authenticated
  USING (true);

-- Apenas admins podem gerenciar
CREATE POLICY "admin_manage_official_media"
  ON official_media_assets FOR ALL
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

-- Seed inicial com placeholders
INSERT INTO official_media_assets (kind, code, storage_path, duration_seconds, description)
VALUES
('video','video_onu_power','campaign-media/media/video_onu_power.mp4',40,'Conferir energia e LED LOS na caixinha da internet'),
('video','video_fiber_connector','campaign-media/media/video_fiber_connector.mp4',55,'Reconectar conector verde da fibra com segurança'),
('audio','audio_reboot_router','campaign-media/media/audio_reboot_router.mp3',18,'Instrução rápida: reiniciar o roteador corretamente')
ON CONFLICT (code) DO NOTHING;