-- Create system_settings table for application configuration
CREATE TABLE public.system_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Company Information
  company_name TEXT NOT NULL DEFAULT 'SUPERNET FIBRA',
  company_email TEXT NOT NULL DEFAULT 'contato@supernetfibra.com.br',
  company_phone TEXT NOT NULL DEFAULT '(11) 99999-9999',
  company_whatsapp TEXT NOT NULL DEFAULT '5511999999999',
  company_address TEXT NOT NULL DEFAULT 'Rua Exemplo, 123 - São Paulo, SP',
  company_cnpj TEXT NOT NULL DEFAULT '00.000.000/0001-00',
  
  -- SEO Settings
  site_title TEXT NOT NULL DEFAULT 'SUPERNET FIBRA - Internet de Alta Velocidade',
  site_description TEXT NOT NULL DEFAULT 'Internet fibra óptica de alta velocidade e qualidade. Planos residenciais e empresariais com a melhor cobertura da região.',
  meta_keywords TEXT NOT NULL DEFAULT 'internet fibra, banda larga, alta velocidade, internet residencial',
  
  -- External Integrations
  google_analytics_id TEXT,
  google_maps_api_key TEXT,
  smtp_host TEXT,
  smtp_port INTEGER DEFAULT 587,
  smtp_username TEXT,
  smtp_password TEXT,
  
  -- System Settings
  maintenance_mode BOOLEAN NOT NULL DEFAULT false,
  max_file_size_mb INTEGER NOT NULL DEFAULT 10,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage system settings" 
ON public.system_settings 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Editors can manage system settings" 
ON public.system_settings 
FOR ALL 
USING (has_role(auth.uid(), 'editor'::user_role));

CREATE POLICY "System settings are publicly readable" 
ON public.system_settings 
FOR SELECT 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_system_settings_updated_at
BEFORE UPDATE ON public.system_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings
INSERT INTO public.system_settings (id) VALUES (gen_random_uuid());