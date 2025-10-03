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
  status: 'EXISTS' | 'NOT_FOUND' | 'ERROR';
  statusCode: number;
  recordCount?: number;
  message: string;
}

interface DiscoveryResult {
  summary: {
    total: number;
    found: number;
    notFound: number;
    errors: number;
  };
  existingEndpoints: Array<{
    endpoint: string;
    recordCount: number;
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
          `Descoberta concluída! ${data.summary.found} endpoints GPON encontrados.`
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
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'ERROR':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      EXISTS: 'default',
      NOT_FOUND: 'destructive',
      ERROR: 'secondary'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status === 'EXISTS' ? 'Disponível' : status === 'NOT_FOUND' ? 'Não Encontrado' : 'Erro'}
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{results.summary.total}</div>
                  <p className="text-xs text-muted-foreground">Total Testados</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-green-600">
                    {results.summary.found}
                  </div>
                  <p className="text-xs text-muted-foreground">Encontrados</p>
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
                  <div className="text-2xl font-bold text-yellow-600">
                    {results.summary.errors}
                  </div>
                  <p className="text-xs text-muted-foreground">Com Erro</p>
                </CardContent>
              </Card>
            </div>

            {/* Existing Endpoints */}
            {results.existingEndpoints.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    Endpoints GPON Disponíveis ({results.existingEndpoints.length})
                  </h3>
                  <div className="grid gap-2">
                    {results.existingEndpoints.map((endpoint) => (
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

            {/* All Results */}
            <Separator />
            <div>
              <h3 className="font-semibold mb-3">Todos os Resultados</h3>
              <ScrollArea className="h-[300px] rounded-md border p-4">
                <div className="space-y-2">
                  {results.allResults.map((result, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2 border-b last:border-0"
                    >
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

