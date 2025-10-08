/**
 * Support Financial Agent - Configuration
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
  
  // Business rules - Discount limits by debt range
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
  
  // Timeouts
  responseTimeout: 30000,
  toolTimeout: 15000,
};
