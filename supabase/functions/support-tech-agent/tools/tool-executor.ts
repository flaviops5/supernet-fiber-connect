/**
 * Tool Executor
 * Executa tools configuradas no banco de dados (agent_flow_steps)
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface ToolContext {
  ixc_client_id?: string;
  customer_name?: string;
  ticket_subject?: string;
  ticket_description?: string;
  ticket_priority?: string;
}

export interface ToolResults {
  test_connectivity_result?: { is_online: boolean; tx_power?: number; rx_power?: number };
  ticket_created?: boolean;
  ticket_id?: string;
  errors?: string[];
}

/**
 * Buscar e executar tools configuradas para um step/subject específico
 */
export async function executeConfiguredTools(
  supabase: SupabaseClient,
  logger: any,
  stepKey: string | null,
  subjectKey: string,
  context: ToolContext
): Promise<ToolResults> {
  const results: Record<string, unknown> = {};
  const errors: string[] = [];

  try {
    // Buscar configuração do step (se fornecido)
    let toolsList: string[] = [];
    
    if (stepKey) {
      const { data: stepConfig } = await supabase
        .from('agent_flow_steps')
        .select('step_tools, subject_key')
        .eq('step_key', stepKey)
        .eq('agent_type', 'support-tech-agent')
        .maybeSingle();

      if (stepConfig?.step_tools && Array.isArray(stepConfig.step_tools)) {
        toolsList = stepConfig.step_tools;
        logger.info("Tools do step carregadas", { stepKey, tools: toolsList });
      } else if (stepConfig?.subject_key) {
        // Buscar default_tools do subject
        const { data: subjectConfig } = await supabase
          .from('agent_flow_subjects')
          .select('default_tools')
          .eq('subject_key', stepConfig.subject_key)
          .eq('agent_type', 'support-tech-agent')
          .maybeSingle();

        if (subjectConfig?.default_tools && Array.isArray(subjectConfig.default_tools)) {
          toolsList = subjectConfig.default_tools;
          logger.info("Tools do subject carregadas", { subjectKey: stepConfig.subject_key, tools: toolsList });
        }
      }
    }

    // Fallback: buscar por subjectKey direto se não tiver step ou tools
    if (toolsList.length === 0 && subjectKey) {
      const { data: subjectConfig } = await supabase
        .from('agent_flow_subjects')
        .select('default_tools')
        .eq('subject_key', subjectKey)
        .eq('agent_type', 'support-tech-agent')
        .maybeSingle();

      if (subjectConfig?.default_tools && Array.isArray(subjectConfig.default_tools)) {
        toolsList = subjectConfig.default_tools;
        logger.info("Tools do subject (fallback) carregadas", { subjectKey, tools: toolsList });
      }
    }

    // Se não há tools configuradas, retornar vazio (não é erro)
    if (toolsList.length === 0) {
      logger.info("Nenhuma tool configurada para este step/subject", { stepKey, subjectKey });
      return results;
    }

    // Executar tools configuradas
    for (const toolName of toolsList) {
      try {
        if (toolName === 'test-equipment-connectivity' && context.ixc_client_id) {
          logger.info("Executando tool: test-equipment-connectivity", { ixc_client_id: context.ixc_client_id });
          
          const response = await supabase.functions.invoke("test-equipment-connectivity", {
            body: { ixc_client_id: context.ixc_client_id }
          });

          if (response.data) {
            results.test_connectivity_result = response.data;
            logger.info("Tool test-equipment-connectivity executada", { result: response.data });
          } else if (response.error) {
            errors.push(`test-equipment-connectivity: ${response.error.message}`);
            logger.error("Erro ao executar test-equipment-connectivity", { error: response.error });
          }
        } 
        else if (toolName === 'criar_atendimento_ixc' && context.ixc_client_id) {
          logger.info("Executando tool: criar_atendimento_ixc", { 
            ixc_client_id: context.ixc_client_id,
            subject: context.ticket_subject 
          });

          const response = await supabase.functions.invoke("criar_atendimento_ixc", {
            body: {
              client_id: context.ixc_client_id,
              subject: context.ticket_subject || "Atendimento técnico",
              description: context.ticket_description || "Atendimento aberto automaticamente pelo sistema",
              priority: context.ticket_priority || "normal"
            }
          });

          if (response.data?.ticket_id) {
            results.ticket_created = true;
            results.ticket_id = response.data.ticket_id;
            logger.info("Tool criar_atendimento_ixc executada", { ticket_id: response.data.ticket_id });
          } else if (response.error) {
            errors.push(`criar_atendimento_ixc: ${response.error.message}`);
            logger.error("Erro ao executar criar_atendimento_ixc", { error: response.error });
          }
        }
        else {
          logger.warn("Tool não implementada ou contexto insuficiente", { 
            toolName, 
            hasIxcClientId: !!context.ixc_client_id 
          });
        }
      } catch (toolError) {
        const errorMsg = toolError instanceof Error ? toolError.message : String(toolError);
        errors.push(`${toolName}: ${errorMsg}`);
        logger.error(`Erro ao executar tool ${toolName}`, { error: errorMsg });
      }
    }

    if (errors.length > 0) {
      results.errors = errors;
    }

    return results as ToolResults;
  } catch (error) {
    logger.error("Erro ao buscar/executar tools configuradas", { 
      error: error instanceof Error ? error.message : String(error),
      stepKey,
      subjectKey
    });
    return { errors: [error instanceof Error ? error.message : String(error)] };
  }
}
