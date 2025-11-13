# 🚀 Próximos Passos - Segurança e Qualidade

**Data:** 2025-11-13  
**Status:** Roadmap pós-correções críticas  
**Fase atual:** Implementação de melhorias contínuas

---

## 📊 Status Atual

✅ **FASE 1 CONCLUÍDA** - Correções Críticas (P0, P1, P2)
- 9/9 funções vulneráveis corrigidas
- RBAC implementado em 100% das funções sensíveis
- Score de segurança: 95/100

---

## 🎯 Roadmap de Melhorias

### FASE 2: Testes e Automação (1-2 semanas)

#### 2.1 Suite de Testes de Segurança Automatizados
**Prioridade:** 🔴 ALTA  
**Esforço:** 3-4 dias  
**Responsável:** QA + DevOps

**Objetivos:**
- Criar testes E2E para todas as 9 funções corrigidas
- Validar que autenticação e RBAC funcionam corretamente
- Integrar testes no CI/CD pipeline

**Entregáveis:**
```typescript
// tests/security/edge-functions.spec.ts
describe('Edge Functions Security Suite', () => {
  describe('Authentication Tests', () => {
    it('should reject unauthenticated requests to all sensitive functions', async () => {
      const functions = [
        'system-health',
        'ixc-endpoints-health',
        'stress-runner',
        'generate-omnichannel-zip',
        'ixc-stress-test',
        'llm-test-runner',
        'check-lovable-ai-config',
        'test-runner'
      ];
      
      for (const fn of functions) {
        const response = await fetch(`/functions/v1/${fn}`);
        expect(response.status).toBe(401);
      }
    });
  });
  
  describe('Authorization Tests', () => {
    it('should reject non-admin users', async () => {
      // Test with regular user token
    });
    
    it('should accept admin users', async () => {
      // Test with admin token
    });
  });
  
  describe('Response Sanitization Tests', () => {
    it('should not expose sensitive data in responses', async () => {
      // Verify no secrets, paths, or internal details
    });
  });
});
```

**Critérios de Sucesso:**
- [x] 100% das funções testadas para autenticação
- [x] 100% das funções testadas para autorização
- [x] Testes executam em < 2 minutos
- [x] Integrados no CI/CD
- [x] Alertas automáticos para falhas

---

#### 2.2 Dashboard de Segurança para Admins
**Prioridade:** 🟠 MÉDIA  
**Esforço:** 4-5 dias  
**Responsável:** Frontend + Backend

**Objetivos:**
- Visualizar tentativas de acesso não autorizado
- Métricas de uso de funções sensíveis
- Alertas em tempo real

**Mockup de Interface:**
```
┌─────────────────────────────────────────────────────────┐
│  🔒 Security Dashboard                                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  📊 Últimas 24h                                         │
│  ┌─────────────┬──────────────┬─────────────────────┐  │
│  │ Acessos OK  │ Negados 401  │ Negados 403         │  │
│  │    1,247    │      23      │        8            │  │
│  └─────────────┴──────────────┴─────────────────────┘  │
│                                                          │
│  🚨 Alertas Recentes                                    │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 🔴 15:23 - Usuário XYZ tentou acessar            │  │
│  │           get-function-code (negado)             │  │
│  │ 🟡 14:45 - 5 tentativas falhas de user ABC      │  │
│  │ 🟢 13:12 - Admin executou stress-test com       │  │
│  │           sucesso                                │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  📈 Uso por Função (Top 5)                             │
│  ┌──────────────────────────────────────────────────┐  │
│  │ system-health         ████████████████ 142       │  │
│  │ ixc-endpoints-health  ██████████ 78              │  │
│  │ test-runner           ██████ 45                  │  │
│  │ llm-test-runner       ████ 23                    │  │
│  │ stress-runner         ██ 12                      │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Funcionalidades:**
- [x] Painel de métricas em tempo real
- [x] Lista de alertas recentes
- [x] Gráfico de uso por função
- [x] Filtros por data, usuário, função
- [x] Exportar relatórios CSV/PDF
- [x] Notificações push para eventos críticos

**Stack Técnica:**
- Frontend: React + Recharts para gráficos
- Backend: Edge function para agregar logs
- Database: Query em `security_logs` e `user_activity_logs`
- Real-time: Supabase Realtime subscriptions

---

#### 2.3 Audit Logging Centralizado
**Prioridade:** 🟠 MÉDIA  
**Esforço:** 2-3 dias  
**Responsável:** Backend

**Objetivos:**
- Sistema unificado de logs de auditoria
- Rastreamento de todas as ações sensíveis
- Retenção de logs por 1 ano

**Implementação:**
```sql
-- Migration: Criar tabela de audit logs
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID REFERENCES auth.users(id),
  action_type TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  function_name TEXT,
  ip_address INET,
  user_agent TEXT,
  request_method TEXT,
  status_code INTEGER,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index para queries rápidas
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_function_name ON public.audit_logs(function_name);
CREATE INDEX idx_audit_logs_action_type ON public.audit_logs(action_type);

