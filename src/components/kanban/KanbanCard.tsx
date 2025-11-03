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
      bg: 'bg-emerald-50 dark:bg-emerald-950/30', 
      border: 'border-emerald-200 dark:border-emerald-800',
      text: 'text-emerald-700 dark:text-emerald-300',
      dot: 'bg-emerald-500',
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
            {/* Município em DESTAQUE como informação principal */}
            {(card as any).municipio && (
              <div className="mb-2">
                <CardTitle className="text-base font-bold line-clamp-1 text-foreground flex items-center gap-1">
                  📍 {(card as any).municipio}
                </CardTitle>
              </div>
            )}
            
            {/* Nome da escola como informação secundária */}
            <p className="text-xs font-medium text-muted-foreground line-clamp-1 mb-1">
              {card.title}
            </p>
            
            {card.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mt-2">
                {card.description}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2 flex-shrink-0">
            {(card as any).localizacao_url && (
              <a
                href={(card as any).localizacao_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-primary hover:text-primary/80 transition-colors"
                title="Ver no Google Maps"
              >
                📍
              </a>
            )}
            <GripVertical className="h-4 w-4 text-muted-foreground/40" />
          </div>
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
