import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GripVertical } from 'lucide-react';
import type { MouseEvent } from 'react';
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

  const handleClick = (e: MouseEvent) => {
    // Only trigger click if not dragging
    if (!isSortableDragging && onCardClick) {
      e.stopPropagation();
      onCardClick(card);
    }
  };

  const priorityConfig = {
    low: { 
      bg: 'bg-blue-50 dark:bg-blue-950/30', 
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-700 dark:text-blue-300',
      dot: 'bg-blue-500',
      label: 'Baixa'
    },
    medium: { 
      bg: 'bg-yellow-50 dark:bg-yellow-950/30', 
      border: 'border-yellow-200 dark:border-yellow-800',
      text: 'text-yellow-700 dark:text-yellow-300',
      dot: 'bg-yellow-500',
      label: 'Média'
    },
    high: { 
      bg: 'bg-orange-50 dark:bg-orange-950/30', 
      border: 'border-orange-200 dark:border-orange-800',
      text: 'text-orange-700 dark:text-orange-300',
      dot: 'bg-orange-500',
      label: 'Alta'
    },
    urgent: { 
      bg: 'bg-red-50 dark:bg-red-950/30', 
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-700 dark:text-red-300',
      dot: 'bg-red-500',
      label: 'Urgente'
    },
  };

  const safePriority = (card.priority ?? 'medium') as 'low' | 'medium' | 'high' | 'urgent';
  const config = priorityConfig[safePriority] ?? {
    bg: 'bg-muted/20',
    border: 'border-border',
    text: 'text-muted-foreground',
    dot: 'bg-muted-foreground',
    label: 'Sem prioridade',
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      data-testid={`card-${card.id}`}
      onClick={handleClick}
      className={`cursor-grab active:cursor-grabbing transition-all hover:shadow-lg hover:-translate-y-1 ${
        config.bg
      } ${config.border} border-l-4 ${
        isDragging ? 'shadow-2xl rotate-3 scale-105' : 'shadow-sm'
      }`}
      {...attributes}
      {...listeners}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm font-semibold line-clamp-2 text-foreground mb-1">
              {card.title}
            </CardTitle>
            {card.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mt-2">
                {card.description}
              </p>
            )}
          </div>
          <GripVertical className="h-4 w-4 text-muted-foreground/40 flex-shrink-0 mt-0.5" />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${config.bg} ${config.border} border`}>
            <div className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
            <span className={`text-xs font-medium ${config.text}`}>
              {config.label}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
