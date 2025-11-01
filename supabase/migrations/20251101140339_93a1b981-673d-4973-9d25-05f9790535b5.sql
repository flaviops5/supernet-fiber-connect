-- PR#43.3 – Tabela segura de agendamentos (RLS) + Storage Bucket

-- Criar tabela de eventos de instalação
CREATE TABLE IF NOT EXISTS public.installation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES public.kanban_cards(id) ON DELETE CASCADE,
  board_id uuid NOT NULL REFERENCES public.kanban_boards(id) ON DELETE CASCADE,
  data_instalacao date NOT NULL,
  periodo text NOT NULL CHECK (periodo IN ('manhã','tarde','noite')),
  status text NOT NULL DEFAULT 'agendado' CHECK (status IN ('agendado','em_execucao','finalizado','reagendado')),
  fotos jsonb NOT NULL DEFAULT '[]',
  change_reason text,
  previous_event_id uuid REFERENCES public.installation_events(id),
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_install_events_board_date ON public.installation_events (board_id, data_instalacao);
CREATE INDEX IF NOT EXISTS idx_install_events_card ON public.installation_events (card_id);

-- Habilitar RLS
ALTER TABLE public.installation_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies: membros do board podem ver agendamentos
CREATE POLICY "Membros veem agendamentos do seu board"
ON public.installation_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.kanban_board_members
    WHERE board_id = installation_events.board_id
    AND user_id = auth.uid()
  )
);

-- RLS Policies: membros do board podem inserir
CREATE POLICY "Membros inserem agendamentos do seu board"
ON public.installation_events
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.kanban_board_members
    WHERE board_id = installation_events.board_id
    AND user_id = auth.uid()
  )
);

-- RLS Policies: membros do board podem atualizar
CREATE POLICY "Membros atualizam agendamentos do seu board"
ON public.installation_events
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.kanban_board_members
    WHERE board_id = installation_events.board_id
    AND user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.kanban_board_members
    WHERE board_id = installation_events.board_id
    AND user_id = auth.uid()
  )
);

-- RLS Policies: membros do board podem deletar
CREATE POLICY "Membros removem agendamentos do seu board"
ON public.installation_events
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.kanban_board_members
    WHERE board_id = installation_events.board_id
    AND user_id = auth.uid()
  )
);

-- RPC para buscar eventos por board e intervalo de datas
CREATE OR REPLACE FUNCTION public.get_installation_events(
  p_board uuid,
  p_start date,
  p_end date
)
RETURNS TABLE (
  id uuid,
  card_id uuid,
  title text,
  municipio text,
  data_instalacao date,
  periodo text,
  status text,
  change_reason text
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    e.id,
    c.id AS card_id,
    c.title,
    (c.description::jsonb->>'municipio')::text AS municipio,
    e.data_instalacao,
    e.periodo,
    e.status,
    e.change_reason
  FROM public.installation_events e
  JOIN public.kanban_cards c ON c.id = e.card_id
  WHERE e.board_id = p_board
    AND e.data_instalacao BETWEEN p_start AND p_end
    AND e.status <> 'reagendado'
  ORDER BY e.data_instalacao ASC, e.periodo;
$$;

-- Criar bucket para fotos de instalação
INSERT INTO storage.buckets (id, name, public)
VALUES ('install_photos', 'install_photos', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: leitura pública das fotos
CREATE POLICY "read_public_install_photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'install_photos');

-- Policy: escrita apenas para usuários autenticados
CREATE POLICY "authenticated_write_install_photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'install_photos'
  AND auth.role() = 'authenticated'
);

-- Policy: atualização apenas para usuários autenticados
CREATE POLICY "authenticated_update_own_install_photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'install_photos' AND auth.role() = 'authenticated')
WITH CHECK (bucket_id = 'install_photos' AND auth.role() = 'authenticated');