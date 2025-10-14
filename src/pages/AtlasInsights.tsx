import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthGuard } from "@/components/AuthGuard";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  RefreshCcw,
  Activity,
  Flame,
  AlertTriangle,
  BarChart3,
  TrendingUp,
  Clock,
  ShieldAlert,
  CheckCircle,
  Zap,
  ArrowLeft,
} from "lucide-react";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface Insight {
  id: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  probable_cause: string;
  kpis: any;
  groups: string[];
  recommendation: string;
  created_at: string;
  notifications: any[];
}

export default function AtlasInsightsPage() {
  const { role } = useUserRole();
  const { toast } = useToast();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [severity, setSeverity] = useState("all");
  const [cause, setCause] = useState("all");
  const [search, setSearch] = useState("");

  const [stats, setStats] = useState({
    avgErrors: 0,
    avgEvents: 0,
    uptime: 99.9,
    lastAnalysis: "—",
  });

  // Carrega insights
  async function fetchInsights() {
    setLoading(true);
    let query = supabase
      .from("atlas_insights")
      .select("*")
      .order("created_at", { ascending: false });

    if (severity !== "all") query = query.eq("severity", severity);
    if (cause !== "all") query = query.eq("probable_cause", cause);

    const { data, error } = await query;
    if (error) {
      toast({ 
        title: "Erro ao carregar insights", 
        description: error.message, 
        variant: "destructive" 
      });
    } else {
      setInsights((data || []) as Insight[]);
    }
    setLoading(false);
  }

  // Dados do gráfico
  async function fetchChartData() {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("atlas_insights")
      .select("created_at,kpis")
      .gte("created_at", since)
      .order("created_at", { ascending: true });

    if (error) {
      toast({ 
        title: "Erro ao carregar gráfico", 
        description: error.message, 
        variant: "destructive" 
      });
      return;
    }

    const formatted = data.map((row: any) => ({
      time: new Date(row.created_at).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      errors_per_min: row.kpis?.errors_per_min || 0,
      active_events: row.kpis?.active_events || 0,
    }));

    setChartData(formatted);

    // KPIs médios
    const avgErrors = formatted.reduce((a, b) => a + b.errors_per_min, 0) / (formatted.length || 1);
    const avgEvents = formatted.reduce((a, b) => a + b.active_events, 0) / (formatted.length || 1);
    const uptime = 100 - Math.min(avgEvents * 0.5, 50);
    const last =
      data[data.length - 1]?.created_at
        ? new Date(data[data.length - 1].created_at).toLocaleString("pt-BR")
        : "—";
    setStats({ avgErrors, avgEvents, uptime, lastAnalysis: last });
  }

  // Executar análise manual
  async function triggerAnalysis() {
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke("atlas-analyzer", {
        body: { windowMinutes: 90 },
      });

      if (error) throw error;

      toast({
        title: "Análise executada",
        description: `Severidade: ${data?.severity || "—"}`,
      });

      fetchInsights();
      fetchChartData();
    } catch (err: any) {
      toast({
        title: "Erro ao executar análise",
        description: err.message || String(err),
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchInsights();
    fetchChartData();
  }, [severity, cause]);

  const getSeverityStyle = (s: string) => {
    switch (s) {
      case "HIGH":
        return "bg-destructive text-destructive-foreground";
      case "MEDIUM":
        return "bg-orange-500 text-white";
      default:
        return "bg-green-600 text-white";
    }
  };

  const getIcon = (s: string) => {
    switch (s) {
      case "HIGH":
        return <Flame className="w-4 h-4 mr-1" />;
      case "MEDIUM":
        return <AlertTriangle className="w-4 h-4 mr-1" />;
      default:
        return <Activity className="w-4 h-4 mr-1" />;
    }
  };

  const filtered = insights.filter((i) =>
    i.recommendation.toLowerCase().includes(search.toLowerCase())
  );

  if (role !== "admin" && role !== "editor") {
    return (
      <AuthGuard>
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          Acesso negado — apenas administradores ou editores podem visualizar este painel.
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background p-6">
        <div className="container mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.location.href = '/admin'}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Zap className="h-8 w-8 text-primary" />
            <div className="flex-1">
              <h1 className="text-3xl font-bold">Atlas Insights</h1>
              <p className="text-muted-foreground">
                Análise e monitoramento de insights do sistema
              </p>
            </div>
            <Button onClick={triggerAnalysis} disabled={refreshing} variant="default">
              {refreshing ? (
                <Loader2 className="animate-spin w-4 h-4 mr-1" />
              ) : (
                <RefreshCcw className="w-4 h-4 mr-1" />
              )}
              Executar análise
            </Button>
          </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <TrendingUp className="text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Erros/min (média)</p>
                <p className="text-lg font-semibold">{stats.avgErrors.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <ShieldAlert className="text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Eventos ativos (média)</p>
                <p className="text-lg font-semibold">{stats.avgEvents.toFixed(1)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle className="text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Uptime estimado</p>
                <p className="text-lg font-semibold">{stats.uptime.toFixed(2)}%</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Clock className="text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Última análise</p>
                <p className="text-sm font-semibold">{stats.lastAnalysis}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3">
          <Select onValueChange={setSeverity} defaultValue="all">
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Severidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="HIGH">Alta</SelectItem>
              <SelectItem value="MEDIUM">Média</SelectItem>
              <SelectItem value="LOW">Baixa</SelectItem>
            </SelectContent>
          </Select>

          <Select onValueChange={setCause} defaultValue="all">
            <SelectTrigger className="w-60">
              <SelectValue placeholder="Causa provável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="power_outage">Falta de energia</SelectItem>
              <SelectItem value="bgp">BGP</SelectItem>
              <SelectItem value="backbone_break">Rompimento backbone</SelectItem>
              <SelectItem value="integration_instability">Instabilidade integração</SelectItem>
              <SelectItem value="unknown">Desconhecida</SelectItem>
            </SelectContent>
          </Select>

          <Input
            placeholder="Buscar recomendação..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-80"
          />
        </div>

        {/* Gráfico */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <BarChart3 className="text-primary" />
            <CardTitle>Tendência (últimas 24h)</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum dado recente para exibir.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="errors_per_min"
                    stroke="hsl(var(--destructive))"
                    strokeWidth={2}
                    dot={false}
                    name="Erros/min"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="active_events"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                    name="Eventos ativos"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Cards */}
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="animate-spin w-8 h-8 text-primary" />
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((i) => (
              <Card key={i.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 flex-wrap">
                    {getIcon(i.severity)}
                    <Badge className={getSeverityStyle(i.severity)}>{i.severity}</Badge>
                    <span className="text-sm text-muted-foreground ml-auto">
                      {new Date(i.created_at).toLocaleString("pt-BR")}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>
                    <strong>Causa:</strong> {i.probable_cause}
                  </p>
                  <p>
                    <strong>Eventos ativos:</strong> {i.kpis?.active_events || 0}
                  </p>
                  <p>
                    <strong>Erros/min:</strong> {i.kpis?.errors_per_min || 0}
                  </p>
                  {i.groups?.length > 0 && (
                    <p>
                      <strong>Grupos:</strong> {i.groups.slice(0, 3).join(", ")}
                    </p>
                  )}
                  <p>
                    <strong>Recomendação:</strong> {i.recommendation}
                  </p>
                  {i.notifications?.length > 0 && (
                    <Badge variant="outline" className="mt-2">
                      Notificações enviadas
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        </div>
      </div>
    </AuthGuard>
  );
}
