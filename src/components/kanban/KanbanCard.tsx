import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { GripVertical, AlertCircle, Clock, User } from 'lucide-react';
import type { KanbanCard as KanbanCardType } from '@/hooks/useKanban';

interface KanbanCardProps {
  card: KanbanCardType;
  isDragging?: boolean;
  onCardClick?: (card: KanbanCardType) => void;
}

export function KanbanCard({ card, isDragging = false, onCardClick }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: card.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  };

  const handleClick = (e: React.MouseEvent) => {
    // Only trigger click if not dragging
    if (!isSortableDragging && onCardClick) {
      e.stopPropagation();
      onCardClick(card);
    }
  };

  const priorityColors = {
    low: 'bg-blue-500',
    medium: 'bg-yellow-500',
    high: 'bg-orange-500',
    urgent: 'bg-red-500',
  };

  const priorityLabels = {
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta',
    urgent: 'Urgente',
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      data-testid={`card-${card.id}`}
      onClick={handleClick}
      className={`cursor-grab active:cursor-grabbing bg-card hover:shadow-md transition-shadow ${
        isDragging ? 'shadow-lg rotate-3' : ''
      }`}
      {...attributes}
      {...listeners}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-sm font-medium line-clamp-2 text-foreground">
              {card.title}
            </CardTitle>
          </div>
          <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {card.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {card.description}
          </p>
        )}

        {/* Priority Badge */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            <div className={`w-2 h-2 rounded-full ${priorityColors[card.priority]} mr-1`} />
            {priorityLabels[card.priority]}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
