import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { AlertCircle, CheckCircle, Clock, Activity } from 'lucide-react';

interface MetricsReport {
  time_window: string;
  period: { start: string; end: string };
  summary: {
    total_requests: number;
    successful_requests: number;
    failed_requests: number;
    success_rate: string;
    error_rate: string;
    avg_duration_ms: number;
  };
  by_agent: Record<string, any>;
  recent_alerts: any[];
  failed_actions: { pending: number; items: any[] };
}

interface TraceLog {
  id: string;
  correlation_id: string;
  context: string;
  level: string;
  message: string;
  metadata: any;
  created_at: string;
  log_timestamp: string;
  environment: string;
}

export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<MetricsReport | null>(null);
  const [traces, setTraces] = useState<TraceLog[]>([]);
  const [timeWindow, setTimeWindow] = useState('1h');
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('metrics-collector', {
        body: { timeWindow }
      });

      if (error) throw error;
      setMetrics(data);
    } catch (error) {
      console.error('Error fetching metrics:', error);
    }
  };

  const fetchTraces = async () => {
    try {
      const windowMinutes = timeWindow === '1h' ? 60 : timeWindow === '6h' ? 360 : 1440;
      const since = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('monitoring_logs')
        .select('*')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setTraces(data || []);
    } catch (error) {
      console.error('Error fetching traces:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchMetrics(), fetchTraces()]);
      setLoading(false);
    };

    loadData();
    const interval = setInterval(loadData, 30000);

    return () => clearInterval(interval);
  }, [timeWindow]);

  if (loading || !metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <Activity className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  const agentData = Object.entries(metrics.by_agent).map(([name, data]: [string, any]) => ({
    name,
    total: data.total,
    success: data.success,
    failed: data.failed,
    avg_duration: data.avg_duration_ms
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Performance e Tracing</h2>
          <p className="text-muted-foreground">Monitoramento distribuído em tempo real</p>
        </div>
        <Tabs value={timeWindow} onValueChange={setTimeWindow}>
          <TabsList>
            <TabsTrigger value="1h">1h</TabsTrigger>
            <TabsTrigger value="6h">6h</TabsTrigger>
            <TabsTrigger value="24h">24h</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Requisições</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.summary.total_requests}</div>
            <p className="text-xs text-muted-foreground">Últimas {timeWindow}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.summary.success_rate}</div>
            <p className="text-xs text-muted-foreground">{metrics.summary.successful_requests} sucessos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Erro</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.summary.error_rate}</div>
            <p className="text-xs text-muted-foreground">{metrics.summary.failed_requests} falhas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Latência Média</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.summary.avg_duration_ms}ms</div>
            <p className="text-xs text-muted-foreground">Tempo de resposta</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="agents">Por Agente</TabsTrigger>
          <TabsTrigger value="traces">Traces</TabsTrigger>
          <TabsTrigger value="alerts">Alertas</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance por Agente</CardTitle>
              <CardDescription>Duração média de execução</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={agentData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="avg_duration" fill="hsl(var(--primary))" name="Duração Média (ms)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Taxa de Sucesso por Agente</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={agentData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="success" fill="hsl(var(--chart-2))" name="Sucesso" />
                  <Bar dataKey="failed" fill="hsl(var(--destructive))" name="Falhas" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agents" className="space-y-4">
          {Object.entries(metrics.by_agent).map(([name, data]: [string, any]) => (
            <Card key={name}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {name}
                  <Badge variant={data.error_rate > '5%' ? 'destructive' : 'default'}>
                    {data.success_rate}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold">{data.total}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Sucesso</p>
                    <p className="text-2xl font-bold text-green-500">{data.success}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Falhas</p>
                    <p className="text-2xl font-bold text-red-500">{data.failed}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Latência Média</p>
                    <p className="text-2xl font-bold">{data.avg_duration_ms}ms</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Latência Máx</p>
                    <p className="text-2xl font-bold">{data.max_duration_ms}ms</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="traces">
          <Card>
            <CardHeader>
              <CardTitle>Logs de Tracing Recentes</CardTitle>
              <CardDescription>Últimos 100 registros</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-2">
                  {traces.map((trace) => (
                    <div
                      key={trace.id}
                      className={`p-3 rounded-lg border ${
                        trace.level === 'error' ? 'border-red-500 bg-red-500/10' :
                        trace.level === 'warn' ? 'border-yellow-500 bg-yellow-500/10' :
                        'border-border'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{trace.context}</Badge>
                          <Badge variant={trace.level === 'error' ? 'destructive' : 'secondary'}>
                            {trace.level}
                          </Badge>
                          <span className="text-xs text-muted-foreground font-mono">
                            {trace.correlation_id?.slice(0, 8) || 'N/A'}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(trace.log_timestamp).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <p className="text-sm mb-2">{trace.message}</p>
                      {trace.metadata?.duration_ms && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {trace.metadata.duration_ms}ms
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          {metrics.recent_alerts.length > 0 ? (
            metrics.recent_alerts.map((alert, idx) => (
              <Alert key={idx} variant={alert.severity === 'error' ? 'destructive' : 'default'}>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{alert.tipo}</AlertTitle>
                <AlertDescription>
                  {alert.mensagem}
                  <div className="mt-2 text-xs text-muted-foreground">
                    {new Date(alert.criado_em).toLocaleString('pt-BR')}
                  </div>
                </AlertDescription>
              </Alert>
            ))
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                  <p>Nenhum alerta recente</p>
                </div>
              </CardContent>
            </Card>
          )}

          {metrics.failed_actions.pending > 0 && (
            <Card className="border-yellow-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                  Ações Falhadas Pendentes
                </CardTitle>
                <CardDescription>
                  {metrics.failed_actions.pending} ações aguardando retry
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {metrics.failed_actions.items.map((action, idx) => (
                      <div key={idx} className="p-3 rounded-lg border border-yellow-500/50 bg-yellow-500/10">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline">{action.agent_name}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(action.criado_em).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <p className="text-sm">{action.tipo_de_acao}</p>
                        <p className="text-xs text-muted-foreground mt-1">{action.mensagem_de_erro}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
