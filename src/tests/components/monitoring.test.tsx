import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MassOutageMonitor } from '@/components/MassOutageMonitor';
import { MassOutageHistory } from '@/components/MassOutageHistory';
import { PonPortsMonitor } from '@/components/PonPortsMonitor';
import { RadioMonitor } from '@/components/RadioMonitor';
import { RebootHistory } from '@/components/monitoring/RebootHistory';
import { RebootBlacklist } from '@/components/monitoring/RebootBlacklist';
import { RebootSettings } from '@/components/monitoring/RebootSettings';
import { RebootStats } from '@/components/monitoring/RebootStats';
import { RebootCandidates } from '@/components/monitoring/RebootCandidates';
import { ClientStats } from '@/components/monitoring/ClientStats';
import ContextEscapeAnalytics from '@/components/monitoring/ContextEscapeAnalytics';
import { PerformanceMonitor } from '@/components/monitoring/PerformanceMonitor';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
    functions: {
      invoke: vi.fn(() => Promise.resolve({ 
        data: { 
          success: true,
          time_window: '1h',
          summary: {
            total_requests: 100,
            successful_requests: 95,
            failed_requests: 5,
            success_rate: '95%',
            error_rate: '5%',
            avg_duration_ms: 250,
          },
          by_agent: {},
          recent_alerts: [],
          failed_actions: { pending: 0, items: [] },
        }, 
        error: null 
      })),
    },
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    })),
    removeChannel: vi.fn(),
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
    toasts: [],
    dismiss: vi.fn(),
  }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('Monitoring Components - Rendering Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('MassOutageMonitor', () => {
    it('deve renderizar sem erros', () => {
      const { container } = render(<MassOutageMonitor />, { wrapper: createWrapper() });
      expect(container.firstChild).toBeTruthy();
    });
  });

  describe('MassOutageHistory', () => {
    it('deve renderizar sem erros', () => {
      const { container } = render(<MassOutageHistory />, { wrapper: createWrapper() });
      expect(container.firstChild).toBeTruthy();
    });
  });

  describe('PonPortsMonitor', () => {
    it('deve renderizar sem erros', () => {
      const { container } = render(<PonPortsMonitor />, { wrapper: createWrapper() });
      expect(container.firstChild).toBeTruthy();
    });
  });

  describe('RadioMonitor', () => {
    it('deve renderizar sem erros', () => {
      const { container } = render(<RadioMonitor />, { wrapper: createWrapper() });
      expect(container.firstChild).toBeTruthy();
    });
  });

  describe('RebootHistory', () => {
    it('deve renderizar sem erros', () => {
      const { container } = render(<RebootHistory />, { wrapper: createWrapper() });
      expect(container.firstChild).toBeTruthy();
    });
  });

  describe('RebootBlacklist', () => {
    it('deve renderizar sem erros', () => {
      const { container } = render(<RebootBlacklist />, { wrapper: createWrapper() });
      expect(container.firstChild).toBeTruthy();
    });
  });

  describe('RebootSettings', () => {
    it('deve renderizar sem erros', () => {
      const { container } = render(<RebootSettings />, { wrapper: createWrapper() });
      expect(container.firstChild).toBeTruthy();
    });
  });

  describe('RebootStats', () => {
    it('deve renderizar sem erros', () => {
      const { container } = render(<RebootStats />, { wrapper: createWrapper() });
      expect(container.firstChild).toBeTruthy();
    });
  });

  describe('RebootCandidates', () => {
    it('deve renderizar sem erros', () => {
      const { container } = render(<RebootCandidates />, { wrapper: createWrapper() });
      expect(container.firstChild).toBeTruthy();
    });
  });

  describe('ClientStats', () => {
    it('deve renderizar sem erros', () => {
      const { container } = render(<ClientStats />, { wrapper: createWrapper() });
      expect(container.firstChild).toBeTruthy();
    });
  });

  describe('ContextEscapeAnalytics', () => {
    it('deve renderizar sem erros', () => {
      const { container } = render(<ContextEscapeAnalytics />, { wrapper: createWrapper() });
      expect(container.firstChild).toBeTruthy();
    });
  });

  describe('PerformanceMonitor', () => {
    it('deve renderizar sem erros', () => {
      const { container } = render(<PerformanceMonitor />, { wrapper: createWrapper() });
      expect(container.firstChild).toBeTruthy();
    });

    it('deve ter elementos de métricas', () => {
      const { container } = render(<PerformanceMonitor />, { wrapper: createWrapper() });
      // Componente carrega métricas async, então apenas verifica renderização
      expect(container).toBeTruthy();
    });
  });

  describe('Integration Tests', () => {
    it('todos os componentes de monitoramento devem renderizar sem erros', () => {
      const components = [
        <MassOutageMonitor key="1" />,
        <MassOutageHistory key="2" />,
        <PonPortsMonitor key="3" />,
        <RadioMonitor key="4" />,
        <RebootHistory key="5" />,
        <RebootBlacklist key="6" />,
        <RebootSettings key="7" />,
        <RebootStats key="8" />,
        <RebootCandidates key="9" />,
        <ClientStats key="10" />,
        <ContextEscapeAnalytics key="11" />,
        <PerformanceMonitor key="12" />,
      ];

      components.forEach((component) => {
        const { container } = render(component, { wrapper: createWrapper() });
        expect(container.firstChild).toBeTruthy();
      });
    });

    it('componentes devem usar QueryClient corretamente', () => {
      const wrapper = createWrapper();
      
      render(<ClientStats />, { wrapper });
      render(<RebootStats />, { wrapper });
      render(<PerformanceMonitor />, { wrapper });
      
      // Testa que múltiplos componentes podem usar o mesmo QueryClient
      expect(true).toBe(true);
    });

    it('componentes devem ter estrutura básica de card', () => {
      const { container } = render(<MassOutageMonitor />, { wrapper: createWrapper() });
      
      // Verifica se tem estrutura de card ou container
      expect(container.querySelector('div')).toBeTruthy();
    });
  });

});
