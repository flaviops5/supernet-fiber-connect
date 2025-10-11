-- Adicionar campo avatar_url na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

COMMENT ON COLUMN public.profiles.avatar_url IS 'URL da imagem de avatar do agente (storage bucket: avatars)';

-- Adicionar department logistica se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'agent_department'
  ) THEN
    -- Se o tipo não existe, criar com logistica incluído
    CREATE TYPE agent_department AS ENUM ('comercial', 'tecnico', 'financeiro', 'administrativo', 'logistica');
  ELSE
    -- Se existe, tentar adicionar logistica se ainda não estiver
    BEGIN
      ALTER TYPE agent_department ADD VALUE IF NOT EXISTS 'logistica';
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;