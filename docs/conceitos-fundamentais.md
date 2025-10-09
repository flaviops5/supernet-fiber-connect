# 📚 Conceitos Fundamentais do Sistema

## 🔄 Circuit Breaker (Disjuntor)

### O que é?
Um **Circuit Breaker** é um padrão de design que previne falhas em cascata. Funciona como um disjuntor elétrico: quando detecta muitas falhas consecutivas, ele "abre" e bloqueia temporariamente as requisições para dar tempo ao sistema problemático se recuperar.

### Estados
```
CLOSED (Fechado) → Funcionamento normal
   ↓ (5 falhas consecutivas)
OPEN (Aberto) → Bloqueia requisições por 60s
   ↓ (após timeout)
HALF-OPEN (Meio-aberto) → Testa com 1 requisição
   ↓
CLOSED (se sucesso) ou OPEN (se falha)
```

### Como se aplica ao seu sistema?

**Arquivo:** `supabase/functions/_shared/ixc-client.ts`

**Configuração atual:**
```typescript
const FAILURE_THRESHOLD = 5;      // Abre após 5 falhas
const OPEN_TIMEOUT_MS = 60000;    // Fica aberto por 60s
```

**Onde é usado:**
- Todas as chamadas ao IXC passam por `callIxcWithRetry()`
- Protege o IXC de sobrecarga
- Protege o sistema de gastar recursos em chamadas que vão falhar

**Exemplo prático:**
1. `detect-mass-outage` tenta buscar dados de 500 clientes
2. Se 5 requisições falharem seguidas (timeout, erro de rede, etc.)
3. Circuit Breaker abre → bloqueia todas as próximas requisições por 60s
4. Após 60s, testa com 1 requisição
5. Se suceder, volta ao normal; se falhar, fica mais 60s bloqueado

**Problema atual:**
- Está abrindo com frequência
- Causa: Volume excessivo de requisições paralelas (mesmo após redução de 10→3)
- Solução aplicada: Redução de concorrência + delays entre chunks
- **Status:** Código corrigido mas precisa ser deployado

**Monitoramento:**
- Dashboard: `/system-metrics` → "Circuit Breaker Status"
- Logs: `supabase--edge-function-logs` → buscar "circuit breaker"
- Health Check: `https://.../functions/v1/system-health`

**Reset manual (EMERGÊNCIA APENAS):**
```bash
curl -X POST https://mxdupkbpxjcfxdgrwknp.supabase.co/functions/v1/reset-circuit-breaker \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

---

## 🧪 Testes E2E (End-to-End)

### O que é?
Testes **End-to-End** (ponta a ponta) simulam o comportamento de um usuário real interagindo com o sistema completo, testando toda a stack: frontend → backend → banco de dados → integrações externas.

### Diferença de outros testes

| Tipo | Escopo | Exemplo |
|------|--------|---------|
| **Unitário** | 1 função isolada | Testa se `formatCPF()` formata corretamente |
| **Integração** | 2-3 componentes | Testa se `saveClient()` grava no banco |
| **E2E** | Sistema completo | Testa se cliente consegue contratar plano do início ao fim |

### Como se aplica ao seu sistema?

**Cenários críticos para E2E:**

#### 1. Fluxo de Vendas (Sales Agent)
```
[USUÁRIO] → [CHAT WIDGET] → [SALES AGENT] → [IXC] → [CONTRACT PDF] → [EMAIL]

Teste E2E:
1. Usuário abre chat e digita "Quero contratar 300 mega"
2. Agente valida CEP → busca planos no IXC
3. Cliente confirma → gera contrato PDF
4. Envia email com link de pagamento
5. Valida: PDF gerado? Email enviado? Registro no IXC?
```

#### 2. Fluxo de Suporte Técnico
```
[WHATSAPP] → [ROUTING AGENT] → [TECH AGENT] → [IXC] → [CHAMADO]

Teste E2E:
1. Cliente envia "Internet está lenta" via WhatsApp
2. Sistema valida CPF → busca dados no IXC
3. Agente detecta problema de sinal
4. Abre chamado técnico no IXC
5. Valida: Chamado criado? Cliente notificado?
```

#### 3. Fluxo de Detecção de Queda em Massa
```
[CRON] → [DETECT-MASS-OUTAGE] → [IXC] → [ALERT] → [NOTIFICATION]

