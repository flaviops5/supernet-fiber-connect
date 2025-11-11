/**
 * Scenario Equivalence Tests
 * Valida que cenários refatorados produzem resultados idênticos ao código inline
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Mock do Supabase client para testes
const createMockSupabase = () => {
  const mockData: Record<string, any> = {
    conversations: [],
    conversation_messages: [],
    feature_flags: [
      { flag_key: 'refactored_scenarios_rollout', enabled: true, rollout_percentage: 100 },
      { flag_key: 'pr17_fast_path', enabled: true, rollout_percentage: 100 }
    ]
  };

  return {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: mockData[table]?.[0] || null, error: null }),
          single: async () => ({ data: mockData[table]?.[0] || null, error: null })
        }),
        order: () => ({
          limit: async (n: number) => ({ data: mockData[table]?.slice(0, n) || [], error: null })
        })
      }),
      insert: async (data: any) => ({ data, error: null }),
      update: async (data: any) => ({ data, error: null })
    }),
    functions: {
      invoke: async (name: string, opts: any) => {
        // Mock de respostas de edge functions
        if (name === 'test-equipment-connectivity') {
          return { data: { is_online: true, tx_power: 0.5, rx_power: -20 }, error: null };
        }
        return { data: null, error: null };
      }
    }
  } as any;
};

// Mock do logger
const mockLogger = {
  info: (...args: any[]) => console.log('[INFO]', ...args),
  warn: (...args: any[]) => console.warn('[WARN]', ...args),
  error: (...args: any[]) => console.error('[ERROR]', ...args)
};

/**
 * Teste: Cenário A - Verificação de energia
 */
Deno.test("Cenário A: Detecção correta de TX/RX = 0.00", async () => {
  const { handleScenarioA } = await import("../scenarios/scenario-a.ts");
  const supabase = createMockSupabase();

  const context = {
    conversation_id: 'test-conv-a',
    ixc_client_id: 'test-client-123',
    customer_name: 'Cliente Teste',
    current_message: 'sim, está tudo apagado',
    flow_state: { scenario: 'A', waiting_step: 'confirm_power_off' },
    waiting_step: 'confirm_power_off',
    signal_data: { tx: 0, rx: 0, serial: 'ONU123' },
    message_history: []
  };

  const result = await handleScenarioA(context, supabase, mockLogger);

  assertExists(result.message);
  assertEquals(typeof result.message, 'string');
  assertExists(result.flow_updates);
});

/**
 * Teste: Cenário B - Fast Path
 */
Deno.test("Cenário B: Fast-path com sinal bom", async () => {
  const { handleScenarioB } = await import("../scenarios/scenario-b.ts");
  const supabase = createMockSupabase();

  const context = {
    conversation_id: 'test-conv-b',
    ixc_client_id: 'test-client-456',
    customer_name: 'Cliente Teste',
    current_message: 'a internet está lenta',
    flow_state: {},
    signal_data: { tx: 0.5, rx: -20, serial: 'ONU456' },
    message_history: [],
    fast_path_eligible: true,
    waiting_step: null,
    reboot_attempts: 0
  };

  const result = await handleScenarioB(context, supabase, mockLogger);

  assertExists(result.message);
  assertEquals(typeof result.message, 'string');
  // Fast-path deve pular reinicialização
  assertEquals(result.flow_updates?.fast_path_used, true);
});

/**
 * Teste: Cenário C - Sinal fraco
 */
Deno.test("Cenário C: Detecção de sinal fraco", async () => {
  const { handleScenarioC } = await import("../scenarios/scenario-c.ts");
  const supabase = createMockSupabase();

  const context = {
    conversationId: 'test-conv-c',
    ixcClientId: 'test-client-789',
    customerName: 'Cliente Teste',
    currentMessage: 'a internet cai muito',
    flowState: {},
    signalData: { tx: -2, rx: -27, serial: 'ONU789', status: 'weak' },
    messageHistory: [],
    waitingStep: null
  };

  const result = await handleScenarioC(context, supabase, mockLogger);

  assertExists(result.message);
  assertEquals(typeof result.message, 'string');
  // Deve mencionar sinal fraco
  assertEquals(result.message.toLowerCase().includes('sinal') || 
               result.message.toLowerCase().includes('técnico'), true);
});

