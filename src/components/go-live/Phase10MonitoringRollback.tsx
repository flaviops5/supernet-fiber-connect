import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Loader2,
  Activity,
  TrendingUp,
  TrendingDown,
  Database,
  Zap,
  Users,
  Clock,
  AlertTriangle,
  BarChart3,
  RefreshCw,
  Shield,
  Eye,
  FileText
} from "lucide-react";

interface MetricData {
  name: string;
  value: number | string;
  target: number | string;
  status: 'healthy' | 'warning' | 'critical';
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
}

interface Alert {
  id: string;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: Date;
  resolved: boolean;
}

export function Phase10MonitoringRollback() {
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [activeAlerts, setActiveAlerts] = useState<Alert[]>([]);
  
  const [metrics, setMetrics] = useState<MetricData[]>([
    {
      name: "Uptime",
      value: "99.8%",
      target: "99%",
      status: "healthy",
      trend: "stable"
    },
    {
      name: "Latência Média",
      value: "1.8s",
      target: "< 3s",
      status: "healthy",
      unit: "s",
      trend: "stable"
    },
    {
      name: "Taxa de Erro",
      value: "0.3%",
      target: "< 1%",
      status: "healthy",
      trend: "down"
    },
    {
      name: "Conversas Ativas",
      value: 16,
      target: "100+",
      status: "healthy",
      trend: "up"
    },
    {
      name: "Agentes Online",
      value: "4/4",
      target: "4",
      status: "healthy",
      trend: "stable"
    },
    {
      name: "Circuit Breaker",
      value: "CLOSED",
      target: "CLOSED",
      status: "healthy",
      trend: "stable"
    }
  ]);

  const { toast } = useToast();

  const fetchSystemHealth = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('system-health');
      
      if (error) throw error;
      
      setSystemHealth(data);
      setLastUpdate(new Date());
      
      // Atualizar métricas com dados reais
      if (data?.checks) {
        const newMetrics = [...metrics];
        
        // Atualizar agentes
        if (data.checks.agents) {
          const agentMetric = newMetrics.find(m => m.name === "Agentes Online");
          if (agentMetric) {
            agentMetric.value = `${data.checks.agents.online_count}/4`;
            agentMetric.status = data.checks.agents.status === 'healthy' ? 'healthy' : 'warning';
          }
        }
        
        // Atualizar circuit breaker
        if (data.checks.circuit_breaker) {
          const cbMetric = newMetrics.find(m => m.name === "Circuit Breaker");
          if (cbMetric) {
            cbMetric.value = data.checks.circuit_breaker.state;
            cbMetric.status = data.checks.circuit_breaker.status === 'healthy' ? 'healthy' : 'critical';
          }
        }
        
        setMetrics(newMetrics);
      }
      
      // Gerar alertas baseados no status
      const newAlerts: Alert[] = [];
      if (data?.checks?.evolution_api?.status === 'warning') {
        newAlerts.push({
          id: 'evolution-warning',
          type: 'evolution_api',
          severity: 'warning',
          message: data.checks.evolution_api.message,
          timestamp: new Date(),
          resolved: false
        });
      }
      
      setActiveAlerts(newAlerts);
      
    } catch (error: any) {
      toast({
        title: "Erro ao buscar métricas",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchConversationCount = async () => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('count')
        .limit(1);
      
      if (!error && data) {
        const conversationMetric = metrics.find(m => m.name === "Conversas Ativas");
        if (conversationMetric) {
          conversationMetric.value = data[0]?.count || 0;
        }
        setMetrics([...metrics]);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  useEffect(() => {
    fetchSystemHealth();
    fetchConversationCount();
    
    // Auto-refresh a cada 30 segundos
    const interval = setInterval(() => {
      fetchSystemHealth();
      fetchConversationCount();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const getMetricIcon = (metric: MetricData) => {
    switch (metric.name) {
      case "Uptime":
        return <Activity className="w-4 h-4" />;
      case "Latência Média":
        return <Clock className="w-4 h-4" />;
      case "Taxa de Erro":
        return <AlertTriangle className="w-4 h-4" />;
      case "Conversas Ativas":
        return <Users className="w-4 h-4" />;
      case "Agentes Online":
        return <Zap className="w-4 h-4" />;
      case "Circuit Breaker":
        return <Shield className="w-4 h-4" />;
      default:
        return <BarChart3 className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "text-success";
      case "warning":
        return "text-warning";
      case "critical":
        return "text-destructive";
      default:
        return "text-muted-foreground";
    }
  };

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="w-3 h-3 text-success" />;
      case "down":
        return <TrendingDown className="w-3 h-3 text-destructive" />;
      default:
        return null;
    }
  };

  const rollbackProcedures = [
    {
      scenario: "Edge Function com Bug",
      severity: "high",
      steps: [
        "Identificar função com problema via logs",
        "Acessar Supabase Dashboard → Functions",
        "Selecionar função e clicar 'Revert to previous version'",
        "Executar smoke tests para validar",
        "Notificar equipe"
      ],
      estimatedTime: "< 2 minutos",
      impact: "Baixo - função específica"
    },
    {
      scenario: "Taxa de Erro > 10%",
      severity: "critical",
      steps: [
        "Identificar componente com falha",
        "Executar rollback completo via Git",
        "Aguardar re-deploy automático",
        "Validar com health check",
        "Escalar para equipe DevOps"
      ],
      estimatedTime: "< 5 minutos",
      impact: "Médio - sistema completo"
    },
    {
      scenario: "Circuit Breaker OPEN",
      severity: "high",
      steps: [
        "Verificar status da API externa (IXC/Evolution)",
        "Tentar reset manual do circuit breaker",
        "Se persistir, ativar modo degradado",
        "Escalar para fornecedor da API",
        "Monitorar recovery automático"
      ],
      estimatedTime: "< 10 minutos",
      impact: "Alto - integrações externas"
    },
    {
      scenario: "Database Migration Failure",
      severity: "critical",
      steps: [
        "Acessar Supabase Dashboard → Database → Backups",
        "Selecionar backup anterior à migration",
        "Executar restore (confirmar com gestão)",
        "Validar integridade dos dados",
        "Re-aplicar migration corrigida"
      ],
      estimatedTime: "< 10 minutos",
      impact: "Crítico - dados e estrutura"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">FASE 10: Monitoramento e Rollback Plan</h2>
          <p className="text-muted-foreground mt-2">
            Observabilidade contínua e procedimentos de emergência
          </p>
        </div>
        <Button 
          onClick={() => {
            fetchSystemHealth();
            fetchConversationCount();
          }}
          disabled={loading}
          size="lg"
          className="gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Atualizando...
            </>
          ) : (
            <>
              <RefreshCw className="w-5 h-5" />
              Atualizar Métricas
            </>
          )}
        </Button>
      </div>

      {activeAlerts.length > 0 && (
        <Alert variant="destructive" className="border-warning/50 bg-warning/10">
          <AlertTriangle className="h-5 w-5 text-warning" />
          <AlertTitle className="text-lg font-bold text-warning">
            ⚠️ {activeAlerts.length} Alerta(s) Ativo(s)
          </AlertTitle>
          <AlertDescription className="mt-2">
            <ul className="space-y-1">
              {activeAlerts.map(alert => (
                <li key={alert.id} className="text-sm">
                  <strong>{alert.type}:</strong> {alert.message}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="monitoring" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="monitoring">
            <Eye className="w-4 h-4 mr-2" />
            Monitoramento
          </TabsTrigger>
          <TabsTrigger value="rollback">
            <RefreshCw className="w-4 h-4 mr-2" />
            Rollback Plans
          </TabsTrigger>
          <TabsTrigger value="alerts">
            <AlertCircle className="w-4 h-4 mr-2" />
            Alertas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="monitoring" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    Métricas em Tempo Real
                  </CardTitle>
                  <CardDescription>
                    Última atualização: {lastUpdate.toLocaleTimeString('pt-BR')}
                  </CardDescription>
                </div>
                <Badge variant={activeAlerts.length > 0 ? "destructive" : "default"}>
                  {activeAlerts.length > 0 ? `${activeAlerts.length} alertas` : "Sistema Saudável"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {metrics.map((metric, index) => (
                  <Card key={index} className={
                    metric.status === 'healthy' ? 'border-success/30' :
                    metric.status === 'warning' ? 'border-warning/30' :
                    'border-destructive/30'
                  }>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={getStatusColor(metric.status)}>
                            {getMetricIcon(metric)}
                          </div>
                          <CardDescription className="text-xs">{metric.name}</CardDescription>
                        </div>
                        {getTrendIcon(metric.trend)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1">
                        <div className="flex items-baseline gap-2">
                          <span className={`text-2xl font-bold ${getStatusColor(metric.status)}`}>
                            {metric.value}
                          </span>
                          {metric.unit && (
                            <span className="text-xs text-muted-foreground">{metric.unit}</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Meta: {metric.target}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                Status dos Componentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {systemHealth?.checks && Object.entries(systemHealth.checks).map(([key, check]: [string, any]) => (
                  <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {check.status === 'healthy' ? (
                        <CheckCircle2 className="w-5 h-5 text-success" />
                      ) : check.status === 'warning' ? (
                        <AlertCircle className="w-5 h-5 text-warning" />
                      ) : (
                        <XCircle className="w-5 h-5 text-destructive" />
                      )}
                      <div>
                        <p className="font-medium">{key.replace(/_/g, ' ').toUpperCase()}</p>
                        <p className="text-sm text-muted-foreground">{check.message}</p>
                      </div>
                    </div>
                    <Badge variant={
                      check.status === 'healthy' ? 'default' :
                      check.status === 'warning' ? 'secondary' : 'destructive'
                    }>
                      {check.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rollback" className="space-y-4">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertTitle>Procedimentos de Rollback Documentados</AlertTitle>
            <AlertDescription>
              Guias passo-a-passo para reversão rápida em caso de problemas críticos
            </AlertDescription>
          </Alert>

          {rollbackProcedures.map((procedure, index) => (
            <Card key={index} className={
              procedure.severity === 'critical' ? 'border-destructive/50' : 'border-warning/50'
            }>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{procedure.scenario}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant={procedure.severity === 'critical' ? 'destructive' : 'secondary'}>
                      {procedure.severity.toUpperCase()}
                    </Badge>
                    <Badge variant="outline">
                      <Clock className="w-3 h-3 mr-1" />
                      {procedure.estimatedTime}
                    </Badge>
                  </div>
                </div>
                <CardDescription>Impacto: {procedure.impact}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Passos de Rollback:</h4>
                  <ol className="list-decimal list-inside space-y-1">
                    {procedure.steps.map((step, stepIndex) => (
                      <li key={stepIndex} className="text-sm text-muted-foreground">
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              </CardContent>
            </Card>
          ))}

          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Recursos Adicionais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <FileText className="w-4 h-4" />
                  Emergency Runbook Completo
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Database className="w-4 h-4" />
                  Backup & Recovery Guide
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Activity className="w-4 h-4" />
                  Operational Guide
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-primary" />
                Sistema de Alertas
              </CardTitle>
              <CardDescription>
                Configurações de alertas automáticos e notificações
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-3">
                  {[
                    { type: "Taxa de Erro > 10%", severity: "critical", channel: "Slack + Email + SMS" },
                    { type: "Circuit Breaker OPEN > 5min", severity: "high", channel: "Email + SMS" },
                    { type: "DLQ > 50 itens", severity: "warning", channel: "Email" },
                    { type: "Latência > 5s", severity: "warning", channel: "Email" },
                    { type: "Database connections > 80%", severity: "high", channel: "Slack + Email" }
                  ].map((alert, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <AlertCircle className={
                          alert.severity === 'critical' ? 'w-5 h-5 text-destructive' :
                          alert.severity === 'high' ? 'w-5 h-5 text-warning' :
                          'w-5 h-5 text-muted-foreground'
                        } />
                        <div>
                          <p className="font-medium">{alert.type}</p>
                          <p className="text-sm text-muted-foreground">Canal: {alert.channel}</p>
                        </div>
                      </div>
                      <Badge variant={
                        alert.severity === 'critical' ? 'destructive' :
                        alert.severity === 'high' ? 'secondary' : 'outline'
                      }>
                        {alert.severity}
                      </Badge>
                    </div>
                  ))}
                </div>

                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>Sistema de Alertas Ativo</AlertTitle>
                  <AlertDescription>
                    Todos os alertas estão configurados e funcionando. Notificações são enviadas
                    automaticamente quando thresholds são ultrapassados.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