Teste E2E:
1. Cron dispara verificação a cada 15 min
2. Busca clientes offline no IXC
3. Detecta > 30 clientes offline na mesma PON
4. Gera alerta de queda em massa
5. Notifica administradores
6. Valida: Alerta gerado? Notificação enviada?
```

### Ferramentas para E2E no seu sistema

**Recomendadas:**
- **Playwright** (mais moderno, usado em produção)
- **Cypress** (boa documentação, fácil de começar)

**Estrutura sugerida:**
```typescript
// tests/e2e/sales-flow.spec.ts
test('Deve contratar plano 300 mega com sucesso', async () => {
  // 1. Abrir página inicial
  await page.goto('/');
  
  // 2. Abrir chat widget
  await page.click('[data-testid="chat-widget"]');
  
  // 3. Enviar mensagem
  await page.fill('[data-testid="chat-input"]', 'Quero 300 mega');
  await page.click('[data-testid="send-button"]');
  
  // 4. Aguardar resposta do agente
  await page.waitForSelector('[data-testid="agent-response"]');
  
  // 5. Validar que apareceu opção de plano
  const planCard = await page.locator('[data-testid="plan-card-300"]');
  await expect(planCard).toBeVisible();
  
  // 6. Confirmar contratação
  await page.click('[data-testid="confirm-plan"]');
  
  // 7. Validar contrato gerado
  await page.waitForSelector('[data-testid="contract-pdf"]');
  
  // 8. Validar no banco de dados
  const contract = await db.from('signed_contracts').select().single();
  expect(contract.status).toBe('pending_payment');
});
```

### Status no seu sistema
- ❌ **NÃO implementado**
- 🎯 **Prioridade:** ALTA (antes de produção)
- 📅 **Estimativa:** 2-3 dias para implementar testes críticos

**Testes E2E prioritários:**
1. Fluxo de vendas (Sales Agent → IXC → Contrato)
2. Fluxo de suporte técnico (WhatsApp → Routing → Tech Agent → Chamado)
3. Detecção de queda em massa
4. Auto-reboot de equipamentos

---

## 📮 DLQ (Dead Letter Queue)

### O que é?
Uma **Dead Letter Queue** (Fila de Cartas Mortas) é um sistema que armazena operações/mensagens que falharam, permitindo:
- Retry automático com backoff exponencial
- Análise de causa raiz de falhas
- Recuperação manual de operações críticas
- Auditoria de falhas

### Analogia
Imagine que você é um carteiro:
- **Fila Normal:** Cartas que você entrega com sucesso
- **DLQ:** Cartas que ninguém atendeu → você tenta 3x → ainda não entregou → vai para um arquivo especial para análise posterior

### Como se aplica ao seu sistema?

**Arquivo:** `supabase/functions/retry-failed-actions/index.ts`  
**Tabela:** `failed_actions`

**Estrutura da tabela:**
```sql
CREATE TABLE failed_actions (
  id UUID PRIMARY KEY,
  action_type TEXT,           -- Ex: "open_ticket", "send_email"
  action_payload JSONB,        -- Dados da ação
  agent_name TEXT,             -- Qual agente tentou executar
  client_cpf TEXT,
  error_message TEXT,          -- Erro que causou a falha
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  status TEXT DEFAULT 'pending',  -- pending | retrying | resolved | abandoned
  created_at TIMESTAMP,
  last_retry_at TIMESTAMP,
  resolved_at TIMESTAMP
);
```

**Fluxo completo:**

```
1. FALHA INICIAL
   Agente tenta abrir chamado no IXC → Erro (IXC offline)
   ↓
   Registra em `failed_actions` com status='pending'

2. RETRY AUTOMÁTICO (Cron a cada 5 min)
   ↓
   `retry-failed-actions` busca ações pendentes
   ↓
   Tenta executar novamente
   ↓
   - SUCESSO? → status='resolved', resolved_at=now()
   - FALHA? → retry_count++, last_retry_at=now()
   ↓
   Se retry_count >= 3 → status='abandoned'

3. ALERTA CRÍTICO
   Ações abandonadas geram alerta para administrador
