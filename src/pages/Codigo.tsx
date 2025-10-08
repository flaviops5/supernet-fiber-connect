import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { IXCConnectionTester } from "@/components/IXCConnectionTester";

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

  const ixcCountClientsCode = `import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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

  const ixcProxyCode = `import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
        return new Response(
          JSON.stringify({ ok: false, error: 'Missing HMAC headers' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const isValid = await verifyHMACSignature(body, signature, timestamp, HMAC_SECRET);
      if (!isValid) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Invalid HMAC signature' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
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

    const ixcResponse = await fetch(targetUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa(\`\${IXC_API_USERNAME}:\${IXC_API_PASSWORD}\`)
      },
      body: requestBody ? JSON.stringify(requestBody) : undefined
    });

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
    console.error('IXC Proxy error:', error);
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
            <h1 className="text-4xl font-bold mb-4">Código das Funções IXC</h1>
            <p className="text-muted-foreground">
              Visualize e copie o código completo das funções que integram com o sistema IXC
            </p>
          </div>

          <Tabs defaultValue="ixc-client" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="ixc-client">IXC Client (Retry/Circuit Breaker)</TabsTrigger>
              <TabsTrigger value="count-clients">Count Clients</TabsTrigger>
              <TabsTrigger value="ixc-proxy">IXC Proxy</TabsTrigger>
            </TabsList>

            <TabsContent value="ixc-client">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>supabase/functions/_shared/ixc-client.ts</CardTitle>
                      <CardDescription className="mt-2">
                        Cliente IXC com retry automático e circuit breaker
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
                        Conta clientes online/offline com filtros diretos na query IXC
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
                        Proxy centralizado para chamadas à API do IXC
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
                  <div className="p-2 bg-background rounded">• telemedicina-forgot-password</div>
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

          <div className="mt-6">
            <IXCConnectionTester />
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Diagnóstico do Problema</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">❌ Erro Atual:</h3>
                <p className="text-muted-foreground">
                  "IXC call failed after 4 attempts: IXC Error: Non-JSON response from IXC"
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">🔍 O que está acontecendo:</h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>O IXC está retornando HTML ao invés de JSON</li>
                  <li>Provavelmente uma página de erro ou login</li>
                  <li>O código agora detecta isso e aborta os retries com [NO_RETRY]</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">✅ Melhorias Implementadas:</h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Detecção de respostas HTML (página de erro/login)</li>
                  <li>Abortar retries em erros de configuração (401, 403, 404)</li>
                  <li>Mensagens de erro mais descritivas</li>
                  <li>Circuit breaker para prevenir sobrecarga</li>
                  <li>Filtros diretos na query IXC (otimização de performance)</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">🔧 Próximos Passos:</h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Verificar as credenciais do IXC (IXC_API_USERNAME, IXC_API_PASSWORD)</li>
                  <li>Confirmar a URL base da API (IXC_API_BASE_URL)</li>
                  <li>Testar a conexão diretamente no endpoint do IXC</li>
                  <li>Verificar se o IP do servidor está na whitelist do IXC</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Codigo;
