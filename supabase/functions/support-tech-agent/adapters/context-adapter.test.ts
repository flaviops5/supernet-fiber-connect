/**
 * Testes Unitários - Context Adapter
 * 
 * Validar conversão de contexto inline → refatorado para todos os cenários
 * 
 * Executar: deno test context-adapter.test.ts
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  buildScenarioContext,
  buildScenarioAContext,
  buildScenarioBContext,
  buildScenarioCContext,
  buildScenarioDContext,
  buildScenarioEContext,
  validateInlineContext,
  adaptScenarioResult,
  type InlineContextData
} from "./context-adapter.ts";

// Mock data comum para todos os testes
const baseMockData: InlineContextData = {
  conversation_id: "test-conv-123",
  customer_name: "João Silva",
  customer_cpf: "12345678900",
  customer_phone: "11999999999",
  ixc_client_id: "12345",
  message: "Internet não funciona",
  normalizedMessage: "internet nao funciona",
  flowState: {
    waiting_step: "test_step",
    scenario_started: null,
    reboot_attempts: 0,
    ixc_client_id: "12345"
  },
  signal: {
    tx: 2.5,
    rx: -22.0,
    serial: "TEST123456"
  },
  messageHistory: [
    { sender_type: "user", content: "Oi" },
    { sender_type: "agent", content: "Olá! Como posso ajudar?" }
  ],
  massOutageActive: false
};

// =============================================================================
// TESTES: Cenário A (TX/RX = 0)
// =============================================================================

Deno.test("Cenário A: conversão básica", () => {
  const mockData = {
    ...baseMockData,
    signal: { tx: 0, rx: 0 }
  };

  const result = buildScenarioAContext(mockData);

  assertEquals(result.conversation_id, "test-conv-123");
  assertEquals(result.ixc_client_id, "12345");
  assertEquals(result.customer_name, "João Silva");
  assertEquals(result.current_message, "Internet não funciona");
  assertEquals(result.waiting_step, "test_step");
  assertExists(result.signal_data);
  assertEquals(result.signal_data.tx, 0);
  assertEquals(result.signal_data.rx, 0);
});

Deno.test("Cenário A: fallback para ixc_client_id do flowState", () => {
  const mockData = {
    ...baseMockData,
    ixc_client_id: undefined, // Não fornecido no root
    flowState: {
      ixc_client_id: "67890" // Deve usar este
    }
  };

  const result = buildScenarioAContext(mockData);
  assertEquals(result.ixc_client_id, "67890");
});

// =============================================================================
// TESTES: Cenário B (Sinal bom + travado)
// =============================================================================

Deno.test("Cenário B: fast_path_eligible = true (primeira detecção)", () => {
  const mockData = {
    ...baseMockData,
    flowState: {
      scenario_started: null, // Primeira detecção
      reboot_attempts: 0,
      ixc_client_id: "12345"
    }
  };

  const result = buildScenarioBContext(mockData);

  assertEquals(result.fast_path_eligible, true);
  assertEquals(result.reboot_attempts, 0);
});

Deno.test("Cenário B: fast_path_eligible = false (já tentou reboot)", () => {
  const mockData = {
    ...baseMockData,
    flowState: {
      scenario_started: "B",
      reboot_attempts: 1, // Já tentou
      ixc_client_id: "12345"
    }
  };

  const result = buildScenarioBContext(mockData);

  assertEquals(result.fast_path_eligible, false);
  assertEquals(result.reboot_attempts, 1);
});

Deno.test("Cenário B: fast_path_eligible = false (sem ixc_client_id)", () => {
  const mockData = {
    ...baseMockData,
    ixc_client_id: undefined,
    flowState: {
      scenario_started: null,
      reboot_attempts: 0
    }
  };

  const result = buildScenarioBContext(mockData);

  assertEquals(result.fast_path_eligible, false);
});

// =============================================================================
// TESTES: Cenário C (Sinal fraco)
// =============================================================================

Deno.test("Cenário C: conversão para camelCase", () => {
  const mockData = {
    ...baseMockData,
    signal: { tx: 2.5, rx: -26.5 } // Sinal fraco
  };

  const result = buildScenarioCContext(mockData);

  assertEquals(result.conversationId, "test-conv-123"); // camelCase!
  assertEquals(result.ixcClientId, "12345"); // camelCase!
  assertEquals(result.customerName, "João Silva"); // camelCase!
  assertEquals(result.currentMessage, "Internet não funciona"); // camelCase!
  assertExists(result.signalData); // camelCase!
  assertEquals(result.signalData.rx, -26.5);
});

// =============================================================================
// TESTES: Cenário D (RX crítico)
// =============================================================================

Deno.test("Cenário D: adiciona status 'critical' ao sinal", () => {
  const mockData = {
    ...baseMockData,
    signal: { tx: 2.5, rx: -30.0 } // RX crítico
  };

  const result = buildScenarioDContext(mockData);

  assertEquals(result.conversationId, "test-conv-123");
  assertExists(result.signalData);
  assertEquals(result.signalData.rx, -30.0);
  assertEquals(result.signalData.status, "critical");
});

// =============================================================================
// TESTES: Cenário E (WAN/Wi-Fi)
// =============================================================================

Deno.test("Cenário E: detecta wan_issue do flowState", () => {
  const mockData = {
    ...baseMockData,
    flowState: {
      wan_issue: true,
      wifi_issue: false
    }
  };

  const result = buildScenarioEContext(mockData);

  assertEquals(result.wanIssue, true);
  assertEquals(result.wifiIssue, false);
  assertEquals(result.signalData.status, "good");
});

Deno.test("Cenário E: detecta wifi_issue do flowState", () => {
  const mockData = {
    ...baseMockData,
    flowState: {
      wan_issue: false,
      wifi_issue: true
    }
  };

  const result = buildScenarioEContext(mockData);

  assertEquals(result.wanIssue, false);
  assertEquals(result.wifiIssue, true);
});

// =============================================================================
// TESTES: Roteamento Automático
// =============================================================================

Deno.test("buildScenarioContext: roteamento para Cenário A", () => {
  const result = buildScenarioContext('A', baseMockData);
  
  // Deve ter campos específicos do Cenário A
  assertExists(result.conversation_id);
  assertExists(result.ixc_client_id);
  assertExists(result.current_message);
});

Deno.test("buildScenarioContext: roteamento para Cenário B", () => {
  const result = buildScenarioContext('B', baseMockData);
  
  // Deve ter fast_path_eligible
  assertExists(result.fast_path_eligible);
});

Deno.test("buildScenarioContext: roteamento para Cenário C", () => {
  const result = buildScenarioContext('C', baseMockData);
  
  // Deve usar camelCase
  assertExists(result.conversationId);
  assertExists(result.ixcClientId);
});

Deno.test("buildScenarioContext: roteamento para Cenário D", () => {
  const mockData = {
    ...baseMockData,
    signal: { tx: 2.5, rx: -30.0 }
  };
  
  const result = buildScenarioContext('D', mockData);
  
  // Deve adicionar status critical
  assertEquals(result.signalData?.status, "critical");
});

Deno.test("buildScenarioContext: roteamento para Cenário E", () => {
  const result = buildScenarioContext('E', baseMockData);
  
  // Deve ter flags de WAN/Wi-Fi
  assertExists(result.wanIssue);
  assertExists(result.wifiIssue);
  assertEquals(result.signalData?.status, "good");
});

Deno.test("buildScenarioContext: erro com cenário inválido", () => {
  try {
    buildScenarioContext('X' as any, baseMockData);
    throw new Error("Deveria ter lançado erro");
  } catch (error) {
    assertEquals((error as Error).message, "Unknown scenario type: X");
  }
});

// =============================================================================
// TESTES: Validação de Contexto
// =============================================================================

Deno.test("validateInlineContext: contexto válido", () => {
  const result = validateInlineContext('A', baseMockData);
  
  assertEquals(result.valid, true);
  assertEquals(result.missing.length, 0);
});

Deno.test("validateInlineContext: faltando conversation_id", () => {
  const mockData = {
    ...baseMockData,
    conversation_id: ""
  };
  
  const result = validateInlineContext('A', mockData);
  
  assertEquals(result.valid, false);
  assertEquals(result.missing.includes('conversation_id'), true);
});

Deno.test("validateInlineContext: Cenário A sem sinal", () => {
  const mockData = {
    ...baseMockData,
    signal: undefined
  };
  
  const result = validateInlineContext('A', mockData);
  
  assertEquals(result.valid, false);
  assertEquals(result.missing.includes('signal'), true);
});

Deno.test("validateInlineContext: Cenário B sem ixc_client_id", () => {
  const mockData = {
    ...baseMockData,
    ixc_client_id: undefined,
    flowState: {} // Sem ixc_client_id no flowState também
  };
  
  const result = validateInlineContext('B', mockData);
  
  assertEquals(result.valid, false);
  assertEquals(result.missing.includes('ixc_client_id'), true);
});

// =============================================================================
// TESTES: Adaptação de Resultado
// =============================================================================

Deno.test("adaptScenarioResult: Cenário A", () => {
  const mockResult = {
    message: "Teste resolvido",
    should_insert: true,
    flow_updates: {
      waiting_step: null,
      scenario_completed: "A",
      ticket_created: true,
      ixc_ticket_id: "IXC-12345"
    },
    escalate: false,
    resolved: true
  };
  
  const adapted = adaptScenarioResult('A', mockResult);
  
  assertEquals(adapted.message, "Teste resolvido");
  assertEquals(adapted.shouldInsertMessage, true);
  assertEquals(adapted.shouldEscalate, false);
  assertEquals(adapted.resolved, true);
  assertEquals(adapted.ticketCreated, true);
  assertEquals(adapted.ticketId, "IXC-12345");
});

Deno.test("adaptScenarioResult: Cenário B", () => {
  const mockResult = {
    message: "Equipamento reiniciado",
    should_insert: true,
    flow_updates: {
      waiting_step: "scenario_b_confirm_reboot"
    },
    escalate: false,
    resolved: false
  };
  
  const adapted = adaptScenarioResult('B', mockResult);
  
  assertEquals(adapted.message, "Equipamento reiniciado");
  assertEquals(adapted.shouldInsertMessage, true);
  assertEquals(adapted.resolved, false);
});

Deno.test("adaptScenarioResult: Cenários C/D/E", () => {
  const mockResult = {
    message: "Sinal verificado",
    shouldInsert: true,
    flowUpdates: {
      waiting_step: "c_test_connectivity"
    },
    shouldEscalate: false,
    resolved: false,
    ticketCreated: false
  };
  
  const adapted = adaptScenarioResult('C', mockResult);
  
  assertEquals(adapted.message, "Sinal verificado");
  assertEquals(adapted.shouldInsertMessage, true);
  assertEquals(adapted.ticketCreated, false);
});

// =============================================================================
// TESTES: Edge Cases
// =============================================================================

Deno.test("Edge case: signal com valores string (conversão numérica)", () => {
  const mockData = {
    ...baseMockData,
    signal: {
      tx: "2.5" as any,
      rx: "-22.0" as any
    }
  };
  
  const result = buildScenarioAContext(mockData);
  
  assertEquals(typeof result.signal_data.tx, "number");
  assertEquals(typeof result.signal_data.rx, "number");
  assertEquals(result.signal_data.tx, 2.5);
  assertEquals(result.signal_data.rx, -22.0);
});

Deno.test("Edge case: messageHistory vazio", () => {
  const mockData = {
    ...baseMockData,
    messageHistory: []
  };
  
  const result = buildScenarioAContext(mockData);
  
  assertEquals(Array.isArray(result.message_history), true);
  assertEquals(result.message_history.length, 0);
});

Deno.test("Edge case: flowState null", () => {
  const mockData = {
    ...baseMockData,
    flowState: null as any
  };
  
  const result = buildScenarioAContext(mockData);
  
  assertExists(result.flow_state);
  assertEquals(typeof result.flow_state, "object");
});

console.log("✅ Todos os testes do Context Adapter passaram!");
