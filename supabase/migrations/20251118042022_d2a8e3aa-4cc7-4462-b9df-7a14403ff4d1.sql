-- Ensure RLS is enabled on mass_outage_events and allow admins/editors to read
DO $$
BEGIN
  -- Enable RLS (idempotent)
  ALTER TABLE public.mass_outage_events ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN
  NULL; -- table may already have RLS enabled
END $$;

-- Create or replace a SELECT policy for admin/editor roles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'mass_outage_events' 
      AND policyname = 'Admin/Editor can view mass_outage_events'
  ) THEN
    CREATE POLICY "Admin/Editor can view mass_outage_events"
    ON public.mass_outage_events
    FOR SELECT
    USING (has_role(auth.uid(), 'admin'::text) OR has_role(auth.uid(), 'editor'::text));
  END IF;
END $$;