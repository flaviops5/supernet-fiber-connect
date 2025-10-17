-- Adicionar campo para mídia opcional em cada passo do fluxo técnico
ALTER TABLE public.tech_flow_steps
ADD COLUMN media_id UUID REFERENCES public.media_repository(id) ON DELETE SET NULL;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_tech_flow_steps_media_id ON public.tech_flow_steps(media_id);

-- Comentário explicativo
COMMENT ON COLUMN public.tech_flow_steps.media_id IS 'Referência opcional para mídia (imagem, vídeo, GIF) da biblioteca que será exibida junto com este passo';