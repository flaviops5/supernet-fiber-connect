import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// NOTE: Types will be auto-generated after Supabase types are regenerated
// Using explicit types until then

export interface KanbanBoard {
  id: string;
  title: string;
  description: string | null;
  created_by: string;
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
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  link_info?: string | null;
  custom_fields?: Record<string, any>;
  municipio?: string | null;
  localizacao_url?: string | null;
  links_texto?: string | null;
  data_instalacao?: string | null;
  periodo?: 'manhã' | 'tarde' | 'noite' | null;
  provedor_local?: string | null;
  telefone?: string | null;
}

export function useKanban(boardId: string | null) {
  const [board, setBoard] = useState<KanbanBoard | null>(null);
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [cards, setCards] = useState<KanbanCard[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const fetchTokenRef = useRef(0);

  // Load board data with AbortController to prevent race conditions
  useEffect(() => {
    if (!boardId) {
      setBoard(null);
      setColumns([]);
      setCards([]);
      setLoading(false);
      return;
    }

    // Reset state immediately to avoid rendering heavy previous board while switching
    setBoard(null);
    setColumns([]);
    setCards([]);

    const controller = new AbortController();
    const myToken = ++fetchTokenRef.current;
    
    const loadBoard = async () => {
      try {
        setLoading(true);

        // Load board
        const { data: boardData, error: boardError } = await supabase
          .from('kanban_boards' as any)
          .select('*')
          .eq('id', boardId)
          .single();

        if (controller.signal.aborted || myToken !== fetchTokenRef.current) return;
        if (boardError) throw boardError;
        setBoard(boardData as any);

        // Load columns
        const { data: columnsData, error: columnsError } = await supabase
          .from('kanban_columns' as any)
          .select('*')
          .eq('board_id', boardId)
          .order('position');

        if (controller.signal.aborted || myToken !== fetchTokenRef.current) return;
        if (columnsError) throw columnsError;
        setColumns(columnsData as any);

        // Load cards
        const { data: cardsData, error: cardsError } = await supabase
          .from('kanban_cards' as any)
          .select('*')
          .eq('board_id', boardId)
          .order('position');

        if (controller.signal.aborted || myToken !== fetchTokenRef.current) return;
        if (cardsError) throw cardsError;
        setCards(cardsData as any);
      } catch (error: unknown) {
        if (controller.signal.aborted || myToken !== fetchTokenRef.current) return;
        console.error('Error loading kanban board:', error);
        toast({
          title: 'Erro ao carregar board',
          description: error instanceof Error ? error.message : 'Erro desconhecido',
          variant: 'destructive',
        });
      } finally {
        if (!controller.signal.aborted && myToken === fetchTokenRef.current) {
          setLoading(false);
        }
      }
    };

    loadBoard();

    return () => {
      controller.abort();
    };
  }, [boardId, toast]);

  // Realtime subscriptions with optimized filtering
  useEffect(() => {
    if (!boardId) return;

    let isSubscribed = true;

    // Ensure no lingering channels from previous boards
    try {
      const existing = (supabase as any).getChannels?.() || [];
      for (const ch of existing) {
        if (ch?.topic?.startsWith('kanban-board-') && ch.topic !== `kanban-board-${boardId}`) {
          supabase.removeChannel(ch);
        }
      }
    } catch {}

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
          // Reload columns only for this board
          if (isSubscribed) {
            supabase
              .from('kanban_columns' as any)
              .select('*')
              .eq('board_id', boardId)
              .order('position')
              .then(({ data }) => {
                if (data && isSubscribed) setColumns(data as any);
              });
          }
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
          // Reload cards only for this board
          if (isSubscribed) {
            supabase
              .from('kanban_cards' as any)
              .select('*')
              .eq('board_id', boardId)
              .order('position')
              .then(({ data }) => {
                if (data && isSubscribed) setCards(data as any);
              });
          }
        }
      )
      .subscribe();

    return () => {
      isSubscribed = false;
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

      // Log audit (await for data integrity)
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
    } catch (error: unknown) {
      console.error('Error moving card:', error);
      toast({
        title: 'Erro ao mover card',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
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

      // Log audit (await for data integrity)
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
    } catch (error: unknown) {
      console.error('Error creating card:', error);
      toast({
        title: 'Erro ao criar card',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Delete card
  const deleteCard = async (cardId: string) => {
    try {
      // Optimistic update - remove card from local state immediately
      const prevCards = cards;
      setCards(prev => prev.filter(c => c.id !== cardId));

      const { error } = await supabase
        .from('kanban_cards' as any)
        .delete()
        .eq('id', cardId);

      if (error) {
        // Revert on error
        setCards(prevCards);
        throw error;
      }

      // Log audit (await for data integrity)
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
    } catch (error: unknown) {
      console.error('Error deleting card:', error);
      toast({
        title: 'Erro ao excluir card',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
      throw error;
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
    } catch (error: unknown) {
      console.error('Error updating card:', error);
      toast({
        title: 'Erro ao atualizar card',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
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
        const confirmed = window.confirm(
          `A coluna possui ${cardsInColumn.length} cards.\n\nDeseja excluir TODOS os cards desta coluna e a coluna?\nEsta ação não pode ser desfeita.`
        );
        if (!confirmed) return;

        // Optimistic update: remove cards and column locally first
        const prevCards = cards;
        const prevColumns = columns;
        setCards(prev => prev.filter(c => c.column_id !== columnId));
        setColumns(prev => prev.filter(col => col.id !== columnId));

        // Delete cards from this column
        const { error: cardsError } = await supabase
          .from('kanban_cards' as any)
          .delete()
          .eq('column_id', columnId);
        if (cardsError) {
          // Revert on error
          setCards(prevCards);
          setColumns(prevColumns);
          throw cardsError;
        }

        // Now delete the column
        const { error: columnError } = await supabase
          .from('kanban_columns' as any)
          .delete()
          .eq('id', columnId);
        if (columnError) {
          // Revert columns (cards already gone in DB, keep local as-is)
          setColumns(prevColumns);
          throw columnError;
        }

        toast({
          title: 'Coluna excluída',
          description: 'Coluna e cards associados excluídos com sucesso',
        });
        return;
      }

      // No cards: delete column directly
      const prevColumns = columns;
      setColumns(prev => prev.filter(col => col.id !== columnId));

      const { error } = await supabase
        .from('kanban_columns' as any)
        .delete()
        .eq('id', columnId);

      if (error) {
        setColumns(prevColumns);
        throw error;
      }

      toast({
        title: 'Coluna excluída',
        description: 'Coluna excluída com sucesso',
      });
    } catch (error: unknown) {
      console.error('Error deleting column:', error);
      toast({
        title: 'Erro ao excluir coluna',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
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
