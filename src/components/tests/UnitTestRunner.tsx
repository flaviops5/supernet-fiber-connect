import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Play, CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
}

interface TestSuiteResult {
  suite: string;
  total: number;
  passed: number;
  failed: number;
  duration: number;
  tests: TestResult[];
}

interface CoverageReport {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  totalDuration: number;
  coverage: number;
  suites: TestSuiteResult[];
}

export const UnitTestRunner = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [report, setReport] = useState<CoverageReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const testSuites = [
    { id: "ixc-proxy", name: "IXC Proxy", tests: 12 },
    { id: "detect-mass-outage", name: "Detect Mass Outage", tests: 11 },
    { id: "routing-agent", name: "Routing Agent", tests: 19 },
    { id: "whatsapp-webhook", name: "WhatsApp Webhook", tests: 17 },
    { id: "support-tech-agent", name: "Support Tech Agent", tests: 7 },
  ];

  const runTests = async (suite?: string) => {
    setIsRunning(true);
    setError(null);
    setReport(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke(
        "unit-test-runner",
        {
          body: { 
            suite,
            coverage: true 
          },
        }
      );

      if (invokeError) {
        throw invokeError;
      }

      if (!data.success) {
        throw new Error(data.error || "Test execution failed");
      }

      setReport(data.report);
      
      toast({
        title: data.report.failedTests === 0 ? "✅ All tests passed!" : "⚠️ Some tests failed",
        description: `${data.report.passedTests}/${data.report.totalTests} tests passed in ${data.report.totalDuration}ms`,
        variant: data.report.failedTests === 0 ? "default" : "destructive",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      toast({
        title: "❌ Test execution failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getCoverageColor = (coverage: number) => {
    if (coverage >= 90) return "text-green-600";
    if (coverage >= 80) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Unit Test Runner
          </CardTitle>
          <CardDescription>
            Execute testes unitários das edge functions críticas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => runTests()}
              disabled={isRunning}
              size="lg"
            >
              {isRunning ? "Executando..." : "Executar Todos os Testes"}
            </Button>
            
            {testSuites.map((suite) => (
              <Button
                key={suite.id}
                onClick={() => runTests(suite.id)}
                disabled={isRunning}
                variant="outline"
                size="sm"
              >
                {suite.name} ({suite.tests})
              </Button>
            ))}
          </div>

          {isRunning && (
            <div className="space-y-2">
              <Progress value={undefined} className="w-full" />
              <p className="text-sm text-muted-foreground text-center">
                Executando testes...
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Results Display */}
      {report && (
        <>
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Resumo da Execução</span>
                <Badge variant={report.failedTests === 0 ? "default" : "destructive"}>
                  {report.failedTests === 0 ? "✅ Passou" : `❌ ${report.failedTests} falhou(ram)`}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">
                    {report.totalTests}
                  </div>
                  <div className="text-sm text-muted-foreground">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {report.passedTests}
                  </div>
                  <div className="text-sm text-muted-foreground">Passaram</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600">
                    {report.failedTests}
                  </div>
                  <div className="text-sm text-muted-foreground">Falharam</div>
                </div>
                <div className="text-center">
                  <div className={`text-3xl font-bold ${getCoverageColor(report.coverage)}`}>
                    {report.coverage}%
                  </div>
                  <div className="text-sm text-muted-foreground">Cobertura</div>
                </div>
              </div>
              <div className="mt-4 text-center text-sm text-muted-foreground">
                Tempo total: {report.totalDuration}ms
              </div>
            </CardContent>
          </Card>

          {/* Suite Results */}
          <Card>
            <CardHeader>
              <CardTitle>Resultados por Suite</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {report.suites.map((suite) => (
                    <Card key={suite.suite}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{suite.suite}</CardTitle>
                          <div className="flex items-center gap-2">
                            <Badge variant={suite.failed === 0 ? "default" : "destructive"}>
                              {suite.passed}/{suite.total}
                            </Badge>
                            <Badge variant="outline">
                              {suite.duration}ms
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-1">
                          {suite.tests.map((test, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between text-sm py-1 border-b last:border-0"
                            >
                              <div className="flex items-center gap-2">
                                {test.passed ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-600" />
                                )}
                                <span className={test.passed ? "" : "text-red-600"}>
                                  {test.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                <span>{test.duration.toFixed(2)}ms</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
