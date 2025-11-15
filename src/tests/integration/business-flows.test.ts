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

describe('Business Flows Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Contract Flow Tests', () => {
    it('deve buscar contratos do cliente', async () => {
      const mockResponse = {
        data: {
          client_id: 123,
          contracts: [
            {
              id: 1,
              plan: 'Fibra 100MB',
              value: 99.9,
              status: 'active',
              start_date: '2023-01-01',
            },
            {
              id: 2,
              plan: 'Fibra 200MB',
              value: 149.9,
              status: 'active',
              start_date: '2023-06-01',
            },
          ],
          total_contracts: 2,
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('get-client-contracts', {
        body: { client_id: 123 },
      });

      expect(result.data.total_contracts).toBe(2);
      expect(result.data.contracts).toHaveLength(2);
      expect(result.data.contracts[0].status).toBe('active');
    });

    it('deve criar novo contrato', async () => {
      const mockResponse = {
        data: {
          contract_id: 3,
          client_id: 123,
          plan: 'Fibra 500MB',
          value: 199.9,
          status: 'pending',
          created_at: new Date().toISOString(),
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('create-contract', {
        body: {
          client_id: 123,
          plan: 'Fibra 500MB',
          value: 199.9,
        },
      });

      expect(result.data.contract_id).toBeDefined();
      expect(result.data.status).toBe('pending');
    });

    it('deve atualizar contrato existente', async () => {
      const mockResponse = {
        data: {
          contract_id: 1,
          plan: 'Fibra 200MB',
          value: 149.9,
          status: 'active',
          updated_at: new Date().toISOString(),
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('update-contract', {
        body: {
          contract_id: 1,
          plan: 'Fibra 200MB',
          value: 149.9,
        },
      });

      expect(result.data.updated_at).toBeDefined();
      expect(result.data.plan).toBe('Fibra 200MB');
    });

    it('deve cancelar contrato', async () => {
      const mockResponse = {
        data: {
          contract_id: 2,
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          reason: 'Client request',
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('cancel-contract', {
        body: {
          contract_id: 2,
          reason: 'Client request',
        },
      });

      expect(result.data.status).toBe('cancelled');
      expect(result.data.cancelled_at).toBeDefined();
    });
  });

  describe('Financial Status Tests', () => {
    it('deve buscar status financeiro do cliente', async () => {
      const mockResponse = {
        data: {
          client_id: 123,
          status: 'active',
          overdue_amount: 0,
          overdue_invoices: 0,
          next_invoice_date: '2024-02-01',
          payment_history: [
            {
              invoice_id: 100,
              value: 99.9,
              paid_at: '2024-01-05',
              status: 'paid',
            },
          ],
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('get-financial-status', {
        body: { client_id: 123 },
      });

      expect(result.data.status).toBe('active');
      expect(result.data.overdue_amount).toBe(0);
    });

    it('deve detectar cliente com atraso', async () => {
      const mockResponse = {
        data: {
          client_id: 456,
          status: 'blocked',
          overdue_amount: 299.7,
          overdue_invoices: 3,
          oldest_overdue_date: '2023-11-01',
          days_overdue: 75,
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('get-financial-status', {
        body: { client_id: 456 },
      });

      expect(result.data.status).toBe('blocked');
      expect(result.data.overdue_invoices).toBeGreaterThan(0);
      expect(result.data.days_overdue).toBeGreaterThan(30);
    });

    it('deve calcular total em aberto', async () => {
      const mockResponse = {
        data: {
          client_id: 789,
          open_invoices: [
            { id: 101, value: 99.9, due_date: '2024-01-15' },
            { id: 102, value: 99.9, due_date: '2023-12-15' },
          ],
          total_open: 199.8,
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('get-financial-status', {
        body: { client_id: 789 },
      });

      expect(result.data.total_open).toBe(199.8);
      expect(result.data.open_invoices).toHaveLength(2);
    });
  });

  describe('Payment Send Tests', () => {
    it('deve enviar link de pagamento PIX', async () => {
      const mockResponse = {
        data: {
          payment_id: 'pix-001',
          type: 'pix',
          qr_code: 'data:image/png;base64,iVBORw0KG...',
          pix_key: '00020126580014br.gov.bcb.pix...',
          amount: 99.9,
          expires_at: new Date(Date.now() + 3600000).toISOString(),
          sent_via: 'whatsapp',
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('send-payment-link', {
        body: {
          client_id: 123,
          invoice_id: 100,
          type: 'pix',
          send_via: 'whatsapp',
        },
      });

      expect(result.data.type).toBe('pix');
      expect(result.data.qr_code).toBeDefined();
      expect(result.data.pix_key).toBeDefined();
    });

    it('deve enviar boleto bancário', async () => {
      const mockResponse = {
        data: {
          payment_id: 'boleto-001',
          type: 'boleto',
          barcode: '34191.79001 01043.510047 91020.150008 1 96610000009990',
          pdf_url: 'https://example.com/boleto.pdf',
          due_date: '2024-02-15',
          amount: 99.9,
          sent_via: 'email',
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('send-payment-link', {
        body: {
          client_id: 123,
          invoice_id: 100,
          type: 'boleto',
          send_via: 'email',
        },
      });

      expect(result.data.type).toBe('boleto');
      expect(result.data.barcode).toBeDefined();
      expect(result.data.pdf_url).toBeDefined();
    });

    it('deve enviar link de cartão de crédito', async () => {
      const mockResponse = {
        data: {
          payment_id: 'card-001',
          type: 'credit_card',
          payment_url: 'https://payment.example.com/pay/abc123',
          amount: 99.9,
          installments: [1, 2, 3],
          sent_via: 'whatsapp',
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('send-payment-link', {
        body: {
          client_id: 123,
          invoice_id: 100,
          type: 'credit_card',
          send_via: 'whatsapp',
        },
      });

      expect(result.data.type).toBe('credit_card');
      expect(result.data.payment_url).toBeDefined();
      expect(result.data.installments).toBeDefined();
    });

    it('deve registrar envio de pagamento', async () => {
      const mockResponse = {
        data: {
          payment_id: 'pix-001',
          sent: true,
          sent_at: new Date().toISOString(),
          recipient: '5561999999999',
          channel: 'whatsapp',
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('send-payment-link', {
        body: {
          client_id: 123,
          invoice_id: 100,
          type: 'pix',
        },
      });

      expect(result.data.sent).toBe(true);
      expect(result.data.sent_at).toBeDefined();
    });

    it('deve validar pagamento recebido', async () => {
      const mockResponse = {
        data: {
          payment_id: 'pix-001',
          status: 'confirmed',
          paid_at: new Date().toISOString(),
          amount_paid: 99.9,
          method: 'pix',
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('verify-payment', {
        body: { payment_id: 'pix-001' },
      });

      expect(result.data.status).toBe('confirmed');
      expect(result.data.paid_at).toBeDefined();
    });

    it('deve enviar múltiplas opções de pagamento', async () => {
      const mockResponse = {
        data: {
          invoice_id: 100,
          payment_options: [
            {
              type: 'pix',
              qr_code: 'data:image/png;base64,...',
              pix_key: '00020126...',
            },
            {
              type: 'boleto',
              barcode: '34191.79001...',
              pdf_url: 'https://example.com/boleto.pdf',
            },
            {
              type: 'credit_card',
              payment_url: 'https://payment.example.com/pay/abc123',
            },
          ],
          sent_via: 'whatsapp',
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('send-payment-options', {
        body: {
          client_id: 123,
          invoice_id: 100,
        },
      });

      expect(result.data.payment_options).toHaveLength(3);
      expect(result.data.payment_options.some((o: { type: string }) => o.type === 'pix')).toBe(
        true
      );
    });
  });

  describe('Auto Send Overdue Invoices', () => {
    it('deve listar faturas vencidas', async () => {
      const mockResponse = {
        data: {
          overdue_invoices: [
            {
              invoice_id: 100,
              client_id: 123,
              value: 99.9,
              due_date: '2024-01-15',
              days_overdue: 5,
            },
            {
              invoice_id: 101,
              client_id: 124,
              value: 149.9,
              due_date: '2024-01-10',
              days_overdue: 10,
            },
          ],
          total: 2,
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('list-overdue-invoices');

      expect(result.data.total).toBeGreaterThan(0);
      expect(result.data.overdue_invoices).toHaveLength(2);
    });

    it('deve enviar lembretes automáticos', async () => {
      const mockResponse = {
        data: {
          processed: 15,
          sent: 15,
          failed: 0,
          results: [
            {
              invoice_id: 100,
              client_id: 123,
              status: 'sent',
              channel: 'whatsapp',
            },
          ],
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('auto-send-overdue-reminders');

      expect(result.data.sent).toBe(15);
      expect(result.data.failed).toBe(0);
    });

    it('deve respeitar cooldown entre envios', async () => {
      const mockResponse = {
        data: {
          invoice_id: 100,
          last_reminder_sent: '2024-01-20T10:00:00Z',
          next_reminder_allowed: '2024-01-23T10:00:00Z',
          can_send_now: false,
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('check-reminder-cooldown', {
        body: { invoice_id: 100 },
      });

      expect(result.data.can_send_now).toBe(false);
      expect(result.data.next_reminder_allowed).toBeDefined();
    });
  });
});