```

**Exemplo prático:**

```typescript
// Agent tenta abrir chamado
try {
  const result = await ixcClient.openTicket({
    client_id: 123,
    subject: "Internet lenta"
  });
  
  // Sucesso → registra em action_log
  await supabase.from('action_log').insert({
    action_type: 'open_ticket',
    result: result
  });
  
} catch (error) {
  // Falhou → registra em DLQ (failed_actions)
  await supabase.from('failed_actions').insert({
    action_type: 'open_ticket',
    action_payload: { client_id: 123, subject: "Internet lenta" },
    agent_name: 'support-tech-agent',
    error_message: error.message,
    status: 'pending'
  });
  
  // Responde ao cliente que a ação será processada
  return "Seu chamado foi registrado e será processado em breve.";
}
```

**DLQ Processor (Cron Job):**
```typescript
// Roda a cada 5 minutos
const { data: pendingActions } = await supabase
  .from('failed_actions')
  .select('*')
  .in('status', ['pending', 'retrying'])
  .lt('retry_count', 'max_retries');

for (const action of pendingActions) {
  const backoffMs = Math.pow(2, action.retry_count) * 1000; // 1s, 2s, 4s
  await delay(backoffMs);
  
  try {
    // Tenta executar novamente
    await executeAction(action);
    
    // Sucesso!
    await supabase.from('failed_actions')
      .update({ status: 'resolved', resolved_at: new Date() })
      .eq('id', action.id);
      
  } catch (error) {
    // Ainda falhou
    const newRetryCount = action.retry_count + 1;
    
    if (newRetryCount >= action.max_retries) {
      // Abandona após 3 tentativas
      await supabase.from('failed_actions')
        .update({ 
          status: 'abandoned',
          retry_count: newRetryCount 
        })
        .eq('id', action.id);
        
      // Gera alerta CRÍTICO
      await supabase.from('alert_history').insert({
        alert_type: 'action_abandoned',
        severity: 'CRITICAL',
        message: `Ação ${action.action_type} abandonada após 3 tentativas`
      });
    } else {
      // Tenta novamente no próximo ciclo
      await supabase.from('failed_actions')
        .update({ 
          status: 'retrying',
          retry_count: newRetryCount,
          last_retry_at: new Date()
        })
        .eq('id', action.id);
    }
  }
}
```

**Monitoramento:**
- Dashboard: `/system-metrics` → "Failed Actions (DLQ)"
- Tabela: `failed_actions`
- Alertas: `alert_history` (severity='CRITICAL')

**Estados da DLQ:**
- **pending:** 0 tentativas, aguardando retry
- **retrying:** 1-2 tentativas, ainda tentando
- **resolved:** Sucesso após retry
- **abandoned:** Falhou 3x, precisa intervenção manual

**Benefícios:**
- ✅ Não perde nenhuma ação do cliente
- ✅ Recuperação automática de falhas temporárias
- ✅ Visibilidade de problemas persistentes
- ✅ Auditoria completa

**Teste DLQ:**
1. Simular falha do IXC (desabilitar temporariamente)
2. Tentar abrir chamado via chat
3. Verificar que foi para DLQ: `SELECT * FROM failed_actions`
4. Reabilitar IXC
5. Aguardar 5 min (próximo ciclo do cron)
6. Verificar que ação foi resolvida: `status='resolved'`

---

## 🏥 Health Check

### O que é?
Um **Health Check** é um endpoint HTTP que verifica se todos os componentes críticos do sistema estão funcionando corretamente. É como um check-up médico automatizado do sistema.

### Analogia
Imagine um médico fazendo check-up:
- ✅ Coração batendo? (Database funcionando?)
- ✅ Pulmões funcionando? (IXC respondendo?)
- ✅ Pressão normal? (Circuit Breaker fechado?)
- ✅ Temperatura OK? (Erro rate < 5%?)

### Como se aplica ao seu sistema?

**Arquivo:** `supabase/functions/system-health/index.ts`  
**Endpoint:** `https://mxdupkbpxjcfxdgrwknp.supabase.co/functions/v1/system-health`  
**Frequência:** Verificação a cada 1 minuto (cron job)

**Estrutura do Health Check:**

```typescript
{
  "status": "healthy" | "degraded" | "down",
  "timestamp": "2025-10-09T10:30:00Z",
  "duration_ms": 45,
  "dependencies": {
    "database": {
      "status": "healthy",
      "duration_ms": 12,
      "details": "Query executed successfully"
    },
    "ixc": {
      "status": "degraded",
      "duration_ms": 3500,
      "details": "Slow response (>3s)"
    },
    "circuit_breaker": {
      "status": "unhealthy",
      "state": "open",
      "details": "Circuit breaker opened due to 5 failures",
      "failure_count": 5,
      "reopens_at": "2025-10-09T10:31:00Z"
    }
  }
}
```

