-- Criar tabela para contratos assinados
CREATE TABLE public.signed_contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES installation_appointments(id) ON DELETE CASCADE,
  contract_number TEXT NOT NULL UNIQUE,
  contract_pdf_url TEXT NOT NULL,
  signature_data TEXT NOT NULL, -- Base64 da assinatura
  cpf_validated BOOLEAN NOT NULL DEFAULT false,
  timestamp_hash TEXT NOT NULL, -- Hash criptográfico do timestamp
  ip_address INET NOT NULL,
  user_agent TEXT,
  signed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.signed_contracts ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admins can manage all signed contracts" 
ON public.signed_contracts 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Editors can view signed contracts" 
ON public.signed_contracts 
FOR SELECT 
USING (has_role(auth.uid(), 'editor'::user_role));

-- Criar bucket para contratos assinados
INSERT INTO storage.buckets (id, name, public) 
VALUES ('signed-contracts', 'signed-contracts', false);

-- Políticas de storage para contratos
CREATE POLICY "Admins can access all signed contracts" 
ON storage.objects 
FOR ALL 
USING (bucket_id = 'signed-contracts' AND has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Editors can view signed contracts" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'signed-contracts' AND has_role(auth.uid(), 'editor'::user_role));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_signed_contracts_updated_at
BEFORE UPDATE ON public.signed_contracts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Função para gerar número do contrato
CREATE OR REPLACE FUNCTION public.generate_contract_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  contract_num TEXT;
  year_suffix TEXT;
BEGIN
  year_suffix := EXTRACT(YEAR FROM NOW())::TEXT;
  
  SELECT 'CT' || year_suffix || '-' || LPAD((COUNT(*) + 1)::TEXT, 6, '0')
  INTO contract_num
  FROM public.signed_contracts
  WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());
  
  RETURN contract_num;
END;
$$;