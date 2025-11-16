import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { AlertCircle, CheckCircle, Info, AlertTriangle, RefreshCw, Download } from "lucide-react";
import { format, subHours, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LogRecord {
  id: string;
  level: string;
  context: string | null;
  message: string;
  metadata: Record<string, unknown> | null;
  log_timestamp: string;
  created_at: string;
  correlation_id?: string;
}

interface LogStats {
  total: number;
  byLevel: Record<string, number>;
  byContext: Record<string, number>;
  timeline: Array<{ hour: string; error: number; warn: number; info: number }>;
  recentErrors: LogRecord[];
  topContexts: Array<{ context: string; count: number }>;
}

const COLORS = {
  error: 'hsl(var(--destructive))',
  warn: 'hsl(var(--warning))',
  info: 'hsl(var(--primary))',
  debug: 'hsl(var(--muted))'
};

export default function LogAnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('24h');
  const [selectedContext, setSelectedContext] = useState<string>('all');

  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ['log-analytics', timeRange, selectedContext],
    queryFn: async () => {
      const now = new Date();
      let startDate: Date;
      
      switch (timeRange) {
        case '1h': startDate = subHours(now, 1); break;
        case '6h': startDate = subHours(now, 6); break;
        case '24h': startDate = subHours(now, 24); break;
        case '7d': startDate = subDays(now, 7); break;
        default: startDate = subHours(now, 24);
      }

      let query = supabase
        .from('monitoring_logs')
        .select('*')
        .gte('log_timestamp', startDate.toISOString())
        .order('log_timestamp', { ascending: false });

      if (selectedContext !== 'all') {
        query = query.eq('context', selectedContext);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Processar estatísticas
      const byLevel: Record<string, number> = {};
      const byContext: Record<string, number> = {};
      const timelineMap: Record<string, { error: number; warn: number; info: number }> = {};

      data?.forEach(log => {
        // Por nível
        byLevel[log.level] = (byLevel[log.level] || 0) + 1;

        // Por contexto
        const context = log.context || 'unknown';
        byContext[context] = (byContext[context] || 0) + 1;

        // Timeline (agrupa por hora)
        const hourKey = format(new Date(log.log_timestamp), 'HH:00', { locale: ptBR });
        if (!timelineMap[hourKey]) {
          timelineMap[hourKey] = { error: 0, warn: 0, info: 0 };
        }
        if (log.level === 'error') timelineMap[hourKey].error++;
        else if (log.level === 'warn') timelineMap[hourKey].warn++;
        else timelineMap[hourKey].info++;
      });

      const timeline = Object.entries(timelineMap)
        .map(([hour, counts]) => ({ hour, ...counts }))
        .sort((a, b) => a.hour.localeCompare(b.hour));

      const topContexts = Object.entries(byContext)
        .map(([context, count]) => ({ context, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      const recentErrors = data?.filter(log => log.level === 'error').slice(0, 20) || [];

      return {
        total: data?.length || 0,
        byLevel,
        byContext,
        timeline,
        recentErrors,
        topContexts
      } as LogStats;
    },
    refetchInterval: 30000 // Atualiza a cada 30 segundos
  });

  const levelData = stats ? Object.entries(stats.byLevel).map(([level, count]) => ({
    name: level.toUpperCase(),
    value: count,
    color: COLORS[level as keyof typeof COLORS] || COLORS.info
  })) : [];

  const exportLogs = async () => {
    if (!stats) return;
    
    const csv = [
      ['Timestamp', 'Level', 'Context', 'Message', 'Correlation ID'].join(','),
      ...stats.recentErrors.map(log => 
        [
          log.log_timestamp,
          log.level,
          log.context,
          `"${log.message.replace(/"/g, '""')}"`,
          log.correlation_id ?? ''
        ].join(',')
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${format(new Date(), 'yyyy-MM-dd-HH-mm')}.csv`;
    a.click();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics de Logs</h1>
          <p className="text-muted-foreground">Monitoramento unificado do sistema</p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">1 hora</SelectItem>
              <SelectItem value="6h">6 horas</SelectItem>
              <SelectItem value="24h">24 horas</SelectItem>
              <SelectItem value="7d">7 dias</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={exportLogs}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Logs</CardTitle>
            <Info className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total.toLocaleString() || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Erros</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {stats?.byLevel.error || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.total ? ((stats.byLevel.error || 0) / stats.total * 100).toFixed(1) : 0}% do total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Warnings</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {stats?.byLevel.warn || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.total ? ((stats.byLevel.warn || 0) / stats.total * 100).toFixed(1) : 0}% do total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Info</CardTitle>
            <CheckCircle className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {stats?.byLevel.info || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.total ? ((stats.byLevel.info || 0) / stats.total * 100).toFixed(1) : 0}% do total
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="distribution">Distribuição</TabsTrigger>
          <TabsTrigger value="contexts">Por Contexto</TabsTrigger>
          <TabsTrigger value="errors">Erros Recentes</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Timeline de Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats?.timeline || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="error" stroke={COLORS.error} name="Erros" />
                  <Line type="monotone" dataKey="warn" stroke={COLORS.warn} name="Warnings" />
                  <Line type="monotone" dataKey="info" stroke={COLORS.info} name="Info" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Nível</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={levelData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {levelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contexts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top 10 Contextos</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats?.topContexts || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="context" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Erros Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats?.recentErrors.map((log, idx) => (
                  <div key={idx} className="border-l-4 border-destructive pl-4 py-2 bg-muted/50">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-mono text-sm font-semibold">{log.context}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(log.log_timestamp), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                      </span>
                    </div>
                    <p className="text-sm mb-1">{log.message}</p>
                    {log.correlation_id && (
                      <p className="text-xs text-muted-foreground font-mono">
                        ID: {log.correlation_id}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
