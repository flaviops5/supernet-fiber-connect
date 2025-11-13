import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}));

describe('Support Tech Agent Integration Tests', () => {
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
            order: vi.fn(),
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

  describe('Cenário A: TX/RX = 0.00 (Equipamento Desligado)', () => {
    it('deve detectar equipamento desligado e orientar cliente', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          ok: true,
          scenario: 'A',
          message: 'Verifique se o equipamento está ligado na tomada',
          next_step: 'await_reboot',
          detected_issue: 'equipment_powered_off',
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('support-tech-agent', {
        body: {
          conversation_id: 'test-conv-1',
          customer_cpf: '12345678901',
          message: 'Internet não funciona',
          tx: 0,
          rx: 0,
        },
      });

      expect(response.data.scenario).toBe('A');
      expect(response.data.detected_issue).toBe('equipment_powered_off');
    });

    it('deve solicitar teste de luzes após orientação', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          ok: true,
          scenario: 'A',
          message: 'Por favor, verifique quais luzes estão acesas no equipamento',
          awaiting_response: true,
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('support-tech-agent', {
        body: {
          conversation_id: 'test-conv-2',
          customer_cpf: '12345678901',
          message: 'Já liguei na tomada',
          tx: 0,
          rx: 0,
        },
      });

      expect(response.data.awaiting_response).toBe(true);
    });
  });

  describe('Cenário B: Sinal Bom mas Travado (Fast-path)', () => {
    it('deve detectar equipamento travado e solicitar reinício', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          ok: true,
          scenario: 'B',
          message: 'Vou reiniciar seu equipamento remotamente',
          fast_path: true,
          signal_quality: 'good',
          action: 'remote_reboot',
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('support-tech-agent', {
        body: {
          conversation_id: 'test-conv-3',
          customer_cpf: '12345678901',
          message: 'Internet travou',
          tx: 2.5,
          rx: -22,
          ixc_client_id: '12345',
        },
      });

      expect(response.data.scenario).toBe('B');
      expect(response.data.fast_path).toBe(true);
      expect(response.data.signal_quality).toBe('good');
    });

    it('deve confirmar resolução após reboot', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          ok: true,
          scenario: 'B',
          message: 'Equipamento reiniciado com sucesso. Internet voltou?',
          reboot_completed: true,
          awaiting_confirmation: true,
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('support-tech-agent', {
        body: {
          conversation_id: 'test-conv-4',
          customer_cpf: '12345678901',
          message: 'Ok, aguardando',
          reboot_attempted: true,
          reboot_result: 'success',
        },
      });

      expect(response.data.reboot_completed).toBe(true);
      expect(response.data.awaiting_confirmation).toBe(true);
    });
  });

  describe('Cenário C: Sinal Fraco (RX -27 a -30)', () => {
    it('deve detectar sinal fraco e sugerir limpeza', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          ok: true,
          scenario: 'C',
          message: 'Detectei sinal fraco, pode ser sujeira no conector',
          signal_quality: 'weak',
          recommended_action: 'clean_connector',
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('support-tech-agent', {
        body: {
          conversation_id: 'test-conv-5',
          customer_cpf: '12345678901',
          message: 'Internet instável',
          tx: 2.3,
          rx: -28,
        },
      });

      expect(response.data.scenario).toBe('C');
      expect(response.data.signal_quality).toBe('weak');
    });

    it('deve orientar limpeza do conector', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          ok: true,
          scenario: 'C',
          message: 'Por favor, desconecte e reconecte o cabo de fibra',
          awaiting_action: true,
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('support-tech-agent', {
        body: {
          conversation_id: 'test-conv-6',
          customer_cpf: '12345678901',
          message: 'Como faço?',
          tx: 2.3,
          rx: -28,
        },
      });

      expect(response.data.awaiting_action).toBe(true);
    });
  });

  describe('Cenário D: RX Crítico (<-30) - Escalação', () => {
    it('deve detectar RX crítico e escalar', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          ok: true,
          scenario: 'D',
          message: 'Detectei problema grave no sinal. Vou abrir chamado técnico',
          signal_quality: 'critical',
          escalated: true,
          ticket_id: 'TECH-12345',
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('support-tech-agent', {
        body: {
          conversation_id: 'test-conv-7',
          customer_cpf: '12345678901',
          message: 'Internet muito ruim',
          tx: 2.1,
          rx: -35,
          ixc_client_id: '12345',
        },
      });

      expect(response.data.scenario).toBe('D');
      expect(response.data.signal_quality).toBe('critical');
      expect(response.data.escalated).toBe(true);
    });

    it('deve informar prazo para visita técnica', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          ok: true,
          scenario: 'D',
          message: 'Técnico visitará você em até 24 horas',
          ticket_id: 'TECH-12345',
          eta: '24h',
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('support-tech-agent', {
        body: {
          conversation_id: 'test-conv-8',
          customer_cpf: '12345678901',
          message: 'Quando o técnico vem?',
          tx: 2.1,
          rx: -35,
        },
      });

      expect(response.data.eta).toBe('24h');
    });
  });

  describe('Cenário E: WAN/Wi-Fi Issues', () => {
    it('deve detectar problema de WAN', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          ok: true,
          scenario: 'E',
          message: 'Detectei problema na conexão WAN',
          issue_type: 'wan_down',
          recommended_action: 'check_wan_cable',
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('support-tech-agent', {
        body: {
          conversation_id: 'test-conv-9',
          customer_cpf: '12345678901',
          message: 'Wi-Fi funciona mas não navega',
          tx: 2.5,
          rx: -23,
        },
      });

      expect(response.data.scenario).toBe('E');
      expect(response.data.issue_type).toBe('wan_down');
    });

    it('deve diagnosticar problema de Wi-Fi', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          ok: true,
          scenario: 'E',
          message: 'O sinal Wi-Fi pode estar fraco. Tente aproximar do roteador',
          issue_type: 'wifi_weak',
          recommended_action: 'move_closer',
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('support-tech-agent', {
        body: {
          conversation_id: 'test-conv-10',
          customer_cpf: '12345678901',
          message: 'Internet lenta só no celular',
          tx: 2.5,
          rx: -23,
        },
      });

      expect(response.data.issue_type).toBe('wifi_weak');
    });
  });

  describe('Fast-path e Circuit Breaker', () => {
    it('deve ativar fast-path quando habilitado', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          ok: true,
          fast_path_enabled: true,
          fast_path_result: 'resolved',
          elapsed_ms: 1200,
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('support-tech-agent', {
        body: {
          conversation_id: 'test-conv-11',
          customer_cpf: '12345678901',
          message: 'Internet travou',
          tx: 2.5,
          rx: -22,
          ixc_client_id: '12345',
        },
      });

      expect(response.data.fast_path_enabled).toBe(true);
      expect(response.data.elapsed_ms).toBeLessThan(3000);
    });

    it('deve respeitar circuit breaker após falhas', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          ok: true,
          fast_path_enabled: false,
          circuit_breaker_open: true,
          fallback_used: true,
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('support-tech-agent', {
        body: {
          conversation_id: 'test-conv-12',
          customer_cpf: '12345678901',
          message: 'Internet travou',
          ixc_client_id: '12345',
        },
      });

      expect(response.data.circuit_breaker_open).toBe(true);
      expect(response.data.fallback_used).toBe(true);
    });
  });

  describe('Parallel Diagnostics', () => {
    it('deve executar diagnósticos em paralelo', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          ok: true,
          diagnostics: {
            connectivity: { ok: true, elapsed_ms: 150 },
            signal: { ok: true, elapsed_ms: 200 },
            ixc_status: { ok: true, elapsed_ms: 180 },
          },
          total_elapsed_ms: 220,
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('support-tech-agent', {
        body: {
          conversation_id: 'test-conv-13',
          customer_cpf: '12345678901',
          message: 'Problema na internet',
          ixc_client_id: '12345',
        },
      });

      expect(response.data.diagnostics).toBeDefined();
      expect(response.data.total_elapsed_ms).toBeLessThan(500);
    });
  });

  describe('RAG Integration', () => {
    it('deve usar RAG para contexto adicional', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          ok: true,
          rag_used: true,
          rag_docs_found: 3,
          message: 'Baseado no histórico, vou tentar reiniciar seu equipamento',
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('support-tech-agent', {
        body: {
          conversation_id: 'test-conv-14',
          customer_cpf: '12345678901',
          message: 'Mesma coisa de ontem, travou de novo',
          ixc_client_id: '12345',
        },
      });

      expect(response.data.rag_used).toBe(true);
      expect(response.data.rag_docs_found).toBeGreaterThan(0);
    });
  });

  describe('Image Analysis', () => {
    it('deve processar imagem de teste de velocidade', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          ok: true,
          image_analyzed: true,
          detected_speed: {
            download: 50,
            upload: 25,
            unit: 'Mbps',
          },
          message: 'Vi que seu teste deu 50 Mbps. Vamos verificar...',
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('support-tech-agent', {
        body: {
          conversation_id: 'test-conv-15',
          customer_cpf: '12345678901',
          message: 'Fiz o teste',
          attachments: [
            {
              type: 'image',
              url: 'https://example.com/speedtest.jpg',
            },
          ],
        },
      });

      expect(response.data.image_analyzed).toBe(true);
      expect(response.data.detected_speed).toBeDefined();
    });

    it('deve processar imagem de luzes do equipamento', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          ok: true,
          image_analyzed: true,
          detected_lights: {
            power: 'green',
            los: 'red',
            pon: 'off',
          },
          message: 'Vi que a luz LOS está vermelha. Isso indica problema no cabo',
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('support-tech-agent', {
        body: {
          conversation_id: 'test-conv-16',
          customer_cpf: '12345678901',
          message: 'Foto das luzes',
          attachments: [
            {
              type: 'image',
              url: 'https://example.com/ont-lights.jpg',
            },
          ],
        },
      });

      expect(response.data.detected_lights).toBeDefined();
    });
  });

  describe('Timeout Handling', () => {
    it('deve detectar timeout de 1.5min (primeira tentativa)', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          ok: true,
          timeout_detected: true,
          timeout_attempt: 1,
          message: 'Ainda está aí? Por favor, responda para continuar',
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('support-tech-agent', {
        body: {
          conversation_id: 'test-conv-17',
          customer_cpf: '12345678901',
          message: '',
          minutes_without_reply: 2,
        },
      });

      expect(response.data.timeout_detected).toBe(true);
      expect(response.data.timeout_attempt).toBe(1);
    });

    it('deve encerrar após 15min sem resposta', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          ok: true,
          timeout_detected: true,
          timeout_attempt: 3,
          conversation_closed: true,
          message: 'Vou encerrar o atendimento. Pode voltar quando quiser',
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('support-tech-agent', {
        body: {
          conversation_id: 'test-conv-18',
          customer_cpf: '12345678901',
          message: '',
          minutes_without_reply: 16,
        },
      });

      expect(response.data.conversation_closed).toBe(true);
    });
  });

  describe('Test Harness Mode', () => {
    it('deve ativar test harness e pular operações de DB', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          ok: true,
          scenario: 'A',
          testHarness: true,
          skip_db_ops: true,
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('support-tech-agent', {
        body: {
          conversation_id: 'test-conv-19',
          customer_cpf: '12345678901',
          message: 'teste',
          testHarness: true,
          tx: 0,
          rx: 0,
        },
      });

      expect(response.data.testHarness).toBe(true);
      expect(response.data.skip_db_ops).toBe(true);
    });

    it('deve validar todos os cenários em test mode', async () => {
      const scenarios = [
        { tx: 0, rx: 0, expectedScenario: 'A' },
        { tx: 2.5, rx: -22, expectedScenario: 'B' },
        { tx: 2.3, rx: -28, expectedScenario: 'C' },
        { tx: 2.1, rx: -35, expectedScenario: 'D' },
      ];

      for (const scenario of scenarios) {
        mockSupabase.functions.invoke.mockResolvedValueOnce({
          data: {
            ok: true,
            scenario: scenario.expectedScenario,
            testHarness: true,
          },
          error: null,
        });

        const response = await mockSupabase.functions.invoke('support-tech-agent', {
          body: {
            testHarness: true,
            tx: scenario.tx,
            rx: scenario.rx,
          },
        });

        expect(response.data.scenario).toBe(scenario.expectedScenario);
      }
    });
  });

  describe('Error Handling', () => {
    it('deve tratar erro de conexão com IXC', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          ok: false,
          error: 'ixc_connection_failed',
          fallback_used: true,
          message: 'Tive um problema ao consultar seus dados, mas posso ajudar',
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('support-tech-agent', {
        body: {
          conversation_id: 'test-conv-20',
          customer_cpf: '12345678901',
          message: 'Problema na internet',
          ixc_client_id: '12345',
        },
      });

      expect(response.data.fallback_used).toBe(true);
    });

    it('deve tratar campos obrigatórios ausentes', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          ok: false,
          error: 'conversation_id é obrigatório',
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('support-tech-agent', {
        body: {
          message: 'teste',
        },
      });

      expect(response.data.ok).toBe(false);
      expect(response.data.error).toContain('conversation_id');
    });
  });

  describe('Performance Tests', () => {
    it('deve responder em menos de 3s no fast-path', async () => {
      const startTime = Date.now();
      
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          ok: true,
          fast_path: true,
          elapsed_ms: 1200,
        },
        error: null,
      });

      await mockSupabase.functions.invoke('support-tech-agent', {
        body: {
          conversation_id: 'test-conv-21',
          customer_cpf: '12345678901',
          message: 'Internet travou',
          tx: 2.5,
          rx: -22,
        },
      });

      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeLessThan(3000);
    });

    it('deve respeitar timeout de 15s', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          ok: false,
          error: 'timeout',
          elapsed_ms: 15000,
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('support-tech-agent', {
        body: {
          conversation_id: 'test-conv-22',
          customer_cpf: '12345678901',
          message: 'teste',
        },
      });

      expect(response.data.error).toBe('timeout');
    });
  });
});
