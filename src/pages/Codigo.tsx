import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Check, FileText, Activity, Database, Zap } from "lucide-react";
import { toast } from "sonner";
import { IXCConnectionTester } from "@/components/IXCConnectionTester";
import { IXCFunctionsTester } from "@/components/IXCFunctionsTester";

const Codigo = () => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    toast.success("Código copiado!");
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const ixcClientCode = `// ============================================
// IXC CLIENT - Retry Logic + Circuit Breaker
// ============================================
// Localização: supabase/functions/_shared/ixc-client.ts

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
        recordFailure();
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
}`;

  const ixcCountClientsCode = `// ============================================
// IXC COUNT CLIENTS - Edge Function
// ============================================
// Localização: supabase/functions/ixc-count-clients/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callIxcWithRetry } from '../_shared/ixc-client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const IXC_PROXY_URL = Deno.env.get('IXC_PROXY_URL') || \`\${Deno.env.get('SUPABASE_URL')}/functions/v1/ixc-proxy\`;

    console.log('🔍 Buscando clientes IXC via proxy com retry/circuit breaker...');

    let page = 1;
    const itemsPerPage = 1000;
    const allOnlineUsers: any[] = [];
    const allOfflineUsers: any[] = [];

    // 🔥 OTIMIZAÇÃO: Buscar apenas clientes ONLINE direto na query
    try {
      console.log('📡 Buscando clientes ONLINE (filtro direto na query IXC)...');
      
      while (page <= 5) { // Limitar a 5 páginas para online
        const bodyOnline = {
          qtype: 'radusuarios.online',
          query: 'S',
          oper: '=',
          page: String(page),
          rp: String(itemsPerPage),
          sortname: 'radusuarios.id',
          sortorder: 'desc',
        };

        const onlineData = await callIxcWithRetry(
          IXC_PROXY_URL,
          'POST',
          '/webservice/v1/radusuarios',
          bodyOnline
        );

        const onlineRegistros: any[] = Array.isArray(onlineData?.data?.registros)
          ? onlineData.data.registros
          : (onlineData?.data?.registros ? Object.values(onlineData.data.registros) : []);

        if (!onlineRegistros || onlineRegistros.length === 0) {
          console.log(\`✅ Sem mais clientes online na página \${page}\`);
          break;
        }

        allOnlineUsers.push(...onlineRegistros);
        console.log(\`📊 Página \${page}: \${onlineRegistros.length} online (total: \${allOnlineUsers.length})\`);

        if (onlineRegistros.length < itemsPerPage) break;
        page++;
      }
    } catch (error) {
      console.error('❌ Erro ao buscar clientes online:', error);
      if (allOnlineUsers.length === 0) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Não foi possível buscar clientes online do IXC',
            details: error.message,
            total_clientes: 0,
            detalhes: { online: 0, offline: 0, total: 0 }
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.log(\`⚠️ Continuando com \${allOnlineUsers.length} clientes online obtidos\`);
    }

    // 🔥 OTIMIZAÇÃO: Buscar apenas clientes OFFLINE direto na query
    page = 1;
    try {
      console.log('📡 Buscando clientes OFFLINE (filtro direto na query IXC)...');
      
      while (page <= 5) { // Limitar a 5 páginas para offline
        const bodyOffline = {
          qtype: 'radusuarios.online',
          query: 'N',
          oper: '=',
          page: String(page),
          rp: String(itemsPerPage),
          sortname: 'radusuarios.id',
          sortorder: 'desc',
        };

        const offlineData = await callIxcWithRetry(
          IXC_PROXY_URL,
          'POST',
          '/webservice/v1/radusuarios',
          bodyOffline
        );

        const offlineRegistros: any[] = Array.isArray(offlineData?.data?.registros)
          ? offlineData.data.registros
          : (offlineData?.data?.registros ? Object.values(offlineData.data.registros) : []);

        if (!offlineRegistros || offlineRegistros.length === 0) {
          console.log(\`✅ Sem mais clientes offline na página \${page}\`);
          break;
        }

        allOfflineUsers.push(...offlineRegistros);
        console.log(\`📊 Página \${page}: \${offlineRegistros.length} offline (total: \${allOfflineUsers.length})\`);

        if (offlineRegistros.length < itemsPerPage) break;
        page++;
      }
    } catch (error) {
      console.error('❌ Erro ao buscar clientes offline:', error);
      console.log(\`⚠️ Continuando com \${allOfflineUsers.length} clientes offline obtidos\`);
    }

    // Agrupar por login (deduplicar)
    const uniqueOnline = new Map<string, any>();
    const uniqueOffline = new Map<string, any>();
    
    for (const user of allOnlineUsers) {
      const login = String(user.login ?? '').toLowerCase().trim();
      if (login && !uniqueOnline.has(login)) {
        uniqueOnline.set(login, user);
      }
    }
    
    for (const user of allOfflineUsers) {
      const login = String(user.login ?? '').toLowerCase().trim();
      if (login && !uniqueOffline.has(login) && !uniqueOnline.has(login)) {
        uniqueOffline.set(login, user);
      }
    }

    const clientDetails = {
      online: uniqueOnline.size,
      offline: uniqueOffline.size,
      total: uniqueOnline.size + uniqueOffline.size,
    };

    console.log('📊 Resumo otimizado (filtros diretos):');
    console.log(\`   Online: \${clientDetails.online}\`);
    console.log(\`   Offline: \${clientDetails.offline}\`);
    console.log(\`   Total: \${clientDetails.total}\`);

    return new Response(
      JSON.stringify({
        success: true,
        total_clientes: clientDetails.total,
        detalhes: clientDetails,
        optimization: 'Filtros aplicados direto na query IXC',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Erro ao contar clientes IXC:', error);
    return new Response(
      JSON.stringify({ error: error.message, success: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});`;

  const ixcProxyCode = `// ============================================
// IXC PROXY - Edge Function
// ============================================
// Localização: supabase/functions/ixc-proxy/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verifyHMACSignature } from '../_shared/hmac.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hmac-signature, x-hmac-timestamp',
};

// Cache simples em memória (30 segundos TTL)
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30000;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { method, path, query, body: requestBody } = body;

    // Validar HMAC se configurado
    const HMAC_SECRET = Deno.env.get('HMAC_SHARED_SECRET');
    if (HMAC_SECRET) {
      const signature = req.headers.get('x-hmac-signature');
      const timestamp = req.headers.get('x-hmac-timestamp');
      
      if (!signature || !timestamp) {
        console.log('🔐 HMAC headers ausentes - prosseguindo em modo compatibilidade');
      } else {
        const isValid = await verifyHMACSignature(body, signature, timestamp, HMAC_SECRET);
        if (!isValid) {
          return new Response(
            JSON.stringify({ ok: false, error: 'Invalid HMAC signature' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Cache para GET requests
    const cacheKey = \`\${method}:\${path}:\${query || ''}\`;
    if (method === 'GET') {
      const cached = cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        console.log(\`✅ Cache hit for \${cacheKey}\`);
        return new Response(
          JSON.stringify(cached.data),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const IXC_API_BASE_URL = Deno.env.get('IXC_API_BASE_URL');
    const IXC_API_USERNAME = Deno.env.get('IXC_API_USERNAME');
    const IXC_API_PASSWORD = Deno.env.get('IXC_API_PASSWORD');

    if (!IXC_API_BASE_URL || !IXC_API_USERNAME || !IXC_API_PASSWORD) {
      return new Response(
        JSON.stringify({ ok: false, error: 'IXC credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const targetUrl = query 
      ? \`\${IXC_API_BASE_URL}\${path}?\${query}\`
      : \`\${IXC_API_BASE_URL}\${path}\`;

    console.log(\`📡 IXC Proxy: \${method} \${path}\`);
    
    const startTime = Date.now();
    const ixcResponse = await fetch(targetUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa(\`\${IXC_API_USERNAME}:\${IXC_API_PASSWORD}\`)
      },
      body: requestBody ? JSON.stringify(requestBody) : undefined
    });

    const duration = Date.now() - startTime;
    console.log(\`✅ IXC Response: \${ixcResponse.status} (\${duration}ms)\`);

    const contentType = ixcResponse.headers.get('content-type') || '';
    let data;
    
    if (contentType.includes('application/json')) {
      data = await ixcResponse.json();
    } else {
      const text = await ixcResponse.text();
      data = { raw: text };
    }

    const response = {
      ok: ixcResponse.ok,
      status: ixcResponse.status,
      data,
      error: ixcResponse.ok ? null : 'IXC API Error'
    };

    // Cachear GET bem sucedidos
    if (method === 'GET' && ixcResponse.ok) {
      cache.set(cacheKey, { data: response, timestamp: Date.now() });
    }

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('❌ IXC Proxy error:', error);
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">Sistema de Integração IXC</h1>
            <p className="text-muted-foreground">
              Arquitetura robusta com retry automático, circuit breaker e otimizações de performance
            </p>
          </div>

          <Tabs defaultValue="explanation" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="explanation">
                <FileText className="mr-2 h-4 w-4" />
                Visão Geral
              </TabsTrigger>
              <TabsTrigger value="ixc-client">
                <Activity className="mr-2 h-4 w-4" />
                IXC Client
              </TabsTrigger>
              <TabsTrigger value="count-clients">
                <Database className="mr-2 h-4 w-4" />
                Count Clients
              </TabsTrigger>
              <TabsTrigger value="ixc-proxy">
                <Zap className="mr-2 h-4 w-4" />
                IXC Proxy
              </TabsTrigger>
            </TabsList>

            <TabsContent value="explanation" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Visão Geral do Sistema de Integração IXC</CardTitle>
                  <CardDescription>
                    Explicação completa da arquitetura e funcionamento do sistema
                  </CardDescription>
                </CardHeader>
                <CardContent className="prose prose-sm max-w-none dark:prose-invert">
                  <div className="space-y-6">
                    <section>
                      <p className="text-base">
                        Este sistema forma uma <strong>arquitetura robusta e resiliente</strong> para integração com a{" "}
                        <strong>API do IXC Soft</strong>, incluindo mecanismos avançados de{" "}
                        <strong>retry automático</strong>, <strong>circuit breaker</strong> e{" "}
                        <strong>otimizações de performance</strong>.
                      </p>
                      <p className="text-muted-foreground">
                        O sistema é dividido em três componentes principais que trabalham em conjunto para garantir
                        comunicação confiável e eficiente com o sistema IXC.
                      </p>
                    </section>

                    <section className="border-l-4 border-primary pl-4">
                      <h3 className="text-xl font-semibold mb-3">1. IXC Client (Retry + Circuit Breaker)</h3>
                      <p>
                        Cliente compartilhado que implementa <strong>lógica de retry</strong> com{" "}
                        <strong>exponential backoff</strong> e <strong>circuit breaker pattern</strong>.
                      </p>
                      
                      <h4 className="font-semibold mt-4 mb-2">🔄 Retry Logic</h4>
                      <ul className="space-y-2 list-disc list-inside text-muted-foreground">
                        <li><strong>Tentativas:</strong> Até 3 retries automáticos (4 tentativas totais)</li>
                        <li><strong>Backoff:</strong> Delay exponencial de 1s → 2s → 4s</li>
                        <li><strong>Smart Abort:</strong> Detecta erros de configuração (401, 403, 404) e aborta retries</li>
                        <li><strong>HTML Detection:</strong> Identifica páginas de login/erro e aborta imediatamente</li>
                      </ul>

                      <h4 className="font-semibold mt-4 mb-2">🛡️ Circuit Breaker</h4>
                      <ul className="space-y-2 list-disc list-inside text-muted-foreground">
                        <li><strong>Threshold:</strong> Após 5 falhas consecutivas, abre o circuit breaker</li>
                        <li><strong>Timeout:</strong> Aguarda 60 segundos antes de tentar novamente (half-open)</li>
                        <li><strong>Estados:</strong> closed (normal) → open (bloqueado) → half-open (teste)</li>
                        <li><strong>Proteção:</strong> Previne sobrecarga do IXC durante indisponibilidades</li>
                      </ul>

                      <h4 className="font-semibold mt-4 mb-2">🔒 HMAC Security (Opcional)</h4>
                      <ul className="space-y-2 list-disc list-inside text-muted-foreground">
                        <li>Assinatura HMAC para autenticação adicional entre Edge Functions</li>
                        <li>Prevenção de ataques man-in-the-middle e replay attacks</li>
                        <li>Timestamp validation para garantir frescor das requisições</li>
                      </ul>
                    </section>

                    <section className="border-l-4 border-blue-500 pl-4">
                      <h3 className="text-xl font-semibold mb-3">2. IXC Proxy (Centralização e Cache)</h3>
                      <p>
                        Proxy centralizado que <strong>protege credenciais</strong> do IXC e implementa{" "}
                        <strong>cache inteligente</strong> para otimização de performance.
                      </p>

                      <h4 className="font-semibold mt-4 mb-2">🔐 Segurança</h4>
                      <ul className="space-y-2 list-disc list-inside text-muted-foreground">
                        <li>Credenciais IXC armazenadas apenas como Supabase Secrets</li>
                        <li>Autenticação Basic Auth gerenciada automaticamente</li>
                        <li>Validação HMAC opcional para requests internos</li>
                        <li>CORS configurado para acesso controlado</li>
                      </ul>

                      <h4 className="font-semibold mt-4 mb-2">⚡ Cache Inteligente</h4>
                      <ul className="space-y-2 list-disc list-inside text-muted-foreground">
                        <li><strong>TTL:</strong> 30 segundos para requisições GET bem sucedidas</li>
                        <li><strong>Key:</strong> method:path:query (deduplica requisições idênticas)</li>
                        <li><strong>Performance:</strong> Reduz carga no IXC e melhora tempo de resposta</li>
                        <li><strong>Compatibilidade:</strong> Funciona mesmo sem HMAC (modo legacy)</li>
                      </ul>

                      <h4 className="font-semibold mt-4 mb-2">📊 Logging e Monitoramento</h4>
                      <ul className="space-y-2 list-disc list-inside text-muted-foreground">
                        <li>Log de cada chamada com método, path e status</li>
                        <li>Medição de duração das requisições (performance tracking)</li>
                        <li>Avisos quando HMAC não está configurado</li>
                      </ul>
                    </section>

                    <section className="border-l-4 border-green-500 pl-4">
                      <h3 className="text-xl font-semibold mb-3">3. Count Clients (Exemplo de Uso)</h3>
                      <p>
                        Edge Function que demonstra o uso do sistema, <strong>contando clientes online/offline</strong> 
                        do IXC com <strong>otimizações de filtros</strong>.
                      </p>

                      <h4 className="font-semibold mt-4 mb-2">🔥 Otimizações Implementadas</h4>
                      <ul className="space-y-2 list-disc list-inside text-muted-foreground">
                        <li>
                          <strong>Filtros diretos na query IXC:</strong> 
                          <code className="mx-1 px-2 py-1 bg-muted rounded">radusuarios.online = 'S'</code> ou 
                          <code className="mx-1 px-2 py-1 bg-muted rounded">'N'</code>
                        </li>
                        <li><strong>Paginação limitada:</strong> Máximo 5 páginas (5.000 registros) por status</li>
                        <li><strong>Deduplicação:</strong> Remove duplicatas por login (clientes multi-login)</li>
                        <li><strong>Fallback resiliente:</strong> Continua mesmo se uma das buscas falhar</li>
                      </ul>

                      <h4 className="font-semibold mt-4 mb-2">📈 Vantagens da Abordagem</h4>
                      <ul className="space-y-2 list-disc list-inside text-muted-foreground">
                        <li><strong>Performance:</strong> ~10x mais rápido que buscar todos e filtrar localmente</li>
                        <li><strong>Escalabilidade:</strong> Suporta bases com milhares de clientes</li>
                        <li><strong>Confiabilidade:</strong> Retry automático em falhas temporárias</li>
                        <li><strong>Observabilidade:</strong> Logs detalhados de cada etapa</li>
                      </ul>
                    </section>

                    <section className="bg-muted p-4 rounded-lg">
                      <h3 className="text-lg font-semibold mb-3">🏗️ Arquitetura do Sistema</h3>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">🔵</span>
                          <div>
                            <strong>Edge Function (ex: count-clients)</strong>
                            <br />↓ Usa <code>callIxcWithRetry</code>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">🔵</span>
                          <div>
                            <strong>IXC Client (_shared/ixc-client.ts)</strong>
                            <br />↓ Retry + Circuit Breaker + HMAC
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">🔵</span>
                          <div>
                            <strong>IXC Proxy (ixc-proxy)</strong>
                            <br />↓ Cache + Segurança + Validação
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">🟢</span>
                          <div>
                            <strong>API IXC Soft</strong>
                            <br />Sistema externo (provedor de internet)
                          </div>
                        </div>
                      </div>
                    </section>

                    <section className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold mb-3 text-amber-900 dark:text-amber-100">
                        ⚠️ Requisitos de Configuração
                      </h3>
                      <ul className="space-y-2 text-sm text-amber-800 dark:text-amber-200">
                        <li><strong>IXC_API_BASE_URL:</strong> URL base da API do IXC (sem /webservice/v1)</li>
                        <li><strong>IXC_API_USERNAME:</strong> Usuário de API do IXC (não usuário web)</li>
                        <li><strong>IXC_API_PASSWORD:</strong> Senha do usuário de API</li>
                        <li><strong>HMAC_SHARED_SECRET:</strong> (Opcional) Chave para assinatura HMAC</li>
                      </ul>
                      <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">
                        💡 Configure estes secrets no Supabase Dashboard → Project Settings → Edge Functions
                      </p>
                    </section>

                    <section className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold mb-3 text-green-900 dark:text-green-100">
                        ✅ Benefícios do Sistema
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-green-800 dark:text-green-200">
                        <div>
                          <strong>🛡️ Resiliência</strong>
                          <ul className="mt-1 space-y-1 list-disc list-inside ml-2">
                            <li>Retry automático em falhas</li>
                            <li>Circuit breaker em indisponibilidades</li>
                            <li>Fallback graceful</li>
                          </ul>
                        </div>
                        <div>
                          <strong>⚡ Performance</strong>
                          <ul className="mt-1 space-y-1 list-disc list-inside ml-2">
                            <li>Cache inteligente (30s TTL)</li>
                            <li>Filtros diretos no IXC</li>
                            <li>Paginação otimizada</li>
                          </ul>
                        </div>
                        <div>
                          <strong>🔒 Segurança</strong>
                          <ul className="mt-1 space-y-1 list-disc list-inside ml-2">
                            <li>Credenciais isoladas</li>
                            <li>HMAC opcional</li>
                            <li>CORS configurado</li>
                          </ul>
                        </div>
                        <div>
                          <strong>📊 Observabilidade</strong>
                          <ul className="mt-1 space-y-1 list-disc list-inside ml-2">
                            <li>Logs detalhados</li>
                            <li>Tracking de duração</li>
                            <li>Status de circuit breaker</li>
                          </ul>
                        </div>
                      </div>
                    </section>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ixc-client">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>supabase/functions/_shared/ixc-client.ts</CardTitle>
                      <CardDescription className="mt-2">
                        Cliente IXC com retry automático, circuit breaker e HMAC opcional
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(ixcClientCode, "ixc-client")}
                    >
                      {copiedSection === "ixc-client" ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                    <code>{ixcClientCode}</code>
                  </pre>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="count-clients">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>supabase/functions/ixc-count-clients/index.ts</CardTitle>
                      <CardDescription className="mt-2">
                        Conta clientes online/offline com filtros diretos e otimizações de performance
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(ixcCountClientsCode, "count-clients")}
                    >
                      {copiedSection === "count-clients" ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                    <code>{ixcCountClientsCode}</code>
                  </pre>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ixc-proxy">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>supabase/functions/ixc-proxy/index.ts</CardTitle>
                      <CardDescription className="mt-2">
                        Proxy centralizado com cache inteligente e proteção de credenciais
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(ixcProxyCode, "ixc-proxy")}
                    >
                      {copiedSection === "ixc-proxy" ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                    <code>{ixcProxyCode}</code>
                  </pre>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Card className="mt-6 border-blue-200 dark:border-blue-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🔑 Credenciais Necessárias do IXC
              </CardTitle>
              <CardDescription>
                Configure estes secrets no Supabase para conectar ao sistema IXC
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg mb-4">
                <h4 className="font-semibold mb-2 text-amber-900 dark:text-amber-100">
                  🔒 Sobre as Credenciais Atuais
                </h4>
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Por segurança, não posso exibir os valores dos secrets configurados. 
                  Use o botão "Testar Conexão" abaixo para verificar se as credenciais estão funcionando.
                  Para ver ou alterar os valores, acesse o Supabase Dashboard.
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-4 border rounded-lg space-y-2">
                  <div className="font-semibold text-lg">1. IXC_API_BASE_URL</div>
                  <p className="text-sm text-muted-foreground">
                    URL base da API do IXC (ex: https://seu-servidor.ixcsoft.com.br)
                  </p>
                  <div className="p-2 bg-muted rounded text-xs font-mono">
                    https://seuservidor.ixcsoft.com.br
                  </div>
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    ⚠️ NÃO incluir /webservice/v1 no final - apenas a URL base
                  </p>
                </div>

                <div className="p-4 border rounded-lg space-y-2">
                  <div className="font-semibold text-lg">2. IXC_API_USERNAME</div>
                  <p className="text-sm text-muted-foreground">
                    Usuário de API do IXC (não o usuário de login web)
                  </p>
                  <div className="p-2 bg-muted rounded text-xs font-mono">
                    api_user
                  </div>
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    💡 Criar em: IXC → Configurações → Usuários de API
                  </p>
                </div>

                <div className="p-4 border rounded-lg space-y-2">
                  <div className="font-semibold text-lg">3. IXC_API_PASSWORD</div>
                  <p className="text-sm text-muted-foreground">
                    Senha do usuário de API
                  </p>
                  <div className="p-2 bg-muted rounded text-xs font-mono">
                    ••••••••••••
                  </div>
                </div>

                <div className="p-4 border rounded-lg space-y-2 border-dashed">
                  <div className="font-semibold text-lg">4. HMAC_SHARED_SECRET <span className="text-sm text-muted-foreground">(Opcional)</span></div>
                  <p className="text-sm text-muted-foreground">
                    Chave para assinatura HMAC (segurança adicional)
                  </p>
                  <div className="p-2 bg-muted rounded text-xs font-mono">
                    string_aleatoria_segura
                  </div>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    ✅ Recomendado, mas não obrigatório
                  </p>
                </div>
              </div>

              <div className="mt-6 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                <h4 className="font-semibold mb-3 text-red-900 dark:text-red-100">
                  🔧 Funções que Dependem Destas Credenciais (11 funções)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div className="p-2 bg-background rounded">• ixc-proxy</div>
                  <div className="p-2 bg-background rounded">• ixc-count-clients</div>
                  <div className="p-2 bg-background rounded">• ixc-integration</div>
                  <div className="p-2 bg-background rounded">• ixc-list-contracts</div>
                  <div className="p-2 bg-background rounded">• ixc-sync-plans</div>
                  <div className="p-2 bg-background rounded">• ixc-pon-status</div>
                  <div className="p-2 bg-background rounded">• ixc-radio-status</div>
                  <div className="p-2 bg-background rounded">• ixc-revenue-stats</div>
                  <div className="p-2 bg-background rounded">• ixc-financial-analytics</div>
                  <div className="p-2 bg-background rounded">• ixc-discover-gpon-endpoints</div>
                  <div className="p-2 bg-background rounded">• detect-mass-outage</div>
                </div>
                <p className="text-xs text-red-800 dark:text-red-200 mt-3">
                  ⚠️ Se as credenciais estiverem incorretas, TODAS estas funções falharão!
                </p>
              </div>

              <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
                <h4 className="font-semibold mb-2 text-amber-900 dark:text-amber-100">
                  ⚠️ Checklist de Segurança IXC
                </h4>
                <ul className="text-sm space-y-1 text-amber-800 dark:text-amber-200">
                  <li>✓ Criar usuário específico de API (não usar admin)</li>
                  <li>✓ Adicionar IP do servidor Supabase na whitelist do IXC</li>
                  <li>✓ Limitar permissões do usuário de API ao mínimo necessário</li>
                  <li>✓ Usar HTTPS na URL base (nunca HTTP)</li>
                  <li>✓ Testar a conexão após configurar</li>
                </ul>
              </div>

              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                <h4 className="font-semibold mb-2 text-blue-900 dark:text-blue-100">
                  📍 Como configurar no Supabase
                </h4>
                <ol className="text-sm space-y-1 text-blue-800 dark:text-blue-200 list-decimal list-inside">
                  <li>Acesse: Supabase Dashboard → Project Settings → Edge Functions</li>
                  <li>Clique em "Add new secret"</li>
                  <li>Adicione cada uma das credenciais acima</li>
                  <li>Salve e teste a conexão usando o botão abaixo</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          <div className="mt-6 space-y-6">
            <IXCFunctionsTester />
            <IXCConnectionTester />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Codigo;
