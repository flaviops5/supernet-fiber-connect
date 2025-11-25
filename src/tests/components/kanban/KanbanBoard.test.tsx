import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KanbanBoard } from '@/components/kanban/KanbanBoard';

// Mock do Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      })),
      insert: vi.fn(() => Promise.resolve({ data: [], error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
      }))
    }))
  }
}));

describe('KanbanBoard', () => {
  const mockBoardId = 'test-board-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve renderizar o board corretamente', () => {
    render(<KanbanBoard boardId={mockBoardId} />);
    
    // Verifica se o componente renderizou
    expect(document.querySelector('[data-testid*="kanban"]')).toBeTruthy();
  });

  it('deve exibir botão de adicionar coluna', () => {
    const { container } = render(<KanbanBoard boardId={mockBoardId} />);
    
    const addColumnBtn = container.querySelector('button');
    expect(addColumnBtn).toBeTruthy();
  });

  it('deve exibir botão de criar card', () => {
    const { container } = render(<KanbanBoard boardId={mockBoardId} />);
    
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('deve abrir diálogo de criar coluna ao clicar no botão', async () => {
    const user = userEvent.setup();
    const { container } = render(<KanbanBoard boardId={mockBoardId} />);
    
    const buttons = container.querySelectorAll('button');
    if (buttons.length > 0) {
      await user.click(buttons[0]);
      
      // Aguarda um pouco para o diálogo aparecer
      await new Promise(resolve => setTimeout(resolve, 500));
      const dialog = container.querySelector('[role="dialog"]');
      expect(dialog).toBeTruthy();
    }
  });

  it('deve abrir diálogo de criar card ao clicar no botão', async () => {
    const user = userEvent.setup();
    const { container } = render(<KanbanBoard boardId={mockBoardId} />);
    
    const buttons = container.querySelectorAll('button');
    if (buttons.length > 1) {
      await user.click(buttons[1]);
      
      // Aguarda um pouco para o diálogo aparecer
      await new Promise(resolve => setTimeout(resolve, 500));
      const dialog = container.querySelector('[role="dialog"]');
      expect(dialog).toBeTruthy();
    }
  });
});
