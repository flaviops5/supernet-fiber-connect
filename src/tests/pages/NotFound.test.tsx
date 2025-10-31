import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import NotFound from '@/pages/NotFound';

describe('NotFound Page', () => {
  const renderWithRouter = () => {
    return render(
      <BrowserRouter>
        <NotFound />
      </BrowserRouter>
    );
  };

  it('deve renderizar a página 404', () => {
    const { container } = renderWithRouter();
    
    // Verifica mensagem de erro
    expect(container.textContent).toMatch(/404|não encontrada|not found/i);
  });

  it('deve exibir link para voltar à home', () => {
    const { container } = renderWithRouter();
    
    const homeLink = container.querySelector('a[href="/"]');
    expect(homeLink).toBeTruthy();
    expect(homeLink?.getAttribute('href')).toBe('/');
  });

  it('deve exibir mensagem amigável ao usuário', () => {
    const { container } = renderWithRouter();
    
    // Verifica se há algum texto explicativo
    expect(container.textContent).toMatch(/página|encontrada|existe/i);
  });
});
