// >>> PR10B: KPISupportDashboard (com Heatmap + Alerts + AutoRefresh)
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, BarChart3, CheckCircle2, Ticket, Map, ShieldAlert } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { KPIRow, KPIMetrics, KPIRegionRow, KPIRegionAgg } from "@/types/kpi.types";
import SupportHeatmap from "@/components/geo/SupportHeatmap";
import RegionAlerts from "@/components/alerts/RegionAlerts";
import { toCoord } from "@/components/geo/city-centroids";

type CriticalRegion = {
  cidade: string;
  qtd: number;
  tickets: number;
  rx_critico: number;
};

async function fetchCriticalRegions(): Promise<CriticalRegion[]> {
  const { data, error } = await supabase.rpc("calc_support_kpis_by_region_last_7_days");

  if (error) {
    console.error("Erro KPIs por região:", error);
    return [];
  }

  return (data as any[])
    .map((row) => ({
      cidade: row.cidade ?? "Desconhecido",
      qtd: Number(row.total_count),
      tickets: Number(row.tickets_count),
      rx_critico: Number(row.rx_critico_count),
    }))
    .sort((a, b) =>
      b.rx_critico - a.rx_critico ||
      b.tickets - a.tickets ||
      b.qtd - a.qtd
    )
    .slice(0, 5);
}

async function handleEscalateRegion(r: CriticalRegion) {
  try {
    // Log direto no Supabase para auditoria
    await supabase.from("registros_de_monitoramento").insert({
      acao: "region_escalated",
      fluxo: "support-tech",
      conversation_id: "dashboard",
      detalhes: {
        cidade: r.cidade,
        tickets: r.tickets,
        rx_critico: r.rx_critico,
        total: r.qtd,
      },
    });

    toast({
      title: "✅ Equipe técnica alertada",
      description: `Região: ${r.cidade}\nTickets: ${r.tickets} | RX crítico: ${r.rx_critico}`,
    });
  } catch (err) {
    console.error("Erro ao escalar região:", err);
    toast({
      title: "❌ Erro ao alertar equipe",
      description: "Tente novamente em alguns instantes.",
      variant: "destructive",
    });
  }
}

