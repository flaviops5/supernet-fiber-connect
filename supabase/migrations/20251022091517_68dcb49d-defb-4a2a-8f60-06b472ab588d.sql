-- Remove todos os cenários antigos de IPv6 (subject_key em maiúsculo)
DELETE FROM public.agent_flow_steps
WHERE subject_key = 'IPV6' AND is_active = true;

-- Remove o subject antigo também
DELETE FROM public.agent_flow_subjects
WHERE subject_key = 'IPV6';