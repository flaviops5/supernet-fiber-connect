-- Inserir um cliente fictício para teste
INSERT INTO public.installation_appointments (
  customer_name,
  customer_cpf,
  customer_email,
  customer_phone,
  customer_birth_date,
  customer_address,
  customer_cep,
  plan_name,
  plan_speed,
  plan_price,
  payment_day,
  appointment_date,
  appointment_period,
  status,
  observations
) VALUES (
  'João da Silva Teste',
  '123.456.789-00',
  'joao.teste@email.com',
  '(11) 98765-4321',
  '1990-05-15',
  'Rua Teste, 123 - Apto 45 - Bairro Centro',
  '70630-902',
  'Plano 300 Mega',
  '300 Mbps',
  99.90,
  10,
  CURRENT_DATE + INTERVAL '3 days',
  'manha',
  'pendente',
  'Cliente de teste criado para validação do sistema'
);