import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, Code2, FileText, Eye, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const HPFuncoes = () => {
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [selectedCode, setSelectedCode] = useState<{ name: string; code: string } | null>(null);
  const [loadingCode, setLoadingCode] = useState(false);
  const [copiedFile, setCopiedFile] = useState<string | null>(null);

  const OMNICHANNEL_FILES = [
    {
      name: '_shared/ixc-client.ts',
      description: 'Cliente IXC com retry logic e circuit breaker para resiliência',
      code: `// ============================================
// IXC CLIENT - Retry Logic + Circuit Breaker
// ============================================

import { addHMACHeaders } from './hmac.ts';

interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: 'closed' | 'open' | 'half-open';
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2
};

// Circuit breaker global state (em memória - simples)
const circuitBreaker: CircuitBreakerState = {
  failures: 0,
  lastFailureTime: 0,
  state: 'closed'
};

const CIRCUIT_BREAKER_THRESHOLD = 5; // Falhas consecutivas
const CIRCUIT_BREAKER_TIMEOUT = 60000; // 1 minuto

/**
 * Delay helper para retry
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Verifica estado do circuit breaker
 */
function checkCircuitBreaker(): { canProceed: boolean; reason?: string } {
  const now = Date.now();
  
  if (circuitBreaker.state === 'open') {
    // Verificar se deve tentar half-open
    if (now - circuitBreaker.lastFailureTime > CIRCUIT_BREAKER_TIMEOUT) {
      circuitBreaker.state = 'half-open';
      console.log('🔄 Circuit breaker: HALF-OPEN');
      return { canProceed: true };
    }
    
    return { 
      canProceed: false, 
      reason: \`Circuit breaker OPEN - aguarde \${Math.ceil((CIRCUIT_BREAKER_TIMEOUT - (now - circuitBreaker.lastFailureTime)) / 1000)}s\` 
    };
  }
  
  return { canProceed: true };
}

/**
 * Registra sucesso no circuit breaker
 */
function recordSuccess() {
  if (circuitBreaker.state === 'half-open') {
    circuitBreaker.state = 'closed';
    circuitBreaker.failures = 0;
    console.log('✅ Circuit breaker: CLOSED');
  }
}

/**
 * Registra falha no circuit breaker
 */
function recordFailure() {
  circuitBreaker.failures++;
  circuitBreaker.lastFailureTime = Date.now();
  
  if (circuitBreaker.failures >= CIRCUIT_BREAKER_THRESHOLD) {
    circuitBreaker.state = 'open';
    console.log('🚨 Circuit breaker: OPEN');
  }
}

/**
 * Chamada IXC com retry e circuit breaker
 */
export async function callIxcWithRetry(
  proxyUrl: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: any,
  query?: string,
  config: Partial<RetryConfig> = {}
): Promise<any> {
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  
  // Verificar circuit breaker
  const circuitCheck = checkCircuitBreaker();
  if (!circuitCheck.canProceed) {
    throw new Error(circuitCheck.reason);
  }
  
  let lastError: Error | null = null;
  let delayMs = retryConfig.initialDelayMs;
  
  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      console.log(\`🔄 IXC call attempt \${attempt + 1}/\${retryConfig.maxRetries + 1}: \${method} \${path}\`);
      
      const startTime = Date.now();
      const requestBody = { method, path, body, query };

      // Assinatura HMAC se secret configurado
      const HMAC_SECRET = Deno.env.get('HMAC_SHARED_SECRET');
      const signedHeaders = HMAC_SECRET
        ? await addHMACHeaders(requestBody, HMAC_SECRET)
        : { 'Content-Type': 'application/json' };

      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: signedHeaders,
        body: JSON.stringify(requestBody)
      });
      
      const duration = Date.now() - startTime;
      console.log(\`⏱️ IXC call duration: \${duration}ms\`);
      
      if (!response.ok) {
        const errorText = await response.text();
        const isConfigError = response.status === 401 || response.status === 403 || response.status === 404;
        const errorMsg = \`IXC Proxy HTTP \${response.status}: \${errorText}\`;
        
        // Não fazer retry em erros de configuração
        if (isConfigError) {
          console.error(\`❌ Configuration error detected - aborting retries\`);
          throw new Error(\`[NO_RETRY] \${errorMsg}\`);
        }
        
        throw new Error(errorMsg);
      }
      
      const responseText = await response.text();
      
      // Detectar resposta HTML (erro de configuração/autenticação)
      if (responseText.trim().startsWith('<')) {
        const isLoginPage = responseText.includes('login') || responseText.includes('autenticar');
        const errorMsg = isLoginPage 
          ? 'IXC retornou página de login - verifique URL, usuário e senha do IXC'
          : 'IXC retornou HTML ao invés de JSON - verifique a configuração da API';
        
        console.error(\`❌ HTML response detected - aborting retries\`);
        throw new Error(\`[NO_RETRY] \${errorMsg}\`);
      }
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (jsonError) {
        const preview = responseText.substring(0, 200);
        throw new Error(\`[NO_RETRY] Resposta inválida do IXC: \${preview}\`);
      }
      
      if (!data.ok) {
        throw new Error(\`IXC Error: \${data.error || 'Unknown error'}\`);
      }
      
      // ✅ SUCESSO
      recordSuccess();
      console.log(\`✅ IXC call successful on attempt \${attempt + 1}\`);
      return data;
      
    } catch (error) {
      lastError = error as Error;
      console.error(\`❌ IXC call failed on attempt \${attempt + 1}:\`, lastError.message);
      
      // Se for erro de configuração (marcado com [NO_RETRY]), abortar imediatamente
      if (lastError.message.includes('[NO_RETRY]')) {
        const cleanMessage = lastError.message.replace('[NO_RETRY] ', '');
        throw new Error(cleanMessage);
      }
      
      // Se for último retry, não esperar
      if (attempt < retryConfig.maxRetries) {
        console.log(\`⏳ Waiting \${delayMs}ms before retry...\`);
        await delay(delayMs);
        
        // Exponential backoff
        delayMs = Math.min(delayMs * retryConfig.backoffMultiplier, retryConfig.maxDelayMs);
      }
    }
  }
  
  // ❌ FALHA após todos os retries
  recordFailure();
  throw new Error(\`IXC call failed after \${retryConfig.maxRetries + 1} attempts: \${lastError?.message}\`);
}

/**
 * Status do circuit breaker (para monitoramento)
 */
export function getCircuitBreakerStatus() {
  return {
    state: circuitBreaker.state,
    failures: circuitBreaker.failures,
    lastFailureTime: circuitBreaker.lastFailureTime,
    threshold: CIRCUIT_BREAKER_THRESHOLD,
    timeoutMs: CIRCUIT_BREAKER_TIMEOUT
  };
}

/**
 * Reset manual do circuit breaker (para emergências)
 */
export function resetCircuitBreaker() {
  circuitBreaker.failures = 0;
  circuitBreaker.lastFailureTime = 0;
  circuitBreaker.state = 'closed';
  console.log('🔧 Circuit breaker manually reset to CLOSED');
}`
    },
    {
      name: 'check-escalation/index.ts',
      description: 'Verifica regras de escalonamento de conversas entre departamentos',
      code: `import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EscalationRule {
  id: string;
  from_department: string;
  to_department: string;
  priority: number;
  conditions: {
    keywords?: string[];
  };
  enabled: boolean;
  auto_escalate_after_minutes?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversation_id, message_content, current_department } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar configurações de escalonamento
    const { data: settings, error: settingsError } = await supabase
      .from('escalation_settings')
      .select('*')
      .single();

    if (settingsError || !settings?.enabled) {
      return new Response(
        JSON.stringify({ should_escalate: false, reason: 'Escalation disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar regras ativas para o departamento atual
    const { data: rules, error: rulesError } = await supabase
      .from('escalation_rules')
      .select('*')
      .eq('from_department', current_department)
      .eq('enabled', true)
      .order('priority', { ascending: true });

    if (rulesError || !rules || rules.length === 0) {
      return new Response(
        JSON.stringify({ should_escalate: false, reason: 'No rules found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const messageLower = message_content.toLowerCase();

    // Verificar cada regra
    for (const rule of rules as EscalationRule[]) {
      const keywords = rule.conditions?.keywords || [];
      
      // Verificar se alguma palavra-chave foi encontrada
      const keywordMatch = keywords.some(keyword => 
        messageLower.includes(keyword.toLowerCase())
      );

      if (keywordMatch) {
        // Buscar agente disponível no departamento de destino
        const { data: availableAgents } = await supabase
          .rpc('get_available_agents_for_department', {
            dept: rule.to_department,
            include_universal: true
          });

        if (availableAgents && availableAgents.length > 0) {
          const targetAgent = availableAgents[0];

          // Registrar escalonamento no histórico
          await supabase
            .from('escalation_history')
            .insert({
              conversation_id,
              from_department: current_department,
              to_department: rule.to_department,
              to_agent_id: targetAgent.user_id,
              rule_id: rule.id,
              escalation_type: settings.mode,
              reason: rule.description,
              customer_notified: settings.mode === 'explicit'
            });

          return new Response(
            JSON.stringify({
              should_escalate: true,
              escalation_mode: settings.mode,
              target_department: rule.to_department,
              target_agent_id: targetAgent.user_id,
              rule_description: rule.description,
              matched_keywords: keywords.filter(k => messageLower.includes(k.toLowerCase()))
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    return new Response(
      JSON.stringify({ should_escalate: false, reason: 'No matching rules' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error checking escalation:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});`
    },
    {
      name: 'summarize-conversation/index.ts',
      description: 'Gera resumo estruturado de conversas usando IA (Gemini 2.5 Flash)',
      code: `import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversationId } = await req.json();
    
    if (!conversationId) {
      throw new Error('conversationId é obrigatório');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar conversa e mensagens
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (convError) throw convError;

    const { data: messages, error: msgError } = await supabase
      .from('conversation_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (msgError) throw msgError;

    // Construir contexto para a IA
    const messageHistory = messages.map(m => 
      \`[\${m.sender_type === 'customer' ? 'Cliente' : 'Agente'}] \${m.sender_name}: \${m.content}\`
    ).join('\\n');

    const systemPrompt = \`Você é um assistente especializado em resumir conversas de atendimento ao cliente.
Analise a conversa e crie um resumo estruturado seguindo exatamente este formato:

**RESUMO:**
[Breve resumo em 1-2 frases do que foi tratado]

**MOTIVO DO CONTATO:**
[Principal razão do cliente entrar em contato]

**RESOLUÇÃO:**
[Como a questão foi tratada/resolvida]

**TAGS SUGERIDAS:**
[Liste 3-5 tags relevantes separadas por vírgula]

**PRÓXIMAS AÇÕES:**
[Se houver alguma ação pendente ou follow-up necessário]

Seja objetivo e profissional.\`;

    const prompt = \`Dados da conversa:
- Cliente: \${conversation.customer_name}
- Canal: \${conversation.channel}
- Departamento: \${conversation.department || 'N/A'}
- Status: \${conversation.status}

Mensagens:
\${messageHistory}\`;

    // Chamar API Lovable
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${lovableApiKey}\`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        max_completion_tokens: 1000
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(\`AI API error: \${aiResponse.status}\`);
    }

    const aiData = await aiResponse.json();
    const summary = aiData.choices[0].message.content;

    // Salvar resumo no metadata da conversa
    const { error: updateError } = await supabase
      .from('conversations')
      .update({
        metadata: {
          ...conversation.metadata,
          ai_summary: summary,
          summarized_at: new Date().toISOString()
        }
      })
      .eq('id', conversationId);

    if (updateError) throw updateError;

    console.log('Resumo gerado com sucesso para conversa:', conversationId);

    return new Response(
      JSON.stringify({ summary }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro ao resumir conversa:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});`
    },
    {
      name: 'whatsapp-webhook/index.ts',
      description: 'Webhook que recebe mensagens do WhatsApp',
      code: `// Arquivo completo do webhook que processa mensagens do WhatsApp
// Este é o ponto de entrada para todas as mensagens recebidas

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const webhookData = await req.json();
    const eventType = webhookData.event;

    // Processar apenas mensagens recebidas
    if (eventType === 'messages.upsert') {
      const messageData = webhookData.data;
      
      // Ignorar mensagens enviadas por nós
      if (messageData.key?.fromMe) {
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const customerPhone = messageData.key?.remoteJid?.replace('@s.whatsapp.net', '');
      const messageContent = messageData.message?.conversation || 
                           messageData.message?.extendedTextMessage?.text;

      // Buscar ou criar conversa
      const { data: conversation } = await supabase
        .from('conversations')
        .select('*')
        .eq('customer_phone', customerPhone)
        .eq('status', 'active')
        .maybeSingle();

      let conversationId = conversation?.id;

      if (!conversationId) {
        const { data: newConv } = await supabase
          .from('conversations')
          .insert({ customer_phone: customerPhone, status: 'active' })
          .select()
          .single();
        conversationId = newConv.id;
      }

      // Salvar mensagem
      await supabase
        .from('conversation_messages')
        .insert({
          conversation_id: conversationId,
          sender_type: 'client',
          content: messageContent
        });

      // Chamar routing-agent
      const { data: routingData } = await supabase.functions.invoke('routing-agent', {
        body: { message: messageContent, conversationId }
      });

      // Enviar resposta
      if (routingData?.message) {
        await supabase.functions.invoke('send-whatsapp-message', {
          body: { phone: customerPhone, message: routingData.message }
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});`
    },
    {
      name: 'routing-agent/index.ts',
      description: 'Agente de roteamento inteligente (1627 linhas)',
      code: `// Este arquivo contém 1627 linhas com toda a lógica de roteamento
// Inclui: validação de CPF, rate limiting, consulta IXC, 
// detecção de quedas em massa, histórico de contatos, e muito mais

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { checkRateLimit, formatBlockedTime } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationId, context } = await req.json();
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Buscar configuração do agente
    const { data: config } = await supabase
      .from('agent_configurations')
      .select('*')
      .eq('agent_type', 'routing')
      .eq('is_active', true)
      .single();

    // Buscar conversa para verificar CPF
    const { data: conversation } = await supabase
      .from('conversations')
      .select('customer_cpf, customer_name, ixc_client_id, metadata')
      .eq('id', conversationId)
      .single();

    // Validar CPF no formato
    const cpfMatch = message.match(/\\b(\\d{3}\\.?\\d{3}\\.?\\d{3}-?\\d{2})\\b/);
    
    // Se não tem CPF, solicitar
    if (!conversation?.customer_cpf && !cpfMatch) {
      return new Response(
        JSON.stringify({
          agent: 'routing',
          message: 'Olá! Sou a Cloé Martins 😊\\n\\nPara começarmos, você poderia me informar seu CPF?',
          requiresCPF: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Se CPF foi fornecido, identificar cliente
    if (cpfMatch && !conversation?.customer_cpf) {
      const cpf = cpfMatch[1].replace(/\\D/g, '');
      
      // Aplicar rate limiting
      const rateLimitCheck = await checkRateLimit(cpf);
      if (!rateLimitCheck.allowed) {
        return new Response(
          JSON.stringify({
            agent: 'routing',
            message: 'Você atingiu o limite de mensagens. Aguarde alguns minutos.',
            rateLimited: true
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Consultar IXC
      const { data: ixcResult } = await supabase.functions.invoke('ixc-integration', {
        body: { action: 'searchCustomers', params: { query: cpf } }
      });

      if (ixcResult?.success && ixcResult.data?.length > 0) {
        const customer = ixcResult.data[0];
        
        // Buscar status do cliente
        const { data: statusResult } = await supabase.functions.invoke('ixc-integration', {
          body: { action: 'getCustomerStatus', params: { id: customer.id } }
        });

        // Atualizar conversa com dados do cliente
        await supabase
          .from('conversations')
          .update({
            customer_cpf: cpf,
            customer_name: customer.razao,
            customer_email: customer.email,
            ixc_client_id: customer.id,
            metadata: { cliente_status: statusResult?.data }
          })
          .eq('id', conversationId);

        // Verificar se está bloqueado
        const clientStatus = statusResult?.data;
        if (clientStatus?.contracts?.some((c: any) => 
          ['CA', 'CM', 'CB', 'FA'].includes(c.status_internet)
        )) {
          const protocol = \`PROT-\${Date.now()}-\${Math.random().toString(36).substr(2, 9)}\`;
          return new Response(
            JSON.stringify({
              agent: 'support_financial',
              message: \`Perfeito! Transferindo para Suporte Financeiro...\\n\\n📋 Protocolo: \${protocol}\`,
              protocol,
              autoRouted: true
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Verificar se está offline
        if (!clientStatus?.isOnline) {
          const protocol = \`PROT-\${Date.now()}-\${Math.random().toString(36).substr(2, 9)}\`;
          return new Response(
            JSON.stringify({
              agent: 'support_tech',
              message: \`Transferindo para Suporte Técnico...\\n\\n📋 Protocolo: \${protocol}\`,
              protocol,
              autoRouted: true
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({
            agent: 'routing',
            message: 'Ótimo! Está tudo certo com sua conexão. Como posso ajudar?',
            customerIdentified: true
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Cliente novo
      return new Response(
        JSON.stringify({
          agent: 'sales',
          message: 'Vejo que você ainda não é nosso cliente! Vou transferir para Vendas.',
          autoRouted: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Roteamento baseado em IA
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const routingResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${LOVABLE_API_KEY}\`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: config.system_prompt },
          { role: 'user', content: message }
        ],
        temperature: config.temperature,
        max_tokens: config.max_tokens,
      }),
    });

    const routingData = await routingResponse.json();
    const decision = JSON.parse(routingData.choices[0].message.content);

    return new Response(
      JSON.stringify({
        agent: decision.agent,
        message: decision.message,
        confidence: decision.confidence
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// NOTA: Este é um resumo. O arquivo completo tem 1627 linhas.`
    },
    {
      name: 'routing-agent/config.ts',
      description: 'Configuração do agente de roteamento',
      code: `/**
 * Routing Agent - Configuration
 */

export const ROUTING_AGENT_CONFIG = {
  // Model settings
  model: "gpt-4o-mini",
  temperature: 0.3, // Baixa temperatura para decisões consistentes
  maxTokens: 500, // Resposta curta (apenas JSON)
  
  // Agent behavior
  maxMessagesInContext: 5, // Apenas contexto recente
  enableToolCalling: false,
  
  // Routing rules
  defaultAgent: "sales-agent",
  minConfidenceThreshold: 0.4,
  
  // Agents disponíveis
  availableAgents: [
    "sales-agent",
    "support-tech-agent",
    "support-financial-agent",
    "automacao-agent",
    "telemedicina-agent"
  ],
  
  // Department mapping
  departmentMapping: {
    "sales-agent": "comercial",
    "support-tech-agent": "tecnico",
    "support-financial-agent": "financeiro",
    "automacao-agent": "tecnico",
    "telemedicina-agent": "comercial"
  },
  
  // Priority mapping
  agentPriority: {
    "support-tech-agent": 3,
    "support-financial-agent": 2,
    "sales-agent": 1,
    "automacao-agent": 1,
    "telemedicina-agent": 1
  },
  
  // Timeouts
  responseTimeout: 10000,
  toolTimeout: 5000,
};`
    },
    {
      name: 'routing-agent/prompts.ts',
      description: 'Prompts do sistema para roteamento',
      code: `/**
 * Routing Agent - System Prompts & Instructions
 */

export const ROUTING_AGENT_SYSTEM_PROMPT = \`Você é o Agente de Roteamento da SUPERNET FIBRA.

## 🎯 OBJETIVO PRINCIPAL
Identificar rapidamente a intenção do cliente e rotear para o agente apropriado.

## 🔄 PROCESSO DE ROTEAMENTO

### VENDAS (sales-agent)
- Palavras: "contratar", "planos", "valores", "cobertura"
- Exemplos: "Quais são os planos?", "Quanto custa?"

### SUPORTE TÉCNICO (support-tech-agent)
- Palavras: "internet caiu", "lenta", "não conecta"
- Exemplos: "Internet está lenta", "Wi-Fi não funciona"

### SUPORTE FINANCEIRO (support-financial-agent)
- Palavras: "boleto", "fatura", "pagamento", "negociar"
- Exemplos: "Quero negociar débito", "Segunda via?"

### LOGÍSTICA (logistics-agent)
- Palavras: "agendar", "instalação", "técnico"
- Exemplos: "Agendar instalação", "Quando vem?"

### AUTOMAÇÃO (automacao-agent)
- Palavras: "automação", "alexa", "câmeras"
- Exemplos: "Vendem câmeras?", "Smart home?"

### TELEMEDICINA (telemedicina-agent)
- Palavras: "consulta", "médico", "saúde"
- Exemplos: "Agendar consulta?", "Especialidades?"

### Resposta JSON
\\\`\\\`\\\`json
{
  "agent": "nome-do-agente",
  "confidence": 0.0-1.0,
  "reason": "Justificativa"
}
\\\`\\\`\\\`

## ⚠️ REGRAS
1. SEMPRE JSON válido
2. NUNCA resolver - apenas rotear
3. SEMPRE confidence honesto
4. Se dúvida → sales-agent\`;

export const ROUTING_AGENT_ERROR_MESSAGE = \`Erro ao processar roteamento.\`;`
    },
    {
      name: 'send-whatsapp-message/index.ts',
      description: 'Envia mensagens via WhatsApp',
      code: `import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { phone, message, instanceName = 'SDR2' } = body;
    
    if (!phone || !message) {
      return new Response(
        JSON.stringify({ error: 'Phone and message are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const apiKey = Deno.env.get('EVOLUTION_API_KEY');
    let baseUrl = Deno.env.get('EVOLUTION_API_BASE_URL');

    if (baseUrl?.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }

    if (!apiKey || !baseUrl) {
      return new Response(
        JSON.stringify({ error: 'Evolution API not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Formatar telefone
    const cleanPhone = phone.replace(/\\D/g, '');
    const formattedPhone = cleanPhone.includes('@') 
      ? cleanPhone 
      : \`\${cleanPhone}@s.whatsapp.net\`;

    // Enviar via Evolution API
    const response = await fetch(\`\${baseUrl}/message/sendText/\${instanceName}\`, {
      method: 'POST',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        number: formattedPhone,
        text: message,
        delay: 1200
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(
        JSON.stringify({ error: \`Evolution API error: \${response.status}\` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: response.status }
      );
    }

    const data = await response.json();

    return new Response(
      JSON.stringify({
        status: 'success',
        message: 'Message sent',
        data: {
          id: data.key?.id || data.messageId,
          status: data.status || 'SENT'
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});`
    },
  ];

  const copyCode = (fileName: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedFile(fileName);
    toast.success(`Código de ${fileName} copiado!`);
    setTimeout(() => setCopiedFile(null), 2000);
  };

  const downloadFile = (fileName: string, code: string) => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${fileName} baixado!`);
  };

  const viewCode = async (functionName: string) => {
    setLoadingCode(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-function-code', {
        body: { functionName }
      });

      if (!error && data?.code) {
        setSelectedCode({ name: functionName, code: data.code });
        return;
      }

      // Fallback: carregar diretamente do bundle usando import.meta.glob com ?raw
      const files = import.meta.glob('../../supabase/functions/*/index.ts', { as: 'raw' });
      const path = `../../supabase/functions/${functionName}/index.ts`;
      const loader = files[path] as undefined | (() => Promise<string>);
      if (loader) {
        const code = await loader();
        setSelectedCode({ name: functionName, code });
        return;
      }

      throw new Error('Código da função não encontrado');
    } catch (error) {
      console.error('Error loading code:', error);
      toast.error("Erro ao carregar código da função");
    } finally {
      setLoadingCode(false);
    }
  };

  const functionsData = {
    agents: [
      { name: "automacao-agent", desc: "Agente de automação residencial (Google Home, Alexa, dispositivos inteligentes)" },
      { name: "logistics-agent", desc: "Coordenação de agendamentos de instalação" },
      { name: "routing-agent", desc: "Roteamento inteligente de conversas para agentes especializados" },
      { name: "sales-agent", desc: "Vendas e contratação de planos de internet" },
      { name: "support-financial-agent", desc: "Suporte financeiro, faturas e negociação de débitos" },
      { name: "support-tech-agent", desc: "Suporte técnico e diagnóstico de problemas de conexão" },
    ],
    ixc: [
      { name: "ixc-proxy", desc: "Proxy centralizado com cache, rate limiting e circuit breaker" },
      { name: "ixc-integration", desc: "Interface principal para operações IXC (clientes, faturas, contratos)" },
      { name: "ixc-evolution-proxy", desc: "Proxy para Evolution API integrada ao IXC" },
      { name: "ixc-count-clients", desc: "Contagem de clientes ativos no sistema IXC" },
      { name: "ixc-discover-gpon-endpoints", desc: "Descoberta automática de endpoints GPON" },
      { name: "ixc-endpoints-health", desc: "Verificação de saúde dos endpoints IXC" },
      { name: "ixc-financial-analytics", desc: "Análise de dados financeiros e receitas" },
      { name: "ixc-list-contracts", desc: "Listagem de contratos de clientes" },
      { name: "ixc-list-plans", desc: "Sincronização de planos disponíveis" },
      { name: "ixc-list-subjects", desc: "Listagem de assuntos/categorias de atendimento" },
      { name: "ixc-pon-status", desc: "Monitoramento de status de portas PON (GPON)" },
      { name: "ixc-radio-status", desc: "Monitoramento de status de rádios e torres" },
      { name: "ixc-revenue-stats", desc: "Estatísticas detalhadas de receita" },
      { name: "ixc-sync-plans", desc: "Sincronização de planos IXC para Supabase" },
      { name: "sync-ixc-documentation", desc: "Sincronização de documentação da API IXC" },
    ],
    whatsapp: [
      { name: "whatsapp-webhook", desc: "Recebe e processa mensagens do WhatsApp via Evolution API" },
      { name: "send-whatsapp-message", desc: "Envia mensagens via WhatsApp (texto, mídia, templates)" },
      { name: "voice-to-text", desc: "Transcrição de áudios do WhatsApp para texto" },
      { name: "send-locaweb-email", desc: "Envio de emails via API Locaweb" },
    ],
    automation: [
      { name: "auto-send-overdue-invoices", desc: "Envio automático de faturas vencidas via WhatsApp" },
      { name: "auto-reboot-frozen-equipment", desc: "Reboot automático de equipamentos congelados" },
      { name: "check-due-invoices", desc: "Verificação de faturas próximas do vencimento" },
      { name: "check-reboot-candidates", desc: "Identificação de equipamentos candidatos a reboot" },
      { name: "check-escalation", desc: "Verificação de conversas que precisam escalação" },
      { name: "retry-failed-actions", desc: "Reprocessamento de ações falhas (Dead Letter Queue)" },
      { name: "network-maintenance-executor", desc: "Execução de manutenções programadas na rede" },
    ],
    monitoring: [
      { name: "detect-mass-outage", desc: "Detecção de quedas massivas de conexão" },
      { name: "metrics-collector", desc: "Coleta de métricas de desempenho do sistema" },
      { name: "system-health", desc: "Health check de infraestrutura e componentes" },
      { name: "check-lovable-ai-config", desc: "Verificação de configuração do Lovable AI Gateway" },
      { name: "reset-circuit-breaker", desc: "Reset manual de circuit breakers" },
    ],
    knowledge: [
      { name: "sync-chatbot-knowledge", desc: "Sincronização de conhecimento para chatbot" },
      { name: "sync-github-docs", desc: "Importação de documentação do GitHub" },
      { name: "sync-knowledge-docs", desc: "Sincronização de docs markdown para base vetorial" },
      { name: "migrate-knowledge-batch", desc: "Migração em lote para índice vetorial" },
      { name: "migrate-knowledge-full", desc: "Migração completa com embeddings OpenAI" },
    ],
    ai: [
      { name: "corporate-ai-chat", desc: "Chat corporativo com IA usando RAG" },
      { name: "ai-auto-tag", desc: "Classificação automática de conversas com tags" },
      { name: "ai-text-review", desc: "Revisão de textos antes do envio" },
      { name: "ai-suggest-reply", desc: "Sugestões de resposta para agentes" },
      { name: "site-analyzer-agent", desc: "Análise e extração de informações de sites" },
    ],
    contracts: [
      { name: "generate-contract-pdf", desc: "Geração de PDFs de contratos personalizados" },
      { name: "process-contract", desc: "Processamento de assinaturas e contratos" },
    ],
    cep: [
      { name: "chatbot-cep-lookup", desc: "Verificação de cobertura por CEP" },
      { name: "process-cep-import", desc: "Importação em lote de CEPs de cobertura" },
    ],
    payments: [
      { name: "send-payment-to-customer", desc: "Envio de boleto/PIX para clientes" },
    ],
    projections: [
      { name: "calculate-projections", desc: "Cálculo de projeções de fluxo de caixa" },
    ],
    nps: [
      { name: "nps-webhook", desc: "Recebimento e processamento de pesquisas NPS" },
    ],
    telemedicine: [
      { name: "telemedicina-agent", desc: "Agente especializado em serviços de telemedicina" },
      { name: "telemedicina-auth", desc: "Autenticação para telemedicina" },
      { name: "telemedicina-forgot-password", desc: "Recuperação de senha telemedicina" },
    ],
  };

  const generatePdf = async () => {
    setGeneratingPdf(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-system-documentation-pdf');
      
      if (error) throw error;

      // Criar blob e download
      const blob = new Blob([data.html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `documentacao-sistema-${new Date().toISOString().split('T')[0]}.html`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("Documentação gerada com sucesso!");
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error("Erro ao gerar documentação");
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">⚙️ HP Funções</h1>
            <p className="text-muted-foreground">Documentação completa das Edge Functions do sistema</p>
          </div>
          <Button onClick={generatePdf} disabled={generatingPdf} size="lg">
            <Download className="mr-2 h-4 w-4" />
            {generatingPdf ? "Gerando..." : "Baixar Documentação PDF"}
          </Button>
        </div>

        {/* 🆕 Seção Omnichannel - Arquivos Completos */}
        <Card className="p-6 bg-card/80 backdrop-blur-sm border-primary/20 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Code2 className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">📱 Arquivos Omnichannel Completos</h2>
            <Badge variant="outline" className="ml-2">5 arquivos</Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Código-fonte completo dos 3 principais arquivos do sistema omnichannel + arquivos auxiliares (config.ts e prompts.ts)
          </p>
          
          <Accordion type="single" collapsible className="w-full">
            {OMNICHANNEL_FILES.map((file, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3 flex-1">
                    <FileText className="h-5 w-5 text-primary" />
                    <div className="text-left">
                      <p className="font-mono font-semibold">{file.name}</p>
                      <p className="text-sm text-muted-foreground">{file.description}</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-4">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyCode(file.name, file.code)}
                      >
                        {copiedFile === file.name ? (
                          <><Check className="h-4 w-4 mr-2" /> Copiado!</>
                        ) : (
                          <><Copy className="h-4 w-4 mr-2" /> Copiar Código</>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadFile(file.name, file.code)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Baixar .ts
                      </Button>
                    </div>
                    <ScrollArea className="h-[500px] w-full rounded-lg border bg-muted p-4">
                      <pre className="text-sm font-mono">
                        <code>{file.code}</code>
                      </pre>
                    </ScrollArea>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Card>

        <Card className="p-6 bg-card/80 backdrop-blur-sm border-primary/20">
          <Tabs defaultValue="agents" className="w-full">
            <TabsList className="grid grid-cols-4 lg:grid-cols-7 gap-2 h-auto mb-6">
              <TabsTrigger value="agents" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Agentes IA ({functionsData.agents.length})
              </TabsTrigger>
              <TabsTrigger value="ixc" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                IXC ({functionsData.ixc.length})
              </TabsTrigger>
              <TabsTrigger value="whatsapp" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                WhatsApp ({functionsData.whatsapp.length})
              </TabsTrigger>
              <TabsTrigger value="automation" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Automação ({functionsData.automation.length})
              </TabsTrigger>
              <TabsTrigger value="monitoring" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Monitor ({functionsData.monitoring.length})
              </TabsTrigger>
              <TabsTrigger value="knowledge" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Knowledge ({functionsData.knowledge.length})
              </TabsTrigger>
              <TabsTrigger value="ai" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                IA & Analytics ({functionsData.ai.length})
              </TabsTrigger>
            </TabsList>

            {Object.entries(functionsData).map(([category, functions]) => (
              <TabsContent key={category} value={category} className="mt-4">
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-4">
                    {functions.map((func) => (
                      <Card key={func.name} className="p-4 border-primary/10 hover:border-primary/30 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Code2 className="h-5 w-5 text-primary" />
                              <h3 className="font-mono text-lg font-semibold text-foreground">{func.name}</h3>
                              <Badge variant="outline" className="ml-2">
                                <FileText className="h-3 w-3 mr-1" />
                                index.ts
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground ml-7">{func.desc}</p>
                          </div>
                          <div className="flex gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => viewCode(func.name)}
                                  disabled={loadingCode}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  Ver Código
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl max-h-[80vh]">
                                <DialogHeader>
                                  <DialogTitle className="font-mono">{selectedCode?.name || func.name}</DialogTitle>
                                  <DialogDescription>Visualização do código da Edge Function</DialogDescription>
                                </DialogHeader>
                                <ScrollArea className="h-[60vh] w-full">
                                  {selectedCode && selectedCode.name === func.name ? (
                                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                                      <code className="text-sm font-mono">{selectedCode.code}</code>
                                    </pre>
                                  ) : (
                                    <div className="flex items-center justify-center h-32">
                                      <p className="text-muted-foreground">Carregando código...</p>
                                    </div>
                                  )}
                                </ScrollArea>
                              </DialogContent>
                            </Dialog>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(`supabase/functions/${func.name}/index.ts`);
                                toast.success("Caminho copiado!");
                              }}
                            >
                              Copiar Path
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            ))}
          </Tabs>
        </Card>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h3 className="font-semibold mb-2 text-foreground">📊 Resumo</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Total de Funções:</span>
              <span className="ml-2 font-bold text-foreground">58</span>
            </div>
            <div>
              <span className="text-muted-foreground">Agentes IA:</span>
              <span className="ml-2 font-bold text-primary">{functionsData.agents.length}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Integrações IXC:</span>
              <span className="ml-2 font-bold text-primary">{functionsData.ixc.length}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Automações:</span>
              <span className="ml-2 font-bold text-primary">{functionsData.automation.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HPFuncoes;
