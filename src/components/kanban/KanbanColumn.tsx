import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KanbanCard } from './KanbanCard';
import { Badge } from '@/components/ui/badge';
import type { KanbanColumn as KanbanColumnType, KanbanCard as KanbanCardType } from '@/hooks/useKanban';

interface KanbanColumnProps {
  column: KanbanColumnType;
  cards: KanbanCardType[];
  onCardClick?: (card: KanbanCardType) => void;
}

export function KanbanColumn({ column, cards, onCardClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  const sortedCards = [...cards].sort((a, b) => a.position - b.position);

  return (
    <Card
      ref={setNodeRef}
      className={`flex-shrink-0 w-80 h-fit max-h-full flex flex-col ${
        isOver ? 'ring-2 ring-primary' : ''
      }`}
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: column.color }}
            />
            {column.name}
            <Badge variant="secondary" className="ml-2">
              {cards.length}
            </Badge>
          </div>
          {column.limit_cards && (
            <Badge
              variant={cards.length >= column.limit_cards ? 'destructive' : 'outline'}
            >
              {cards.length}/{column.limit_cards}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto space-y-2">
        <SortableContext
          items={sortedCards.map((card) => card.id)}
          strategy={verticalListSortingStrategy}
        >
          {sortedCards.map((card) => (
            <div key={card.id} onClick={() => onCardClick?.(card)}>
              <KanbanCard card={card} />
            </div>
          ))}
        </SortableContext>
        {cards.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-8">
            Nenhum card nesta coluna
          </div>
        )}
      </CardContent>
    </Card>
  );
}
