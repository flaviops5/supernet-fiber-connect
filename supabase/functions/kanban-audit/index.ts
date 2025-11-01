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

    // Truncate metadata to prevent JSONB overflow (max 8KB recommended)
    const MAX_METADATA_SIZE = 8000;
    let safeMetadata = payload.metadata || {};
    
    const metadataStr = JSON.stringify(safeMetadata);
    if (metadataStr.length > MAX_METADATA_SIZE) {
      console.warn(`⚠️ Metadata too large (${metadataStr.length} chars), truncating...`);
      safeMetadata = {
        ...safeMetadata,
        _truncated: true,
        _original_size: metadataStr.length,
        _note: 'Metadata was truncated to prevent database overflow'
      };
      
      // Re-stringify and check again
      const truncatedStr = JSON.stringify(safeMetadata);
      if (truncatedStr.length > MAX_METADATA_SIZE) {
        // If still too large, keep only essential fields
        safeMetadata = {
          _truncated: true,
          _original_size: metadataStr.length,
          _note: 'Original metadata exceeded size limit'
        };
      }
    }

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
        metadata: safeMetadata,
      })
      .select('id')
      .single();

    if (error) {
      console.error(`❌ Audit log failed: ${error.message}`, {
        board_id: payload.board_id,
        card_id: payload.card_id,
        action: payload.action,
      });
      throw new Error(`Failed to log audit: ${error.message}`);
    }

    console.log(`✅ Audit logged: ${payload.action} for card ${payload.card_id}`);

    return {
      success: true,
      audit_id: data.id,
    };
  }
);
