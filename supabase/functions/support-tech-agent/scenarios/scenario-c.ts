/**
 * Scenario C Handler - Weak Signal (RX between -27 and -30 dBm)
 * 
 * FLOW:
 * 1. Detect weak signal (RX -27 to -30 dBm)
 * 2. Ask about instability symptoms
 * 3. Check for blinking LOS light
 * 4. Instruct optical connector reconnection
 * 5. Wait for reconnection (30-60s)
 * 6. Retest signal and connectivity
 * 7. Verify navigation if online
 * 8. Escalate if issue persists
 * 
 * COVERAGE: ~20% of technical support cases
 * AVG RESOLUTION: 5-8 minutes
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ConversationService } from "../services/conversation-service.ts";
import { IXCService } from "../services/ixc-service.ts";
import { hybridInterpret } from "../../_shared/ai-response-interpreter.ts";

interface ScenarioCContext {
  conversationId: string;
  clientData: any;
  signalData: {
    tx?: number;
    rx?: number;
    distance?: number;
  };
  parallelDiagnostics?: any;
  userId?: string;
}

interface ScenarioCResult {
  success: boolean;
  resolved: boolean;
  escalated: boolean;
  actions_taken: string[];
  final_status: string;
  metadata: Record<string, any>;
}

const FLOW_STAGES = {
  DETECT_INSTABILITY: "c_detect_instability",
  CHECK_LOS_LIGHT: "c_check_los_light",
  INSTRUCT_RECONNECTION: "c_instruct_reconnection",
  WAIT_RECONNECTION: "c_wait_reconnection",
  RETEST_SIGNAL: "c_retest_signal",
  TEST_CONNECTIVITY: "c_test_connectivity",
  VERIFY_NAVIGATION: "c_verify_navigation",
  ESCALATE: "c_escalate"
};

export async function handleScenarioC(
  supabase: SupabaseClient,
  logger: any,
  context: ScenarioCContext
): Promise<ScenarioCResult> {
  const startTime = Date.now();
  const actions: string[] = [];
  
  logger.info("🟡 [Scenario C] Starting weak signal flow", {
    conversationId: context.conversationId,
    rx: context.signalData.rx,
    tx: context.signalData.tx,
    clientId: context.clientData?.id
  });

  const conversationService = new ConversationService(supabase, logger);
  const ixcService = new IXCService(supabase, logger);

  try {
    // Get current flow state
    const conversation = await conversationService.getConversation(context.conversationId);
    const flowState = conversation?.metadata?.flow_state || {};
    const currentStage = flowState.current_stage || FLOW_STAGES.DETECT_INSTABILITY;
    const reconnection_attempts = flowState.reconnection_attempts || 0;
    const clarification_count = flowState.clarification_count || 0;

    logger.info("📍 [Scenario C] Current stage", { 
      currentStage, 
      reconnection_attempts,
      clarification_count 
    });

    // Get message history for intent detection
    const messageHistory = await conversationService.getMessageHistory(context.conversationId, 5);
    const lastUserMessage = messageHistory
      .filter((m: any) => m.sender_type === "customer")
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

    const userMessage = lastUserMessage?.content || "";
    const sanitizedMessage = sanitizePII(userMessage);

    // Stage 1: Detect Instability
    if (currentStage === FLOW_STAGES.DETECT_INSTABILITY) {
      logger.info("🔍 [Scenario C] Stage 1: Detecting instability symptoms");
      
      await conversationService.insertMessage(context.conversationId, {
        sender_type: "agent",
        sender_name: "Suporte Técnico",
        content: `Detectei que o sinal óptico está um pouco fraco (RX: ${context.signalData.rx} dBm). 

Você está tendo algum destes problemas?
• Internet lenta ou travando
• Conexão cai e volta sozinha
• Dificuldade para acessar sites

Por favor, me conte o que está acontecendo.`,
        ai_suggestion: false
      });

      actions.push("asked_about_instability");
      
      await conversationService.updateFlowState(context.conversationId, {
        current_stage: FLOW_STAGES.CHECK_LOS_LIGHT,
        scenario: "C",
        reconnection_attempts,
        clarification_count,
        stage_started_at: new Date().toISOString()
      });

      return {
        success: true,
        resolved: false,
        escalated: false,
        actions_taken: actions,
        final_status: "awaiting_instability_confirmation",
        metadata: { stage: FLOW_STAGES.CHECK_LOS_LIGHT }
      };
    }

    // Stage 2: Check LOS Light
    if (currentStage === FLOW_STAGES.CHECK_LOS_LIGHT) {
      logger.info("💡 [Scenario C] Stage 2: Checking LOS light status");

      // Interpret user response about instability
      const interpretation = await hybridInterpret(
        sanitizedMessage,
        ["confirma_instabilidade", "nega_instabilidade", "unclear"],
        { conversationId: context.conversationId }
      );

      // Handle unclear response
      if (interpretation.intent === "unclear" && clarification_count < 2) {
        logger.info("❓ [Scenario C] Unclear response, requesting clarification");
        
        await conversationService.insertMessage(context.conversationId, {
          sender_type: "agent",
          sender_name: "Suporte Técnico",
          content: `Desculpe, não entendi bem. 

Você está tendo problemas como:
• Internet caindo e voltando?
• Lentidão para carregar páginas?
• Sites travando?

Responda SIM se está tendo esses problemas, ou NÃO se a internet está funcionando normal.`,
          ai_suggestion: false
        });

        await conversationService.updateFlowState(context.conversationId, {
          clarification_count: clarification_count + 1,
          last_clarification: new Date().toISOString()
        });

        return {
          success: true,
          resolved: false,
          escalated: false,
          actions_taken: ["clarification_requested"],
          final_status: "awaiting_clear_response",
          metadata: { clarification_count: clarification_count + 1 }
        };
      }

      // If user denies instability but signal is weak, ask about LOS light anyway
      await conversationService.insertMessage(context.conversationId, {
        sender_type: "agent",
        sender_name: "Suporte Técnico",
        content: `Entendi. Vamos verificar o equipamento.

Por favor, olhe para o seu equipamento de fibra (ONU/ONT) e me diga:

**A luz/LED chamada "LOS" ou "PON" está:**
1. Verde fixa (não pisca)
2. Verde piscando
3. Vermelha
4. Apagada

Qual a cor e o comportamento da luz?`,
        ai_suggestion: false
      });

      actions.push("asked_about_los_light");

      await conversationService.updateFlowState(context.conversationId, {
        current_stage: FLOW_STAGES.INSTRUCT_RECONNECTION,
        instability_confirmed: interpretation.intent === "confirma_instabilidade",
        clarification_count: 0,
        stage_started_at: new Date().toISOString()
      });

      return {
        success: true,
        resolved: false,
        escalated: false,
        actions_taken: actions,
        final_status: "awaiting_los_status",
        metadata: { stage: FLOW_STAGES.INSTRUCT_RECONNECTION }
      };
    }

    // Stage 3: Instruct Reconnection
    if (currentStage === FLOW_STAGES.INSTRUCT_RECONNECTION) {
      logger.info("🔌 [Scenario C] Stage 3: Instructing optical connector reconnection");

      // Interpret LOS light status
      const losInterpretation = await hybridInterpret(
        sanitizedMessage,
        ["los_verde", "los_piscando", "los_vermelho", "los_apagado", "unclear"],
        { conversationId: context.conversationId }
      );

      if (losInterpretation.intent === "unclear" && clarification_count < 2) {
        logger.info("❓ [Scenario C] Unclear LOS response, requesting clarification");
        
        await conversationService.insertMessage(context.conversationId, {
          sender_type: "agent",
          sender_name: "Suporte Técnico",
          content: `Por favor, olhe com atenção no equipamento e me diga exatamente a cor da luz LOS ou PON:

• VERDE (fixa, não pisca)
• VERDE PISCANDO
• VERMELHA
• APAGADA

Responda apenas com a cor que você está vendo.`,
          ai_suggestion: false
        });

        await conversationService.updateFlowState(context.conversationId, {
          clarification_count: clarification_count + 1
        });

        return {
          success: true,
          resolved: false,
          escalated: false,
          actions_taken: ["clarification_los_requested"],
          final_status: "awaiting_clear_los_status",
          metadata: { clarification_count: clarification_count + 1 }
        };
      }

      // Provide appropriate reconnection instructions
      let instructions = "";
      
      if (losInterpretation.intent === "los_piscando") {
        instructions = `A luz verde piscando junto com o sinal fraco indica problema no conector óptico.

**Vamos reconectar o cabo de fibra:**

1. **Localize o cabo fino e amarelo** (fibra óptica) na parte de trás do equipamento
2. **Retire o cabo com cuidado** - puxe pela ponta plástica, NÃO pelo cabo
3. **Aguarde 5 segundos**
4. **Limpe a ponta do cabo** com um pano limpo e seco
5. **Reconecte o cabo** - encaixe até ouvir um "click"
6. **Aguarde 30-60 segundos** para o equipamento sincronizar

Me avise quando terminar!`;
      } else if (losInterpretation.intent === "los_vermelho") {
        instructions = `Luz vermelha com sinal fraco indica problema sério na conexão óptica.

**Procedimento de reconexão:**

1. **Encontre o cabo de fibra** (fino e amarelo) atrás do equipamento
2. **Remova cuidadosamente** o cabo
3. **Verifique se a ponta não está suja ou danificada**
4. **Limpe com cuidado** usando pano limpo
5. **Reconecte firmemente** até fazer "click"
6. **Aguarde 1 minuto** para sincronização

Quando terminar, me confirme.`;
      } else {
        // Default instructions for weak signal
        instructions = `Com o sinal fraco detectado, vamos verificar a conexão óptica:

**Passos para reconexão:**

1. Localize o **cabo de fibra óptica** (amarelo, fino) no equipamento
2. **Desconecte** o cabo com cuidado
3. **Limpe a ponta** com pano seco
4. **Reconecte firmemente** no equipamento
5. **Aguarde 30-60 segundos**

Me avise quando concluir!`;
      }

      await conversationService.insertMessage(context.conversationId, {
        sender_type: "agent",
        sender_name: "Suporte Técnico",
        content: instructions,
        ai_suggestion: false
      });

      actions.push("instructed_reconnection");

      await conversationService.updateFlowState(context.conversationId, {
        current_stage: FLOW_STAGES.WAIT_RECONNECTION,
        los_status: losInterpretation.intent,
        reconnection_started_at: new Date().toISOString(),
        clarification_count: 0,
        stage_started_at: new Date().toISOString()
      });

      return {
        success: true,
        resolved: false,
        escalated: false,
        actions_taken: actions,
        final_status: "awaiting_reconnection",
        metadata: { 
          stage: FLOW_STAGES.WAIT_RECONNECTION,
          los_status: losInterpretation.intent 
        }
      };
    }

    // Stage 4: Wait for Reconnection Confirmation
    if (currentStage === FLOW_STAGES.WAIT_RECONNECTION) {
      logger.info("⏳ [Scenario C] Stage 4: Waiting for reconnection confirmation");

      const confirmationIntent = await hybridInterpret(
        sanitizedMessage,
        ["confirma_acao", "ainda_fazendo", "unclear"],
        { conversationId: context.conversationId }
      );

      if (confirmationIntent.intent === "ainda_fazendo") {
        await conversationService.insertMessage(context.conversationId, {
          sender_type: "agent",
          sender_name: "Suporte Técnico",
          content: "Ok, sem pressa! Me avise quando terminar a reconexão do cabo de fibra.",
          ai_suggestion: false
        });

        return {
          success: true,
          resolved: false,
          escalated: false,
          actions_taken: ["acknowledged_still_working"],
          final_status: "still_reconnecting",
          metadata: { stage: FLOW_STAGES.WAIT_RECONNECTION }
        };
      }

      if (confirmationIntent.intent === "unclear" && clarification_count < 2) {
        await conversationService.insertMessage(context.conversationId, {
          sender_type: "agent",
          sender_name: "Suporte Técnico",
          content: "Você já terminou de reconectar o cabo de fibra? Responda SIM ou NÃO.",
          ai_suggestion: false
        });

        await conversationService.updateFlowState(context.conversationId, {
          clarification_count: clarification_count + 1
        });

        return {
          success: true,
          resolved: false,
          escalated: false,
          actions_taken: ["clarification_reconnection_requested"],
          final_status: "awaiting_reconnection_confirmation",
          metadata: { clarification_count: clarification_count + 1 }
        };
      }

      // User confirmed reconnection - move to retest
      await conversationService.insertMessage(context.conversationId, {
        sender_type: "agent",
        sender_name: "Suporte Técnico",
        content: "Ótimo! Vou testar o sinal e a conexão agora. Aguarde alguns segundos...",
        ai_suggestion: false
      });

      actions.push("reconnection_confirmed");

      await conversationService.updateFlowState(context.conversationId, {
        current_stage: FLOW_STAGES.RETEST_SIGNAL,
        reconnection_confirmed_at: new Date().toISOString(),
        clarification_count: 0,
        stage_started_at: new Date().toISOString()
      });

      // Immediately proceed to retest
      return handleRetestSignal(
        context,
        supabase,
        logger,
        conversationService,
        ixcService,
        flowState,
        actions,
        reconnection_attempts
      );
    }

    // Stage 5: Retest Signal
    if (currentStage === FLOW_STAGES.RETEST_SIGNAL) {
      return handleRetestSignal(
        context,
        supabase,
        logger,
        conversationService,
        ixcService,
        flowState,
        actions,
        reconnection_attempts
      );
    }

    // Stage 6: Test Connectivity
    if (currentStage === FLOW_STAGES.TEST_CONNECTIVITY) {
      return handleTestConnectivity(
        context,
        supabase,
        logger,
        conversationService,
        ixcService,
        flowState,
        actions,
        reconnection_attempts
      );
    }

    // Stage 7: Verify Navigation
    if (currentStage === FLOW_STAGES.VERIFY_NAVIGATION) {
      return handleVerifyNavigation(
        context,
        supabase,
        logger,
        conversationService,
        flowState,
        actions,
        reconnection_attempts
      );
    }

    // Stage 8: Escalate
    if (currentStage === FLOW_STAGES.ESCALATE) {
      return handleEscalation(
        context,
        supabase,
        logger,
        conversationService,
        ixcService,
        flowState,
        actions,
        reconnection_attempts
      );
    }

    // Unknown stage
    logger.error("❌ [Scenario C] Unknown stage", { currentStage });
    throw new Error(`Unknown stage: ${currentStage}`);

  } catch (error) {
    logger.error("❌ [Scenario C] Error in flow", {
      error: error.message,
      conversationId: context.conversationId
    });

    await conversationService.insertMessage(context.conversationId, {
      sender_type: "agent",
      sender_name: "Suporte Técnico",
      content: "Desculpe, houve um erro no atendimento. Vou transferir para um técnico humano.",
      ai_suggestion: false
    });

    await conversationService.transferConversation(
      context.conversationId,
      "technical",
      "Error in Scenario C flow",
      { error: error.message, scenario: "C" }
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

async function handleRetestSignal(
  context: ScenarioCContext,
  supabase: SupabaseClient,
  logger: any,
  conversationService: ConversationService,
  ixcService: IXCService,
  flowState: any,
  actions: string[],
  reconnection_attempts: number
): Promise<ScenarioCResult> {
  logger.info("🔄 [Scenario C] Stage 5: Retesting signal after reconnection");

  try {
    // Execute signal check tool
    const toolResults = await executeConfiguredTools(
      supabase,
      logger,
      context.conversationId,
      ["get_onu_signal_status"],
      { client_id: context.clientData?.id }
    );

    const signalResult = toolResults.find((r: any) => r.tool === "get_onu_signal_status");
    const newSignal = signalResult?.result?.signal || {};

    logger.info("📊 [Scenario C] New signal readings", {
      old_rx: context.signalData.rx,
      new_rx: newSignal.rx,
      old_tx: context.signalData.tx,
      new_tx: newSignal.tx
    });

    actions.push("signal_retested");

    // Check if signal improved
    const signalImproved = isGoodSignal(newSignal);
    const stillWeak = isWeakFromTxRx(newSignal.tx, newSignal.rx);

    if (signalImproved) {
      logger.info("✅ [Scenario C] Signal improved to good level");
      
      await conversationService.insertMessage(context.conversationId, {
        sender_type: "agent",
        sender_name: "Suporte Técnico",
        content: `Excelente! O sinal melhorou bastante! 📶

**Sinal anterior:** RX ${context.signalData.rx} dBm
**Sinal atual:** RX ${newSignal.rx} dBm

Agora vou testar se a internet está funcionando...`,
        ai_suggestion: false
      });

      await conversationService.updateFlowState(context.conversationId, {
        current_stage: FLOW_STAGES.TEST_CONNECTIVITY,
        signal_improved: true,
        new_rx: newSignal.rx,
        stage_started_at: new Date().toISOString()
      });

      // Proceed to connectivity test
      return handleTestConnectivity(
        context,
        supabase,
        logger,
        conversationService,
        ixcService,
        { ...flowState, signal_improved: true, new_rx: newSignal.rx },
        actions,
        reconnection_attempts
      );
    }

    if (stillWeak && reconnection_attempts < 1) {
      logger.info("⚠️ [Scenario C] Signal still weak, attempting second reconnection");
      
      await conversationService.insertMessage(context.conversationId, {
        sender_type: "agent",
        sender_name: "Suporte Técnico",
        content: `O sinal ainda está fraco (RX: ${newSignal.rx} dBm).

Vamos tentar novamente com mais atenção:

1. **Remova o cabo de fibra** (amarelo)
2. **Verifique se a ponta está limpa** - sem poeira ou sujeira
3. **Sopre levemente** na ponta do cabo e na entrada do equipamento
4. **Reconecte com firmeza** até ouvir o "click"
5. **Aguarde 1 minuto completo**

Me avise quando terminar.`,
        ai_suggestion: false
      });

      await conversationService.updateFlowState(context.conversationId, {
        current_stage: FLOW_STAGES.WAIT_RECONNECTION,
        reconnection_attempts: reconnection_attempts + 1,
        stage_started_at: new Date().toISOString()
      });

      return {
        success: true,
        resolved: false,
        escalated: false,
        actions_taken: actions,
        final_status: "retry_reconnection",
        metadata: { 
          reconnection_attempts: reconnection_attempts + 1,
          new_rx: newSignal.rx 
        }
      };
    }

    // Signal didn't improve after max attempts - escalate
    logger.info("🚨 [Scenario C] Signal didn't improve, escalating");
    
    await conversationService.updateFlowState(context.conversationId, {
      current_stage: FLOW_STAGES.ESCALATE,
      escalation_reason: "signal_still_weak",
      reconnection_attempts: reconnection_attempts + 1,
      stage_started_at: new Date().toISOString()
    });

    return handleEscalation(
      context,
      supabase,
      logger,
      conversationService,
      ixcService,
      { ...flowState, escalation_reason: "signal_still_weak" },
      actions,
      reconnection_attempts + 1
    );

  } catch (error) {
    logger.error("❌ [Scenario C] Error retesting signal", { error: error.message });
    throw error;
  }
}

async function handleTestConnectivity(
  context: ScenarioCContext,
  supabase: SupabaseClient,
  logger: any,
  conversationService: ConversationService,
  ixcService: IXCService,
  flowState: any,
  actions: string[],
  reconnection_attempts: number
): Promise<ScenarioCResult> {
  logger.info("🌐 [Scenario C] Stage 6: Testing connectivity");

  try {
    const connectivityResult = await ixcService.testConnectivity(context.clientData?.id);
    
    logger.info("📡 [Scenario C] Connectivity result", {
      ping: connectivityResult.ping,
      online: connectivityResult.online
    });

    actions.push("connectivity_tested");

    if (connectivityResult.online && connectivityResult.ping) {
      await conversationService.insertMessage(context.conversationId, {
        sender_type: "agent",
        sender_name: "Suporte Técnico",
        content: `Ótimo! O equipamento está online! ✅

Agora, por favor, **tente acessar um site** (como google.com ou youtube.com) e me diga se está carregando normalmente.`,
        ai_suggestion: false
      });

      await conversationService.updateFlowState(context.conversationId, {
        current_stage: FLOW_STAGES.VERIFY_NAVIGATION,
        equipment_online: true,
        stage_started_at: new Date().toISOString()
      });

      return {
        success: true,
        resolved: false,
        escalated: false,
        actions_taken: actions,
        final_status: "awaiting_navigation_confirmation",
        metadata: { 
          stage: FLOW_STAGES.VERIFY_NAVIGATION,
          equipment_online: true 
        }
      };
    }

    // Still offline after reconnection
    logger.info("⚠️ [Scenario C] Equipment still offline, escalating");
    
    await conversationService.updateFlowState(context.conversationId, {
      current_stage: FLOW_STAGES.ESCALATE,
      escalation_reason: "offline_after_reconnection",
      stage_started_at: new Date().toISOString()
    });

    return handleEscalation(
      context,
      supabase,
      logger,
      conversationService,
      ixcService,
      { ...flowState, escalation_reason: "offline_after_reconnection" },
      actions,
      reconnection_attempts
    );

  } catch (error) {
    logger.error("❌ [Scenario C] Error testing connectivity", { error: error.message });
    throw error;
  }
}

async function handleVerifyNavigation(
  context: ScenarioCContext,
  supabase: SupabaseClient,
  logger: any,
  conversationService: ConversationService,
  flowState: any,
  actions: string[],
  reconnection_attempts: number
): Promise<ScenarioCResult> {
  logger.info("🌍 [Scenario C] Stage 7: Verifying navigation");

  const messageHistory = await conversationService.getMessageHistory(context.conversationId, 3);
  const lastUserMessage = messageHistory
    .filter((m: any) => m.sender_type === "customer")
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

  const userMessage = lastUserMessage?.content || "";
  const sanitizedMessage = sanitizePII(userMessage);

  const navigationIntent = await hybridInterpret(
    sanitizedMessage,
    ["confirma_navegando", "nao_navega", "unclear"],
    { conversationId: context.conversationId }
  );

  if (navigationIntent.intent === "confirma_navegando") {
    logger.info("✅ [Scenario C] Navigation confirmed - Issue resolved!");
    
    const resolutionTime = Math.round((Date.now() - new Date(flowState.stage_started_at || Date.now()).getTime()) / 1000);
    
    await conversationService.insertMessage(context.conversationId, {
      sender_type: "agent",
      sender_name: "Suporte Técnico",
      content: `Perfeito! A reconexão do cabo de fibra resolveu o problema! 🎉

O sinal está bom e a internet funcionando.

**Dica importante:** Se o problema voltar, verifique se o cabo de fibra está bem conectado. Evite mexer no cabo sem necessidade.

Posso ajudar em algo mais?`,
      ai_suggestion: false
    });

    actions.push("navigation_confirmed", "issue_resolved");

    // Log KPI
    logger.info("📊 [Scenario C] Resolution KPI", {
      scenario: "C",
      resolution_time_seconds: resolutionTime,
      reconnection_attempts: reconnection_attempts + 1,
      signal_improved: flowState.signal_improved,
      success: true
    });

    await conversationService.updateFlowState(context.conversationId, {
      resolved: true,
      resolved_at: new Date().toISOString(),
      resolution_time_seconds: resolutionTime
    });

    return {
      success: true,
      resolved: true,
      escalated: false,
      actions_taken: actions,
      final_status: "resolved",
      metadata: {
        resolution_time: resolutionTime,
        reconnection_attempts: reconnection_attempts + 1
      }
    };
  }

  if (navigationIntent.intent === "nao_navega") {
    logger.info("⚠️ [Scenario C] Navigation not working, escalating");
    
    await conversationService.updateFlowState(context.conversationId, {
      current_stage: FLOW_STAGES.ESCALATE,
      escalation_reason: "online_but_no_navigation",
      stage_started_at: new Date().toISOString()
    });

    return handleEscalation(
      context,
      supabase,
      logger,
      conversationService,
      {} as IXCService,
      { ...flowState, escalation_reason: "online_but_no_navigation" },
      actions,
      reconnection_attempts
    );
  }

  // Unclear response
  await conversationService.insertMessage(context.conversationId, {
    sender_type: "agent",
    sender_name: "Suporte Técnico",
    content: "Por favor, tente acessar google.com ou youtube.com e me diga: está carregando? Responda SIM ou NÃO.",
    ai_suggestion: false
  });

  return {
    success: true,
    resolved: false,
    escalated: false,
    actions_taken: actions,
    final_status: "awaiting_clear_navigation_response",
    metadata: { stage: FLOW_STAGES.VERIFY_NAVIGATION }
  };
}

async function handleEscalation(
  context: ScenarioCContext,
  supabase: SupabaseClient,
  logger: any,
  conversationService: ConversationService,
  ixcService: IXCService,
  flowState: any,
  actions: string[],
  reconnection_attempts: number
): Promise<ScenarioCResult> {
  logger.info("🚨 [Scenario C] Stage 8: Escalating to human support");

  const escalationReason = flowState.escalation_reason || "unresolved_weak_signal";
  let escalationMessage = "";
  let ticketPriority = "high";

  if (escalationReason === "signal_still_weak") {
    escalationMessage = `Infelizmente o sinal óptico continua fraco mesmo após ${reconnection_attempts + 1} tentativa(s) de reconexão.

Isso indica um problema mais complexo que requer visita técnica. Vou criar um chamado urgente para nossa equipe.`;
    ticketPriority = "urgent";
  } else if (escalationReason === "offline_after_reconnection") {
    escalationMessage = `O equipamento continua offline mesmo com o sinal melhorado.

Vou transferir para um técnico especializado avaliar o problema.`;
  } else if (escalationReason === "online_but_no_navigation") {
    escalationMessage = `O equipamento está online mas a internet não está funcionando.

Vou transferir para suporte avançado verificar configurações.`;
  } else {
    escalationMessage = `Não consegui resolver o problema do sinal fraco remotamente.

Vou transferir para um técnico humano dar continuidade.`;
  }

  await conversationService.insertMessage(context.conversationId, {
    sender_type: "agent",
    sender_name: "Suporte Técnico",
    content: escalationMessage,
    ai_suggestion: false
  });

  // Create IXC ticket
  try {
    const ticketResult = await ixcService.createTicket({
      client_id: context.clientData?.id,
      title: `[Cenário C] Sinal fraco - RX ${context.signalData.rx} dBm`,
      description: `Problema: Sinal óptico fraco detectado
      
RX inicial: ${context.signalData.rx} dBm
TX inicial: ${context.signalData.tx} dBm
Tentativas de reconexão: ${reconnection_attempts + 1}
Motivo da escalação: ${escalationReason}

Ações realizadas:
${actions.join("\n")}

Cliente necessita visita técnica para verificação da conexão óptica.`,
      priority: ticketPriority,
      category: "technical_support"
    });

    if (ticketResult.success) {
      logger.info("✅ [Scenario C] Ticket created", { 
        ticket_id: ticketResult.ticket_id 
      });
      actions.push("ticket_created");
    }
  } catch (error) {
    logger.error("❌ [Scenario C] Failed to create ticket", { error: error.message });
  }

  // Transfer conversation
  await conversationService.transferConversation(
    context.conversationId,
    "technical",
    escalationReason,
    {
      scenario: "C",
      reconnection_attempts: reconnection_attempts + 1,
      escalation_reason: escalationReason,
      signal_data: context.signalData
    }
  );

  actions.push("escalated");

  return {
    success: true,
    resolved: false,
    escalated: true,
    actions_taken: actions,
    final_status: "escalated",
    metadata: {
      escalation_reason: escalationReason,
      reconnection_attempts: reconnection_attempts + 1,
      ticket_priority: ticketPriority
    }
  };
}
