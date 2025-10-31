-- Add description column to kanban_boards table
ALTER TABLE kanban_boards 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add comment
COMMENT ON COLUMN kanban_boards.description IS 'Optional description for the kanban board';