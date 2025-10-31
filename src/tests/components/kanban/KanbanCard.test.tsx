import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { KanbanCard } from '@/components/kanban/KanbanCard';
import { KanbanCard as KanbanCardType } from '@/hooks/useKanban';

// Mock do @dnd-kit
vi.mock('@dnd-kit/sortable', () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false
  })
}));

describe('KanbanCard', () => {
  const mockCard: KanbanCardType = {
    id: 'card-1',
    board_id: 'board-1',
    column_id: 'col-1',
    title: 'Card de Teste',
    description: 'Descrição do card de teste',
    position: 0,
    priority: 'high',
    labels: ['bug', 'urgent'],
    assigned_to: 'user-1',
    conversation_id: 'conv-1',
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  it('deve renderizar o título do card', () => {
    const { container } = render(<KanbanCard card={mockCard} />);
    expect(container.textContent).toContain('Card de Teste');
  });

  it('deve renderizar a descrição do card', () => {
    const { container } = render(<KanbanCard card={mockCard} />);
    expect(container.textContent).toContain('Descrição do card de teste');
  });

  it('deve renderizar as etiquetas', () => {
    const { container } = render(<KanbanCard card={mockCard} />);
    expect(container.textContent).toContain('bug');
    expect(container.textContent).toContain('urgent');
  });

  it('deve aplicar estilo de prioridade alta', () => {
    const { container } = render(<KanbanCard card={mockCard} />);
    const cardElement = container.querySelector('[class*="border"]');
    expect(cardElement?.className).toContain('border');
  });

  it('deve renderizar card sem descrição', () => {
    const cardWithoutDesc = { ...mockCard, description: null };
    const { container } = render(<KanbanCard card={cardWithoutDesc} />);
    expect(container.textContent).toContain('Card de Teste');
    expect(container.textContent).not.toContain('Descrição do card de teste');
  });

  it('deve renderizar card sem etiquetas', () => {
    const cardWithoutLabels = { ...mockCard, labels: [] };
    const { container } = render(<KanbanCard card={cardWithoutLabels} />);
    expect(container.textContent).toContain('Card de Teste');
    expect(container.textContent).not.toContain('bug');
  });
});
