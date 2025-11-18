-- Enable RLS (idempotent)
ALTER TABLE public.mass_outage_events ENABLE ROW LEVEL SECURITY;

-- Allow admins to read mass outage events in the app
CREATE POLICY "Admins can view mass outage events"
ON public.mass_outage_events
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));
