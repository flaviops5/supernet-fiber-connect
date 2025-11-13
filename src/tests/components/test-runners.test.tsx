import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StressTestRunner } from '@/components/tests/StressTestRunner';
import { TestIXCSubjects } from '@/components/tests/TestIXCSubjects';

// Mock do Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

// Mock do toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}));

describe('Test Runner Components', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const renderWithClient = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  describe('StressTestRunner Component', () => {
    it('deve renderizar formulário de configuração', () => {
      const { getByText, getByLabelText } = renderWithClient(<StressTestRunner />);

      expect(getByText(/stress test/i)).toBeInTheDocument();
      expect(getByLabelText(/duração/i)).toBeInTheDocument();
      expect(getByLabelText(/usuários simultâneos/i)).toBeInTheDocument();
      expect(getByLabelText(/ramp-up/i)).toBeInTheDocument();
    });

    it('deve permitir configurar duração do teste', async () => {
      const user = userEvent.setup();
      const { getByLabelText } = renderWithClient(<StressTestRunner />);

      const durationInput = getByLabelText(/duração/i);
      await user.clear(durationInput);
      await user.type(durationInput, '30');

      expect(durationInput).toHaveValue(30);
    });

    it('deve permitir configurar usuários simultâneos', async () => {
      const user = userEvent.setup();
      const { getByLabelText } = renderWithClient(<StressTestRunner />);

      const usersInput = getByLabelText(/usuários simultâneos/i);
      await user.clear(usersInput);
      await user.type(usersInput, '50');

      expect(usersInput).toHaveValue(50);
    });

    it('deve permitir configurar tempo de ramp-up', async () => {
      const user = userEvent.setup();
      const { getByLabelText } = renderWithClient(<StressTestRunner />);

      const rampUpInput = getByLabelText(/ramp-up/i);
      await user.clear(rampUpInput);
      await user.type(rampUpInput, '15');

      expect(rampUpInput).toHaveValue(15);
    });

    it('deve ter botão de iniciar teste', () => {
      const { getByRole } = renderWithClient(<StressTestRunner />);

      const startButton = getByRole('button', {
        name: /iniciar stress test/i,
      });
      expect(startButton).toBeInTheDocument();
      expect(startButton).not.toBeDisabled();
    });

    it('deve validar limites de configuração', async () => {
      const { getByLabelText } = renderWithClient(<StressTestRunner />);

      const durationInput = getByLabelText(/duração/i) as HTMLInputElement;
      
      expect(durationInput.min).toBe('10');
      expect(durationInput.max).toBe('3600');

      const usersInput = getByLabelText(/usuários simultâneos/i) as HTMLInputElement;
      expect(usersInput.min).toBe('1');
      expect(usersInput.max).toBe('500');
    });

    it('deve exibir área para endpoints', () => {
      const { getByLabelText } = renderWithClient(<StressTestRunner />);

      const endpointsTextarea = getByLabelText(/endpoints ixc/i);
      expect(endpointsTextarea).toBeInTheDocument();
    });

    it('deve ter valores padrão adequados', () => {
      const { getByLabelText } = renderWithClient(<StressTestRunner />);

      const durationInput = getByLabelText(/duração/i);
      const usersInput = getByLabelText(/usuários simultâneos/i);
      const rampUpInput = getByLabelText(/ramp-up/i);

      expect(durationInput).toHaveValue(60);
      expect(usersInput).toHaveValue(20);
      expect(rampUpInput).toHaveValue(10);
    });
  });

  describe('TestIXCSubjects Component', () => {
    it('deve renderizar componente de teste de assuntos', () => {
      const { getByText } = renderWithClient(<TestIXCSubjects />);

      expect(
        getByText(/busca e exibe os assuntos disponíveis/i)
      ).toBeInTheDocument();
    });

    it('deve exibir informação sobre o teste', () => {
      const { getByText } = renderWithClient(<TestIXCSubjects />);

      expect(getByText(/sistema IXC/i)).toBeInTheDocument();
    });

    it('deve ter estrutura de card', () => {
      const { container } = renderWithClient(<TestIXCSubjects />);

      const card = container.querySelector('.p-6');
      expect(card).toBeInTheDocument();
    });

    it('deve conter alert informativo', () => {
      const { getByRole } = renderWithClient(<TestIXCSubjects />);

      const alert = getByRole('alert');
      expect(alert).toBeInTheDocument();
    });
  });

  describe('Test Components Integration', () => {
    it('deve permitir múltiplos componentes de teste na mesma página', () => {
      const { getByText } = render(
        <QueryClientProvider client={queryClient}>
          <div>
            <StressTestRunner />
            <TestIXCSubjects />
          </div>
        </QueryClientProvider>
      );

      expect(getByText(/stress test/i)).toBeInTheDocument();
      expect(getByText(/assuntos disponíveis/i)).toBeInTheDocument();
    });

    it('deve manter estado independente entre componentes', async () => {
      const user = userEvent.setup();
      
      const { getByLabelText } = render(
        <QueryClientProvider client={queryClient}>
          <div>
            <StressTestRunner />
          </div>
        </QueryClientProvider>
      );

      const durationInput = getByLabelText(/duração/i);
      const initialValue = (durationInput as HTMLInputElement).value;

      await user.clear(durationInput);
      await user.type(durationInput, '120');

      expect(durationInput).toHaveValue(120);
      expect(durationInput).not.toHaveValue(parseInt(initialValue));
    });
  });

  describe('Accessibility', () => {
    it('StressTestRunner deve ter labels apropriados', () => {
      const { getByLabelText } = renderWithClient(<StressTestRunner />);

      expect(getByLabelText(/duração.*segundos/i)).toBeInTheDocument();
      expect(
        getByLabelText(/usuários simultâneos/i)
      ).toBeInTheDocument();
      expect(getByLabelText(/ramp-up.*segundos/i)).toBeInTheDocument();
    });

    it('deve ter estrutura semântica adequada', () => {
      const { container } = renderWithClient(<StressTestRunner />);

      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThan(0);

      const inputs = container.querySelectorAll('input');
      expect(inputs.length).toBeGreaterThan(0);
    });
  });
});
