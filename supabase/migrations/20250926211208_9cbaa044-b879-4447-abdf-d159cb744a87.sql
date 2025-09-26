-- Criar tabela para agendamentos de instalação
CREATE TABLE public.installation_appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_cpf TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  customer_cep TEXT NOT NULL,
  customer_birth_date DATE NOT NULL,
  payment_day INTEGER NOT NULL,
  plan_name TEXT NOT NULL,
  plan_speed TEXT NOT NULL,
  plan_price NUMERIC NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_period TEXT NOT NULL CHECK (appointment_period IN ('manha', 'tarde')),
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'confirmado', 'realizado', 'cancelado')),
  observations TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.installation_appointments ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS
CREATE POLICY "Admins can manage appointments" 
ON public.installation_appointments 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Editors can manage appointments" 
ON public.installation_appointments 
FOR ALL 
USING (has_role(auth.uid(), 'editor'::user_role));

-- Criar trigger para atualizar updated_at
CREATE TRIGGER update_installation_appointments_updated_at
BEFORE UPDATE ON public.installation_appointments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Criar índices para melhor performance
CREATE INDEX idx_installation_appointments_date ON public.installation_appointments(appointment_date);
CREATE INDEX idx_installation_appointments_status ON public.installation_appointments(status);
CREATE INDEX idx_installation_appointments_customer_email ON public.installation_appointments(customer_email);