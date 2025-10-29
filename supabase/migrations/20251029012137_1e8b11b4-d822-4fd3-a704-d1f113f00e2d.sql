-- Add media_context column to conversation_messages
ALTER TABLE conversation_messages 
ADD COLUMN media_context text;

-- Add index for better query performance
CREATE INDEX idx_conversation_messages_media_context 
ON conversation_messages(media_context) 
WHERE media_context IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN conversation_messages.media_context IS 'Context for media-guided messages (e.g., los_detected, reconnect_fiber, onu_visual)';