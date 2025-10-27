-- PR #6 - Database Migration for Media Guided UX
-- Creates table to track media usage and user feedback

-- Create media_usage_logs table
CREATE TABLE IF NOT EXISTS public.media_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video', 'audio')),
  media_context TEXT NOT NULL CHECK (media_context IN ('los_detected', 'fiber_reconnect', 'onu_visual', 'cpf_request')),
  media_url TEXT NOT NULL,
  displayed_successfully BOOLEAN NOT NULL DEFAULT false,
  user_feedback TEXT CHECK (user_feedback IN ('helped', 'not_helped')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  feedback_at TIMESTAMPTZ,
  
  -- Indexes for common queries
  INDEX idx_media_logs_conversation (conversation_id),
  INDEX idx_media_logs_agent (agent_name),
  INDEX idx_media_logs_context (media_context),
  INDEX idx_media_logs_created (created_at DESC)
);

-- Enable RLS
ALTER TABLE public.media_usage_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admins can view all logs
CREATE POLICY "Admins can view all media logs"
  ON public.media_usage_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );

-- System can insert logs
CREATE POLICY "System can insert media logs"
  ON public.media_usage_logs
  FOR INSERT
  WITH CHECK (true);

-- System can update feedback
CREATE POLICY "System can update media feedback"
  ON public.media_usage_logs
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Create view for media effectiveness metrics
CREATE OR REPLACE VIEW public.media_effectiveness_metrics AS
SELECT
  media_context,
  agent_name,
  COUNT(*) as total_uses,
  SUM(CASE WHEN displayed_successfully THEN 1 ELSE 0 END) as successful_displays,
  SUM(CASE WHEN user_feedback = 'helped' THEN 1 ELSE 0 END) as helped_count,
  SUM(CASE WHEN user_feedback = 'not_helped' THEN 1 ELSE 0 END) as not_helped_count,
  ROUND(
    100.0 * SUM(CASE WHEN user_feedback = 'helped' THEN 1 ELSE 0 END) / 
    NULLIF(SUM(CASE WHEN user_feedback IS NOT NULL THEN 1 ELSE 0 END), 0),
    2
  ) as help_rate_percentage,
  DATE_TRUNC('day', created_at) as date
FROM public.media_usage_logs
GROUP BY media_context, agent_name, DATE_TRUNC('day', created_at)
ORDER BY date DESC;

-- Grant permissions on view
GRANT SELECT ON public.media_effectiveness_metrics TO authenticated;

-- Comment on table
COMMENT ON TABLE public.media_usage_logs IS 'PR #6 - Tracks usage of guided media (images, videos, audio) in support conversations and user feedback on effectiveness';

-- Comment on columns
COMMENT ON COLUMN public.media_usage_logs.conversation_id IS 'ID of the conversation where media was used';
COMMENT ON COLUMN public.media_usage_logs.agent_name IS 'Name of the agent using the media (Cloé, Luan, etc)';
COMMENT ON COLUMN public.media_usage_logs.media_type IS 'Type of media: image, video, or audio';
COMMENT ON COLUMN public.media_usage_logs.media_context IS 'Context of media usage: los_detected, fiber_reconnect, onu_visual, cpf_request';
COMMENT ON COLUMN public.media_usage_logs.media_url IS 'URL of the media asset';
COMMENT ON COLUMN public.media_usage_logs.displayed_successfully IS 'Whether the media was displayed successfully (true) or fallback was used (false)';
COMMENT ON COLUMN public.media_usage_logs.user_feedback IS 'User feedback: helped or not_helped';
COMMENT ON COLUMN public.media_usage_logs.feedback_at IS 'Timestamp when user provided feedback';
