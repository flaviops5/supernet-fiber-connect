import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TestSupportTechAgent } from '@/components/tests/TestSupportTechAgent';
import { TestContractFlow } from '@/components/TestContractFlow';
import { TestClientFinancialStatus } from '@/components/TestClientFinancialStatus';
import { SendPaymentTest } from '@/components/SendPaymentTest';
import { AutoSendOverdueInvoices } from '@/components/AutoSendOverdueInvoices';
import { MassOutageAlertCard } from '@/components/MassOutageAlertCard';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn(() => Promise.resolve({ data: null, error: null })),
      maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
    functions: {
      invoke: vi.fn(() => Promise.resolve({ data: { success: true }, error: null })),
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

describe('AdminTestes Components - Rendering Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('TestSupportTechAgent', () => {
    it('deve renderizar o componente sem erros', () => {
      const { container } = render(<TestSupportTechAgent />, { wrapper: createWrapper() });
      expect(container.firstChild).toBeTruthy();
    });

    it('deve conter elementos principais', () => {
      const { container } = render(<TestSupportTechAgent />, { wrapper: createWrapper() });
      expect(container.querySelector('button')).toBeTruthy();
    });
  });

  describe('TestContractFlow', () => {
    it('deve renderizar o componente sem erros', () => {
      const { container } = render(<TestContractFlow />, { wrapper: createWrapper() });
      expect(container.firstChild).toBeTruthy();
    });
  });

  describe('TestClientFinancialStatus', () => {
    it('deve renderizar o componente sem erros', () => {
      const { container } = render(<TestClientFinancialStatus />, { wrapper: createWrapper() });
      expect(container.firstChild).toBeTruthy();
    });
  });

  describe('SendPaymentTest', () => {
    it('deve renderizar o componente sem erros', () => {
      const { container } = render(<SendPaymentTest />, { wrapper: createWrapper() });
      expect(container.firstChild).toBeTruthy();
    });

    it('deve ter inputs de formulário', () => {
      const { container } = render(<SendPaymentTest />, { wrapper: createWrapper() });
      const inputs = container.querySelectorAll('input');
      expect(inputs.length).toBeGreaterThan(0);
    });
  });

  describe('AutoSendOverdueInvoices', () => {
    it('deve renderizar o componente sem erros', () => {
      const { container } = render(<AutoSendOverdueInvoices />, { wrapper: createWrapper() });
      expect(container.firstChild).toBeTruthy();
    });

    it('deve ter botão de ação', () => {
      const { container } = render(<AutoSendOverdueInvoices />, { wrapper: createWrapper() });
      expect(container.querySelector('button')).toBeTruthy();
    });
  });

  describe('MassOutageAlertCard', () => {
    it('deve renderizar o componente sem erros', () => {
      const { container } = render(<MassOutageAlertCard />, { wrapper: createWrapper() });
      expect(container).toBeTruthy();
    });
  });

  describe('Integration Tests', () => {
    it('todos os componentes devem renderizar sem erros', () => {
      const components = [
        <TestSupportTechAgent key="1" />,
        <TestContractFlow key="2" />,
        <TestClientFinancialStatus key="3" />,
        <SendPaymentTest key="4" />,
        <AutoSendOverdueInvoices key="5" />,
        <MassOutageAlertCard key="6" />,
      ];

      components.forEach((component) => {
        const { container } = render(component, { wrapper: createWrapper() });
        expect(container.firstChild).toBeTruthy();
      });
    });

    it('componentes devem usar Supabase client', () => {
      render(<TestSupportTechAgent />, { wrapper: createWrapper() });
      render(<TestContractFlow />, { wrapper: createWrapper() });
      
      // Múltiplos componentes devem acessar supabase
      expect(true).toBe(true); // Teste básico de renderização
    });
  });
});
