import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Radio, TowerControl, Wifi } from "lucide-react";
import { toast as sonnerToast } from "sonner";
import { parseError } from "@/types/error.types";

interface RadioEquipment {
  serial: string;
  status: string;
  cliente: string;
  signal?: string;
  frequency?: string;
  fabricante?: string;
  modelo?: string;
  ip?: string;
  temperatura?: string;
  cpu_load?: string;
  memoria_livre?: number;
  memoria_total?: number;
  uptime?: string;
  voltagem?: string;
  firmware?: string;
}

interface RadioTower {
  tower: string;
  online: number;
  offline: number;
  total: number;
  health: number;
  radios: RadioEquipment[];
}

export function RadioMonitor() {
  const [towers, setTowers] = useState<RadioTower[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadTowers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('ixc-radio-status');

      if (error) throw error;

      if (data?.success) {
        setTowers(data.towers || []);
        toast({
          title: "Dados atualizados",
          description: `${data.total_towers} torres encontradas com ${data.total_radios} equipamentos`,
        });
      } else {
        throw new Error(data?.error || 'Erro ao buscar dados');
      }
    } catch (error) {
      const err = parseError(error);
      console.error('Erro ao carregar torres:', err);
      toast({
        title: "Erro ao carregar dados",
        description: err.message,
        variant: "destructive",
      });
      setTowers([]);
    } finally {
      setLoading(false);
    }
  };

  const testConnectivity = async (ip: string, equipmentName: string) => {
    const loadingToast = sonnerToast.loading(`Testando conectividade com ${equipmentName}...`);
    
    try {
      const { data, error } = await supabase.functions.invoke('test-equipment-connectivity', {
        body: { ip, port: 80, timeout: 5000 }
      });
      
      sonnerToast.dismiss(loadingToast);
      
      if (error) throw error;
      
      if (data.reachable) {
        sonnerToast.success(`${equipmentName} está online!`, {
          description: `Respondeu em ${data.responseTime}ms (HTTP ${data.status})`
        });
      } else {
        sonnerToast.error(`${equipmentName} não está alcançável`, {
          description: data.message
        });
      }
    } catch (error) {
      const err = parseError(error);
      sonnerToast.dismiss(loadingToast);
      console.error('Erro ao testar conectividade:', err);
      sonnerToast.error('Erro ao testar conectividade', {
        description: err.message
      });
    }
  };

  useEffect(() => {
    loadTowers();
  }, []);

  const getHealthColor = (health: number) => {
    if (health >= 80) return "bg-green-500/20 border-green-500/50";
    if (health >= 60) return "bg-yellow-500/20 border-yellow-500/50";
    return "bg-red-500/20 border-red-500/50";
  };

  const getHealthBadge = (health: number) => {
    if (health >= 80) return { variant: "default" as const, label: "Saudável", color: "text-green-600" };
    if (health >= 60) return { variant: "secondary" as const, label: "Atenção", color: "text-yellow-600" };
    return { variant: "destructive" as const, label: "Crítico", color: "text-red-600" };
  };

  const totalTowers = towers.length;
  const healthyTowers = towers.filter(t => t.health >= 80).length;
  const criticalTowers = towers.filter(t => t.health < 60).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TowerControl className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Monitoramento de Torres/Rádio</h2>
        </div>
        <Button
          onClick={loadTowers}
          disabled={loading}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Cards de resumo */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Torres</CardTitle>
            <TowerControl className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTowers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Torres Saudáveis</CardTitle>
            <Wifi className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{healthyTowers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Torres Críticas</CardTitle>
            <Radio className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{criticalTowers}</div>
          </CardContent>
        </Card>
      </div>

      {/* Grid de torres */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full text-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Carregando dados das torres...</p>
          </div>
        ) : towers.length === 0 ? (
          <div className="col-span-full text-center py-8">
            <TowerControl className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Nenhuma torre encontrada</p>
          </div>
        ) : (
          towers.map((tower) => {
            const healthBadge = getHealthBadge(tower.health);
            
            return (
              <Card key={tower.tower} className={`${getHealthColor(tower.health)} border-2`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <TowerControl className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">{tower.tower}</CardTitle>
                    </div>
                    <Badge variant={healthBadge.variant}>{healthBadge.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Saúde</span>
                      <span className={`font-semibold ${healthBadge.color}`}>
                        {tower.health}%
                      </span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          tower.health >= 80 ? 'bg-green-500' :
                          tower.health >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${tower.health}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-background rounded-lg">
                      <div className="text-xs text-muted-foreground">Total</div>
                      <div className="text-lg font-bold">{tower.total}</div>
                    </div>

                    <div className="p-2 bg-green-500/10 rounded-lg">
                      <div className="text-xs text-green-600">Online</div>
                      <div className="text-lg font-bold text-green-600">{tower.online}</div>
                    </div>

                    <div className="p-2 bg-red-500/10 rounded-lg">
                      <div className="text-xs text-red-600">Offline</div>
                      <div className="text-lg font-bold text-red-600">{tower.offline}</div>
                    </div>
                  </div>

                  {tower.radios.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <p className="text-xs text-muted-foreground mb-3 font-semibold">
                        Equipamentos ({tower.radios.length})
                      </p>
                      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                        {tower.radios.map((radio, idx) => (
                          <div key={idx} className="text-xs p-3 bg-background rounded-lg border border-border space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-sm">{radio.cliente}</span>
                              <Badge 
                                variant={radio.status === 'online' ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {radio.status}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                              {radio.ip && (
                                <div className="flex items-center gap-1">
                                  <span className="text-muted-foreground">IP:</span>
                                  <span className="font-mono">{radio.ip}</span>
                                </div>
                              )}
                              {radio.fabricante && (
                                <div className="flex items-center gap-1">
                                  <span className="text-muted-foreground">Fabricante:</span>
                                  <span>{radio.fabricante}</span>
                                </div>
                              )}
                              {radio.temperatura && (
                                <div className="flex items-center gap-1">
                                  <span className="text-muted-foreground">Temp:</span>
                                  <span className={parseFloat(radio.temperatura) > 70 ? 'text-red-600 font-semibold' : ''}>
                                    {radio.temperatura}°C
                                  </span>
                                </div>
                              )}
                              {radio.cpu_load && (
                                <div className="flex items-center gap-1">
                                  <span className="text-muted-foreground">CPU:</span>
                                  <span className={parseFloat(radio.cpu_load) > 80 ? 'text-yellow-600 font-semibold' : ''}>
                                    {radio.cpu_load}
                                  </span>
                                </div>
                              )}
                              {radio.memoria_livre && radio.memoria_total && (
                                <div className="flex items-center gap-1">
                                  <span className="text-muted-foreground">Memória:</span>
                                  <span>{radio.memoria_livre}MB / {radio.memoria_total}MB</span>
                                </div>
                              )}
                              {radio.voltagem && (
                                <div className="flex items-center gap-1">
                                  <span className="text-muted-foreground">Voltagem:</span>
                                  <span>{radio.voltagem}</span>
                                </div>
                              )}
                              {radio.uptime && (
                                <div className="flex items-center gap-1 col-span-2">
                                  <span className="text-muted-foreground">Uptime:</span>
                                  <span>{radio.uptime}</span>
                                </div>
                              )}
                              {radio.firmware && (
                                <div className="flex items-center gap-1 col-span-2">
                                  <span className="text-muted-foreground">Firmware:</span>
                                  <span className="font-mono text-xs">{radio.firmware}</span>
                                </div>
                              )}
                            </div>
                            
                            {radio.ip && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="w-full mt-2"
                                onClick={() => testConnectivity(radio.ip!, `${radio.fabricante || 'Equipamento'} - ${radio.cliente}`)}
                              >
                                <Wifi className="h-3 w-3 mr-2" />
                                Testar Conectividade
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
