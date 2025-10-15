import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Search, CheckCircle2, XCircle, AlertCircle, Activity } from "lucide-react";

interface EndpointTest {
  endpoint: string;
  method: string;
  description: string;
  category: string;
}

interface EndpointResult {
  endpoint: string;
  status: 'EXISTS' | 'NOT_FOUND' | 'IXC_ERROR' | 'ERROR' | 'UNKNOWN_FORMAT' | 'PARSE_ERROR';
  statusCode?: number;
  recordCount?: number;
  message?: string;
  errorMessage?: string;
  duration?: number;
}

interface DiscoveryResult {
  success: boolean;
  summary: {
    total: number;
    functional: number;
    notFound: number;
    ixcErrors: number;
    otherErrors: number;
  };
  functionalEndpoints: Array<{ endpoint: string; recordCount: number }>;
  ixcErrorEndpoints: Array<{ endpoint: string; errorMessage: string; details: string }>;
  allResults: EndpointResult[];
}

// Endpoints principais do sistema
const MAIN_ENDPOINTS: EndpointTest[] = [
  // CLIENTES
  { endpoint: 'cliente', method: 'GET', description: 'Listar clientes', category: 'Clientes' },
  { endpoint: 'cliente_arquivo', method: 'POST', description: 'Arquivos do cliente', category: 'Clientes' },
  { endpoint: 'consulta_spc_serasa', method: 'POST', description: 'Consulta SPC/Serasa', category: 'Clientes' },
  
  // CONTRATOS
  { endpoint: 'cliente_contrato', method: 'GET', description: 'Contratos do cliente', category: 'Contratos' },
  { endpoint: 'cliente_contrato_descontos', method: 'GET', description: 'Descontos do contrato', category: 'Contratos' },
  { endpoint: 'cliente_contrato_acrescimos', method: 'GET', description: 'Acréscimos do contrato', category: 'Contratos' },
  { endpoint: 'vd_contratos', method: 'GET', description: 'Visão de contratos', category: 'Contratos' },
  
  // FINANCEIRO
  { endpoint: 'fn_areceber', method: 'GET', description: 'Contas a receber', category: 'Financeiro' },
  { endpoint: 'fn_areceber_recebimentos_baixas_novo', method: 'POST', description: 'Registrar pagamento', category: 'Financeiro' },
  { endpoint: 'fn_areceber_altera', method: 'POST', description: 'Alterar conta a receber', category: 'Financeiro' },
  
  // SUPORTE
  { endpoint: 'su_oss_chamado', method: 'GET', description: 'Ordens de serviço', category: 'Suporte' },
  { endpoint: 'su_assunto_chamado', method: 'GET', description: 'Assuntos de atendimento', category: 'Suporte' },
  
  // COMUNICAÇÃO
  { endpoint: 'botaoAjax_22282', method: 'POST', description: 'Enviar SMS/Omnichannel', category: 'Comunicação' },
];

// Endpoints GPON para descoberta
const GPON_ENDPOINTS: EndpointTest[] = [
  // Equipamentos
  { endpoint: 'cliente_equipamento', method: 'POST', description: 'Equipamentos do cliente', category: 'Equipamentos' },
  { endpoint: 'equipamento_fibra', method: 'POST', description: 'Equipamentos de fibra', category: 'Equipamentos' },
  { endpoint: 'pon_onu', method: 'POST', description: 'ONUs na rede PON', category: 'Equipamentos' },
  { endpoint: 'equipamento', method: 'POST', description: 'Equipamentos gerais', category: 'Equipamentos' },
  
  // Monitoramento
  { endpoint: 'pon_olt', method: 'POST', description: 'OLTs na rede', category: 'Monitoramento' },
  { endpoint: 'pon_sinal', method: 'POST', description: 'Status do sinal PON', category: 'Monitoramento' },
  { endpoint: 'cliente_conexao_historico', method: 'POST', description: 'Histórico de conexões', category: 'Monitoramento' },
  
  // Diagnóstico
  { endpoint: 'pon_diagnostico', method: 'POST', description: 'Diagnóstico geral PON', category: 'Diagnóstico' },
  { endpoint: 'pon_rx_power', method: 'POST', description: 'Potência de recepção (RX)', category: 'Diagnóstico' },
  { endpoint: 'pon_tx_power', method: 'POST', description: 'Potência de transmissão (TX)', category: 'Diagnóstico' },
  { endpoint: 'diagnostico_rede', method: 'POST', description: 'Diagnóstico de rede', category: 'Diagnóstico' },
  
  // Infraestrutura
  { endpoint: 'fibra_cto', method: 'POST', description: 'CTOs da rede', category: 'Infraestrutura' },
  { endpoint: 'fibra_splitter', method: 'POST', description: 'Splitters da rede', category: 'Infraestrutura' },
  { endpoint: 'fibra_cabo', method: 'POST', description: 'Cabos de fibra', category: 'Infraestrutura' },
  { endpoint: 'su_olt', method: 'GET', description: 'Listar OLTs (suporte)', category: 'Infraestrutura' },
  { endpoint: 'su_olt_pon', method: 'GET', description: 'Portas PON das OLTs', category: 'Infraestrutura' },
];

