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
  
  // RELATÓRIOS
  { endpoint: 'botao_rel_22991', method: 'POST', description: 'Relatório customizado 22991', category: 'Relatórios' },
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
            <div className="text-center py-8 space-y-2">
              <p className="text-sm text-muted-foreground">
                Teste {MAIN_ENDPOINTS.length} endpoints essenciais para operação do sistema
              </p>
              <p className="text-xs text-muted-foreground">
                Clientes, Contratos, Financeiro, Suporte, Comunicação e Relatórios
              </p>
            </div>
          </TabsContent>

          <TabsContent value="gpon" className="space-y-4">
            <div className="text-center py-8 space-y-2">
              <p className="text-sm text-muted-foreground">
                Teste {GPON_ENDPOINTS.length} endpoints relacionados a infraestrutura GPON
              </p>
              <p className="text-xs text-muted-foreground">
                Equipamentos, Monitoramento, Diagnóstico e Infraestrutura de Fibra
              </p>
            </div>
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
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Card className="bg-muted/50">
                <CardContent className="pt-4 pb-3">
                  <div className="text-2xl font-bold">{results.summary.total}</div>
                  <p className="text-xs text-muted-foreground">Total</p>
                </CardContent>
              </Card>
              <Card className="bg-green-50 dark:bg-green-950/30">
                <CardContent className="pt-4 pb-3">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {results.summary.functional}
                  </div>
                  <p className="text-xs text-muted-foreground">Funcionais</p>
                </CardContent>
              </Card>
              <Card className="bg-red-50 dark:bg-red-950/30">
                <CardContent className="pt-4 pb-3">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {results.summary.notFound}
                  </div>
                  <p className="text-xs text-muted-foreground">Não Encontrados</p>
                </CardContent>
              </Card>
              <Card className="bg-orange-50 dark:bg-orange-950/30">
                <CardContent className="pt-4 pb-3">
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {results.summary.ixcErrors}
                  </div>
                  <p className="text-xs text-muted-foreground">Erros IXC</p>
                </CardContent>
              </Card>
              <Card className="bg-gray-50 dark:bg-gray-950/30">
                <CardContent className="pt-4 pb-3">
                  <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                    {results.summary.otherErrors}
                  </div>
                  <p className="text-xs text-muted-foreground">Outros Erros</p>
                </CardContent>
              </Card>
            </div>

            {/* Results by Category */}
            <div>
              <h3 className="font-semibold mb-3">Resultados por Categoria</h3>
              <ScrollArea className="h-[500px]">
                <div className="space-y-3 pr-4">
                  {(() => {
                    const endpoints = activeTab === 'main' ? MAIN_ENDPOINTS : GPON_ENDPOINTS;
                    const grouped = endpoints.reduce((acc, ep) => {
                      const cat = ep.category || 'Outros';
                      if (!acc[cat]) acc[cat] = [];
                      acc[cat].push(ep);
                      return acc;
                    }, {} as Record<string, EndpointTest[]>);

                    return Object.entries(grouped).map(([category, eps]) => {
                      const categoryResults = eps.map(ep => 
                        results.allResults.find(r => r.endpoint === ep.endpoint)
                      ).filter(Boolean);

                      const categoryStats = {
                        total: categoryResults.length,
                        functional: categoryResults.filter(r => r?.status === 'EXISTS').length,
                        errors: categoryResults.filter(r => r?.status !== 'EXISTS').length,
                      };

                      return (
                        <Card key={category}>
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-sm">{category}</CardTitle>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs bg-green-50 dark:bg-green-950/50">
                                  {categoryStats.functional} OK
                                </Badge>
                                {categoryStats.errors > 0 && (
                                  <Badge variant="outline" className="text-xs bg-red-50 dark:bg-red-950/50">
                                    {categoryStats.errors} erros
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            {eps.map((endpoint) => {
                              const result = results.allResults.find(r => r.endpoint === endpoint.endpoint);
                              if (!result) return null;

                              const statusColors = {
                                EXISTS: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900',
                                NOT_FOUND: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900',
                                IXC_ERROR: 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900',
                                ERROR: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900',
                              };

                              const colorClass = statusColors[result.status as keyof typeof statusColors] || 'bg-gray-50 dark:bg-gray-950/30';

                              return (
                                <div key={endpoint.endpoint} className={`p-3 rounded-lg border ${colorClass}`}>
                                  <div className="flex items-start justify-between gap-2 mb-1">
                                    <div className="flex items-start gap-2 flex-1 min-w-0">
                                      {getStatusIcon(result.status)}
                                      <div className="flex-1 min-w-0">
                                        <code className="text-xs font-mono font-semibold break-all">
                                          {endpoint.endpoint}
                                        </code>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                          {endpoint.description}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      {result.recordCount !== undefined && (
                                        <Badge variant="outline" className="text-xs whitespace-nowrap">
                                          {result.recordCount} registros
                                        </Badge>
                                      )}
                                      {getStatusBadge(result.status)}
                                    </div>
                                  </div>
                                  {result.message && (
                                    <p className="text-xs text-muted-foreground mt-2 ml-6">
                                      💬 {result.message}
                                    </p>
                                  )}
                                  {result.duration && (
                                    <p className="text-xs text-muted-foreground mt-1 ml-6">
                                      ⏱️ {result.duration}ms
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </CardContent>
                        </Card>
                      );
                    });
                  })()}
                </div>
              </ScrollArea>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};