/**
 * Telemedicina Agent - Configuration
 */

export const TELEMEDICINA_AGENT_CONFIG = {
  // Model settings
  model: "gpt-4o-mini",
  temperature: 0.6, // Equilibrado: empático mas profissional
  maxTokens: 2000,
  
  // Agent behavior
  maxMessagesInContext: 12, // Mais contexto para histórico de saúde
  enableToolCalling: true,
  
  // Available tools
  allowedTools: [
    "consultar_planos_telemedicina",
    "agendar_consulta_telemedicina",
    "enviar_link_cadastro",
    "verificar_disponibilidade_medico"
  ],
  
  // Business rules
  planos: {
    basico: {
      preco: 29.90,
      consultas: 2,
      especialidades: ["clinico_geral", "pediatria"]
    },
    familia: {
      preco: 79.90,
      consultas: 8,
      dependentes: 4,
      especialidades: "todas"
    },
    empresarial: {
      preco: "sob_consulta",
      consultas: "ilimitadas",
      colaboradores: "ilimitados"
    }
  },
  
  // Specialties availability
  especialidades24h: ["clinico_geral", "pediatria", "plantao"],
  especialidadesComercial: [
    "cardiologia", "dermatologia", "ginecologia",
    "psicologia", "nutricao", "ortopedia",
    "endocrinologia", "psiquiatria"
  ],
  
  // Emergency keywords (must escalate immediately)
  emergencyKeywords: [
    "dor no peito", "falta de ar grave", "desmaio",
    "sangramento intenso", "trauma grave", "convulsão",
    "AVC", "infarto", "fratura exposta"
  ],
  
  // Timeouts
  responseTimeout: 30000, // 30s
  toolTimeout: 15000, // 15s - Pode envolver consulta a agenda médica
};
