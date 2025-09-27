-- Criar tabela para logs de segurança
CREATE TABLE public.security_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  event_type TEXT NOT NULL,
  event_description TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  details JSONB DEFAULT '{}',
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

-- Policies para security_logs
CREATE POLICY "Admins can view all security logs"
ON public.security_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "System can insert security logs"
ON public.security_logs
FOR INSERT
WITH CHECK (true);

-- Função para log de segurança
CREATE OR REPLACE FUNCTION public.log_security_event(
  event_type TEXT,
  event_description TEXT,
  user_id_param UUID DEFAULT NULL,
  details_param JSONB DEFAULT '{}',
  severity_param TEXT DEFAULT 'info'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_id UUID;
  current_user_id UUID;
BEGIN
  current_user_id := COALESCE(user_id_param, auth.uid());
  
  INSERT INTO public.security_logs (
    user_id,
    event_type,
    event_description,
    details,
    severity
  ) VALUES (
    current_user_id,
    event_type,
    event_description,
    details_param,
    severity_param
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- Trigger para validar dados do perfil
CREATE OR REPLACE FUNCTION public.validate_profile_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Validar nome
  IF LENGTH(TRIM(NEW.name)) < 2 OR LENGTH(TRIM(NEW.name)) > 100 THEN
    RAISE EXCEPTION 'Nome deve ter entre 2 e 100 caracteres';
  END IF;
  
  -- Validar que nome não contém apenas números ou caracteres especiais
  IF NEW.name !~ '^[a-zA-ZÀ-ÿ\s]+$' THEN
    RAISE EXCEPTION 'Nome deve conter apenas letras e espaços';
  END IF;
  
  -- Validar email se fornecido
  IF NEW.email IS NOT NULL AND NEW.email != '' THEN
    IF NEW.email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
      RAISE EXCEPTION 'Email inválido';
    END IF;
    
    IF LENGTH(NEW.email) > 255 THEN
      RAISE EXCEPTION 'Email deve ter no máximo 255 caracteres';
    END IF;
  END IF;
  
  -- Validar telefone se fornecido
  IF NEW.phone IS NOT NULL AND NEW.phone != '' THEN
    -- Remover espaços e caracteres especiais para validação básica
    IF LENGTH(REGEXP_REPLACE(NEW.phone, '[^0-9]', '', 'g')) < 10 THEN
      RAISE EXCEPTION 'Telefone deve ter pelo menos 10 dígitos';
    END IF;
    
    IF LENGTH(NEW.phone) > 20 THEN
      RAISE EXCEPTION 'Telefone deve ter no máximo 20 caracteres';
    END IF;
  END IF;
  
  -- Sanitizar dados
  NEW.name = TRIM(NEW.name);
  NEW.email = LOWER(TRIM(NEW.email));
  IF NEW.phone IS NOT NULL THEN
    NEW.phone = TRIM(NEW.phone);
  END IF;
  
  -- Log da validação
  PERFORM log_security_event(
    'profile_validation',
    'Dados do perfil validados e sanitizados',
    NEW.user_id,
    jsonb_build_object(
      'name_length', LENGTH(NEW.name),
      'email_provided', NEW.email IS NOT NULL AND NEW.email != '',
      'phone_provided', NEW.phone IS NOT NULL AND NEW.phone != ''
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger na tabela profiles
DROP TRIGGER IF EXISTS validate_profile_trigger ON public.profiles;
CREATE TRIGGER validate_profile_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION validate_profile_data();

-- Função para verificar rate limiting
CREATE TABLE public.rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  action_type TEXT NOT NULL,
  ip_address INET,
  attempts INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  blocked_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS para rate_limits
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own rate limits"
ON public.rate_limits
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can manage rate limits"
ON public.rate_limits
FOR ALL
WITH CHECK (true);

-- Função para verificar rate limit
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  action_type_param TEXT,
  max_attempts INTEGER DEFAULT 5,
  window_minutes INTEGER DEFAULT 15,
  block_minutes INTEGER DEFAULT 60
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
  current_window TIMESTAMP WITH TIME ZONE;
  rate_record RECORD;
  result JSONB;
BEGIN
  current_user_id := auth.uid();
  current_window := now() - (window_minutes || ' minutes')::INTERVAL;
  
  -- Buscar registro existente
  SELECT * INTO rate_record
  FROM public.rate_limits
  WHERE user_id = current_user_id 
    AND action_type = action_type_param
    AND window_start > current_window
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Verificar se está bloqueado
  IF rate_record.blocked_until IS NOT NULL AND rate_record.blocked_until > now() THEN
    PERFORM log_security_event(
      'rate_limit_blocked',
      'Tentativa de ação bloqueada por rate limit',
      current_user_id,
      jsonb_build_object(
        'action_type', action_type_param,
        'blocked_until', rate_record.blocked_until
      ),
      'warning'
    );
    
    RETURN jsonb_build_object(
      'allowed', false,
      'blocked_until', rate_record.blocked_until,
      'remaining_attempts', 0
    );
  END IF;
  
  -- Se não existe registro ou a janela expirou, criar novo
  IF rate_record IS NULL OR rate_record.window_start <= current_window THEN
    INSERT INTO public.rate_limits (user_id, action_type, attempts, window_start)
    VALUES (current_user_id, action_type_param, 1, now());
    
    RETURN jsonb_build_object(
      'allowed', true,
      'remaining_attempts', max_attempts - 1
    );
  END IF;
  
  -- Incrementar tentativas
  IF rate_record.attempts >= max_attempts THEN
    -- Bloquear usuário
    UPDATE public.rate_limits
    SET blocked_until = now() + (block_minutes || ' minutes')::INTERVAL,
        updated_at = now()
    WHERE id = rate_record.id;
    
    PERFORM log_security_event(
      'rate_limit_exceeded',
      'Limite de tentativas excedido - usuário bloqueado',
      current_user_id,
      jsonb_build_object(
        'action_type', action_type_param,
        'attempts', rate_record.attempts + 1,
        'blocked_minutes', block_minutes
      ),
      'error'
    );
    
    RETURN jsonb_build_object(
      'allowed', false,
      'blocked_until', now() + (block_minutes || ' minutes')::INTERVAL,
      'remaining_attempts', 0
    );
  ELSE
    -- Incrementar contador
    UPDATE public.rate_limits
    SET attempts = attempts + 1,
        updated_at = now()
    WHERE id = rate_record.id;
    
    RETURN jsonb_build_object(
      'allowed', true,
      'remaining_attempts', max_attempts - (rate_record.attempts + 1)
    );
  END IF;
END;
$$;