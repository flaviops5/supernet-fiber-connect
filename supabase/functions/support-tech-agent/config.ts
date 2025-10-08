/**
 * Support Tech Agent - Configuration
 */

export const SUPPORT_TECH_CONFIG = {
  // Model settings
  model: "gpt-4o-mini",
  temperature: 0.5, // Mais determinístico para suporte técnico
  maxTokens: 2000,
  
  // Agent behavior
  maxMessagesInContext: 15, // Precisa de mais contexto para troubleshooting
  enableToolCalling: true,
  
  // Available tools
  allowedTools: [
    "criar_atendimento_ixc",
    "test_equipment_connectivity",
    "ixc_client_lookup"
  ],
  
  // Business rules
  maxRebootAttempts: 3,
  autoEscalateAfterMinutes: 30,
  
  // Timeouts
  responseTimeout: 30000,
  toolTimeout: 15000, // Mais tempo para chamadas IXC
};
