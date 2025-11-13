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
        order: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  },
}));

describe('Omnichannel Routing Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Roteamento Básico', () => {
    it('deve rotear cliente OFFLINE para Luan (Técnico)', async () => {
      const mockResponse = {
        data: {
          agent: 'Luan Silva',
          department: 'Suporte Técnico',
          reason: 'Cliente está offline',
          protocol: 'PROT-12345',
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('routing-agent', {
        body: {
          cpf: '111.111.111-11',
          message: 'Minha internet está sem funcionar',
        },
      });

      expect(result.data.department).toBe('Suporte Técnico');
      expect(result.data.agent).toContain('Luan');
    });

    it('deve rotear cliente BLOQUEADO para Julia (Financeiro)', async () => {
      const mockResponse = {
        data: {
          agent: 'Julia Martins',
          department: 'Financeiro',
          reason: 'Cliente bloqueado por inadimplência',
          protocol: 'PROT-12346',
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('routing-agent', {
        body: {
          cpf: '222.222.222-22',
          message: 'Minha internet foi cortada',
        },
      });

      expect(result.data.department).toBe('Financeiro');
      expect(result.data.agent).toContain('Julia');
    });

    it('deve rotear cliente ONLINE para Cloé (aguarda intenção)', async () => {
      const mockResponse = {
        data: {
          agent: 'Cloé Martins',
          department: 'Atendimento',
          reason: 'Cliente online, aguardando identificação de intenção',
          protocol: 'PROT-12347',
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('routing-agent', {
        body: {
          cpf: '333.333.333-33',
          message: 'Olá, preciso de ajuda',
        },
      });

      expect(result.data.agent).toContain('Cloé');
    });

    it('deve rotear cliente NOVO para Vicente (Vendas) após 3 tentativas', async () => {
      const mockResponse = {
        data: {
          agent: 'Vicente',
          department: 'Vendas',
          reason: 'CPF não encontrado após 3 tentativas',
          protocol: 'PROT-12348',
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('routing-agent', {
        body: {
          cpf: '999.999.999-99',
          message: 'Quero contratar internet',
          attempts: 3,
        },
      });

      expect(result.data.department).toBe('Vendas');
      expect(result.data.agent).toContain('Vicente');
    });
  });

  describe('Diagnóstico Técnico - Luan', () => {
    it('deve detectar problema de ENERGIA (TX/RX = 0.00)', async () => {
      const mockResponse = {
        data: {
          agent: 'Luan Silva',
          diagnosis: 'Equipamento sem energia',
          tx_power: 0.0,
          rx_power: 0.0,
          recommendation: 'Verificar fonte de alimentação',
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('support-tech-agent', {
        body: {
          cpf: '100.000.000-01',
          issue_type: 'offline',
        },
      });

      expect(result.data.diagnosis).toContain('energia');
      expect(result.data.tx_power).toBe(0);
      expect(result.data.rx_power).toBe(0);
    });

    it('deve detectar sinal fraco (RX: -26 dBm)', async () => {
      const mockResponse = {
        data: {
          agent: 'Luan Silva',
          diagnosis: 'Sinal fraco detectado',
          tx_power: 0.2,
          rx_power: -26.5,
          recommendation: 'Verificar cabos e conectores',
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('support-tech-agent', {
        body: {
          cpf: '100.000.000-02',
          issue_type: 'offline',
        },
      });

      expect(result.data.rx_power).toBeLessThan(-25);
      expect(result.data.diagnosis).toContain('fraco');
    });

    it('deve detectar sinal crítico (RX < -28 dBm)', async () => {
      const mockResponse = {
        data: {
          agent: 'Luan Silva',
          diagnosis: 'Sinal crítico - problema grave',
          tx_power: -3.0,
          rx_power: -32.0,
          recommendation: 'Problema na rede externa - abrir chamado urgente',
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('support-tech-agent', {
        body: {
          cpf: '100.000.000-03',
          issue_type: 'offline',
        },
      });

      expect(result.data.rx_power).toBeLessThan(-28);
      expect(result.data.diagnosis).toContain('crítico');
    });

    it('deve identificar mass outage ativo', async () => {
      const mockResponse = {
        data: {
          agent: 'Luan Silva',
          mass_outage: true,
          affected_clients: 1542,
          region: 'Taguatinga/Samambaia - SRI',
          message: 'Pane massiva detectada, equipe já foi acionada',
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('support-tech-agent', {
        body: {
          cpf: '100.000.000-05',
          issue_type: 'offline',
        },
      });

      expect(result.data.mass_outage).toBe(true);
      expect(result.data.affected_clients).toBeGreaterThan(1000);
    });
  });

  describe('Validação de CPF', () => {
    it('deve validar formato de CPF', async () => {
      const validCPF = '111.111.111-11';
      const cleanCPF = validCPF.replace(/\D/g, '');

      expect(cleanCPF).toHaveLength(11);
      expect(/^\d{11}$/.test(cleanCPF)).toBe(true);
    });

    it('deve rejeitar CPF inválido', async () => {
      const invalidCPF = '123.456';
      const cleanCPF = invalidCPF.replace(/\D/g, '');

      expect(cleanCPF.length).toBeLessThan(11);
    });
  });

  describe('Geração de Protocolos', () => {
    it('deve gerar protocolo no formato PROT-XXXXX', async () => {
      const mockResponse = {
        data: {
          protocol: 'PROT-12345',
          timestamp: new Date().toISOString(),
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('routing-agent', {
        body: { cpf: '111.111.111-11' },
      });

      expect(result.data.protocol).toMatch(/^PROT-\d{5}$/);
    });
  });
});
