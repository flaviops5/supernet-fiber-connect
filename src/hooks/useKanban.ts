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
  title: string;
  description: string | null;
  position: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
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

      // Optimistic update
      const prevCards = cards;
      setCards(prev => prev.map(c => c.id === cardId ? { ...c, column_id: newColumnId, position: newPosition } : c));

      // Update card on server
      const { error } = await supabase
        .from('kanban_cards' as any)
        .update({
          column_id: newColumnId,
          position: newPosition,
        })
        .eq('id', cardId);

      if (error) {
        // Revert on error
        setCards(prevCards);
        throw error;
      }

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
    description?: string,
    priority?: 'low' | 'medium' | 'high' | 'urgent'
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
          priority: priority || 'medium',
          position: 0,
        } as any)
        .select()
        .single();

      if (error) throw error;

      const createdCard = data as unknown as KanbanCard;
      
      // Optimistic update - add card to local state immediately
      setCards(prev => [...prev, createdCard]);

      // Log audit (don't await to not block the UI)
      supabase.functions.invoke('kanban-audit', {
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

  // Update card
  const updateCard = async (cardId: string, updates: Partial<KanbanCard>) => {
    try {
      const { error } = await supabase
        .from('kanban_cards' as any)
        .update(updates)
        .eq('id', cardId);

      if (error) throw error;

      toast({
        title: 'Card atualizado',
        description: 'Card atualizado com sucesso',
      });
    } catch (error: any) {
      console.error('Error updating card:', error);
      toast({
        title: 'Erro ao atualizar card',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Delete column
  const deleteColumn = async (columnId: string) => {
    try {
      // Check if column has cards
      const cardsInColumn = cards.filter(c => c.column_id === columnId);
      if (cardsInColumn.length > 0) {
        toast({
          title: 'Não é possível deletar',
          description: 'A coluna possui cards. Mova ou delete os cards primeiro.',
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase
        .from('kanban_columns' as any)
        .delete()
        .eq('id', columnId);

      if (error) throw error;

      toast({
        title: 'Coluna excluída',
        description: 'Coluna excluída com sucesso',
      });
    } catch (error: any) {
      console.error('Error deleting column:', error);
      toast({
        title: 'Erro ao excluir coluna',
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
    updateCard,
    deleteColumn,
  };
}
