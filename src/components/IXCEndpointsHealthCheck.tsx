import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Play, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface EndpointTest {
  path: string;
  method: 'GET' | 'POST';
  category: string;
  status?: 'testing' | 'success' | 'error' | 'not_found';
  statusCode?: number;
  message?: string;
  duration?: number;
}

const ENDPOINTS: EndpointTest[] = [
  // CLIENTES
  { path: '/webservice/v1/cliente', method: 'GET', category: 'Clientes' },
  { path: '/webservice/v1/cliente_arquivo', method: 'POST', category: 'Clientes' },
  { path: '/webservice/v1/consulta_spc_serasa', method: 'POST', category: 'Clientes' },
  { path: '/webservice/v1/bloquear_desbloquear_sip', method: 'POST', category: 'Clientes' },
  
  // CONTRATOS
  { path: '/webservice/v1/cliente_contrato', method: 'GET', category: 'Contratos' },
  { path: '/webservice/v1/cliente_contrato_descontos', method: 'GET', category: 'Contratos' },
  { path: '/webservice/v1/cliente_contrato_acrescimos', method: 'GET', category: 'Contratos' },
  { path: '/webservice/v1/cliente_contrato_servicos', method: 'GET', category: 'Contratos' },
  { path: '/webservice/v1/cliente_contrato_ativar_cliente', method: 'POST', category: 'Contratos' },
  { path: '/webservice/v1/desativar_cancelar_financeiro_nao_vencido', method: 'POST', category: 'Contratos' },
  { path: '/webservice/v1/negativar_bloquear', method: 'POST', category: 'Contratos' },
  { path: '/webservice/v1/vd_contratos', method: 'GET', category: 'Contratos' },
  { path: '/webservice/v1/vd_contratos_produtos', method: 'GET', category: 'Contratos' },
  
  // FINANCEIRO
  { path: '/webservice/v1/fn_areceber', method: 'GET', category: 'Financeiro' },
  { path: '/webservice/v1/fn_areceber_recebimentos_baixas_novo', method: 'POST', category: 'Financeiro' },
  { path: '/webservice/v1/fn_areceber_altera', method: 'POST', category: 'Financeiro' },
  
  // SUPORTE
  { path: '/webservice/v1/su_oss_chamado', method: 'GET', category: 'Suporte' },
  
  // INFRAESTRUTURA
  { path: '/webservice/v1/su_olt', method: 'GET', category: 'Infraestrutura' },
  { path: '/webservice/v1/su_olt_pon', method: 'GET', category: 'Infraestrutura' },
  { path: '/webservice/v1/su_concentrador', method: 'GET', category: 'Infraestrutura' },
  
  // COMUNICAÇÃO
  { path: '/webservice/v1/botaoAjax_22282', method: 'POST', category: 'Comunicação' },
  { path: '/webservice/v1/botao_rel_26658', method: 'POST', category: 'Comunicação' },
];

