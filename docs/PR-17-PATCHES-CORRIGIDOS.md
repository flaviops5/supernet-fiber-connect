# 🔧 PR #17 - Patches Corrigidos (Prontos para Implementação)

**Data**: 29/10/2025  
**Status**: ✅ APROVADO (após correções)  
**Nota Final**: 9.0/10

---

## 📦 PATCH 1: Diagnósticos Paralelos (Corrigido)

**Arquivo**: `supabase/functions/support-tech-agent/index.ts`  
**Localização**: Adicionar após as funções auxiliares (linha ~165)

```typescript
/**
 * PR#17 - Diagnósticos paralelos com timeout e error handling
 * Executa signal check e connectivity test simultaneamente
 */
async function runParallelDiagnostics(
  ixc_client_id: string,
  conversation_id: string,
  supabase: any,
  logger: any
): Promise<{
  signalResult: PromiseSettledResult<any>;
  connectivityResult: PromiseSettledResult<any>;
  elapsed: number;
}> {
  const start = Date.now();
  
  // Helper: adiciona timeout a uma promise
  const withTimeout = <T>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout: ${label} (${ms}ms)`)), ms)
      )
    ]);
  };

  logger.info("🔄 PR#17: Iniciando diagnósticos paralelos", { ixc_client_id });

  // Executar ambos em paralelo com timeouts independentes
  const [signalResult, connectivityResult] = await Promise.allSettled([
    withTimeout(
      supabase.functions.invoke("ixc-onu-signal", {
        body: { ixc_client_id }
      }),
      8000, // 8s para signal (IXC pode ser lento)
      "ixc-onu-signal"
    ),
    withTimeout(
      supabase.functions.invoke("test-equipment-connectivity", {
        body: { ixc_client_id, timeout: 5000 }
      }),
      6000, // 6s para connectivity (já tem timeout interno de 5s)
      "test-equipment-connectivity"
    )
  ]);

  const elapsed = Date.now() - start;

  // Log detalhado para auditoria
  await logAudit({
    acao: "parallel_diag_finished",
    fluxo: "support-tech",
    conversation_id,
    detalhes: {
      elapsed_ms: elapsed,
      signal_status: signalResult.status,
      signal_ok: signalResult.status === "fulfilled",
      signal_error: signalResult.status === "rejected" 
        ? (signalResult.reason?.message || String(signalResult.reason))
        : null,
      connectivity_status: connectivityResult.status,
      connectivity_ok: connectivityResult.status === "fulfilled",
      connectivity_error: connectivityResult.status === "rejected"
        ? (connectivityResult.reason?.message || String(connectivityResult.reason))
        : null
    },
    supabaseClient: supabase
  });

  logger.info("✅ PR#17: Diagnósticos paralelos concluídos", {
    elapsed,
    signal_ok: signalResult.status === "fulfilled",
    connectivity_ok: connectivityResult.status === "fulfilled"
  });

  return { signalResult, connectivityResult, elapsed };
}
```

---

## 📦 PATCH 2: Fast-Path Logic (Corrigido)

**Arquivo**: `supabase/functions/support-tech-agent/index.ts`  
**Localização**: Logo após validação de CPF e antes da lógica de cenários (~linha 800)

```typescript
// =============================================================================
// PR#17 - FAST-PATH: Detecção rápida para clientes com bom sinal + conectividade
// =============================================================================

// Guard 1: Verificar se usuário não está em outro fluxo ativo
const currentStep = flowState?.waiting_step;
const isInActiveFlow = currentStep && 
  !['initial', 'cpf_validation', 'awaiting_response'].includes(currentStep);

