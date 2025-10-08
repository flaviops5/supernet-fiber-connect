/**
 * Sales Agent - Configuration
 */

export const SALES_AGENT_CONFIG = {
  // Model settings
  model: "gpt-4o-mini",
  temperature: 0.7,
  maxTokens: 2000,
  
  // Agent behavior
  maxMessagesInContext: 10,
  enableToolCalling: true,
  
  // Available tools
  allowedTools: [
    "chatbot_cep_lookup",
    "process_contract",
    "ixc_sync_plans",
    "create_installation_appointment"
  ],
  
  // Business rules
  maxDiscountPercentage: 10,
  maxDiscountDuration: 3, // meses
  
  // Timeouts
  responseTimeout: 30000, // 30s
  toolTimeout: 10000, // 10s
};
