/**
 * Automação Agent - Configuration
 */

export const AUTOMACAO_AGENT_CONFIG = {
  // Model settings
  model: "gpt-4o-mini",
  temperature: 0.7, // Mais criativo para exemplos práticos
  maxTokens: 2000,
  
  // Agent behavior
  maxMessagesInContext: 10,
  enableToolCalling: true,
  
  // Available tools
  allowedTools: [
    "consultar_catalogo_automacao",
    "verificar_compatibilidade_dispositivo",
    "agendar_instalacao_tecnica"
  ],
  
  // Business rules
  requiresActiveInternet: true, // Cliente deve ter internet SUPERNET
  minPlanSpeedForIoT: 100, // Mbps - Plano mínimo recomendado
  freeInstallationThreshold: 500, // Valor mínimo para instalação grátis
  
  // Product categories
  productCategories: [
    "security", // Segurança
    "lighting", // Iluminação
    "climate", // Climatização
    "entertainment", // Entretenimento
    "assistants", // Assistentes virtuais
    "energy" // Gestão de energia
  ],
  
  // Timeouts
  responseTimeout: 30000, // 30s
  toolTimeout: 10000, // 10s
};
