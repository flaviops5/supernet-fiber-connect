import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, AlertTriangle, Users, Network, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface MassOutageGroup {
  type: string;
  identifier: string;
  offline_count: number;
  severity: string;
}

interface DetectionResult {
  success: boolean;
  total_offline: number;
  clients_with_pon_data: number;
  mass_outages_detected: number;
  mass_outages: MassOutageGroup[];
  groups_analyzed: {
    total: number;
    by_pon_port: number;
    by_cto: number;
    by_region: number;
  };
}

export function MassOutageConfigSection() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [thresholds, setThresholds] = useState({
    pon: 5,
    cto: 3,
    region: 10
  });

  const executeDetection = async () => {
    try {
      if (loading) {
        toast({
          title: "Detecção em andamento",
          description: "Aguarde a conclusão antes de iniciar outra tentativa.",
        });
        return;
      }

      setLoading(true);
      toast({
        title: "Executando detecção...",
        description: "Verificando grupos de clientes offline. Isso pode demorar alguns minutos.",
      });

      const { data, error } = await supabase.functions.invoke('detect-mass-outage', { body: {} });

      if (error) {
        const isHttpErr = (error as any)?.name === 'FunctionsHttpError' ||
          (error as any)?.message?.includes('non-2xx');
        if (isHttpErr) {
          toast({
            title: "Detecção já em execução",
            description: "Já existe uma detecção em andamento. Tente novamente em até 5 minutos.",
          });
          return;
        }
        throw error;
      }

      setResult(data as DetectionResult);
      
      if (data.mass_outages_detected > 0) {
        toast({
          title: "⚠️ Quedas em massa detectadas!",
          description: `${data.mass_outages_detected} grupo(s) com problemas`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "✅ Nenhuma queda em massa",
          description: `${data.total_offline} clientes offline, mas abaixo dos thresholds`,
        });
      }
    } catch (error) {
      console.error('Erro ao executar detecção:', error);
      toast({
        title: "Erro na detecção",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      default: return 'secondary';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'PON': return <Network className="h-4 w-4" />;
      case 'CTO': return <Users className="h-4 w-4" />;
      case 'REGION': return <MapPin className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuração de Thresholds */}
      <Card>
        <CardHeader>
          <CardTitle>Thresholds de Detecção</CardTitle>
          <CardDescription>
            Configure os limites de clientes offline por agrupamento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="threshold-pon">Porta PON</Label>
              <Input
                id="threshold-pon"
                type="number"
                value={thresholds.pon}
                onChange={(e) => setThresholds({ ...thresholds, pon: parseInt(e.target.value) || 5 })}
                min={1}
              />
              <p className="text-xs text-muted-foreground">Mínimo de clientes offline por porta PON</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="threshold-cto">CTO</Label>
              <Input
                id="threshold-cto"
                type="number"
                value={thresholds.cto}
                onChange={(e) => setThresholds({ ...thresholds, cto: parseInt(e.target.value) || 3 })}
                min={1}
              />
              <p className="text-xs text-muted-foreground">Mínimo de clientes offline por CTO</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="threshold-region">Região</Label>
              <Input
                id="threshold-region"
                type="number"
                value={thresholds.region}
                onChange={(e) => setThresholds({ ...thresholds, region: parseInt(e.target.value) || 10 })}
                min={1}
              />
              <p className="text-xs text-muted-foreground">Mínimo de clientes offline por região</p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            ⚠️ Para alterar permanentemente os thresholds, edite a função <code>detect-mass-outage</code>
          </p>
        </CardContent>
      </Card>

      {/* Executar Detecção */}
      <Card>
        <CardHeader>
          <CardTitle>Executar Detecção Manual</CardTitle>
          <CardDescription>
            Execute uma varredura completa para identificar quedas em massa no momento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={executeDetection} 
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Detectando...
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4 mr-2" />
                Detectar Agora
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Resultados da Detecção */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Resultados da Última Detecção</CardTitle>
            <CardDescription>
              Análise completa dos clientes offline e agrupamentos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Offline</p>
                <p className="text-2xl font-bold">{result.total_offline}</p>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Com Dados PON</p>
                <p className="text-2xl font-bold text-blue-500">{result.clients_with_pon_data}</p>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Grupos Analisados</p>
                <p className="text-2xl font-bold">{result.groups_analyzed.total}</p>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Quedas Detectadas</p>
                <p className="text-2xl font-bold text-destructive">{result.mass_outages_detected}</p>
              </div>
            </div>

            <Separator />

            {/* Lista de Quedas em Massa */}
            {result.mass_outages.length > 0 ? (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Quedas em Massa Detectadas</h3>
                {result.mass_outages.map((outage, index) => (
                  <Card key={index} className="border-l-4 border-l-destructive">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-destructive/10">
                            {getTypeIcon(outage.type)}
                          </div>
                          <div>
                            <p className="font-semibold">{outage.type}: {outage.identifier}</p>
                            <p className="text-sm text-muted-foreground">
                              {outage.offline_count} clientes offline
                            </p>
                          </div>
                        </div>
                        <Badge variant={getSeverityColor(outage.severity)}>
                          {outage.severity.toUpperCase()}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                ✅ Nenhuma queda em massa detectada
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
