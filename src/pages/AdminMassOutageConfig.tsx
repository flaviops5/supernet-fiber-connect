import { useState } from "react";
import { PageHeader } from "@/components/admin";
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

export default function AdminMassOutageConfig() {
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
      setLoading(true);
      toast({
        title: "Executando detecção...",
        description: "Verificando grupos de clientes offline. Isso pode demorar alguns minutos.",
      });

      const { data, error } = await supabase.functions.invoke('detect-mass-outage', {
        body: {}
      });

      if (error) throw error;

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
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Configuração de Detecção de Quedas em Massa"
        description="Configure thresholds e execute detecções manuais para identificar quedas em massa"
      />

      {/* Thresholds Atuais */}
      <Card>
        <CardHeader>
          <CardTitle>Thresholds de Detecção</CardTitle>
          <CardDescription>
            Número mínimo de clientes offline para detectar uma queda em massa
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pon-threshold">
                <Network className="h-4 w-4 inline mr-2" />
                PON (Porta OLT)
              </Label>
              <Input
                id="pon-threshold"
                type="number"
                value={thresholds.pon}
                onChange={(e) => setThresholds({ ...thresholds, pon: parseInt(e.target.value) })}
                min={1}
              />
              <p className="text-xs text-muted-foreground">
                Atualmente: {thresholds.pon}+ clientes na mesma PON
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cto-threshold">
                <Users className="h-4 w-4 inline mr-2" />
                CTO (Caixa Terminal)
              </Label>
              <Input
                id="cto-threshold"
                type="number"
                value={thresholds.cto}
                onChange={(e) => setThresholds({ ...thresholds, cto: parseInt(e.target.value) })}
                min={1}
              />
              <p className="text-xs text-muted-foreground">
                Atualmente: {thresholds.cto}+ clientes na mesma CTO
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="region-threshold">
                <MapPin className="h-4 w-4 inline mr-2" />
                Região (Bairro)
              </Label>
              <Input
                id="region-threshold"
                type="number"
                value={thresholds.region}
                onChange={(e) => setThresholds({ ...thresholds, region: parseInt(e.target.value) })}
                min={1}
              />
              <p className="text-xs text-muted-foreground">
                Atualmente: {thresholds.region}+ clientes na mesma região
              </p>
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 p-4 rounded-lg">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              ⚠️ <strong>Nota:</strong> Os thresholds são fixos no código da edge function. 
              Para alterá-los permanentemente, é necessário modificar o código em <code>supabase/functions/detect-mass-outage/index.ts</code>
            </p>
          </div>
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
            size="lg"
            className="w-full md:w-auto"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Executando...' : 'Executar Detecção Agora'}
          </Button>
        </CardContent>
      </Card>

      {/* Resultados */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Resultado da Detecção</CardTitle>
            <CardDescription>
              Última execução: {new Date().toLocaleString('pt-BR')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Offline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{result.total_offline}</div>
                  <p className="text-xs text-muted-foreground">clientes sem conexão</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Grupos Analisados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{result.groups_analyzed.total}</div>
                  <p className="text-xs text-muted-foreground">
                    PON: {result.groups_analyzed.by_pon_port} | CTO: {result.groups_analyzed.by_cto} | Região: {result.groups_analyzed.by_region}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Quedas Detectadas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">
                    {result.mass_outages_detected}
                  </div>
                  <p className="text-xs text-muted-foreground">acima dos thresholds</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Com Dados PON
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{result.clients_with_pon_data}</div>
                  <p className="text-xs text-muted-foreground">clientes identificados</p>
                </CardContent>
              </Card>
            </div>

            <Separator />

            {/* Lista de Quedas em Massa */}
            {result.mass_outages.length > 0 ? (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Quedas em Massa Detectadas</h3>
                {result.mass_outages.map((outage, index) => (
                  <Card key={index} className="border-l-4 border-l-destructive">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-destructive/10">
                            {getTypeIcon(outage.type)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">{outage.identifier}</h4>
                              <Badge variant={getSeverityColor(outage.severity)}>
                                {outage.severity}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              Tipo: {outage.type}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-destructive">
                            {outage.offline_count}
                          </div>
                          <p className="text-xs text-muted-foreground">clientes offline</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>Nenhuma queda em massa detectada acima dos thresholds configurados</p>
                <p className="text-sm mt-2">
                  Existem {result.total_offline} clientes offline, mas distribuídos em grupos menores que os thresholds
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
