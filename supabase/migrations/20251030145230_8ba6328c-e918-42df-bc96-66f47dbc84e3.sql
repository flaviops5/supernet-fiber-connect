-- >>> Fase 2 Auditoria – Funções de Criptografia
-- Criar funções para encrypt/decrypt usando ENCRYPTION_KEY

-- Função de criptografia
CREATE OR REPLACE FUNCTION public.encrypt_text(plain_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  -- Obter chave do vault (será configurada via secret)
  encryption_key := current_setting('app.encryption_key', true);
  
  IF encryption_key IS NULL OR encryption_key = '' THEN
    RAISE EXCEPTION 'ENCRYPTION_KEY not configured';
  END IF;
  
  -- Encriptar usando pgcrypto
  RETURN encode(
    encrypt(
      plain_text::bytea,
      encryption_key::bytea,
      'aes'
    ),
    'base64'
  );
END;
$$;

-- Função de descriptografia
CREATE OR REPLACE FUNCTION public.decrypt_text(encrypted_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  -- Obter chave do vault
  encryption_key := current_setting('app.encryption_key', true);
  
  IF encryption_key IS NULL OR encryption_key = '' THEN
    RAISE EXCEPTION 'ENCRYPTION_KEY not configured';
  END IF;
  
  -- Descriptografar
  RETURN convert_from(
    decrypt(
      decode(encrypted_text, 'base64'),
      encryption_key::bytea,
      'aes'
    ),
    'UTF8'
  );
END;
$$;

-- Comentários
COMMENT ON FUNCTION public.encrypt_text IS 'Encripta texto usando AES-256 com ENCRYPTION_KEY';
COMMENT ON FUNCTION public.decrypt_text IS 'Descriptografa texto usando AES-256 com ENCRYPTION_KEY';
-- <<< Fase 2 Auditoria