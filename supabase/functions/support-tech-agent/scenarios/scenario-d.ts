/**
 * Scenario D Handler - Critical RX (< -30 dBm)
 * 
 * FLOW:
 * 1. Detect critical RX signal (< -30 dBm)
 * 2. Inform customer about severe issue
 * 3. Create urgent ticket automatically
 * 4. Schedule technical visit
 * 5. Immediate escalation
 * 
 * COVERAGE: ~5% of technical support cases
 * AVG RESOLUTION: 2-3 minutes (immediate escalation)
 * REQUIRES: On-site technical visit
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ConversationService } from "../services/conversation-service.ts";
import { IXCService } from "../services/ixc-service.ts";

interface ScenarioDContext {
  conversationId: string;
  ixcClientId?: string;
  customerName: string;
  currentMessage: string;
  flowState: any;
  signalData: {
    tx?: number;
    rx?: number;
    serial?: string;
    status?: string;
  } | null;
  messageHistory: any[];
  waitingStep?: string | null;
}

interface ScenarioDResult {
  success: boolean;
  resolved: boolean;
  escalated: boolean;
  actions_taken: string[];
  final_status: string;
  metadata: Record<string, any>;
}

const FLOW_STAGES = {
  DETECT_CRITICAL: "d_detect_critical",
  INFORM_CLIENT: "d_inform_client",
  CREATE_TICKET: "d_create_ticket",
  SCHEDULE_VISIT: "d_schedule_visit",
  ESCALATE: "d_escalate"
};

export async function handleScenarioD(
  supabase: SupabaseClient,
  logger: any,
  context: ScenarioDContext
): Promise<ScenarioDResult> {
  const startTime = Date.now();
  const actions: string[] = [];
  
  logger.info("🔴 [Scenario D] Starting critical RX flow", {
    conversationId: context.conversationId,
    rx: context.signalData?.rx,
    tx: context.signalData?.tx,
    clientId: context.ixcClientId
  });

  const conversationService = new ConversationService(supabase, logger);
  const ixcService = new IXCService(supabase, logger);

  try {
    // Get current flow state
    const conversation = await conversationService.getConversation(context.conversationId);
    const flowState = conversation?.metadata?.flow_state || {};
    const currentStage = flowState.current_stage || FLOW_STAGES.DETECT_CRITICAL;

    logger.info("📍 [Scenario D] Current stage", { currentStage });

    // Stage 1: Detect Critical Signal
    if (currentStage === FLOW_STAGES.DETECT_CRITICAL) {
      logger.info("🔴 [Scenario D] Stage 1: Critical RX detected");
      
      actions.push("critical_rx_detected");

      await conversationService.updateFlowState(context.conversationId, {
        current_stage: FLOW_STAGES.INFORM_CLIENT,
        scenario: "D",
        rx_value: context.signalData?.rx,
        detection_time: new Date().toISOString(),
        stage_started_at: new Date().toISOString()
      });

      // Proceed immediately to inform client
      return handleInformClient(
        context,
        supabase,
        logger,
        conversationService,
        ixcService,
        flowState,
        actions
      );
    }

    // Stage 2: Inform Client (auto-executed)
    if (currentStage === FLOW_STAGES.INFORM_CLIENT) {
      return handleInformClient(
        context,
        supabase,
        logger,
        conversationService,
        ixcService,
        flowState,
        actions
      );
    }

    // Stage 3: Create Ticket (auto-executed)
    if (currentStage === FLOW_STAGES.CREATE_TICKET) {
      return handleCreateTicket(
        context,
        supabase,
        logger,
        conversationService,
        ixcService,
        flowState,
        actions
      );
    }

    // Stage 4: Schedule Visit (auto-executed)
    if (currentStage === FLOW_STAGES.SCHEDULE_VISIT) {
      return handleScheduleVisit(
        context,
        supabase,
        logger,
        conversationService,
        ixcService,
        flowState,
        actions
      );
    }

    // Stage 5: Escalate (final stage)
    if (currentStage === FLOW_STAGES.ESCALATE) {
      return handleEscalation(
        context,
        supabase,
        logger,
        conversationService,
        ixcService,
        flowState,
        actions
      );
    }

    // Unknown stage
    logger.error("❌ [Scenario D] Unknown stage", { currentStage });
    throw new Error(`Unknown stage: ${currentStage}`);

  } catch (error) {
    logger.error("❌ [Scenario D] Error in flow", {
      error: error.message,
      conversationId: context.conversationId
    });

    await conversationService.insertMessage(context.conversationId, {
      sender_type: "agent",
      sender_name: "Suporte Técnico",
      content: "Desculpe, houve um erro. Vou transferir para um técnico imediatamente.",
      ai_suggestion: false
    });

    await conversationService.transferConversation(
      context.conversationId,
      "technical",
      "Error in Scenario D flow - critical RX",
      { error: error.message, scenario: "D", rx: context.signalData?.rx }
    );

    return {
      success: false,
      resolved: false,
      escalated: true,
      actions_taken: actions,
      final_status: "error_escalated",
      metadata: { error: error.message }
    };
  }
}

async function handleInformClient(
  context: ScenarioDContext,
  supabase: SupabaseClient,
  logger: any,
  conversationService: ConversationService,
  ixcService: IXCService,
  flowState: any,
  actions: string[]
): Promise<ScenarioDResult> {
  logger.info("📢 [Scenario D] Stage 2: Informing client about critical issue");

  // Determine severity message based on RX value
  let severityDescription = "";
  const rx = context.signalData?.rx || -999;

  if (rx < -35) {
    severityDescription = "**extremamente crítico** (praticamente sem sinal)";
  } else if (rx < -32) {
    severityDescription = "**muito crítico** (sinal muito fraco)";
  } else {
    severityDescription = "**crítico** (sinal insuficiente)";
  }

  await conversationService.insertMessage(context.conversationId, {
    sender_type: "agent",
    sender_name: "Suporte Técnico",
    content: `⚠️ **PROBLEMA GRAVE DETECTADO**

O sinal óptico está ${severityDescription}:
• **RX atual:** ${rx} dBm (Normal: acima de -24 dBm)
• **Situação:** Problema sério na fibra óptica

**O que isso significa:**
Este problema NÃO pode ser resolvido remotamente. É necessária uma visita técnica urgente para verificar:
- Cabo de fibra danificado ou rompido
- Problemas na rede externa
- Equipamento com defeito

**Próximos passos:**
Vou criar um chamado URGENTE e nossa equipe entrará em contato para agendar a visita técnica o mais rápido possível.

Aguarde alguns segundos...`,
    ai_suggestion: false
  });

  actions.push("client_informed");

  await conversationService.updateFlowState(context.conversationId, {
    current_stage: FLOW_STAGES.CREATE_TICKET,
    client_informed_at: new Date().toISOString(),
    stage_started_at: new Date().toISOString()
  });

  // Proceed immediately to create ticket
  return handleCreateTicket(
    context,
    supabase,
    logger,
    conversationService,
    ixcService,
    flowState,
    actions
  );
}

async function handleCreateTicket(
  context: ScenarioDContext,
  supabase: SupabaseClient,
  logger: any,
  conversationService: ConversationService,
  ixcService: IXCService,
  flowState: any,
  actions: string[]
): Promise<ScenarioDResult> {
  logger.info("🎫 [Scenario D] Stage 3: Creating urgent ticket");

  let ticketId: string | undefined;
  let ticketSuccess = false;

  try {
    const ticketResult = await ixcService.createTicket({
      client_id: context.ixcClientId,
      title: `[URGENTE] Sinal óptico crítico - RX ${context.signalData?.rx} dBm`,
      description: `⚠️ PROBLEMA CRÍTICO - PRIORIDADE MÁXIMA

**Sinal óptico crítico detectado:**
RX: ${context.signalData?.rx || 'N/A'} dBm (crítico: < -30 dBm)
TX: ${context.signalData?.tx || 'N/A'} dBm
Distância: ${context.signalData?.distance || 'N/A'} metros

**Diagnóstico:**
- Possível rompimento ou dano severo na fibra óptica
- Conexão física comprometida
- Requer visita técnica IMEDIATA

**Cliente foi informado sobre:**
- Gravidade do problema
- Necessidade de visita técnica urgente
- Impossibilidade de resolução remota

**Ações necessárias:**
1. Agendar visita técnica em até 24 horas
2. Verificar integridade do cabo de fibra
3. Testar equipamento ONU
4. Verificar conexões na rede externa

Cliente aguardando contato para agendamento.`,
      priority: "critical",
      category: "technical_support_urgent"
    });

    ticketSuccess = ticketResult.success;
    ticketId = ticketResult.ticket_id;

    if (ticketSuccess && ticketId) {
      logger.info("✅ [Scenario D] Ticket created successfully", { ticket_id: ticketId });
      
      await conversationService.insertMessage(context.conversationId, {
        sender_type: "agent",
        sender_name: "Suporte Técnico",
        content: `✅ Chamado urgente criado com sucesso!

**Número do chamado:** ${ticketId}

Nossa equipe técnica já foi notificada e entrará em contato com você em breve para agendar a visita.

**Previsão de atendimento:** Até 24 horas
**Prioridade:** Crítica

Você receberá um contato por telefone ou WhatsApp para combinar o melhor horário para a visita técnica.

Enquanto isso, evite mexer no equipamento ou nos cabos.`,
        ai_suggestion: false
      });

      actions.push("ticket_created");
    } else {
      throw new Error("Failed to create ticket");
    }

  } catch (error) {
    logger.error("❌ [Scenario D] Failed to create ticket", { error: error.message });
    
    await conversationService.insertMessage(context.conversationId, {
      sender_type: "agent",
      sender_name: "Suporte Técnico",
      content: `Houve um problema ao criar o chamado automaticamente, mas não se preocupe!

Vou transferir você diretamente para nossa equipe técnica que criará o chamado urgente manualmente e agendará sua visita imediatamente.`,
      ai_suggestion: false
    });

    actions.push("ticket_creation_failed");
  }

  await conversationService.updateFlowState(context.conversationId, {
    current_stage: FLOW_STAGES.SCHEDULE_VISIT,
    ticket_id: ticketId,
    ticket_created: ticketSuccess,
    ticket_created_at: new Date().toISOString(),
    stage_started_at: new Date().toISOString()
  });

  // Proceed to schedule visit
  return handleScheduleVisit(
    context,
    supabase,
    logger,
    conversationService,
    ixcService,
    { ...flowState, ticket_id: ticketId, ticket_created: ticketSuccess },
    actions
  );
}

async function handleScheduleVisit(
  context: ScenarioDContext,
  supabase: SupabaseClient,
  logger: any,
  conversationService: ConversationService,
  ixcService: IXCService,
  flowState: any,
  actions: string[]
): Promise<ScenarioDResult> {
  logger.info("📅 [Scenario D] Stage 4: Scheduling technical visit");

  await conversationService.insertMessage(context.conversationId, {
    sender_type: "agent",
    sender_name: "Suporte Técnico",
    content: `📋 **Informações importantes para a visita técnica:**

**O que o técnico irá verificar:**
• Estado do cabo de fibra óptica
• Conexões na rede externa
• Equipamento ONU
• Possíveis danos físicos

**Como se preparar:**
• Garanta acesso ao local onde está o equipamento
• Tenha em mãos o número do chamado: ${flowState.ticket_id || 'será informado'}
• Não mexa no equipamento antes da visita

**Próximos passos:**
Vou transferir você para nossa equipe de agendamento que entrará em contato imediatamente para combinar o melhor horário.`,
    ai_suggestion: false
  });

  actions.push("visit_scheduled");

  await conversationService.updateFlowState(context.conversationId, {
    current_stage: FLOW_STAGES.ESCALATE,
    visit_info_sent_at: new Date().toISOString(),
    stage_started_at: new Date().toISOString()
  });

  // Proceed to escalation
  return handleEscalation(
    context,
    supabase,
    logger,
    conversationService,
    ixcService,
    flowState,
    actions
  );
}

async function handleEscalation(
  context: ScenarioDContext,
  supabase: SupabaseClient,
  logger: any,
  conversationService: ConversationService,
  ixcService: IXCService,
  flowState: any,
  actions: string[]
): Promise<ScenarioDResult> {
  logger.info("🚨 [Scenario D] Stage 5: Escalating to scheduling team");

  await conversationService.insertMessage(context.conversationId, {
    sender_type: "agent",
    sender_name: "Suporte Técnico",
    content: `Transferindo você agora para nossa equipe de agendamento. Eles entrarão em contato em breve.

Obrigado pela compreensão! 🙏`,
    ai_suggestion: false
  });

  // Transfer to scheduling/technical department
  await conversationService.transferConversation(
    context.conversationId,
    "technical",
    "Critical RX - Requires urgent on-site visit",
    {
      scenario: "D",
      rx_value: context.signalData?.rx,
      ticket_id: flowState.ticket_id,
      priority: "critical",
      requires_visit: true,
      escalation_reason: "critical_fiber_issue"
    }
  );

  actions.push("escalated_to_scheduling");

  // Log KPI
  const resolutionTime = Math.round((Date.now() - new Date(flowState.stage_started_at || Date.now()).getTime()) / 1000);
  
  logger.info("📊 [Scenario D] Escalation KPI", {
    scenario: "D",
    resolution_time_seconds: resolutionTime,
    rx_value: context.signalData?.rx,
    ticket_created: flowState.ticket_created,
    ticket_id: flowState.ticket_id,
    success: true
  });

  await conversationService.updateFlowState(context.conversationId, {
    escalated: true,
    escalated_at: new Date().toISOString(),
    escalation_time_seconds: resolutionTime
  });

  return {
    success: true,
    resolved: false, // Cannot be resolved remotely
    escalated: true,
    actions_taken: actions,
    final_status: "escalated_for_visit",
    metadata: {
      ticket_id: flowState.ticket_id,
      rx_value: context.signalData?.rx,
      escalation_time: resolutionTime,
      requires_visit: true
    }
  };
}
