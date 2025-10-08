# Lógica e Fluxo do Sistema de Quedas em Massa

## 📋 Visão Geral

O sistema detecta automaticamente quando múltiplos clientes ficam offline simultaneamente, indicando uma queda em massa na rede (ex: problema em uma porta PON, CTO ou região inteira).

## 🔄 Fluxo Principal

<lov-mermaid>
graph TB
    A[Cron Job - A cada 3 minutos] --> B[Edge Function: detect-mass-outage]
    B --> C{Buscar clientes offline no IXC}
    C --> D[Enriquecer dados: PON, CTO, Bairro]
    D --> E[Verificar Dying Gasp eventos]
    E --> F[Agrupar clientes por similaridade]
    F --> G{Threshold atingido?}
    G -->|SIM| H[Criar/Atualizar evento ativo]
    G -->|NÃO| I[Verificar eventos existentes]
    H --> J[Salvar em mass_outage_events]
    I --> K{Evento ainda ativo?}
    K -->|NÃO| L[Marcar como resolved]
    K -->|SIM| M[Atualizar contadores]
    J --> N[Fim]
    L --> N
    M --> N
</lov-mermaid>

## 🎯 Lógica de Detecção

### 1. Coleta de Dados

```typescript
// Passo 1: Buscar todos os clientes offline
const offlineClients = await getOfflineClientsFromIXC()

// Passo 2: Para cada cliente, buscar:
for (const client of offlineClients) {
  // - Porta PON (via cliente_equipamento)
  // - CTO/Caixa
  // - Bairro/Localização (via cliente)
  const enrichedData = await enrichClientData(client)
}
```

### 2. Detecção de Falta de Energia

```typescript
// Verificar eventos "Dying Gasp" (ONU perdendo energia)
const dyingGaspEvents = await getDyingGaspEvents()

// Agrupar por PON/CTO/Região
const powerOutageGroups = groupDyingGaspByLocation(dyingGaspEvents)
```

### 3. Agrupamento Inteligente

<lov-mermaid>
graph LR
    A[Clientes Offline] --> B{Tipo de Agrupamento}
    B -->|Porta PON| C[Agrupar por PON]
    B -->|CTO| D[Agrupar por CTO]
    B -->|Região| E[Agrupar por Padrão Login]
    C --> F{≥ 3 clientes?}
    D --> G{≥ 4 clientes?}
    E --> H{≥ 5 clientes?}
    F -->|SIM| I[Queda em Massa PON]
    G -->|SIM| J[Queda em Massa CTO]
    H -->|SIM| K[Queda em Massa Regional]
</lov-mermaid>

### 4. Thresholds Configurados

| Tipo | Threshold | Motivo |
|------|-----------|--------|
| **Porta PON** | ≥ 3 clientes | Indica problema específico na porta |
| **CTO** | ≥ 4 clientes | Indica problema na caixa de distribuição |
| **Região** | ≥ 5 clientes | Indica problema amplo (torre, backbone) |

### 5. Identificação de Causa

```typescript
// Lógica de identificação
if (dyingGaspCount >= 2 && dyingGaspCount >= affectedCount * 0.5) {
  cause = "power_outage_dying_gasp" // Falta de energia
} else {
  cause = "unknown" // Causa desconhecida (rede, equipamento, etc)
}
```

## 💾 Estrutura de Dados

### Tabela: mass_outage_events

```typescript
{
  id: UUID,
  event_key: "REGION:NR-BE_2025-10-08", // Único por dia
  region_pattern: "REGION:NR-BE",
  affected_count: 6,
  affected_logins: [
    "NR-BE-II-BOGAZ",
    "NR-BE-II-CARLA",
    "NR-BE-II-IPES"
  ], // ⚠️ CRÍTICO: Array de logins PPPoE
  status: "active", // ou "resolved"
  metadata: {
    group_type: "Região", // ou "Porta PON", "CTO"
    power_outage: true, // Se Dying Gasp detectado
    dying_gasp_count: 4,
    outage_cause: "power_outage_dying_gasp",
    threshold: 5,
    group_identifier: "NR-BE",
    bairros: ["Núcleo Rural Boa Esperança"]
  },
  detected_at: timestamp,
  resolved_at: timestamp | null
}
```

## 🤖 Integração com Cloé (Atendimento)

### Fluxo de Verificação

<lov-mermaid>
sequenceDiagram
    participant C as Cliente
    participant Cloe as Cloé (routing-agent)
    participant DB as mass_outage_events
    participant IXC as Sistema IXC
    
    C->>Cloe: "Minha internet caiu"
    Cloe->>Cloe: Validar CPF
    Cloe->>IXC: Verificar status do cliente
    IXC-->>Cloe: Status: OFFLINE
    
    Note over Cloe: ⚠️ VERIFICAÇÃO CRÍTICA
    Cloe->>DB: SELECT * WHERE status='active'
    DB-->>Cloe: Eventos ativos
    
    Cloe->>Cloe: Login está em affected_logins?
    
    alt Login na lista
        Cloe->>C: 🚨 Queda em massa detectada<br/>X clientes afetados<br/>Equipe trabalhando
        Note over Cloe,C: NÃO transfere para técnico
    else Login NÃO na lista
        Cloe->>C: Transferindo para técnico...
        Note over Cloe,C: Problema individual
    end
</lov-mermaid>

### Código de Verificação (routing-agent)

