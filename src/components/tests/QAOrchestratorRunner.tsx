import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Play, RefreshCw, CheckCircle2, XCircle, Clock, TrendingUp, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface BaselineCase {
  id: string;
  scenario_name: string;
  category: string;
  expected_agent: string;
  last_passed: boolean | null;
  last_routing_score: number | null;
  last_run_at: string | null;
  case_group?: string;
  weight?: number;
}

interface QAReport {
  id: string;
  run_started_at: string;
  total_tests: number;
  total_pass: number;
  total_fail: number;
  regression_pass: number;
  regression_fail: number;
  avg_latency_ms: number;
  avg_score: number;
}

interface LastFailure {
  scenario: string;
  category: string;
  expected_agent: string;
  detected_agent: string;
  justificativa: string;
  created_at: string;
}

export function QAOrchestratorRunner() {
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [baselineCases, setBaselineCases] = useState<BaselineCase[]>([]);
  const [lastReport, setLastReport] = useState<QAReport | null>(null);
  const [lastFailures, setLastFailures] = useState<LastFailure[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoadingData(true);
    try {
      // Carregar baseline cases (usando rpc para evitar erro de tipo)
      const { data: cases, error: casesError } = await supabase.rpc('get_qa_baseline_cases');

      if (casesError) throw casesError;
      setBaselineCases((cases || []) as BaselineCase[]);

      // Carregar último relatório
      const { data: reports, error: reportsError } = await supabase.rpc('get_last_qa_report');

      if (reportsError) throw reportsError;
      setLastReport((reports as QAReport[])?.[0] || null);

      // Carregar últimas falhas (com fallback se RPC falhar)
      let failuresData: LastFailure[] = [];
      const { data: failures, error: failuresError } = await supabase.rpc('get_last_qa_failures');
      if (failuresError) {
        console.warn('get_last_qa_failures falhou, silenciando erro:', failuresError);
        // Apenas silenciar o erro, não usar fallback para evitar problemas de tipagem
      } else {
        failuresData = (failures || []) as LastFailure[];
      }
      setLastFailures(failuresData);
    } catch (error) {
      console.error("Erro ao carregar dados QA:", error);
      // Silenciar erro se tabelas não existirem ainda (migration pendente)
      if (!error?.toString().includes("does not exist")) {
        toast({
          title: "Aguardando migration",
          description: "Execute a migration PR#53 primeiro para ver os dados",
          variant: "default",
        });
      }
    } finally {
      setIsLoadingData(false);
    }
  };

  const runOrchestrator = async () => {
    setIsRunning(true);
    toast({
      title: "🚀 Iniciando QA Orchestrator",
      description: "Executando suite de regressão baseline...",
    });

    try {
      // Tenta com até 3 tentativas para contornar erros transitórios de rede
      const attempt = async () => {
        const { data, error } = await supabase.functions.invoke("qa-orchestrator?regression=true&exploratory=false", {} as any);
        if (error) throw error;
        return data as any;
      };
      let data: any | null = null;
      let lastErr: any = null;
      for (let i = 0; i < 3; i++) {
        try {
          data = await attempt();
          break;
        } catch (e) {
          lastErr = e;
          await new Promise((r) => setTimeout(r, 800));
        }
      }
      if (!data) throw lastErr || new Error("Falha ao invocar qa-orchestrator");

      if (data?.ok) {
        const { totals, breakdown, avg_latency_ms, avg_score, timed_out } = data;
        
        const timeoutWarning = timed_out ? " ⚠️ (timeout - execução parcial)" : "";
        
        toast({
          title: totals.fail === 0 ? `✅ Todos os testes passaram!${timeoutWarning}` : `⚠️ ${totals.fail} teste(s) falharam${timeoutWarning}`,
          description: `${totals.pass}/${totals.total} passou | Latência média: ${avg_latency_ms}ms | Score: ${avg_score}`,
          variant: totals.fail === 0 ? "default" : "destructive",
        });

        // Recarregar dados
        await loadData();
      } else {
        throw new Error(data?.error || "Erro desconhecido");
      }
    } catch (error) {
      console.error("Erro ao executar QA Orchestrator:", error);
      toast({
        title: "❌ Erro na execução",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const passedCount = baselineCases.filter((c) => c.last_passed === true).length;
  const failedCount = baselineCases.filter((c) => c.last_passed === false).length;
  const notRunCount = baselineCases.filter((c) => c.last_passed === null).length;
  const successRate = baselineCases.length > 0 ? (passedCount / baselineCases.length) * 100 : 0;

  // Agrupamento por case_group (PR#55)
  const casesByGroup = baselineCases.reduce((acc, c) => {
    const group = c.case_group || 'baseline';
    if (!acc[group]) acc[group] = [];
    acc[group].push(c);
    return acc;
  }, {} as Record<string, BaselineCase[]>);

  const getGroupBadgeColor = (group: string) => {
    switch (group) {
      case "baseline": return "bg-slate-500/10 text-slate-500 border-slate-500/20";
      case "edge": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "linguistic": return "bg-cyan-500/10 text-cyan-500 border-cyan-500/20";
      case "malicious": return "bg-red-500/10 text-red-500 border-red-500/20";
      case "adversarial": return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      default: return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case "tecnico": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "financeiro": return "bg-green-500/10 text-green-500 border-green-500/20";
      case "comercial": return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      default: return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  if (isLoadingData) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Carregando dados do QA Orchestrator...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com ações */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            QA Orchestrator - PR#55 Híbrido
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Suite expandida: {baselineCases.length} casos totais • Wave 1 (edge+linguistic) + Wave 2 (segurança) implementadas
          </p>
          <div className="flex gap-2 mt-2 flex-wrap">
            {Object.entries(casesByGroup).map(([group, cases]) => (
              <Badge key={group} variant="outline" className={getGroupBadgeColor(group)}>
                {group}: {cases.length}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={isRunning}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button
            onClick={runOrchestrator}
            disabled={isRunning}
            size="sm"
          >
            {isRunning ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Executando...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Executar Baseline
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Resumo geral */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Taxa de Sucesso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{successRate.toFixed(0)}%</div>
            <Progress value={successRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Passou
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">{passedCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <XCircle className="h-4 w-4 text-destructive" />
              Falhou
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{failedCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Não executado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-muted-foreground">{notRunCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Último relatório */}
      {lastReport && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Última Execução</CardTitle>
            <CardDescription>
              {new Date(lastReport.run_started_at).toLocaleString("pt-BR")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Total:</span>
                <span className="ml-2 font-semibold">{lastReport.total_tests}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Passou:</span>
                <span className="ml-2 font-semibold text-green-500">{lastReport.total_pass}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Latência:</span>
                <span className="ml-2 font-semibold">{lastReport.avg_latency_ms}ms</span>
              </div>
              <div>
                <span className="text-muted-foreground">Score:</span>
                <span className="ml-2 font-semibold">{lastReport.avg_score}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status da baseline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Status da Baseline ({baselineCases.length} casos)</CardTitle>
          <CardDescription>Casos de regressão fixos - "golden standard"</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {baselineCases.map((testCase) => (
              <div
                key={testCase.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  {testCase.last_passed === true && (
                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                  )}
                  {testCase.last_passed === false && (
                    <XCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                  )}
                  {testCase.last_passed === null && (
                    <Clock className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{testCase.scenario_name}</div>
                    <div className="text-xs text-muted-foreground">
                      Esperado: {testCase.expected_agent}
                      {testCase.last_run_at && (
                        <span className="ml-2">
                          • Último teste: {new Date(testCase.last_run_at).toLocaleString("pt-BR")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {testCase.case_group && (
                    <Badge variant="outline" className={getGroupBadgeColor(testCase.case_group)}>
                      {testCase.case_group}
                    </Badge>
                  )}
                  <Badge variant="outline" className={getCategoryBadgeColor(testCase.category)}>
                    {testCase.category}
                  </Badge>
                  {testCase.weight && testCase.weight > 1 && (
                    <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600">
                      ⚡{testCase.weight}x
                    </Badge>
                  )}
                  {testCase.last_routing_score !== null && (
                    <Badge variant="secondary">
                      Score: {testCase.last_routing_score.toFixed(1)}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Últimas falhas */}
      {lastFailures.length > 0 && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Últimas Falhas
            </CardTitle>
            <CardDescription>Casos que falharam recentemente (últimas 5)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lastFailures.map((failure, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-lg border border-destructive/20 bg-destructive/5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="font-semibold">{failure.scenario}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Esperado: <span className="font-medium">{failure.expected_agent}</span>
                        {" → "}
                        Detectado: <span className="font-medium text-destructive">{failure.detected_agent}</span>
                      </div>
                      {failure.justificativa && (
                        <div className="text-sm mt-2 p-2 rounded bg-background/50">
                          {failure.justificativa}
                        </div>
                      )}
                    </div>
                    <Badge variant="outline" className={getCategoryBadgeColor(failure.category)}>
                      {failure.category}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    {new Date(failure.created_at).toLocaleString("pt-BR")}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
