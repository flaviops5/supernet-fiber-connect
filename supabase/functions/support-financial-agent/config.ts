/**
 * Support Financial Agent - Configuration
 * 
 * NOTA: Valores de multa, juros e regras de negociação agora vêm da tabela
 * `financial_config` no banco de dados para permitir ajustes sem deploy.
 */

export const SUPPORT_FINANCIAL_CONFIG = {
  // Model settings
  model: "gpt-4o-mini",
  temperature: 0.6,
  maxTokens: 2000,
  
  // Agent behavior
  maxMessagesInContext: 12,
  enableToolCalling: true,
  
  // Available tools
  allowedTools: [
    "consultar_debitos_ixc",
    "gerar_boleto_ixc",
    "criar_acordo_ixc",
    "desbloquear_cliente_ixc"
  ],
  
  // Business rules - Discount limits by debt range (LEGADO - mantido para referência)
  // NOVOS VALORES: Veja tabela `financial_config` no banco
  discountLimits: {
    upTo150: { maxDiscount: 30, maxInstallments: 3 },
    upTo300: { maxDiscount: 25, maxInstallments: 4 },
    upTo500: { maxDiscount: 20, maxInstallments: 5 },
    upTo1000: { maxDiscount: 15, maxInstallments: 6 },
    above1000: { maxDiscount: 10, maxInstallments: 10, requiresApproval: true }
  },
  
  minInstallmentValue: 30,
  minDownPaymentPercentage: 20,
  
  // Courtesy unblock rules
  courtesyUnblock: {
    maxDebtValue: 200,
    cooldownMonths: 12,
    paymentDeadlineHours: 48
  },
  
  // Financial calculation rules (agora na tabela financial_config)
  financialRules: {
    lateFeeFixed: 2.58,        // R$ 2,58 por fatura (CDC)
    lateFeeDaily: 0.04,        // R$ 0,04 por dia (CDC)
    minDaysForNegotiation: 45, // Só negocia após 45 dias
    blockAfterDays: 30,        // Bloqueio após 30 dias
  },
  
  // 3-step negotiation system (agora na tabela financial_config)
  negotiationSteps: {
    step1: { installments: 1, removeFee: true, removeInterest: true },       // À vista - elimina tudo
    step2: { installments: 2, removeFee: true, interestDiscount: 80 },      // 2x - elimina multa + 80% juros
    step3: { installments: 3, removeFee: true, interestDiscount: 30 },      // 3x - elimina multa + 30% juros
  },
  
  // Timeouts
  responseTimeout: 30000,
  toolTimeout: 15000,
};
