-- ============================================
-- FIX: Secure installation_appointments table
-- ============================================
-- This migration protects sensitive customer data (CPF, names, emails, addresses)
-- by restricting access to authenticated admin/editor roles only.

-- Remove the public read policy if it exists
DROP POLICY IF EXISTS "Installation appointments are publicly readable" ON public.installation_appointments;

-- Ensure RLS is enabled
ALTER TABLE public.installation_appointments ENABLE ROW LEVEL SECURITY;

-- Allow admins to manage all appointments
CREATE POLICY "Admins can manage installation appointments"
ON public.installation_appointments
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- Allow editors to view and manage appointments (for customer service)
CREATE POLICY "Editors can manage installation appointments"
ON public.installation_appointments
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'editor'::user_role))
WITH CHECK (has_role(auth.uid(), 'editor'::user_role));

-- Allow service role (Edge Functions) to insert new appointments from sales process
-- This is needed for the sales-agent and process-contract functions
CREATE POLICY "Service role can insert appointments"
ON public.installation_appointments
FOR INSERT
TO service_role
WITH CHECK (true);