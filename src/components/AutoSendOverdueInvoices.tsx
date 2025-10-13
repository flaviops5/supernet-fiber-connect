import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function AutoSendOverdueInvoices() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const executarEnvioAutomatico = async () => {
    try {
      setLoading(true);
      setResult(null);

      toast({
        title: "Iniciando envio automático",
        description: "Buscando clientes com status FA...",
      });

      const { data, error } = await supabase.functions.invoke('auto-send-overdue-invoices', {
        body: {}
      });

      if (error) throw error;

      setResult(data);

      if (data.success) {
        toast({
          title: "Envio concluído!",
          description: `${data.stats.sent} boletos enviados com sucesso`,
        });
      } else {
        toast({
          title: "Erro no envio",
          description: data.error || "Erro desconhecido",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Erro:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao executar envio automático",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Envio Automático de Boletos
        </CardTitle>
        <CardDescription>
          Detecta automaticamente clientes com status FA (Financeiro em Atraso) e envia o boleto vencido por WhatsApp
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Esta função busca todos os contratos com <strong>status FA</strong>, verifica se possuem títulos vencidos e envia automaticamente o boleto por WhatsApp para cada cliente.
          </AlertDescription>
        </Alert>

        <Button 
          onClick={executarEnvioAutomatico} 
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Executar Envio Automático
            </>
          )}
        </Button>

        {result && (
          <div className="space-y-4 mt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{result.stats.totalContracts}</div>
                  <p className="text-xs text-muted-foreground">Total de Contratos</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-yellow-500">{result.stats.contractsFA}</div>
                  <p className="text-xs text-muted-foreground">Status FA</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-green-500">{result.stats.sent}</div>
                  <p className="text-xs text-muted-foreground">Enviados</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-red-500">{result.stats.errors}</div>
                  <p className="text-xs text-muted-foreground">Erros</p>
                </CardContent>
              </Card>
            </div>

            {result.details && result.details.length > 0 && (
              <div className="border rounded-lg p-4 space-y-2 max-h-96 overflow-y-auto">
                <h3 className="font-semibold mb-3">Detalhes do Processamento</h3>
                {result.details.map((detail: any, index: number) => (
                  <div key={index} className="flex items-start gap-2 p-2 border-b last:border-b-0">
                    {detail.status === 'sent' && (
                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    )}
                    {detail.status === 'error' && (
                      <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    )}
                    {detail.status === 'no_overdue_titles' && (
                      <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 text-sm">
                      <p className="font-medium">{detail.clientName}</p>
                      {detail.phone && (
                        <p className="text-muted-foreground">Tel: {detail.phone}</p>
                      )}
                      {detail.titleValue && (
                        <p className="text-muted-foreground">
                          Valor: R$ {detail.titleValue} | Vencimento: {detail.dueDate}
                        </p>
                      )}
                      {detail.error && (
                        <p className="text-red-500 text-xs">{detail.error}</p>
                      )}
                      {detail.status === 'no_overdue_titles' && (
                        <p className="text-yellow-600 text-xs">Sem títulos vencidos</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