export default function KPISupportDashboard() {
  const [rows, setRows] = useState<KPIRow[]>([]);
  const [regionRows, setRegionRows] = useState<KPIRegionRow[]>([]);
  const [criticalRegions, setCriticalRegions] = useState<CriticalRegion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchData() {
    setLoading(true);
    setError(null);

    const [{ data: series, error: e1 }, { data: regions, error: e2 }] = await Promise.all([
      supabase.rpc("calc_support_kpis_last_7_days"),
      supabase.rpc("calc_support_kpis_by_region_last_7_days"),
    ]);

    if (e1 || e2) {
      const msg = e1?.message || e2?.message || "Erro ao carregar KPIs";
      console.error("Error fetching KPIs:", e1 || e2);
      setError(msg);
      setLoading(false);
      return;
    }

    setRows((series as KPIRow[]) || []);
    setRegionRows((regions as KPIRegionRow[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
    fetchCriticalRegions().then(setCriticalRegions);
    
    const id = setInterval(() => {
      fetchData();
      fetchCriticalRegions().then(setCriticalRegions);
    }, 60_000); // auto-refresh 60s
    
    return () => clearInterval(id);
  }, []);

  const kpis = useMemo<KPIMetrics>(() => {
    const total = rows.reduce((acc, r) => acc + Number(r.total_count), 0);
    const remote = rows.reduce((acc, r) => acc + Number(r.resolved_remote_count), 0);
    const tickets = rows.reduce((acc, r) => acc + Number(r.tickets_count), 0);

    const timeSeries = rows.map(r => ({
      date: r.ts,
      total: Number(r.total_count),
      resolved: Number(r.resolved_remote_count),
    }));

    return {
      total: total || 0,
      remoteRate: total > 0 ? Math.round((remote / total) * 100) : 0,
      tickets: tickets || 0,
      timeSeries,
    };
  }, [rows]);

  const regionAgg = useMemo<KPIRegionAgg[]>(() => {
    const map: Record<string, KPIRegionAgg> = {};
    for (const r of regionRows) {
      const cidade = (r.cidade || "Desconhecido").trim();
      const bairro = r.bairro?.trim() || null;
      const key = `${cidade}|${bairro ?? ""}`;
      if (!map[key]) {
        map[key] = { key, cidade, bairro, totalCount: 0, tickets: 0, rxCrit: 0 };
      }
      map[key].totalCount += Number(r.total_count || 0);
      map[key].tickets += Number(r.tickets_count || 0);
      map[key].rxCrit += Number(r.rx_critico_count || 0);
    }
    const result: KPIRegionAgg[] = Object.values(map);
    return result.sort((a, b) => (b.rxCrit - a.rxCrit) || (b.tickets - a.tickets) || (b.totalCount - a.totalCount));
  }, [regionRows]);

  const heatPoints = useMemo(() => {
    // Converte cidade → lat/lng; severidade baseada em rxCrit e tickets
    return regionAgg
      .map((r) => {
        const coord = toCoord(r.cidade);
        if (!coord) return null;
        const sevBase = Math.min(1, (r.rxCrit / 8) + (r.tickets / 12) + (r.totalCount / 80) * 0.2);
        return {
          lat: coord.lat,
          lng: coord.lng,
          label: r.bairro ? `${r.cidade} — ${r.bairro}` : r.cidade,
          total: r.totalCount,
          tickets: r.tickets,
          rxCrit: r.rxCrit,
          severity: Math.max(0, Math.min(1, sevBase)),
        };
      })
      .filter(Boolean) as any[];
  }, [regionAgg]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">Carregando KPIs...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard de KPIs — Suporte Técnico</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          icon={<BarChart3 className="h-5 w-5" />}
          label="Total de Atendimentos"
          value={kpis.total}
          subtitle="últimos 7 dias"
        />
        <MetricCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Resolução Remota"
          value={`${kpis.remoteRate}%`}
          subtitle="sem visita técnica"
          trend={kpis.remoteRate >= 70 ? "positive" : "neutral"}
        />
        <MetricCard
          icon={<Ticket className="h-5 w-5" />}
          label="Tickets Abertos"
          value={kpis.tickets}
          subtitle="requer visita"
          trend={kpis.tickets > 10 ? "negative" : "neutral"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Volume de Atendimentos — Últimos 7 Dias</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={kpis.timeSeries}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Area type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <Map className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Heatmap por Região (últimos 7 dias)</h2>
      </div>

      <SupportHeatmap points={heatPoints} />

      <div className="flex items-center gap-2 mt-6">
        <h2 className="text-xl font-semibold">Alertas Inteligentes (Top regiões)</h2>
      </div>

      <RegionAlerts regions={regionAgg} />

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <ShieldAlert className="h-5 w-5" />
            Regiões Mais Críticas — Ação Necessária 🚨
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {criticalRegions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma região crítica no momento
            </p>
          ) : (
            criticalRegions.map((r, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 border-b last:border-none hover:bg-accent/50 transition-colors rounded">
                <div className="space-y-0.5">
                  <p className="font-medium text-sm">{r.cidade}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.rx_critico} RX Crítico · {r.tickets} Tickets · {r.qtd} Total
                  </p>
                </div>

                <button
                  onClick={() => handleEscalateRegion(r)}
                  className="px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
                >
                  👷 Ação Técnica
                </button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

type MetricCardProps = {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: "positive" | "negative" | "neutral";
};

function MetricCard({ icon, label, value, subtitle, trend = "neutral" }: MetricCardProps) {
  const trendColors = {
    positive: "text-green-600 dark:text-green-400",
    negative: "text-red-600 dark:text-red-400",
    neutral: "text-muted-foreground",
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-x-4">
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <div className="flex items-baseline space-x-2">
              <p className="text-3xl font-bold">{value}</p>
            </div>
            {subtitle && <p className={`text-xs ${trendColors[trend]}`}>{subtitle}</p>}
          </div>
          <div className="flex-shrink-0 text-muted-foreground">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
// <<< PR10B
