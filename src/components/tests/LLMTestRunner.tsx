import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Play, AlertCircle, CheckCircle2, XCircle, TrendingUp, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TestResult {
  scenario: string;
  expected: string;
  detected: string;
  pass: boolean;
  latency: number;
  overall_score: string;
  error?: string;
  routing_score?: string;
  clarity_score?: string;
  context_score?: string;
  tone_score?: string;
  timing_score?: string;
}

interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  pass_rate: string;
  avg_latency_ms: number;
  avg_routing_score: string;
  avg_overall_score: string;
}

export function LLMTestRunner() {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [summary, setSummary] = useState<TestSummary | null>(null);
  const [expandedTests, setExpandedTests] = useState<Set<number>>(new Set());

  const runTests = async () => {
    setRunning(true);
    setResults([]);
    setSummary(null);
    
    toast.info("Iniciando testes LLM-vs-LLM...", {
      description: "Isso pode levar alguns minutos"
    });

    try {
      const { data, error } = await supabase.functions.invoke('llm-test-runner');

      if (error) throw error;

      if (data.success) {
        setResults(data.results || []);
        setSummary(data.summary);
        
        const passRate = parseFloat(data.summary.pass_rate);
        if (passRate >= 80) {
          toast.success("Testes concluídos com sucesso!", {
            description: `${data.summary.passed}/${data.summary.total} aprovados (${data.summary.pass_rate})`
          });
        } else if (passRate >= 60) {
          toast.warning("Testes concluídos com alertas", {
            description: `Taxa de aprovação: ${data.summary.pass_rate}`
          });
        } else {
          toast.error("Testes falharam", {
            description: `Apenas ${data.summary.pass_rate} de aprovação`
          });
        }
      } else {
        throw new Error(data.error || "Erro desconhecido");
      }
    } catch (error) {
      console.error("Erro ao executar testes:", error);
      toast.error("Erro ao executar testes", {
        description: error instanceof Error ? error.message : "Erro desconhecido"
      });
    } finally {
      setRunning(false);
    }
  };

  const getScoreColor = (score: string) => {
    const numScore = parseFloat(score);
    if (numScore >= 0.8) return "text-green-600";
    if (numScore >= 0.6) return "text-yellow-600";
    return "text-red-600";
  };

  const toggleTestExpansion = (index: number) => {
    setExpandedTests(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const failedTests = results.filter(r => !r.pass);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              LLM Test Runner (QA Inteligente)
            </CardTitle>
            <CardDescription>
              Validação conversacional usando Lovable AI (Gemini)
            </CardDescription>
          </div>
          <Button 
            onClick={runTests} 
            disabled={running}
            className="gap-2"
          >
            <Play className="h-4 w-4" />
            {running ? "Executando..." : "Executar Testes"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Summary */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Taxa de Aprovação</p>
              <p className="text-2xl font-bold">{summary.pass_rate}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Testes</p>
              <p className="text-2xl font-bold">
                {summary.passed}/{summary.total}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Latência Média</p>
              <p className="text-2xl font-bold">{summary.avg_latency_ms}ms</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Score Geral</p>
              <p className={`text-2xl font-bold ${getScoreColor(summary.avg_overall_score)}`}>
                {summary.avg_overall_score}
              </p>
            </div>
          </div>
        )}

        {/* Progress */}
        {running && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Executando testes...</span>
              <Clock className="h-4 w-4 animate-spin" />
            </div>
            <Progress value={undefined} className="w-full" />
          </div>
        )}

        {/* Error Summary */}
        {failedTests.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Testes Falhados: {failedTests.length}</AlertTitle>
            <AlertDescription>
              <div className="mt-2 space-y-1">
                {failedTests.map((test, idx) => (
                  <div key={idx} className="text-sm">
                    • <span className="font-medium">{test.scenario}</span>: esperava {test.expected}, detectou {test.detected || "desconhecido"}
                    {test.error && <span className="text-red-400"> ({test.error})</span>}
                  </div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-semibold">Resultados Detalhados</h3>
            <div className="space-y-2">
              {results.map((result, index) => (
                <Collapsible 
                  key={index}
                  open={expandedTests.has(index)}
                  onOpenChange={() => toggleTestExpansion(index)}
                >
                  <div className="rounded-lg border bg-card">
                    <CollapsibleTrigger className="w-full p-3 hover:bg-accent/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          {result.pass ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0 text-left">
                            <p className="font-medium truncate">{result.scenario}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>Esperado: <span className="font-medium">{result.expected}</span></span>
                              <span>→</span>
                              <span>Detectado: <span className="font-medium">{result.detected}</span></span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 flex-shrink-0">
                          <div className="text-right">
                            <p className={`text-sm font-semibold ${getScoreColor(result.overall_score)}`}>
                              Score: {result.overall_score}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {result.latency}ms
                            </p>
                          </div>
                          {expandedTests.has(index) ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <div className="border-t p-4 space-y-3 bg-muted/30">
                        {/* Error Details */}
                        {result.error && (
                          <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Erro</AlertTitle>
                            <AlertDescription>{result.error}</AlertDescription>
                          </Alert>
                        )}
                        
                        {/* Score Breakdown */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                          {result.routing_score && (
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground">Roteamento</p>
                              <p className={`text-lg font-semibold ${getScoreColor(result.routing_score)}`}>
                                {result.routing_score}
                              </p>
                            </div>
                          )}
                          {result.clarity_score && (
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground">Clareza</p>
                              <p className={`text-lg font-semibold ${getScoreColor(result.clarity_score)}`}>
                                {result.clarity_score}
                              </p>
                            </div>
                          )}
                          {result.context_score && (
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground">Contexto</p>
                              <p className={`text-lg font-semibold ${getScoreColor(result.context_score)}`}>
                                {result.context_score}
                              </p>
                            </div>
                          )}
                          {result.tone_score && (
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground">Tom</p>
                              <p className={`text-lg font-semibold ${getScoreColor(result.tone_score)}`}>
                                {result.tone_score}
                              </p>
                            </div>
                          )}
                          {result.timing_score && (
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground">Tempo</p>
                              <p className={`text-lg font-semibold ${getScoreColor(result.timing_score)}`}>
                                {result.timing_score}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!running && results.length === 0 && !summary && (
          <div className="text-center py-12 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Clique em "Executar Testes" para iniciar a validação</p>
            <p className="text-sm mt-2">
              O sistema testará 10 cenários aleatórios usando Lovable AI
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
