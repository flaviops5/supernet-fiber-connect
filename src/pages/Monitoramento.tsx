import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AuthGuard } from '@/components/AuthGuard';
import { MassOutageMonitor } from '@/components/MassOutageMonitor';
import { MassOutageHistory } from '@/components/MassOutageHistory';
import { MassOutageConfigSection } from '@/components/MassOutageConfigSection';
import { PonPortsMonitor } from '@/components/PonPortsMonitor';
import { RadioMonitor } from '@/components/RadioMonitor';
import { RebootHistory } from '@/components/monitoring/RebootHistory';
import { RebootBlacklist } from '@/components/monitoring/RebootBlacklist';
import { RebootSettings } from '@/components/monitoring/RebootSettings';
import { RebootStats } from '@/components/monitoring/RebootStats';
import { RebootCandidates } from '@/components/monitoring/RebootCandidates';
import { ClientStats } from '@/components/monitoring/ClientStats';
import ContextEscapeAnalytics from '@/components/monitoring/ContextEscapeAnalytics';
import { PerformanceMonitor } from '@/components/monitoring/PerformanceMonitor';
import { Users, Activity, UserCheck, UserX, Shield, Loader2, ArrowLeft, AlertTriangle, Network, TowerControl, Clock, RefreshCw, Zap, Settings } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { BackButton } from '@/components/BackButton';

export default function Monitoramento() {
  const [loading, setLoading] = useState(false);
  const [clientCount, setClientCount] = useState<{
    success: boolean;
    total_clientes?: number;
    ativos?: number;
    inativos?: number;
    bloqueados?: number;
  } | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const countClients = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ixc-count-clients');
      
      if (error) throw error;
      
      if (data?.success) {
        setClientCount(data);
        toast({
          title: "Contagem concluída",
          description: `Total de ${data.total_clientes || 0} clientes encontrados`,
        });
      } else {
        throw new Error(data?.error || 'Erro ao contar clientes');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('Erro ao contar clientes:', error);
      toast({
        title: "Erro ao contar clientes",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    countClients();
  }, []);

  const testPonAccess = async () => {
    setLoading(true);
    try {
      toast({
        title: "Testando acesso PON",
        description: "Consultando dados da rede GPON...",
      });

      const { data, error } = await supabase.functions.invoke('detect-mass-outage');
      
      if (error) throw error;
      
      console.log('Resultado do teste PON:', data);
      
      if (data?.success) {
        const ponData = data.clients_with_pon_data || 0;
        const totalOffline = data.total_offline || 0;
        const groups = data.groups_analyzed || {};
        
        toast({
          title: "✅ Acesso PON configurado",
          description: `${ponData}/${totalOffline} clientes offline com dados PON. ${groups.by_pon_port || 0} porta(s) PON identificada(s).`,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('Erro ao testar acesso PON:', error);
      toast({
        title: "Erro no teste",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard requiredRoles={['admin', 'editor']}>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container mx-auto p-6 space-y-6">
          {/* Header */}
          <BackButton />
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Monitoramento Ativo
              </h1>
              <p className="text-muted-foreground">
                Acompanhe métricas, status dos clientes e auto-reboot em tempo real
              </p>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="status" className="space-y-6">
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="status" className="gap-2">
                <Activity className="h-4 w-4" />
                Status
              </TabsTrigger>
              <TabsTrigger value="performance" className="gap-2">
                <Zap className="h-4 w-4" />
                Performance
              </TabsTrigger>
              <TabsTrigger value="autoreboot" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Auto Reboot
              </TabsTrigger>
              <TabsTrigger value="context-escape" className="gap-2">
                <Shield className="h-4 w-4" />
                Fuga Contexto
              </TabsTrigger>
              <TabsTrigger value="mass-outage" className="gap-2">
                <AlertTriangle className="h-4 w-4" />
                Quedas em Massa
              </TabsTrigger>
              <TabsTrigger value="pon" className="gap-2">
                <Network className="h-4 w-4" />
                PON
              </TabsTrigger>
              <TabsTrigger value="radio" className="gap-2">
                <TowerControl className="h-4 w-4" />
                POP
              </TabsTrigger>
            </TabsList>

            <TabsContent value="status" className="space-y-6">

              {/* Stats Cards */}
              {clientCount && (
            <div className="grid gap-6 md:grid-cols-3">
              <Card className="border-primary/20 hover:border-primary/40 transition-all">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
                  <Users className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">
                    {String(clientCount.total_clientes || ((clientCount as Record<string, unknown>).detalhes as Record<string, unknown>)?.total || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Base completa de clientes
                  </p>
                  <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                    Última atualização: {new Date().toLocaleString('pt-BR')} • {String((clientCount as Record<string, unknown>).paginas_consultadas || 0)} página(s) consultada(s)
                  </p>
                </CardContent>
              </Card>

              <Card className="border-green-500/20 hover:border-green-500/40 transition-all">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Clientes Online</CardTitle>
                  <UserCheck className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-500">
                    {String(((clientCount as Record<string, unknown>).detalhes as Record<string, unknown>)?.online || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {Number(clientCount.total_clientes || ((clientCount as Record<string, unknown>).detalhes as Record<string, unknown>)?.total || 0) > 0 
                      ? `${((Number(((clientCount as Record<string, unknown>).detalhes as Record<string, unknown>)?.online || 0) / Number(clientCount.total_clientes || ((clientCount as Record<string, unknown>).detalhes as Record<string, unknown>)?.total || 1)) * 100).toFixed(1)}% da base`
                      : '0% da base'
                    }
                  </p>
                </CardContent>
              </Card>

              <Card className="border-orange-500/20 hover:border-orange-500/40 transition-all">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Clientes Offline</CardTitle>
                  <UserX className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-orange-500">
                    {String(((clientCount as Record<string, unknown>).detalhes as Record<string, unknown>)?.offline || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {Number(clientCount.total_clientes || ((clientCount as Record<string, unknown>).detalhes as Record<string, unknown>)?.total || 0) > 0 
                      ? `${((Number(((clientCount as Record<string, unknown>).detalhes as Record<string, unknown>)?.offline || 0) / Number(clientCount.total_clientes || ((clientCount as Record<string, unknown>).detalhes as Record<string, unknown>)?.total || 1)) * 100).toFixed(1)}% da base`
                      : '0% da base'
                    }
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
            </TabsContent>

            <TabsContent value="performance" className="space-y-6">
              <PerformanceMonitor />
            </TabsContent>

            <TabsContent value="autoreboot" className="space-y-6">
              <ClientStats />
              <RebootStats />
              <RebootCandidates />
              
              <Tabs defaultValue="history" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="history">Histórico</TabsTrigger>
                  <TabsTrigger value="blacklist">Blacklist</TabsTrigger>
                  <TabsTrigger value="settings">Configurações</TabsTrigger>
                </TabsList>

                <TabsContent value="history">
                  <RebootHistory />
                </TabsContent>

                <TabsContent value="blacklist">
                  <RebootBlacklist />
                </TabsContent>

                <TabsContent value="settings">
                  <RebootSettings />
                </TabsContent>
              </Tabs>
            </TabsContent>

            <TabsContent value="context-escape" className="space-y-6">
              <ContextEscapeAnalytics />
            </TabsContent>

            <TabsContent value="pon">
              <PonPortsMonitor />
            </TabsContent>

            <TabsContent value="radio">
              <RadioMonitor />
            </TabsContent>

            <TabsContent value="mass-outage" className="space-y-6">
              <MassOutageConfigSection />
              <MassOutageMonitor />
              <MassOutageHistory />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AuthGuard>
  );
}
