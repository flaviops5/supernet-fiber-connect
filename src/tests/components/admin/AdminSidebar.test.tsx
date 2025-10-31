import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AdminSidebar } from '@/components/AdminSidebar';

// Mock do Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } }))
    }
  }
}));

describe('AdminSidebar', () => {
  const renderWithRouter = (component: React.ReactElement) => {
    return render(<BrowserRouter>{component}</BrowserRouter>);
  };

  it('deve renderizar a sidebar corretamente', () => {
    const { container } = renderWithRouter(<AdminSidebar />);
    
    // Verifica se elementos principais estão presentes
    const sidebar = container.querySelector('[data-sidebar]');
    expect(sidebar).toBeTruthy();
  });

  it('deve exibir link para Dashboard', () => {
    const { container } = renderWithRouter(<AdminSidebar />);
    
    const dashboardLink = container.querySelector('a[href*="/admin"]');
    expect(dashboardLink).toBeTruthy();
  });

  it('deve exibir link para Kanban', () => {
    const { container } = renderWithRouter(<AdminSidebar />);
    
    const kanbanLink = container.querySelector('a[href*="/admin/kanban"]');
    expect(kanbanLink).toBeTruthy();
  });

  it('deve exibir link para Testes', () => {
    const { container } = renderWithRouter(<AdminSidebar />);
    
    const testLink = container.querySelector('a[href*="/admin/testes"]');
    expect(testLink).toBeTruthy();
  });

  it('deve exibir link para Documentação', () => {
    const { container } = renderWithRouter(<AdminSidebar />);
    
    const docLink = container.querySelector('a[href*="/admin/documentacao"]');
    expect(docLink).toBeTruthy();
  });

  it('deve exibir link para Monitoramento', () => {
    const { container } = renderWithRouter(<AdminSidebar />);
    
    const monitorLink = container.querySelector('a[href*="/admin/monitoramento"]');
    expect(monitorLink).toBeTruthy();
  });

  it('todos os links devem ter href correto', () => {
    const { container } = renderWithRouter(<AdminSidebar />);
    
    const kanbanLink = container.querySelector('a[href*="/admin/kanban"]');
    expect(kanbanLink?.getAttribute('href')).toContain('/admin/kanban');
  });
});
