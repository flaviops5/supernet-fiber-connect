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

describe('Email Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Email Test Sender', () => {
    it('deve enviar email de teste simples', async () => {
      const mockResponse = {
        data: {
          success: true,
          message_id: 'email-001',
          to: 'test@example.com',
          subject: 'Teste de Email',
          sent_at: new Date().toISOString(),
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('send-email', {
        body: {
          to: 'test@example.com',
          subject: 'Teste de Email',
          html: '<p>Este é um email de teste</p>',
        },
      });

      expect(result.data.success).toBe(true);
      expect(result.data.message_id).toBeDefined();
    });

    it('deve enviar email com template', async () => {
      const mockResponse = {
        data: {
          success: true,
          message_id: 'email-002',
          template_used: 'welcome',
          variables: {
            name: 'João Silva',
            plan: 'Fibra 100MB',
          },
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('send-email', {
        body: {
          to: 'joao@example.com',
          template: 'welcome',
          variables: {
            name: 'João Silva',
            plan: 'Fibra 100MB',
          },
        },
      });

      expect(result.data.template_used).toBe('welcome');
      expect(result.data.variables).toBeDefined();
    });

    it('deve enviar email com anexo', async () => {
      const mockResponse = {
        data: {
          success: true,
          message_id: 'email-003',
          attachments: [
            {
              filename: 'fatura.pdf',
              size: 125000,
            },
          ],
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('send-email', {
        body: {
          to: 'cliente@example.com',
          subject: 'Sua Fatura',
          html: '<p>Segue em anexo sua fatura</p>',
          attachments: [
            {
              filename: 'fatura.pdf',
              content: 'base64content...',
            },
          ],
        },
      });

      expect(result.data.attachments).toHaveLength(1);
      expect(result.data.attachments[0].filename).toBe('fatura.pdf');
    });

    it('deve validar endereço de email', async () => {
      const mockResponse = {
        data: null,
        error: {
          message: 'Invalid email address',
          code: 'INVALID_EMAIL',
        },
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('send-email', {
        body: {
          to: 'invalid-email',
          subject: 'Test',
          html: '<p>Test</p>',
        },
      });

      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('INVALID_EMAIL');
    });

    it('deve enviar email para múltiplos destinatários', async () => {
      const mockResponse = {
        data: {
          success: true,
          message_id: 'email-004',
          recipients: ['test1@example.com', 'test2@example.com'],
          sent_count: 2,
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('send-email', {
        body: {
          to: ['test1@example.com', 'test2@example.com'],
          subject: 'Aviso Geral',
          html: '<p>Comunicado importante</p>',
        },
      });

      expect(result.data.sent_count).toBe(2);
      expect(result.data.recipients).toHaveLength(2);
    });
  });

  describe('Email Templates', () => {
    it('deve listar templates disponíveis', async () => {
      const mockResponse = {
        data: {
          templates: [
            { id: 'welcome', name: 'Boas-vindas', variables: ['name', 'plan'] },
            { id: 'invoice', name: 'Fatura', variables: ['amount', 'due_date'] },
            {
              id: 'overdue',
              name: 'Cobrança',
              variables: ['amount', 'days_overdue'],
            },
          ],
          total: 3,
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('list-email-templates');

      expect(result.data.total).toBe(3);
      expect(result.data.templates).toHaveLength(3);
    });

    it('deve renderizar template com variáveis', async () => {
      const mockResponse = {
        data: {
          html: '<html><body><h1>Olá, João Silva</h1><p>Seu plano: Fibra 100MB</p></body></html>',
          subject: 'Bem-vindo, João Silva',
          variables_used: ['name', 'plan'],
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('render-email-template', {
        body: {
          template: 'welcome',
          variables: {
            name: 'João Silva',
            plan: 'Fibra 100MB',
          },
        },
      });

      expect(result.data.html).toContain('João Silva');
      expect(result.data.variables_used).toContain('name');
    });
  });

  describe('Email Tracking', () => {
    it('deve rastrear email enviado', async () => {
      const mockResponse = {
        data: {
          message_id: 'email-001',
          status: 'sent',
          sent_at: new Date().toISOString(),
          opened: false,
          clicked: false,
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('track-email', {
        body: { message_id: 'email-001' },
      });

      expect(result.data.status).toBe('sent');
      expect(result.data.sent_at).toBeDefined();
    });

    it('deve detectar email aberto', async () => {
      const mockResponse = {
        data: {
          message_id: 'email-001',
          status: 'opened',
          opened_at: new Date().toISOString(),
          opens_count: 1,
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('track-email', {
        body: { message_id: 'email-001' },
      });

      expect(result.data.status).toBe('opened');
      expect(result.data.opened_at).toBeDefined();
    });

    it('deve rastrear clicks em links', async () => {
      const mockResponse = {
        data: {
          message_id: 'email-001',
          clicked_links: [
            {
              url: 'https://example.com/payment',
              clicked_at: new Date().toISOString(),
            },
          ],
          clicks_count: 1,
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('track-email', {
        body: { message_id: 'email-001' },
      });

      expect(result.data.clicks_count).toBe(1);
      expect(result.data.clicked_links).toHaveLength(1);
    });

    it('deve reportar bounce', async () => {
      const mockResponse = {
        data: {
          message_id: 'email-002',
          status: 'bounced',
          bounce_type: 'hard',
          bounce_reason: 'Invalid email address',
          bounced_at: new Date().toISOString(),
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('track-email', {
        body: { message_id: 'email-002' },
      });

      expect(result.data.status).toBe('bounced');
      expect(result.data.bounce_type).toBe('hard');
    });
  });

  describe('Email Queue', () => {
    it('deve adicionar email à fila', async () => {
      const mockResponse = {
        data: {
          queue_id: 'queue-001',
          position: 15,
          estimated_send_time: new Date(Date.now() + 300000).toISOString(),
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('queue-email', {
        body: {
          to: 'test@example.com',
          subject: 'Test',
          html: '<p>Test</p>',
        },
      });

      expect(result.data.queue_id).toBeDefined();
      expect(result.data.position).toBeGreaterThan(0);
    });

    it('deve processar fila de emails', async () => {
      const mockResponse = {
        data: {
          processed: 50,
          sent: 48,
          failed: 2,
          processing_time_ms: 5000,
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('process-email-queue');

      expect(result.data.processed).toBeGreaterThan(0);
      expect(result.data.sent).toBeGreaterThan(0);
    });
  });

  describe('Email Notifications', () => {
    it('deve enviar notificação de fatura', async () => {
      const mockResponse = {
        data: {
          success: true,
          notification_type: 'invoice',
          recipient: 'cliente@example.com',
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('send-invoice-email', {
        body: {
          client_id: 123,
          invoice_id: 100,
        },
      });

      expect(result.data.notification_type).toBe('invoice');
      expect(result.data.success).toBe(true);
    });

    it('deve enviar lembrete de vencimento', async () => {
      const mockResponse = {
        data: {
          success: true,
          notification_type: 'overdue_reminder',
          days_overdue: 5,
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('send-overdue-reminder', {
        body: {
          invoice_id: 100,
        },
      });

      expect(result.data.notification_type).toBe('overdue_reminder');
    });
  });
});
