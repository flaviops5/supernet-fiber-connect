-- Fix security warnings by setting search_path on functions (with CASCADE)

-- Drop and recreate update_updated_at_timestamp with search_path
DROP FUNCTION IF EXISTS update_updated_at_timestamp() CASCADE;

CREATE OR REPLACE FUNCTION update_updated_at_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Recreate triggers after function recreation
CREATE TRIGGER update_agent_presence_timestamp
  BEFORE UPDATE ON public.agent_presence
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_timestamp();

CREATE TRIGGER update_conversations_timestamp
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_timestamp();

CREATE TRIGGER update_quick_replies_timestamp
  BEFORE UPDATE ON public.quick_replies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_timestamp();

-- Drop and recreate update_conversation_last_message with search_path
DROP FUNCTION IF EXISTS update_conversation_last_message() CASCADE;

CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER update_conversation_last_message_trigger
  AFTER INSERT ON public.conversation_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();