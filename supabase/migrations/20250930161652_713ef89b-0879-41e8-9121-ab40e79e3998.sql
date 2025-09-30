-- Adicionar campo para armazenar ID do contrato IXC
ALTER TABLE public.installation_appointments 
ADD COLUMN IF NOT EXISTS ixc_contract_id text;