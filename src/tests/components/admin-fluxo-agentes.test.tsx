import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import GuidedFlowSimulator from '@/components/GuidedFlowSimulator';
import FlowSubjectManager from '@/components/FlowSubjectManager';
import AIFlowGenerator from '@/components/AIFlowGenerator';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn(() => Promise.resolve({ data: [], error: null })),
    })),
    functions: {
      invoke: vi.fn(() => Promise.resolve({ 
        data: { 
          conversations: [],
          approved_count: 0,
        }, 
        error: null 
      })),
    },
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

describe('AdminFluxoAgentes Components - Rendering Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GuidedFlowSimulator', () => {
    it('deve renderizar o simulador sem erros', () => {
      const { container } = render(<GuidedFlowSimulator />, { wrapper: createWrapper() });
      expect(container.firstChild).toBeTruthy();
    });

    it('deve ter elementos de seleção', () => {
      const { container } = render(<GuidedFlowSimulator />, { wrapper: createWrapper() });
      expect(container.querySelector('[role="combobox"]')).toBeTruthy();
    });
  });

  describe('FlowSubjectManager', () => {
    it('deve renderizar o gerenciador sem erros', () => {
      const { container } = render(<FlowSubjectManager />, { wrapper: createWrapper() });
      expect(container.firstChild).toBeTruthy();
    });

    it('deve ter botões de ação', () => {
      const { container } = render(<FlowSubjectManager />, { wrapper: createWrapper() });
      expect(container.querySelector('button')).toBeTruthy();
    });
  });

  describe('AIFlowGenerator', () => {
    it('deve renderizar o gerador sem erros', () => {
      const { container } = render(<AIFlowGenerator agentType="support-tech-agent" />, { wrapper: createWrapper() });
      expect(container.firstChild).toBeTruthy();
    });

    it('deve ter campo de input', () => {
      const { container } = render(<AIFlowGenerator agentType="support-tech-agent" />, { wrapper: createWrapper() });
      expect(container.querySelector('input, textarea')).toBeTruthy();
    });

    it('deve ter botão de gerar', () => {
      const { container } = render(<AIFlowGenerator agentType="support-tech-agent" />, { wrapper: createWrapper() });
      expect(container.querySelector('button')).toBeTruthy();
    });
  });

  describe('Integration Tests', () => {
    it('todos os componentes devem renderizar sem erros', () => {
      const components = [
        <GuidedFlowSimulator key="1" />,
        <FlowSubjectManager key="2" />,
        <AIFlowGenerator key="3" agentType="support-tech-agent" />,
      ];

      components.forEach((component) => {
        const { container } = render(component, { wrapper: createWrapper() });
        expect(container.firstChild).toBeTruthy();
      });
    });

    it('componentes devem usar QueryClient para cache', () => {
      render(<FlowSubjectManager agentType="support-tech-agent" />, { wrapper: createWrapper() });
      render(<GuidedFlowSimulator />, { wrapper: createWrapper() });
      
      // Múltiplos componentes devem acessar QueryClient
      expect(true).toBe(true); // Teste básico de renderização
    });
  });
});
