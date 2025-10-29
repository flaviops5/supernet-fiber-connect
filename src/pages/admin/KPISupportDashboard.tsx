// >>> PR10B: KPISupportDashboard (com Heatmap + Alerts + AutoRefresh)
// >>> PR19: Aging + ONU + Retests (M1 ✅ Error Handling, M2 ✅ Memo)
// >>> PR21: Ação Proativa Regional via WhatsApp
// >>> PR22: Lista de Clientes Afetados
// >>> PR23: Alertas Inteligentes Automáticos
import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { 
  Loader2, AlertCircle, BarChart3, CheckCircle2, Ticket, Map, ShieldAlert, 
  Clock, Radio, RefreshCw, Users, AlertTriangle, Zap, Repeat 
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { KPIRow, KPIMetrics, KPIRegionRow, KPIRegionAgg } from "@/types/kpi.types";
import { AgingSummary, OnuInstability, RetestEffectiveness } from "@/types/pr19.types";
import SupportHeatmap from "@/components/geo/SupportHeatmap";
import RegionAlerts from "@/components/alerts/RegionAlerts";
import { RegionsMap } from "@/components/admin/RegionsMap";
import { toCoord } from "@/components/geo/city-centroids";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ActionModal } from "@/components/regions/ActionModal";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ClientsByRegionTable } from "@/components/admin/ClientsByRegionTable";

type CriticalRegion = {
  cidade: string;
  bairro: string | null;
  qtd: number;
  tickets: number;
  rx_critico: number;
};

async function fetchCriticalRegions(): Promise<CriticalRegion[]> {
  const { data, error } = await supabase.rpc("get_top5_critical_regions");

  if (error) {
    console.error("Erro ao buscar top 5 regiões críticas:", error);
    return [];
  }

  if (!data) return [];

  return data.map((row) => ({
    cidade: row.cidade ?? "Desconhecido",
    bairro: row.bairro ?? null,
    qtd: Number(row.tickets_count + row.rx_critico_count),
    tickets: Number(row.tickets_count),
    rx_critico: Number(row.rx_critico_count),
  }));
}

