/**
 * Routing Agent - Configuration
 */

export const ROUTING_AGENT_CONFIG = {
  // Model settings
  model: "gpt-4o-mini",
  temperature: 0.3, // Baixa temperatura para decisões consistentes
  maxTokens: 500, // Resposta curta (apenas JSON)
  
  // Agent behavior
  maxMessagesInContext: 5, // Apenas contexto recente para decisão rápida
  enableToolCalling: false, // Não precisa de ferramentas
  
  // Routing rules
  defaultAgent: "sales-agent", // Agente padrão para casos ambíguos
  minConfidenceThreshold: 0.4, // Abaixo disso, vai para default
  
  // Agents disponíveis
  availableAgents: [
    "sales-agent",
    "support-tech-agent",
    "support-financial-agent",
    "automacao-agent",
    "telemedicina-agent"
  ],
  
  // Department mapping
  departmentMapping: {
    "sales-agent": "comercial",
    "support-tech-agent": "tecnico",
    "support-financial-agent": "financeiro",
    "automacao-agent": "tecnico",
    "telemedicina-agent": "comercial"
  },
  
  // Priority mapping
  agentPriority: {
    "support-tech-agent": 3, // Highest priority
    "support-financial-agent": 2,
    "sales-agent": 1,
    "automacao-agent": 1,
    "telemedicina-agent": 1
  },
  
  // Timeouts
  responseTimeout: 10000, // 10s - Roteamento deve ser rápido
  toolTimeout: 5000, // Não usado, mas mantido por consistência
};
