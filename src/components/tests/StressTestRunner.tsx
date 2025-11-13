import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Zap, TrendingUp, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface StressTestResult {
  endpoint: string;
  total_requests: number;
  successful: number;
  failed: number;
  avg_response_time_ms: number;
  min_response_time_ms: number;
  max_response_time_ms: number;
  errors: Array<{ count: number; message: string }>;
}

export function StressTestRunner() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    summary?: {
      total_duration_ms: number;
      total_requests: number;
      successful: number;
      failed: number;
      success_rate_percent: number;
      requests_per_second: string;
    };
    results?: StressTestResult[];
  } | null>(null);

  const [config, setConfig] = useState({
    duration_seconds: 60,
    concurrent_users: 20,
    ramp_up_seconds: 10,
    endpoints: '/cliente/get?id=123\n/cliente/buscar?cpf=12345678900'
  });

  const runStressTest = async () => {
    setLoading(true);
    setResults(null);

    try {
      const endpoints = config.endpoints.split('\n').filter(e => e.trim());
      
      toast.loading('Executando stress test...', { duration: Infinity });

      const { data, error } = await supabase.functions.invoke('ixc-stress-test', {
        body: {
          duration_seconds: config.duration_seconds,
          concurrent_users: config.concurrent_users,
          ramp_up_seconds: config.ramp_up_seconds,
          endpoints
        }
      });

      toast.dismiss();

      if (error) throw error;

      setResults(data);
      toast.success('Stress test concluído!');
    } catch (error) {
      console.error('Erro no stress test:', error);
      toast.error('Erro ao executar stress test');
    } finally {
      setLoading(false);
    }
  };

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 95) return 'text-green-600';
    if (rate >= 90) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getResponseTimeColor = (time: number) => {
    if (time < 500) return 'text-green-600';
    if (time < 1000) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-orange-500" />
          <CardTitle>IXC Stress Test</CardTitle>
        </div>
        <CardDescription>
          Teste de carga para validar performance da integração IXC
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Configuração */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="duration">Duração (segundos)</Label>
            <Input
              id="duration"
              type="number"
              value={config.duration_seconds}
              onChange={(e) => setConfig({...config, duration_seconds: parseInt(e.target.value)})}
              min={10}
              max={3600}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="users">Usuários Simultâneos</Label>
            <Input
              id="users"
              type="number"
              value={config.concurrent_users}
              onChange={(e) => setConfig({...config, concurrent_users: parseInt(e.target.value)})}
              min={1}
              max={500}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rampup">Ramp-up (segundos)</Label>
            <Input
              id="rampup"
              type="number"
              value={config.ramp_up_seconds}
              onChange={(e) => setConfig({...config, ramp_up_seconds: parseInt(e.target.value)})}
              min={1}
              max={300}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="endpoints">Endpoints IXC (um por linha)</Label>
          <textarea
            id="endpoints"
            className="w-full min-h-[100px] p-2 border rounded-md font-mono text-sm"
            value={config.endpoints}
            onChange={(e) => setConfig({...config, endpoints: e.target.value})}
            placeholder="/cliente/get?id=123"
          />
        </div>

        <Button 
          onClick={runStressTest} 
          disabled={loading}
          className="w-full"
        >
          <Zap className="mr-2 h-4 w-4" />
          {loading ? 'Executando teste...' : 'Iniciar Stress Test'}
        </Button>

        {/* Resultados */}
        {results?.summary && (
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Resumo do Teste
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{results.summary.total_requests}</div>
                  <p className="text-xs text-muted-foreground">Total Requisições</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className={`text-2xl font-bold ${getSuccessRateColor(results.summary.success_rate_percent)}`}>
                    {results.summary.success_rate_percent}%
                  </div>
                  <p className="text-xs text-muted-foreground">Taxa de Sucesso</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{results.summary.requests_per_second}</div>
                  <p className="text-xs text-muted-foreground">Req/segundo</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{(results.summary.total_duration_ms / 1000).toFixed(1)}s</div>
                  <p className="text-xs text-muted-foreground">Duração</p>
                </CardContent>
              </Card>
            </div>

            {/* Resultados por Endpoint */}
            {results.results && results.results.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Detalhes por Endpoint</h4>
                {results.results.map((result, idx) => (
                  <Card key={idx}>
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {result.endpoint}
                          </code>
                          <Badge variant={result.failed === 0 ? 'default' : 'destructive'}>
                            {result.failed === 0 ? (
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                            ) : (
                              <XCircle className="h-3 w-3 mr-1" />
                            )}
                            {((result.successful / result.total_requests) * 100).toFixed(1)}%
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Total:</span>
                            <span className="ml-1 font-medium">{result.total_requests}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Sucesso:</span>
                            <span className="ml-1 font-medium text-green-600">{result.successful}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Falhas:</span>
                            <span className="ml-1 font-medium text-red-600">{result.failed}</span>
                          </div>
                          <div className={getResponseTimeColor(result.avg_response_time_ms)}>
                            <span className="text-muted-foreground">Avg:</span>
                            <span className="ml-1 font-medium">{result.avg_response_time_ms}ms</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Min:</span>
                            <span className="ml-1">{result.min_response_time_ms}ms</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Max:</span>
                            <span className="ml-1">{result.max_response_time_ms}ms</span>
                          </div>
                        </div>

                        {result.errors.length > 0 && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <AlertTriangle className="h-3 w-3" />
                              <span>Erros:</span>
                            </div>
                            {result.errors.map((err, errIdx) => (
                              <div key={errIdx} className="text-xs ml-4">
                                <Badge variant="outline" className="mr-2">{err.count}x</Badge>
                                <code className="text-xs">{err.message}</code>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
