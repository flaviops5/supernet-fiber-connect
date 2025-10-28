// >>> PR9 v3: KPI Dashboard - 100% functional with all improvements
import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageHeader } from "@/components/admin/PageHeader";
import { ThemeToggle } from "@/components/ThemeToggle";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid,
  Legend 
} from "recharts";
import { 
  Activity, 
  CheckCircle2, 
  Ticket, 
  Calendar,
  Loader2,
  RefreshCw,
  AlertCircle 
} from "lucide-react";
import type { KPIRow, KPIMetrics } from "@/types/kpi.types";
import { Button } from "@/components/ui/button";

const AUTO_REFRESH_INTERVAL = 30000; // 30 seconds

export default function KPISupportDashboard() {
  const [rows, setRows] = useState<KPIRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: rpcError } = await supabase.rpc("calc_support_kpis_last_7_days" as any);
      
      if (rpcError) throw rpcError;
      
      setRows((data as unknown as KPIRow[]) || []);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, AUTO_REFRESH_INTERVAL);
    
    return () => clearInterval(interval);
  }, [fetchData]);

  const kpis = useMemo<KPIMetrics>(() => {
    if (rows.length === 0) {
      return { total: 0, remoteRate: 0, tickets: 0, timeSeries: [] };
    }

    const total = rows.reduce((sum, r) => sum + r.total_count, 0);
    const resolved = rows.reduce((sum, r) => sum + r.resolved_remote_count, 0);
    const tickets = rows.reduce((sum, r) => sum + r.tickets_count, 0);
    const remoteRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

    const timeSeries = rows.map(r => ({
      date: new Date(r.ts).toLocaleDateString("pt-BR", { 
        day: "2-digit", 
        month: "2-digit" 
      }),
      total: r.total_count,
      resolved: r.resolved_remote_count,
    }));

    return { total, remoteRate, tickets, timeSeries };
  }, [rows]);

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Dashboard KPIs — Suporte Técnico"
        description="Métricas de atendimento e resolução remota (últimos 7 dias)"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
            <ThemeToggle />
          </>
        }
      />

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total de Atendimentos"
          value={loading ? "—" : kpis.total.toLocaleString()}
          icon={Activity}
          trend="neutral"
        />
        <MetricCard
          label="Resolução Remota"
          value={loading ? "—" : `${kpis.remoteRate}%`}
          icon={CheckCircle2}
          trend={kpis.remoteRate >= 70 ? "up" : kpis.remoteRate >= 50 ? "neutral" : "down"}
        />
        <MetricCard
          label="Tickets Abertos"
          value={loading ? "—" : kpis.tickets.toLocaleString()}
          icon={Ticket}
          trend="neutral"
        />
        <MetricCard
          label="Período"
          value="7 dias"
          icon={Calendar}
          trend="neutral"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Evolução de Atendimentos</span>
            <span className="text-xs text-muted-foreground font-normal">
              Última atualização: {lastUpdate.toLocaleTimeString("pt-BR")}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-[300px] flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={kpis.timeSeries}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: "20px" }}
                    iconType="line"
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    name="Total de Atendimentos"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#colorTotal)"
                  />
                  <Area
                    type="monotone"
                    dataKey="resolved"
                    name="Resolvidos Remotamente"
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={2}
                    fill="url(#colorResolved)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: "up" | "down" | "neutral";
}

function MetricCard({ label, value, icon: Icon, trend = "neutral" }: MetricCardProps) {
  const iconColor = trend === "up" 
    ? "text-chart-2" 
    : trend === "down" 
    ? "text-destructive" 
    : "text-primary";

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          <Icon className={`h-8 w-8 ${iconColor}`} />
        </div>
      </CardContent>
    </Card>
  );
}
// <<< PR9 v3
