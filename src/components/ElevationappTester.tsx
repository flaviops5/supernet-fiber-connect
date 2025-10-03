import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, TestTube, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<TestResults | null>(null);
  const { toast } = useToast();

  const runTest = async () => {
    setTesting(true);
    setResults(null);

    try {
      const { data, error } = await supabase.functions.invoke('test-elevationapp', {
        body: {
          serverIp,
          endpoint,
          username: username || undefined,
          password: password || undefined,
        }
      });

      if (error) throw error;

      setResults(data);

      toast({
        title: "Teste concluído",
        description: `${data.summary.successful}/${data.summary.total} testes bem-sucedidos`,
        variant: data.summary.successful > 0 ? "default" : "destructive",
      });
    } catch (error) {
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
          Teste Elevationapp
        </CardTitle>
        <CardDescription>
          Teste a conectividade e API do Elevationapp no servidor virtual
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
          <div className="space-y-2">
            <Label htmlFor="username">Usuário (opcional)</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="flavio"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha (opcional)</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
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
