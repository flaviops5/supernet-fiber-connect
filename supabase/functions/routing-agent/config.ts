export const ROUTING_AGENT_CONFIG = {
  // Model settings
  model: "google/gemini-2.5-flash",
  temperature: 0.7,
  maxTokens: 800, // reduzido - mais rápido

  // Agent behavior
  maxMessagesInContext: 10,
  enableToolCalling: false,

  // Business rules
  maxCPFAttempts: 3,
  requireCPFBeforeRouting: false, // 🔧 Desativado para depuração
  // Ative novamente após estabilizar o sistema

  // Timeouts
  responseTimeout: 15000,

  // Mass Outage Integration
  massOutage: {
    enabled: true,
    useCached: true,
    cacheTTL: 5000,
    timeout: 3000,
    skipCPFValidation: true,
    priorityResponse: true,
  },

  // Rate limiting
  rateLimit: {
    enabled: true,
    windowMinutes: 15,
    maxAttempts: 5,
    blockMinutes: 60,
  },
};
