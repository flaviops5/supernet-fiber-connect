-- ============================================
-- FIX: Remove service_role bypass and create secure RPC
-- ============================================
-- This removes the service_role policy that bypasses RLS and replaces it
-- with a secure RPC function that validates input before inserting.

-- Drop the insecure service_role policy
DROP POLICY IF EXISTS "Service role can insert appointments" ON public.installation_appointments;

-- Create a secure RPC function to insert appointments with validation
CREATE OR REPLACE FUNCTION public.create_installation_appointment(
  p_customer_name TEXT,
  p_customer_cpf TEXT,
  p_customer_email TEXT,
  p_customer_phone TEXT,
  p_customer_birthdate DATE,
  p_address_street TEXT,
  p_address_number TEXT,
  p_address_complement TEXT,
  p_address_neighborhood TEXT,
  p_address_city TEXT,
  p_address_state TEXT,
  p_address_zipcode TEXT,
  p_plan_id UUID,
  p_plan_name TEXT,
  p_plan_speed TEXT,
  p_plan_price NUMERIC,
  p_installation_date DATE,
  p_installation_period TEXT,
  p_ixc_contract_id TEXT DEFAULT NULL,
  p_contract_number TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_appointment_id UUID;
BEGIN
  -- Input validation
  IF p_customer_name IS NULL OR LENGTH(TRIM(p_customer_name)) < 3 THEN
    RAISE EXCEPTION 'Invalid customer name';
  END IF;
  
  IF p_customer_cpf IS NULL OR LENGTH(REGEXP_REPLACE(p_customer_cpf, '[^0-9]', '', 'g')) != 11 THEN
    RAISE EXCEPTION 'Invalid CPF';
  END IF;
  
  IF p_customer_email IS NULL OR p_customer_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email';
  END IF;
  
  IF p_customer_phone IS NULL OR LENGTH(REGEXP_REPLACE(p_customer_phone, '[^0-9]', '', 'g')) < 10 THEN
    RAISE EXCEPTION 'Invalid phone';
  END IF;
  
  IF p_plan_id IS NULL THEN
    RAISE EXCEPTION 'Plan ID is required';
  END IF;
  
  IF p_installation_date IS NULL THEN
    RAISE EXCEPTION 'Installation date is required';
  END IF;
  
  -- Insert the appointment
  INSERT INTO public.installation_appointments (
    customer_name,
    customer_cpf,
    customer_email,
    customer_phone,
    customer_birthdate,
    address_street,
    address_number,
    address_complement,
    address_neighborhood,
    address_city,
    address_state,
    address_zipcode,
    plan_id,
    plan_name,
    plan_speed,
    plan_price,
    installation_date,
    installation_period,
    ixc_contract_id,
    contract_number,
    status
  ) VALUES (
    TRIM(p_customer_name),
    REGEXP_REPLACE(p_customer_cpf, '[^0-9]', '', 'g'),
    LOWER(TRIM(p_customer_email)),
    REGEXP_REPLACE(p_customer_phone, '[^0-9]', '', 'g'),
    p_customer_birthdate,
    TRIM(p_address_street),
    TRIM(p_address_number),
    TRIM(p_address_complement),
    TRIM(p_address_neighborhood),
    TRIM(p_address_city),
    TRIM(p_address_state),
    REGEXP_REPLACE(p_address_zipcode, '[^0-9]', '', 'g'),
    p_plan_id,
    p_plan_name,
    p_plan_speed,
    p_plan_price,
    p_installation_date,
    p_installation_period,
    p_ixc_contract_id,
    p_contract_number,
    'pending'
  ) RETURNING id INTO v_appointment_id;
  
  -- Log the action for audit trail
  INSERT INTO public.action_log (
    action_type,
    agent_name,
    client_cpf,
    action_payload
  ) VALUES (
    'create_appointment',
    'system',
    p_customer_cpf,
    jsonb_build_object(
      'appointment_id', v_appointment_id,
      'customer_name', p_customer_name,
      'plan_name', p_plan_name
    )
  );
  
  RETURN v_appointment_id;
END;
$$;