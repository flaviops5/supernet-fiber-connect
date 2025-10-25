import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CashFlowProjections } from "./CashFlowProjections";
import { parseError } from "@/types/error.types";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  AlertTriangle,
  BarChart3,
  Calendar,
  Loader2
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

interface FinancialAnalytics {
  mrr: number;
  arr: number;
  activeContracts: number;
  totalContracts: number;
  averageTicket: number;
  overdueInvoices: number;
  overdueAmount: number;
  overdueRate: number;
  aging: {
    days0_30: { count: number; amount: number };
    days31_60: { count: number; amount: number };
    days61_90: { count: number; amount: number };
    days90Plus: { count: number; amount: number };
  };
  topDebtors: Array<{
    clientId: string;
    clientName: string;
    overdueAmount: number;
    invoicesCount: number;
    oldestInvoice: string;
  }>;
  churnedContracts: number;
  churnRate: number;
  projectedMRR: number;
  projectedARR: number;
  planPerformance: Record<string, {
    activeCount: number;
    canceledCount: number;
    churnRate: number;
    revenue: number;
  }>;
  monthlyRevenue: Array<{ month: string; revenue: number; contracts: number }>;
}

interface RevenueStats {
  success: boolean;
  totalMonthlyRevenue: number;
  activeContracts: number;
  averageTicket: number;
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'];

export const FinancialDashboard = () => {
  const [loading, setLoading] = useState(false);
  const [loadingRevenue, setLoadingRevenue] = useState(false);
  const [analytics, setAnalytics] = useState<FinancialAnalytics | null>(null);
  const [revenueStats, setRevenueStats] = useState<RevenueStats | null>(null);
  const { toast } = useToast();

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ixc-financial-analytics');
      
      if (error) throw error;
      
      if (data?.success) {
        setAnalytics(data);
        toast({
          title: "Análise atualizada",
          description: "Dados financeiros carregados com sucesso",
        });
      } else {
        throw new Error(data?.error || 'Erro desconhecido');
      }
    } catch (error) {
      const err = parseError(error);
      console.error('Erro ao buscar analytics:', err);
      toast({
        title: "Erro ao carregar dados",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadRevenueStats = async () => {
    setLoadingRevenue(true);
    try {
      const { data, error } = await supabase.functions.invoke('ixc-revenue-stats');
      
      if (error) throw error;
      
      if (data?.success) {
        setRevenueStats(data);
        toast({
          title: "Receita carregada",
          description: "Estatísticas de receita carregadas com sucesso",
        });
      } else {
        throw new Error(data?.error || 'Erro ao carregar receita');
      }
    } catch (error) {
      const err = parseError(error);
      console.error('Erro ao carregar receita:', err);
      toast({
        title: "Erro ao carregar receita",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoadingRevenue(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const agingData = analytics ? [
    { name: '0-30 dias', value: analytics.aging.days0_30.amount, count: analytics.aging.days0_30.count },
    { name: '31-60 dias', value: analytics.aging.days31_60.amount, count: analytics.aging.days31_60.count },
    { name: '61-90 dias', value: analytics.aging.days61_90.amount, count: analytics.aging.days61_90.count },
    { name: '90+ dias', value: analytics.aging.days90Plus.amount, count: analytics.aging.days90Plus.count },
  ] : [];

  const planData = analytics ? Object.entries(analytics.planPerformance)
    .map(([name, data]) => ({
      name,
      receita: data.revenue,
      ativos: data.activeCount,
      cancelados: data.canceledCount,
      churn: data.churnRate,
    }))
    .sort((a, b) => b.receita - a.receita)
    .slice(0, 10) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Financeiro</h1>
          <p className="text-muted-foreground">Análise completa de receitas e inadimplência</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={loadRevenueStats} 
            disabled={loadingRevenue}
            variant="outline"
            className="gap-2"
          >
            {loadingRevenue ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando...
              </>
            ) : (
              <>
                <DollarSign className="h-4 w-4" />
                Ver Receita IXC
              </>
            )}
          </Button>
          <Button onClick={fetchAnalytics} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Carregando...
              </>
            ) : (
              <>
                <BarChart3 className="mr-2 h-4 w-4" />
                Atualizar Dados
              </>
            )}
          </Button>
        </div>
      </div>

      {!analytics && !revenueStats ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">Clique em "Atualizar Dados" para carregar a análise financeira</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Revenue Stats Card */}
          {revenueStats && (
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Estatísticas de Receita IXC
                </CardTitle>
                <CardDescription>
                  Receita mensal e contratos ativos do IXC
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Receita Total Mensal</p>
                    <p className="text-2xl font-bold text-green-500">
                      {new Intl.NumberFormat('pt-BR', { 
                        style: 'currency', 
                        currency: 'BRL' 
                      }).format(revenueStats.totalMonthlyRevenue)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Contratos Ativos</p>
                    <p className="text-2xl font-bold">{revenueStats.activeContracts}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Ticket Médio</p>
                    <p className="text-2xl font-bold">
                      {new Intl.NumberFormat('pt-BR', { 
                        style: 'currency', 
                        currency: 'BRL' 
                      }).format(revenueStats.averageTicket)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

           {analytics && (
             <>
               {/* Métricas Principais */}
               <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">MRR</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(analytics.mrr)}</div>
                <p className="text-xs text-muted-foreground">
                  Receita Recorrente Mensal
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">ARR</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(analytics.arr)}</div>
                <p className="text-xs text-muted-foreground">
                  Receita Recorrente Anual
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(analytics.averageTicket)}</div>
                <p className="text-xs text-muted-foreground">
                  {analytics.activeContracts} contratos ativos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Taxa de Churn</CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.churnRate.toFixed(2)}%</div>
                <p className="text-xs text-muted-foreground">
                  {analytics.churnedContracts} cancelamentos
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Inadimplência */}
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Inadimplência
              </CardTitle>
              <CardDescription>
                Status de pagamentos em atraso
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3 mb-6">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Total em Atraso</p>
                  <p className="text-2xl font-bold text-destructive">
                    {formatCurrency(analytics.overdueAmount)}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Faturas Vencidas</p>
                  <p className="text-2xl font-bold">{analytics.overdueInvoices}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Taxa de Inadimplência</p>
                  <p className="text-2xl font-bold">{analytics.overdueRate.toFixed(2)}%</p>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h4 className="text-sm font-medium mb-4">Aging de Recebíveis</h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={agingData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {agingData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-4">Top 5 Maiores Devedores</h4>
                  <div className="space-y-3">
                    {analytics.topDebtors.slice(0, 5).map((debtor, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">{debtor.clientName}</p>
                          <p className="text-xs text-muted-foreground">
                            {debtor.invoicesCount} fatura(s) • Desde {new Date(debtor.oldestInvoice).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <Badge variant="destructive">
                          {formatCurrency(debtor.overdueAmount)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="revenue" className="space-y-4">
            <TabsList>
              <TabsTrigger value="revenue">
                <Calendar className="mr-2 h-4 w-4" />
                Evolução de Receita
              </TabsTrigger>
              <TabsTrigger value="plans">
                <BarChart3 className="mr-2 h-4 w-4" />
                Performance por Plano
              </TabsTrigger>
              <TabsTrigger value="projections">
                <TrendingUp className="mr-2 h-4 w-4" />
                Projeções
              </TabsTrigger>
            </TabsList>

            <TabsContent value="revenue" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Evolução da Receita (12 meses)</CardTitle>
                  <CardDescription>Histórico de MRR e contratos ativos</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={analytics.monthlyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis yAxisId="left" tickFormatter={(value) => formatCurrency(value)} />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip 
                        formatter={(value: number, name: string) => [
                          name === 'revenue' ? formatCurrency(value) : value,
                          name === 'revenue' ? 'Receita' : 'Contratos'
                        ]}
                      />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#ef4444" name="Receita" strokeWidth={2} />
                      <Line yAxisId="right" type="monotone" dataKey="contracts" stroke="#3b82f6" name="Contratos" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="plans" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Top 10 Planos por Receita</CardTitle>
                  <CardDescription>Análise de performance e churn por plano</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={planData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                      <YAxis tickFormatter={(value) => formatCurrency(value)} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="receita" fill="#22c55e" name="Receita" />
                    </BarChart>
                  </ResponsiveContainer>

                  <div className="mt-6 space-y-3">
                    {planData.map((plan, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">{plan.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {plan.ativos} ativos • {plan.cancelados} cancelados
                          </p>
                        </div>
                        <div className="text-right space-y-1">
                          <Badge variant={plan.churn > 10 ? "destructive" : "secondary"}>
                            Churn: {plan.churn.toFixed(1)}%
                          </Badge>
                          <p className="text-sm font-bold">{formatCurrency(plan.receita)}</p>
                         </div>
                       </div>
                     ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="projections" className="space-y-4">
              <CashFlowProjections />
            </TabsContent>
          </Tabs>
        </>
      )}
        </div>
      )}
    </div>
  );
};
