-- Add IXC plan ID reference to plans table
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS ixc_plan_id text;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_plans_ixc_plan_id ON public.plans(ixc_plan_id);

-- Add comment
COMMENT ON COLUMN public.plans.ixc_plan_id IS 'Reference to IXC radgrupos plan ID';