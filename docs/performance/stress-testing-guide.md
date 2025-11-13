# 🔥 Guia de Stress Testing - IXC Integration

## Visão Geral

Este guia descreve como executar e interpretar stress tests na integração com IXC Soft.

## Edge Function: ixc-stress-test

### Requisitos

- `IXC_API_KEY` configurado nos secrets
- `IXC_BASE_URL` configurado nos secrets
- Permissões no Supabase para chamar edge functions

### Como Executar

```typescript
const { data, error } = await supabase.functions.invoke('ixc-stress-test', {
  body: {
    duration_seconds: 60,        // Duração total do teste
    concurrent_users: 50,        // Usuários simultâneos
    ramp_up_seconds: 10,         // Tempo para atingir pico de usuários
    endpoints: [
      '/cliente/get?id=123',
      '/cliente/buscar?cpf=12345678900',
      '/boleto/listar?cliente_id=123'
    ]
  }
});
```

### Parâmetros

| Parâmetro | Tipo | Descrição | Padrão |
|-----------|------|-----------|--------|
| `duration_seconds` | number | Duração total do teste em segundos | - |
| `concurrent_users` | number | Número de usuários simultâneos | - |
| `endpoints` | string[] | Lista de endpoints IXC para testar | - |
| `ramp_up_seconds` | number | Tempo para ramp-up (opcional) | 5 |

### Resposta

```typescript
{
  success: true,
  summary: {
    total_duration_ms: 60234,
    total_requests: 3000,
    successful: 2950,
    failed: 50,
    success_rate_percent: 98,
    requests_per_second: "49.81"
  },
  results: [
    {
      endpoint: "/cliente/get?id=123",
      total_requests: 1000,
      successful: 985,
      failed: 15,
      avg_response_time_ms: 234,
      min_response_time_ms: 120,
      max_response_time_ms: 890,
      errors: [
        { message: "HTTP 503", count: 10 },
        { message: "Timeout", count: 5 }
      ]
    }
  ]
}
```

## Interpretação dos Resultados

### Métricas Chave

**Success Rate (Taxa de Sucesso)**
- ✅ **>95%**: Excelente - Sistema resiliente
- ⚠️ **90-95%**: Aceitável - Monitorar erros
- ❌ **<90%**: Crítico - Investigar imediatamente

**Response Time (Tempo de Resposta)**
- ✅ **<500ms**: Excelente performance
- ⚠️ **500-1000ms**: Aceitável sob carga
- ❌ **>1000ms**: Lento - otimizar

**Requests per Second (RPS)**
- Depende do hardware do IXC
- Baseline típico: 50-100 RPS
- Compare com picos reais de produção

### Análise de Erros

**HTTP 503 (Service Unavailable)**
- IXC atingiu limite de capacidade
- Considerar rate limiting
- Falar com administrador IXC

**Timeout**
- Requisições lentas (>10s)
- Verificar queries pesadas
- Aumentar timeout se necessário

**HTTP 401/403**
- Problemas de autenticação
- Verificar `IXC_API_KEY`

## Cenários de Teste Recomendados

### 1. Baseline Test (Linha Base)

```typescript
{
  duration_seconds: 60,
  concurrent_users: 10,
  endpoints: ['/cliente/get?id=123']
}
```

**Objetivo:** Estabelecer métricas normais

### 2. Peak Load Test (Carga de Pico)

```typescript
{
  duration_seconds: 300,
  concurrent_users: 100,
  ramp_up_seconds: 30,
  endpoints: [
    '/cliente/get?id=123',
    '/cliente/buscar?cpf=12345678900',
    '/boleto/listar?cliente_id=123'
  ]
}
```

**Objetivo:** Simular horários de pico

### 3. Spike Test (Teste de Pico Súbito)

```typescript
{
  duration_seconds: 120,
  concurrent_users: 200,
  ramp_up_seconds: 5,
  endpoints: ['/cliente/get?id=123']
}
```

**Objetivo:** Testar resiliência a picos súbitos

### 4. Soak Test (Teste de Duração)

```typescript
{
  duration_seconds: 3600, // 1 hora
  concurrent_users: 50,
  endpoints: ['/cliente/get?id=123']
}
```

**Objetivo:** Detectar memory leaks e degradação

## Boas Práticas

### Antes do Teste

1. **Avisar administrador IXC** - Confirmar que teste não afetará produção
2. **Escolher horário apropriado** - Evitar horários de pico real
3. **Preparar rollback** - Circuit breaker deve estar configurado
4. **Baseline primeiro** - Sempre executar teste leve antes

### Durante o Teste

1. **Monitorar logs** - Acompanhar console da edge function
2. **Verificar métricas IXC** - Se possível, monitorar lado IXC
3. **Observar circuit breaker** - Não deve abrir em teste normal
4. **Atenção a alertas** - Sistema pode gerar alertas automáticos

### Depois do Teste

1. **Analisar resultados** - Comparar com baseline
2. **Documentar achados** - Registrar em `monitoring_logs`
3. **Ações corretivas** - Se necessário, ajustar configurações
4. **Comunicar equipe** - Compartilhar insights

## Troubleshooting

### Teste não inicia

- Verificar secrets `IXC_API_KEY` e `IXC_BASE_URL`
- Confirmar edge function deployada
- Checar logs do Supabase

### Alta taxa de erros

- Reduzir `concurrent_users`
- Aumentar `ramp_up_seconds`
- Verificar se IXC está funcionando normalmente

### Timeouts frequentes

- Endpoint pode ser lento naturalmente
- Verificar queries do IXC
- Aumentar timeout na função se necessário

## Métricas de Referência

### Sistema Saudável (Baseline)

```
Success Rate: 99%+
Avg Response Time: 200-400ms
Requests/sec: 50-100
Errors: <1%
```

### Sob Carga Pesada

```
Success Rate: 95%+
Avg Response Time: 500-800ms
Requests/sec: 80-150
Errors: <5%
```

### Limite Crítico

```
Success Rate: <90%
Avg Response Time: >1000ms
Circuit breaker: OPEN
Errors: >10%
```

## Registros e Auditoria

Todos os testes são registrados automaticamente em:
- Tabela: `monitoring_logs`
- Action: `ixc_stress_test_completed`
- Retention: 90 dias

Query para análise histórica:

```sql
SELECT 
  created_at,
  details->'summary'->>'success_rate_percent' as success_rate,
  details->'summary'->>'requests_per_second' as rps,
  details->'config'->>'concurrent_users' as users
FROM monitoring_logs
WHERE action = 'ixc_stress_test_completed'
ORDER BY created_at DESC
LIMIT 10;
```

## Próximos Passos

Após stress test bem-sucedido:
1. Documentar capacidade máxima IXC
2. Configurar alertas baseados em thresholds
3. Estabelecer plano de escalação
4. Agendar testes periódicos (mensais)
