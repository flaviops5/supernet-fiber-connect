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
import { KanbanFilters, type KanbanFiltersState } from './KanbanFilters';
import { KanbanDashboard } from './KanbanDashboard';
import { CreateColumnDialog } from './CreateColumnDialog';
import { CreateCardDialog } from './CreateCardDialog';
import type { KanbanCard as KanbanCardType } from '@/hooks/useKanban';
import { Button } from '@/components/ui/button';
import { Plus, Settings, BarChart } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface KanbanBoardProps {
  boardId: string;
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

    if (!over) {
      setActiveCard(null);
      return;
    }

    const activeCard = cards.find((c) => c.id === active.id);
    if (!activeCard) {
      setActiveCard(null);
      return;
    }

    // Check if dropped over a column
    const targetColumn = columns.find((col) => col.id === over.id);
    if (targetColumn) {
      // Calculate new position (add to end of column)
      const cardsInColumn = cards.filter((c) => c.column_id === targetColumn.id);
      const newPosition = cardsInColumn.length;
      
      moveCard(activeCard.id, targetColumn.id, newPosition);
    }

    setActiveCard(null);
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
    if (filters.labels.length > 0) {
      const hasLabel = filters.labels.some((label) => card.labels?.includes(label));
      if (!hasLabel) return false;
    }
    return true;
  });

  // Get all unique labels
  const allLabels = Array.from(new Set(cards.flatMap((card) => card.labels || [])));

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
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">{board.name}</h1>
          {board.description && (
            <p className="text-muted-foreground mt-1">{board.description}</p>
          )}
        </div>
      </div>

      <Tabs defaultValue="board" className="flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="board">Board</TabsTrigger>
            <TabsTrigger value="dashboard">
              <BarChart className="h-4 w-4 mr-2" />
              Dashboard
            </TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <KanbanFilters
              filters={filters}
              onFiltersChange={setFilters}
              availableLabels={allLabels}
            />
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Configurações
            </Button>
            <Button size="sm" onClick={() => setShowCreateCard(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Card
            </Button>
          </div>
        </div>

        <TabsContent value="board" className="flex-1 mt-0">
          {/* Board */}
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="flex-1 overflow-x-auto">
              <div className="flex gap-4 h-full pb-4">
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
                <Card className="flex-shrink-0 w-80 h-fit p-4 border-dashed">
                  <Button variant="ghost" className="w-full" onClick={() => setShowCreateColumn(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Coluna
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
        </TabsContent>

        <TabsContent value="dashboard" className="flex-1 mt-0">
          <KanbanDashboard columns={columns} cards={cards} />
        </TabsContent>
      </Tabs>

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
