-- Criar tabela para histórico de atividades do usuário
CREATE TABLE public.user_activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL,
  activity_description TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own activity logs"
ON public.user_activity_logs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert activity logs"
ON public.user_activity_logs
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view all activity logs"
ON public.user_activity_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::user_role));

-- Criar função para log de atividades
CREATE OR REPLACE FUNCTION public.log_user_activity(
  activity_type TEXT,
  activity_description TEXT,
  user_id_param UUID DEFAULT NULL,
  metadata_param JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_id UUID;
  current_user_id UUID;
BEGIN
  -- Usar o user_id fornecido ou o usuário atual
  current_user_id := COALESCE(user_id_param, auth.uid());
  
  INSERT INTO public.user_activity_logs (
    user_id,
    activity_type,
    activity_description,
    metadata
  ) VALUES (
    current_user_id,
    activity_type,
    activity_description,
    metadata_param
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;