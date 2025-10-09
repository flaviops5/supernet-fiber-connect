import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, BookOpen, AlertTriangle, Activity, Database, Bot, Settings, ExternalLink, Sparkles, Zap, LineChart } from "lucide-react";
import { toast } from "sonner";

const QuedasMassaCodigo = () => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    toast.success("Código copiado!");
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const detectCode = `// DETECT MASS OUTAGE - Edge Function
// Localização: supabase/functions/detect-mass-outage/index.ts

const MASS_OUTAGE_THRESHOLDS = {
  PON_PORT: 5,    // 5+ clientes offline
  CTO: 3,         // 3+ clientes offline
  REGION: 6       // 6+ clientes offline
};

// 1. Buscar clientes offline
const offlineUsers = await callIxcWithRetry(
  IXC_PROXY_URL,
  'POST',
  '/webservice/v1/radusuarios',
  { qtype: 'radusuarios.online', query: 'N' }
);

// 2. Agrupar por PON/CTO/Região
const ponGroups = new Map();
for (const user of offlineUsers) {
  const pon = user.ponPort;
  if (!ponGroups.has(pon)) {
    ponGroups.set(pon, []);
  }
  ponGroups.get(pon).push(user);
}

// 3. Detectar quedas em massa
for (const [pon, users] of ponGroups) {
  if (users.length >= THRESHOLDS.PON_PORT) {
    await supabase.from('mass_outage_events').insert({
      event_key: 'PON:' + pon,
      affected_count: users.length,
      affected_logins: users.map(u => u.login),
      status: 'active'
    });
  }
}`;

  const monitorCode = `// MASS OUTAGE MONITOR - React Component
// Localização: src/components/MassOutageMonitor.tsx

const MassOutageMonitor = () => {
  const [events, setEvents] = useState([]);
  
  useEffect(() => {
    // Carregar eventos ativos
    const loadEvents = async () => {
      const { data } = await supabase
        .from('mass_outage_events')
        .select('*')
        .eq('status', 'active')
        .order('detected_at', { ascending: false });
      
      setEvents(data);
    };
    
    // Realtime subscription
    const subscription = supabase
      .channel('mass_outage_events')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'mass_outage_events' },
        loadEvents
      )
      .subscribe();
      
    return () => subscription.unsubscribe();
  }, []);
  
  return (
    <div>
      {events.map(event => (
        <Alert key={event.id}>
          🚨 {event.affected_count} clientes offline
          em {event.region_pattern}
        </Alert>
      ))}
    </div>
  );
};`;

  const databaseSchema = `-- Tabela de eventos de queda em massa
CREATE TABLE mass_outage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key TEXT UNIQUE NOT NULL,
  region_pattern TEXT NOT NULL,
  affected_count INTEGER NOT NULL,
  affected_logins TEXT[] NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);

-- RLS Policies
ALTER TABLE mass_outage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view mass_outage_events"
  ON mass_outage_events FOR SELECT
  USING (has_role(auth.uid(), 'admin'));`;

  const integrationCode = `// INTEGRAÇÃO COM CLOÉ (Routing Agent)
// Localização: supabase/functions/routing-agent/index.ts

// Verificar se cliente está em queda em massa
async function checkMassOutageForClient(customerLogin: string) {
  const { data: massOutage } = await supabase
    .from('mass_outage_events')
    .select('*')
    .eq('status', 'active')
    .order('detected_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  if (!massOutage) return null;
  
  // Verificar se login está na lista
  const isAffected = massOutage.affected_logins?.includes(customerLogin);
  
  if (isAffected) {
    return {
      message: '🚨 Interrupção em massa detectada! ' +
               'Você está afetado por uma queda na sua região. ' +
               'Nossa equipe já está trabalhando na solução.',
      event: massOutage
    };
  }
  
  return null;
}

// No fluxo do routing-agent
const massOutageInfo = await checkMassOutageForClient(clientStatus.pppoeLogin);
if (massOutageInfo) {
  return massOutageInfo.message; // Informar cliente direto
}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
              🚨 Detecção de Quedas em Massa
            </h1>
            <p className="text-muted-foreground mt-2">
              Documentação técnica - Detecção automática e notificação proativa
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
              ✅ Ativo
            </Badge>
            <Badge variant="outline" className="border-destructive/20">v1.5.0</Badge>
          </div>
        </div>

        {/* Quick Links com visual aprimorado */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { icon: Zap, label: "Detecção", color: "from-destructive/30 to-red-accent/30", textColor: "text-destructive" },
            { icon: Database, label: "Histórico", color: "from-green-500/30 to-green-600/30", textColor: "text-green-600" },
            { icon: LineChart, label: "Monitor", color: "from-blue-500/30 to-blue-600/30", textColor: "text-blue-500" },
            { icon: Settings, label: "Config", color: "from-purple-500/30 to-purple-600/30", textColor: "text-purple-600" }
          ].map((item, i) => (
            <Card key={i} className="group hover:shadow-[0_8px_30px_rgb(240,74,34,0.2)] transition-all duration-300 hover:-translate-y-2 cursor-pointer border-destructive/10 bg-gradient-to-br from-card to-muted/30">
              <CardContent className="p-6 flex items-center gap-4">
                <div className={`p-3 bg-gradient-to-br ${item.color} rounded-xl group-hover:scale-110 transition-transform duration-300 shadow-md`}>
                  <item.icon className={`h-6 w-6 ${item.textColor}`} />
                </div>
                <div>
                  <p className="font-semibold group-hover:text-destructive transition-colors">{item.label}</p>
                  <p className="text-xs text-muted-foreground">Ver código →</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Links rápidos adicionais */}
        <Card className="bg-card/50 backdrop-blur border-destructive/10">
          <CardContent className="pt-6">
            <div className="flex gap-4 flex-wrap">
              <Button variant="outline" size="sm" asChild className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all">
                <a href="/admin/knowledge">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Base de Conhecimento
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href="https://supabase.com/dashboard/project/mxdupkbpxjcfxdgrwknp/functions/detect-mass-outage/logs" target="_blank">
                  <Activity className="w-4 h-4 mr-2" />
                  Detect Logs
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
            <TabsTrigger value="detection">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Detecção
            </TabsTrigger>
            <TabsTrigger value="monitor">
              <Activity className="w-4 h-4 mr-2" />
              Monitor
            </TabsTrigger>
            <TabsTrigger value="database">
              <Database className="w-4 h-4 mr-2" />
              Database
            </TabsTrigger>
            <TabsTrigger value="integration">
              <Bot className="w-4 h-4 mr-2" />
              Integração
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
                  <BookOpen className="w-5 h-5 text-red-500" />
                  Sistema de Quedas em Massa - Visão Geral
                </CardTitle>
                <CardDescription>
                  Detecção automática e notificação proativa de interrupções
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">🎯 Objetivo</h3>
                  <p className="text-sm text-muted-foreground">
                    Detectar automaticamente quando múltiplos clientes ficam offline simultaneamente,
                    indicando queda em massa na rede. Informar proativamente os clientes afetados,
                    evitando sobrecarga do suporte técnico.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">🏗️ Arquitetura</h3>
                  <div className="bg-muted p-4 rounded-lg text-sm font-mono">
                    Cron Job (a cada 3 min)<br/>
                    &nbsp;&nbsp;↓<br/>
                    detect-mass-outage (Edge Function)<br/>
                    &nbsp;&nbsp;↓<br/>
                    IXC API (buscar offline)<br/>
                    &nbsp;&nbsp;↓<br/>
                    Agrupar por PON/CTO/Região<br/>
                    &nbsp;&nbsp;↓<br/>
                    mass_outage_events (Database)<br/>
                    &nbsp;&nbsp;↓<br/>
                    Cloé verifica no atendimento<br/>
                    &nbsp;&nbsp;↓<br/>
                    Cliente informado proativamente
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">📊 Thresholds Configurados</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• <strong>Porta PON:</strong> 5+ clientes offline = queda em massa</li>
                    <li>• <strong>CTO:</strong> 3+ clientes offline = queda em massa</li>
                    <li>• <strong>Região:</strong> 6+ clientes offline = queda em massa</li>
                    <li>• <strong>Dying Gasp:</strong> 3+ eventos = falta de energia</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">✨ Benefícios</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>✅ Redução de carga no suporte técnico</li>
                    <li>✅ Informação proativa aos clientes</li>
                    <li>✅ Identificação automática de causa (falta de energia)</li>
                    <li>✅ Histórico completo de eventos</li>
                    <li>✅ Resolução automática quando normaliza</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Detecção */}
          <TabsContent value="detection" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  Lógica de Detecção - Edge Function
                </CardTitle>
                <CardDescription>
                  Como o sistema identifica quedas em massa
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                    <code>{detectCode}</code>
                  </pre>
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(detectCode, 'detection')}
                  >
                    {copiedSection === 'detection' ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Monitor */}
          <TabsContent value="monitor" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-red-500" />
                  Monitor de Eventos - Interface React
                </CardTitle>
                <CardDescription>
                  Dashboard com realtime updates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                    <code>{monitorCode}</code>
                  </pre>
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(monitorCode, 'monitor')}
                  >
                    {copiedSection === 'monitor' ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 4: Database */}
          <TabsContent value="database" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-red-500" />
                  Database Schema
                </CardTitle>
                <CardDescription>
                  Estrutura da tabela mass_outage_events
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                    <code>{databaseSchema}</code>
                  </pre>
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(databaseSchema, 'database')}
                  >
                    {copiedSection === 'database' ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 5: Integração */}
          <TabsContent value="integration" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-red-500" />
                  Integração com Cloé (Routing Agent)
                </CardTitle>
                <CardDescription>
                  Como o agente verifica e informa clientes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                    <code>{integrationCode}</code>
                  </pre>
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(integrationCode, 'integration')}
                  >
                    {copiedSection === 'integration' ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-2">ℹ️ Fluxo de Verificação:</h4>
                  <ol className="text-sm space-y-1 text-blue-700 dark:text-blue-300 list-decimal list-inside">
                    <li>Cliente identificado via CPF</li>
                    <li>Status no IXC: OFFLINE</li>
                    <li>ANTES de transferir para suporte, Cloé verifica mass_outage_events</li>
                    <li>Se login está em affected_logins → informa queda em massa</li>
                    <li>Se não está → transfere para Luan (suporte técnico)</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 6: Configuração */}
          <TabsContent value="config" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-red-500" />
                  Configuração do Cron Job
                </CardTitle>
                <CardDescription>
                  Como habilitar a execução automática
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Habilitar no SQL Editor:</h4>
                  <pre className="text-xs overflow-x-auto">
{`SELECT cron.schedule(
  'detect-mass-outage-every-3min',
  '*/3 * * * *',
  $$
  SELECT net.http_post(
    url:='https://mxdupkbpxjcfxdgrwknp.supabase.co/functions/v1/detect-mass-outage',
    headers:='{"Authorization": "Bearer [ANON_KEY]"}'::jsonb
  );
  $$
);`}
                  </pre>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-lg">
                  <h4 className="font-semibold text-amber-600 dark:text-amber-400 mb-2">⚠️ Limitações Atuais:</h4>
                  <ul className="text-sm space-y-1 text-amber-700 dark:text-amber-300">
                    <li>• IXC não tem módulo GPON ativo (cliente_equipamento indisponível)</li>
                    <li>• Agrupamento usa apenas login PPPoE por região</li>
                    <li>• Não identifica PON/CTO específicos</li>
                    <li>• Dying Gasp detection desabilitado</li>
                  </ul>
                </div>

                <Button variant="outline" size="sm" asChild className="w-full">
                  <a href="https://supabase.com/dashboard/project/mxdupkbpxjcfxdgrwknp/database/functions" target="_blank">
                    <Settings className="w-4 h-4 mr-2" />
                    Configurar Cron Job no Supabase
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer Info */}
        <Card className="bg-red-500/5 border-red-500/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="text-4xl">📈</div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">Métricas a Monitorar:</h3>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Taxa de detecção: eventos criados vs. eventos reais</li>
                  <li>• Falsos positivos: eventos resolvidos em menos de 5 minutos</li>
                  <li>• Tempo médio de resolução</li>
                  <li>• % de clientes que entram em contato durante queda em massa</li>
                  <li>• Efetividade do aviso proativo (redução de tickets)</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default QuedasMassaCodigo;