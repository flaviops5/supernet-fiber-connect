/**
 * Scenario E Handler - WAN/Wi-Fi Issues (Good optical signal but network problems)
 * 
 * FLOW:
 * 1. Detect good optical signal but connectivity issues
 * 2. Ask connection type (Wi-Fi or cable)
 * 3. Diagnose WAN cable issues (ONU to Router)
 * 4. Check router LEDs and WAN connection
 * 5. Instruct WAN cable reconnection
 * 6. Test connectivity after fixes
 * 7. Diagnose Wi-Fi issues if needed
 * 8. Escalate if unresolved
 * 
 * COVERAGE: ~5% of technical support cases
 * AVG RESOLUTION: 8-12 minutes
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ConversationService } from "../services/conversation-service.ts";
import { IXCService } from "../services/ixc-service.ts";
import { hybridInterpret } from "../../_shared/ai-response-interpreter.ts";
import { sanitizePII } from "../../_shared/message-helpers.ts";

interface ScenarioEContext {
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

interface ScenarioEResult {
  success: boolean;
  resolved: boolean;
  escalated: boolean;
  actions_taken: string[];
  final_status: string;
  metadata: Record<string, any>;
}

const FLOW_STAGES = {
  ASK_CONNECTION_TYPE: "e_ask_connection_type",
  CHECK_WAN_CABLE: "e_check_wan_cable",
  CHECK_ROUTER_LEDS: "e_check_router_leds",
  INSTRUCT_WAN_RECONNECTION: "e_instruct_wan_reconnection",
  WAIT_WAN_FIX: "e_wait_wan_fix",
  RETEST_CONNECTIVITY: "e_retest_connectivity",
  DIAGNOSE_WIFI: "e_diagnose_wifi",
  INSTRUCT_WIFI_FIX: "e_instruct_wifi_fix",
  VERIFY_NAVIGATION: "e_verify_navigation",
  ESCALATE: "e_escalate"
};

export async function handleScenarioE(
  context: ScenarioEContext,
  supabase: SupabaseClient,
  logger: any
): Promise<ScenarioEResult> {
  const startTime = Date.now();
  const actions: string[] = [];
  
  logger.info("🔵 [Scenario E] Starting WAN/Wi-Fi diagnosis flow", {
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
    const currentStage = flowState.current_stage || FLOW_STAGES.ASK_CONNECTION_TYPE;
    const wan_reconnection_attempts = flowState.wan_reconnection_attempts || 0;
    const clarification_count = flowState.clarification_count || 0;

    logger.info("📍 [Scenario E] Current stage", { 
      currentStage,
      wan_reconnection_attempts,
      clarification_count
    });

    // Get message history for intent detection
    const messageHistory = await conversationService.getMessageHistory(context.conversationId, 5);
    const lastUserMessage = messageHistory
      .filter((m: any) => m.sender_type === "customer")
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

    const userMessage = lastUserMessage?.content || "";
    const sanitizedMessage = sanitizePII(userMessage);

    // Stage 1: Ask Connection Type
    if (currentStage === FLOW_STAGES.ASK_CONNECTION_TYPE) {
      logger.info("❓ [Scenario E] Stage 1: Asking connection type");
      
      await conversationService.insertMessage(context.conversationId, {
        sender_type: "agent",
        sender_name: "Suporte Técnico",
        content: `Vi que o sinal óptico está bom (RX: ${context.signalData.rx} dBm), mas você está sem internet.

Para diagnosticar melhor, preciso saber:

**Como você está tentando se conectar?**
1. Por Wi-Fi (sem fio)
2. Por cabo (conectado direto no equipamento)

Por favor, me diga qual das opções.`,
        ai_suggestion: false
      });

      actions.push("asked_connection_type");

      await conversationService.updateFlowState(context.conversationId, {
        current_stage: FLOW_STAGES.CHECK_WAN_CABLE,
        scenario: "E",
        wan_reconnection_attempts,
        clarification_count,
        stage_started_at: new Date().toISOString()
      });

      return {
        success: true,
        resolved: false,
        escalated: false,
        actions_taken: actions,
        final_status: "awaiting_connection_type",
        metadata: { stage: FLOW_STAGES.CHECK_WAN_CABLE }
      };
    }

    // Stage 2: Check WAN Cable
    if (currentStage === FLOW_STAGES.CHECK_WAN_CABLE) {
      logger.info("🔌 [Scenario E] Stage 2: Checking WAN cable connection");

      const connectionIntent = await hybridInterpret(
        sanitizedMessage,
        ["conexao_wifi", "conexao_cabo", "unclear"],
        { conversationId: context.conversationId }
      );

      if (connectionIntent.intent === "unclear" && clarification_count < 2) {
        await conversationService.insertMessage(context.conversationId, {
          sender_type: "agent",
          sender_name: "Suporte Técnico",
          content: `Por favor, responda com uma das opções:

1 - Wi-Fi (sem fio)
2 - Cabo (conectado direto)

Qual está usando?`,
          ai_suggestion: false
        });

        await conversationService.updateFlowState(context.conversationId, {
          clarification_count: clarification_count + 1
        });

        return {
          success: true,
          resolved: false,
          escalated: false,
          actions_taken: ["clarification_requested"],
          final_status: "awaiting_clear_connection_type",
          metadata: { clarification_count: clarification_count + 1 }
        };
      }

      const isWifi = connectionIntent.intent === "conexao_wifi";
      
      // For both cases, check WAN cable first
      await conversationService.insertMessage(context.conversationId, {
        sender_type: "agent",
        sender_name: "Suporte Técnico",
        content: `${isWifi ? 'Entendido, você está no Wi-Fi.' : 'Ok, você está por cabo.'} Vamos verificar a conexão principal.

**O equipamento possui 2 tipos de cabo:**
1. **Cabo de FIBRA ÓPTICA** (fino, amarelo) - conecta na porta "PON" ou "LOS"
2. **Cabo de REDE** (mais grosso, colorido) - conecta na porta "WAN" ou "Internet"

Por favor, verifique:
• O cabo de REDE (grosso) está conectado na porta "WAN" do equipamento?
• Este cabo vai até seu roteador/computador?

Me diga: SIM se está conectado, ou NÃO se está solto/desconectado.`,
        ai_suggestion: false
      });

      actions.push("asked_about_wan_cable");

      await conversationService.updateFlowState(context.conversationId, {
        current_stage: FLOW_STAGES.CHECK_ROUTER_LEDS,
        connection_type: isWifi ? "wifi" : "cable",
        clarification_count: 0,
        stage_started_at: new Date().toISOString()
      });

      return {
        success: true,
        resolved: false,
        escalated: false,
        actions_taken: actions,
        final_status: "awaiting_wan_check",
        metadata: { stage: FLOW_STAGES.CHECK_ROUTER_LEDS }
      };
    }

    // Stage 3: Check Router LEDs
    if (currentStage === FLOW_STAGES.CHECK_ROUTER_LEDS) {
      logger.info("💡 [Scenario E] Stage 3: Checking router LED status");

      const wanCableIntent = await hybridInterpret(
        sanitizedMessage,
        ["cabo_conectado", "cabo_solto", "unclear"],
        { conversationId: context.conversationId }
      );

      if (wanCableIntent.intent === "cabo_solto") {
        // WAN cable is loose - instruct reconnection
        await conversationService.updateFlowState(context.conversationId, {
          current_stage: FLOW_STAGES.INSTRUCT_WAN_RECONNECTION,
          wan_cable_issue: "disconnected",
          stage_started_at: new Date().toISOString()
        });

        return handleInstructWanReconnection(
          context,
          supabase,
          logger,
          conversationService,
          ixcService,
          { ...flowState, wan_cable_issue: "disconnected" },
          actions,
          wan_reconnection_attempts
        );
      }

      if (wanCableIntent.intent === "unclear" && clarification_count < 2) {
        await conversationService.insertMessage(context.conversationId, {
          sender_type: "agent",
          sender_name: "Suporte Técnico",
          content: `O cabo de rede (mais grosso, colorido) está conectado na porta WAN? Responda apenas SIM ou NÃO.`,
          ai_suggestion: false
        });

        await conversationService.updateFlowState(context.conversationId, {
          clarification_count: clarification_count + 1
        });

        return {
          success: true,
          resolved: false,
          escalated: false,
          actions_taken: ["clarification_wan_cable"],
          final_status: "awaiting_clear_wan_status",
          metadata: { clarification_count: clarification_count + 1 }
        };
      }

      // Cable is connected - check LEDs
      await conversationService.insertMessage(context.conversationId, {
        sender_type: "agent",
        sender_name: "Suporte Técnico",
        content: `Ótimo, o cabo WAN está conectado. Agora vamos verificar os LEDs do equipamento.

**Olhe para as luzes do equipamento principal (ONU):**

Qual luz/LED está acesa ou piscando?
1. LOS/PON - Verde
2. POWER - Verde
3. INTERNET/WAN - Verde ou piscando
4. Alguma luz vermelha
5. Todas apagadas

Me diga quais luzes você vê acesas.`,
        ai_suggestion: false
      });

      actions.push("asked_about_leds");

      await conversationService.updateFlowState(context.conversationId, {
        current_stage: FLOW_STAGES.INSTRUCT_WAN_RECONNECTION,
        wan_cable_connected: true,
        clarification_count: 0,
        stage_started_at: new Date().toISOString()
      });

      return {
        success: true,
        resolved: false,
        escalated: false,
        actions_taken: actions,
        final_status: "awaiting_led_info",
        metadata: { stage: FLOW_STAGES.INSTRUCT_WAN_RECONNECTION }
      };
    }

    // Stage 4: Instruct WAN Reconnection
    if (currentStage === FLOW_STAGES.INSTRUCT_WAN_RECONNECTION) {
      return handleInstructWanReconnection(
        context,
        supabase,
        logger,
        conversationService,
        ixcService,
        flowState,
        actions,
        wan_reconnection_attempts
      );
    }

    // Stage 5: Wait for WAN Fix
    if (currentStage === FLOW_STAGES.WAIT_WAN_FIX) {
      return handleWaitWanFix(
        context,
        supabase,
        logger,
        conversationService,
        ixcService,
        flowState,
        actions,
        wan_reconnection_attempts
      );
    }

    // Stage 6: Retest Connectivity
    if (currentStage === FLOW_STAGES.RETEST_CONNECTIVITY) {
      return handleRetestConnectivity(
        context,
        supabase,
        logger,
        conversationService,
        ixcService,
        flowState,
        actions,
        wan_reconnection_attempts
      );
    }

    // Stage 7: Diagnose Wi-Fi
    if (currentStage === FLOW_STAGES.DIAGNOSE_WIFI) {
      return handleDiagnoseWifi(
        context,
        supabase,
        logger,
        conversationService,
        flowState,
        actions,
        wan_reconnection_attempts
      );
    }

    // Stage 8: Instruct Wi-Fi Fix
    if (currentStage === FLOW_STAGES.INSTRUCT_WIFI_FIX) {
      return handleInstructWifiFix(
        context,
        supabase,
        logger,
        conversationService,
        ixcService,
        flowState,
        actions,
        wan_reconnection_attempts
      );
    }

    // Stage 9: Verify Navigation
    if (currentStage === FLOW_STAGES.VERIFY_NAVIGATION) {
      return handleVerifyNavigation(
        context,
        supabase,
        logger,
        conversationService,
        flowState,
        actions,
        wan_reconnection_attempts
      );
    }

    // Stage 10: Escalate
    if (currentStage === FLOW_STAGES.ESCALATE) {
      return handleEscalation(
        context,
        supabase,
        logger,
        conversationService,
        ixcService,
        flowState,
        actions,
        wan_reconnection_attempts
      );
    }

    // Unknown stage
    logger.error("❌ [Scenario E] Unknown stage", { currentStage });
    throw new Error(`Unknown stage: ${currentStage}`);

  } catch (error) {
    logger.error("❌ [Scenario E] Error in flow", {
      error: error.message,
      conversationId: context.conversationId
    });

    await conversationService.insertMessage(context.conversationId, {
      sender_type: "agent",
      sender_name: "Suporte Técnico",
      content: "Desculpe, houve um erro no diagnóstico. Vou transferir para um técnico.",
      ai_suggestion: false
    });

    await conversationService.transferConversation(
      context.conversationId,
      "technical",
      "Error in Scenario E flow",
      { error: error.message, scenario: "E" }
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

async function handleInstructWanReconnection(
  context: ScenarioEContext,
  supabase: SupabaseClient,
  logger: any,
  conversationService: ConversationService,
  ixcService: IXCService,
  flowState: any,
  actions: string[],
  wan_reconnection_attempts: number
): Promise<ScenarioEResult> {
  logger.info("🔧 [Scenario E] Stage 4: Instructing WAN cable reconnection");

  await conversationService.insertMessage(context.conversationId, {
    sender_type: "agent",
    sender_name: "Suporte Técnico",
    content: `Vamos reconectar o cabo WAN para garantir uma conexão firme:

**Passo a passo:**
1. **Localize o cabo de REDE** (mais grosso, geralmente azul, amarelo ou cinza)
2. **Desconecte o cabo** da porta "WAN" ou "Internet" do equipamento principal
3. **Aguarde 10 segundos**
4. **Verifique se a ponta está limpa** - sem poeira ou oxidação
5. **Reconecte firmemente** na mesma porta WAN
6. **Aguarde 30 segundos** para sincronização

Se houver um ROTEADOR adicional conectado:
7. **Desconecte e reconecte** o cabo na porta "WAN" do roteador também

Me avise quando terminar!`,
    ai_suggestion: false
  });

  actions.push("instructed_wan_reconnection");

  await conversationService.updateFlowState(context.conversationId, {
    current_stage: FLOW_STAGES.WAIT_WAN_FIX,
    wan_reconnection_started_at: new Date().toISOString(),
    stage_started_at: new Date().toISOString()
  });

  return {
    success: true,
    resolved: false,
    escalated: false,
    actions_taken: actions,
    final_status: "awaiting_wan_reconnection",
    metadata: { stage: FLOW_STAGES.WAIT_WAN_FIX }
  };
}

async function handleWaitWanFix(
  context: ScenarioEContext,
  supabase: SupabaseClient,
  logger: any,
  conversationService: ConversationService,
  ixcService: IXCService,
  flowState: any,
  actions: string[],
  wan_reconnection_attempts: number
): Promise<ScenarioEResult> {
  logger.info("⏳ [Scenario E] Stage 5: Waiting for WAN fix confirmation");

  const messageHistory = await conversationService.getMessageHistory(context.conversationId, 3);
  const lastUserMessage = messageHistory
    .filter((m: any) => m.sender_type === "customer")
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

  const userMessage = lastUserMessage?.content || "";
  const sanitizedMessage = sanitizePII(userMessage);

  const confirmationIntent = await hybridInterpret(
    sanitizedMessage,
    ["confirma_acao", "ainda_fazendo", "unclear"],
    { conversationId: context.conversationId }
  );

  if (confirmationIntent.intent === "ainda_fazendo") {
    await conversationService.insertMessage(context.conversationId, {
      sender_type: "agent",
      sender_name: "Suporte Técnico",
      content: "Ok, sem pressa. Me avise quando terminar a reconexão do cabo WAN.",
      ai_suggestion: false
    });

    return {
      success: true,
      resolved: false,
      escalated: false,
      actions_taken: ["acknowledged_still_working"],
      final_status: "still_fixing_wan",
      metadata: { stage: FLOW_STAGES.WAIT_WAN_FIX }
    };
  }

  // User confirmed - proceed to retest
  await conversationService.insertMessage(context.conversationId, {
    sender_type: "agent",
    sender_name: "Suporte Técnico",
    content: "Ótimo! Vou testar a conexão agora. Aguarde...",
    ai_suggestion: false
  });

  actions.push("wan_fix_confirmed");

  await conversationService.updateFlowState(context.conversationId, {
    current_stage: FLOW_STAGES.RETEST_CONNECTIVITY,
    wan_fix_confirmed_at: new Date().toISOString(),
    stage_started_at: new Date().toISOString()
  });

  return handleRetestConnectivity(
    context,
    supabase,
    logger,
    conversationService,
    ixcService,
    { ...flowState, wan_fix_confirmed_at: new Date().toISOString() },
    actions,
    wan_reconnection_attempts
  );
}

async function handleRetestConnectivity(
  context: ScenarioEContext,
  supabase: SupabaseClient,
  logger: any,
  conversationService: ConversationService,
  ixcService: IXCService,
  flowState: any,
  actions: string[],
  wan_reconnection_attempts: number
): Promise<ScenarioEResult> {
  logger.info("🔄 [Scenario E] Stage 6: Retesting connectivity");

  try {
    const connectivityResult = await ixcService.testConnectivity(context.clientData?.id);
    
    logger.info("📡 [Scenario E] Connectivity result", {
      ping: connectivityResult.ping,
      online: connectivityResult.online
    });

    actions.push("connectivity_retested");

    if (connectivityResult.online && connectivityResult.ping) {
      await conversationService.insertMessage(context.conversationId, {
        sender_type: "agent",
        sender_name: "Suporte Técnico",
        content: `Excelente! O equipamento está online! ✅

Agora, por favor, tente acessar um site (google.com ou youtube.com) e me diga se está funcionando.`,
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
        final_status: "awaiting_navigation_test",
        metadata: { equipment_online: true }
      };
    }

    // Still offline
    if (wan_reconnection_attempts < 1) {
      await conversationService.insertMessage(context.conversationId, {
        sender_type: "agent",
        sender_name: "Suporte Técnico",
        content: `O equipamento ainda está offline. Vamos tentar trocar a porta WAN:

1. Desconecte o cabo WAN da porta atual
2. Conecte em OUTRA porta disponível no equipamento
3. Aguarde 30 segundos

Alguns equipamentos têm múltiplas portas LAN/WAN. Teste outra porta.

Me avise quando terminar.`,
        ai_suggestion: false
      });

      await conversationService.updateFlowState(context.conversationId, {
        current_stage: FLOW_STAGES.WAIT_WAN_FIX,
        wan_reconnection_attempts: wan_reconnection_attempts + 1,
        stage_started_at: new Date().toISOString()
      });

      return {
        success: true,
        resolved: false,
        escalated: false,
        actions_taken: actions,
        final_status: "retry_different_port",
        metadata: { wan_reconnection_attempts: wan_reconnection_attempts + 1 }
      };
    }

    // Max attempts reached - check if Wi-Fi or escalate
    if (flowState.connection_type === "wifi") {
      await conversationService.updateFlowState(context.conversationId, {
        current_stage: FLOW_STAGES.DIAGNOSE_WIFI,
        stage_started_at: new Date().toISOString()
      });

      return handleDiagnoseWifi(
        context,
        supabase,
        logger,
        conversationService,
        flowState,
        actions,
        wan_reconnection_attempts + 1
      );
    }

    // Cable connection - escalate
    await conversationService.updateFlowState(context.conversationId, {
      current_stage: FLOW_STAGES.ESCALATE,
      escalation_reason: "wan_issues_unresolved",
      stage_started_at: new Date().toISOString()
    });

    return handleEscalation(
      context,
      supabase,
      logger,
      conversationService,
      ixcService,
      { ...flowState, escalation_reason: "wan_issues_unresolved" },
      actions,
      wan_reconnection_attempts + 1
    );

  } catch (error) {
    logger.error("❌ [Scenario E] Error retesting connectivity", { error: error.message });
    throw error;
  }
}

async function handleDiagnoseWifi(
  context: ScenarioEContext,
  supabase: SupabaseClient,
  logger: any,
  conversationService: ConversationService,
  flowState: any,
  actions: string[],
  wan_reconnection_attempts: number
): Promise<ScenarioEResult> {
  logger.info("📶 [Scenario E] Stage 7: Diagnosing Wi-Fi issues");

  await conversationService.insertMessage(context.conversationId, {
    sender_type: "agent",
    sender_name: "Suporte Técnico",
    content: `Você está conectado por Wi-Fi. Vamos verificar a qualidade do sinal:

**Por favor, me diga:**
1. Quantas barrinhas de sinal Wi-Fi aparecem no seu dispositivo? (1, 2, 3 ou 4 barras)
2. A que distância você está do equipamento? (perto, médio, longe)
3. Quantas paredes existem entre você e o equipamento?`,
    ai_suggestion: false
  });

  actions.push("diagnosed_wifi");

  await conversationService.updateFlowState(context.conversationId, {
    current_stage: FLOW_STAGES.INSTRUCT_WIFI_FIX,
    stage_started_at: new Date().toISOString()
  });

  return {
    success: true,
    resolved: false,
    escalated: false,
    actions_taken: actions,
    final_status: "awaiting_wifi_info",
    metadata: { stage: FLOW_STAGES.INSTRUCT_WIFI_FIX }
  };
}

async function handleInstructWifiFix(
  context: ScenarioEContext,
  supabase: SupabaseClient,
  logger: any,
  conversationService: ConversationService,
  ixcService: IXCService,
  flowState: any,
  actions: string[],
  wan_reconnection_attempts: number
): Promise<ScenarioEResult> {
  logger.info("🔧 [Scenario E] Stage 8: Instructing Wi-Fi fix");

  await conversationService.insertMessage(context.conversationId, {
    sender_type: "agent",
    sender_name: "Suporte Técnico",
    content: `Vamos melhorar sua conexão Wi-Fi:

**Opções de solução:**

**1. Aproxime-se do equipamento**
   • Teste a internet perto do roteador
   • Se funcionar, o problema é distância/sinal fraco

**2. Reinicie o Wi-Fi do seu dispositivo**
   • Desligue e ligue o Wi-Fi do celular/computador
   • Ou "esqueça" a rede e reconecte

**3. Teste por cabo (melhor opção)**
   • Se tiver um cabo de rede disponível
   • Conecte direto no equipamento
   • Isso elimina problemas de Wi-Fi

**4. Verifique interferências**
   • Afaste de micro-ondas, telefones sem fio
   • Mude o equipamento de posição se possível

Qual opção você quer tentar primeiro?`,
    ai_suggestion: false
  });

  actions.push("instructed_wifi_fix");

  await conversationService.updateFlowState(context.conversationId, {
    current_stage: FLOW_STAGES.VERIFY_NAVIGATION,
    wifi_fix_instructed_at: new Date().toISOString(),
    stage_started_at: new Date().toISOString()
  });

  return {
    success: true,
    resolved: false,
    escalated: false,
    actions_taken: actions,
    final_status: "awaiting_wifi_fix_attempt",
    metadata: { stage: FLOW_STAGES.VERIFY_NAVIGATION }
  };
}

async function handleVerifyNavigation(
  context: ScenarioEContext,
  supabase: SupabaseClient,
  logger: any,
  conversationService: ConversationService,
  flowState: any,
  actions: string[],
  wan_reconnection_attempts: number
): Promise<ScenarioEResult> {
  logger.info("🌍 [Scenario E] Stage 9: Verifying navigation");

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
    logger.info("✅ [Scenario E] Navigation confirmed - Issue resolved!");
    
    const resolutionTime = Math.round((Date.now() - new Date(flowState.stage_started_at || Date.now()).getTime()) / 1000);
    
    await conversationService.insertMessage(context.conversationId, {
      sender_type: "agent",
      sender_name: "Suporte Técnico",
      content: `Perfeito! O problema foi resolvido! 🎉

${flowState.connection_type === 'wifi' 
  ? '**Dica para Wi-Fi:** Mantenha-se em áreas com boa cobertura do sinal. Se o problema voltar, considere usar um repetidor ou conectar por cabo em atividades que exigem mais estabilidade.'
  : '**Dica:** Se o problema voltar, verifique se os cabos estão bem conectados. Evite dobrar ou pisar nos cabos de rede.'
}

Posso ajudar em algo mais?`,
      ai_suggestion: false
    });

    actions.push("navigation_confirmed", "issue_resolved");

    logger.info("📊 [Scenario E] Resolution KPI", {
      scenario: "E",
      resolution_time_seconds: resolutionTime,
      connection_type: flowState.connection_type,
      wan_reconnection_attempts: wan_reconnection_attempts,
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
        connection_type: flowState.connection_type,
        wan_attempts: wan_reconnection_attempts
      }
    };
  }

  if (navigationIntent.intent === "nao_navega") {
    logger.info("⚠️ [Scenario E] Navigation still not working, escalating");
    
    await conversationService.updateFlowState(context.conversationId, {
      current_stage: FLOW_STAGES.ESCALATE,
      escalation_reason: "navigation_failed",
      stage_started_at: new Date().toISOString()
    });

    return handleEscalation(
      context,
      supabase,
      logger,
      conversationService,
      {} as IXCService,
      { ...flowState, escalation_reason: "navigation_failed" },
      actions,
      wan_reconnection_attempts
    );
  }

  // Unclear response
  await conversationService.insertMessage(context.conversationId, {
    sender_type: "agent",
    sender_name: "Suporte Técnico",
    content: "Por favor, tente acessar google.com. Está funcionando? Responda SIM ou NÃO.",
    ai_suggestion: false
  });

  return {
    success: true,
    resolved: false,
    escalated: false,
    actions_taken: actions,
    final_status: "awaiting_clear_navigation",
    metadata: { stage: FLOW_STAGES.VERIFY_NAVIGATION }
  };
}

async function handleEscalation(
  context: ScenarioEContext,
  supabase: SupabaseClient,
  logger: any,
  conversationService: ConversationService,
  ixcService: IXCService,
  flowState: any,
  actions: string[],
  wan_reconnection_attempts: number
): Promise<ScenarioEResult> {
  logger.info("🚨 [Scenario E] Stage 10: Escalating to human support");

  const escalationReason = flowState.escalation_reason || "unresolved_network_issue";
  let escalationMessage = "";
  let ticketPriority = "high";

  if (escalationReason === "wan_issues_unresolved") {
    escalationMessage = `Não consegui resolver o problema de conexão WAN remotamente após ${wan_reconnection_attempts} tentativa(s).

Vou criar um chamado para análise técnica especializada.`;
  } else if (escalationReason === "navigation_failed") {
    escalationMessage = `O equipamento parece estar funcionando mas a navegação não está normal.

Vou transferir para suporte avançado verificar configurações de rede.`;
  } else {
    escalationMessage = `Não consegui resolver o problema de rede remotamente.

Vou transferir para um técnico especializado.`;
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
      title: `[Cenário E] Problema de ${flowState.connection_type === 'wifi' ? 'Wi-Fi' : 'WAN'}`,
      description: `Problema: Sinal óptico OK mas problemas de rede
      
RX: ${context.signalData.rx} dBm (OK)
TX: ${context.signalData.tx} dBm (OK)
Tipo de conexão: ${flowState.connection_type === 'wifi' ? 'Wi-Fi' : 'Cabo'}
Tentativas de correção WAN: ${wan_reconnection_attempts}
Motivo da escalação: ${escalationReason}

Ações realizadas:
${actions.join("\n")}

Requer verificação de configuração de rede ou equipamento adicional.`,
      priority: ticketPriority,
      category: "technical_support"
    });

    if (ticketResult.success) {
      logger.info("✅ [Scenario E] Ticket created", { ticket_id: ticketResult.ticket_id });
      actions.push("ticket_created");
    }
  } catch (error) {
    logger.error("❌ [Scenario E] Failed to create ticket", { error: error.message });
  }

  // Transfer conversation
  await conversationService.transferConversation(
    context.conversationId,
    "technical",
    escalationReason,
    {
      scenario: "E",
      connection_type: flowState.connection_type,
      wan_reconnection_attempts: wan_reconnection_attempts,
      escalation_reason: escalationReason
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
      connection_type: flowState.connection_type,
      wan_attempts: wan_reconnection_attempts
    }
  };
}
