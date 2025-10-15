-- Enable realtime for conversation messages so the UI receives new messages instantly
ALTER TABLE public.conversation_messages REPLICA IDENTITY FULL;

-- Also enable for conversations updates if needed by other parts of the UI
ALTER TABLE public.conversations REPLICA IDENTITY FULL;

-- Add tables to supabase_realtime publication (idempotent in case already added)
DO $$
BEGIN
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_messages';
  EXCEPTION WHEN duplicate_object THEN
    -- already added
    NULL;
  END;
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations';
  EXCEPTION WHEN duplicate_object THEN
    -- already added
    NULL;
  END;
END $$;