**Componentes verificados:**

#### 1. Database Health
```typescript
const dbHealth = async () => {
  const start = Date.now();
  try {
    // Tenta fazer query simples
    const { data, error } = await supabase
      .from('system_health')
      .select('id')
      .limit(1);
    
    if (error) throw error;
    
    return {
      status: 'healthy',
      duration_ms: Date.now() - start
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      duration_ms: Date.now() - start,
      error: error.message
    };
  }
};
```

#### 2. IXC Health
```typescript
const ixcHealth = async () => {
  const start = Date.now();
  try {
    // Tenta fazer chamada leve ao IXC
    const response = await fetch(ixcProxyUrl, {
      method: 'POST',
      body: JSON.stringify({
        method: 'GET',
        path: '/webservice/v1/ping' // endpoint leve
      })
    });
    
    const duration = Date.now() - start;
    
    if (!response.ok) {
      return { status: 'unhealthy', duration_ms: duration };
    }
    
    if (duration > 3000) {
      return { status: 'degraded', duration_ms: duration };
    }
    
    return { status: 'healthy', duration_ms: duration };
    
  } catch (error) {
    return {
      status: 'unhealthy',
      duration_ms: Date.now() - start,
      error: error.message
    };
  }
};
```

#### 3. Circuit Breaker Health
```typescript
const circuitBreakerHealth = () => {
  const status = getCircuitBreakerStatus();
  
  return {
    status: status.state === 'closed' ? 'healthy' : 'unhealthy',
    state: status.state,
    failure_count: status.failureCount,
    reopens_at: status.state === 'open' ? 
      new Date(Date.now() + status.remainingTimeout) : null
  };
};
```

**Status HTTP retornados:**

| Status | Condição | Significado |
|--------|----------|-------------|
| **200** | Todos healthy | Sistema 100% operacional |
| **207** | Alguns degraded | Sistema funciona mas com lentidão |
| **503** | Algum unhealthy | Sistema com problemas críticos |

**Exemplo de resposta degraded (207):**
```json
{
  "status": "degraded",
  "timestamp": "2025-10-09T10:30:00Z",
  "duration_ms": 3500,
  "dependencies": {
    "database": { "status": "healthy", "duration_ms": 12 },
    "ixc": { 
      "status": "degraded", 
      "duration_ms": 3500,
      "details": "Response time > 3s"
    },
    "circuit_breaker": { "status": "healthy", "state": "closed" }
  }
}
```

**Uso em produção:**

#### 1. Monitoramento Externo
Configure um serviço de monitoramento (ex: UptimeRobot, Pingdom) para:
```
URL: https://mxdupkbpxjcfxdgrwknp.supabase.co/functions/v1/system-health
Intervalo: 1 minuto
Alerta se: status != 200
```

#### 2. Dashboard
O endpoint alimenta o dashboard `/system-metrics`:
```typescript
const loadHealthData = async () => {
  const response = await fetch(
    'https://.../functions/v1/system-health'
  );
  const health = await response.json();
  
  // Atualiza UI com status de cada componente
  setDbStatus(health.dependencies.database.status);
  setIxcStatus(health.dependencies.ixc.status);
  setCircuitBreakerStatus(health.dependencies.circuit_breaker.status);
};
```

#### 3. Alertas Automáticos
Cron job que verifica health e envia alertas:
```typescript
// Roda a cada 1 minuto
const health = await fetch('/system-health').then(r => r.json());

if (health.status === 'down') {
  // Alerta CRÍTICO
  await sendAlert({
    severity: 'CRITICAL',
    message: 'Sistema está DOWN!',
    dependencies: health.dependencies
  });
}

if (health.status === 'degraded') {
  // Alerta WARNING
  await sendAlert({
    severity: 'WARNING',
    message: 'Sistema está LENTO',
    dependencies: health.dependencies
  });
}
```

