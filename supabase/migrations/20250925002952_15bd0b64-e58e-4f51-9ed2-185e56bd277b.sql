-- Create tables for coverage system

-- Plans table to store available internet plans
CREATE TABLE public.plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  speed TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Coverage areas table for map polygons
CREATE TABLE public.coverage_areas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  region_code TEXT NOT NULL,
  coordinates JSONB NOT NULL, -- Store polygon coordinates as JSON
  color TEXT NOT NULL DEFAULT '#3b82f6',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- CEP coverage table for CEP checker
CREATE TABLE public.cep_coverage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cep_start TEXT NOT NULL, -- CEP range start (e.g., '72400000')
  cep_end TEXT NOT NULL, -- CEP range end (e.g., '72400999')
  region_name TEXT NOT NULL,
  coverage_area_id UUID REFERENCES public.coverage_areas(id),
  coordinates POINT, -- Specific coordinates for this CEP area
  available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Junction table for plans available in each CEP area
CREATE TABLE public.cep_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cep_coverage_id UUID NOT NULL REFERENCES public.cep_coverage(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(cep_coverage_id, plan_id)
);

-- Enable Row Level Security
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coverage_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cep_coverage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cep_plans ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (these are public data)
CREATE POLICY "Plans are publicly readable" 
ON public.plans 
FOR SELECT 
USING (true);

CREATE POLICY "Coverage areas are publicly readable" 
ON public.coverage_areas 
FOR SELECT 
USING (true);

CREATE POLICY "CEP coverage is publicly readable" 
ON public.cep_coverage 
FOR SELECT 
USING (true);

CREATE POLICY "CEP plans are publicly readable" 
ON public.cep_plans 
FOR SELECT 
USING (true);

-- Create indexes for better performance
CREATE INDEX idx_cep_coverage_range ON public.cep_coverage (cep_start, cep_end);
CREATE INDEX idx_cep_coverage_available ON public.cep_coverage (available);
CREATE INDEX idx_coverage_areas_active ON public.coverage_areas (active);
CREATE INDEX idx_plans_active ON public.plans (active);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_plans_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_coverage_areas_updated_at
  BEFORE UPDATE ON public.coverage_areas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cep_coverage_updated_at
  BEFORE UPDATE ON public.cep_coverage
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample data
-- Insert plans
INSERT INTO public.plans (name, speed, price, description) VALUES
  ('Plano Básico', '100MB', 79.90, 'Ideal para navegação básica'),
  ('Plano Intermediário', '200MB', 99.90, 'Perfeito para streaming e trabalho'),
  ('Plano Avançado', '500MB', 129.90, 'Para famílias conectadas'),
  ('Plano Ultra', '1GB', 179.90, 'Máxima velocidade disponível');

-- Insert coverage areas
INSERT INTO public.coverage_areas (name, region_code, coordinates, color) VALUES
  ('Setor de Indústria Gráfica - SIG', 'SIG', '[[-15.7900, -47.8900], [-15.7900, -47.8800], [-15.7980, -47.8800], [-15.7980, -47.8900]]', '#3b82f6'),
  ('Região Central - Brasília', 'CENTRO', '[[-15.7800, -47.9200], [-15.7800, -47.9000], [-15.8000, -47.9000], [-15.8000, -47.9200]]', '#10b981'),
  ('Taguatinga', 'TAGUATINGA', '[[-15.8300, -48.0600], [-15.8300, -48.0400], [-15.8500, -48.0400], [-15.8500, -48.0600]]', '#f59e0b');

-- Insert CEP coverage data
INSERT INTO public.cep_coverage (cep_start, cep_end, region_name, coverage_area_id, coordinates, available) VALUES
  ('72400000', '72499999', 'SIG - Setor de Indústria Gráfica', 
   (SELECT id FROM public.coverage_areas WHERE region_code = 'SIG'), 
   POINT(-47.8822, -15.7942), true),
  ('70000000', '70999999', 'Brasília Central', 
   (SELECT id FROM public.coverage_areas WHERE region_code = 'CENTRO'), 
   POINT(-47.9100, -15.7900), true),
  ('72000000', '72099999', 'Taguatinga', 
   (SELECT id FROM public.coverage_areas WHERE region_code = 'TAGUATINGA'), 
   POINT(-48.0500, -15.8400), true),
  ('71000000', '71999999', 'Região não atendida', 
   NULL, NULL, false);

-- Link plans to CEP areas
-- SIG area gets all plans
INSERT INTO public.cep_plans (cep_coverage_id, plan_id)
SELECT c.id, p.id 
FROM public.cep_coverage c, public.plans p 
WHERE c.region_name = 'SIG - Setor de Indústria Gráfica';

-- Centro gets 200MB, 500MB, 1GB
INSERT INTO public.cep_plans (cep_coverage_id, plan_id)
SELECT c.id, p.id 
FROM public.cep_coverage c, public.plans p 
WHERE c.region_name = 'Brasília Central' 
AND p.name IN ('Plano Intermediário', 'Plano Avançado', 'Plano Ultra');

-- Taguatinga gets 100MB, 500MB, 1GB
INSERT INTO public.cep_plans (cep_coverage_id, plan_id)
SELECT c.id, p.id 
FROM public.cep_coverage c, public.plans p 
WHERE c.region_name = 'Taguatinga' 
AND p.name IN ('Plano Básico', 'Plano Avançado', 'Plano Ultra');