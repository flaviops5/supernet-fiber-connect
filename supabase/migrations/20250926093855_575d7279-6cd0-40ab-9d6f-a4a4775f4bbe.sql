-- Create chatbot_settings table
CREATE TABLE public.chatbot_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chatbot_id TEXT NOT NULL DEFAULT 'mMFk_B5d94OhD7fQBxvNU',
  enabled BOOLEAN NOT NULL DEFAULT true,
  title TEXT NOT NULL DEFAULT 'Assistente Virtual SUPERNET',
  subtitle TEXT NOT NULL DEFAULT 'Contrate agora sua internet - resposta em segundos',
  cta_text TEXT NOT NULL DEFAULT 'Fale conosco',
  position TEXT NOT NULL DEFAULT 'bottom-center' CHECK (position IN ('bottom-center', 'bottom-right', 'bottom-left')),
  primary_color TEXT NOT NULL DEFAULT '#ef4444',
  secondary_color TEXT NOT NULL DEFAULT '#fb7185',
  session_timeout_minutes INTEGER NOT NULL DEFAULT 30,
  auto_open BOOLEAN NOT NULL DEFAULT false,
  auto_open_delay_seconds INTEGER NOT NULL DEFAULT 5,
  show_on_pages JSONB NOT NULL DEFAULT '["all"]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chatbot_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage chatbot settings" 
ON public.chatbot_settings 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Editors can manage chatbot settings" 
ON public.chatbot_settings 
FOR ALL 
USING (has_role(auth.uid(), 'editor'::user_role));

CREATE POLICY "Chatbot settings are publicly readable" 
ON public.chatbot_settings 
FOR SELECT 
USING (enabled = true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_chatbot_settings_updated_at
BEFORE UPDATE ON public.chatbot_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings
INSERT INTO public.chatbot_settings (
  chatbot_id,
  enabled,
  title,
  subtitle,
  cta_text,
  position,
  primary_color,
  secondary_color
) VALUES (
  'mMFk_B5d94OhD7fQBxvNU',
  true,
  'Assistente Virtual SUPERNET',
  'Contrate agora sua internet - resposta em segundos',
  'Fale conosco',
  'bottom-center',
  '#ef4444',
  '#fb7185'
);