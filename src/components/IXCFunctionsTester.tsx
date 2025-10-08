import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, XCircle, AlertCircle, Clock } from "lucide-react";
import { toast } from "sonner";

export function IXCFunctionsTester() {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const testAllFunctions = async () => {
    setTesting(true);
    setResult(null);
    
    try {
      console.log("🔍 Iniciando teste de todas as funções IXC...");
      
      const { data, error } = await supabase.functions.invoke('test-all-ixc-functions');
      
      if (error) {
        console.error("❌ Erro ao testar funções:", error);
        toast.error("Erro ao testar funções");
        setResult({ success: false, error: error.message });
      } else {
        console.log("📥 Resultado dos testes:", data);
        setResult(data);
        
        if (data.summary.failed === 0) {
          toast.success("Todas as funções estão funcionando!");
        } else {
          toast.error(`${data.summary.failed} função(ões) falharam`);
        }
      }
    } catch (error) {
      console.error("❌ Erro inesperado:", error);
      toast.error("Erro inesperado ao testar funções");
      setResult({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Teste Completo de Funções IXC</h3>
          <p className="text-sm text-muted-foreground">
            Testa todas as 11 funções que dependem das credenciais IXC
          </p>
        </div>
        
        <Button 
          onClick={testAllFunctions} 
          disabled={testing}
          size="lg"
          variant="default"
        >
          {testing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Testando 11 funções...
            </>
          ) : (
            "Testar Todas as Funções"
          )}
        </Button>
      </div>

      {result && (
        <div className="space-y-4">
          {/* Resumo */}
          <div className={`p-4 rounded-lg border ${
            result.summary?.failed === 0
              ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' 
              : 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
          }`}>
            <div className="flex items-start gap-3">
              {result.summary?.failed === 0 ? (
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              )}
              
              <div className="flex-1">
                <p className="font-semibold text-lg mb-2">{result.summary?.diagnosis}</p>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Total:</span>{' '}
                    <span className="font-semibold">{result.summary?.total}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">✅ Sucesso:</span>{' '}
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      {result.summary?.success}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">❌ Falhas:</span>{' '}
                    <span className="font-semibold text-red-600 dark:text-red-400">
                      {result.summary?.failed}
                    </span>
                  </div>
                </div>
                <div className="mt-2">
                  <span className="text-muted-foreground">Taxa de sucesso:</span>{' '}
                  <span className="font-semibold">{result.summary?.successRate}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recomendação */}
          {result.recommendation && (
            <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                💡 <strong>Recomendação:</strong> {result.recommendation}
              </p>
            </div>
          )}

          {/* Resultados detalhados */}
          {result.results && (
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Resultados Detalhados:</h4>
              <div className="space-y-1">
                {result.results.map((r: any, idx: number) => (
                  <div 
                    key={idx}
                    className={`flex items-center justify-between p-3 rounded border text-sm ${
                      r.success 
                        ? 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800' 
                        : 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      {r.success ? (
                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                      )}
                      <span className="font-mono">{r.function}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {r.duration}ms
                      </span>
                      {!r.success && r.error && (
                        <span className="text-xs text-red-600 dark:text-red-400 max-w-xs truncate">
                          {r.error}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Grupos de erro */}
          {result.errorGroups && Object.keys(result.errorGroups).length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Erros Agrupados:</h4>
              <div className="space-y-2">
                {Object.entries(result.errorGroups).map(([error, functions]: [string, any], idx) => (
                  <div 
                    key={idx}
                    className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded"
                  >
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-1">
                          {error}
                        </p>
                        <p className="text-xs text-amber-700 dark:text-amber-300">
                          Afeta {functions.length} função(ões): {functions.join(', ')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
