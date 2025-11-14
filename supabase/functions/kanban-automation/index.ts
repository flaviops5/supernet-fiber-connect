import { createAuthenticatedHandler } from "../_shared/base-handler.ts";

interface AutomationTrigger {
  board_id: string;
  card_id: string;
  trigger_type: 'card_moved' | 'card_created' | 'priority_changed';
  from_column_id?: string;
  to_column_id?: string;
  old_priority?: string;
  new_priority?: string;
}

export default createAuthenticatedHandler<{ processed: number; executed: number }>(
  'kanban-automation',
  async (req, { supabase, user }) => {
    const trigger: AutomationTrigger = await req.json();

    // Load active automations for this board
    const { data: automations, error: loadError } = await supabase
      .from('kanban_automations')
      .select('*')
      .eq('board_id', trigger.board_id)
      .eq('is_active', true);

    if (loadError) {
      throw new Error(`Failed to load automations: ${loadError.message}`);
    }

    if (!automations || automations.length === 0) {
      return { processed: 0, executed: 0 };
    }

    let executed = 0;

    // Process each automation
    for (const automation of automations) {
      // Check if trigger matches
      if (automation.trigger_type !== trigger.trigger_type) {
        continue;
      }

      // Check trigger conditions
      const conditions = automation.trigger_conditions as Record<string, unknown>;
      
      if (trigger.trigger_type === 'card_moved') {
        if (conditions.to_column_id && conditions.to_column_id !== trigger.to_column_id) {
          continue;
        }
      }

      // Execute actions
      const actions = automation.actions as Array<{ type: string; [key: string]: unknown }>;
      
      for (const action of actions) {
        try {
          switch (action.type) {
            case 'assign':
              if (action.user_id) {
                await supabase
                  .from('kanban_cards')
                  .update({ assigned_to: action.user_id })
                  .eq('id', trigger.card_id);
                executed++;
              }
              break;

            case 'move_card':
              if (action.column_id) {
                await supabase
                  .from('kanban_cards')
                  .update({ column_id: action.column_id })
                  .eq('id', trigger.card_id);
                executed++;
              }
              break;

            case 'change_priority':
              if (action.priority) {
                await supabase
                  .from('kanban_cards')
                  .update({ priority: action.priority })
                  .eq('id', trigger.card_id);
                executed++;
              }
              break;

            case 'notify':
              // Log notification (could be sent via email/webhook)
              console.log(`Notification: ${action.message || 'Card updated'}`);
              executed++;
              break;

            default:
              console.warn(`Unknown action type: ${action.type}`);
          }
        } catch (actionError) {
          console.error(`Error executing action ${action.type}:`, actionError);
        }
      }

      // Log automation execution
      await supabase.from('kanban_audit_logs').insert({
        board_id: trigger.board_id,
        card_id: trigger.card_id,
        user_id: user.id,
        action: `automation_executed_${automation.name}`,
        metadata: {
          automation_id: automation.id,
          trigger_type: trigger.trigger_type,
          actions_executed: actions.length,
        },
      });
    }

    console.log(`✅ Processed ${automations.length} automations, executed ${executed} actions`);

    return {
      processed: automations.length,
      executed,
    };
  }
);
