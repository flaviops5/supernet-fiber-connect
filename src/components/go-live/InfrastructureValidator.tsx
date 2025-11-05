import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, CheckCircle2, XCircle, AlertCircle, RefreshCw, Server, Database, Radio, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ValidationResult {
  category: string;
  check: string;
  status: "pass" | "fail" | "warning";
  message: string;
  details?: Record<string, unknown>;
}

export function InfrastructureValidator() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ValidationResult[]>([]);
  const [overallStatus, setOverallStatus] = useState<"pass" | "fail" | "warning" | null>(null);

  const runValidation = async () => {
    setLoading(true);
    setResults([]);
    setOverallStatus(null);

    try {
      // 1. Validar Production Readiness
      const { data: prodReadiness, error: prodError } = await supabase.functions.invoke(
        'validate-production-readiness'
      );

      if (prodError) {
        setResults(prev => [...prev, {
          category: "Production Readiness",
          check: "Validação de Produção",
          status: "fail",
          message: prodError.message,
          details: prodError
        }]);
      } else {
        const validationResults: ValidationResult[] = prodReadiness.results.map((r: { category: string; check: string; status: "pass" | "fail" | "warning"; message: string; details?: Record<string, unknown> }) => ({
          category: r.category,
          check: r.check,
          status: r.status,
          message: r.message,
          details: r.details
        }));
        setResults(prev => [...prev, ...validationResults]);
      }

      // 2. Validar System Health
      const { data: healthData, error: healthError } = await supabase.functions.invoke(
        'system-health'
      );

      if (healthError) {
        setResults(prev => [...prev, {
          category: "System Health",
          check: "Health Check",
          status: "fail",
          message: healthError.message
        }]);
      } else {
        const healthResults: ValidationResult[] = Object.entries(healthData.checks).map(([key, value]: [string, { status: string; message?: string }]) => ({
          category: "System Health",
          check: key,
          status: value.status === "healthy" ? "pass" : value.status === "warning" ? "warning" : "fail",
          message: value.message || "OK",
          details: value as Record<string, unknown>
        }));
        setResults(prev => [...prev, ...healthResults]);
      }

      // 3. Validar IXC Endpoints
      const { data: ixcHealth, error: ixcError } = await supabase.functions.invoke(
        'ixc-endpoints-health'
      );

      if (ixcError) {
        setResults(prev => [...prev, {
          category: "IXC Integration",
          check: "IXC Endpoints Health",
          status: "fail",
          message: ixcError.message
        }]);
      } else {
        setResults(prev => [...prev, {
          category: "IXC Integration",
          check: "IXC Endpoints Health",
          status: ixcHealth.errors > 0 ? "fail" : ixcHealth.notFound > 5 ? "warning" : "pass",
          message: `${ixcHealth.success}/${ixcHealth.total} endpoints OK (${ixcHealth.errors} errors, ${ixcHealth.notFound} not found)`,
          details: ixcHealth
        }]);
      }

      // Determinar status geral
      const allResults = [...results];
      const hasFail = allResults.some(r => r.status === "fail");
      const hasWarning = allResults.some(r => r.status === "warning");
      
      if (hasFail) {
        setOverallStatus("fail");
        toast.error("Validação falhou - Corrija os erros críticos");
      } else if (hasWarning) {
        setOverallStatus("warning");
        toast.warning("Validação concluída com avisos");
      } else {
        setOverallStatus("pass");
        toast.success("Validação concluída com sucesso!");
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Erro ao executar validação");
      console.error("Validation error:", error);
      setResults(prev => [...prev, {
        category: "System",
        check: "Validation Execution",
        status: "fail",
        message: errorMessage
      }]);
      setOverallStatus("fail");
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pass":
        return <CheckCircle2 className="h-5 w-5 text-success" />;
      case "fail":
        return <XCircle className="h-5 w-5 text-destructive" />;
      case "warning":
        return <AlertCircle className="h-5 w-5 text-warning" />;
      default:
        return null;
    }
  };

  const getCategoryIcon = (category: string) => {
    if (category.includes("IXC")) return <Server className="h-4 w-4" />;
    if (category.includes("Database")) return <Database className="h-4 w-4" />;
    if (category.includes("Evolution")) return <MessageSquare className="h-4 w-4" />;
    if (category.includes("System")) return <Radio className="h-4 w-4" />;
    return <Server className="h-4 w-4" />;
  };

  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.category]) {
      acc[result.category] = [];
    }
    acc[result.category].push(result);
    return acc;
  }, {} as Record<string, ValidationResult[]>);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Validação de Infraestrutura
            </CardTitle>
            <CardDescription>
              Verificar credenciais, APIs e integrações críticas
            </CardDescription>
          </div>
          <Button
            onClick={runValidation}
            disabled={loading}
            variant={overallStatus === "pass" ? "default" : "outline"}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Validando...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Executar Validação
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {overallStatus && (
          <Alert variant={overallStatus === "pass" ? "default" : overallStatus === "fail" ? "destructive" : "default"}>
            <AlertTitle className="flex items-center gap-2">
              {getStatusIcon(overallStatus)}
              Status Geral: {overallStatus === "pass" ? "Aprovado" : overallStatus === "fail" ? "Reprovado" : "Avisos"}
            </AlertTitle>
            <AlertDescription>
              {overallStatus === "pass" && "Todas as validações críticas passaram. Sistema pronto para produção."}
              {overallStatus === "fail" && "Existem falhas críticas que devem ser corrigidas antes do go-live."}
              {overallStatus === "warning" && "Sistema funcional, mas existem avisos que devem ser revisados."}
            </AlertDescription>
          </Alert>
        )}

        {results.length === 0 && !loading && (
          <div className="text-center py-8 text-muted-foreground">
            Clique em "Executar Validação" para verificar a infraestrutura
          </div>
        )}

        {Object.entries(groupedResults).map(([category, categoryResults]) => (
          <div key={category} className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              {getCategoryIcon(category)}
              {category}
            </h3>
            <div className="space-y-2">
              {categoryResults.map((result, idx) => (
                <div
                  key={`${category}-${idx}`}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                >
                  <div className="mt-0.5">
                    {getStatusIcon(result.status)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{result.check}</span>
                      <Badge variant={
                        result.status === "pass" ? "default" :
                        result.status === "fail" ? "destructive" : "secondary"
                      }>
                        {result.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{result.message}</p>
                    {result.details && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                          Ver detalhes
                        </summary>
                        <pre className="mt-2 p-2 bg-muted rounded overflow-auto">
                          {JSON.stringify(result.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
