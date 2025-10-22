-- Update if exists
UPDATE public.agent_flow_subjects
SET subject_name = 'Apps móveis não abrem (IPv6)',
    description = 'Quando apps funcionam no 4G/5G mas não no Wi‑Fi, desabilitar IPv6 no roteador. Sempre escalar para humano.',
    agent_type = 'support-tech-agent',
    is_active = true,
    display_order = 25,
    icon = '📱',
    updated_at = now()
WHERE subject_key = 'ipv6_apps_moveis';

-- Insert if not exists
INSERT INTO public.agent_flow_subjects (
  subject_key, subject_name, description, agent_type, is_active, display_order, icon, default_media, default_tools
)
SELECT 'ipv6_apps_moveis', 'Apps móveis não abrem (IPv6)',
       'Quando apps funcionam no 4G/5G mas não no Wi‑Fi, desabilitar IPv6 no roteador. Sempre escalar para humano.',
       'support-tech-agent', true, 25, '📱', '[]'::jsonb, '[]'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM public.agent_flow_subjects WHERE subject_key = 'ipv6_apps_moveis'
);

-- Ensure steps are linked to correct agent type and active
UPDATE public.agent_flow_steps
SET agent_type = 'support-tech-agent', is_active = true
WHERE subject_key = 'ipv6_apps_moveis';