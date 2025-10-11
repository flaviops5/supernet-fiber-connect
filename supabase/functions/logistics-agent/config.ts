/**
 * Logistics Agent - Configuration
 */

export const LOGISTICS_AGENT_CONFIG = {
  // Model settings
  model: "google/gemini-2.5-flash",
  temperature: 0.7,
  maxTokens: 2000,
  
  // Agent behavior
  maxMessagesInContext: 20,
  enableToolCalling: true,
  
  // Agent identity
  agentName: "Érik Souza",
  agentRole: "Coordenador de Logística",
  department: "logistica",
  
  // Timeouts
  responseTimeout: 30000,
  toolTimeout: 15000,
};
