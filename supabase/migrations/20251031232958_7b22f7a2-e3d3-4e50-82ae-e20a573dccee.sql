-- Add additional fields to kanban_cards for school data
ALTER TABLE kanban_cards 
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 8),
ADD COLUMN IF NOT EXISTS longitude NUMERIC(11, 8),
ADD COLUMN IF NOT EXISTS link_info TEXT,
ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;

-- Add comments
COMMENT ON COLUMN kanban_cards.address IS 'Physical address for the card (e.g., school address)';
COMMENT ON COLUMN kanban_cards.latitude IS 'Latitude coordinate';
COMMENT ON COLUMN kanban_cards.longitude IS 'Longitude coordinate';
COMMENT ON COLUMN kanban_cards.link_info IS 'Link/connection information (e.g., activation type)';
COMMENT ON COLUMN kanban_cards.custom_fields IS 'Additional custom fields in JSON format';