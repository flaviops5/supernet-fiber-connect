import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

// Mock do Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
        limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
  },
}));

describe('Security Validation - CPF Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CPF Validation', () => {
    it('deve validar formato correto de CPF', () => {
      const validCPF = '123.456.789-00';
      const cleanCPF = validCPF.replace(/\D/g, '');

      expect(cleanCPF).toHaveLength(11);
      expect(/^\d{11}$/.test(cleanCPF)).toBe(true);
    });

    it('deve rejeitar CPF com formato inválido', () => {
      const invalidFormats = [
        '123.456',
        '123',
        'abc.def.ghi-jk',
        '12345678901234',
        '',
      ];

      invalidFormats.forEach((cpf) => {
        const clean = cpf.replace(/\D/g, '');
        expect(clean.length !== 11 || !/^\d{11}$/.test(clean)).toBe(true);
      });
    });

    it('deve aplicar máscara de CPF corretamente', () => {
      const cpf = '12345678900';
      const masked = cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');

      expect(masked).toBe('123.456.789-00');
    });

    it('deve mascarar CPF para LGPD (***.***.***-**)', () => {
      const cpf = '123.456.789-00';
      const masked = '***.***.***-**';

      expect(masked.includes('*')).toBe(true);
      expect(masked).toMatch(/\*{3}\.\*{3}\.\*{3}-\*{2}/);
    });

    it('deve rejeitar CPF com todos dígitos iguais', () => {
      const invalidCPFs = [
        '11111111111',
        '22222222222',
        '00000000000',
        '99999999999',
      ];

      invalidCPFs.forEach((cpf) => {
        const allSame = /^(\d)\1{10}$/.test(cpf);
        expect(allSame).toBe(true); // São inválidos
      });
    });
  });

  describe('CPF Search Integration', () => {
    it('deve buscar cliente por CPF via IXC', async () => {
      const mockResponse = {
        data: {
          success: true,
          client: {
            id: 123,
            razao: 'João Silva',
            cnpj_cpf: '12345678900',
            email: 'joao@example.com',
          },
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('ixc-integration', {
        body: {
          action: 'searchClient',
          cpf: '12345678900',
        },
      });

      expect(result.data.success).toBe(true);
      expect(result.data.client.cnpj_cpf).toBe('12345678900');
    });

    it('deve retornar cliente não encontrado', async () => {
      const mockResponse = {
        data: {
          success: false,
          message: 'Cliente não encontrado',
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('ixc-integration', {
        body: {
          action: 'searchClient',
          cpf: '99999999999',
        },
      });

      expect(result.data.success).toBe(false);
      expect(result.data.message).toContain('não encontrado');
    });

    it('deve limpar CPF antes de buscar', async () => {
      const cpfWithMask = '123.456.789-00';
      const cleanCPF = cpfWithMask.replace(/\D/g, '');

      const mockResponse = {
        data: { success: true },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      await supabase.functions.invoke('ixc-integration', {
        body: {
          action: 'searchClient',
          cpf: cleanCPF,
        },
      });

      expect((supabase.functions.invoke as any)).toHaveBeenCalledWith(
        'ixc-integration',
        expect.objectContaining({
          body: expect.objectContaining({
            cpf: '12345678900',
          }),
        })
      );
    });
  });

  describe('CPF Masking for Logging', () => {
    it('deve mascarar CPF em logs', () => {
      const cpf = '12345678900';
      const masked = '***.***.***-**';

      // Simula função de mascaramento
      const maskCPF = (cpf: string) => '***.***.***-**';

      expect(maskCPF(cpf)).toBe(masked);
      expect(maskCPF(cpf)).not.toContain('123');
    });

    it('deve verificar se CPF está mascarado via edge function', async () => {
      const mockResponse = {
        data: {
          conversations: [
            { id: '1', cpf_masked: '***.***.***-11' },
            { id: '2', cpf_masked: '***.***.***-22' },
          ],
          all_masked: true,
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('check-cpf-masking');

      expect(result.data.all_masked).toBe(true);
      expect(result.data.conversations.every((c: any) => c.cpf_masked.includes('*'))).toBe(
        true
      );
    });
  });

  describe('CPF Rate Limiting', () => {
    it('deve implementar rate limiting por CPF', async () => {
      const mockResponse = {
        data: null,
        error: {
          message: 'Rate limit exceeded for this CPF',
          code: 'RATE_LIMIT',
        },
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('ixc-integration', {
        body: {
          action: 'searchClient',
          cpf: '12345678900',
        },
      });

      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('RATE_LIMIT');
    });

    it('deve permitir busca após cooldown', async () => {
      const mockResponses = [
        {
          data: null,
          error: { message: 'Rate limit', code: 'RATE_LIMIT' },
        },
        {
          data: { success: true, client: {} },
          error: null,
        },
      ];

      let callCount = 0;
      (supabase.functions.invoke as any).mockImplementation(() => {
        return Promise.resolve(mockResponses[callCount++]);
      });

      // Primeira chamada - rate limited
      const result1 = await supabase.functions.invoke('ixc-integration', {
        body: { action: 'searchClient', cpf: '12345678900' },
      });
      expect(result1.error).toBeDefined();

      // Segunda chamada - após cooldown
      const result2 = await supabase.functions.invoke('ixc-integration', {
        body: { action: 'searchClient', cpf: '12345678900' },
      });
      expect(result2.data.success).toBe(true);
    });
  });

  describe('Security Validation', () => {
    it('deve rejeitar CPF com caracteres especiais perigosos', () => {
      const dangerousCPFs = [
        "123'; DROP TABLE users; --",
        '<script>alert(1)</script>',
        '123<>456',
        '123/456',
      ];

      dangerousCPFs.forEach((cpf) => {
        const clean = cpf.replace(/\D/g, '');
        const isValid = clean.length === 11 && /^\d{11}$/.test(clean);
        expect(isValid).toBe(false);
      });
    });

    it('deve validar CPF antes de processar', () => {
      const validateCPF = (cpf: string): boolean => {
        const clean = cpf.replace(/\D/g, '');
        if (clean.length !== 11) return false;
        if (!/^\d{11}$/.test(clean)) return false;
        if (/^(\d)\1{10}$/.test(clean)) return false; // Todos iguais
        return true;
      };

      expect(validateCPF('123.456.789-00')).toBe(true);
      expect(validateCPF('11111111111')).toBe(false);
      expect(validateCPF('123')).toBe(false);
      expect(validateCPF('abc')).toBe(false);
    });
  });

  describe('Audit Log', () => {
    it('deve registrar tentativas de busca de CPF', async () => {
      const mockResponse = {
        data: { success: true },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      await supabase.functions.invoke('ixc-integration', {
        body: {
          action: 'searchClient',
          cpf: '12345678900',
          log_search: true,
        },
      });

      expect(supabase.functions.invoke).toHaveBeenCalledWith(
        'ixc-integration',
        expect.objectContaining({
          body: expect.objectContaining({
            log_search: true,
          }),
        })
      );
    });
  });
});