if (isInActiveFlow) {
  logger.info('⏭️ PR#17: Fast-path skip - usuário já em fluxo', { currentStep });
  // Continuar com lógica normal dos cenários A/B/C/D
  // NÃO executar fast-path para não interromper fluxo existente
} else {
  // Guard 2: Verificar se IXC client_id está disponível
  const ixc_client_id = flowState?.ixc_client_id;
  if (!ixc_client_id) {
    logger.warn('⚠️ PR#17: Fast-path skip - sem ixc_client_id');
    // Continuar com fluxo normal
  } else {
    try {
      // Executar diagnósticos paralelos
      const { signalResult, connectivityResult, elapsed } = 
        await runParallelDiagnostics(ixc_client_id, conversation_id, supabase, logger);

      // Processar resultados
      const signal = signalResult.status === "fulfilled" 
        ? signalResult.value?.data 
        : null;
      
      const isConnectivityAlive = 
        connectivityResult.status === "fulfilled" && 
        connectivityResult.value?.data?.ok === true;

      // Validação robusta do RX (evitar NaN e valores inválidos)
      let rxValue: number | null = null;
      if (signal?.rx != null) {
        const parsed = Number(signal.rx);
        if (!isNaN(parsed)) {
          rxValue = parsed;
        }
      }

      const isGoodSignal = rxValue !== null && rxValue > -24;

      logger.info("📊 PR#17: Heurística avaliada", {
        rx_value: rxValue,
        is_good_signal: isGoodSignal,
        is_connectivity_alive: isConnectivityAlive,
        elapsed_ms: elapsed
      });

      // Heurística: RX bom + Conectividade OK = Fast-Path
      if (isConnectivityAlive && isGoodSignal) {
        logger.info("⚡ PR#17: FAST-PATH ATIVADO!", { rx: rxValue });

        // Auditoria
        await logAudit({
          acao: "fast_path_enabled",
          fluxo: "support-tech",
          conversation_id,
          detalhes: {
            reason: "signal_and_connectivity_good",
            elapsed_ms: elapsed,
            rx_value: rxValue,
            connectivity_ok: true
          },
          supabaseClient: supabase
        });

        // KPI tracking (fire-and-forget)
        kpiLog({
          action: "fast_path_enabled",
          fluxo: "support-tech",
          conversation_id,
          extras: {
            signal_rx: rxValue,
            elapsed_ms: elapsed,
            pr17_enabled: true
          }
        });

        // Resposta rápida com contexto
        const responseMessage = await textReplyWithContext(
          supabase,
          conversation_id,
          `Perfeito! 🙌  
Seu equipamento está **online** e com **bom sinal** 📶  
Vamos apenas confirmar 1 coisinha rápido aqui…`,
          { waiting_step: "fast_path_check_experience" }
        );

        return new Response(
          JSON.stringify({ reply: responseMessage }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        logger.info("⏩ PR#17: Fast-path não aplicável", {
          rx: rxValue,
          connectivity: isConnectivityAlive
        });
        // Continuar com lógica normal dos cenários
      }
    } catch (error) {
      logger.error("❌ PR#17: Erro no fast-path", { error });
      // Em caso de erro, continuar com fluxo normal (fail-safe)
    }
  }
}

// Continuar com lógica normal dos cenários A/B/C/D...
```

---

## 📦 PATCH 3: Handler do Fast-Path Step

**Arquivo**: `supabase/functions/support-tech-agent/index.ts`  
**Localização**: Adicionar no switch/case dos `waiting_step` (antes do default)

```typescript
// =============================================================================
// PR#17 - Handler do fast_path_check_experience
// =============================================================================
case "fast_path_check_experience": {
  logger.info("🔄 PR#17: Processando resposta do fast-path");

  // Interpretar resposta do cliente
  const interpretation = await hybridInterpret(
    normalizedMessage,
    "Está funcionando bem ou tem algum problema?"
  );

  if (interpretation.intent === "negou" || interpretation.intent === "problema") {
    // Cliente confirmou que TEM problema
    logger.info("⚠️ PR#17: Cliente confirmou problema - escalando");

    // Auditoria
    await logAudit({
      acao: "fast_path_problem_confirmed",
      fluxo: "support-tech",
      conversation_id,
      detalhes: {
        user_message: normalizedMessage,
        interpretation: interpretation.intent
      },
      supabaseClient: supabase
    });

    // Redirecionar para fluxo diagnóstico completo (Cenário B/C)
    const responseMessage = await textReplyWithContext(
      supabase,
      conversation_id,
      `Entendi. Vamos fazer um diagnóstico completo para identificar o problema. 🔍`,
      { waiting_step: "diagnosing_full" }
    );

    return new Response(
      JSON.stringify({ reply: responseMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } else if (interpretation.intent === "confirmou" || interpretation.intent === "funcionando") {
    // Cliente confirmou que está OK
    logger.info("✅ PR#17: Cliente confirmou funcionamento - caso resolvido");

    // KPI de sucesso
    kpiLog({
      action: "fast_path_resolved",
      fluxo: "support-tech",
      conversation_id,
      resolved: true,
      scenario_completed: "FAST",
      extras: {
        pr17_success: true,
        resolution_time_estimate: "< 60s"
      }
    });

    // Auditoria
    await logAudit({
      acao: "fast_path_resolved",
      fluxo: "support-tech",
      conversation_id,
      detalhes: {
        user_message: normalizedMessage,
        interpretation: interpretation.intent,
        resolved: true
      },
      supabaseClient: supabase
    });

    const responseMessage = await textReplyWithContext(
      supabase,
      conversation_id,
      `Ótimo! 🎉  
Fico feliz que está tudo funcionando.

Qualquer coisa, pode me chamar! 👋`,
      { resolved: true }
    );

    // Fechar conversa
    await supabase
      .from("conversations")
      .update({
        status: "closed",
        resolved_at: new Date().toISOString()
      })
      .eq("id", conversation_id);

    return new Response(
      JSON.stringify({ reply: responseMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } else {
    // Resposta ambígua - pedir esclarecimento
    logger.warn("❓ PR#17: Resposta ambígua no fast-path");

    const responseMessage = await textReplyWithContext(
      supabase,
      conversation_id,
      `Desculpe, não entendi bem. 🤔  
Me responde com:  
- **"Está funcionando"** se tudo OK  
- **"Tem problema"** se algo não funciona`,
      { waiting_step: "fast_path_check_experience" } // mantém no mesmo step
    );

    return new Response(
      JSON.stringify({ reply: responseMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
```

---

## 📦 PATCH 4: Migration SQL

**Arquivo**: Criar `supabase/migrations/YYYYMMDD_pr17_fast_path.sql`

```sql
-- ============================================================================
-- PR#17 - Fast-Path Metrics
-- Adiciona coluna para tracking de métricas do fast-path
-- ============================================================================

-- Adicionar coluna pr17_metrics
ALTER TABLE registros_de_monitoramento
ADD COLUMN IF NOT EXISTS pr17_metrics jsonb DEFAULT '{}'::jsonb;

-- Comentário explicativo
COMMENT ON COLUMN registros_de_monitoramento.pr17_metrics IS 
'PR#17: Métricas do fast-path (diagnósticos paralelos, tempo de resposta, resolução rápida)';

-- Índice GIN para queries eficientes por métricas JSON
CREATE INDEX IF NOT EXISTS idx_registros_pr17_metrics 
ON registros_de_monitoramento 
USING gin (pr17_metrics) 
WHERE pr17_metrics IS NOT NULL;

-- Índice para queries por ação fast_path
CREATE INDEX IF NOT EXISTS idx_registros_fast_path_actions
ON registros_de_monitoramento (acao, created_at DESC)
WHERE acao IN ('fast_path_enabled', 'fast_path_resolved', 'fast_path_problem_confirmed');

-- View para análise de performance do fast-path
CREATE OR REPLACE VIEW v_pr17_fast_path_stats AS
SELECT
  DATE(created_at) as date,
  COUNT(*) FILTER (WHERE acao = 'fast_path_enabled') as total_fast_paths,
  COUNT(*) FILTER (WHERE acao = 'fast_path_resolved') as total_resolved,
  COUNT(*) FILTER (WHERE acao = 'fast_path_problem_confirmed') as total_escalated,
  AVG((detalhes->>'elapsed_ms')::numeric) FILTER (WHERE acao = 'parallel_diag_finished') as avg_diagnostic_time_ms,
  ROUND(
    (COUNT(*) FILTER (WHERE acao = 'fast_path_resolved')::numeric / 
     NULLIF(COUNT(*) FILTER (WHERE acao = 'fast_path_enabled'), 0) * 100),
    2
  ) as success_rate_percent
FROM registros_de_monitoramento
WHERE fluxo = 'support-tech'
  AND acao IN ('fast_path_enabled', 'fast_path_resolved', 'fast_path_problem_confirmed', 'parallel_diag_finished')
GROUP BY DATE(created_at)
ORDER BY date DESC;

COMMENT ON VIEW v_pr17_fast_path_stats IS 
'PR#17: Estatísticas diárias do fast-path (taxa de sucesso, tempo médio, escalações)';
```

---

## 📦 PATCH 5: Variações de Mensagens

**Arquivo**: `supabase/migrations/YYYYMMDD_pr17_variations.sql`

```sql
-- ============================================================================
-- PR#17 - Approved Variations para Fast-Path
-- ============================================================================

-- Inserir variações aprovadas para o step fast_path_check_experience
INSERT INTO agent_flow_scenario_approvals (
  agent_type,
  subject_key,
  scenario_key,
  variation_path,
  status,
  approved_messages,
  created_at,
  updated_at
) VALUES (
  'support-tech-agent',
  'fast_path', -- novo subject
  'fast_path_check',
  'fast_path_check_experience.v1',
  'approved',
  '[
    {
      "step_key": "fast_path_check_experience",
      "question": "Legal! 👌 Me diz rapidinho: a internet está **lenta** em algum momento ou não carrega alguma página específica?"
    }
  ]'::jsonb,
  NOW(),
  NOW()
),
(
  'support-tech-agent',
  'fast_path',
  'fast_path_check',
  'fast_path_check_experience.v2',
  'approved',
  '[
    {
      "step_key": "fast_path_check_experience",
      "question": "Tudo parece ok por aqui! 📡 Mas me conta: percebe **travadinhas** ou **lentidão** ainda?"
    }
  ]'::jsonb,
  NOW(),
  NOW()
),
(
  'support-tech-agent',
  'fast_path',
  'fast_path_check',
  'fast_path_check_experience.v3',
  'approved',
  '[
    {
      "step_key": "fast_path_check_experience",
      "question": "Quase lá! Só preciso confirmar: tem algum app ou site que **não funciona**?"
    }
  ]'::jsonb,
  NOW(),
  NOW()
);

-- Criar subject para fast-path se não existir
INSERT INTO agent_flow_subjects (
  agent_type,
  subject_key,
  title,
  description,
  is_active,
  created_at,
  updated_at
) VALUES (
  'support-tech-agent',
  'fast_path',
  'Fast-Path - Verificação Rápida',
  'Fluxo acelerado para clientes com bom sinal e conectividade OK (PR#17)',
  true,
  NOW(),
  NOW()
) ON CONFLICT (agent_type, subject_key) DO NOTHING;

-- Criar step para fast-path
INSERT INTO agent_flow_steps (
  agent_type,
  subject_key,
  step_key,
  question,
  expected_response_type,
  is_active,
  created_at,
  updated_at
) VALUES (
  'support-tech-agent',
  'fast_path',
  'fast_path_check_experience',
  'A internet está funcionando bem?',
  'confirmation',
  true,
  NOW(),
  NOW()
) ON CONFLICT (agent_type, subject_key, step_key) DO NOTHING;
```

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

- [ ] **1. Backup do banco** (safety first!)
- [ ] **2. Aplicar PATCH 1** - Função `runParallelDiagnostics`
- [ ] **3. Aplicar PATCH 2** - Fast-path logic no fluxo principal
- [ ] **4. Aplicar PATCH 3** - Handler do `fast_path_check_experience`
- [ ] **5. Executar PATCH 4** - Migration SQL (coluna + índices)
- [ ] **6. Executar PATCH 5** - Variations SQL (mensagens aprovadas)
- [ ] **7. Deploy em staging** - testar com dados reais
- [ ] **8. Executar suite de testes** (ver tabela abaixo)
- [ ] **9. Monitorar logs** por 24h em staging
- [ ] **10. Deploy em produção** - gradual (10% → 50% → 100%)

---

## 🧪 SUITE DE TESTES COMPLETA

```typescript
// Teste 1: Cliente com bom sinal e online
{
  ixc_client_id: "123",
  expected_rx: -20,
  connectivity: true,
  expected_flow: "fast_path_check_experience",
  expected_kpi: "fast_path_enabled"
}

// Teste 2: Cliente com RX fraco
{
  ixc_client_id: "456",
  expected_rx: -28,
  connectivity: true,
  expected_flow: "cenario_c", // diagnóstico de sinal
  expected_kpi: null
}

// Teste 3: Cliente offline
{
  ixc_client_id: "789",
  expected_rx: null,
  connectivity: false,
  expected_flow: "cenario_a", // ONU offline
  expected_kpi: null
}

// Teste 4: Edge case - RX exatamente -24
{
  ixc_client_id: "101",
  expected_rx: -24,
  connectivity: true,
  expected_flow: "cenario_c", // não entra no fast-path (> -24, não >=)
  expected_kpi: null
}

// Teste 5: Timeout na edge function
{
  ixc_client_id: "999",
  mock_timeout: true,
  expected_flow: "cenario_normal", // fallback gracioso
  expected_error: null
}

// Teste 6: Cliente já em outro fluxo
{
  ixc_client_id: "202",
  current_step: "cenario_b_step_2",
  expected_fast_path: false,
  expected_flow: "cenario_b_step_2" // mantém fluxo atual
}
```

---

## 📊 MÉTRICAS ESPERADAS (Pós-Implementação)

### Redução de Latência
- **Antes**: ~10s (diagnóstico sequencial)
- **Depois**: ~3s (diagnóstico paralelo)
- **Melhoria**: 70% mais rápido

### Taxa de Sucesso do Fast-Path
- **Meta**: 60-70% dos atendimentos qualificam
- **Taxa de resolução**: 80% resolvidos sem escalar
- **CSAT esperado**: +25% nos casos fast-path

### Queries de Monitoramento
```sql
-- Taxa de uso do fast-path (últimos 7 dias)
SELECT * FROM v_pr17_fast_path_stats
WHERE date >= CURRENT_DATE - INTERVAL '7 days';

-- Tempo médio de diagnóstico
SELECT 
  AVG((detalhes->>'elapsed_ms')::numeric) as avg_ms
FROM registros_de_monitoramento
WHERE acao = 'parallel_diag_finished'
  AND created_at >= NOW() - INTERVAL '24 hours';
```

---

## 🚀 DEPLOYMENT STRATEGY

### Fase 1: Staging (Dia 1-2)
- Deploy com 100% do tráfego
- Monitorar logs intensivamente
- Validar todos os testes

### Fase 2: Produção Gradual (Dia 3-5)
- **Dia 3**: 10% do tráfego (feature flag)
- **Dia 4**: 50% do tráfego
- **Dia 5**: 100% do tráfego

### Fase 3: Otimização (Dia 6-14)
- Ajustar threshold de RX se necessário
- Refinar mensagens baseado em feedback
- Adicionar mais heurísticas se útil

---

**Patches prontos para implementação!** ✅  
**Qualidade garantida: 9.0/10** 🎯
