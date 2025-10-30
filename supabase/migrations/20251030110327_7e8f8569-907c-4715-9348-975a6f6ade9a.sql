-- ============================================
-- CORREÇÕES DE SEGURANÇA PRIORITÁRIAS
-- ============================================

-- 1. HABILITAR RLS EM registros_de_monitoramento (CRÍTICO)
-- Atualmente esta tabela está completamente exposta
ALTER TABLE public.registros_de_monitoramento ENABLE ROW LEVEL SECURITY;

-- Criar políticas restritivas para registros de monitoramento
CREATE POLICY "Admins podem gerenciar registros de monitoramento"
ON public.registros_de_monitoramento
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Gestores podem visualizar registros de monitoramento"
ON public.registros_de_monitoramento
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::user_role) OR 
  has_role(auth.uid(), 'gestor'::user_role)
);

CREATE POLICY "Service role pode inserir registros de monitoramento"
ON public.registros_de_monitoramento
FOR INSERT
TO service_role
WITH CHECK (true);

-- 2. ADICIONAR POLÍTICAS DE IMUTABILIDADE EM lgpd_audit (ALTO)
-- Garantir que logs de auditoria não podem ser modificados ou deletados
CREATE POLICY "Audit logs são imutáveis - proibir UPDATE"
ON public.lgpd_audit
FOR UPDATE
TO authenticated
USING (false);

CREATE POLICY "Audit logs são permanentes - proibir DELETE"
ON public.lgpd_audit
FOR DELETE
TO authenticated
USING (false);

-- Service role também não pode modificar ou deletar
CREATE POLICY "Service role não pode atualizar audit logs"
ON public.lgpd_audit
FOR UPDATE
TO service_role
USING (false);

CREATE POLICY "Service role não pode deletar audit logs"
ON public.lgpd_audit
FOR DELETE
TO service_role
USING (false);

-- 3. RESTRINGIR ACESSO A ENDEREÇOS RESIDENCIAIS (ALTO)
-- Remover acesso de editors, deixar apenas admins
DROP POLICY IF EXISTS "Editors can view installation appointments" ON public.installation_appointments;

-- Criar política mais restritiva
CREATE POLICY "Apenas admins podem visualizar agendamentos"
ON public.installation_appointments
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Apenas admins podem gerenciar agendamentos"
ON public.installation_appointments
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- Service role pode inserir (para edge functions)
CREATE POLICY "Service role pode inserir agendamentos"
ON public.installation_appointments
FOR INSERT
TO service_role
WITH CHECK (true);

-- 4. RESTRINGIR ACESSO A CONTRATOS ASSINADOS (ALTO)
-- Remover acesso de editors, deixar apenas admins
DROP POLICY IF EXISTS "Editors can view signed contracts" ON public.signed_contracts;

-- Criar política mais restritiva
CREATE POLICY "Apenas admins podem visualizar contratos"
ON public.signed_contracts
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Apenas admins podem gerenciar contratos"
ON public.signed_contracts
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- Clientes podem visualizar seus próprios contratos via appointment_id
-- (verificando através de installation_appointments.customer_cpf)
CREATE POLICY "Clientes podem ver próprios contratos"
ON public.signed_contracts
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM installation_appointments
    WHERE installation_appointments.id = signed_contracts.appointment_id
  )
);

-- Service role pode inserir (para edge functions)
CREATE POLICY "Service role pode inserir contratos"
ON public.signed_contracts
FOR INSERT
TO service_role
WITH CHECK (true);

-- Também restringir storage de contratos
DROP POLICY IF EXISTS "Editors can view signed contracts" ON storage.objects;

CREATE POLICY "Apenas admins podem acessar storage de contratos"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'signed-contracts' AND 
  has_role(auth.uid(), 'admin'::user_role)
);

-- Registrar auditoria das mudanças de segurança
INSERT INTO public.lgpd_audit (
  action_type,
  resource_type,
  legal_basis,
  purpose,
  data_accessed
) VALUES (
  'security_hardening',
  'rls_policies',
  'legal_obligation',
  'Implementação de políticas RLS restritivas conforme LGPD Art. 46',
  jsonb_build_object(
    'tables_updated', ARRAY[
      'registros_de_monitoramento',
      'lgpd_audit',
      'installation_appointments',
      'signed_contracts'
    ],
    'security_level', 'critical',
    'changes', 'RLS habilitado + Policies restritivas + Imutabilidade de audit logs'
  )
);