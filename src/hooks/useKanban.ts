import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// NOTE: Types will be auto-generated after Supabase types are regenerated
// Using explicit types until then

export interface KanbanBoard {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  department: string;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface KanbanColumn {
  id: string;
  board_id: string;
  name: string;
  position: number;
  color: string;
  limit_cards: number | null;
  created_at: string;
  updated_at: string;
}

export interface KanbanCard {
  id: string;
  board_id: string;
  column_id: string;
  conversation_id: string | null;
  title: string;
  description: string | null;
  position: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  labels: string[];
  assigned_to: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export function useKanban(boardId: string | null) {
  const [board, setBoard] = useState<KanbanBoard | null>(null);
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [cards, setCards] = useState<KanbanCard[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Load board data
  useEffect(() => {
    if (!boardId) {
      setLoading(false);
      return;
    }

    const loadBoard = async () => {
      try {
        setLoading(true);

        // Load board
        const { data: boardData, error: boardError } = await supabase
          .from('kanban_boards' as any)
          .select('*')
          .eq('id', boardId)
          .single();

        if (boardError) throw boardError;
        setBoard(boardData as any);

        // Load columns
        const { data: columnsData, error: columnsError } = await supabase
          .from('kanban_columns' as any)
          .select('*')
          .eq('board_id', boardId)
          .order('position');

        if (columnsError) throw columnsError;
        setColumns(columnsData as any);

        // Load cards
        const { data: cardsData, error: cardsError } = await supabase
          .from('kanban_cards' as any)
          .select('*')
          .eq('board_id', boardId)
          .order('position');

        if (cardsError) throw cardsError;
        setCards(cardsData as any);
      } catch (error: any) {
        console.error('Error loading kanban board:', error);
        toast({
          title: 'Erro ao carregar board',
          description: error.message,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadBoard();
  }, [boardId, toast]);

  // Realtime subscriptions
  useEffect(() => {
    if (!boardId) return;

    const channel = supabase
      .channel(`kanban-board-${boardId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kanban_columns',
          filter: `board_id=eq.${boardId}`,
        },
        () => {
          // Reload columns
          supabase
            .from('kanban_columns' as any)
            .select('*')
            .eq('board_id', boardId)
            .order('position')
            .then(({ data }) => {
              if (data) setColumns(data as any);
            });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kanban_cards',
          filter: `board_id=eq.${boardId}`,
        },
        () => {
          // Reload cards
          supabase
            .from('kanban_cards' as any)
            .select('*')
            .eq('board_id', boardId)
            .order('position')
            .then(({ data }) => {
              if (data) setCards(data as any);
            });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [boardId]);

  // Move card
  const moveCard = async (
    cardId: string,
    newColumnId: string,
    newPosition: number
  ) => {
    try {
      const card = cards.find((c) => c.id === cardId);
      if (!card) throw new Error('Card not found');

      const oldColumnId = card.column_id;

      // Update card
      const { error } = await supabase
        .from('kanban_cards' as any)
        .update({
          column_id: newColumnId,
          position: newPosition.toString(),
        })
        .eq('id', cardId);

      if (error) throw error;

      // Log audit
      await supabase.functions.invoke('kanban-audit', {
        body: {
          board_id: boardId,
          card_id: cardId,
          action: 'card_moved',
          from_column_id: oldColumnId,
          to_column_id: newColumnId,
        },
      });

      toast({
        title: 'Card movido',
        description: 'Card movido com sucesso',
      });
    } catch (error: any) {
      console.error('Error moving card:', error);
      toast({
        title: 'Erro ao mover card',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Create card
  const createCard = async (
    columnId: string,
    title: string,
    description?: string
  ) => {
    try {
      if (!boardId) throw new Error('No board selected');

      const { data, error } = await supabase
        .from('kanban_cards' as any)
        .insert({
          board_id: boardId,
          column_id: columnId,
          title,
          description,
          position: 0,
        } as any)
        .select()
        .single();

      if (error) throw error;

      const createdCard = data as unknown as KanbanCard;

      // Log audit
      await supabase.functions.invoke('kanban-audit', {
        body: {
          board_id: boardId,
          card_id: createdCard.id,
          action: 'card_created',
          to_column_id: columnId,
        },
      });

      toast({
        title: 'Card criado',
        description: 'Card criado com sucesso',
      });

      return createdCard;
    } catch (error: any) {
      console.error('Error creating card:', error);
      toast({
        title: 'Erro ao criar card',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Delete card
  const deleteCard = async (cardId: string) => {
    try {
      const { error } = await supabase
        .from('kanban_cards' as any)
        .delete()
        .eq('id', cardId);

      if (error) throw error;

      // Log audit
      await supabase.functions.invoke('kanban-audit', {
        body: {
          board_id: boardId,
          card_id: cardId,
          action: 'card_deleted',
        },
      });

      toast({
        title: 'Card excluído',
        description: 'Card excluído com sucesso',
      });
    } catch (error: any) {
      console.error('Error deleting card:', error);
      toast({
        title: 'Erro ao excluir card',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return {
    board,
    columns,
    cards,
    loading,
    moveCard,
    createCard,
    deleteCard,
  };
}
