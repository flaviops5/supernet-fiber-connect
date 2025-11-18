import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, Loader2, Activity, AlertCircle, CheckCircle, Network } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { parseError } from '@/types/error.types';

interface PonPort {
  port: string;
  pop?: string;
  online: number;
  offline: number;
  total: number;
  health: number;
  onus: Array<{
    serial: string;
    status: string;
    cliente: string;
    rx_power?: string;
    ultimo_evento?: string;
  }>;
}

export function PonPortsMonitor() {
  const [ports, setPorts] = useState<PonPort[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const loadPorts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ixc-pon-status');
      
      if (error) throw error;
      
      if (data?.success) {
        // Adicionar informação de POP baseada no OLT
        const portsWithPop = (data.ports || []).map((port: PonPort) => {
          const [olt] = port.port.split('/');
          return {
            ...port,
            pop: olt // O primeiro segmento é geralmente o OLT/POP
          };
        });
        setPorts(portsWithPop);
        toast({
          title: "Status PON atualizado",
          description: `${data.total_ports} portas, ${data.total_onus} ONUs`,
        });
      } else {
        throw new Error(data?.error || 'Erro ao carregar portas PON');
      }
    } catch (error) {
      const err = parseError(error);
      console.error('Erro ao carregar portas:', err);
      toast({
        title: "Erro ao carregar portas PON",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPorts();
  }, []);

  const getHealthColor = (health: number) => {
    if (health >= 90) return 'bg-green-500';
    if (health >= 70) return 'bg-yellow-500';
    if (health >= 50) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getHealthBadge = (health: number) => {
    if (health >= 90) return { variant: 'default' as const, label: 'Ótimo', color: 'text-green-500' };
    if (health >= 70) return { variant: 'secondary' as const, label: 'Bom', color: 'text-yellow-500' };
    if (health >= 50) return { variant: 'secondary' as const, label: 'Alerta', color: 'text-orange-500' };
    return { variant: 'destructive' as const, label: 'Crítico', color: 'text-red-500' };
  };

  const totalPorts = ports.length;
  const healthyPorts = ports.filter(p => p.health >= 90).length;
  const criticalPorts = ports.filter(p => p.health < 50).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Monitor de Portas PON</h2>
          <p className="text-muted-foreground">
            Status em tempo real da rede GPON
          </p>
        </div>
        <Button 
          onClick={loadPorts}
          disabled={loading}
          className="gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Atualizando...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </>
          )}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Portas</CardTitle>
            <Network className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPorts}</div>
            <p className="text-xs text-muted-foreground">Portas PON ativas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portas Saudáveis</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{healthyPorts}</div>
            <p className="text-xs text-muted-foreground">≥ 90% de disponibilidade</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portas Críticas</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{criticalPorts}</div>
            <p className="text-xs text-muted-foreground">{'<'} 50% de disponibilidade</p>
          </CardContent>
        </Card>
      </div>

      {/* Grid de Portas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {ports.map((port) => {
          const healthBadge = getHealthBadge(port.health);
          return (
            <Card key={port.port} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-mono">{port.port}</CardTitle>
                    {port.pop && (
                      <p className="text-xs text-muted-foreground">
                        POP: <span className="font-semibold">{port.pop}</span>
                      </p>
                    )}
                  </div>
                  <Badge variant={healthBadge.variant} className={healthBadge.color}>
                    {healthBadge.label}
                  </Badge>
                </div>
                <CardDescription>
                  {port.total} ONU{port.total !== 1 ? 's' : ''} nesta porta
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Disponibilidade</span>
                    <span className="font-bold">{port.health.toFixed(1)}%</span>
                  </div>
                  <Progress 
                    value={port.health} 
                    className="h-2"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2 text-sm">
                          <div className="h-3 w-3 rounded-full bg-green-500" />
                          <span className="font-medium">{port.online}</span>
                          <span className="text-muted-foreground">online</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{port.online} ONU{port.online !== 1 ? 's' : ''} operando normalmente</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2 text-sm">
                          <div className="h-3 w-3 rounded-full bg-red-500" />
                          <span className="font-medium">{port.offline}</span>
                          <span className="text-muted-foreground">offline</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{port.offline} ONU{port.offline !== 1 ? 's' : ''} sem comunicação</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {!loading && ports.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Network className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma porta PON encontrada</h3>
            <p className="text-muted-foreground max-w-md">
              Clique em "Atualizar" para carregar os dados das portas PON
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
