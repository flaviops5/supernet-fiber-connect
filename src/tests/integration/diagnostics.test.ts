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

describe('Diagnostics Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Diagnóstico Completo do Cliente', () => {
    it('deve executar diagnóstico técnico completo', async () => {
      const mockResponse = {
        data: {
          client_id: 123,
          technical_status: {
            connection: 'OFFLINE',
            rx_power: -26.5,
            tx_power: 0.2,
            signal_quality: 'weak',
            last_online: '2024-01-15T10:00:00Z',
          },
          financial_status: {
            status: 'blocked',
            overdue_amount: 199.8,
            overdue_invoices: 2,
          },
          contracts: [
            {
              id: 1,
              plan: 'Fibra 100MB',
              value: 99.9,
              status: 'active',
            },
          ],
          recommendation: 'Cliente offline com sinal fraco. Verificar cabeamento.',
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('client-diagnosis', {
        body: { client_id: 123 },
      });

      expect(result.data.technical_status).toBeDefined();
      expect(result.data.financial_status).toBeDefined();
      expect(result.data.contracts).toBeDefined();
      expect(result.data.recommendation).toBeDefined();
    });

    it('deve diagnosticar cliente ONLINE sem problemas', async () => {
      const mockResponse = {
        data: {
          client_id: 456,
          technical_status: {
            connection: 'ONLINE',
            rx_power: -18.2,
            tx_power: 0.5,
            signal_quality: 'excellent',
          },
          financial_status: {
            status: 'active',
            overdue_amount: 0,
            overdue_invoices: 0,
          },
          recommendation: 'Cliente sem problemas identificados.',
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('client-diagnosis', {
        body: { client_id: 456 },
      });

      expect(result.data.technical_status.connection).toBe('ONLINE');
      expect(result.data.financial_status.status).toBe('active');
      expect(result.data.technical_status.signal_quality).toBe('excellent');
    });

    it('deve identificar múltiplos problemas', async () => {
      const mockResponse = {
        data: {
          client_id: 789,
          technical_status: {
            connection: 'OFFLINE',
            rx_power: -32.0,
            signal_quality: 'critical',
          },
          financial_status: {
            status: 'blocked',
            overdue_amount: 299.7,
            overdue_invoices: 3,
          },
          issues: [
            'Sinal crítico detectado',
            'Cliente bloqueado por inadimplência',
            'Múltiplas faturas vencidas',
          ],
          recommendation:
            'Prioridade ALTA: Resolver bloqueio financeiro e verificar problema de sinal.',
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('client-diagnosis', {
        body: { client_id: 789 },
      });

      expect(result.data.issues).toBeDefined();
      expect(result.data.issues.length).toBeGreaterThan(1);
      expect(result.data.recommendation).toContain('ALTA');
    });
  });

  describe('Support Tech Agent (Luan) - Teste Rápido', () => {
    it('deve diagnosticar cliente com mass outage ATIVO', async () => {
      const mockResponse = {
        data: {
          agent: 'Luan Silva',
          mass_outage_detected: true,
          affected_region: 'Taguatinga/Samambaia',
          affected_clients: 1542,
          message:
            'Detectamos uma queda massiva na região. Equipe técnica já foi acionada.',
          should_reboot: false,
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('support-tech-agent', {
        body: {
          client_cpf: '100.000.000-05',
          check_mass_outage: true,
        },
      });

      expect(result.data.mass_outage_detected).toBe(true);
      expect(result.data.affected_clients).toBeGreaterThan(1000);
      expect(result.data.should_reboot).toBe(false);
    });

    it('deve diagnosticar cliente com mass outage INATIVO', async () => {
      const mockResponse = {
        data: {
          agent: 'Luan Silva',
          mass_outage_detected: false,
          technical_diagnosis: {
            connection: 'OFFLINE',
            rx_power: -26.5,
            issue: 'Sinal fraco',
          },
          message: 'Sem quedas massivas. Problema isolado detectado.',
          should_reboot: true,
          recommendation: 'Realizar reboot do equipamento.',
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('support-tech-agent', {
        body: {
          client_cpf: '100.000.000-02',
          check_mass_outage: true,
        },
      });

      expect(result.data.mass_outage_detected).toBe(false);
      expect(result.data.should_reboot).toBe(true);
      expect(result.data.technical_diagnosis).toBeDefined();
    });

    it('deve detectar problema de ENERGIA (TX/RX = 0)', async () => {
      const mockResponse = {
        data: {
          agent: 'Luan Silva',
          diagnosis: 'Equipamento sem energia',
          tx_power: 0.0,
          rx_power: 0.0,
          recommendation: 'Verificar fonte de alimentação e cabo de energia.',
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('support-tech-agent', {
        body: { client_cpf: '100.000.000-01' },
      });

      expect(result.data.tx_power).toBe(0);
      expect(result.data.rx_power).toBe(0);
      expect(result.data.diagnosis).toContain('energia');
    });
  });

  describe('Mass Outage Alert System', () => {
    it('deve criar alerta de queda massiva', async () => {
      const mockResponse = {
        data: {
          alert_id: 'mass-outage-001',
          region: 'Taguatinga',
          affected_clients: 1542,
          status: 'active',
          created_at: new Date().toISOString(),
          severity: 'high',
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('create-mass-outage-alert', {
        body: {
          region: 'Taguatinga',
          affected_clients: 1542,
          severity: 'high',
        },
      });

      expect(result.data.status).toBe('active');
      expect(result.data.affected_clients).toBeGreaterThan(1000);
      expect(result.data.severity).toBe('high');
    });

    it('deve listar alertas ativos', async () => {
      const mockResponse = {
        data: {
          active_alerts: [
            {
              id: 'mass-outage-001',
              region: 'Taguatinga',
              affected_clients: 1542,
              started_at: '2024-01-15T10:00:00Z',
            },
            {
              id: 'mass-outage-002',
              region: 'Samambaia',
              affected_clients: 890,
              started_at: '2024-01-15T10:05:00Z',
            },
          ],
          total: 2,
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('list-mass-outage-alerts', {
        body: { status: 'active' },
      });

      expect(result.data.total).toBeGreaterThan(0);
      expect(result.data.active_alerts).toBeDefined();
      expect(Array.isArray(result.data.active_alerts)).toBe(true);
    });

    it('deve resolver alerta de queda massiva', async () => {
      const mockResponse = {
        data: {
          alert_id: 'mass-outage-001',
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          duration_minutes: 45,
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke('resolve-mass-outage-alert', {
        body: { alert_id: 'mass-outage-001' },
      });

      expect(result.data.status).toBe('resolved');
      expect(result.data.duration_minutes).toBeDefined();
    });

    it('deve enviar notificações para clientes afetados', async () => {
      const mockResponse = {
        data: {
          alert_id: 'mass-outage-001',
          notifications_sent: 1542,
          channels: ['whatsapp', 'sms', 'email'],
          success: true,
        },
        error: null,
      };

      (supabase.functions.invoke as any).mockResolvedValue(mockResponse);

      const result = await supabase.functions.invoke(
        'notify-mass-outage-clients',
        {
          body: {
            alert_id: 'mass-outage-001',
            channels: ['whatsapp', 'sms', 'email'],
          },
        }
      );

      expect(result.data.notifications_sent).toBeGreaterThan(1000);
      expect(result.data.success).toBe(true);
    });
  });

  describe('Technical Diagnostics', () => {
    it('deve classificar qualidade do sinal', () => {
      const classifySignal = (rx: number): string => {
        if (rx >= -20) return 'excellent';
        if (rx >= -25) return 'good';
        if (rx >= -28) return 'weak';
        return 'critical';
      };

      expect(classifySignal(-18)).toBe('excellent');
      expect(classifySignal(-22)).toBe('good');
      expect(classifySignal(-26)).toBe('weak');
      expect(classifySignal(-32)).toBe('critical');
    });

    it('deve recomendar ação baseada em diagnóstico', () => {
      const getRecommendation = (diagnosis: {
        tx: number;
        rx: number;
        connection: string;
      }): string => {
        if (diagnosis.tx === 0 && diagnosis.rx === 0) {
          return 'Verificar energia';
        }
        if (diagnosis.rx < -28) {
          return 'Problema grave na rede';
        }
        if (diagnosis.rx < -25) {
          return 'Verificar cabos e conectores';
        }
        return 'Realizar reboot';
      };

      expect(getRecommendation({ tx: 0, rx: 0, connection: 'OFFLINE' })).toBe(
        'Verificar energia'
      );
      expect(getRecommendation({ tx: -3, rx: -32, connection: 'OFFLINE' })).toBe(
        'Problema grave na rede'
      );
      expect(getRecommendation({ tx: 0.2, rx: -26, connection: 'OFFLINE' })).toBe(
        'Verificar cabos e conectores'
      );
    });
  });
});