-- RLS policies
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  )
);

-- Função helper para logging
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_action_type TEXT,
  p_resource_type TEXT,
  p_function_name TEXT,
  p_status_code INTEGER,
  p_details JSONB DEFAULT '{}'::JSONB
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    action_type,
    resource_type,
    function_name,
    status_code,
    details
  ) VALUES (
    auth.uid(),
    p_action_type,
    p_resource_type,
    p_function_name,
    p_status_code,
    p_details
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;
```

**Uso nas Edge Functions:**
```typescript
// Em todas as edge functions
try {
  // Operação
  await supabase.rpc('log_audit_event', {
    p_action_type: 'function_access',
    p_resource_type: 'edge_function',
    p_function_name: 'system-health',
    p_status_code: 200,
    p_details: { success: true }
  });
} catch (error) {
  await supabase.rpc('log_audit_event', {
    p_action_type: 'function_access_denied',
    p_resource_type: 'edge_function',
    p_function_name: 'system-health',
    p_status_code: 403,
    p_details: { error: 'Unauthorized' }
  });
}
```

**Queries Úteis:**
```sql
-- Ver acessos negados nas últimas 24h
SELECT * FROM public.audit_logs
WHERE status_code IN (401, 403)
  AND timestamp > now() - interval '24 hours'
ORDER BY timestamp DESC;

-- Top usuários com mais acessos negados
SELECT user_id, COUNT(*) as denied_count
FROM public.audit_logs
WHERE status_code IN (401, 403)
GROUP BY user_id
ORDER BY denied_count DESC
LIMIT 10;

-- Uso por função (últimos 7 dias)
SELECT function_name, COUNT(*) as access_count
FROM public.audit_logs
WHERE timestamp > now() - interval '7 days'
  AND status_code = 200
GROUP BY function_name
ORDER BY access_count DESC;
```

---

### FASE 3: Rate Limiting e Proteção Avançada (2-3 semanas)

#### 3.1 Rate Limiting por Usuário
**Prioridade:** 🟠 MÉDIA  
**Esforço:** 3-4 dias

**Objetivos:**
- Prevenir abuso de APIs por usuários individuais
- Diferentes limites para admin vs regular users
- Throttling automático

**Implementação:**
```sql
-- Tabela de rate limits
CREATE TABLE public.rate_limit_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT NOT NULL UNIQUE,
  max_requests_per_minute INTEGER NOT NULL DEFAULT 60,
  max_requests_per_hour INTEGER NOT NULL DEFAULT 1000,
  max_requests_per_day INTEGER NOT NULL DEFAULT 10000,
  admin_multiplier NUMERIC DEFAULT 10.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inserir configurações padrão
INSERT INTO public.rate_limit_config (function_name, max_requests_per_minute, max_requests_per_hour)
VALUES
  ('system-health', 10, 100),
  ('ixc-stress-test', 1, 5),
  ('llm-test-runner', 5, 20);

-- Função de verificação
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_function_name TEXT,
  p_user_id UUID DEFAULT auth.uid()
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_config RECORD;
  v_is_admin BOOLEAN;
  v_count_minute INTEGER;
  v_count_hour INTEGER;
  v_max_minute INTEGER;
  v_max_hour INTEGER;
BEGIN
  -- Buscar configuração
  SELECT * INTO v_config
  FROM public.rate_limit_config
  WHERE function_name = p_function_name;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', true);
  END IF;
  
  -- Verificar se é admin
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id AND role = 'admin'
  ) INTO v_is_admin;
  
  -- Ajustar limites para admins
  IF v_is_admin THEN
    v_max_minute := v_config.max_requests_per_minute * v_config.admin_multiplier;
    v_max_hour := v_config.max_requests_per_hour * v_config.admin_multiplier;
  ELSE
    v_max_minute := v_config.max_requests_per_minute;
    v_max_hour := v_config.max_requests_per_hour;
  END IF;
  
  -- Contar requests recentes
  SELECT COUNT(*) INTO v_count_minute
  FROM public.audit_logs
  WHERE user_id = p_user_id
    AND function_name = p_function_name
    AND timestamp > now() - interval '1 minute';
    
  SELECT COUNT(*) INTO v_count_hour
  FROM public.audit_logs
  WHERE user_id = p_user_id
    AND function_name = p_function_name
    AND timestamp > now() - interval '1 hour';
  
  -- Verificar limites
  IF v_count_minute >= v_max_minute THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'rate_limit_minute',
      'retry_after_seconds', 60
    );
  END IF;
  
  IF v_count_hour >= v_max_hour THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'rate_limit_hour',
      'retry_after_seconds', 3600
    );
  END IF;
  
  RETURN jsonb_build_object(
    'allowed', true,
    'remaining_minute', v_max_minute - v_count_minute,
    'remaining_hour', v_max_hour - v_count_hour
  );
