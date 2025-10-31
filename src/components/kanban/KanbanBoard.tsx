import { useState } from 'react';
import { DndContext, DragEndEvent, DragOverEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { useKanban } from '@/hooks/useKanban';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import { KanbanCardDetail } from './KanbanCardDetail';
import { CreateColumnDialog } from './CreateColumnDialog';
import { CreateCardDialog } from './CreateCardDialog';
import { KanbanDashboard } from './KanbanDashboard';
import { KanbanAutomations } from './KanbanAutomations';
import { KanbanTemplates } from './KanbanTemplates';
import type { KanbanCard as KanbanCardType } from '@/hooks/useKanban';
import { Button } from '@/components/ui/button';
import { Plus, Settings, Search, Filter, BarChart3, Zap, FileText } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BoardSelector } from './BoardSelector';
import { CreateBoardDialog } from './CreateBoardDialog';
import { ImportExcelDialog } from './ImportExcelDialog';

interface KanbanBoardProps {
  boardId: string;
  onBoardChange?: (boardId: string) => void;
}
interface KanbanFiltersState {
  search: string;
  priority: string | null;
  assignedTo: string | null;
  labels: string[];
}
export function KanbanBoard({
  boardId,
  onBoardChange
}: KanbanBoardProps) {
  const {
    board,
    columns,
    cards,
    loading,
    moveCard,
    deleteCard,
    updateCard,
    createCard,
    deleteColumn
  } = useKanban(boardId);
  const [activeCard, setActiveCard] = useState<KanbanCardType | null>(null);
  const [selectedCard, setSelectedCard] = useState<KanbanCardType | null>(null);
  const [showCreateColumn, setShowCreateColumn] = useState(false);
  const [showCreateCard, setShowCreateCard] = useState(false);
  const [showCreateBoard, setShowCreateBoard] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showAutomations, setShowAutomations] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showImportExcel, setShowImportExcel] = useState(false);
  const [filters, setFilters] = useState<KanbanFiltersState>({
    search: '',
    priority: null,
    assignedTo: null,
    labels: []
  });
  const handleCreateCard = async (columnId: string, title: string, description?: string, priority?: 'low' | 'medium' | 'high' | 'urgent') => {
    await createCard(columnId, title, description, priority);
  };

  const handleTemplateSelect = async (template: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (template) {
      const { data: newBoard } = await supabase
        .from('kanban_boards' as any)
        .insert({
          title: template.name,
          created_by: user.id,
        })
        .select()
        .single();

      if (newBoard && template.structure) {
        const columns = (template.structure as any).columns || [];
        for (let i = 0; i < columns.length; i++) {
          const col = columns[i];
          await supabase.from('kanban_columns' as any).insert({
            board_id: (newBoard as any).id,
            name: col.title,
            color: col.color || '#3b82f6',
            position: i,
          });
        }
        toast.success("Quadro criado a partir do template!");
        setShowTemplates(false);
      }
    }
  };
  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8
    }
  }));
  const handleDragStart = (event: DragStartEvent) => {
    const {
      active
    } = event;
    const card = cards.find(c => c.id === active.id);
    if (card) {
      setActiveCard(card);
    }
  };
  const handleDragEnd = (event: DragEndEvent) => {
    const {
      active,
      over
    } = event;
    setActiveCard(null);
    if (!over || active.id === over.id) {
      return;
    }
    const draggedCard = cards.find(c => c.id === active.id);
    if (!draggedCard) {
      return;
    }

    // Check if dropped over a column
    let targetColumnId = over.id as string;

    // If dropped over another card, get that card's column
    const overCard = cards.find(c => c.id === over.id);
    if (overCard) {
      targetColumnId = overCard.column_id;
    }
    const targetColumn = columns.find(col => col.id === targetColumnId);
    if (!targetColumn) {
      return;
    }

    // Calculate new position (add to end of column)
    const cardsInColumn = cards.filter(c => c.column_id === targetColumn.id);
    const newPosition = cardsInColumn.length;
    moveCard(draggedCard.id, targetColumn.id, newPosition);
  };
  const handleDragOver = (event: DragOverEvent) => {
    // Could add visual feedback here
  };

  // Filter cards
  const filteredCards = cards.filter(card => {
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
    return <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Carregando board...</div>
      </div>;
  }
  if (!board) {
    return <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Board não encontrado</div>
      </div>;
  }
  return <div className="flex flex-col h-full">
      {/* Header com menu horizontal */}
      <div className="flex items-center gap-1 mb-6 pb-3 border-b overflow-x-hidden">
        {/* Board Selector */}
        {onBoardChange && (
          <BoardSelector 
            currentBoardId={boardId} 
            onBoardChange={onBoardChange}
            onCreateBoard={() => setShowCreateBoard(true)}
          />
        )}

        {/* Search */}
        <div className="relative flex-shrink-0 w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input type="text" placeholder="Buscar" value={filters.search} onChange={e => setFilters({
          ...filters,
          search: e.target.value
        })} className="w-full pl-8 pr-3 py-1.5 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>

        {/* Action buttons */}
        <Button variant="outline" size="sm" className="h-8" onClick={() => setShowDashboard(true)}>
          <BarChart3 className="h-3.5 w-3.5 mr-1" />
          Dashboard
        </Button>
        <Button variant="outline" size="sm" className="h-8" onClick={() => setShowAutomations(true)}>
          <Zap className="h-3.5 w-3.5 mr-1" />
          Automações
        </Button>
        <Button variant="outline" size="sm" className="h-8" onClick={() => setShowTemplates(true)}>
          <FileText className="h-3.5 w-3.5 mr-1" />
          Templates
        </Button>
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
        <Button variant="outline" size="sm" className="h-8" onClick={() => setShowImportExcel(true)}>
          <FileText className="h-3.5 w-3.5 mr-1" />
          Importar Excel
        </Button>
        <Button size="sm" className="h-8" onClick={() => setShowCreateCard(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Card
        </Button>
      </div>

      {/* Board */}
      <div className="flex-1 flex flex-col">
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
          <div className="flex-1 overflow-x-auto bg-muted/20 rounded-lg p-4">
              <div className="flex gap-6 h-full pb-4" role="list" aria-label="Kanban columns">
                <SortableContext items={columns.map(col => col.id)} strategy={horizontalListSortingStrategy}>
                  {columns.map(column => <KanbanColumn key={column.id} column={column} cards={filteredCards.filter(card => card.column_id === column.id)} onCardClick={setSelectedCard} onDeleteColumn={deleteColumn} />)}
                </SortableContext>

                {/* Add Column Button */}
                <Card className="flex-shrink-0 w-80 h-fit p-4 border-2 border-dashed bg-muted/20 hover:bg-muted/40 transition-colors">
                  <Button variant="ghost" className="w-full h-full min-h-[100px] hover:bg-background/50" onClick={() => setShowCreateColumn(true)}>
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
              {activeCard ? <KanbanCard card={activeCard} isDragging /> : null}
            </DragOverlay>
          </DndContext>
        </div>

        {/* Card Detail Modal */}
        <KanbanCardDetail card={selectedCard} open={!!selectedCard} onClose={() => setSelectedCard(null)} onUpdate={updateCard} onDelete={deleteCard} />

        {/* Create Column Dialog */}
        <CreateColumnDialog open={showCreateColumn} onClose={() => setShowCreateColumn(false)} boardId={boardId} />

        {/* Create Card Dialog */}
        <CreateCardDialog open={showCreateCard} onClose={() => setShowCreateCard(false)} columns={columns} onCreateCard={handleCreateCard} />

        {/* Dashboard Dialog */}
        <Dialog open={showDashboard} onOpenChange={setShowDashboard}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Dashboard</DialogTitle>
            </DialogHeader>
            <KanbanDashboard columns={columns} cards={cards} />
          </DialogContent>
        </Dialog>

        {/* Automations Dialog */}
        <Dialog open={showAutomations} onOpenChange={setShowAutomations}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Automações</DialogTitle>
            </DialogHeader>
            <KanbanAutomations boardId={boardId} />
          </DialogContent>
        </Dialog>

        {/* Templates Dialog */}
        <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Templates</DialogTitle>
            </DialogHeader>
            <KanbanTemplates onSelectTemplate={handleTemplateSelect} />
          </DialogContent>
        </Dialog>

        {/* Create Board Dialog */}
        {onBoardChange && (
          <CreateBoardDialog 
            open={showCreateBoard} 
            onClose={() => setShowCreateBoard(false)}
            onBoardCreated={onBoardChange}
          />
        )}

        {/* Import Excel Dialog */}
        <ImportExcelDialog
          open={showImportExcel}
          onClose={() => setShowImportExcel(false)}
          boardId={boardId}
          columns={columns}
        />
      </div>;
}