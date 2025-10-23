import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger } from "../_shared/structured-logger.ts";
import { massOutageContext } from "../_shared/mass-outage-helper.ts";
import { handleEdgeFunctionError, corsHeaders, StandardError } from "../_shared/error-handler.ts";
import { hybridInterpret, normalizeText, detectFrustration } from "../_shared/ai-response-interpreter.ts";

// Cache de simulações aprovadas (5 minutos - reduzido para refletir mudanças mais rápido)
const simulationCache = new Map<string, { data: any, timestamp: number }>();

/**
 * Buscar exemplos de simulações aprovadas para incluir no contexto
 * Retorna array de mensagens aprovadas para usar no fluxo
 */
async function getApprovedSimulations(supabase: any, subject: string): Promise<any[]> {
  const cacheKey = `approved_simulations_${subject}`;
  const cached = simulationCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) { // 5min cache (menor que antes)
    return cached.data;
  }
  
  const { data: approvals, error } = await supabase
    .from('agent_flow_scenario_approvals')
    .select('scenario_key, variation_path, approved_messages, updated_at')
    .eq('agent_type', 'support-tech-agent')
    .eq('subject_key', subject)
    .eq('status', 'approved')
    .not('approved_messages', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(1); // Pegar apenas a mais recente aprovada
  
  if (error || !approvals || approvals.length === 0) {
    return [];
  }
  
  const messages = approvals[0].approved_messages || [];
  
  simulationCache.set(cacheKey, {
    data: messages,
    timestamp: Date.now()
  });
  
  return messages;
}

/**
 * Buscar a pergunta aprovada para um step específico
 */
function getApprovedQuestionForStep(approvedMessages: any[], stepKey: string): string | null {
  if (!approvedMessages || approvedMessages.length === 0) return null;
  
  const message = approvedMessages.find((msg: any) => msg.step_key === stepKey);
  return message?.question || null;
}

/**
 * Busca e executa tools configuradas para um step/subject específico
 * @param supabase - Cliente Supabase
 * @param logger - Logger estruturado
 * @param stepKey - Chave do step atual (opcional)
 * @param subjectKey - Chave do subject (fallback se stepKey não fornecido)
 * @param context - Contexto com dados para executar tools (ixc_client_id, etc)
 * @returns Resultados das tools executadas
 */