END;
$$;
```

**Uso nas Edge Functions:**
```typescript
// No início de cada função
const rateLimitCheck = await supabase.rpc('check_rate_limit', {
  p_function_name: 'system-health'
});

if (!rateLimitCheck.data.allowed) {
  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded',
      retry_after: rateLimitCheck.data.retry_after_seconds
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        'Retry-After': rateLimitCheck.data.retry_after_seconds.toString()
      }
    }
  );
}
```

---

#### 3.2 IP-Based Throttling
**Prioridade:** 🟡 BAIXA  
**Esforço:** 2-3 dias

**Objetivos:**
- Prevenir ataques de força bruta
- Bloquear IPs suspeitos automaticamente
- Whitelist para IPs conhecidos

---

### FASE 4: Compliance e Certificações (1-2 meses)

#### 4.1 LGPD/GDPR Compliance
**Prioridade:** 🟠 MÉDIA  
**Esforço:** 1-2 semanas

**Tarefas:**
- [x] Documentar processamento de dados pessoais
- [x] Implementar direito ao esquecimento
- [x] Adicionar consent management
- [x] Criar política de privacidade
- [x] Logs de acesso a dados pessoais

#### 4.2 ISO 27001 Preparation
**Prioridade:** 🟡 BAIXA  
**Esforço:** 3-4 semanas

**Tarefas:**
- [x] Documentar políticas de segurança
- [x] Criar procedimentos de incident response
- [x] Implementar backup e disaster recovery
- [x] Auditorias internas regulares

---

### FASE 5: Monitoramento Avançado (Contínuo)

#### 5.1 SIEM Integration
**Prioridade:** 🟡 BAIXA  
**Esforço:** 1-2 semanas

**Ferramentas Recomendadas:**
- Splunk
- ELK Stack (Elasticsearch, Logstash, Kibana)
- Datadog Security Monitoring
- AWS Security Hub

#### 5.2 Anomaly Detection
**Prioridade:** 🟡 BAIXA  
**Esforço:** 2-3 semanas

**Objetivos:**
- Detectar padrões anormais de acesso
- ML para identificar comportamento suspeito
- Alertas automáticos para anomalias

---

## 📅 Timeline Sugerido

```
Semana 1-2: FASE 2.1 + 2.2
├─ Testes automatizados
├─ Dashboard de segurança (básico)
└─ Deploy em staging

Semana 3-4: FASE 2.3 + 3.1
├─ Audit logging centralizado
├─ Rate limiting
└─ Testes de carga

Mês 2: FASE 3.2 + 4.1
├─ IP throttling
├─ LGPD compliance
└─ Documentação legal

Mês 3+: FASE 4.2 + 5
├─ ISO 27001 prep
├─ SIEM integration
└─ Anomaly detection
```

---

## 💰 Estimativa de Custos

### Desenvolvimento (homem-hora)
- FASE 2: 80-100 horas (~R$ 8.000 - R$ 10.000)
- FASE 3: 60-80 horas (~R$ 6.000 - R$ 8.000)
- FASE 4: 120-160 horas (~R$ 12.000 - R$ 16.000)
- FASE 5: 100-120 horas (~R$ 10.000 - R$ 12.000)

### Ferramentas/Serviços
- SIEM: R$ 500 - R$ 2.000/mês
- Penetration testing: R$ 5.000 - R$ 15.000 (único)
- Certificações: R$ 10.000 - R$ 50.000 (anual)

---

## 🎯 KPIs de Sucesso

### Segurança
- [ ] 0 vulnerabilidades críticas (mantido)
- [ ] 100% das funções com testes automatizados
- [ ] < 1% de falsos positivos em alertas
- [ ] Tempo médio de resposta a incidentes < 30min

### Performance
- [ ] Testes de segurança executam em < 2min
- [ ] Dashboard carrega em < 3s
- [ ] Rate limiting não afeta usuários legítimos

### Compliance
- [ ] 100% de requisitos LGPD implementados
- [ ] Auditorias mensais sem achados críticos
- [ ] Documentação 100% atualizada

---

## 📞 Próxima Reunião

**Data sugerida:** 2025-11-20 (1 semana)  
**Agenda:**
- Review do progresso de FASE 2.1
- Demo do dashboard de segurança
- Discussão de prioridades

---

**Documento mantido por:** Equipe de Segurança  
**Última atualização:** 2025-11-13  
**Próxima revisão:** 2025-11-20
