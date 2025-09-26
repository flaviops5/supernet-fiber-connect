-- Add new fields to plans table for complete customization
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS original_price DECIMAL(10,2);
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS popular BOOLEAN DEFAULT false;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS cta_text TEXT DEFAULT 'Contratar Agora';
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Add RLS policies for plan management
CREATE POLICY "Admins can manage plans" ON public.plans
FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Editors can manage plans" ON public.plans  
FOR ALL USING (has_role(auth.uid(), 'editor'::user_role));

-- Update existing plans with sample data
UPDATE public.plans SET 
  original_price = price + 20,
  features = '[
    {"text": "Download garantido", "icon": "Download"},
    {"text": "Instalação gratuita", "icon": "DollarSign"},
    {"text": "Sem limite de uso", "icon": "Globe"}
  ]'::jsonb,
  popular = false,
  cta_text = 'Contratar Agora',
  display_order = 1
WHERE name = 'Plano Básico';

UPDATE public.plans SET 
  original_price = price + 30,
  features = '[
    {"text": "Download garantido", "icon": "Download"},
    {"text": "Roteador Wi-Fi incluso", "icon": "Wifi"},
    {"text": "Instalação gratuita", "icon": "DollarSign"},
    {"text": "Suporte 24h", "icon": "Shield"}
  ]'::jsonb,
  popular = true,
  cta_text = 'Contratar Agora',
  display_order = 2
WHERE name = 'Plano Intermediário';

UPDATE public.plans SET 
  original_price = price + 40,
  features = '[
    {"text": "Download garantido", "icon": "Download"},
    {"text": "Roteador Wi-Fi 6 Pró", "icon": "Router"},
    {"text": "Instalação gratuita", "icon": "DollarSign"},
    {"text": "Suporte prioritário", "icon": "Shield"},
    {"text": "Clube de vantagens", "icon": "Gift"}
  ]'::jsonb,
  popular = false,
  cta_text = 'Contratar Agora',
  display_order = 3
WHERE name = 'Plano Avançado';