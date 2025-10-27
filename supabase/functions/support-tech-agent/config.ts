/**
 * Support Tech Agent - Configuration v1.1.0
 * 
 * MASS OUTAGE INTEGRATION:
 * - Uses getMassOutageContext (direct query, no cache)
 * - Critical context requires fresh data
 * - Timeout: 3000ms
 */

export const SUPPORT_TECH_CONFIG = {
  // Model settings
  model: "gpt-4o-mini",
  temperature: 0.5, // Mais determinístico para suporte técnico
  maxTokens: 2000,
  
  // Agent behavior
  maxMessagesInContext: 15, // Precisa de mais contexto para troubleshooting
  enableToolCalling: true,
  
  // >>> PR7: garantir ferramenta
  // Available tools
  allowedTools: [
    "criar_atendimento_ixc",
    "test_equipment_connectivity", // manter consistência de nome
    "ixc_client_lookup",
    "reboot_client_equipment", // Reboot manual sob demanda
    "get_onu_signal_status", // 🆕 Consulta TX/RX para diagnóstico
    "ixc-integration" // Criar atendimentos IXC
  ],
  // <<< PR7
  
  // Business rules
  maxRebootAttempts: 3,
  autoEscalateAfterMinutes: 30,
  
  // Timeouts
  responseTimeout: 30000,
  toolTimeout: 15000, // Mais tempo para chamadas IXC
  
  // Mass Outage Integration (v1.1.0)
  massOutage: {
    enabled: true,
    useCached: false, // Support tech needs fresh data
    timeout: 3000,
    priorityOverTroubleshooting: true
  }
};
