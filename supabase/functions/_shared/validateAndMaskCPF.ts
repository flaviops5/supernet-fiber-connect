// 📦 _shared/validateAndMaskCPF.ts
// Validação e mascaramento centralizado de CPF (LGPD compliant)
// Segue padrão SUPERNET: termos técnicos em inglês, documentação em português

export interface CPFValidationResult {
  isValid: boolean;
  cleanCPF?: string;        // CPF limpo (apenas números) - só retornado se válido
  maskedCPF: string;        // CPF mascarado (sempre retornado)
  error?: string;           // Mensagem de erro descritiva
}

/**
 * Valida e mascara um CPF seguindo algoritmo oficial da Receita Federal
 * @param input - CPF em qualquer formato (com ou sem pontos/traços)
 * @returns Resultado com validação + CPF mascarado
 * 
 * @example
 * ```ts
 * const result = validateAndMaskCPF("123.456.789-10");
 * console.log(result.maskedCPF); // *******7-10
 * ```
 */
export function validateAndMaskCPF(input: string): CPFValidationResult {
  // Limpar entrada (remover tudo exceto números)
  const cleaned = input.replace(/\D/g, '');
  
  // Mascarar imediatamente (mesmo se inválido)
  const masked = cleaned.length >= 4 
    ? '*'.repeat(cleaned.length - 4) + cleaned.slice(-4) 
    : '***';

  // ❌ Validação 1: Deve ter exatamente 11 dígitos
  if (cleaned.length !== 11) {
    return { 
      isValid: false, 
      maskedCPF: masked, 
      error: 'CPF deve ter 11 dígitos' 
    };
  }

  // ❌ Validação 2: Não pode ter todos dígitos iguais (ex: 111.111.111-11)
  if (/^(\d)\1{10}$/.test(cleaned)) {
    return { 
      isValid: false, 
      maskedCPF: masked, 
      error: 'CPF com dígitos repetidos' 
    };
  }

  // 🔢 Validação 3: Algoritmo oficial de dígitos verificadores
  
  // Primeiro dígito verificador
  let sum = 0;
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleaned.substring(i - 1, i)) * (11 - i);
  }
  let rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  
  if (rest !== parseInt(cleaned.substring(9, 10))) {
    return { 
      isValid: false, 
      maskedCPF: masked, 
      error: 'Dígito verificador inválido' 
    };
  }

  // Segundo dígito verificador
  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleaned.substring(i - 1, i)) * (12 - i);
  }
  rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  
  if (rest !== parseInt(cleaned.substring(10, 11))) {
    return { 
      isValid: false, 
      maskedCPF: masked, 
      error: 'Dígito verificador inválido' 
    };
  }

  // ✅ CPF válido
  return {
    isValid: true,
    cleanCPF: cleaned,
    maskedCPF: masked,
  };
}

/**
 * Detecta tipo de entrada do usuário (CPF, telefone ou desconhecido)
 * @param message - Mensagem do cliente
 * @returns Tipo detectado
 */
export function detectInputType(message: string): 'cpf' | 'telefone' | 'unknown' {
  const msgLower = message.toLowerCase();
  const digits = message.replace(/\D/g, '');

  // 🔍 Contexto explícito
  if (msgLower.includes('cpf')) return 'cpf';
  if (msgLower.includes('telefone') || msgLower.includes('whatsapp') || msgLower.includes('celular')) {
    return 'telefone';
  }

  // 🧪 Validação automática de CPF
  if (digits.length === 11) {
    const { isValid } = validateAndMaskCPF(digits);
    if (isValid) return 'cpf';
  }

  // 📞 Telefone (10 ou 11 dígitos sem ser CPF válido)
  if (digits.length >= 10 && digits.length <= 11) {
    return 'telefone';
  }

  return 'unknown';
}
