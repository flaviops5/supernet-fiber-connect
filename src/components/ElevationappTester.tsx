import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, TestTube, CheckCircle2, XCircle, Clock, Wifi } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TestResult {
  name: string;
  success: boolean;
  responseTime: number;
  message: string;
}

interface TestResults {
  server: string;
  tests: TestResult[];
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

export const ElevationappTester = () => {
  const [serverIp, setServerIp] = useState("192.168.72.20");
  const [endpoint, setEndpoint] = useState("/api/health");
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<TestResults | null>(null);
  const { toast } = useToast();

  const testEndpoint = async (port: number, protocol: 'http' | 'https') => {
    const test: TestResult = {
      name: `${protocol.toUpperCase()} Port ${port}`,
      success: false,
      responseTime: 0,
      message: '',
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const startTime = Date.now();
      
      const url = `${protocol}://${serverIp}:${port}${endpoint}`;
      console.log(`🔍 Testando: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        mode: 'no-cors', // Permite testar mesmo sem CORS configurado
      });
      
      test.responseTime = Date.now() - startTime;
      clearTimeout(timeoutId);

      // Com no-cors, não conseguimos ler o status, mas se não deu erro, o servidor respondeu
      test.success = true;
      test.message = `Servidor respondeu em ${test.responseTime}ms (modo no-cors)`;
      
      console.log(`✅ ${test.name}: ${test.message}`);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        test.message = 'Timeout - servidor não respondeu em 5s';
      } else if (error.message.includes('Failed to fetch')) {
        test.message = 'Servidor não acessível (verifique IP e porta)';
      } else {
        test.message = `Erro: ${error.message}`;
      }
      console.log(`❌ ${test.name}: ${test.message}`);
    }

    return test;
  };

  const runTest = async () => {
    setTesting(true);
    setResults(null);

    try {
      const tests: TestResult[] = [];
      
      // Testar portas comuns
      const ports = [
        { port: 80, protocol: 'http' as const },
        { port: 443, protocol: 'https' as const },
        { port: 8080, protocol: 'http' as const },
        { port: 3000, protocol: 'http' as const },
      ];

      // Executar testes em paralelo
      const testResults = await Promise.all(
        ports.map(({ port, protocol }) => testEndpoint(port, protocol))
      );
      
      tests.push(...testResults);

      const successful = tests.filter(t => t.success).length;
      const failed = tests.filter(t => !t.success).length;

      const results: TestResults = {
        server: serverIp,
        tests,
        summary: {
          total: tests.length,
          successful,
          failed,
        }
      };

      setResults(results);

      toast({
        title: "Teste concluído",
        description: `${successful}/${tests.length} testes bem-sucedidos`,
        variant: successful > 0 ? "default" : "destructive",
      });
    } catch (error: any) {
      console.error('Erro ao testar:', error);
      toast({
        title: "Erro ao testar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          Teste Elevationapp (Rede Local)
        </CardTitle>
        <CardDescription>
          Teste a conectividade com o Elevationapp direto do seu navegador
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Wifi className="h-4 w-4" />
          <AlertDescription>
            <strong>Teste Local:</strong> Este teste roda direto no seu navegador, permitindo acessar IPs privados (192.168.x.x) 
            desde que você esteja na mesma rede do servidor.
          </AlertDescription>
        </Alert>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="serverIp">IP do Servidor</Label>
            <Input
              id="serverIp"
              value={serverIp}
              onChange={(e) => setServerIp(e.target.value)}
              placeholder="192.168.72.20"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endpoint">Endpoint</Label>
            <Input
              id="endpoint"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="/api/health"
            />
          </div>
        </div>

        <Button onClick={runTest} disabled={testing} className="w-full">
          {testing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Testando...
            </>
          ) : (
            <>
              <TestTube className="mr-2 h-4 w-4" />
              Executar Teste
            </>
          )}
        </Button>

        {results && (
          <div className="space-y-4 mt-6">
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm font-medium">Servidor</p>
                <p className="text-2xl font-bold">{results.server}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">Resultados</p>
                <p className="text-2xl font-bold">
                  {results.summary.successful}/{results.summary.total}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {results.tests.map((test, index) => (
                <Card key={index} className={test.success ? "border-green-500/50" : "border-red-500/50"}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        {test.success ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium">{test.name}</p>
                            <Badge variant={test.success ? "default" : "destructive"}>
                              {test.success ? "OK" : "Falhou"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground break-all">{test.message}</p>
                        </div>
                      </div>
                      {test.responseTime > 0 && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground whitespace-nowrap">
                          <Clock className="h-4 w-4" />
                          {test.responseTime}ms
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
