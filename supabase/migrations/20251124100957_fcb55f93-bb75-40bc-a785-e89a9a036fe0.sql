-- Trigger types regeneration
-- This migration ensures the TypeScript types are regenerated to match the current database schema

-- Add a simple comment to trigger schema sync
COMMENT ON SCHEMA public IS 'Schema updated to trigger types regeneration';

-- Verify key tables exist (this is informational, doesn't modify anything)
DO $$ 
BEGIN
  -- Just a check that doesn't modify anything but ensures the migration runs
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'conversations') THEN
    RAISE NOTICE 'Database schema is present and ready for types generation';
  END IF;
END $$;