export const IXCEndpointTester = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DiscoveryResult | null>(null);
  const [activeTab, setActiveTab] = useState<'main' | 'gpon'>('main');

  const testEndpoints = async (endpoints: EndpointTest[]) => {
    setLoading(true);
    setResults(null);

    try {
      const { data, error } = await supabase.functions.invoke('ixc-discover-gpon-endpoints', {
        body: { endpoints: endpoints.map(e => e.endpoint) }
      });

      if (error) throw error;

      if (data.success) {
        setResults(data);
        toast.success(
          `Teste concluído! ${data.summary.functional} funcionais, ${data.summary.ixcErrors} com erro IXC.`
        );
      } else {
        throw new Error(data.error || 'Erro no teste');
      }
    } catch (error) {
      console.error('Erro no teste:', error);
      toast.error(
        error instanceof Error ? error.message : 'Erro ao testar endpoints'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleTest = () => {
    const endpoints = activeTab === 'main' ? MAIN_ENDPOINTS : GPON_ENDPOINTS;
    testEndpoints(endpoints);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'EXISTS':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'NOT_FOUND':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'IXC_ERROR':
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      EXISTS: { label: 'Funcional', variant: 'default' as const },
      NOT_FOUND: { label: 'Não Encontrado', variant: 'destructive' as const },
      IXC_ERROR: { label: 'Erro IXC', variant: 'secondary' as const },
      ERROR: { label: 'Erro', variant: 'destructive' as const },
      UNKNOWN_FORMAT: { label: 'Formato Desconhecido', variant: 'secondary' as const },
      PARSE_ERROR: { label: 'Erro Parse', variant: 'secondary' as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.ERROR;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const renderEndpointList = (endpoints: EndpointTest[]) => {
    const grouped = endpoints.reduce((acc, ep) => {
      const cat = ep.category || 'Outros';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(ep);
      return acc;
    }, {} as Record<string, EndpointTest[]>);

    return (
      <ScrollArea className="h-[400px] rounded-md border">
        <div className="p-4 space-y-4">
          {Object.entries(grouped).map(([category, eps]) => (
            <div key={category}>
              <h4 className="text-xs font-semibold text-muted-foreground mb-2">
                {category} ({eps.length})
              </h4>
              <div className="space-y-2">
                {eps.map((endpoint, index) => (
                  <Card key={index} className="bg-muted/50">
                    <CardContent className="py-2 px-3">
                      <div className="flex justify-between items-start mb-1">
                        <code className="text-xs font-mono font-semibold">
                          /webservice/v1/{endpoint.endpoint}
                        </code>
                        <Badge variant="outline" className="text-xs">{endpoint.method}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {endpoint.description}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Testador de Endpoints IXC
        </CardTitle>
        <CardDescription>
          Teste a disponibilidade dos endpoints principais e GPON do IXC
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'main' | 'gpon')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="main">
              Endpoints Principais ({MAIN_ENDPOINTS.length})
            </TabsTrigger>
            <TabsTrigger value="gpon">
              Endpoints GPON ({GPON_ENDPOINTS.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="main" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Endpoints essenciais para operação do sistema (Clientes, Contratos, Financeiro, Suporte)
            </p>
            {renderEndpointList(MAIN_ENDPOINTS)}
          </TabsContent>

          <TabsContent value="gpon" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Endpoints relacionados a equipamentos GPON/PON, diagnóstico e infraestrutura de fibra
            </p>
            {renderEndpointList(GPON_ENDPOINTS)}
          </TabsContent>
        </Tabs>

        <Button 
          onClick={handleTest} 
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Testando endpoints...
            </>
          ) : (
            <>
              <Search className="mr-2 h-4 w-4" />
              Testar {activeTab === 'main' ? 'Principais' : 'GPON'}
            </>
          )}
        </Button>

        {results && (
          <>
            <Separator />
            
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{results.summary.total}</div>
                  <p className="text-xs text-muted-foreground">Total</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-green-600">
                    {results.summary.functional}
                  </div>
                  <p className="text-xs text-muted-foreground">Funcionais</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-red-600">
                    {results.summary.notFound}
                  </div>
                  <p className="text-xs text-muted-foreground">Não Encontrados</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-orange-600">
                    {results.summary.ixcErrors}
                  </div>
                  <p className="text-xs text-muted-foreground">Erros IXC</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-gray-600">
                    {results.summary.otherErrors}
                  </div>
                  <p className="text-xs text-muted-foreground">Outros Erros</p>
                </CardContent>
              </Card>
            </div>

            {/* Functional Endpoints */}
            {results.functionalEndpoints.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Endpoints Funcionais ({results.functionalEndpoints.length})
                </h3>
                <ScrollArea className="h-[200px] rounded-md border">
                  <div className="p-4 space-y-2">
                    {results.functionalEndpoints.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-950 rounded">
                        <code className="text-xs font-mono">{item.endpoint}</code>
                        <Badge variant="outline" className="text-xs">
                          {item.recordCount} registros
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* IXC Error Endpoints */}
            {results.ixcErrorEndpoints.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-orange-500" />
                  Endpoints com Erro IXC ({results.ixcErrorEndpoints.length})
                </h3>
                <ScrollArea className="h-[200px] rounded-md border">
                  <div className="p-4 space-y-2">
                    {results.ixcErrorEndpoints.map((item, idx) => (
                      <div key={idx} className="p-2 bg-orange-50 dark:bg-orange-950 rounded space-y-1">
                        <code className="text-xs font-mono font-semibold">{item.endpoint}</code>
                        <p className="text-xs text-muted-foreground">{item.errorMessage}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* All Results */}
            <div>
              <h3 className="font-semibold text-sm mb-2">Resultados Detalhados</h3>
              <ScrollArea className="h-[300px] rounded-md border">
                <div className="p-4 space-y-2">
                  {results.allResults.map((result, idx) => (
                    <Card key={idx}>
                      <CardContent className="py-3 px-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-2 flex-1">
                            {getStatusIcon(result.status)}
                            <div className="flex-1">
                              <code className="text-xs font-mono font-semibold">
                                {result.endpoint}
                              </code>
                              {result.message && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {result.message}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {result.statusCode && (
                              <Badge variant="outline" className="text-xs">
                                {result.statusCode}
                              </Badge>
                            )}
                            {getStatusBadge(result.status)}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};