-- Create table for cash flow projections
CREATE TABLE IF NOT EXISTS public.cash_flow_projections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projection_date DATE NOT NULL,
  scenario TEXT NOT NULL CHECK (scenario IN ('optimistic', 'base', 'pessimistic')),
  projected_revenue NUMERIC(12, 2) NOT NULL,
  projected_costs NUMERIC(12, 2) NOT NULL,
  projected_churn_rate NUMERIC(5, 2),
  projected_new_clients INTEGER,
  projected_cash_flow NUMERIC(12, 2) NOT NULL,
  accumulated_cash_flow NUMERIC(12, 2) NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_projections_date_scenario ON public.cash_flow_projections(projection_date, scenario);

-- Enable RLS
ALTER TABLE public.cash_flow_projections ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage projections"
  ON public.cash_flow_projections
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Editors can view projections"
  ON public.cash_flow_projections
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'editor'::user_role) OR has_role(auth.uid(), 'admin'::user_role));

-- Create table for projection settings
CREATE TABLE IF NOT EXISTS public.projection_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  optimistic_revenue_growth NUMERIC(5, 2) DEFAULT 10.00,
  optimistic_churn_reduction NUMERIC(5, 2) DEFAULT 5.00,
  pessimistic_revenue_decline NUMERIC(5, 2) DEFAULT 10.00,
  pessimistic_churn_increase NUMERIC(5, 2) DEFAULT 10.00,
  projection_months INTEGER DEFAULT 12,
  fixed_costs NUMERIC(12, 2) DEFAULT 0,
  variable_cost_percentage NUMERIC(5, 2) DEFAULT 30.00,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on settings
ALTER TABLE public.projection_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for settings
CREATE POLICY "Admins can manage settings"
  ON public.projection_settings
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Editors can view settings"
  ON public.projection_settings
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'editor'::user_role) OR has_role(auth.uid(), 'admin'::user_role));

-- Insert default settings
INSERT INTO public.projection_settings (
  optimistic_revenue_growth,
  optimistic_churn_reduction,
  pessimistic_revenue_decline,
  pessimistic_churn_increase,
  projection_months,
  variable_cost_percentage
) VALUES (10.00, 5.00, 10.00, 10.00, 12, 30.00)
ON CONFLICT DO NOTHING;

-- Create trigger for updated_at
CREATE TRIGGER update_projections_updated_at
  BEFORE UPDATE ON public.cash_flow_projections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projection_settings_updated_at
  BEFORE UPDATE ON public.projection_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();