import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Search, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

interface EndpointResult {
  endpoint: string;
  status: 'EXISTS' | 'NOT_FOUND' | 'ERROR' | 'IXC_ERROR' | 'UNKNOWN_FORMAT' | 'PARSE_ERROR';
  statusCode: number;
  recordCount?: number;
  message: string;
  errorMessage?: string;
  rawResponse?: string;
}

interface DiscoveryResult {
  summary: {
    total: number;
    functional: number;
    notFound: number;
    ixcErrors: number;
    otherErrors: number;
  };
  functionalEndpoints: Array<{
    endpoint: string;
    recordCount: number;
  }>;
  ixcErrorEndpoints: Array<{
    endpoint: string;
    errorMessage: string;
    details: string;
  }>;
  allResults: EndpointResult[];
}

export const IXCEndpointDiscovery = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DiscoveryResult | null>(null);

  const discoverEndpoints = async () => {
    setLoading(true);
    setResults(null);

    try {
      const { data, error } = await supabase.functions.invoke('ixc-discover-gpon-endpoints');

      if (error) throw error;

      if (data.success) {
        setResults(data);
        toast.success(
          `Descoberta concluída! ${data.summary.functional} funcionais, ${data.summary.ixcErrors} com erro IXC.`
        );
      } else {
        throw new Error(data.error || 'Erro na descoberta');
      }
    } catch (error) {
      console.error('Erro na descoberta:', error);
      toast.error(
        error instanceof Error ? error.message : 'Erro ao descobrir endpoints'
      );
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'EXISTS':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'NOT_FOUND':
        return <XCircle className="w-4 h-4 text-gray-500" />;
      case 'IXC_ERROR':
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case 'ERROR':
      case 'UNKNOWN_FORMAT':
      case 'PARSE_ERROR':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const config = {
      EXISTS: { variant: 'default' as const, label: 'Funcional' },
      NOT_FOUND: { variant: 'outline' as const, label: 'Não Encontrado' },
      IXC_ERROR: { variant: 'secondary' as const, label: 'Erro IXC' },
      ERROR: { variant: 'destructive' as const, label: 'Erro' },
      UNKNOWN_FORMAT: { variant: 'destructive' as const, label: 'Formato Inválido' },
      PARSE_ERROR: { variant: 'destructive' as const, label: 'Erro Parse' },
    };

    const statusConfig = config[status as keyof typeof config] || { variant: 'secondary' as const, label: 'Desconhecido' };

    return (
      <Badge variant={statusConfig.variant}>
        {statusConfig.label}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="w-5 h-5" />
          Descoberta de Endpoints GPON
        </CardTitle>
        <CardDescription>
          Descubra quais endpoints relacionados à infraestrutura GPON estão disponíveis na API do IXC
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <Button 
          onClick={discoverEndpoints} 
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Descobrindo endpoints...
            </>
          ) : (
            <>
              <Search className="mr-2 h-4 w-4" />
              Iniciar Descoberta
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
                  <p className="text-xs text-muted-foreground">Total Testados</p>
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
                  <div className="text-2xl font-bold text-orange-600">
                    {results.summary.ixcErrors}
                  </div>
                  <p className="text-xs text-muted-foreground">Erro IXC</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-gray-600">
                    {results.summary.notFound}
                  </div>
                  <p className="text-xs text-muted-foreground">Não Encontrados</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-red-600">
                    {results.summary.otherErrors}
                  </div>
                  <p className="text-xs text-muted-foreground">Outros Erros</p>
                </CardContent>
              </Card>
            </div>

            {/* Functional Endpoints */}
            {results.functionalEndpoints.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Endpoints GPON Funcionais ({results.functionalEndpoints.length})
                  </h3>
                  <div className="grid gap-2">
                    {results.functionalEndpoints.map((endpoint) => (
                      <Card key={endpoint.endpoint} className="bg-green-50 dark:bg-green-950">
                        <CardContent className="py-3 flex justify-between items-center">
                          <code className="text-sm font-mono">
                            /webservice/v1/{endpoint.endpoint}
                          </code>
                          <Badge variant="outline">
                            {endpoint.recordCount} registro(s)
                          </Badge>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* IXC Error Endpoints */}
            {results.ixcErrorEndpoints.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-orange-500" />
                    Endpoints com Erro IXC ({results.ixcErrorEndpoints.length})
                  </h3>
                  <div className="grid gap-2">
                    {results.ixcErrorEndpoints.map((endpoint) => (
                      <Card key={endpoint.endpoint} className="bg-orange-50 dark:bg-orange-950">
                        <CardContent className="py-3">
                          <div className="flex justify-between items-start mb-2">
                            <code className="text-sm font-mono">
                              /webservice/v1/{endpoint.endpoint}
                            </code>
                            <Badge variant="secondary">HTTP 200</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            <strong>Erro do IXC:</strong> {endpoint.errorMessage}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* All Results */}
            <Separator />
            <div>
              <h3 className="font-semibold mb-3">Todos os Resultados</h3>
              <ScrollArea className="h-[300px] rounded-md border p-4">
                <div className="space-y-2">
                  {results.allResults.map((result, index) => (
                    <div
                      key={index}
                      className="flex flex-col gap-1 py-2 border-b last:border-0"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(result.status)}
                          <code className="text-sm font-mono">
                            {result.endpoint}
                          </code>
                        </div>
                        <div className="flex items-center gap-2">
                          {result.recordCount !== undefined && (
                            <span className="text-xs text-muted-foreground">
                              {result.recordCount} reg.
                            </span>
                          )}
                          {getStatusBadge(result.status)}
                        </div>
                      </div>
                      {result.errorMessage && (
                        <p className="text-xs text-orange-600 ml-6">
                          {result.errorMessage}
                        </p>
                      )}
                      {result.message && result.status !== 'EXISTS' && (
                        <p className="text-xs text-muted-foreground ml-6">
                          {result.message}
                        </p>
                      )}
                    </div>
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

