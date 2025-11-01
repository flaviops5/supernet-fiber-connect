import { createAuthenticatedHandler } from "../_shared/base-handler.ts";

export default createAuthenticatedHandler<{ success: boolean; deleted_count: number }>(
  'kanban-clear-cards',
  async (req, { supabase, user }) => {
    const { board_id } = await req.json();

    if (!board_id) {
      throw new Error('board_id é obrigatório');
    }

    // Delete all cards from the board
    const { data, error } = await supabase
      .from('kanban_cards')
      .delete()
      .eq('board_id', board_id)
      .select('id');

    if (error) {
      throw new Error(`Erro ao deletar cards: ${error.message}`);
    }

    const deleted_count = data?.length || 0;

    console.log(`✅ ${deleted_count} cards deletados do board ${board_id}`);

    return {
      success: true,
      deleted_count,
    };
  }
);
