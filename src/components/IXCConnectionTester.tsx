import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, XCircle, Info } from "lucide-react";
import { toast } from "sonner";

export function IXCConnectionTester() {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const testConnection = async () => {
    setTesting(true);
    setResult(null);
    
    try {
      console.log("🔍 Iniciando teste de conexão IXC...");
      
      const { data, error } = await supabase.functions.invoke('test-ixc-connection');
      
      if (error) {
        console.error("❌ Erro ao testar conexão:", error);
        toast.error("Erro ao testar conexão");
        setResult({ success: false, error: error.message });
      } else {
        console.log("📥 Resultado do teste:", data);
        setResult(data);
        
        if (data.success) {
          toast.success("Conexão estabelecida com sucesso!");
        } else {
          toast.error("Falha na conexão com IXC");
        }
      }
    } catch (error) {
      console.error("❌ Erro inesperado:", error);
      toast.error("Erro inesperado ao testar conexão");
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
          <h3 className="text-lg font-semibold">Teste de Conexão IXC</h3>
          <p className="text-sm text-muted-foreground">
            Verifique se as credenciais e a URL do servidor IXC estão corretas
          </p>
        </div>
        
        <Button 
          onClick={testConnection} 
          disabled={testing}
          size="lg"
        >
          {testing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Testando...
            </>
          ) : (
            "Testar Conexão"
          )}
        </Button>
      </div>

      {result && (
        <div className={`p-4 rounded-lg border ${
          result.success 
            ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' 
            : 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
        }`}>
          <div className="flex items-start gap-3">
            {result.success ? (
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            )}
            
            <div className="flex-1 space-y-2">
              <p className={`font-semibold ${
                result.success 
                  ? 'text-green-900 dark:text-green-100' 
                  : 'text-red-900 dark:text-red-100'
              }`}>
                {result.message || (result.success ? 'Sucesso!' : 'Falha')}
              </p>
              
              {result.details && (
                <div className="space-y-1 text-sm">
                  {result.details.base_url_configured !== undefined && (
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      <span>URL Base: {result.details.base_url_configured ? '✅ Configurada' : '❌ Não configurada'}</span>
                    </div>
                  )}
                  
                  {result.details.credentials_valid !== undefined && (
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      <span>Credenciais: {result.details.credentials_valid ? '✅ Válidas' : '❌ Inválidas'}</span>
                    </div>
                  )}
                  
                  {result.details.hmac_configured !== undefined && (
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      <span>HMAC: {result.details.hmac_configured ? '✅ Configurado' : '⚠️ Não configurado (opcional)'}</span>
                    </div>
                  )}
                  
                  {result.details.status && (
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      <span>Status HTTP: {result.details.status}</span>
                    </div>
                  )}
                  
                  {result.details.error && (
                    <div className="mt-2 p-2 bg-black/5 dark:bg-white/5 rounded text-xs font-mono">
                      {JSON.stringify(result.details.error, null, 2)}
                    </div>
                  )}
                  
                  {result.details.base_url && (
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      <span className="text-xs break-all">URL: {result.details.base_url}</span>
                    </div>
                  )}
                </div>
              )}
              
              {result.error && (
                <p className="text-sm font-mono bg-black/5 dark:bg-white/5 p-2 rounded">
                  {result.error}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
