/**
 * PR #13: Dashboard de Análise de Context Escape
 * Monitora transferências causadas por fuga de fluxo
 */

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, TrendingUp, Clock, ExternalLink } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useToast } from "@/hooks/use-toast";
import { handleError } from "@/lib/error-handler";

interface EscapeAnalysis {
  transfer_date: string;
  total_transfers: number;
  escape_transfers: number;
  other_transfers: number;
  escape_rate_percent: number;
  avg_time_to_escape_minutes: number;
}

interface TopEscapeStep {
  step_name: string;
  scenario: string;
  escape_count: number;
  avg_duration_minutes: number;
  last_occurrence: string;
}

export default function ContextEscapeAnalytics() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<EscapeAnalysis[]>([]);
  const [topSteps, setTopSteps] = useState<TopEscapeStep[]>([]);
  const [stats, setStats] = useState({
    totalEscapes: 0,
    avgEscapeRate: 0,
    criticalAlert: false
  });

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      // Carregar análise temporal - usar fetch direto das views
      const { data: analyticsData, error: analyticsError } = await supabase
        .from("context_escape_analysis" as any)
        .select("*") as any;

      if (analyticsError) throw analyticsError;

      // Carregar top passos problemáticos
      const { data: topStepsData, error: topStepsError } = await supabase
        .from("top_escape_steps" as any)
        .select("*")
        .limit(5) as any;

      if (topStepsError) throw topStepsError;

      setAnalytics(analyticsData || []);
      setTopSteps(topStepsData || []);

      // Calcular estatísticas
      if (analyticsData && analyticsData.length > 0) {
        const totalEscapes = analyticsData.reduce((sum: number, day: any) => sum + (day.escape_transfers || 0), 0);
        const avgRate = analyticsData.reduce((sum: number, day: any) => sum + (day.escape_rate_percent || 0), 0) / analyticsData.length;
        
        setStats({
          totalEscapes,
          avgEscapeRate: Math.round(avgRate * 100) / 100,
          criticalAlert: avgRate > 15 // Threshold configurável
        });
      }

    } catch (error) {
      handleError(error, {
        title: "Erro ao carregar analytics",
        context: "ContextEscapeAnalytics"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit"
    });
  };

  const getStepDisplayName = (stepName: string) => {
    const displayNames: Record<string, string> = {
      "scenario_a_check_los": "Cenário A - Verificar LOS",
      "scenario_a_optical": "Cenário A - Reconectar Fibra",
      "scenario_b_post_reboot": "Cenário B - Pós-Reboot",
      "scenario_c_instability": "Cenário C - Instabilidade",
      "unknown": "Desconhecido"
    };
    return displayNames[stepName] || stepName;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alerta Crítico */}
      {stats.criticalAlert && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Taxa de Fuga de Contexto Elevada</AlertTitle>
          <AlertDescription>
            A taxa média de transferências por fuga de contexto está em <strong>{stats.avgEscapeRate}%</strong>, 
            acima do limite recomendado de 15%. Revise os passos problemáticos abaixo.
          </AlertDescription>
        </Alert>
      )}

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total de Fugas (30 dias)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalEscapes}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Transferências por context_escape
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Taxa Média de Fuga</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.avgEscapeRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.avgEscapeRate > 15 ? "⚠️ Acima do ideal (15%)" : "✅ Dentro do ideal"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Passos Problemáticos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{topSteps.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Locais com mais fugas detectadas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Tendência */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Tendência de Transferências (30 dias)
          </CardTitle>
          <CardDescription>
            Comparação entre transferências por fuga de contexto vs. outras razões
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="transfer_date" 
                tickFormatter={formatDate}
                style={{ fontSize: '12px' }}
              />
              <YAxis style={{ fontSize: '12px' }} />
              <Tooltip 
                labelFormatter={formatDate}
                formatter={(value: number, name: string) => [
                  value,
                  name === 'escape_transfers' ? 'Fugas de Contexto' : 'Outras Razões'
                ]}
              />
              <Legend 
                formatter={(value) => 
                  value === 'escape_transfers' ? 'Fugas de Contexto' : 'Outras Razões'
                }
              />
              <Bar dataKey="escape_transfers" fill="hsl(var(--destructive))" name="escape_transfers" />
              <Bar dataKey="other_transfers" fill="hsl(var(--primary))" name="other_transfers" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top 5 Passos com Mais Fugas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Top 5 Passos com Mais Fugas
          </CardTitle>
          <CardDescription>
            Identifique onde os clientes mais desviam do fluxo esperado
          </CardDescription>
        </CardHeader>
        <CardContent>
          {topSteps.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma fuga de contexto registrada nos últimos 30 dias 🎉
            </p>
          ) : (
            <div className="space-y-4">
              {topSteps.map((step, index) => (
                <div 
                  key={`${step.step_name}-${step.scenario}`}
                  className="flex items-start justify-between p-4 border rounded-lg"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">#{index + 1}</Badge>
                      <span className="font-medium">{getStepDisplayName(step.step_name)}</span>
                      <Badge variant="secondary">{step.scenario}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{step.escape_count} fugas</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {step.avg_duration_minutes} min (média)
                      </span>
                      <span>
                        Última: {new Date(step.last_occurrence).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      toast({
                        title: "Navegando para conversas",
                        description: "Abrindo filtro de conversas transferidas..."
                      });
                      // TODO: Implementar navegação para página de conversas filtradas
                    }}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ações Recomendadas */}
      <Card>
        <CardHeader>
          <CardTitle>Próximos Passos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            📖 Consulte o <strong>Guia Operacional</strong> (docs/PR-13-ANTI-FUGA-GUIA-OPERACIONAL.md) para:
          </p>
          <ul className="list-disc list-inside text-sm space-y-1 ml-4">
            <li>Entender como funciona o sistema anti-fuga</li>
            <li>Aprender quando revisar casos transferidos</li>
            <li>Ajustar thresholds de avisos (1/2/3)</li>
            <li>Ver exemplos de melhorias baseadas em análise</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
