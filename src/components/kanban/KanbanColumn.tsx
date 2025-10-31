import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KanbanCard } from './KanbanCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import type { KanbanColumn as KanbanColumnType, KanbanCard as KanbanCardType } from '@/hooks/useKanban';

interface KanbanColumnProps {
  column: KanbanColumnType;
  cards: KanbanCardType[];
  onCardClick?: (card: KanbanCardType) => void;
  onDeleteColumn?: (columnId: string) => void;
}

export function KanbanColumn({ column, cards, onCardClick, onDeleteColumn }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  const sortedCards = [...cards].sort((a, b) => a.position - b.position);

  return (
    <Card
      ref={setNodeRef}
      className={`flex-shrink-0 w-80 h-fit max-h-[calc(100vh-16rem)] flex flex-col bg-muted/30 transition-all ${
        isOver ? 'ring-2 ring-primary shadow-lg scale-[1.02]' : ''
      }`}
    >
      <CardHeader className="pb-3 border-b bg-background/50 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-3 h-3 rounded-full ring-2 ring-background shadow-sm"
              style={{ backgroundColor: column.color }}
            />
            <CardTitle className="text-base font-semibold text-foreground">
              {column.name}
            </CardTitle>
            <Badge variant="secondary" className="ml-1 font-semibold">
              {cards.length}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {column.limit_cards && (
              <Badge
                variant={cards.length >= column.limit_cards ? 'destructive' : 'outline'}
                className="font-medium"
              >
                {cards.length}/{column.limit_cards}
              </Badge>
            )}
            {onDeleteColumn && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => onDeleteColumn(column.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto space-y-3 pt-4 pb-4" data-column-id={column.id}>
        <SortableContext
          items={sortedCards.map((card) => card.id)}
          strategy={verticalListSortingStrategy}
        >
          {sortedCards.map((card) => (
            <KanbanCard key={card.id} card={card} onCardClick={onCardClick} />
          ))}
        </SortableContext>
        {cards.length === 0 && (
          <div className="flex flex-col items-center justify-center text-muted-foreground text-sm py-12 px-4 bg-background/30 rounded-lg border-2 border-dashed">
            <p className="font-medium">Nenhum card</p>
            <p className="text-xs mt-1">Arraste cards aqui</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
