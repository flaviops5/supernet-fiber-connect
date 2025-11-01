-- Add new columns to kanban_cards table for complete school information
ALTER TABLE public.kanban_cards 
ADD COLUMN IF NOT EXISTS municipio TEXT,
ADD COLUMN IF NOT EXISTS periodo TEXT,
ADD COLUMN IF NOT EXISTS provedor_local TEXT,
ADD COLUMN IF NOT EXISTS telefone TEXT,
ADD COLUMN IF NOT EXISTS data_instalacao DATE,
ADD COLUMN IF NOT EXISTS localizacao_url TEXT,
ADD COLUMN IF NOT EXISTS links_texto TEXT;

-- Add comments to document the columns
COMMENT ON COLUMN public.kanban_cards.municipio IS 'Municipality name';
COMMENT ON COLUMN public.kanban_cards.periodo IS 'Installation period (morning/afternoon/evening)';
COMMENT ON COLUMN public.kanban_cards.provedor_local IS 'Local provider name';
COMMENT ON COLUMN public.kanban_cards.telefone IS 'Contact phone number';
COMMENT ON COLUMN public.kanban_cards.data_instalacao IS 'Installation date';
COMMENT ON COLUMN public.kanban_cards.localizacao_url IS 'Google Maps location URL';
COMMENT ON COLUMN public.kanban_cards.links_texto IS 'Links description text';