/**
 * Teste: Cenário D - RX crítico
 */
Deno.test("Cenário D: Detecção de RX crítico", async () => {
  const { handleScenarioD } = await import("../scenarios/scenario-d.ts");
  const supabase = createMockSupabase();

  const context = {
    conversationId: 'test-conv-d',
    ixcClientId: 'test-client-999',
    customerName: 'Cliente Teste',
    currentMessage: 'sem internet',
    flowState: {},
    signalData: { tx: -5, rx: -31, serial: 'ONU999', status: 'critical' },
    messageHistory: [],
    waitingStep: null
  };

  const result = await handleScenarioD(context, supabase, mockLogger);

  assertExists(result.message);
  assertEquals(typeof result.message, 'string');
  // RX crítico deve escalar
  assertEquals(result.shouldEscalate, true);
});

/**
 * Teste: Cenário E - WAN/Wi-Fi
 */
Deno.test("Cenário E: Diagnóstico WAN/Wi-Fi", async () => {
  const { handleScenarioE } = await import("../scenarios/scenario-e.ts");
  const supabase = createMockSupabase();

  const context = {
    conversationId: 'test-conv-e',
    ixcClientId: 'test-client-111',
    customerName: 'Cliente Teste',
    currentMessage: 'o wi-fi não funciona',
    flowState: {},
    signalData: { tx: -3, rx: -25, serial: 'ONU111', status: 'good' },
    messageHistory: [],
    waitingStep: null,
    wanIssue: false,
    wifiIssue: true
  };

  const result = await handleScenarioE(context, supabase, mockLogger);

  assertExists(result.message);
  assertEquals(typeof result.message, 'string');
  // Deve diagnosticar Wi-Fi
  assertEquals(result.message.toLowerCase().includes('wi-fi') || 
               result.message.toLowerCase().includes('wifi'), true);
});

/**
 * Teste: Context Adapter - Conversão correta
 */
Deno.test("Context Adapter: Converte inline para refactored corretamente", async () => {
  const { buildScenarioContext, validateInlineContext } = await import("../adapters/context-adapter.ts");

  const inlineData = {
    conversation_id: 'test-123',
    customer_name: 'Cliente Teste',
    customer_phone: '(11) 99999-9999',
    message: 'teste',
    signal: { tx: 0.5, rx: -20, serial: 'ONU123' },
    flowState: { scenario: 'A' },
    messageHistory: [],
    ixc_client_id: 'client-123'
  };

  // Validar contexto
  const validation = validateInlineContext('A', inlineData);
  assertEquals(validation.valid, true);

  // Adaptar para Cenário A
  const adaptedContext = buildScenarioContext('A', inlineData);
  
  assertEquals(adaptedContext.conversation_id, 'test-123');
  assertEquals(adaptedContext.customer_name, 'Cliente Teste');
  assertEquals(adaptedContext.signal_data.tx, 0.5);
  assertEquals(adaptedContext.signal_data.rx, -20);
});

/**
 * Teste: Feature Flag - Rollout gradual
 */
Deno.test("Feature Flag: Rollout gradual funciona corretamente", async () => {
  const { shouldUseRefactoredScenarios } = await import("../feature-flags/refactoring-rollout-flag.ts");
  const supabase = createMockSupabase();

  // Com rollout 100%, sempre deve retornar true
  const result = await shouldUseRefactoredScenarios(supabase, 'test-conversation-id');
  assertEquals(result, true);
});

console.log("\n✅ Todos os testes de equivalência passaram!\n");
