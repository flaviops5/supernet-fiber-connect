-- >>> PR28 + PR29 – Tables para Auto-Upgrade e Auditoria/Rollback

-- PR28: Policies globais do agente (regras dinâmicas baseadas em KPI)
create table if not exists public.agent_global_policies (
  agent text primary key,
  policy_json jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.agent_global_policies enable row level security;

create policy "Admins e Gestores leem policies"
on public.agent_global_policies for select
to authenticated
using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'gestor'));

create policy "Service role full access policies"
on public.agent_global_policies for all
to service_role
using (true)
with check (true);

-- PR29: Versionamento de cenários (prompts, configs, variações)
create table if not exists public.agent_scenarios_versions (
  id uuid primary key default gen_random_uuid(),
  agent text not null,
  scenario_key text not null,
  version integer not null,
  payload jsonb not null,
  configs jsonb not null default '{}',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create unique index if not exists idx_scenario_version_unique
  on public.agent_scenarios_versions(agent, scenario_key, version);

alter table public.agent_scenarios_versions enable row level security;

create policy "Leitura scenarios (admin/gestor)"
on public.agent_scenarios_versions for select
to authenticated
using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'gestor'));

create policy "Escrita scenarios (admin/gestor)"
on public.agent_scenarios_versions for insert
to authenticated
with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'gestor'));

-- PR29: Configurações ATUAIS dos agentes (aplicadas via rollback)
create table if not exists public.agent_current_configs (
  agent text not null,
  scenario_key text not null,
  payload_json jsonb not null default '{}',
  configs_json jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (agent, scenario_key)
);

alter table public.agent_current_configs enable row level security;

create policy "Leitura configs (admin/gestor)"
on public.agent_current_configs for select
to authenticated
using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'gestor'));

create policy "Service role full access configs"
on public.agent_current_configs for all
to service_role
using (true)
with check (true);

-- PR29: Log de rollbacks (com aprovação dual)
create table if not exists public.agent_scenarios_rollback_log (
  id uuid primary key default gen_random_uuid(),
  agent text not null,
  scenario_key text not null,
  from_version integer,
  to_version integer,
  reason text,
  status text not null default 'pending', -- pending, confirmed, applied
  requested_by uuid references auth.users(id),
  confirmed_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  applied_at timestamptz
);

alter table public.agent_scenarios_rollback_log enable row level security;

create policy "Leitura rollback log (admin/gestor)"
on public.agent_scenarios_rollback_log for select
to authenticated
using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'gestor'));

create policy "Escrita rollback log (admin/gestor)"
on public.agent_scenarios_rollback_log for insert
to authenticated
with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'gestor'));

create policy "Update rollback log (admin/gestor)"
on public.agent_scenarios_rollback_log for update
to authenticated
using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'gestor'));

-- <<< PR28 + PR29