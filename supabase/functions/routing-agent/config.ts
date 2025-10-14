/**
 * Routing Agent (Cloé Martins) - Configuration v1.1.0
 * 
 * MASS OUTAGE INTEGRATION:
 * - Uses getCachedOutage (5s TTL cache)
 * - High-volume agent benefits from caching
 * - Timeout: 3000ms
 */

export const ROUTING_AGENT_CONFIG = {
  // Model settings
  model: "google/gemini-2.5-flash",
  temperature: 0.7,
  maxTokens: 1500,
  
  // Agent behavior
  maxMessagesInContext: 10,
  enableToolCalling: false, // Routing agent não precisa de tools
  
  // Business rules
  maxCPFAttempts: 3,
  requireCPFBeforeRouting: true,
  
  // Timeouts
  responseTimeout: 20000,
  
  // Mass Outage Integration (v1.1.0)
  massOutage: {
    enabled: true,
    useCached: true, // Routing benefits from cache (high volume)
    cacheTTL: 5000, // 5 seconds
    timeout: 3000,
    skipCPFValidation: true, // Don't ask CPF during mass outage
    priorityResponse: true // Respond immediately before CPF check
  },
  
  // Rate limiting
  rateLimit: {
    enabled: true,
    windowMinutes: 15,
    maxAttempts: 5,
    blockMinutes: 60
  }
};
