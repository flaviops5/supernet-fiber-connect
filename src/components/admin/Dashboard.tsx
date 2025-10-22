import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, CreditCard, MapPin, BarChart3, MessageSquare, Monitor } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MassOutageAlertCard } from "@/components/MassOutageAlertCard";
import { WhatsAppApiTester } from "@/components/WhatsAppApiTester";
import { TestClientFinancialStatus } from "@/components/TestClientFinancialStatus";
import { DiagnosticoClienteCompleto } from "@/components/DiagnosticoClienteCompleto";
import { AutoSendOverdueInvoices } from "@/components/AutoSendOverdueInvoices";
import { TestContractFlow } from "@/components/TestContractFlow";
import { logger } from "@/lib/logger";

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPlans: 0,
    coverageAreas: 0,
    testimonials: 0
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [
          { count: usersCount },
          { count: plansCount },
          { count: areasCount },
          { count: testimonialsCount }
        ] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('plans').select('*', { count: 'exact', head: true }),
          supabase.from('coverage_areas').select('*', { count: 'exact', head: true }),
          supabase.from('profiles').select('*', { count: 'exact', head: true })
        ]);

        setStats({
          totalUsers: usersCount || 0,
          totalPlans: plansCount || 0,
          coverageAreas: areasCount || 0,
          testimonials: testimonialsCount || 0
        });
      } catch (error) {
        logger.error('Error loading admin stats', error as Error);
      }
    };

    loadStats();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do sistema administrativo</p>
      </div>

      <MassOutageAlertCard />
      <WhatsAppApiTester />
      <TestClientFinancialStatus />
      <DiagnosticoClienteCompleto />
      <AutoSendOverdueInvoices />

      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
          <CardDescription>Acesso rápido às principais funcionalidades</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <Button
            variant="outline"
            className="justify-start h-auto py-4"
            onClick={() => window.location.href = '/admin/agentes'}
          >
            <div className="flex items-center gap-3 w-full">
              <Users className="h-5 w-5 text-primary" />
              <div className="text-left">
                <div className="font-semibold">Gerenciar Agentes</div>
                <div className="text-xs text-muted-foreground">Atribuir departamentos</div>
              </div>
            </div>
          </Button>
          <Button
            variant="outline"
            className="justify-start h-auto py-4"
            onClick={() => window.location.href = '/atendimento'}
          >
            <div className="flex items-center gap-3 w-full">
              <MessageSquare className="h-5 w-5 text-primary" />
              <div className="text-left">
                <div className="font-semibold">Central de Atendimento</div>
                <div className="text-xs text-muted-foreground">Gerenciar conversas</div>
              </div>
            </div>
          </Button>
          <Button
            variant="outline"
            className="justify-start h-auto py-4"
            onClick={() => window.location.href = '/admin/monitoramento'}
          >
            <div className="flex items-center gap-3 w-full">
              <Monitor className="h-5 w-5 text-primary" />
              <div className="text-left">
                <div className="font-semibold">Monitoramento</div>
                <div className="text-xs text-muted-foreground">Auto-reboot e status</div>
              </div>
            </div>
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Planos Ativos</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPlans}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Áreas de Cobertura</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.coverageAreas}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Depoimentos</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.testimonials}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <TestContractFlow />
        
        <Card>
          <CardHeader>
            <CardTitle>Atividades Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Nenhuma atividade recente</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
