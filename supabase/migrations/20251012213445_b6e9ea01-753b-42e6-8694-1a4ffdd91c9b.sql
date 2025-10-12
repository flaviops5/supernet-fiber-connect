-- Purge omnichannel queue: messages, transfers, feedback, then conversations
BEGIN;
  -- Reset agent loads (optional, keeps presence intact)
  UPDATE public.agent_presence
    SET current_conversations = 0,
        updated_at = now();

  -- Delete dependent data first
  DELETE FROM public.conversation_messages;
  DELETE FROM public.conversation_transfers;
  DELETE FROM public.conversation_feedback;

  -- Delete all conversations (queue)
  DELETE FROM public.conversations;

  -- Audit trail
  INSERT INTO public.action_log (action_type, agent_name, client_cpf, action_payload)
  VALUES ('purge_queue', 'system', NULL, jsonb_build_object('source', 'lovable_migration', 'timestamp', now()));
COMMIT;