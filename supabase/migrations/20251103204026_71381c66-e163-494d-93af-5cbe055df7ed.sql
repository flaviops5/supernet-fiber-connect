-- Atualizar role da Viviane Meireles para admin
UPDATE public.user_roles 
SET role = 'admin'
WHERE user_id = '009d20e7-5f50-4d01-bc5b-779549e0f8af';

-- Verificar se a atualização foi bem-sucedida
SELECT user_id, role FROM public.user_roles WHERE user_id = '009d20e7-5f50-4d01-bc5b-779549e0f8af';