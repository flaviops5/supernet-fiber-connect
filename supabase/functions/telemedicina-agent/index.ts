// ============================================
// TELEMEDICINA AGENT - Streaming com proteção máxima
// ============================================
// Nota: Esta função USA STREAMING e não pode usar base-handler completo.
// Proteção aplicada: CORS + error handler + metrics + redação PII
// Rate limiting não é aplicado pois é chat interativo

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { redactPII } from '../_shared/pii-redaction.ts';
import { handleEdgeFunctionError } from '../_shared/error-handler.ts';
import { recordMetric } from '../_shared/metrics-helper.ts';
import { createLogger } from '../_shared/structured-logger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  const startTime = Date.now();
  const logger = createLogger('telemedicina-agent', req);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    
    const correlationId = req.headers.get('x-correlation-id') || crypto.randomUUID() || `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    logger.info('Processing request', { correlationId });

    const systemPrompt = `Você é um assistente especializado em telemedicina da SUPERNET FIBRA.

Seu papel é:
- Explicar o que é telemedicina e como funciona o serviço
- Detalhar os benefícios: consultas 24h, sem sair de casa, especialistas disponíveis, receitas digitais
- Apresentar os planos disponíveis:
  * Plano Individual: R$ 49,90/mês - 3 consultas/mês + descontos em exames
  * Plano Familiar (até 4 pessoas): R$ 129,90/mês - 12 consultas/mês + pronto atendimento
  * Plano Premium: R$ 199,90/mês - consultas ilimitadas + especialistas + descontos
- Explicar as especialidades disponíveis: clínico geral, pediatria, psicologia, dermatologia, nutrição, ginecologia
- Esclarecer sobre funcionamento: atendimento por vídeo, áudio ou chat, disponível 24/7
- Informar sobre receitas digitais com validade nacional e descontos em farmácias parceiras

IMPORTANTE: 
- Você NÃO é médico e NÃO pode dar diagnósticos ou prescrever medicamentos
- Para questões médicas, oriente o usuário a agendar uma consulta através do serviço
- Seja empático e acolhedor, principalmente em questões de saúde
- Em casos de emergência, oriente a buscar atendimento presencial imediato (192/SAMU)

Se o cliente demonstrar interesse, oriente-o a contratar pelo WhatsApp: 11 99999-9999 ou através do site.

Mantenha respostas concisas e objetivas (máximo 3-4 parágrafos).`;

    logger.debug('Chamando Lovable AI - streaming', { correlationId });
    
    // For streaming, we need to use fetch directly but with error handling
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
        "X-Correlation-ID": correlationId,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.map((m: { role: string; content: string }) => ({
            ...m,
            content: m.role === 'user' ? redactPII(m.content, 'ai') : m.content
          })),
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Lovable AI error', new Error(errorText), { 
        correlationId, 
        status: response.status 
      });
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em instantes." }), 
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Serviço temporariamente indisponível." }), 
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Erro ao processar sua solicitação." }), 
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    logger.info('Streaming iniciado', { correlationId });
    
    // Registrar métrica de sucesso (streaming iniciado)
    recordMetric({
      agent_name: 'telemedicina-agent',
      action_type: 'chat_stream',
      success: true,
      duration_ms: Date.now() - startTime
    }).catch(console.error);
    
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream", "X-Correlation-ID": correlationId },
    });
  } catch (error) {
    logger.error('Chat error', 
      error instanceof Error ? error : new Error(String(error))
    );
    
    // Registrar métrica de erro
    recordMetric({
      agent_name: 'telemedicina-agent',
      action_type: 'chat_stream',
      success: false,
      duration_ms: Date.now() - startTime,
      error_message: error instanceof Error ? error.message : 'Unknown error'
    }).catch(console.error);
    
    return handleEdgeFunctionError(error, 'telemedicina-agent');
  }
});
