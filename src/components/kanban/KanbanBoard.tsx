import { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { useKanban } from '@/hooks/useKanban';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import { KanbanCardDetail } from './KanbanCardDetail';
import { CreateColumnDialog } from './CreateColumnDialog';
import { CreateCardDialog } from './CreateCardDialog';
import type { KanbanCard as KanbanCardType } from '@/hooks/useKanban';
import { Button } from '@/components/ui/button';
import { Plus, Settings, Search, Filter } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface KanbanBoardProps {
  boardId: string;
}

interface KanbanFiltersState {
  search: string;
  priority: string | null;
  assignedTo: string | null;
  labels: string[];
}

export function KanbanBoard({ boardId }: KanbanBoardProps) {
  const { board, columns, cards, loading, moveCard, deleteCard, updateCard, createCard } = useKanban(boardId);
  const [activeCard, setActiveCard] = useState<KanbanCardType | null>(null);
  const [selectedCard, setSelectedCard] = useState<KanbanCardType | null>(null);
  const [showCreateColumn, setShowCreateColumn] = useState(false);
  const [showCreateCard, setShowCreateCard] = useState(false);
  const [filters, setFilters] = useState<KanbanFiltersState>({
    search: '',
    priority: null,
    assignedTo: null,
    labels: [],
  });

  const handleCreateCard = async (columnId: string, title: string, description?: string) => {
    await createCard(columnId, title, description);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const card = cards.find((c) => c.id === active.id);
    if (card) {
      setActiveCard(card);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over || active.id === over.id) {
      return;
    }

    const draggedCard = cards.find((c) => c.id === active.id);
    if (!draggedCard) {
      return;
    }

    // Check if dropped over a column
    let targetColumnId = over.id as string;
    
    // If dropped over another card, get that card's column
    const overCard = cards.find((c) => c.id === over.id);
    if (overCard) {
      targetColumnId = overCard.column_id;
    }

    const targetColumn = columns.find((col) => col.id === targetColumnId);
    if (!targetColumn) {
      return;
    }

    // Calculate new position (add to end of column)
    const cardsInColumn = cards.filter((c) => c.column_id === targetColumn.id);
    const newPosition = cardsInColumn.length;
    
    moveCard(draggedCard.id, targetColumn.id, newPosition);
  };

  const handleDragOver = (event: DragOverEvent) => {
    // Could add visual feedback here
  };

  // Filter cards
  const filteredCards = cards.filter((card) => {
    if (filters.search && !card.title.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    if (filters.priority && card.priority !== filters.priority) {
      return false;
    }
    return true;
  });

  // No labels available in current schema
  const allLabels: string[] = [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Carregando board...</div>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Board não encontrado</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header com menu horizontal */}
      <div className="flex items-center gap-2 mb-6 pb-3 border-b overflow-x-hidden">
        {/* Search */}
        <div className="relative flex-shrink-0 w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="w-full pl-8 pr-3 py-1.5 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 ml-1 flex-shrink-0">
          <Button variant="outline" size="sm" className="h-8">
            <Filter className="h-3.5 w-3.5 mr-1" />
            Filtros
          </Button>
          <Button variant="outline" size="sm" className="h-8">
            <Settings className="h-3.5 w-3.5 mr-1" />
            Config
          </Button>
          <Button variant="outline" size="sm" className="h-8" onClick={() => setShowCreateColumn(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Coluna
          </Button>
          <Button size="sm" className="h-8" onClick={() => setShowCreateCard(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Card
          </Button>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 flex flex-col">
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex-1 overflow-x-auto bg-muted/20 rounded-lg p-4">
              <div className="flex gap-6 h-full pb-4" role="list" aria-label="Kanban columns">
                <SortableContext
                  items={columns.map((col) => col.id)}
                  strategy={horizontalListSortingStrategy}
                >
                  {columns.map((column) => (
                    <KanbanColumn
                      key={column.id}
                      column={column}
                      cards={filteredCards.filter((card) => card.column_id === column.id)}
                      onCardClick={setSelectedCard}
                    />
                  ))}
                </SortableContext>

                {/* Add Column Button */}
                <Card className="flex-shrink-0 w-80 h-fit p-4 border-2 border-dashed bg-muted/20 hover:bg-muted/40 transition-colors">
                  <Button 
                    variant="ghost" 
                    className="w-full h-full min-h-[100px] hover:bg-background/50" 
                    onClick={() => setShowCreateColumn(true)}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Plus className="h-5 w-5" />
                      <span className="font-medium">Adicionar Coluna</span>
                    </div>
                  </Button>
                </Card>
              </div>
            </div>

            {/* Drag Overlay */}
            <DragOverlay>
              {activeCard ? (
                <KanbanCard card={activeCard} isDragging />
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>

        {/* Card Detail Modal */}
        <KanbanCardDetail
          card={selectedCard}
          open={!!selectedCard}
          onClose={() => setSelectedCard(null)}
          onUpdate={updateCard}
          onDelete={deleteCard}
        />

        {/* Create Column Dialog */}
        <CreateColumnDialog
          open={showCreateColumn}
          onClose={() => setShowCreateColumn(false)}
          boardId={boardId}
        />

        {/* Create Card Dialog */}
        <CreateCardDialog
          open={showCreateCard}
          onClose={() => setShowCreateCard(false)}
          columns={columns}
          onCreateCard={handleCreateCard}
        />
      </div>
    );
  }
