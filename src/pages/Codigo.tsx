import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, BookOpen, Zap, Activity, Database, Bot, Settings, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { IXCConnectionTester } from "@/components/IXCConnectionTester";
import { IXCFunctionsTester } from "@/components/IXCFunctionsTester";
import { IXCEndpointDiscovery } from "@/components/IXCEndpointDiscovery";

const Codigo = () => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    toast.success("Código copiado!");
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const ixcClientCode = `// IXC CLIENT - Retry Logic + Circuit Breaker
// Localização: supabase/functions/_shared/ixc-client.ts

const circuitBreaker = {
  failures: 0,
  lastFailureTime: 0,
  state: 'closed' // 'closed' | 'open' | 'half-open'
};

export async function callIxcWithRetry(
  proxyUrl: string,
  method: 'GET' | 'POST',
  path: string,
  body?: any
) {
  // Verificar circuit breaker
  if (circuitBreaker.state === 'open') {
    throw new Error('Circuit breaker OPEN');
  }
  
  // Retry com exponential backoff
  let lastError;
  for (let attempt = 0; attempt <= 3; attempt++) {
    try {
      const response = await fetch(proxyUrl, {
        method: 'POST',
        body: JSON.stringify({ method, path, body })
      });
      
      // Sucesso - resetar circuit breaker
      circuitBreaker.failures = 0;
      return await response.json();
    } catch (error) {
      lastError = error;
      circuitBreaker.failures++;
      
      if (circuitBreaker.failures >= 5) {
        circuitBreaker.state = 'open';
      }
      
      await delay(1000 * Math.pow(2, attempt));
    }
  }
  
  throw lastError;
}`;

  const ixcProxyCode = `// IXC PROXY - Edge Function
// Localização: supabase/functions/ixc-proxy/index.ts

serve(async (req) => {
  const { method, path, body } = await req.json();
  
  const targetUrl = IXC_API_BASE_URL + path;
  
  const response = await fetch(targetUrl, {
    method,
    headers: {
      'Authorization': 'Basic ' + btoa(IXC_USERNAME + ':' + IXC_PASSWORD),
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  
  return new Response(await response.text(), {
    status: response.status
  });
});`;

  const ixcCountCode = `// IXC COUNT CLIENTS - Edge Function
// Localização: supabase/functions/ixc-count-clients/index.ts

// Buscar clientes ONLINE
const onlineData = await callIxcWithRetry(
  IXC_PROXY_URL,
  'POST',
  '/webservice/v1/radusuarios',
  {
    qtype: 'radusuarios.online',
    query: 'S', // S = Sim (online)
    oper: '='
  }
);

// Buscar clientes OFFLINE
const offlineData = await callIxcWithRetry(
  IXC_PROXY_URL,
  'POST',
  '/webservice/v1/radusuarios',
  {
    qtype: 'radusuarios.online',
    query: 'N', // N = Não (offline)
    oper: '='
  }
);

return {
  success: true,
  total_clientes: online + offline,
  detalhes: { online, offline }
};`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
              🔧 Integração IXC Soft
            </h1>
            <p className="text-muted-foreground mt-2">
              Documentação técnica - Circuit Breaker, Retry Logic e Proxy
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="bg-green-500/10 text-green-500">
              ✅ Ativo
            </Badge>
            <Badge variant="outline">v3.2.0</Badge>
          </div>
        </div>

        {/* Quick Links */}
        <Card className="bg-card/50 backdrop-blur border-muted">
          <CardContent className="pt-6">
            <div className="flex gap-4 flex-wrap">
              <Button variant="outline" size="sm" asChild>
                <a href="/technical-docs">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Docs Completas
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href="https://supabase.com/dashboard/project/mxdupkbpxjcfxdgrwknp/functions/ixc-proxy/logs" target="_blank">
                  <Activity className="w-4 h-4 mr-2" />
                  IXC Proxy Logs
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="explanation" className="w-full">
          <TabsList className="grid w-full grid-cols-6 bg-muted/50">
            <TabsTrigger value="explanation">
              <BookOpen className="w-4 h-4 mr-2" />
              Explicação
            </TabsTrigger>
            <TabsTrigger value="client">
              <Zap className="w-4 h-4 mr-2" />
              IXC Client
            </TabsTrigger>
            <TabsTrigger value="proxy">
              <Activity className="w-4 h-4 mr-2" />
              IXC Proxy
            </TabsTrigger>
            <TabsTrigger value="functions">
              <Bot className="w-4 h-4 mr-2" />
              Functions
            </TabsTrigger>
            <TabsTrigger value="tests">
              <Database className="w-4 h-4 mr-2" />
              Testes
            </TabsTrigger>
            <TabsTrigger value="config">
              <Settings className="w-4 h-4 mr-2" />
              Configuração
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Explicação */}
          <TabsContent value="explanation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  Integração IXC - Visão Geral
                </CardTitle>
                <CardDescription>
                  Arquitetura robusta com circuit breaker e retry logic
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">🎯 Objetivo</h3>
                  <p className="text-sm text-muted-foreground">
                    Sistema robusto de integração com IXC Soft ERP, protegido contra sobrecarga com circuit breaker,
                    retry automático e cache inteligente.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">🏗️ Arquitetura</h3>
                  <div className="bg-muted p-4 rounded-lg text-sm font-mono">
                    Edge Function<br/>
                    &nbsp;&nbsp;↓<br/>
                    IXC Client (retry + circuit breaker)<br/>
                    &nbsp;&nbsp;↓<br/>
                    IXC Proxy (autenticação + cache)<br/>
                    &nbsp;&nbsp;↓<br/>
                    IXC API (ERP externo)<br/>
                    &nbsp;&nbsp;↓<br/>
                    Response (JSON)
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">🛡️ Proteções Implementadas</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>✅ <strong>Circuit Breaker:</strong> Abre após 5 falhas consecutivas</li>
                    <li>✅ <strong>Retry Logic:</strong> Até 3 tentativas com exponential backoff</li>
                    <li>✅ <strong>Cache:</strong> 30 segundos TTL para GET requests</li>
                    <li>✅ <strong>HMAC Signature:</strong> Segurança entre edge functions</li>
                    <li>✅ <strong>Error Handling:</strong> Não retenta erros 401/403/404</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">📊 Por que Circuit Breaker?</h3>
                  <p className="text-sm text-muted-foreground">
                    O IXC estava sobrecarregado com 1000+ requisições simultâneas do detect-mass-outage.
                    O circuit breaker abre automaticamente para proteger o IXC de colapso total.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: IXC Client */}
          <TabsContent value="client" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" />
                  IXC Client - Retry & Circuit Breaker
                </CardTitle>
                <CardDescription>
                  Lógica compartilhada de resiliência
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                    <code>{ixcClientCode}</code>
                  </pre>
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(ixcClientCode, 'client')}
                  >
                    {copiedSection === 'client' ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: IXC Proxy */}
          <TabsContent value="proxy" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  IXC Proxy - Edge Function
                </CardTitle>
                <CardDescription>
                  Proxy centralizado com autenticação e cache
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                    <code>{ixcProxyCode}</code>
                  </pre>
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(ixcProxyCode, 'proxy')}
                  >
                    {copiedSection === 'proxy' ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 4: Functions */}
          <TabsContent value="functions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-primary" />
                  IXC Functions - Exemplos de Uso
                </CardTitle>
                <CardDescription>
                  Como usar o IXC Client nas edge functions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                    <code>{ixcCountCode}</code>
                  </pre>
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(ixcCountCode, 'functions')}
                  >
                    {copiedSection === 'functions' ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 5: Testes */}
          <TabsContent value="tests" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-primary" />
                  Testes de Conectividade e Functions
                </CardTitle>
                <CardDescription>
                  Ferramentas para testar a integração IXC
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-3">🔌 Teste de Conectividade IXC</h4>
                  <IXCConnectionTester />
                </div>

                <div>
                  <h4 className="font-semibold mb-3">🧪 Teste de Todas as Functions</h4>
                  <IXCFunctionsTester />
                </div>

                <div>
                  <h4 className="font-semibold mb-3">🔍 Descoberta de Endpoints GPON</h4>
                  <IXCEndpointDiscovery />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 6: Configuração */}
          <TabsContent value="config" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-primary" />
                  Secrets e Configurações
                </CardTitle>
                <CardDescription>
                  Variáveis necessárias no Supabase
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-semibold">Supabase Secrets:</h4>
                  <div className="bg-muted p-4 rounded-lg space-y-2 text-sm font-mono">
                    <div className="flex justify-between">
                      <span>IXC_API_BASE_URL</span>
                      <Badge variant="outline">Obrigatório</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>IXC_API_USERNAME</span>
                      <Badge variant="outline">Obrigatório</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>IXC_API_PASSWORD</span>
                      <Badge variant="outline">Obrigatório</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>HMAC_SHARED_SECRET</span>
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-500">Opcional</Badge>
                    </div>
                  </div>
                </div>

                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg">
                  <h4 className="font-semibold text-red-600 dark:text-red-400 mb-2">🚨 Problema Detectado:</h4>
                  <p className="text-sm text-red-700 dark:text-red-300 mb-2">
                    <strong>Endpoint /webservice/v1/cliente_equipamento não está disponível!</strong>
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    Seu IXC não tem o módulo GPON/Fibra ativo. Todos os 22 endpoints testados retornam:
                    "Recurso não está disponível!"
                  </p>
                </div>

                <Button variant="outline" size="sm" asChild className="w-full">
                  <a href="https://supabase.com/dashboard/project/mxdupkbpxjcfxdgrwknp/settings/functions" target="_blank">
                    <Settings className="w-4 h-4 mr-2" />
                    Configurar Secrets no Supabase
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer Info */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="text-4xl">💡</div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">Análise do Problema cliente_equipamento:</h3>
                <div className="text-sm space-y-2 text-muted-foreground">
                  <p><strong>Caminho completo:</strong></p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Edge Function chama IXC Proxy com GET /webservice/v1/cliente_equipamento</li>
                    <li>IXC Proxy adiciona autenticação Basic e faz request para IXC API</li>
                    <li>IXC API retorna HTTP 200 mas com JSON: tipo="error", message="Recurso não está disponível!"</li>
                    <li>Sistema detecta erro e interrompe processamento</li>
                  </ol>
                  <p className="mt-2"><strong>Solução:</strong> Contratar módulo GPON no IXC ou usar apenas login PPPoE para agrupamento</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Codigo;