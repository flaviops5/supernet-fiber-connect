/**
 * GAP #3: Dashboard de Observabilidade - PR#17 Fast-Path
 * Métricas em tempo real + alertas
 */

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, CheckCircle, Clock, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface FastPathStats {
  date: string;
  total_fast_paths: number;
  total_resolved: number;
  total_escalated: number;
  success_rate_percent: number;
  avg_diagnostic_time_ms: number;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  trend?: number;
  icon: React.ReactNode;
  alert?: boolean;
}

function MetricCard({ title, value, trend, icon, alert }: MetricCardProps) {
  const trendColor = trend && trend > 0 ? "text-success" : "text-destructive";
  const alertStyle = alert ? "border-destructive" : "";

  return (
    <Card className={`${alertStyle}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend !== undefined && (
          <p className={`text-xs ${trendColor} flex items-center mt-1`}>
            {trend > 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
            {Math.abs(trend)}% vs. ontem
          </p>
        )}
      </CardContent>
    </Card>
  );
}

interface SystemAlert {
  id: string;
  alert_type: string;
  severity: string;
  message: string;
  metadata: Record<string, unknown> | null | string | number | boolean;
  created_at: string;
  resolved_at: string | null;
}

export default function FastPathDashboard() {
  const [stats, setStats] = useState<FastPathStats[]>([]);
  const [todayStats, setTodayStats] = useState<FastPathStats | null>(null);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      // Buscar estatísticas dos últimos 7 dias diretamente dos registros
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: rawData } = await supabase
        .from('registros_de_monitoramento')
        .select('acao, detalhes, created_at')
        .gte('created_at', sevenDaysAgo.toISOString())
        .in('acao', ['fast_path_enabled', 'fast_path_resolved', 'fast_path_problem_confirmed', 'parallel_diag_finished']);

      if (rawData) {
        // Agrupar por dia
        const statsByDay = new Map<string, FastPathStats>();
        
        interface MonitoringRecord {
          created_at: string;
          acao: string;
          detalhes: Record<string, unknown> | null | string | number | boolean;
        }

        rawData.forEach((record) => {
          const typedRecord = record as MonitoringRecord;
          const date = new Date(typedRecord.created_at).toISOString().split('T')[0];
          
          if (!statsByDay.has(date)) {
            statsByDay.set(date, {
              date,
              total_fast_paths: 0,
              total_resolved: 0,
              total_escalated: 0,
              success_rate_percent: 0,
              avg_diagnostic_time_ms: 0
            });
          }
          
          const stats = statsByDay.get(date)!;
          
          if (typedRecord.acao === 'fast_path_enabled') stats.total_fast_paths++;
          if (typedRecord.acao === 'fast_path_resolved') stats.total_resolved++;
          if (typedRecord.acao === 'fast_path_problem_confirmed') stats.total_escalated++;
        });

        // Calcular taxa de sucesso
        const statsArray = Array.from(statsByDay.values()).map(stat => ({
          ...stat,
          success_rate_percent: stat.total_fast_paths > 0 
            ? (stat.total_resolved / stat.total_fast_paths) * 100 
            : 0
        }));

        setStats(statsArray);
        if (statsArray.length > 0) {
          setTodayStats(statsArray[statsArray.length - 1]);
        }
      }

      // Buscar alertas não resolvidos
      const { data: alertsData } = await supabase
        .from('system_alerts')
        .select('*')
        .eq('resolved', false)
        .in('alert_type', ['fast_path_low_success_rate', 'fast_path_high_latency'])
        .order('created_at', { ascending: false })
        .limit(5);

      if (alertsData) {
        setAlerts(alertsData as never);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Atualizar a cada 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">PR#17 - Fast-Path Analytics</h1>
          <p className="text-muted-foreground">Monitoramento em tempo real</p>
        </div>
        <div className="text-sm text-muted-foreground">
          Atualizado a cada 30 segundos
        </div>
      </div>

      {/* Alertas Ativos */}
      {alerts.length > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Alertas Ativos ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div key={alert.id} className="flex items-start gap-2 text-sm">
                  <AlertTriangle className="w-4 h-4 text-destructive mt-0.5" />
                  <div>
                    <p className="font-medium">{alert.message}</p>
                    <p className="text-muted-foreground text-xs">
                      {new Date(alert.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Ativações Hoje"
          value={todayStats?.total_fast_paths || 0}
          trend={15}
          icon={<Zap className="w-4 h-4" />}
        />
        <MetricCard
          title="Taxa de Sucesso"
          value={`${todayStats?.success_rate_percent?.toFixed(1) || 0}%`}
          trend={8}
          icon={<CheckCircle className="w-4 h-4" />}
          alert={(todayStats?.success_rate_percent || 0) < 60}
        />
        <MetricCard
          title="Tempo Médio"
          value={`${Math.round(todayStats?.avg_diagnostic_time_ms || 0)}ms`}
          trend={-20}
          icon={<Clock className="w-4 h-4" />}
          alert={(todayStats?.avg_diagnostic_time_ms || 0) > 5000}
        />
        <MetricCard
          title="Escalações"
          value={todayStats?.total_escalated || 0}
          trend={-5}
          icon={<AlertTriangle className="w-4 h-4" />}
        />
      </div>

      {/* Gráfico de Tendências */}
      <Card>
        <CardHeader>
          <CardTitle>Tendências (Últimos 7 dias)</CardTitle>
          <CardDescription>Taxa de sucesso e volume de ativações</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
              />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip 
                labelFormatter={(value) => new Date(value).toLocaleDateString('pt-BR')}
                formatter={(value: any, name: string) => {
                  if (name === 'Taxa de Sucesso (%)') return [`${value.toFixed(1)}%`, name];
                  return [value, name];
                }}
              />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="success_rate_percent" 
                stroke="hsl(var(--success))" 
                name="Taxa de Sucesso (%)"
                strokeWidth={2}
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="total_fast_paths" 
                stroke="hsl(var(--primary))" 
                name="Ativações"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detalhamento */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Resolvidos:</span>
                <span className="font-medium">{todayStats?.total_resolved || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Escalados:</span>
                <span className="font-medium">{todayStats?.total_escalated || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tempo médio diagnóstico:</span>
                <span className="font-medium">{Math.round(todayStats?.avg_diagnostic_time_ms || 0)}ms</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Metas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Taxa de sucesso alvo:</span>
                <span className="font-medium">≥ 70%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tempo máximo:</span>
                <span className="font-medium">≤ 5000ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className={`font-medium ${(todayStats?.success_rate_percent || 0) >= 70 && (todayStats?.avg_diagnostic_time_ms || 0) <= 5000 ? 'text-success' : 'text-destructive'}`}>
                  {(todayStats?.success_rate_percent || 0) >= 70 && (todayStats?.avg_diagnostic_time_ms || 0) <= 5000 ? '✅ Dentro da meta' : '⚠️ Abaixo da meta'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