export function IXCEndpointsHealthCheck() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<EndpointTest[]>([]);
  const [progress, setProgress] = useState(0);

  const testEndpoint = async (endpoint: EndpointTest): Promise<EndpointTest> => {
    const startTime = Date.now();
    
    try {
      // Para GET: usar header 'listar', para POST: body vazio
      const { data, error } = await supabase.functions.invoke('ixc-proxy', {
        body: {
          method: endpoint.method,
          path: endpoint.path,
          body: endpoint.method === 'POST' ? {} : undefined,
        },
      });

      const duration = Date.now() - startTime;

      if (error) {
        return {
          ...endpoint,
          status: 'error',
          statusCode: 500,
          message: error.message,
          duration,
        };
      }

      // Verificar resposta do IXC
      if (data?.status === 404) {
        return {
          ...endpoint,
          status: 'not_found',
          statusCode: 404,
          message: 'Endpoint não encontrado no IXC',
          duration,
        };
      }

      if (data?.status >= 200 && data?.status < 300) {
        return {
          ...endpoint,
          status: 'success',
          statusCode: data.status,
          message: 'OK',
          duration,
        };
      }

      return {
        ...endpoint,
        status: 'error',
        statusCode: data?.status || 500,
        message: data?.error || 'Erro desconhecido',
        duration,
      };
    } catch (err) {
      return {
        ...endpoint,
        status: 'error',
        statusCode: 500,
        message: err instanceof Error ? err.message : 'Erro ao testar',
        duration: Date.now() - startTime,
      };
    }
  };

  const runAllTests = async () => {
    setTesting(true);
    setResults([]);
    setProgress(0);

    try {
      const { data, error } = await supabase.functions.invoke('ixc-endpoints-health', { body: {} });
      if (error) {
        toast.error(`Falha ao executar health check: ${error.message}`);
        setTesting(false);
        return;
      }

      // Garantir que results é um array válido
      const returned = Array.isArray(data?.results) ? data.results : 
                       Array.isArray(data) ? data : [];
      
      setResults(returned.filter(r => r !== null && r !== undefined));
      setProgress(100);

      const validResults = returned.filter(r => r !== null && r !== undefined);
      const successCount = validResults.filter(r => r.status === 'success').length;
      const errorCount = validResults.filter(r => r.status === 'error').length;
      const notFoundCount = validResults.filter(r => r.status === 'not_found').length;
      
      toast.success(`Testes concluídos: ${successCount} OK, ${notFoundCount} não encontrados, ${errorCount} erros`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro desconhecido';
      toast.error(`Falha ao executar health check: ${msg}`);
    } finally {
      setTesting(false);
    }
  };

  const groupedResults = results.reduce((acc, result) => {
    if (!result || !result.category) return acc; // Skip null/invalid results
    if (!acc[result.category]) acc[result.category] = [];
    acc[result.category].push(result);
    return acc;
  }, {} as Record<string, EndpointTest[]>);

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'success': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'not_found': return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case 'testing': return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      default: return null;
    }
  };

  const getStatusBadge = (result: EndpointTest) => {
    if (!result.status) return null;
    
    const variants = {
      success: { variant: 'default' as const, label: 'OK' },
      error: { variant: 'destructive' as const, label: 'Erro' },
      not_found: { variant: 'secondary' as const, label: 'Não encontrado' },
      testing: { variant: 'outline' as const, label: 'Testando...' },
    };

    const config = variants[result.status];
    return (
      <Badge variant={config.variant} className="text-xs">
        {config.label} {result.statusCode && `(${result.statusCode})`}
      </Badge>
    );
  };

  const stats = {
    total: results.length,
    success: results.filter(r => r.status === 'success').length,
    error: results.filter(r => r.status === 'error').length,
    notFound: results.filter(r => r.status === 'not_found').length,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="h-5 w-5" />
          Health Check - Todos os Endpoints IXC
        </CardTitle>
        <CardDescription>
          Teste automático de conectividade de todos os {ENDPOINTS.length} endpoints mapeados
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Button onClick={runAllTests} disabled={testing} className="w-full">
            {testing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testando... {progress}%
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Iniciar Testes ({ENDPOINTS.length} endpoints)
              </>
            )}
          </Button>
        </div>

        {results.length > 0 && (
          <>
            {/* Estatísticas */}
            <div className="grid grid-cols-4 gap-2">
              <Card>
                <CardContent className="pt-4 pb-3">
                  <div className="text-lg font-bold">{stats.total}</div>
                  <p className="text-xs text-muted-foreground">Total</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3">
                  <div className="text-lg font-bold text-green-600">{stats.success}</div>
                  <p className="text-xs text-muted-foreground">OK</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3">
                  <div className="text-lg font-bold text-orange-600">{stats.notFound}</div>
                  <p className="text-xs text-muted-foreground">Não encontrados</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3">
                  <div className="text-lg font-bold text-red-600">{stats.error}</div>
                  <p className="text-xs text-muted-foreground">Erros</p>
                </CardContent>
              </Card>
            </div>

            {/* Resultados por categoria */}
            <ScrollArea className="h-[500px] rounded border">
              <div className="p-4 space-y-6">
                {Object.entries(groupedResults).map(([category, endpoints]) => (
                  <div key={category}>
                    <h3 className="font-semibold mb-3 text-sm flex items-center gap-2">
                      {category} ({endpoints.length})
                    </h3>
                    <div className="space-y-2">
                      {endpoints.map((result, idx) => (
                        <div
                          key={`${result.path}-${idx}`}
                          className="flex items-center justify-between p-3 rounded border bg-card"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {getStatusIcon(result.status)}
                            <div className="flex-1 min-w-0">
                              <code className="text-xs font-mono block truncate">
                                {result.method} {result.path}
                              </code>
                              {result.message && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {result.message}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {result.duration && (
                              <span className="text-xs text-muted-foreground">
                                {result.duration}ms
                              </span>
                            )}
                            {getStatusBadge(result)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        )}
      </CardContent>
    </Card>
  );
}
