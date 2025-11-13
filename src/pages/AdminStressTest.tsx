import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { PlayCircle, StopCircle, RefreshCw, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface StressTestResult {
  ok: boolean;
  sessions_executed: number;
  total_time_ms: number;
  avg_time_per_session_ms: number;
  failure_rate: number;
  latency_warning?: boolean;
  latency_error?: boolean;
  alert_triggered?: boolean;
  alert_details?: {
    type: string;
    severity: string;
    message: string;
  };
}

export default function AdminStressTest() {
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<StressTestResult | null>(null);
  const [sessions, setSessions] = useState(20);
  const [error, setError] = useState<string | null>(null);

  const runStressTest = async () => {
    setIsRunning(true);
    setProgress(0);
    setError(null);
    setResult(null);

    try {
      toast({
        title: "🚀 Iniciando Stress Test",
        description: `Executando ${sessions} sessões simultâneas...`,
      });

      // Simular progresso
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 500);

      const { data, error: invokeError } = await supabase.functions.invoke('stress-runner', {
        body: { sessions },
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      setResult(data);

      // Determinar status do teste
      const hasErrors = data.failure_rate > 0;
      const hasWarnings = data.latency_warning || data.failure_rate > 0.1;

      if (hasErrors) {
        toast({
          title: "❌ Stress Test Completado com Erros",
          description: `${data.failure_rate.toFixed(1)}% de falhas detectadas`,
          variant: "destructive",
        });
      } else if (hasWarnings) {
        toast({
          title: "⚠️ Stress Test Completado com Avisos",
          description: `Latência acima do esperado detectada`,
        });
      } else {
        toast({
          title: "✅ Stress Test Completado com Sucesso",
          description: `Todas as ${data.sessions_executed} sessões executadas sem erros`,
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      toast({
        title: "❌ Erro no Stress Test",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getSeverityBadge = (result: StressTestResult) => {
    if (result.latency_error || result.failure_rate > 0.2) {
      return <Badge variant="destructive">CRÍTICO</Badge>;
    }
    if (result.latency_warning || result.failure_rate > 0.1) {
      return <Badge className="bg-yellow-500">AVISO</Badge>;
    }
    return <Badge className="bg-green-500">SAUDÁVEL</Badge>;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Stress Test IXC</h1>
          <p className="text-muted-foreground">
            Teste de carga para validar limites e performance do sistema
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          Sistema de Testes
        </Badge>
      </div>

      {/* Configuração do Teste */}
      <Card>
        <CardHeader>
          <CardTitle>Configuração do Teste</CardTitle>
          <CardDescription>
            Configure os parâmetros do stress test
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium w-40">Sessões Simultâneas:</label>
            <div className="flex items-center gap-2 flex-1">
              <input
                type="range"
                min="5"
                max="50"
                value={sessions}
                onChange={(e) => setSessions(Number(e.target.value))}
                disabled={isRunning}
                className="flex-1"
              />
              <span className="text-sm font-mono bg-muted px-3 py-1 rounded">
                {sessions}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={runStressTest}
              disabled={isRunning}
              className="flex items-center gap-2"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Executando...
                </>
              ) : (
                <>
                  <PlayCircle className="h-4 w-4" />
                  Iniciar Stress Test
                </>
              )}
            </Button>

            {isRunning && (
              <Button
                variant="destructive"
                onClick={() => setIsRunning(false)}
                className="flex items-center gap-2"
              >
                <StopCircle className="h-4 w-4" />
                Cancelar
              </Button>
            )}
          </div>

          {isRunning && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Progresso</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resultado do Teste */}
      {result && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Resultado do Teste</CardTitle>
                {getSeverityBadge(result)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Sessões</div>
                  <div className="text-2xl font-bold">{result.sessions_executed}</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Tempo Total</div>
                  <div className="text-2xl font-bold">
                    {(result.total_time_ms / 1000).toFixed(2)}s
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Tempo Médio</div>
                  <div className="text-2xl font-bold">
                    {result.avg_time_per_session_ms.toFixed(0)}ms
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Taxa de Falha</div>
                  <div className="text-2xl font-bold">
                    {(result.failure_rate * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Indicadores de Performance */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    {result.latency_warning ? (
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    ) : (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                    <span className="font-medium">Latência (&lt; 3s)</span>
                  </div>
                  <span className={result.latency_warning ? "text-yellow-500" : "text-green-500"}>
                    {result.latency_warning ? "AVISO" : "OK"}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    {result.latency_error ? (
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                    ) : (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                    <span className="font-medium">Latência Crítica (&lt; 5s)</span>
                  </div>
                  <span className={result.latency_error ? "text-red-500" : "text-green-500"}>
                    {result.latency_error ? "ERRO" : "OK"}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    {result.failure_rate > 0.1 ? (
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    ) : (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                    <span className="font-medium">Taxa de Falha (&lt; 10%)</span>
                  </div>
                  <span className={result.failure_rate > 0.1 ? "text-yellow-500" : "text-green-500"}>
                    {result.failure_rate > 0.1 ? "AVISO" : "OK"}
                  </span>
                </div>
              </div>

              {/* Alertas Disparados */}
              {result.alert_triggered && result.alert_details && (
                <div className="p-4 border-l-4 border-red-500 bg-red-50 dark:bg-red-950 rounded">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                    <div>
                      <div className="font-semibold text-red-700 dark:text-red-300">
                        Alerta Disparado
                      </div>
                      <div className="text-sm text-red-600 dark:text-red-400 mt-1">
                        {result.alert_details.message}
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {result.alert_details.type}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {result.alert_details.severity}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recomendações */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Recomendações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {result.latency_error && (
                  <li className="flex items-start gap-2 text-sm">
                    <span className="text-red-500">•</span>
                    <span>
                      <strong>Latência crítica detectada:</strong> Investigar bottlenecks no IXC Proxy ou API IXC.
                      Considerar otimização de queries ou aumento de recursos.
                    </span>
                  </li>
                )}
                {result.latency_warning && !result.latency_error && (
                  <li className="flex items-start gap-2 text-sm">
                    <span className="text-yellow-500">•</span>
                    <span>
                      <strong>Latência elevada:</strong> Monitorar padrões de uso e considerar cache mais agressivo.
                    </span>
                  </li>
                )}
                {result.failure_rate > 0.2 && (
                  <li className="flex items-start gap-2 text-sm">
                    <span className="text-red-500">•</span>
                    <span>
                      <strong>Alta taxa de falhas:</strong> Sistema pode estar sobrecarregado. Revisar limites de rate limiting
                      e considerar circuit breakers.
                    </span>
                  </li>
                )}
                {result.failure_rate > 0 && result.failure_rate <= 0.2 && (
                  <li className="flex items-start gap-2 text-sm">
                    <span className="text-yellow-500">•</span>
                    <span>
                      <strong>Falhas intermitentes:</strong> Revisar logs para identificar padrões de erro.
                    </span>
                  </li>
                )}
                {!result.latency_error && !result.latency_warning && result.failure_rate === 0 && (
                  <li className="flex items-start gap-2 text-sm">
                    <span className="text-green-500">•</span>
                    <span>
                      <strong>Sistema operando normalmente:</strong> Performance dentro dos limites esperados.
                      Considerar aumentar carga gradualmente para encontrar limites máximos.
                    </span>
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>
        </>
      )}

      {/* Erro */}
      {error && (
        <Card className="border-red-500">
          <CardHeader>
            <CardTitle className="text-red-500">Erro na Execução</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <div className="font-medium mb-1">Falha ao executar stress test:</div>
                <div className="text-muted-foreground">{error}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Informações do Teste */}
      <Card>
        <CardHeader>
          <CardTitle>Sobre o Stress Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong>Objetivo:</strong> Validar a capacidade do sistema de lidar com carga simultânea,
            identificar bottlenecks e medir limites operacionais.
          </p>
          <p>
            <strong>Thresholds:</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Latência &lt; 3s: Aviso</li>
            <li>Latência &lt; 5s: Erro</li>
            <li>Taxa de falha &gt; 10%: Aviso</li>
            <li>Taxa de falha &gt; 20%: Crítico</li>
          </ul>
          <p>
            <strong>Sessões Simultâneas:</strong> Cada sessão simula uma chamada completa ao support-tech-agent
            incluindo diagnóstico, detecção de cenário e consultas ao IXC.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