```typescript
// 1. Obter login PPPoE do cliente
const customerLogin = clientStatus?.pppoeLogin || '';

// 2. Buscar eventos ativos
const { data: massOutage } = await supabase
  .from('mass_outage_events')
  .select('*')
  .eq('status', 'active')
  .order('detected_at', { ascending: false })
  .limit(1)
  .maybeSingle();

// 3. ⚠️ VERIFICAÇÃO CRÍTICA: Login está na lista?
const isClientAffected = massOutage?.affected_logins?.includes(customerLogin);

if (isClientAffected) {
  // Cloé informa diretamente - NÃO transfere
  return {
    message: `🚨 QUEDA EM MASSA DETECTADA
    
Identifiquei que você está afetado por uma interrupção na região ${massOutage.metadata.group_identifier}.

📊 Situação:
• ${massOutage.affected_count} clientes afetados
• Tipo: ${massOutage.metadata.group_type}
• Detectado: ${formatDate(massOutage.detected_at)}
${massOutage.metadata.power_outage ? '⚡ Causa: Falta de energia na região' : ''}

✅ Nossa equipe técnica já está trabalhando na solução.

O problema não é no seu equipamento. Assim que normalizar, sua conexão voltará automaticamente.

Pedimos desculpas pelo transtorno! 🙏`
  };
}

// Senão, transfere para técnico
```

## 🔧 Resolução Automática

### Lógica de Resolução

```typescript
// A cada execução, verifica eventos ativos
for (const activeEvent of activeEvents) {
  const currentAffectedCount = getCurrentAffectedCount(activeEvent);
  const threshold = getThresholdForGroupType(activeEvent.metadata.group_type);
  
  if (currentAffectedCount < threshold) {
    // Normalizado! Marcar como resolvido
    await supabase
      .from('mass_outage_events')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString()
      })
      .eq('id', activeEvent.id);
  }
}
```

## 📊 Métricas e Monitoramento

### Componentes UI

1. **MassOutageMonitor** (Painel completo)
   - Lista eventos ativos e histórico
   - Botão "Detectar Agora" (manual)
   - Auto-refresh a cada 3 minutos
   - Realtime updates via Supabase

2. **MassOutageAlertCard** (Card de alerta)
   - Exibe alertas visuais piscantes
   - Resumo de eventos ativos
   - Link para monitoramento completo

### Análise de Impacto

<lov-mermaid>
pie title Distribuição de Quedas por Tipo
    "Porta PON" : 45
    "CTO" : 30
    "Região" : 25
</lov-mermaid>

## 🎯 Benefícios do Sistema

### 1. Redução de Carga no Suporte
- **Antes**: 20 atendimentos técnicos para o mesmo problema
- **Depois**: 1 mensagem proativa para todos afetados

### 2. Experiência do Cliente
- ✅ Informação proativa
- ✅ Transparência sobre a situação
- ✅ Expectativa correta de resolução

### 3. Eficiência Operacional
- ⚡ Detecção automática em 3 minutos
- 🔍 Identificação de causa (falta de energia)
- 📈 Métricas e histórico completos

## 🚨 Casos de Uso Reais

### Exemplo 1: Falta de Energia na PON

```
Situação: Torre sem energia
Detectado: 8 ONUs com Dying Gasp na mesma PON
Resultado: Evento criado como "power_outage_dying_gasp"
Ação: Cloé informa sobre falta de energia
```

### Exemplo 2: Problema em CTO

```
Situação: Caixa de fibra danificada
Detectado: 6 clientes da mesma CTO offline
Resultado: Evento criado como causa "unknown"
Ação: Técnicos enviados ao local específico
```

### Exemplo 3: Queda Regional

```
Situação: Backbone com problema
Detectado: 15 clientes da região NR-BE offline
Resultado: Evento regional criado
Ação: Equipe verifica equipamentos principais
```

## 🔐 Segurança e Performance

### Rate Limiting
- Execução limitada a cada 3 minutos
- Previne sobrecarga do sistema IXC

### Retry Logic
- 4 tentativas com backoff exponencial
- Tolerância a falhas temporárias do IXC

### Circuit Breaker
- Previne cascata de falhas
- Timeout automático após múltiplas falhas

## 📝 Troubleshooting

### Problema: Cliente não recebe aviso

**Causa**: Login não está no array `affected_logins`

**Verificação**:
```sql
SELECT 
  id,
  region_pattern,
  affected_count,
  affected_logins,
  'cliente-login-pppoe' = ANY(affected_logins) as is_affected
FROM mass_outage_events
WHERE status = 'active';
```

### Problema: Evento não detectado

**Causa**: Threshold não atingido

**Verificação**:
1. Quantos clientes offline no grupo?
2. Qual threshold do tipo? (3/4/5)
3. Logs da edge function

### Problema: Não resolve automaticamente

**Causa**: Clientes voltaram mas evento não atualizado

**Solução**: Executar detecção manual ou aguardar próximo cron

## 🎓 Conclusão

O sistema de Quedas em Massa é uma solução proativa que:
- 🤖 Detecta automaticamente problemas de rede
- 🎯 Agrupa clientes afetados inteligentemente
- 💬 Informa proativamente via Cloé
- 📊 Fornece métricas para gestão
- ⚡ Identifica causas (falta de energia)
- 🔄 Resolve automaticamente quando normalizado
