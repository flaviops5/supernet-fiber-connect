-- Correção de segurança: Alterar funções de SECURITY DEFINER para SECURITY INVOKER
-- onde não é necessário privilégio elevado

-- Funções de cálculo: mudar para SECURITY INVOKER
ALTER FUNCTION public.calc_onu_instability_top_14d() SECURITY INVOKER;
ALTER FUNCTION public.calc_retest_effectiveness_7d() SECURITY INVOKER;
ALTER FUNCTION public.calc_support_kpis_by_region_last_7_days() SECURITY INVOKER;
ALTER FUNCTION public.calc_support_kpis_last_7_days() SECURITY INVOKER;
ALTER FUNCTION public.calculate_nps_category(score integer) SECURITY INVOKER;

-- Funções de limpeza: mudar para SECURITY INVOKER
ALTER FUNCTION public.cleanup_expired_cache() SECURITY INVOKER;
ALTER FUNCTION public.cleanup_expired_data() SECURITY INVOKER;
ALTER FUNCTION public.cleanup_expired_webhooks() SECURITY INVOKER;
ALTER FUNCTION public.cleanup_old_logs() SECURITY INVOKER;

-- Funções de consulta: mudar para SECURITY INVOKER
ALTER FUNCTION public.get_available_agents_for_department(dept agent_department, include_universal boolean) SECURITY INVOKER;
ALTER FUNCTION public.get_contract_template_for_plan(plan_name text) SECURITY INVOKER;
ALTER FUNCTION public.get_customers_by_region_last_outage() SECURITY INVOKER;
ALTER FUNCTION public.get_impacted_customers_by_region(region_cidade text, region_bairro text) SECURITY INVOKER;
ALTER FUNCTION public.get_top5_critical_regions() SECURITY INVOKER;

-- Outras funções utilitárias
ALTER FUNCTION public.generate_contract_number() SECURITY INVOKER;

-- Adicionar comentários explicativos
COMMENT ON FUNCTION public.has_role IS 'SECURITY DEFINER: necessário para verificar roles sem RLS';
COMMENT ON FUNCTION public.anonymize_old_conversations IS 'SECURITY DEFINER: necessário para anonimização LGPD';
COMMENT ON FUNCTION public.handle_new_user IS 'SECURITY DEFINER: trigger que cria perfil de novo usuário';
COMMENT ON FUNCTION public.add_board_creator_as_owner IS 'SECURITY DEFINER: trigger que adiciona criador como owner';
COMMENT ON FUNCTION public.audit_notification_targets IS 'SECURITY DEFINER: trigger de auditoria';
COMMENT ON FUNCTION public.auto_sync_knowledge_base IS 'SECURITY DEFINER: trigger de sincronização';
COMMENT ON FUNCTION public.check_rate_limit IS 'SECURITY DEFINER: verificação de limite sem RLS';
COMMENT ON FUNCTION public.get_current_user_role IS 'SECURITY DEFINER: verificação de role sem RLS';
COMMENT ON FUNCTION public.log_security_event IS 'SECURITY DEFINER: log de eventos de segurança';
COMMENT ON FUNCTION public.log_user_activity IS 'SECURITY DEFINER: log de atividade de usuários';
COMMENT ON FUNCTION public.encrypt_text IS 'SECURITY DEFINER: função de criptografia do sistema';
COMMENT ON FUNCTION public.decrypt_text IS 'SECURITY DEFINER: função de descriptografia do sistema';
COMMENT ON FUNCTION public.enable_maintenance_cron IS 'SECURITY DEFINER: gerenciamento de manutenção';
COMMENT ON FUNCTION public.disable_maintenance_cron IS 'SECURITY DEFINER: gerenciamento de manutenção';
