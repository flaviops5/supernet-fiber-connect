-- Remove funções de criptografia que dependem de superuser permissions
-- A criptografia LGPD continuará funcionando nas Edge Functions

DROP FUNCTION IF EXISTS public.encrypt_text(text);
DROP FUNCTION IF EXISTS public.decrypt_text(text);

-- Log da remoção
COMMENT ON SCHEMA public IS 'Criptografia LGPD disponível apenas via Edge Functions (ENCRYPTION_KEY secret configurado)';