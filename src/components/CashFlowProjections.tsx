import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  TrendingUp, 
  TrendingDown, 
  Activity,
  RefreshCw,
  Settings,
  Loader2
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

interface Projection {
  projection_date: string;
  scenario: string;
  projected_revenue: number;
  projected_costs: number;
  projected_cash_flow: number;
  accumulated_cash_flow: number;
  projected_churn_rate: number | null;
  projected_new_clients: number | null;
}

interface ProjectionSettings {
  optimistic_revenue_growth: number;
  optimistic_churn_reduction: number;
  pessimistic_revenue_decline: number;
  pessimistic_churn_increase: number;
  projection_months: number;
  variable_cost_percentage: number;
  fixed_costs: number;
}

export const CashFlowProjections = () => {
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [projections, setProjections] = useState<Projection[]>([]);
  const [settings, setSettings] = useState<ProjectionSettings | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchProjections();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('projection_settings')
        .select('*')
        .single();
      
      if (error) throw error;
      setSettings(data);
    } catch (error: any) {
      console.error('Erro ao buscar configurações:', error);
    }
  };

  const fetchProjections = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cash_flow_projections')
        .select('*')
        .order('projection_date', { ascending: true });
      
      if (error) throw error;
      setProjections(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar projeções:', error);
      toast({
        title: "Erro ao carregar projeções",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateProjections = async () => {
    setCalculating(true);
    try {
      const { data, error } = await supabase.functions.invoke('calculate-projections');
      
      if (error) throw error;
      
      toast({
        title: "Projeções calculadas",
        description: data.message,
      });
      
      await fetchProjections();
    } catch (error: any) {
      console.error('Erro ao calcular projeções:', error);
      toast({
        title: "Erro ao calcular projeções",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCalculating(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', { 
      month: 'short', 
      year: '2-digit' 
    });
  };

  // Agrupar projeções por data
  const groupedData = projections.reduce((acc, proj) => {
    const date = proj.projection_date;
    if (!acc[date]) {
      acc[date] = { date };
    }
    acc[date][`${proj.scenario}_cf`] = proj.projected_cash_flow;
    acc[date][`${proj.scenario}_acc`] = proj.accumulated_cash_flow;
    acc[date][`${proj.scenario}_revenue`] = proj.projected_revenue;
    return acc;
  }, {} as Record<string, any>);

  const chartData = Object.values(groupedData).map((item: any) => ({
    ...item,
    dateLabel: formatDate(item.date)
  }));

  // Calcular totais finais
  const finalProjections = ['optimistic', 'base', 'pessimistic'].map(scenario => {
    const scenarioData = projections.filter(p => p.scenario === scenario);
    const lastMonth = scenarioData[scenarioData.length - 1];
    const totalRevenue = scenarioData.reduce((sum, p) => sum + p.projected_revenue, 0);
    const totalCosts = scenarioData.reduce((sum, p) => sum + p.projected_costs, 0);
    
    return {
      scenario,
      accumulated: lastMonth?.accumulated_cash_flow || 0,
      totalRevenue,
      totalCosts,
      avgChurn: scenarioData.reduce((sum, p) => sum + (p.projected_churn_rate || 0), 0) / scenarioData.length
    };
  });

  const getScenarioLabel = (scenario: string) => {
    const labels = {
      optimistic: 'Otimista',
      base: 'Base',
      pessimistic: 'Pessimista'
    };
    return labels[scenario as keyof typeof labels] || scenario;
  };

  const getScenarioColor = (scenario: string) => {
    const colors = {
      optimistic: '#22c55e',
      base: '#3b82f6',
      pessimistic: '#ef4444'
    };
    return colors[scenario as keyof typeof colors] || '#6b7280';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Projeções de Fluxo de Caixa</h3>
          <p className="text-sm text-muted-foreground">
            Análise em 3 cenários: {settings?.projection_months || 12} meses
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={calculateProjections}
            disabled={calculating}
          >
            {calculating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Calculando...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Recalcular
              </>
            )}
          </Button>
        </div>
      </div>

      {projections.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Activity className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma projeção disponível</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Clique em "Recalcular" para gerar as projeções
            </p>
            <Button onClick={calculateProjections} disabled={calculating}>
              {calculating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Calculando...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Gerar Projeções
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Cards de Resumo */}
          <div className="grid gap-4 md:grid-cols-3">
            {finalProjections.map((proj) => (
              <Card key={proj.scenario}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">
                      Cenário {getScenarioLabel(proj.scenario)}
                    </CardTitle>
                    <Badge 
                      variant="outline"
                      style={{ borderColor: getScenarioColor(proj.scenario), color: getScenarioColor(proj.scenario) }}
                    >
                      {settings?.projection_months || 12}m
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Fluxo de Caixa Acumulado</p>
                    <p 
                      className="text-2xl font-bold"
                      style={{ color: proj.accumulated > 0 ? '#22c55e' : '#ef4444' }}
                    >
                      {formatCurrency(proj.accumulated)}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                    <div>
                      <p className="text-xs text-muted-foreground">Receita Total</p>
                      <p className="text-sm font-semibold">{formatCurrency(proj.totalRevenue)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Custos Totais</p>
                      <p className="text-sm font-semibold">{formatCurrency(proj.totalCosts)}</p>
                    </div>
                  </div>
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground">Churn Médio</p>
                    <p className="text-sm font-semibold">{proj.avgChurn.toFixed(2)}%</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Gráfico de Fluxo de Caixa Acumulado */}
          <Card>
            <CardHeader>
              <CardTitle>Fluxo de Caixa Acumulado</CardTitle>
              <CardDescription>Evolução do caixa acumulado nos 3 cenários</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="dateLabel" />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={(label) => `Período: ${label}`}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="optimistic_acc" 
                    stroke="#22c55e" 
                    name="Otimista"
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="base_acc" 
                    stroke="#3b82f6" 
                    name="Base"
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="pessimistic_acc" 
                    stroke="#ef4444" 
                    name="Pessimista"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Gráfico de Receita Mensal */}
          <Card>
            <CardHeader>
              <CardTitle>Receita Projetada Mensal</CardTitle>
              <CardDescription>Comparação de receita entre cenários</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="dateLabel" />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Line type="monotone" dataKey="optimistic_revenue" stroke="#22c55e" name="Otimista" />
                  <Line type="monotone" dataKey="base_revenue" stroke="#3b82f6" name="Base" />
                  <Line type="monotone" dataKey="pessimistic_revenue" stroke="#ef4444" name="Pessimista" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Insights e Parâmetros */}
          {settings && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Parâmetros da Projeção
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium mb-2 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        Cenário Otimista
                      </p>
                      <ul className="space-y-1 text-sm text-muted-foreground ml-6">
                        <li>• Crescimento de receita: <strong>+{settings.optimistic_revenue_growth}%</strong></li>
                        <li>• Redução de churn: <strong>-{settings.optimistic_churn_reduction}%</strong></li>
                      </ul>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2 flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-red-600" />
                        Cenário Pessimista
                      </p>
                      <ul className="space-y-1 text-sm text-muted-foreground ml-6">
                        <li>• Queda de receita: <strong>-{settings.pessimistic_revenue_decline}%</strong></li>
                        <li>• Aumento de churn: <strong>+{settings.pessimistic_churn_increase}%</strong></li>
                      </ul>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium mb-2">Custos</p>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        <li>• Custos variáveis: <strong>{settings.variable_cost_percentage}%</strong> da receita</li>
                        <li>• Custos fixos: <strong>{formatCurrency(settings.fixed_costs)}</strong>/mês</li>
                      </ul>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">Período</p>
                      <p className="text-sm text-muted-foreground">
                        Projeção de <strong>{settings.projection_months} meses</strong>
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};