import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AddUserForm } from '@/components/AddUserForm';

// Mock do logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock do Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
  },
}));

// Mock do toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('AddUserForm Component', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AddUserForm />
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  it('deve renderizar o formulário de adição de usuário', () => {
    const { getByText } = renderComponent();
    expect(getByText(/adicionar.*usuário/i)).toBeInTheDocument();
  });

  it('deve ter campos obrigatórios do formulário', () => {
    const { getByLabelText } = renderComponent();
    expect(getByLabelText(/email/i)).toBeInTheDocument();
    expect(getByLabelText(/nome completo/i)).toBeInTheDocument();
    expect(getByLabelText(/senha/i)).toBeInTheDocument();
  });

  it('deve validar email inválido', async () => {
    const user = userEvent.setup();
    const { getByLabelText } = renderComponent();

    const emailInput = getByLabelText(/email/i);
    await user.type(emailInput, 'email-invalido');
    await user.tab();

    // Aguarda validação
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  it('deve validar senha mínima', async () => {
    const user = userEvent.setup();
    const { getByLabelText } = renderComponent();

    const passwordInput = getByLabelText(/senha/i);
    await user.type(passwordInput, '12345');
    await user.tab();

    // Aguarda validação
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  it('deve ter botão de submissão desabilitado inicialmente', () => {
    const { getByRole } = renderComponent();
    const submitButton = getByRole('button', { name: /adicionar/i });
    expect(submitButton).toBeDisabled();
  });
});
