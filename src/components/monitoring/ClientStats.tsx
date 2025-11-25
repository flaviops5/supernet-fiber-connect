import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Users, UserCheck, UserX, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function ClientStats() {
  const { data, isLoading, refetch, isFetching, error } = useQuery({
    queryKey: ['ixc-client-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('ixc-count-clients');
      if (error) throw error;
      return data;
    },
    refetchInterval: 60000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const handleRefresh = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Estatísticas de Clientes IXC</CardTitle>
          <CardDescription>Carregando dados...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || data?.success === false) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Estatísticas de Clientes IXC</CardTitle>
            <CardDescription className="text-destructive">
              ❌ Erro ao buscar dados do IXC
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
            disabled={isFetching}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            Tentar Novamente
          </Button>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive font-medium">
              {data?.error || (error as Error)?.message || 'Falha na comunicação com o IXC'}
            </p>
            {data?.details && (
              <p className="text-xs text-muted-foreground mt-2">{data.details}</p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const stats = data?.detalhes || { total: 0, online: 0, offline: 0 };
  const onlinePercentage = stats.total > 0 ? ((stats.online / stats.total) * 100).toFixed(1) : 0;
  const offlinePercentage = stats.total > 0 ? ((stats.offline / stats.total) * 100).toFixed(1) : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Estatísticas de Clientes IXC</CardTitle>
          <CardDescription>Dados em tempo real do sistema</CardDescription>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleRefresh}
          disabled={isFetching}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="flex items-center gap-4 p-4 border rounded-lg">
            <div className="p-3 bg-primary/10 rounded-full">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total de Clientes</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 border rounded-lg">
            <div className="p-3 bg-green-500/10 rounded-full">
              <UserCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Online</p>
              <p className="text-2xl font-bold">{stats.online}</p>
              <p className="text-xs text-muted-foreground">{onlinePercentage}%</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 border rounded-lg">
            <div className="p-3 bg-red-500/10 rounded-full">
              <UserX className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Offline</p>
              <p className="text-2xl font-bold">{stats.offline}</p>
              <p className="text-xs text-muted-foreground">{offlinePercentage}%</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
