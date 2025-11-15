import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

// Mock do Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe('WhatsApp Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('WhatsApp API Tester', () => {
    it('deve testar conexão com Evolution API', async () => {
      const mockResponse = {
        data: {
          success: true,
          instance: 'SDR2',
          status: 'connected',
          qr_code: null,
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('test-evolution-api', {
        body: { action: 'test-connection' },
      });

      expect(result.data.success).toBe(true);
      expect(result.data.status).toBe('connected');
    });

    it('deve detectar instância desconectada', async () => {
      const mockResponse = {
        data: {
          success: false,
          instance: 'SDR2',
          status: 'disconnected',
          qr_code: 'data:image/png;base64,iVBORw0KG...',
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('test-evolution-api', {
        body: { action: 'test-connection' },
      });

      expect(result.data.success).toBe(false);
      expect(result.data.status).toBe('disconnected');
      expect(result.data.qr_code).toBeDefined();
    });

    it('deve enviar mensagem de texto', async () => {
      const mockResponse = {
        data: {
          success: true,
          message_id: 'msg_12345',
          sent_at: new Date().toISOString(),
          recipient: '5561999999999',
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('send-whatsapp-message', {
        body: {
          to: '5561999999999',
          message: 'Olá, como posso ajudar?',
        },
      });

      expect(result.data.success).toBe(true);
      expect(result.data.message_id).toBeDefined();
    });

    it('deve enviar mensagem com mídia', async () => {
      const mockResponse = {
        data: {
          success: true,
          message_id: 'msg_12346',
          type: 'image',
          media_url: 'https://example.com/image.jpg',
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('send-whatsapp-message', {
        body: {
          to: '5561999999999',
          message: 'Aqui está a imagem solicitada',
          media_url: 'https://example.com/image.jpg',
          media_type: 'image',
        },
      });

      expect(result.data.success).toBe(true);
      expect(result.data.type).toBe('image');
    });

    it('deve validar número de telefone', async () => {
      const mockResponse = {
        data: null,
        error: {
          message: 'Invalid phone number format',
          code: 'INVALID_PHONE',
        },
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('send-whatsapp-message', {
        body: {
          to: '123',
          message: 'Test',
        },
      });

      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('INVALID_PHONE');
    });
  });

  describe('WhatsApp Flow Test', () => {
    it('deve simular fluxo completo de atendimento', async () => {
      const mockResponse = {
        data: {
          flow_id: 'flow-001',
          steps: [
            { step: 1, type: 'greeting', message: 'Olá! Como posso ajudar?' },
            { step: 2, type: 'cpf_request', message: 'Por favor, informe seu CPF.' },
            { step: 3, type: 'validation', status: 'success' },
            { step: 4, type: 'routing', department: 'Suporte Técnico' },
          ],
          status: 'completed',
          duration_ms: 15000,
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('test-whatsapp-flow', {
        body: {
          flow_type: 'support',
          test_data: {
            cpf: '12345678900',
            issue: 'Internet offline',
          },
        },
      });

      expect(result.data.status).toBe('completed');
      expect(result.data.steps.length).toBeGreaterThan(3);
    });

    it('deve testar fluxo de vendas', async () => {
      const mockResponse = {
        data: {
          flow_id: 'flow-002',
          steps: [
            { step: 1, type: 'greeting', agent: 'Vicente' },
            { step: 2, type: 'new_client', cpf: '99999999999' },
            { step: 3, type: 'plan_presentation', plans: ['100MB', '200MB'] },
            { step: 4, type: 'address_collection', status: 'pending' },
          ],
          status: 'in_progress',
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('test-whatsapp-flow', {
        body: {
          flow_type: 'sales',
          test_data: {
            cpf: '99999999999',
          },
        },
      });

      expect(result.data.steps[1].type).toBe('new_client');
      expect(result.data.steps[2].type).toBe('plan_presentation');
    });

    it('deve testar fluxo de suporte financeiro', async () => {
      const mockResponse = {
        data: {
          flow_id: 'flow-003',
          steps: [
            { step: 1, type: 'financial_status', status: 'blocked' },
            { step: 2, type: 'invoice_info', overdue: 199.8 },
            { step: 3, type: 'payment_options', pix: true, boleto: true },
            { step: 4, type: 'send_payment_link', success: true },
          ],
          status: 'completed',
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('test-whatsapp-flow', {
        body: {
          flow_type: 'financial',
          test_data: {
            cpf: '22222222222',
            status: 'blocked',
          },
        },
      });

      expect(result.data.steps.some((s: { type: string }) => s.type === 'payment_options')).toBe(
        true
      );
    });

    it('deve medir tempo de resposta do fluxo', async () => {
      const mockResponse = {
        data: {
          flow_id: 'flow-004',
          duration_ms: 12500,
          steps: 4,
          status: 'completed',
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('test-whatsapp-flow', {
        body: { flow_type: 'support' },
      });

      expect(result.data.duration_ms).toBeLessThan(30000);
    });
  });

  describe('WhatsApp Message Handling', () => {
    it('deve processar mensagem recebida', async () => {
      const mockResponse = {
        data: {
          message_id: 'msg-in-001',
          from: '5561999999999',
          content: 'Minha internet está fora',
          processed: true,
          intent: 'technical_support',
          confidence: 0.95,
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('process-whatsapp-message', {
        body: {
          message_id: 'msg-in-001',
          from: '5561999999999',
          content: 'Minha internet está fora',
        },
      });

      expect(result.data.processed).toBe(true);
      expect(result.data.intent).toBe('technical_support');
      expect(result.data.confidence).toBeGreaterThan(0.8);
    });

    it('deve detectar intenção de contratação', async () => {
      const mockResponse = {
        data: {
          message_id: 'msg-in-002',
          content: 'Quero contratar internet',
          intent: 'sales',
          confidence: 0.92,
          routed_to: 'Vicente',
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('process-whatsapp-message', {
        body: {
          content: 'Quero contratar internet',
        },
      });

      expect(result.data.intent).toBe('sales');
      expect(result.data.routed_to).toBe('Vicente');
    });

    it('deve processar mensagem com mídia', async () => {
      const mockResponse = {
        data: {
          message_id: 'msg-in-003',
          content: 'Foto do problema',
          media_type: 'image',
          media_url: 'https://example.com/photo.jpg',
          processed: true,
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('process-whatsapp-message', {
        body: {
          content: 'Foto do problema',
          media_type: 'image',
          media_url: 'https://example.com/photo.jpg',
        },
      });

      expect(result.data.media_type).toBe('image');
      expect(result.data.media_url).toBeDefined();
    });
  });

  describe('WhatsApp Status and Delivery', () => {
    it('deve verificar status de mensagem enviada', async () => {
      const mockResponse = {
        data: {
          message_id: 'msg_12345',
          status: 'delivered',
          delivered_at: new Date().toISOString(),
          read: false,
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('check-message-status', {
        body: { message_id: 'msg_12345' },
      });

      expect(result.data.status).toBe('delivered');
      expect(result.data.delivered_at).toBeDefined();
    });

    it('deve detectar mensagem lida', async () => {
      const mockResponse = {
        data: {
          message_id: 'msg_12345',
          status: 'read',
          read_at: new Date().toISOString(),
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('check-message-status', {
        body: { message_id: 'msg_12345' },
      });

      expect(result.data.status).toBe('read');
      expect(result.data.read_at).toBeDefined();
    });

    it('deve reportar falha no envio', async () => {
      const mockResponse = {
        data: {
          message_id: 'msg_12346',
          status: 'failed',
          error_code: 'INVALID_NUMBER',
          error_message: 'Number not registered on WhatsApp',
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('check-message-status', {
        body: { message_id: 'msg_12346' },
      });

      expect(result.data.status).toBe('failed');
      expect(result.data.error_code).toBeDefined();
    });
  });
});
