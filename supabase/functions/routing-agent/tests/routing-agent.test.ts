import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { describe, it, beforeEach } from "https://deno.land/std@0.168.0/testing/bdd.ts";

// Helper functions (extracted from routing-agent)
function redactCPF(cpf: string): string {
  if (!cpf || cpf.length < 11) return cpf;
  return cpf.substring(0, 3) + '***' + cpf.substring(cpf.length - 2);
}

function detectInputType(input: string): 'cpf' | 'cnpj' | 'cep' | 'phone' | 'text' {
  const digitsOnly = input.replace(/\D/g, '');
  
  if (digitsOnly.length === 11 && /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(input)) {
    return 'cpf';
  }
  if (digitsOnly.length === 14) {
    return 'cnpj';
  }
  if (digitsOnly.length === 8) {
    return 'cep';
  }
  if (digitsOnly.length >= 10 && digitsOnly.length <= 11) {
    return 'phone';
  }
  
  return 'text';
}

function validateAndMaskCPF(cpf: string): { valid: boolean; masked: string } {
  const digitsOnly = cpf.replace(/\D/g, '');
  
  if (digitsOnly.length !== 11) {
    return { valid: false, masked: cpf };
  }
  
  // Simple validation (not full CPF algorithm)
  const allSame = digitsOnly.split('').every(d => d === digitsOnly[0]);
  if (allSame) {
    return { valid: false, masked: cpf };
  }
  
  const masked = `${digitsOnly.substring(0, 3)}.***.***-${digitsOnly.substring(9, 11)}`;
  return { valid: true, masked };
}

describe("Routing Agent - Input Type Detection", () => {
  it("should detect CPF format", () => {
    const input = "123.456.789-01";
    const type = detectInputType(input);
    
    assertEquals(type, 'cpf');
  });

  it("should detect CNPJ format", () => {
    const input = "12345678901234";
    const type = detectInputType(input);
    
    assertEquals(type, 'cnpj');
  });

  it("should detect CEP format", () => {
    const input = "12345678";
    const type = detectInputType(input);
    
    assertEquals(type, 'cep');
  });

  it("should detect phone format", () => {
    const input = "11987654321";
    const type = detectInputType(input);
    
    assertEquals(type, 'phone');
  });

  it("should default to text for unrecognized input", () => {
    const input = "Hello world";
    const type = detectInputType(input);
    
    assertEquals(type, 'text');
  });
});

describe("Routing Agent - CPF Validation and Masking", () => {
  it("should validate and mask valid CPF", () => {
    const cpf = "12345678901";
    const result = validateAndMaskCPF(cpf);
    
    assertEquals(result.valid, true);
    assertEquals(result.masked, "123.***.***-01");
  });

  it("should reject CPF with all same digits", () => {
    const cpf = "11111111111";
    const result = validateAndMaskCPF(cpf);
    
    assertEquals(result.valid, false);
  });

  it("should reject CPF with wrong length", () => {
    const cpf = "123456789";
    const result = validateAndMaskCPF(cpf);
    
    assertEquals(result.valid, false);
  });

  it("should handle CPF with formatting", () => {
    const cpf = "123.456.789-01";
    const result = validateAndMaskCPF(cpf);
    
    assertEquals(result.valid, true);
    assertEquals(result.masked, "123.***.***-01");
  });
});

describe("Routing Agent - CPF Redaction", () => {
  it("should redact CPF for logging", () => {
    const cpf = "12345678901";
    const redacted = redactCPF(cpf);
    
    assertEquals(redacted, "123***01");
  });

  it("should handle short strings gracefully", () => {
    const cpf = "123";
    const redacted = redactCPF(cpf);
    
    assertEquals(redacted, "123");
  });

  it("should handle empty string", () => {
    const cpf = "";
    const redacted = redactCPF(cpf);
    
    assertEquals(redacted, "");
  });
});

describe("Routing Agent - Department Routing", () => {
  interface RoutingIntent {
    intent: string;
    confidence: number;
  }

  function determineTargetDepartment(intent: RoutingIntent): string {
    const { intent: intentType, confidence } = intent;
    
    if (confidence < 0.5) {
      return 'general';
    }
    
    const intentToDepartment: Record<string, string> = {
      'technical_support': 'technical',
      'billing': 'financial',
      'sales': 'sales',
      'cancellation': 'retention',
      'installation': 'technical',
      'complaint': 'general'
    };
    
    return intentToDepartment[intentType] || 'general';
  }

  it("should route technical support to technical department", () => {
    const intent: RoutingIntent = { intent: 'technical_support', confidence: 0.9 };
    const department = determineTargetDepartment(intent);
    
    assertEquals(department, 'technical');
  });

  it("should route billing to financial department", () => {
    const intent: RoutingIntent = { intent: 'billing', confidence: 0.85 };
    const department = determineTargetDepartment(intent);
    
    assertEquals(department, 'financial');
  });

  it("should route low confidence to general", () => {
    const intent: RoutingIntent = { intent: 'technical_support', confidence: 0.3 };
    const department = determineTargetDepartment(intent);
    
    assertEquals(department, 'general');
  });

  it("should default unknown intents to general", () => {
    const intent: RoutingIntent = { intent: 'unknown_intent', confidence: 0.8 };
    const department = determineTargetDepartment(intent);
    
    assertEquals(department, 'general');
  });
});

describe("Routing Agent - Metadata Sanitization", () => {
  interface CustomerData {
    name?: string;
    cpf?: string;
    phone?: string;
    email?: string;
    password?: string;
    creditCard?: string;
  }

  function createSanitizedMetadata(data: CustomerData): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    
    if (data.name) sanitized.name = data.name;
    if (data.phone) sanitized.phone = data.phone;
    if (data.email) sanitized.email = data.email;
    
    // Redact sensitive fields
    if (data.cpf) sanitized.cpf = redactCPF(data.cpf);
    
    // Never include sensitive fields
    // password, creditCard are excluded
    
    return sanitized;
  }

  it("should include safe fields in metadata", () => {
    const data: CustomerData = {
      name: "João Silva",
      phone: "11987654321",
      email: "joao@example.com"
    };
    
    const metadata = createSanitizedMetadata(data);
    
    assertEquals(metadata.name, "João Silva");
    assertEquals(metadata.phone, "11987654321");
    assertEquals(metadata.email, "joao@example.com");
  });

  it("should redact CPF in metadata", () => {
    const data: CustomerData = {
      name: "João Silva",
      cpf: "12345678901"
    };
    
    const metadata = createSanitizedMetadata(data);
    
    assertEquals(metadata.cpf, "123***01");
  });

  it("should exclude sensitive fields", () => {
    const data: CustomerData = {
      name: "João Silva",
      password: "secret123",
      creditCard: "1234567890123456"
    };
    
    const metadata = createSanitizedMetadata(data);
    
    assertEquals(metadata.name, "João Silva");
    assertEquals(metadata.password, undefined);
    assertEquals(metadata.creditCard, undefined);
  });
});