async function handleEscalateRegion(r: CriticalRegion) {
  try {
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

  // PR19 states
  const [agingSummary, setAgingSummary] = useState<AgingSummary | null>(null);
  const [onuTop, setOnuTop] = useState<OnuInstability[]>([]);
  const [retests, setRetests] = useState<RetestEffectiveness[]>([]);

  // PR21: Modal de ação proativa
  const [selectedRegion, setSelectedRegion] = useState<CriticalRegion | null>(null);
  
  // PR22: Contador de clientes afetados
  const [affectedCustomersCount, setAffectedCustomersCount] = useState<number>(0);

  // PR23: Alertas inteligentes
  const [clusters, setClusters] = useState<any[]>([]);
  const [loops, setLoops] = useState<any[]>([]);
  const [powerLoss, setPowerLoss] = useState<any[]>([]);

  // PR19 ✅: Fetch métricas avançadas
  const fetchExtra = useCallback(async () => {
    try {
      const [
        { data: aging, error: e1 },
        { data: onu, error: e2 },
        { data: retests, error: e3 }
      ] = await Promise.all([
        supabase.rpc("calc_support_aging_p50_p90_14d"),
        supabase.rpc("calc_onu_instability_top_14d"),
        supabase.rpc("calc_retest_effectiveness_7d")
      ]);

      if (e1 || e2 || e3) {
        console.error('❌ PR19 metrics error:', { e1, e2, e3 });
        return;
      }

      // Atualizar estados
      if (aging && Array.isArray(aging) && aging.length > 0) {
        setAgingSummary({
          conversations: Number(aging[0].conversations || 0),
          p50_seconds: Number(aging[0].p50_seconds || 0),
          p90_seconds: Number(aging[0].p90_seconds || 0)
        });
      }

      setOnuTop((onu || []).map((row: any) => ({
        ixc_client_id: row.ixc_client_id,
        last_serial: row.last_serial || '-',
        events_weak_critical: Number(row.events_weak_critical || 0)
      })));

      setRetests((retests || []).map((row: any) => ({
        step: row.step || 'geral',
        total: Number(row.total || 0),
        ok_after: Number(row.ok_after || 0),
        success_rate_pct: Number(row.success_rate_pct || 0)
      })));

    } catch (e) {
      console.error('❌ fetchExtra failed:', e);
    }
  }, []);

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

  // PR22: Fetch affected customers count
  async function fetchAffectedCustomersCount() {
    try {
      const { data, error } = await supabase.rpc("get_customers_by_region_last_outage");
      if (error) throw error;
      setAffectedCustomersCount((data || []).length);
    } catch (err) {
      console.error("Erro ao buscar contagem de clientes afetados:", err);
    }
  }

  // PR23: Fetch alertas inteligentes
  async function fetchSmartAlerts() {
    try {
      const [
        { data: c1, error: e1 },
        { data: c2, error: e2 },
        { data: c3, error: e3 }
      ] = await Promise.all([
        supabase.from("support_critical_clusters").select("*"),
        supabase.from("support_loops").select("*"),
        supabase.from("support_power_loss_clusters").select("*")
      ]);

      if (e1 || e2 || e3) {
        const errors = [e1, e2, e3].filter(Boolean);
        console.error("Erro ao buscar alertas inteligentes:", errors);
        toast({
          title: "⚠️ Erro ao carregar alertas",
          description: "Não foi possível carregar alguns alertas inteligentes.",
          variant: "destructive",
        });
      }

      if (!e1 && c1) setClusters(c1);
      if (!e2 && c2) setLoops(c2);
      if (!e3 && c3) setPowerLoss(c3);
    } catch (err) {
      console.error("Erro ao buscar alertas inteligentes:", err);
      toast({
        title: "❌ Erro ao carregar alertas",
        description: "Falha ao buscar alertas inteligentes. Tente novamente.",
        variant: "destructive",
      });
    }
  }

  useEffect(() => {
    fetchData();
    fetchCriticalRegions().then(setCriticalRegions);
    fetchExtra();
    fetchAffectedCustomersCount();
    fetchSmartAlerts(); // PR23
    
    const id = setInterval(() => {
      fetchData();
      fetchCriticalRegions().then(setCriticalRegions);
      fetchExtra();
      fetchAffectedCustomersCount();
      fetchSmartAlerts(); // PR23
    }, 60_000); // auto-refresh 60s
    
    return () => clearInterval(id);
  }, [fetchExtra]);

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

  type HeatPoint = {
    lat: number;
    lng: number;
    label: string;
    total: number;
    tickets: number;
    rxCrit: number;
    severity: number;
  };

  const heatPoints = useMemo<HeatPoint[]>(() => {
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
      .filter((point): point is HeatPoint => point !== null);
  }, [regionAgg]);

  // M2 ✅: Memo para tabelas (evita re-renders desnecessários)
  const onuTable = useMemo(() => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Radio className="h-5 w-5 text-orange-500" />
          Instabilidade de ONU — Top 20 (14d)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {onuTop.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum evento de instabilidade nos últimos 14 dias
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente (IXC)</TableHead>
                <TableHead>ONU (última)</TableHead>
                <TableHead className="text-right">Eventos fraco/crítico</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {onuTop.map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-mono text-xs">{row.ixc_client_id}</TableCell>
                  <TableCell className="font-mono text-xs">{row.last_serial || "-"}</TableCell>
                  <TableCell className="text-right font-semibold text-orange-600 dark:text-orange-400">
                    {row.events_weak_critical}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  ), [onuTop]);

  const retestsTable = useMemo(() => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-blue-500" />
          Efetividade de Retests (7d)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {retests.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum retest registrado nos últimos 7 dias
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Sucesso</TableHead>
                <TableHead className="text-right">Taxa (%)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {retests.map((r, idx) => {
                const isGood = r.success_rate_pct >= 70;
                const isMedium = r.success_rate_pct >= 50 && r.success_rate_pct < 70;
                const colorClass = isGood 
                  ? "text-green-600 dark:text-green-400" 
                  : isMedium 
                  ? "text-yellow-600 dark:text-yellow-400" 
                  : "text-red-600 dark:text-red-400";
                
                return (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{r.step}</TableCell>
                    <TableCell className="text-right">{r.total}</TableCell>
                    <TableCell className="text-right">{r.ok_after}</TableCell>
                    <TableCell className={`text-right font-semibold ${colorClass}`}>
                      {r.success_rate_pct}%
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  ), [retests]);

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
        
        {/* PR22: Botão de Clientes Afetados */}
        <Dialog>
          <DialogTrigger asChild>
            <button className="flex items-center gap-2 px-4 py-2 rounded-md border border-border hover:bg-accent transition-colors">
              <Users className="h-4 w-4" />
              Clientes Afetados
              {affectedCustomersCount > 0 && (
                <Badge variant="destructive">{affectedCustomersCount}</Badge>
              )}
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Clientes Afetados Recentemente</DialogTitle>
            </DialogHeader>
            <ClientsByRegionTable />
          </DialogContent>
        </Dialog>
      </div>

      {/* PR23: Banner de alertas inteligentes */}
      {(clusters.length > 0 || loops.length > 0 || powerLoss.length > 0) && (
        <div className="space-y-3">
          {clusters.map((c, idx) => (
            <Alert key={`cluster-${idx}`} className="bg-red-600 text-white border-red-700">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Instabilidade CRÍTICA em {c.cidade}! ({c.incidents} clientes afetados)
              </AlertDescription>
            </Alert>
          ))}
          {powerLoss.map((c, idx) => (
            <Alert key={`power-${idx}`} className="bg-yellow-500 text-black border-yellow-600">
              <Zap className="h-4 w-4" />
              <AlertDescription>
                Apagão de energia detectado em {c.cidade}! ({c.loss_count} ONUs desligadas)
              </AlertDescription>
            </Alert>
          ))}
          {loops.map((loop, idx) => (
            <Alert key={`loop-${idx}`} className="bg-orange-500 text-white border-orange-600">
              <Repeat className="h-4 w-4" />
              <AlertDescription>
                {loop.cidade ? `${loop.cidade}: ` : ''}Cliente em possível LOOP de suporte ({loop.loop_count} interações)
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

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

      {/* PR19: Aging Cards */}
      {agingSummary && agingSummary.conversations > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MetricCard
            icon={<Clock className="h-5 w-5" />}
            label="Aging p50 (14d)"
            value={`${Math.round(agingSummary.p50_seconds / 60)} min`}
            subtitle={`${agingSummary.conversations} conversas resolvidas`}
            trend={agingSummary.p50_seconds < 600 ? "positive" : agingSummary.p50_seconds < 1200 ? "neutral" : "negative"}
          />
          <MetricCard
            icon={<Clock className="h-5 w-5" />}
            label="Aging p90 (14d)"
            value={`${Math.round(agingSummary.p90_seconds / 60)} min`}
            subtitle="picos de fila"
            trend={agingSummary.p90_seconds < 1800 ? "neutral" : "negative"}
          />
        </div>
      )}

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
        <Map className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Mapa — Incidentes por Região (24h)</h2>
      </div>

      <RegionsMap />

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
                  <p className="font-medium text-sm">
                    {r.cidade}
                    {r.bairro && <span className="text-muted-foreground"> ({r.bairro})</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.rx_critico} RX Crítico · {r.tickets} Tickets · {r.qtd} Total
                  </p>
                </div>

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setSelectedRegion(r)}
                >
                  🚨 Agir
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* PR19: ONU Tracking Table */}
      {onuTable}

      {/* PR19: Retests Table */}
      {retestsTable}

      {/* PR21: Modal de Ação Proativa */}
      <ActionModal
        open={!!selectedRegion}
        onClose={() => setSelectedRegion(null)}
        region={selectedRegion}
      />
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
// <<< PR10B + PR19