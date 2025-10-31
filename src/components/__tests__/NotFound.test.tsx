import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import NotFound from '@/pages/NotFound';

// Mock do logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe('NotFound Component', () => {
  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <NotFound />
      </BrowserRouter>
    );
  };

  it('deve renderizar a mensagem de erro 404', () => {
    const { getByText } = renderComponent();
    expect(getByText('404')).toBeInTheDocument();
  });

  it('deve exibir título de página não encontrada', () => {
    const { getByText } = renderComponent();
    expect(getByText(/página não encontrada/i)).toBeInTheDocument();
  });

  it('deve conter link para voltar à página inicial', () => {
    const { getByRole } = renderComponent();
    const homeLink = getByRole('link', { name: /voltar.*início/i });
    expect(homeLink).toBeInTheDocument();
    expect(homeLink).toHaveAttribute('href', '/');
  });
});
