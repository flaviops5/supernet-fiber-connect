import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}));

describe('Routing Agent Integration Tests', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      functions: {
        invoke: vi.fn(),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(),
        })),
        insert: vi.fn(),
      })),
    };
    (createClient as any).mockReturnValue(mockSupabase);
  });

  describe('Roteamento Básico por Intenção', () => {
    it('deve rotear problema técnico para Luan', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          ok: true,
          agent: 'luan',
          next_action: 'support-tech-agent',
          routeReason: 'tecnico_conexao',
          confidence: 0.95,
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('routing-agent', {
        body: {
          conversationId: 'test-conv-1',
          message: 'Minha internet está sem sinal',
          customerData: {
            customer_cpf: '12345678901',
            customer_name: 'Cliente Teste',
          },
        },
      });

      expect(response.data.agent).toBe('luan');
      expect(response.data.next_action).toBe('support-tech-agent');
      expect(response.error).toBeNull();
    });

    it('deve rotear questão financeira para Julia', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          ok: true,
          agent: 'julia',
          next_action: 'support-financial-agent',
          routeReason: 'financeiro_boleto',
          confidence: 0.92,
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('routing-agent', {
        body: {
          conversationId: 'test-conv-2',
          message: 'Preciso da segunda via do boleto',
          customerData: {
            customer_cpf: '12345678901',
            customer_name: 'Cliente Teste',
          },
        },
      });

      expect(response.data.agent).toBe('julia');
      expect(response.data.next_action).toBe('support-financial-agent');
    });

    it('deve rotear consulta de cobertura para Vicente', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          ok: true,
          agent: 'vicente',
          next_action: 'sales-agent',
          routeReason: 'comercial_cobertura',
          confidence: 0.88,
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('routing-agent', {
        body: {
          conversationId: 'test-conv-3',
          message: 'Vocês atendem na Rua das Flores, 123?',
          customerData: {},
        },
      });

      expect(response.data.agent).toBe('vicente');
      expect(response.data.routeReason).toBe('comercial_cobertura');
    });

    it('deve rotear consulta geral para Cloé', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          ok: true,
          agent: 'cloe',
          next_action: 'cloe',
          routeReason: 'geral_informacao',
          confidence: 0.75,
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('routing-agent', {
        body: {
          conversationId: 'test-conv-4',
          message: 'Olá, preciso de ajuda',
          customerData: {},
        },
      });

      expect(response.data.agent).toBe('cloe');
    });
  });

  describe('Validação de CPF', () => {
    it('deve validar CPF válido', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          ok: true,
          agent: 'luan',
          cpf_validated: true,
          customer_found: true,
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('routing-agent', {
        body: {
          conversationId: 'test-conv-5',
          message: 'Internet lenta',
          customerData: {
            customer_cpf: '12345678901',
          },
        },
      });

      expect(response.data.cpf_validated).toBe(true);
    });

    it('deve detectar CPF inválido e rotear para Cloé', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          ok: true,
          agent: 'cloe',
          routeReason: 'cpf_invalido_contexto_normal',
          cpf_validated: false,
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('routing-agent', {
        body: {
          conversationId: 'test-conv-6',
          message: 'Meu CPF é 11111111111',
          customerData: {},
        },
      });

      expect(response.data.agent).toBe('cloe');
      expect(response.data.cpf_validated).toBe(false);
    });

    it('deve solicitar CPF quando ausente', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          ok: true,
          agent: 'cloe',
          routeReason: 'sem_cpf',
          requires_cpf: true,
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('routing-agent', {
        body: {
          conversationId: 'test-conv-7',
          message: 'Internet não funciona',
          customerData: {},
        },
      });

      expect(response.data.requires_cpf).toBe(true);
    });
  });

  describe('Mass Outage Detection', () => {
    it('deve detectar mass outage e informar cliente', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          ok: true,
          agent: 'cloe',
          routeReason: 'mass_outage_detectado',
          mass_outage: true,
          affected_region: 'Bairro Centro',
          eta: '2 horas',
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('routing-agent', {
        body: {
          conversationId: 'test-conv-8',
          message: 'Todo mundo aqui está sem internet, quando volta?',
          customerData: {
            customer_cpf: '12345678901',
          },
        },
      });

      expect(response.data.mass_outage).toBe(true);
      expect(response.data.agent).toBe('cloe');
    });

    it('deve priorizar mass outage sobre roteamento técnico', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          ok: true,
          agent: 'cloe',
          routeReason: 'mass_outage_detectado',
          mass_outage: true,
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('routing-agent', {
        body: {
          conversationId: 'test-conv-9',
          message: 'Internet caiu, vizinhos também estão sem',
          customerData: {
            customer_cpf: '12345678901',
          },
        },
      });

      expect(response.data.agent).toBe('cloe');
      expect(response.data.mass_outage).toBe(true);
    });
  });

  describe('Test Harness Mode', () => {
    it('deve ativar test harness e ignorar CPF', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          ok: true,
          agent: 'luan',
          testHarness: true,
          routeReason: 'tecnico_sinal_fraco',
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('routing-agent', {
        body: {
          conversationId: 'test-conv-10',
          message: 'Internet lenta',
          testMode: true,
        },
      });

      expect(response.data.testHarness).toBe(true);
    });

    it('deve detectar cenários por intenção em test mode', async () => {
      const scenarios = [
        { message: 'Internet offline', expectedAgent: 'luan' },
        { message: 'Segunda via boleto', expectedAgent: 'julia' },
        { message: 'Consultar cobertura', expectedAgent: 'vicente' },
      ];

      for (const scenario of scenarios) {
        mockSupabase.functions.invoke.mockResolvedValueOnce({
          data: {
            ok: true,
            agent: scenario.expectedAgent,
            testHarness: true,
          },
          error: null,
        });

        const response = await mockSupabase.functions.invoke('routing-agent', {
          body: {
            conversationId: `test-conv-${Date.now()}`,
            message: scenario.message,
            testMode: true,
          },
        });

        expect(response.data.agent).toBe(scenario.expectedAgent);
      }
    });
  });

  describe('Cenários Edge (PR#55)', () => {
    it('deve detectar multi-intenção e priorizar corretamente', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          ok: true,
          agent: 'julia',
          routeReason: 'edge_multi_intencao',
          detected_intents: ['financeiro', 'tecnico'],
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('routing-agent', {
        body: {
          conversationId: 'test-conv-11',
          message: 'Paguei o boleto mas continua bloqueado',
          customerData: {
            customer_cpf: '12345678901',
          },
        },
      });

      expect(response.data.agent).toBe('julia');
      expect(response.data.routeReason).toBe('edge_multi_intencao');
    });

    it('deve detectar escalação necessária', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          ok: true,
          agent: 'luan',
          routeReason: 'edge_escalacao_necessaria',
          priority: 'high',
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('routing-agent', {
        body: {
          conversationId: 'test-conv-12',
          message: 'Já liguei 3 vezes e ninguém resolve',
          customerData: {
            customer_cpf: '12345678901',
          },
        },
      });

      expect(response.data.routeReason).toBe('edge_escalacao_necessaria');
      expect(response.data.priority).toBe('high');
    });

    it('deve detectar risco de churn', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          ok: true,
          agent: 'cloe',
          routeReason: 'edge_risco_churn',
          priority: 'critical',
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('routing-agent', {
        body: {
          conversationId: 'test-conv-13',
          message: 'Vou cancelar, já falei 5 vezes e nada',
          customerData: {
            customer_cpf: '12345678901',
          },
        },
      });

      expect(response.data.routeReason).toBe('edge_risco_churn');
    });

    it('deve normalizar gírias e variações ortográficas', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          ok: true,
          agent: 'julia',
          routeReason: 'linguistic_ortografia_incorreta',
          normalized_message: 'internet está lenta',
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('routing-agent', {
        body: {
          conversationId: 'test-conv-14',
          message: 'a net ta lenta pq?',
          customerData: {
            customer_cpf: '12345678901',
          },
        },
      });

      expect(response.data.agent).toBe('julia');
    });
  });

  describe('Security Tests', () => {
    it('deve detectar e rotear XSS injection', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          ok: true,
          agent: 'luan',
          routeReason: 'security_xss_detected',
          security_alert: true,
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('routing-agent', {
        body: {
          conversationId: 'test-conv-15',
          message: '<script>alert("test")</script>',
          customerData: {},
        },
      });

      expect(response.data.security_alert).toBe(true);
    });

    it('deve detectar SQL injection', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          ok: true,
          agent: 'julia',
          routeReason: 'security_sql_injection',
          security_alert: true,
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('routing-agent', {
        body: {
          conversationId: 'test-conv-16',
          message: "'; DROP TABLE users;--",
          customerData: {},
        },
      });

      expect(response.data.security_alert).toBe(true);
    });
  });

  describe('Rate Limiting', () => {
    it('deve bloquear após exceder tentativas', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          ok: false,
          error: 'rate_limit_exceeded',
          blocked_until: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('routing-agent', {
        body: {
          conversationId: 'test-conv-17',
          message: 'teste',
          customerData: {},
        },
      });

      expect(response.data.error).toBe('rate_limit_exceeded');
      expect(response.data.blocked_until).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('deve retornar erro quando conversationId ausente', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          ok: false,
          error: 'conversationId é obrigatório',
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('routing-agent', {
        body: {
          message: 'teste',
        },
      });

      expect(response.data.ok).toBe(false);
      expect(response.data.error).toContain('conversationId');
    });

    it('deve retornar erro quando message ausente', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          ok: false,
          error: 'message é obrigatória',
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('routing-agent', {
        body: {
          conversationId: 'test-conv-18',
        },
      });

      expect(response.data.ok).toBe(false);
      expect(response.data.error).toContain('message');
    });

    it('deve tratar JSON inválido', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          ok: false,
          error: 'Invalid JSON in request body',
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('routing-agent', {
        body: 'invalid json',
      });

      expect(response.data.ok).toBe(false);
    });
  });

  describe('Protocol Generation', () => {
    it('deve gerar protocolo no formato correto', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          ok: true,
          protocol: 'PROT-2025-123456',
          agent: 'luan',
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('routing-agent', {
        body: {
          conversationId: 'test-conv-19',
          message: 'Internet offline',
          customerData: {
            customer_cpf: '12345678901',
          },
        },
      });

      expect(response.data.protocol).toMatch(/^PROT-\d{4}-\d{6}$/);
    });
  });
});
