-- Create plans table
CREATE TABLE IF NOT EXISTS public.plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  speed TEXT,
  price DECIMAL(10,2) NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  original_price DECIMAL(10,2),
  features JSONB,
  popular BOOLEAN DEFAULT false,
  cta_text TEXT DEFAULT 'Contratar Agora',
  display_order INTEGER DEFAULT 0,
  image_url TEXT,
  ixc_plan_id TEXT
);

-- Enable RLS
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- Create policies - anyone can view active plans
CREATE POLICY "Anyone can view active plans" 
ON public.plans 
FOR SELECT 
USING (active = true OR auth.uid() IS NOT NULL);

-- Only authenticated users can insert/update/delete
CREATE POLICY "Authenticated users can manage plans" 
ON public.plans 
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Create index on ixc_plan_id for faster lookups
CREATE INDEX idx_plans_ixc_plan_id ON public.plans(ixc_plan_id);

-- Create index on active status
CREATE INDEX idx_plans_active ON public.plans(active);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_plans_updated_at
BEFORE UPDATE ON public.plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();