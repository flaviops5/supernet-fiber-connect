import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, AlertCircle, CheckCircle, Clock, TrendingUp, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function SystemMetrics() {
  const [health, setHealth] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Atualizar a cada 30s
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      // Health check
      const healthRes = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/system-health`);
      const healthData = await healthRes.json();
      setHealth(healthData);

      // Metrics (últimas 6 horas)
      const { data, error } = await supabase.functions.invoke('metrics-collector', {
        body: { timeWindow: '6h' }
      });

      if (!error && data) {
        setMetrics(data);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading metrics:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8 flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Carregando métricas...</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'degraded': return 'bg-yellow-500';
      case 'down': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-5 h-5" />;
      case 'degraded': return <AlertCircle className="w-5 h-5" />;
      case 'down': return <XCircle className="w-5 h-5" />;
      default: return <Activity className="w-5 h-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-foreground">System Metrics</h1>
          <p className="text-muted-foreground">Monitoramento em tempo real do sistema</p>
        </div>

        {/* Overall Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(health?.status)}
              Status Geral do Sistema
            </CardTitle>
            <CardDescription>Última verificação: {new Date(health?.timestamp).toLocaleString('pt-BR')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Database */}
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${getStatusColor(health?.dependencies?.database?.status)}`} />
                <div>
                  <p className="font-semibold">Database</p>
                  <p className="text-sm text-muted-foreground">
                    {health?.dependencies?.database?.duration_ms}ms
                  </p>
                </div>
              </div>

              {/* IXC */}
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${getStatusColor(health?.dependencies?.ixc?.status)}`} />
                <div>
                  <p className="font-semibold">IXC ERP</p>
                  <p className="text-sm text-muted-foreground">
                    {health?.dependencies?.ixc?.duration_ms}ms
                  </p>
                </div>
              </div>

              {/* Circuit Breaker */}
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${getStatusColor(health?.dependencies?.circuit_breaker?.status)}`} />
                <div>
                  <p className="font-semibold">Circuit Breaker</p>
                  <p className="text-sm text-muted-foreground">
                    {health?.dependencies?.circuit_breaker?.state?.toUpperCase()}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics?.summary?.total_requests || 0}</div>
              <p className="text-xs text-muted-foreground">Últimas 6 horas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-500">{metrics?.summary?.success_rate || '0%'}</div>
              <p className="text-xs text-muted-foreground">{metrics?.summary?.successful_requests || 0} sucessos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Erro</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-500">{metrics?.summary?.error_rate || '0%'}</div>
              <p className="text-xs text-muted-foreground">{metrics?.summary?.failed_requests || 0} falhas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Tempo Médio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics?.summary?.avg_duration_ms || 0}ms</div>
              <p className="text-xs text-muted-foreground">Tempo de resposta</p>
            </CardContent>
          </Card>
        </div>

        {/* Performance por Agente */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Performance por Agente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics?.by_agent && Object.entries(metrics.by_agent).map(([agentName, stats]: [string, any]) => (
                <div key={agentName} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">{agentName}</h3>
                    <Badge variant={parseFloat(stats.success_rate) >= 95 ? 'default' : 'destructive'}>
                      {stats.success_rate}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Total</p>
                      <p className="font-semibold">{stats.total}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Sucesso</p>
                      <p className="font-semibold text-green-500">{stats.success}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Falhas</p>
                      <p className="font-semibold text-red-500">{stats.failed}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Tempo Médio</p>
                      <p className="font-semibold">{stats.avg_duration_ms}ms</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Failed Actions (DLQ) */}
        {metrics?.failed_actions?.pending > 0 && (
          <Card className="border-yellow-500/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-600">
                <AlertCircle className="w-5 h-5" />
                Ações Pendentes (DLQ)
              </CardTitle>
              <CardDescription>
                {metrics.failed_actions.pending} ação(ões) aguardando retry
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {metrics.failed_actions.items.slice(0, 5).map((action: any) => (
                  <div key={action.id} className="flex items-center justify-between p-3 bg-muted rounded">
                    <div>
                      <p className="font-medium">{action.action_type}</p>
                      <p className="text-sm text-muted-foreground">{action.agent_name} • CPF: {action.client_cpf}</p>
                    </div>
                    <Badge variant="outline">{action.retry_count}/3 tentativas</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
