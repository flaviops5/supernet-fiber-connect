-- Tighten RPC access: allow only authenticated users or service_role to execute
CREATE OR REPLACE FUNCTION public.create_installation_appointment(
  p_customer_name TEXT,
  p_customer_cpf TEXT,
  p_customer_email TEXT,
  p_customer_phone TEXT,
  p_customer_birth_date DATE,
  p_customer_address TEXT,
  p_customer_cep TEXT,
  p_plan_name TEXT,
  p_plan_speed TEXT,
  p_plan_price NUMERIC,
  p_payment_day INTEGER,
  p_appointment_date DATE,
  p_appointment_period TEXT,
  p_observations TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_appointment_id UUID;
  v_role text := auth.role();
BEGIN
  -- Only authenticated users or service_role can call this function
  IF v_role NOT IN ('authenticated', 'service_role') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

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
  IF p_plan_name IS NULL OR p_plan_speed IS NULL OR p_plan_price IS NULL THEN
    RAISE EXCEPTION 'Plan information is required';
  END IF;
  IF p_appointment_date IS NULL THEN
    RAISE EXCEPTION 'Appointment date is required';
  END IF;
  IF p_appointment_period NOT IN ('manha','tarde') THEN
    RAISE EXCEPTION 'Invalid appointment period';
  END IF;
  IF p_payment_day IS NULL OR p_payment_day < 1 OR p_payment_day > 31 THEN
    RAISE EXCEPTION 'Invalid payment day';
  END IF;

  INSERT INTO public.installation_appointments (
    customer_name, customer_email, customer_phone, customer_cpf,
    customer_address, customer_cep, customer_birth_date, payment_day,
    plan_name, plan_speed, plan_price,
    appointment_date, appointment_period, status, observations
  ) VALUES (
    TRIM(p_customer_name),
    LOWER(TRIM(p_customer_email)),
    REGEXP_REPLACE(p_customer_phone, '[^0-9]', '', 'g'),
    REGEXP_REPLACE(p_customer_cpf, '[^0-9]', '', 'g'),
    TRIM(p_customer_address),
    REGEXP_REPLACE(p_customer_cep, '[^0-9]', '', 'g'),
    p_customer_birth_date,
    p_payment_day,
    p_plan_name,
    p_plan_speed,
    p_plan_price,
    p_appointment_date,
    p_appointment_period,
    'pendente',
    NULLIF(TRIM(COALESCE(p_observations, '')), '')
  ) RETURNING id INTO v_appointment_id;

  PERFORM public.log_user_activity(
    'create_appointment',
    'Created installation appointment via secure RPC',
    NULL,
    jsonb_build_object('appointment_id', v_appointment_id, 'plan_name', p_plan_name)
  );

  RETURN v_appointment_id;
END;
$$;