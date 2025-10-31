import { createAuthenticatedHandler } from "../_shared/base-handler.ts";

interface KanbanAuditPayload {
  board_id: string;
  card_id?: string;
  action: 'card_created' | 'card_moved' | 'card_updated' | 'card_deleted' | 'card_assigned';
  from_column_id?: string;
  to_column_id?: string;
  metadata?: Record<string, unknown>;
}

export default createAuthenticatedHandler<{ success: boolean; audit_id: string }>(
  'kanban-audit',
  async (req, { supabase, user }) => {
    const payload: KanbanAuditPayload = await req.json();

    // Insert audit log
    const { data, error } = await supabase
      .from('kanban_audit_logs')
      .insert({
        board_id: payload.board_id,
        card_id: payload.card_id,
        user_id: user.id,
        action: payload.action,
        from_column_id: payload.from_column_id,
        to_column_id: payload.to_column_id,
        metadata: payload.metadata || {},
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to log audit: ${error.message}`);
    }

    console.log(`✅ Audit logged: ${payload.action} for card ${payload.card_id}`);

    return {
      success: true,
      audit_id: data.id,
    };
  }
);
