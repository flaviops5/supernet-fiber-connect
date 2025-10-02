import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AuthGuard } from '@/components/AuthGuard';
import { Users, Activity, UserCheck, UserX, Shield, Loader2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Monitoramento() {
  const [loading, setLoading] = useState(false);
  const [clientCount, setClientCount] = useState<any>(null);
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
          description: `Total de ${data.totalClients} clientes encontrados`,
        });
      } else {
        throw new Error(data?.error || 'Erro ao contar clientes');
      }
    } catch (error: any) {
      console.error('Erro ao contar clientes:', error);
      toast({
        title: "Erro ao contar clientes",
        description: error.message,
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/admin')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  Monitoramento IXC
                </h1>
                <p className="text-muted-foreground">
                  Acompanhe métricas e status dos clientes em tempo real
                </p>
              </div>
            </div>

            <Button 
              onClick={countClients}
              disabled={loading}
              size="lg"
              className="gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Contando...
                </>
              ) : (
                <>
                  <Activity className="h-4 w-4" />
                  Atualizar Contagem
                </>
              )}
            </Button>
          </div>

          {/* Stats Cards */}
          {clientCount && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card className="border-primary/20 hover:border-primary/40 transition-all">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
                  <Users className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">
                    {clientCount.totalClients}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Base completa de clientes
                  </p>
                </CardContent>
              </Card>

              <Card className="border-green-500/20 hover:border-green-500/40 transition-all">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
                  <UserCheck className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-500">
                    {clientCount.activeClients}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {clientCount.totalClients > 0 
                      ? `${((clientCount.activeClients / clientCount.totalClients) * 100).toFixed(1)}% da base`
                      : '0% da base'
                    }
                  </p>
                </CardContent>
              </Card>

              <Card className="border-orange-500/20 hover:border-orange-500/40 transition-all">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Clientes Inativos</CardTitle>
                  <UserX className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-orange-500">
                    {clientCount.inactiveClients}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {clientCount.totalClients > 0 
                      ? `${((clientCount.inactiveClients / clientCount.totalClients) * 100).toFixed(1)}% da base`
                      : '0% da base'
                    }
                  </p>
                </CardContent>
              </Card>

              <Card className="border-red-500/20 hover:border-red-500/40 transition-all">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Clientes Bloqueados</CardTitle>
                  <Shield className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-500">
                    {clientCount.blockedClients}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {clientCount.totalClients > 0 
                      ? `${((clientCount.blockedClients / clientCount.totalClients) * 100).toFixed(1)}% da base`
                      : '0% da base'
                    }
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Details Card */}
          {clientCount && clientCount.details && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Detalhes por Status
                </CardTitle>
                <CardDescription>
                  Última atualização: {new Date().toLocaleString('pt-BR')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(clientCount.details).map(([status, count]: [string, any]) => (
                    <div key={status} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{status}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {count} cliente{count !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="text-2xl font-bold">
                        {count}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {!clientCount && !loading && (
            <Card>
              <CardHeader>
                <CardTitle>Bem-vindo ao Monitoramento IXC</CardTitle>
                <CardDescription>
                  Clique no botão "Atualizar Contagem" para carregar os dados dos clientes
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground max-w-md">
                  Esta página permite monitorar em tempo real o status de todos os clientes
                  cadastrados no sistema IXC, incluindo clientes ativos, inativos e bloqueados.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