async function executeConfiguredTools(
  supabase: any,
  logger: any,
  stepKey: string | null,
  subjectKey: string,
  context: {
    ixc_client_id?: string;
    customer_name?: string;
    ticket_subject?: string;
    ticket_description?: string;
    ticket_priority?: string;
  }
): Promise<{
  test_connectivity_result?: { is_online: boolean; tx_power?: number; rx_power?: number };
  ticket_created?: boolean;
  ticket_id?: string;
  errors?: string[];
}> {
  const results: any = {};
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

    return results;
  } catch (error) {
    logger.error("Erro ao buscar/executar tools configuradas", { 
      error: error instanceof Error ? error.message : String(error),
      stepKey,
      subjectKey
    });
    return { errors: [error instanceof Error ? error.message : String(error)] };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const logger = createLogger("support-tech-agent", req);

  try {
    const { 
      conversation_id, 
      customer_cpf, 
      message, 
      attachments,
      ixc_client_id, 
      reboot_attempted, 
      reboot_result, 
      onu_signal,
      client_is_offline, 
      cpf_not_found 
    } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    logger.info("Luan atendendo", { 
      conversation_id, 
      customer_cpf, 
      message,
      has_attachments: !!attachments && attachments.length > 0,
      ixc_client_id,
      reboot_attempted,
      has_onu_signal: !!onu_signal,
      client_is_offline,
      cpf_not_found
    });

    // 📷 PROCESSAR IMAGENS COM VISÃO AI
    let imageAnalysis = "";
    if (attachments && attachments.length > 0) {
      const imageAttachments = attachments.filter((a: any) => a.type === 'image');
      
      if (imageAttachments.length > 0) {
        logger.info("Processando imagens com visão AI", { 
          imageCount: imageAttachments.length 
        });
        
        try {
          const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
          if (!LOVABLE_API_KEY) {
            throw new Error('LOVABLE_API_KEY not configured');
          }

          // Montar o prompt para análise de imagem
          const imagePrompt = `Você é o Luan Silva, técnico de suporte da SUPERNET FIBRA.
          
O cliente enviou uma imagem relacionada a um problema de internet.

Analise a imagem e identifique:
- Se é um teste de velocidade (fast.com, speedtest, etc), identifique os valores de download/upload
- Se é uma foto do equipamento/luzes, identifique quais luzes estão acesas/apagadas/piscando
- Se é um erro/mensagem, identifique o erro
- Qualquer outra informação técnica relevante

Seja objetivo e direto. Extraia apenas os dados técnicos importantes.`;

          // Preparar conteúdo com imagem
          const imageContent: any[] = [
            {
              type: "text",
              text: imagePrompt
            }
          ];

          // Adicionar todas as imagens
          for (const img of imageAttachments) {
            imageContent.push({
              type: "image_url",
              image_url: {
                url: img.url
              }
            });
          }

          // Chamar Lovable AI com visão
          const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                {
                  role: "user",
                  content: imageContent
                }
              ],
              max_tokens: 500
            })
          });

          if (!aiResponse.ok) {
            const errorText = await aiResponse.text();
            logger.error("Erro na API de visão", { 
              status: aiResponse.status,
              error: errorText
            });
          } else {
            const aiData = await aiResponse.json();
            imageAnalysis = aiData.choices?.[0]?.message?.content || "";
            
            logger.info("Análise de imagem concluída", {
              analysisLength: imageAnalysis.length,
              preview: imageAnalysis.substring(0, 100)
            });
          }
        } catch (error) {
          logger.error("Erro ao processar imagem com AI", { 
            error: error instanceof Error ? error.message : String(error)
          });
          // Continua sem análise se houver erro
        }
      }
    }

    // Buscar histórico de mensagens da conversa
    const { data: messageHistory } = await supabase
      .from("conversation_messages")
      .select("sender_type, content")
      .eq("conversation_id", conversation_id)
      .order("created_at", { ascending: true });

    const hasHistory = messageHistory && messageHistory.length > 0;

    // Verificar se é a primeira mensagem (quando vem do routing-agent sem message)
    const isFirstMessage = !message || message.trim() === "" || !hasHistory;
    
    logger.info("Verificação de primeira mensagem", {
      isFirstMessage,
      hasMessage: !!message,
      messageLength: message?.length,
      hasHistory,
      historyLength: messageHistory?.length
    });

    // Verificar se há pane massiva ativa (contexto em memória)
    let outageActive = massOutageContext.active;
    let outageRegion = massOutageContext.affectedRegion || "";
    let outageCount = massOutageContext.affectedCount || 0;
    
    if (outageActive) {
      logger.info("Pane massiva detectada", { 
        region: outageRegion, 
        affected: outageCount 
      });
    }
    
    let responseMessage = "";

    // Se é a primeira mensagem, enviar saudação
    if (isFirstMessage) {
      logger.info("Luan enviando mensagem inicial", {
        outageActive,
        reboot_attempted,
        has_onu_signal: !!onu_signal,
        client_is_offline,
        ixc_client_id,
        cpf_not_found
      });
      
      // Buscar informações da conversa para personalizar a mensagem
      const { data: conversation } = await supabase
        .from("conversations")
        .select("customer_name, metadata")
        .eq("id", conversation_id)
        .single();

      // Extrair apenas o primeiro nome
      const fullName = conversation?.customer_name || "cliente";
      const customerName = fullName.split(' ')[0];
      const cpfRetryCount = (conversation?.metadata as any)?.cpf_retry_count || 0;

      // 🚨 CASO ESPECIAL: CPF não encontrado
      if (cpf_not_found) {
        if (cpfRetryCount >= 2) {
          // Já tentou 3 vezes (0, 1, 2) - transferir para humano
          logger.info("Luan: CPF não encontrado após 3 tentativas - transferindo para humano");
          responseMessage = `${customerName}, não consegui localizar seu CPF no sistema após algumas tentativas. 😕\n\nVou te transferir para um atendente humano que pode te ajudar melhor com isso. Só um momento! ⏳`;
          
          // Atualizar conversa para status "aguardando humano"
          await supabase
            .from("conversations")
            .update({
              status: "active",
              department: "tecnico",
              assigned_agent_id: null,
              metadata: {
                ...(conversation?.metadata as any || {}),
                needs_human_transfer: true,
                transfer_reason: "cpf_not_found_after_retries"
              }
            })
            .eq("id", conversation_id);
        } else {
          // Primeira ou segunda tentativa - pedir CPF novamente
          const attemptNumber = cpfRetryCount + 1;
          logger.info(`Luan: CPF não encontrado - tentativa ${attemptNumber}/3`);
          
          responseMessage = `${customerName}, não encontrei esse CPF no nosso sistema. 🔍\n\nPode confirmar o CPF para mim? Digite apenas os números, por favor.\n\n(Tentativa ${attemptNumber} de 3)`;
          
          // Incrementar contador de retry
          await supabase
            .from("conversations")
            .update({
              metadata: {
                ...(conversation?.metadata as any || {}),
                cpf_retry_count: cpfRetryCount + 1
              }
            })
            .eq("id", conversation_id);
        }
      } else {
        // Resetar contador se CPF foi encontrado
        if (cpfRetryCount > 0) {
          await supabase
            .from("conversations")
            .update({
              metadata: {
                ...(conversation?.metadata as any || {}),
                cpf_retry_count: 0
              }
            })
            .eq("id", conversation_id);
        }

      // Mensagem inicial seguindo o prompt do sistema
        if (outageActive && outageRegion) {
          // Caso especial: Pane massiva
          responseMessage = `Olá ${customerName}! Sou o **Luan Silva**, do Suporte Técnico da SUPERNET. 👋\n\n⚠️ **ATENÇÃO**: Detectamos uma instabilidade geral na região de ${outageRegion} afetando ${outageCount} clientes.\n\nNossa equipe técnica já está trabalhando para normalizar o serviço. Você não está sozinho nessa! Vou te manter informado sobre o andamento.`;
        } else if (reboot_attempted && onu_signal) {
          // Cloé já tentou reboot - começar diagnóstico TX/RX
          const tx = onu_signal.tx_power || 0;
          const rx = onu_signal.rx_power || 0;

          logger.info("Luan: Analisando sinal ONU após reboot falho", { tx, rx });

          // Determinar cenário baseado em TX/RX
          let scenario = "";
          let scenarioMessage = "";

          if (tx === 0 && rx === 0) {
            // CENÁRIO A: Sem sinal - iniciar fluxo de energia
            scenario = "A";
            scenarioMessage = `Olá ${customerName}! Sou o **Luan Silva**, do Suporte Técnico. 👋\n\nA Cloé tentou reiniciar seu equipamento, mas detectei que o sinal óptico está **zerado** (TX/RX: 0.00/0.00).\n\nIsso indica problema de energia ou no cabo de fibra.\n\n🔍 Por favor, me diga: **as luzes do seu equipamento estão acesas?**`;
            
            // Registrar estado inicial do Cenário A
            await supabase
              .from("conversations")
              .update({
                metadata: {
                  ...(conversation?.metadata as any || {}),
                  flow_state: "cenario_a_verificar_luzes",
                  scenario: "A" // 🔧 Sempre definir o scenario
                }
              })
              .eq("id", conversation_id);
              
          } else if (rx >= -23 && rx <= -18 && tx >= -1 && tx <= 2) {
            // CENÁRIO B: Sinal normal mas offline (equipamento travado)
            scenario = "B";
            scenarioMessage = `Olá ${customerName}! Sou o **Luan Silva**, do Suporte Técnico. 👋\n\nA Cloé tentou reiniciar remotamente, mas você ainda está offline.\n\nVerifiquei o sinal da ONU e está **dentro dos padrões** (RX: ${rx} dBm / TX: ${tx} dBm).\n\n🔧 Vamos tentar manualmente:\n1️⃣ **DESLIGUE** o roteador da tomada\n2️⃣ **AGUARDE** 60 segundos completos\n3️⃣ **LIGUE** novamente\n\nMe avise quando terminar!`;
          } else if (rx >= -28 && rx <= -24) {
            // CENÁRIO C: Sinal fraco
            scenario = "C";
            scenarioMessage = `Olá ${customerName}! Sou o **Luan Silva**, do Suporte Técnico. 👋\n\nA Cloé tentou reiniciar remotamente, mas você ainda está offline.\n\nDetectei que o sinal da fibra está **FRACO** (RX: ${rx} dBm).\n\n🔍 Verifique se a luz **PON** ou **LOS** está **PISCANDO** (não fixa).\n\nEstá piscando?`;
          } else {
            // CENÁRIO D: Sinal crítico
            scenario = "D";
            scenarioMessage = `Olá ${customerName}! Sou o **Luan Silva**, do Suporte Técnico. 👋\n\nA Cloé tentou reiniciar remotamente, mas você ainda está offline.\n\nDetectei um **PROBLEMA CRÍTICO** no sinal da fibra (RX: ${rx} dBm).\n\n⚠️ Isso requer inspeção urgente da nossa equipe técnica.\n\nVou abrir um atendimento prioritário agora mesmo!`;
          }

          responseMessage = scenarioMessage;
          logger.info("Cenário diagnosticado", { scenario, tx, rx });
        } else if (client_is_offline) {
          // Cliente offline sem tentativa de reboot (fallback)
          logger.info("Luan: Cliente offline detectado - iniciando troubleshooting");
          responseMessage = `Olá ${customerName}! Sou o **Luan Silva**, do Suporte Técnico da SUPERNET. 👋\n\nEntendo que ficar sem internet é frustrante. Vi que você está offline. Vamos resolver isso agora!\n\nPara começar, me diga: **as luzes do seu equipamento estão acesas?**`;
          
          // Registrar estado inicial
          await supabase
            .from("conversations")
            .update({
              metadata: {
                ...(conversation?.metadata as any || {}),
                flow_state: "cenario_a_verificar_luzes",
                scenario: "A" // 🔧 Sempre definir o scenario
              }
            })
            .eq("id", conversation_id);
            
        } else {
          // Mensagem genérica para outros casos
          responseMessage = `Olá ${customerName}! Sou o **Luan Silva**, do Suporte Técnico da SUPERNET. 👋\n\nEntendo que ficar sem internet é frustrante. Vou te ajudar a resolver isso agora!\n\nVamos começar: **qual problema você está enfrentando?**`;
        }
      }

      const { error: insertErr } = await supabase.from("conversation_messages").insert({
        conversation_id,
        sender_type: "agent",
        sender_name: "Luan Silva",
        content: responseMessage,
        ai_suggestion: false
      });
      
      if (insertErr) {
        logger.error("Erro ao inserir mensagem", { error: insertErr.message });
        throw insertErr;
      }

      logger.info("Mensagem inicial do Luan enviada");
      } else {
        // Continuar atendimento com análise contextual
        logger.info("Luan continuando atendimento", { message, historyLength: messageHistory?.length });

      // Buscar estado atual do fluxo
      const { data: currentConversation } = await supabase
        .from("conversations")
        .select("metadata")
        .eq("id", conversation_id)
        .single();

      const flowState = (currentConversation?.metadata as any)?.flow_state;
      const scenario = (currentConversation?.metadata as any)?.scenario;

      // Carregar exemplos aprovados de energia se estiver no cenário A
      let approvedExamples = "";
      if (scenario === "A" || flowState?.includes("energia")) {
        approvedExamples = await getApprovedSimulations(supabase, "energia");
        logger.info("Exemplos de energia carregados", { 
          hasExamples: approvedExamples.length > 0,
          examplesLength: approvedExamples.length,
          message: approvedExamples ? "Variações aprovadas disponíveis para referência" : "Nenhuma variação aprovada encontrada"
        });
        
        // Log das variações aprovadas para documentação
        if (approvedExamples.length > 0 && approvedSimulationsCache) {
          logger.info("Variações aprovadas em uso", {
            total: approvedSimulationsCache.data.length,
            scenarios: [...new Set(approvedSimulationsCache.data.map(s => s.scenario_key))],
            context: "Fluxo de energia seguindo protocolos aprovados"
          });
        }
      }

      logger.info("Estado do fluxo", { flowState, scenario });

      // 🚨 DETECTOR DE FRUSTRAÇÃO (Priority #2)
      const frustration = detectFrustration(message);
      if (frustration.isFrustrated) {
        logger.info("🚨 Frustração detectada", {
          intensity: frustration.intensity,
          indicators: frustration.indicators
        });
        
        // Frustração alta ou média → transferir imediatamente
        if (frustration.intensity === 'high' || frustration.intensity === 'medium') {
          responseMessage = `${customerName}, percebo que você está frustrado. 😔\n\nVou te transferir agora mesmo para um atendente humano que pode te ajudar melhor!\n\nSó um momento! ⏳`;
          
          await supabase
            .from("conversations")
            .update({
              status: "active",
              department: "tecnico",
              assigned_agent_id: null,
              metadata: {
                ...(currentConversation?.metadata as any || {}),
                needs_human_transfer: true,
                transfer_reason: "client_frustrated",
                frustration_level: frustration.intensity,
                frustration_indicators: frustration.indicators
              }
            })
            .eq("id", conversation_id);
          
          // Salvar resposta e retornar
          await supabase
            .from("conversation_messages")
            .insert({
              conversation_id,
              sender_type: "agent",
              content: responseMessage
            });
          
          return new Response(JSON.stringify({ 
            message: responseMessage,
            transferred: true,
            reason: 'frustration'
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      }

      // 📊 CONTADOR DE TENTATIVAS DE CLARIFICAÇÃO (Priority #1)
      const clarificationAttempts = (currentConversation?.metadata as any)?.clarification_attempts || 0;
      const lastClarificationStep = (currentConversation?.metadata as any)?.last_clarification_step;
      
      // Se já tentou clarificar 2x no mesmo step → transferir para humano
      if (clarificationAttempts >= 2 && lastClarificationStep === flowState) {
        logger.info("⚠️ Limite de clarificações atingido", {
          attempts: clarificationAttempts,
          step: flowState
        });
        
        responseMessage = `${customerName}, estou tendo dificuldade em entender suas respostas. 😅\n\nVou te transferir para um atendente humano que pode te ajudar melhor!\n\nSó um momento! ⏳`;
        
        await supabase
          .from("conversations")
          .update({
            status: "active",
            department: "tecnico",
            assigned_agent_id: null,
            metadata: {
              ...(currentConversation?.metadata as any || {}),
              needs_human_transfer: true,
              transfer_reason: "clarification_limit_exceeded",
              clarification_attempts: clarificationAttempts
            }
          })
          .eq("id", conversation_id);
        
        // Salvar resposta e retornar
        await supabase
          .from("conversation_messages")
          .insert({
            conversation_id,
            sender_type: "agent",
            content: responseMessage
          });
        
        return new Response(JSON.stringify({ 
          message: responseMessage,
          transferred: true,
          reason: 'clarification_limit'
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Analisar contexto baseado no histórico
      const conversationContext = messageHistory.map(m => m.content.toLowerCase()).join(" ");
      const currentMessage = message.toLowerCase();

      // 🔴 CENÁRIO A: Fluxo de diagnóstico de energia
      // Detectar Cenário A pelo flowState (mais confiável que scenario)
      const isCenarioA = flowState?.startsWith("cenario_a") || scenario === "A";
      
      if (isCenarioA && flowState) {
        logger.info("Processando Cenário A - Fluxo de Energia", { 
          flowState,
          scenario,
          approvedVariations: approvedSimulationsCache?.data.length || 0,
          context: "Seguindo protocolo de energia com variações aprovadas como referência"
        });

        // Detectores de resposta (melhorados para capturar variações naturais)
        const isNegation = /\b(n[ãa]o|nao|nn?|nem)\b/i.test(currentMessage);
        
        const saysOff = /(apag(ad[oa]s?|ou)|sem luz|desligad[oa]s?|tud[oa] (apagad|desligad|escur)|escur[oa])/i.test(currentMessage) ||
          (isNegation && /(aces[ao]s?|acesas|acessas|piscando)/i.test(currentMessage));
        
        // Detectar confirmação de energia ou que as luzes voltaram/acenderam
        const saysPowerAvailable = (
          // Confirmações diretas
          (/(sim|s[ií]|ok|claro|com certeza|t[aá]|tem|j[aá]|est[aáã]|funcion)/i.test(currentMessage) &&
           /(ligad[oa]s?|na tomada|conectad|energia|luz|for[cç]a|corrente|plug(ad)?)/i.test(currentMessage)) ||
          // Luzes voltaram/acenderam (implica que energia voltou)
          /(volt(ou|aram)|acend(eu|eram)|funcion(ou|ando)|normal(iz)?)/i.test(currentMessage) &&
          /(luz(es)?|equipamento|internet|tudo)/i.test(currentMessage)
        );
        
        const hasRedLightBlinking = /(sim|s[ií]|t[aá]|tem|est[aáã]|aparec)/i.test(currentMessage) &&
          /(vermelh[oa]|los|pon|pisca(nd[oa])?|intermitente)/i.test(currentMessage);
        
        const noRedLight = isNegation && /(vermelh[oa]|los|pon|pisca)/i.test(currentMessage);
        
        const fiberReconnected = /(reconect(ei|ado)|tirei\s*e\s*(re)?coloquei|manipul(ei|ado)|fiz|terminei|test(ei|ado))/i.test(currentMessage) &&
          /(conector|fibra|verde|cabo)/i.test(currentMessage);
        
        // Detectar sucesso: luz verde OU resolução
        const lightTurnedGreen = (
          // Luz verde específica
          (/(sim|s[ií]|verde|parou|fixa|ok|funcionou)/i.test(currentMessage) &&
           /(verde|parou|luz|fixa)/i.test(currentMessage)) ||
          // Resoluções gerais: voltou, funcionou, resolveu
          /(volt(ou|aram)|resolv(eu|ido)|funcion(ou|ando)|t[aá] (funcionando|online|ok|normal)|conseg[ou])/i.test(currentMessage)
        );
        
        const lightStillRed = (isNegation || /continua|ainda/i.test(currentMessage)) &&
          /(vermelh[oa]|pisca)/i.test(currentMessage);

        // ETAPA 1: Verificar se luzes estão acesas (Priority #3 - Cobertura completa)
        if (flowState === "cenario_a_verificar_luzes") {
          const lightInterpretation = await hybridInterpret(currentMessage, {
            regexDetectors: {
              confirmed: /(sim|s[ií]|aces[ao]s?|acesas|ligad|pisca|verde)/i,
              denied: /(n[ãa]o|nao|apag|deslig|sem\s+luz|escur|tud[oa]\s+(apag|deslig))/i
            },
            similarityPhrases: {
              confirmed: [
                "sim estão acesas",
                "as luzes estão ligadas",
                "tem luz sim",
                "está piscando",
                "tem luzes acesas"
              ],
              denied: [
                "não tem luz",
                "está tudo apagado",
                "sem nenhuma luz",
                "tudo escuro",
                "apagadas"
              ]
            },
            aiContext: {
              expectedAction: "verificar se as luzes do equipamento estão acesas ou apagadas",
              previousAgentMessage: "As luzes do equipamento estão acesas ou apagadas?"
            }
          });
          
          logger.info("Interpretação híbrida - Luzes", {
            result: lightInterpretation.result,
            confidence: lightInterpretation.confidence,
            method: lightInterpretation.method
          });
          
          // Buscar mensagens aprovadas para usar textos customizados
          const approvedMessages = await getApprovedSimulations(supabaseClient, 'energia');
          
          if (lightInterpretation.result === 'negou' && lightInterpretation.confidence >= 0.6) {
            // Luzes apagadas → Verificar energia
            const approvedQuestion = getApprovedQuestionForStep(approvedMessages, 'cenario_a_verificar_energia');
            responseMessage = approvedQuestion || `Entendi! Se as luzes do equipamento não estão acesas, vamos verificar a energia. 🔌\n\nPor favor, confira:\n\n1️⃣ **Equipamento está ligado na tomada?** ✅\n2️⃣ **Fonte de energia está conectada?** 🔌\n3️⃣ **Botão Power está ligado (se houver)?** 💡\n4️⃣ **Tem energia elétrica no local?** Teste com outro aparelho\n\nMe avise após verificar!`;
            
            await logger.info("🎯 Usando texto aprovado para verificar_energia", {
              conversation_id,
              usando_aprovado: !!approvedQuestion
            });
            
            await supabase
              .from("conversations")
              .update({
                metadata: {
                  ...(currentConversation?.metadata as any || {}),
                  flow_state: "cenario_a_verificar_energia",
                  clarification_attempts: 0 // Reset contador
                }
              })
              .eq("id", conversation_id);
              
          } else if (lightInterpretation.result === 'confirmou' && lightInterpretation.confidence >= 0.6) {
            // Luzes acesas → Pular para verificação de luz vermelha
            const approvedQuestion = getApprovedQuestionForStep(approvedMessages, 'cenario_a_verificar_luz_vermelha');
            responseMessage = approvedQuestion || `Ok! As luzes estão acesas. 💡\n\nAgora verifique se a **luz LOS (vermelha)** está **PISCANDO** no equipamento.\n\nObs.: a luz PON normalmente é **VERDE** (fixa ou piscando).\n\nVocê está vendo a luz LOS piscando? 🔴`;
            
            await logger.info("🎯 Usando texto aprovado para verificar_luz_vermelha", {
              conversation_id,
              usando_aprovado: !!approvedQuestion
            });
            
            await supabase
              .from("conversations")
              .update({
                metadata: {
                  ...(currentConversation?.metadata as any || {}),
                  flow_state: "cenario_a_verificar_luz_vermelha",
                  clarification_attempts: 0 // Reset contador
                }
              })
              .eq("id", conversation_id);
          } else {
            // Resposta ambígua - incrementar contador
            const newAttempts = clarificationAttempts + 1;
            responseMessage = `Desculpe, não entendi se você está dizendo que as luzes estão **ACESAS** (ligadas, piscando) ou **APAGADAS** (sem nenhuma luz). 🤔\n\nPor favor, me responda apenas:\n- **"acesas"** se tem alguma luz ligada\n- **"apagadas"** se não tem nenhuma luz`;
            
            await supabase
              .from("conversations")
              .update({
                metadata: {
                  ...(currentConversation?.metadata as any || {}),
                  clarification_attempts: newAttempts,
                  last_clarification_step: flowState
                }
              })
              .eq("id", conversation_id);
          }
        }
        
        // ETAPA 2: Verificar energia (após confirmar luzes apagadas)
        else if (flowState === "cenario_a_verificar_energia") {
          // Usar sistema híbrido para interpretar resposta
          const interpretation = await hybridInterpret(currentMessage, {
            regexDetectors: {
              confirmed: /(sim|s[ií]|ok|claro|com certeza|t[aá]|tem|j[aá]|est[aáã]|funcion|volt(ou|aram)|acend(eu|eram)|normal)/i,
              denied: /\b(n[ãa]o|nao|nn?|nem)\b/i
            },
            similarityPhrases: {
              confirmed: [
                "sim está ligado",
                "está na tomada",
                "tem energia",
                "voltou a energia",
                "as luzes acenderam",
                "está funcionando",
                "tudo ligado"
              ],
              denied: [
                "não tem energia",
                "está desligado",
                "não está ligado",
                "sem energia"
              ]
            },
            aiContext: {
              expectedAction: "verificar se o equipamento está com energia elétrica",
              previousAgentMessage: "Por favor, confira: Equipamento está ligado na tomada? Fonte de energia está conectada?"
            }
          });
          
          logger.info("Interpretação híbrida - Energia", {
            result: interpretation.result,
            confidence: interpretation.confidence,
            method: interpretation.method,
            reasoning: interpretation.reasoning
          });
          
          // Buscar mensagens aprovadas
          const approvedMessages = await getApprovedSimulations(supabaseClient, 'energia');
          
          if (interpretation.result === 'confirmou' && interpretation.confidence >= 0.6) {
            // Energia OK → Verificar luz vermelha
            const approvedQuestion = getApprovedQuestionForStep(approvedMessages, 'cenario_a_verificar_luz_vermelha');
            responseMessage = approvedQuestion || `Ok! O equipamento está com energia. 💡\n\nAgora verifique se a **luz LOS (vermelha)** está **PISCANDO** no equipamento.\n\nObs.: a luz PON normalmente é **VERDE** (fixa ou piscando).\n\nVocê está vendo a luz LOS piscando? 🔴`;
            
            await logger.info("🎯 Usando texto aprovado para verificar_luz_vermelha", {
              conversation_id,
              usando_aprovado: !!approvedQuestion
            });
            
            await supabase
              .from("conversations")
              .update({
                metadata: {
                  ...(currentConversation?.metadata as any || {}),
                  flow_state: "cenario_a_verificar_luz_vermelha"
                }
              })
              .eq("id", conversation_id);
          } else if (interpretation.result === 'negou' && interpretation.confidence >= 0.6) {
            // Sem energia → Orientar cliente a resolver energia primeiro
            responseMessage = `Entendi! Parece que o problema é na energia elétrica. ⚡\n\nAntes de continuar, você precisa:\n1️⃣ Verificar o disjuntor\n2️⃣ Testar outra tomada\n3️⃣ Garantir que há energia no local\n\nAssim que tiver energia, me avise que continuo o diagnóstico!`;
          } else {
            // Incerto → Pedir clarificação com mais detalhe
            const newAttempts = clarificationAttempts + 1;
            responseMessage = `Desculpe, não entendi se você está dizendo que o equipamento **TEM ENERGIA** (está ligado na tomada e funcionando) ou **NÃO TEM ENERGIA** (sem energia elétrica). 🤔\n\nPor favor, me responda:\n- **"tem energia"** se o equipamento está ligado e com luz\n- **"sem energia"** se não tem energia no local`;
            
            await supabase
              .from("conversations")
              .update({
                metadata: {
                  ...(currentConversation?.metadata as any || {}),
                  clarification_attempts: newAttempts,
                  last_clarification_step: flowState
                }
              })
              .eq("id", conversation_id);
          }
        }
        
        // ETAPA 3: Verificar luz vermelha LOS/PON (Priority #3)
        else if (flowState === "cenario_a_verificar_luz_vermelha") {
          const redLightInterpretation = await hybridInterpret(currentMessage, {
            regexDetectors: {
              confirmed: /(sim|s[ií]|t[aá]|tem|est[aáã]|aparec|vermelh|los|pon|pisca)/i,
              denied: /(n[ãa]o|nao|nem|verde|normal|fixa)/i
            },
            similarityPhrases: {
              confirmed: [
                "sim está piscando",
                "tem luz vermelha",
                "o los está vermelho",
                "está piscando vermelho",
                "tem uma luz vermelha piscando"
              ],
              denied: [
                "não tem luz vermelha",
                "está verde",
                "não está piscando",
                "tudo normal"
              ]
            },
            aiContext: {
              expectedAction: "verificar se a luz LOS (vermelha) está piscando no equipamento",
              previousAgentMessage: "Você está vendo a luz LOS (vermelha) piscando no equipamento?"
            }
          });
          
          logger.info("Interpretação híbrida - Luz Vermelha", {
            result: redLightInterpretation.result,
            confidence: redLightInterpretation.confidence,
            method: redLightInterpretation.method
          });
          
          // Buscar mensagens aprovadas
          const approvedMessages = await getApprovedSimulations(supabaseClient, 'energia');
          
          if (redLightInterpretation.result === 'confirmou' && redLightInterpretation.confidence >= 0.6) {
            // Tem luz vermelha → Instruir manipulação do conector
            const approvedQuestion = getApprovedQuestionForStep(approvedMessages, 'cenario_a_aguardando_manipulacao');
            responseMessage = approvedQuestion || `Perfeito! Essa luz vermelha indica problema no sinal da fibra óptica. 🔴\n\nVou te enviar as instruções para tentar resolver:\n\n⚠️ **ATENÇÃO ao manusear:**\n- Segure o conector pela **BASE** (não pelo cabo)\n- Retire com **cuidado** (não force)\n- **Não dobre** o cabo\n- Reconecte **firmemente** até ouvir um 'click'\n\n📋 **Passo a passo:**\n1️⃣ Localize o cabo fino (fibra óptica) - é um cabo bem fininho que entra no equipamento\n2️⃣ **Retire** com cuidado o conector que está encaixado\n3️⃣ **Recoloque firmemente** - empurre o conector de volta até ouvir um 'click'\n4️⃣ Aguarde **1 minuto** para sincronização\n5️⃣ Veja se a luz ficou **VERDE FIXA**\n\nMe avise quando terminar! 🔧`;
            
            await logger.info("🎯 Usando texto aprovado para aguardando_manipulacao", {
              conversation_id,
              usando_aprovado: !!approvedQuestion
            });
            
            await supabase
              .from("conversations")
              .update({
                metadata: {
                  ...(currentConversation?.metadata as any || {}),
                  flow_state: "cenario_a_aguardando_manipulacao",
                  clarification_attempts: 0 // Reset
                }
              })
              .eq("id", conversation_id);
          } else if (redLightInterpretation.result === 'negou' && redLightInterpretation.confidence >= 0.6) {
            // Não tem luz vermelha → Abrir ticket
            logger.info("Cenário A: Cliente sem luz vermelha - abrindo ticket");
            
            // Executar tools configuradas (criar_atendimento_ixc)
            if (ixc_client_id) {
              const toolResults = await executeConfiguredTools(
                supabase,
                logger,
                "cenario_a_sem_luz_vermelha", // step específico
                "energia", // subject fallback
                {
                  ixc_client_id,
                  customer_name: customerName,
                  ticket_subject: "Equipamento offline sem sinal óptico",
                  ticket_description: `Cliente ${customerName} reportou equipamento offline. Diagnóstico: luzes acesas mas sem luz vermelha LOS. Possível problema no equipamento ou fibra.`,
                  ticket_priority: "high"
                }
              );
              
              if (toolResults.ticket_created) {
                logger.info("Ticket criado via tools configuradas", { ticket_id: toolResults.ticket_id });
              }
            }
            
            responseMessage = `Ok! Se não há luz vermelha mas o equipamento continua sem conexão, vou abrir um atendimento técnico prioritário. 🔧\n\nNossa equipe vai entrar em contato para agendar uma visita e resolver isso o mais rápido possível.\n\nPreciso de mais alguma coisa agora?`;
            
            await supabase
              .from("conversations")
              .update({
                status: "active",
                department: "tecnico",
                metadata: {
                  ...(currentConversation?.metadata as any || {}),
                  needs_human_transfer: true,
                  transfer_reason: "sem_luz_vermelha_equipamento_offline"
                }
              })
                .eq("id", conversation_id);
          } else {
            // Incerto → Explicação detalhada
            const newAttempts = clarificationAttempts + 1;
            responseMessage = `Desculpe, não entendi se você está vendo ou não a luz vermelha. 🤔\n\nOlhe no equipamento e me diga:\n- **"sim"** se você VÊ a luz **LOS (vermelha)** **PISCANDO**\n- **"não"** se NÃO TEM luz **LOS vermelha** piscando e a **PON está VERDE/fixa**`;
            
            await supabase
              .from("conversations")
              .update({
                metadata: {
                  ...(currentConversation?.metadata as any || {}),
                  clarification_attempts: newAttempts,
                  last_clarification_step: flowState
                }
              })
              .eq("id", conversation_id);
          }
        }
        
        // ETAPA 4: Aguardando manipulação do conector (Priority #3)
        else if (flowState === "cenario_a_aguardando_manipulacao") {
          const manipulationInterpretation = await hybridInterpret(currentMessage, {
            regexDetectors: {
              confirmed: /(reconect|tirei|coloquei|manipul|fiz|terminei|test|pront|feito|ok)/i,
              denied: /(n[ãa]o|nao|ainda|espera|aguard)/i
            },
            similarityPhrases: {
              confirmed: [
                "já fiz",
                "já reconectei",
                "terminei de fazer",
                "pronto",
                "feito",
                "manipulei o cabo"
              ],
              denied: [
                "ainda não fiz",
                "ainda não mexi",
                "não consegui"
              ]
            },
            aiContext: {
              expectedAction: "manipular (retirar e reconectar) o cabo de fibra óptica do equipamento",
              previousAgentMessage: "Retire e reconecte o conector da fibra. Me avise quando terminar!"
            }
          });
          
          logger.info("Interpretação híbrida - Manipulação", {
            result: manipulationInterpretation.result,
            confidence: manipulationInterpretation.confidence,
            method: manipulationInterpretation.method
          });
          
          // Buscar mensagens aprovadas
          const approvedMessages = await getApprovedSimulations(supabaseClient, 'energia');
          
          if (manipulationInterpretation.result === 'confirmou' && manipulationInterpretation.confidence >= 0.6) {
            // Cliente manipulou o conector → Verificar resultado
            const approvedQuestion = getApprovedQuestionForStep(approvedMessages, 'cenario_a_verificar_resultado_manipulacao');
            responseMessage = approvedQuestion || `Perfeito! Aguarde mais **1 minuto** para sincronização completa. ⏳\n\nAgora me diga: a luz **VERMELHA** parou de **PISCAR** e ficou **VERDE FIXA**?`;
            
            await logger.info("🎯 Usando texto aprovado para verificar_resultado_manipulacao", {
              conversation_id,
              usando_aprovado: !!approvedQuestion
            });
            
            await supabase
              .from("conversations")
              .update({
                metadata: {
                  ...(currentConversation?.metadata as any || {}),
                  flow_state: "cenario_a_verificar_resultado_manipulacao",
                  clarification_attempts: 0 // Reset
                }
              })
              .eq("id", conversation_id);
          } else if (manipulationInterpretation.result === 'negou' && manipulationInterpretation.confidence >= 0.6) {
            // Cliente não fez ainda
            responseMessage = `Ok! Sem pressa. 😊\n\nQuando você retirar e reconectar o cabo de fibra, me avise para continuar o diagnóstico! 🔧`;
          } else {
            // Incerto
            const newAttempts = clarificationAttempts + 1;
            responseMessage = `Desculpe, não entendi se você já fez o procedimento. 🤔\n\nVocê já **RETIROU e RECONECTOU** o cabo de fibra do equipamento?\n\nMe responda:\n- **"sim"** ou **"feito"** se já fez\n- **"não"** se ainda não fez`;
            
            await supabase
              .from("conversations")
              .update({
                metadata: {
                  ...(currentConversation?.metadata as any || {}),
                  clarification_attempts: newAttempts,
                  last_clarification_step: flowState
                }
              })
              .eq("id", conversation_id);
          }
        }
        
        // ETAPA 5: Verificar resultado após manipulação
        else if (flowState === "cenario_a_verificar_resultado_manipulacao") {
          // Usar sistema híbrido para interpretar resultado
          const resultInterpretation = await hybridInterpret(currentMessage, {
            regexDetectors: {
              confirmed: /(sim|s[ií]|verde|parou|fixa|ok|funcionou|volt(ou|aram)|resolv(eu|ido)|conseg[ou])/i,
              denied: /(n[ãa]o|nao|continua|ainda).*?(vermelh[oa]|pisca)/i
            },
            similarityPhrases: {
              confirmed: [
                "ficou verde",
                "parou de piscar",
                "luz fixa agora",
                "voltou",
                "funcionou",
                "resolveu",
                "está normal",
                "consigo navegar"
              ],
              denied: [
                "continua vermelha",
                "ainda piscando",
                "não resolveu",
                "não funcionou"
              ]
            },
            aiContext: {
              expectedAction: "verificar se a luz vermelha parou de piscar e ficou verde fixa após manipular o cabo de fibra",
              previousAgentMessage: "Agora me diga: a luz VERMELHA parou de PISCAR e ficou VERDE FIXA?"
            }
          });
          
          logger.info("Interpretação híbrida - Resultado", {
            result: resultInterpretation.result,
            confidence: resultInterpretation.confidence,
            method: resultInterpretation.method,
            reasoning: resultInterpretation.reasoning
          });
          
          // Buscar mensagens aprovadas
          const approvedMessages = await getApprovedSimulations(supabaseClient, 'energia');
          
          if (resultInterpretation.result === 'confirmou' && resultInterpretation.confidence >= 0.6) {
            // Luz ficou verde → Consultar IXC para verificar se voltou online
            logger.info("Cenário A: Luz ficou verde - consultando IXC");
            
            let isOnlineNow = false;
            
            // Executar tools configuradas (test-equipment-connectivity)
            const toolResults = await executeConfiguredTools(
              supabase,
              logger,
              "cenario_a_verificar_resultado", // step específico
              "energia", // subject fallback
              {
                ixc_client_id,
                customer_name: customerName
              }
            );
            
            if (toolResults.test_connectivity_result) {
              isOnlineNow = toolResults.test_connectivity_result.is_online || false;
              logger.info("Resultado consulta via tools configuradas", { isOnlineNow });
            }
            
            if (isOnlineNow) {
              // Cliente voltou online → Perguntar se consegue navegar
              const approvedQuestion = getApprovedQuestionForStep(approvedMessages, 'cenario_a_verificar_navegacao');
              responseMessage = approvedQuestion || `Ótimo! Você já está **online** novamente! 🎉\n\nConsegue navegar na internet normalmente?`;
              
              await logger.info("🎯 Usando texto aprovado para verificar_navegacao", {
                conversation_id,
                usando_aprovado: !!approvedQuestion
              });
              
            await supabase
              .from("conversations")
              .update({
                metadata: {
                  ...(currentConversation?.metadata as any || {}),
                  flow_state: "cenario_a_verificar_navegacao",
                  clarification_attempts: 0 // Reset
                }
              })
              .eq("id", conversation_id);
          } else {
            // Continua offline → Abrir ticket
              logger.info("Cenário A: Luz verde mas continua offline - abrindo ticket");
              
              // Executar tools configuradas (criar_atendimento_ixc)
              if (ixc_client_id) {
                await executeConfiguredTools(
                  supabase,
                  logger,
                  "cenario_a_luz_verde_offline", // step específico
                  "energia", // subject fallback
                  {
                    ixc_client_id,
                    customer_name: customerName,
                    ticket_subject: "Equipamento com sinal mas offline",
                    ticket_description: `Cliente ${customerName} manipulou conector de fibra, luz ficou verde mas equipamento continua offline. Necessário verificação técnica.`,
                    ticket_priority: "high"
                  }
                );
              }
              
              responseMessage = `Entendi. A luz ficou verde mas você ainda está sem conexão. 🔧\n\nVou abrir uma chamada técnica prioritária. Nossa equipe vai verificar o problema na rede e entrar em contato com você.\n\nEnquanto isso, preciso de mais alguma coisa?`;
              
              await supabase
                .from("conversations")
                .update({
                  status: "active",
                  department: "tecnico",
                  metadata: {
                    ...(currentConversation?.metadata as any || {}),
                    needs_human_transfer: true,
                    transfer_reason: "luz_verde_mas_offline"
                  }
                })
                .eq("id", conversation_id);
            }
          } else if (resultInterpretation.result === 'negou' && resultInterpretation.confidence >= 0.6) {
            // Luz continua vermelha → Pedir foto + ticket + humano
            logger.info("Cenário A: Luz continua vermelha - solicitando foto");
            
            // Executar tools configuradas (criar_atendimento_ixc)
            if (ixc_client_id) {
              await executeConfiguredTools(
                supabase,
                logger,
                "cenario_a_luz_vermelha_persistente", // step específico
                "energia", // subject fallback
                {
                  ixc_client_id,
                  customer_name: customerName,
                  ticket_subject: "Luz vermelha persistente após manipulação",
                  ticket_description: `Cliente ${customerName} manipulou conector de fibra mas luz LOS continua vermelha. Possível problema na fibra ou equipamento. Necessário visita técnica.`,
                  ticket_priority: "urgent"
                }
              );
            }
            
            responseMessage = `Tudo bem. Se a luz continua vermelha, pode ser um problema mais complexo. 🔴\n\nVocê consegue tirar uma **foto da parte de trás do equipamento** mostrando onde o cabo fino (fibra) está conectado e me enviar?\n\nEnquanto isso, já vou abrir um chamado técnico prioritário. Pode ser necessário o deslocamento de um técnico.`;
            
            await supabase
              .from("conversations")
              .update({
                status: "active",
                department: "tecnico",
                metadata: {
                  ...(currentConversation?.metadata as any || {}),
                  needs_human_transfer: true,
                  transfer_reason: "luz_vermelha_persistente",
                  awaiting_photo: true
                }
              })
              .eq("id", conversation_id);
          } else {
            responseMessage = `Desculpe, não entendi. 🤔\n\nA luz **parou de piscar** e ficou **VERDE FIXA**?\n\nOu continua **VERMELHA**?`;
          }
        }
        
        // ETAPA 6: Verificar navegação (após confirmar que está online)
        else if (flowState === "cenario_a_verificar_navegacao") {
          // Usar sistema híbrido para verificar se consegue navegar
          const navInterpretation = await hybridInterpret(currentMessage, {
            regexDetectors: {
              confirmed: /(sim|s[ií]|consigo|funciona|ok|normal|t[aá]|volta)/i,
              denied: /(n[ãa]o|nao|ainda|continua).*?(consigo|funciona|lent|trava)/i
            },
            similarityPhrases: {
              confirmed: [
                "sim consigo",
                "está funcionando",
                "voltou normal",
                "tá tudo ok",
                "navega normal"
              ],
              denied: [
                "não consigo",
                "ainda não funciona",
                "continua sem internet",
                "não navega"
              ]
            },
            aiContext: {
              expectedAction: "testar se consegue navegar na internet normalmente",
              previousAgentMessage: "Consegue navegar na internet normalmente?"
            }
          });
          
          logger.info("Interpretação híbrida - Navegação", {
            result: navInterpretation.result,
            confidence: navInterpretation.confidence,
            method: navInterpretation.method
          });
          
          if (navInterpretation.result === 'confirmou' && navInterpretation.confidence >= 0.6) {
            // Consegue navegar → Encerrar com sucesso
            responseMessage = `Perfeito! Problema resolvido! 🎉\n\nPreciso de mais alguma coisa?`;
            
            await supabase
              .from("conversations")
              .update({
                metadata: {
                  ...(currentConversation?.metadata as any || {}),
                  flow_state: "cenario_a_resolvido",
                  clarification_attempts: 0 // Reset
                }
              })
              .eq("id", conversation_id);
          } else if (navInterpretation.result === 'negou' && navInterpretation.confidence >= 0.6) {
            // Não consegue navegar → Ticket + humano
            logger.info("Cenário A: Online mas não navega - abrindo ticket");
            
            // Executar tools configuradas (criar_atendimento_ixc)
            if (ixc_client_id) {
              await executeConfiguredTools(
                supabase,
                logger,
                "cenario_a_online_sem_navegacao", // step específico
                "energia", // subject fallback
                {
                  ixc_client_id,
                  customer_name: customerName,
                  ticket_subject: "Cliente online mas sem navegação",
                  ticket_description: `Cliente ${customerName} está online no sistema mas não consegue navegar. Possível problema de configuração ou DNS.`,
                  ticket_priority: "high"
                }
              );
            }
            
            responseMessage = `Entendi. Você está online mas não consegue acessar sites. 🔧\n\nVou abrir um chamado técnico para verificar isso. Nossa equipe vai entrar em contato.\n\nEnquanto isso, tente:\n1️⃣ Fechar e abrir o navegador\n2️⃣ Desligar e ligar o Wi-Fi do celular/computador\n\nMe avise se resolver!`;
            
            await supabase
              .from("conversations")
              .update({
                status: "active",
                department: "tecnico",
                metadata: {
                  ...(currentConversation?.metadata as any || {}),
                  needs_human_transfer: true,
                  transfer_reason: "online_mas_nao_navega"
                }
              })
              .eq("id", conversation_id);
          } else {
            // Incerto → Explicação detalhada
            const newAttempts = clarificationAttempts + 1;
            responseMessage = `Desculpe, não entendi se a internet está funcionando. 🤔\n\nPor favor, tente abrir um site (como Google ou YouTube) e me diga:\n- **"sim"** se você CONSEGUE navegar e abrir sites\n- **"não"** se NÃO CONSEGUE acessar a internet`;
            
            await supabase
              .from("conversations")
              .update({
                metadata: {
                  ...(currentConversation?.metadata as any || {}),
                  clarification_attempts: newAttempts,
                  last_clarification_step: flowState
                }
              })
              .eq("id", conversation_id);
          }
        }
        
        // Inserir mensagem do Cenário A
        if (responseMessage) {
          const { error: insertErr } = await supabase.from("conversation_messages").insert({
            conversation_id,
            sender_type: "agent",
            sender_name: "Luan Silva",
            content: responseMessage,
            ai_suggestion: false
          });
          
          if (insertErr) {
            logger.error("Erro ao inserir mensagem do Cenário A", { error: insertErr.message });
            throw insertErr;
          }
          
          logger.info("Luan respondeu ao cliente no Cenário A", { flowState });
        }
      }
      
      // 🟡 FLUXOS GENÉRICOS (quando não está em um cenário específico)
      else if (conversationContext.includes("sem internet") || conversationContext.includes("offline")) {
        // Cliente está sem internet
        // Normalizar variações comuns de escrita (com erros de digitação e coloquialismo)
        const isNegation = /\b(n[ãa]o|nao|nn?|nem)\b/i.test(currentMessage);
        const mentionsLight = /(luz(es)?|led(s)?|pon|los|power|lampada|pisca|apag)/i.test(currentMessage);
        
        // Detecta relatos de que o equipamento NÃO LIGA de jeito nenhum
        const cantPowerOn = /((n[ãa]o|nao)\s*(liga|acende|d[aá]\s*sinal|funciona)(\s*de jeito nenhum|\s*nada)?|nao\s*liga|nao\s*acende|morto|queimad[oa]|pifad[oa]|sem\s*sinal\s*de\s*vida)/i.test(currentMessage);
        
        // Detecta "apagado/desligado/sem luz/tudo apagado" + variações de "não acesas"
        const saysOff =
          /(apag(ad[oa]s?|ou)|sem luz|desligad[oa]s?|tud[oa] (apagad|desligad|escur)|escur[oa])/i.test(currentMessage) ||
          (isNegation && /(aces[ao]s?|acesas|acessas|piscando)/i.test(currentMessage)) ||
          /(n[ãa]o\s*(t[aá]|est[aáã]o?)\s*(aces[sa]s?|ligad))/i.test(currentMessage);
        
        // Detecta confirmação de energia: "sim/ok/tá ligado/tem energia/na tomada"
        const saysPowerAvailable =
          /(sim|s[ií]|ok|claro|com certeza|t[aá]|tem|j[aá]|est[aáã]|funcion)/i.test(currentMessage) &&
          /(ligad[oa]s?|na tomada|conectad|energia|luz|for[cç]a|corrente|plug(ad)?)/i.test(currentMessage);
        
        // 🆕 Detecta confirmação de luz vermelha LOS/PON piscando
        const hasRedLightBlinking =
          /(sim|s[ií]|t[aá]|tem|est[aáã]|aparec)/i.test(currentMessage) &&
          /(vermelh[oa]|los|pon|pisca(nd[oa])?|intermitente)/i.test(currentMessage);
        
        // 🆕 Detecta negação de luz vermelha
        const noRedLight =
          isNegation &&
          /(vermelh[oa]|los|pon|pisca)/i.test(currentMessage);
        
        // Detecta conclusão do reboot: "terminei/já liguei/pronto/ok feito"
        const rebootCompleted =
          /(termin(ei|ado|ou)|re(liguei|ligado|conect)|pronto|feito|ok|fiz|j[aá]\s*(liguei|conectei|re(liguei|conect)))/i.test(currentMessage);
        
        // 🆕 Detecta conclusão da manipulação do conector de fibra
        const fiberReconnected =
          /(reconect(ei|ado)|tirei\s*e\s*(re)?coloquei|manipul(ei|ado)|fiz|terminei)/i.test(currentMessage) &&
          /(conector|fibra|verde|cabo)/i.test(currentMessage);

        if (cantPowerOn) {
          // Equipamento não liga de jeito nenhum -> foco total em energia/fonte
          responseMessage = `Entendi! O equipamento não liga de jeito nenhum. Vamos focar na alimentação. 🔌\n\nPor favor, teste:\n\n1️⃣ Conecte em **outra tomada** (de preferência sem filtro/benjamim)\n2️⃣ Verifique se a **fonte original** está bem conectada no roteador e na tomada\n3️⃣ Confira o **botão Power** (se houver) e o **cabo de energia**\n\nSe mesmo assim **não ligar**, me avise aqui que eu **abro um atendimento prioritário** para troca/visita técnica.`;
        } else if (saysOff) {
          // 🔌 FLUXO: Luzes apagadas = Verificação de energia (CENÁRIO A - PARTE 1)
          responseMessage = `Entendi! Se as luzes do equipamento não estão acesas, vamos verificar a energia. 🔌\n\nPor favor, confira:\n\n1️⃣ **Equipamento está ligado na tomada?** ✅\n2️⃣ **Fonte de energia está conectada?** 🔌  \n3️⃣ **Botão Power está ligado (se houver)?** 💡\n4️⃣ **Tem energia elétrica no local?** Teste com outro aparelho\n\nMe avise após verificar!`;
        } else if (hasRedLightBlinking) {
          // 🔴 FLUXO ENERGIA: Cliente confirmou luz vermelha LOS/PON (CENÁRIO A - PARTE 3)
          responseMessage = `Perfeito! Essa luz vermelha indica problema no sinal da fibra óptica. 🔴\n\nVou te enviar as instruções para tentar resolver:\n\n⚠️ **ATENÇÃO ao manusear:**\n- Segure o conector pela **BASE** (não pelo cabo)\n- Retire com **cuidado** (não force)\n- **Não dobre** o cabo\n- Reconecte **firmemente** até ouvir um 'click'\n\n📋 **Passo a passo:**\n1️⃣ Localize o conector **VERDE** (cabo de fibra)\n2️⃣ **Retire** com cuidado o conector que está encaixado\n3️⃣ **Recoloque firmemente** - empurre o conector de volta até ouvir um 'click'\n4️⃣ Aguarde **1 minuto** para sincronização\n5️⃣ Veja se a luz **VERMELHA** parou de **PISCAR** e ficou **VERDE FIXA**\n\nMe avise quando terminar! 🔧`;
        } else if (noRedLight) {
          // Cliente confirmou que NÃO tem luz vermelha piscando - abrir atendimento
          responseMessage = `Ok! Se não há luz vermelha mas o equipamento continua sem conexão, vou abrir um atendimento técnico prioritário. 🔧\n\nNossa equipe vai entrar em contato para agendar uma visita e resolver isso o mais rápido possível.\n\nPreciso de mais alguma coisa agora?`;
        } else if (fiberReconnected) {
          // Cliente concluiu manipulação do conector - verificar resultado
          responseMessage = `Perfeito! Aguarde mais **1 minuto** para sincronização completa. ⏳\n\nMe diga: a luz **VERMELHA** parou de **PISCAR** e ficou **VERDE FIXA**?\n\nE você consegue navegar agora?`;
        } else if (saysPowerAvailable) {
          // 🔌 FLUXO ENERGIA: Cliente confirmou energia OK (CENÁRIO A - PARTE 2)
          responseMessage = `Ok! O equipamento está com energia. 💡\n\nAgora verifique se há uma **LUZ VERMELHA** chamada 'LOS' ou 'PON' **PISCANDO** no equipamento.\n\nVocê está vendo essa luz vermelha piscando? 🔴`;
        } else if (rebootCompleted) {
          // Cliente terminou o reboot manual
          responseMessage = `Perfeito! Aguarde mais 1 minuto para sincronização completa. ⏳\n\nEnquanto isso, me diga: **as luzes estabilizaram?** \n\n💡 **PON/LOS** - está verde fixo?  \n⚡ **POWER** - está verde fixo?`;
        } else if ((mentionsLight && !saysOff) || /aces[ao]s?|acesas|acessas/.test(currentMessage)) {
          // Luzes acesas mas sem internet
          responseMessage = "Ok, as luzes estão acesas. Vamos fazer mais alguns testes! 🔍\n\nComo estão as luzes especificamente?\n\n💡 LOS (vermelha) - Indica problema de sinal\n💚 PON/INTERNET (verde) - Indica conexão OK\n⚡ POWER (verde) - Indica energia OK\n\nQuais luzes estão acesas e quais não estão?";
        } else if (currentMessage.includes("sem internet")) {
          // Cliente acabou de reportar o problema - começar troubleshooting
          responseMessage = "Entendi, você está sem internet. Vamos resolver isso! 🔧\n\nPrimeiro passo: As luzes do seu equipamento estão acesas?\n\n💡 Me diga especialmente sobre a luz PON/LOS - está verde ou vermelha?";
        } else {
          responseMessage = "Certo. Vamos continuar o diagnóstico! 🔧\n\nVocê está conectado por cabo de rede ou Wi‑Fi?\n\nIsso vai me ajudar a identificar se o problema é no equipamento ou na conexão sem fio.";
        }

      } else if (conversationContext.includes("lento") || conversationContext.includes("devagar")) {
        // Cliente com internet lenta
        
        // Se enviou imagem de teste de velocidade, usar análise
        if (imageAnalysis) {
          responseMessage = `Vi o seu teste de velocidade! 📊\n\n${imageAnalysis}\n\nBaseado nesses valores, ${
            imageAnalysis.toLowerCase().includes('mbps') && parseInt(imageAnalysis.match(/\d+/)?.[0] || '0') < 100 
              ? "está abaixo do esperado. Vamos investigar!\n\n🔍 Você está conectado por cabo ou Wi-Fi?\n\nSe for Wi-Fi, tente se conectar por cabo para compararmos."
              : "vamos verificar se há algo consumindo banda.\n\n💡 Quantos dispositivos estão conectados agora?\nAlgum fazendo download/streaming?"
          }`;
        } else {
          responseMessage = "Certo, sobre a lentidão... Vamos fazer alguns testes!\n\n📊 Pode fazer um teste de velocidade em www.fast.com e me passar o resultado?\n\nEnquanto isso, me diga:\n1. Está conectado por cabo ou Wi-Fi?\n2. Quantos dispositivos estão conectados agora?";
        }
      } else if (imageAnalysis) {
        // Cliente enviou imagem mas contexto não é claro - usar análise da imagem
        responseMessage = `Vi a imagem que você enviou! 📷\n\n${imageAnalysis}\n\nBaseado nisso, como posso te ajudar?`;
      } else {
        // Resposta genérica contextualizada
        responseMessage = "Entendi! Vou te ajudar com isso. 🔧\n\nPode me dar mais detalhes sobre o que está acontecendo? Quanto mais informações você me passar, mais rápido conseguimos resolver!";
      }
      
      // Inserir mensagem apenas se não foi inserida no Cenário A
      if (scenario !== "A" && responseMessage) {
        const { error: insertErr } = await supabase.from("conversation_messages").insert({
          conversation_id,
          sender_type: "agent",
          sender_name: "Luan Silva",
          content: responseMessage,
          ai_suggestion: false
        });
        
        if (insertErr) {
          logger.error("Erro ao inserir mensagem de continuação", { error: insertErr.message });
          throw insertErr;
        }

        logger.info("Luan respondeu ao cliente no fluxo genérico");
      }
    }

    return new Response(
      JSON.stringify({ 
        ok: true, 
        agent: "support_tech",
        message: responseMessage
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    return handleEdgeFunctionError(error, "support-tech-agent");
  }
});