**Teste manual:**
```bash
# Via curl
curl https://mxdupkbpxjcfxdgrwknp.supabase.co/functions/v1/system-health

# Esperado quando tudo OK:
# Status: 200
# Body: {"status":"healthy", "dependencies":{...}}

# Quando há problemas:
# Status: 207 (degraded) ou 503 (down)
# Body: {"status":"degraded", "dependencies":{...}}
```

**Benefícios:**
- ✅ Detecta problemas antes dos usuários
- ✅ Facilita troubleshooting (identifica qual componente falhou)
- ✅ Permite monitoramento externo (uptime %)
- ✅ Alimenta dashboards em tempo real
- ✅ Permite criar SLAs (99.9% uptime, etc.)

**Tabela de histórico:**
```sql
CREATE TABLE system_health (
  id UUID PRIMARY KEY,
  overall_status TEXT,      -- healthy | degraded | down
  database_status TEXT,
  ixc_status TEXT,
  circuit_breaker_status TEXT,
  response_time_ms INTEGER,
  created_at TIMESTAMP
);
```

Isso permite análise histórica:
- Quantas vezes o sistema ficou down no último mês?
- Qual horário tem mais problemas?
- IXC está ficando lento em algum horário específico?

---

## 📊 Resumo: Como tudo se conecta

```
┌─────────────────────────────────────────────────────────────┐
│                      USUÁRIO FINAL                          │
│            (Cliente usando chat/WhatsApp)                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    AGENTES IA                                │
│  (routing, sales, support-tech, support-financial)          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   IXC CLIENT                                 │
│           (callIxcWithRetry + Circuit Breaker)              │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   SUCESSO    │    │    FALHA     │    │ CB ABERTO    │
│              │    │              │    │              │
│ Registra em  │    │ Registra em  │    │ Bloqueia     │
│ action_log   │    │ failed_      │    │ chamadas     │
│              │    │ actions      │    │ por 60s      │
│              │    │ (DLQ)        │    │              │
└──────────────┘    └──────────────┘    └──────────────┘
                           │
                           ▼
                  ┌──────────────┐
                  │ RETRY CRON   │
                  │ (a cada 5min)│
                  └──────────────┘
                           │
                    ┌──────┴──────┐
                    ▼             ▼
              ┌──────────┐  ┌──────────┐
              │ RESOLVEU │  │ABANDONOU │
              │          │  │(3 falhas)│
              │ resolved │  │  alerta  │
              │          │  │ CRÍTICO  │
              └──────────┘  └──────────┘

┌─────────────────────────────────────────────────────────────┐
│              HEALTH CHECK (a cada 1 min)                     │
│  ✓ Database OK?   ✓ IXC OK?   ✓ Circuit Breaker CLOSED?   │
│  → Status: 200 (healthy) / 207 (degraded) / 503 (down)     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                  ┌──────────────────────┐
                  │   DASHBOARD          │
                  │   /system-metrics    │
                  │                      │
                  │ + Alertas automáticos│
                  └──────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              TESTES E2E (antes de produção)                  │
│  → Simula usuário real do início ao fim                     │
│  → Valida toda a stack: UI → Agents → IXC → DB             │
│  → Garante que fluxos críticos funcionam                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Próximos Passos

### Prioridade CRÍTICA (antes de produção):

1. **Deploy das correções do Circuit Breaker** ⚠️
   - Código já está corrigido
   - Precisa fazer deploy para aplicar as mudanças

2. **Validar credenciais do IXC** 🔑
   - Testar: `/test-ixc-connection`
   - Confirmar que URL, username e password estão corretos

3. **Implementar testes E2E básicos** 🧪
   - Fluxo de vendas
   - Fluxo de suporte técnico
   - Estimativa: 2-3 dias

4. **Configurar Evolution API** 📱
   - Criar instância "SDR2"
   - Validar envio de WhatsApp

5. **Configurar alertas de produção** 🚨
   - Email quando sistema ficar DOWN
   - Email quando DLQ > 10 ações
   - Email quando circuit breaker abrir

### Prioridade ALTA (primeiras semanas):

6. **Monitoramento externo** 📊
   - Configurar UptimeRobot ou similar
   - Monitorar `/system-health` a cada 1 min

7. **Otimizar detecção de queda em massa** ⚡
   - Implementar cache de 15-30 min
   - Verificar batch queries no IXC

---

**Autor:** Sistema de Atendimento Inteligente  
**Data:** 2025-10-09  
**Versão:** 1.0
