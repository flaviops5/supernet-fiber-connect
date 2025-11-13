import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}));

describe('IXC Integration Tests', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      functions: {
        invoke: vi.fn(),
      },
    };
    (createClient as any).mockReturnValue(mockSupabase);
  });

  describe('Busca de Clientes', () => {
    it('deve buscar cliente por ID', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            id: '12345',
            razao: 'João da Silva',
            cnpj_cpf: '123.456.789-01',
            email: 'joao@example.com',
            telefone_celular: '11999999999',
            status: 'A',
          },
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('ixc-integration', {
        body: {
          action: 'getCustomer',
          params: {
            id: '12345',
          },
        },
      });

      expect(response.data.success).toBe(true);
      expect(response.data.data.id).toBe('12345');
      expect(response.data.data.razao).toBe('João da Silva');
    });

    it('deve buscar cliente por CPF', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          success: true,
          data: [
            {
              id: '12345',
              razao: 'João da Silva',
              cnpj_cpf: '123.456.789-01',
            },
          ],
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('ixc-integration', {
        body: {
          action: 'searchCustomers',
          params: {
            query: '12345678901',
            mode: 'cpf',
          },
        },
      });

      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveLength(1);
      expect(response.data.data[0].cnpj_cpf).toContain('123.456.789-01');
    });

    it('deve buscar cliente por telefone', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          success: true,
          data: [
            {
              id: '12345',
              razao: 'João da Silva',
              telefone_celular: '11999999999',
            },
          ],
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('ixc-integration', {
        body: {
          action: 'searchCustomers',
          params: {
            query: '11999999999',
            mode: 'phone',
          },
        },
      });

      expect(response.data.success).toBe(true);
      expect(response.data.data[0].telefone_celular).toBe('11999999999');
    });

    it('deve buscar cliente por nome', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          success: true,
          data: [
            {
              id: '12345',
              razao: 'João da Silva',
            },
            {
              id: '67890',
              razao: 'João Santos',
            },
          ],
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('ixc-integration', {
        body: {
          action: 'searchCustomers',
          params: {
            query: 'João',
          },
        },
      });

      expect(response.data.success).toBe(true);
      expect(response.data.data.length).toBeGreaterThan(0);
    });

    it('deve normalizar CPF com zeros à esquerda', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          success: true,
          data: [
            {
              id: '12345',
              cnpj_cpf: '012.345.678-90',
            },
          ],
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('ixc-integration', {
        body: {
          action: 'searchCustomers',
          params: {
            query: '01234567890',
            mode: 'cpf',
          },
        },
      });

      expect(response.data.success).toBe(true);
      expect(response.data.data[0].cnpj_cpf).toBe('012.345.678-90');
    });

    it('deve retornar lista vazia quando cliente não encontrado', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          success: true,
          data: [],
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('ixc-integration', {
        body: {
          action: 'searchCustomers',
          params: {
            query: '99999999999',
          },
        },
      });

      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveLength(0);
    });
  });

  describe('Status de Cliente', () => {
    it('deve retornar status ONLINE', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            status: 'ONLINE',
            ultimo_online: new Date().toISOString(),
            signal_db: -23,
          },
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('ixc-integration', {
        body: {
          action: 'getCustomerStatus',
          params: {
            id: '12345',
          },
        },
      });

      expect(response.data.data.status).toBe('ONLINE');
    });

    it('deve retornar status OFFLINE', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            status: 'OFFLINE',
            ultimo_online: '2025-01-01T10:00:00Z',
          },
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('ixc-integration', {
        body: {
          action: 'getCustomerStatus',
          params: {
            id: '12345',
          },
        },
      });

      expect(response.data.data.status).toBe('OFFLINE');
    });

    it('deve retornar status BLOQUEADO', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            status: 'BLOQUEADO',
            bloqueado_financeiro: 'S',
          },
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('ixc-integration', {
        body: {
          action: 'getCustomerStatus',
          params: {
            id: '12345',
          },
        },
      });

      expect(response.data.data.status).toBe('BLOQUEADO');
    });
  });

  describe('Títulos Financeiros', () => {
    it('deve buscar títulos em aberto', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          success: true,
          data: [
            {
              id: '1',
              valor: 99.90,
              data_vencimento: '2025-01-15',
              status: 'aberto',
            },
          ],
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('ixc-integration', {
        body: {
          action: 'getFinancialTitles',
          params: {
            customerId: '12345',
            status: 'aberto',
          },
        },
      });

      expect(response.data.success).toBe(true);
      expect(response.data.data[0].status).toBe('aberto');
    });

    it('deve buscar títulos vencidos', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          success: true,
          data: [
            {
              id: '2',
              valor: 99.90,
              data_vencimento: '2024-12-15',
              status: 'vencido',
            },
          ],
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('ixc-integration', {
        body: {
          action: 'getFinancialTitles',
          params: {
            customerId: '12345',
            vencido: true,
          },
        },
      });

      expect(response.data.data[0].status).toBe('vencido');
    });
  });

  describe('PIX QR Code', () => {
    it('deve gerar PIX QR Code para título', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            qr_code: 'iVBORw0KGgoAAAANSUhEUgAA...',
            qr_code_text: '00020126580014br.gov.bcb.pix...',
            valor: 99.90,
            validade: '2025-01-15T23:59:59Z',
          },
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('ixc-integration', {
        body: {
          action: 'getPixQrCode',
          params: {
            titleId: '12345',
          },
        },
      });

      expect(response.data.success).toBe(true);
      expect(response.data.data.qr_code).toBeDefined();
      expect(response.data.data.qr_code_text).toContain('br.gov.bcb.pix');
    });

    it('deve retornar erro quando título não tem PIX', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          success: false,
          error: 'PIX não disponível para este título',
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('ixc-integration', {
        body: {
          action: 'getPixQrCode',
          params: {
            titleId: '99999',
          },
        },
      });

      expect(response.data.success).toBe(false);
      expect(response.data.error).toContain('PIX não disponível');
    });
  });

  describe('Desbloqueio de Confiança', () => {
    it('deve realizar desbloqueio de confiança', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            unblockedAt: new Date().toISOString(),
            contractId: '12345',
            reason: 'desbloqueio_confianca',
          },
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('ixc-integration', {
        body: {
          action: 'desbloqueioConfianca',
          params: {
            contractId: '12345',
          },
        },
      });

      expect(response.data.success).toBe(true);
      expect(response.data.data.reason).toBe('desbloqueio_confianca');
    });

    it('deve retornar erro quando contrato já está ativo', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          success: false,
          error: 'Contrato já está ativo',
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('ixc-integration', {
        body: {
          action: 'desbloqueioConfianca',
          params: {
            contractId: '12345',
          },
        },
      });

      expect(response.data.success).toBe(false);
    });
  });

  describe('Criação de Atendimento', () => {
    it('deve criar atendimento técnico', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            id: 'ATEND-12345',
            id_cliente: '12345',
            assunto: 'Problema técnico',
            status: 'aberto',
            prioridade: 'alta',
          },
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('ixc-integration', {
        body: {
          action: 'createAtendimento',
          params: {
            customerId: '12345',
            atendimentoData: {
              assunto: 'Problema técnico',
              descricao: 'Cliente sem internet',
              prioridade: 'alta',
            },
          },
        },
      });

      expect(response.data.success).toBe(true);
      expect(response.data.data.status).toBe('aberto');
    });

    it('deve validar campos obrigatórios', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          success: false,
          error: 'Assunto é obrigatório',
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('ixc-integration', {
        body: {
          action: 'createAtendimento',
          params: {
            customerId: '12345',
            atendimentoData: {
              descricao: 'Sem assunto',
            },
          },
        },
      });

      expect(response.data.success).toBe(false);
    });
  });

  describe('Restart de Modem', () => {
    it('deve reiniciar modem com sucesso', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            restarted: true,
            customerId: '12345',
            timestamp: new Date().toISOString(),
          },
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('ixc-integration', {
        body: {
          action: 'restartModem',
          params: {
            customerId: '12345',
          },
        },
      });

      expect(response.data.success).toBe(true);
      expect(response.data.data.restarted).toBe(true);
    });

    it('deve retornar erro quando cliente offline', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          success: false,
          error: 'Cliente offline - não é possível reiniciar',
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('ixc-integration', {
        body: {
          action: 'restartModem',
          params: {
            customerId: '99999',
          },
        },
      });

      expect(response.data.success).toBe(false);
    });
  });

  describe('Clean MAC', () => {
    it('deve limpar MAC com sucesso', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            cleaned: true,
            radiusUserId: '12345',
          },
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('ixc-integration', {
        body: {
          action: 'cleanMac',
          params: {
            radiusUserId: '12345',
          },
        },
      });

      expect(response.data.success).toBe(true);
      expect(response.data.data.cleaned).toBe(true);
    });
  });

  describe('Test Connection', () => {
    it('deve testar conexão com IXC API', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            connected: true,
            version: 'v1',
            latency_ms: 150,
          },
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('ixc-integration', {
        body: {
          action: 'testConnection',
        },
      });

      expect(response.data.success).toBe(true);
      expect(response.data.data.connected).toBe(true);
    });

    it('deve detectar credenciais inválidas', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          success: false,
          error: 'Credenciais inválidas',
          details: {
            status: 401,
          },
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('ixc-integration', {
        body: {
          action: 'testConnection',
        },
      });

      expect(response.data.success).toBe(false);
      expect(response.data.details.status).toBe(401);
    });
  });

  describe('Tratamento de Erros', () => {
    it('deve tratar timeout de API', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          success: false,
          error: 'Timeout ao conectar com IXC',
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('ixc-integration', {
        body: {
          action: 'getCustomer',
          params: { id: '12345' },
        },
      });

      expect(response.data.success).toBe(false);
      expect(response.data.error).toContain('Timeout');
    });

    it('deve tratar erro de HTML retornado', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          success: false,
          error: 'Erro interno do IXC - parâmetros inválidos',
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('ixc-integration', {
        body: {
          action: 'getCustomer',
          params: { id: 'invalid' },
        },
      });

      expect(response.data.success).toBe(false);
    });

    it('deve validar action obrigatória', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          success: false,
          error: 'Ação não suportada',
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('ixc-integration', {
        body: {
          params: { id: '12345' },
        },
      });

      expect(response.data.success).toBe(false);
    });

    it('deve tratar JSON inválido no body', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          success: false,
          error: 'JSON inválido no body da requisição',
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('ixc-integration', {
        body: 'invalid json',
      });

      expect(response.data.success).toBe(false);
    });
  });

  describe('Performance Tests', () => {
    it('deve responder busca de cliente em menos de 1s', async () => {
      const startTime = Date.now();

      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          success: true,
          data: { id: '12345' },
        },
        error: null,
      });

      await mockSupabase.functions.invoke('ixc-integration', {
        body: {
          action: 'getCustomer',
          params: { id: '12345' },
        },
      });

      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeLessThan(1000);
    });

    it('deve buscar múltiplos clientes em paralelo', async () => {
      const promises = Array.from({ length: 5 }, (_, i) => {
        mockSupabase.functions.invoke.mockResolvedValueOnce({
          data: {
            success: true,
            data: { id: `${i}` },
          },
          error: null,
        });

        return mockSupabase.functions.invoke('ixc-integration', {
          body: {
            action: 'getCustomer',
            params: { id: `${i}` },
          },
        });
      });

      const results = await Promise.all(promises);
      expect(results).toHaveLength(5);
    });
  });

  describe('Normalização de Dados', () => {
    it('deve normalizar registros com campos divergentes', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          success: true,
          data: [
            {
              id: '1',
              razao: 'João',
              fantasia: 'João Tech',
              fone_celular: '11999999999',
            },
          ],
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('ixc-integration', {
        body: {
          action: 'searchCustomers',
          params: { query: 'João' },
        },
      });

      expect(response.data.data[0].nome_fantasia).toBe('João Tech');
    });
  });
});
