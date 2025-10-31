-- Add admin INSERT policy for kanban_boards to allow creating boards for any user
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'kanban_boards' 
      AND policyname = 'Admins podem criar boards'
  ) THEN
    CREATE POLICY "Admins podem criar boards"
    ON public.kanban_boards
    FOR INSERT
    TO authenticated
    WITH CHECK (has_role(auth.uid(), 'admin'::user_role));
  END IF;
END $$;