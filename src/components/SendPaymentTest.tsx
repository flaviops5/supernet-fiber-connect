import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, CheckCircle, XCircle } from "lucide-react";

export const SendPaymentTest = () => {
  const [phone, setPhone] = useState("61953890130");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const handleSend = async () => {
    if (!phone) {
      toast({
        title: "Erro",
        description: "Digite um telefone",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('send-payment-to-customer', {
        body: { phone }
      });

      if (error) throw error;

      setResult(data);

      if (data.success) {
        toast({
          title: "✅ Pagamento Enviado!",
          description: `Mensagem enviada para ${data.data.customer.name}`,
        });
      } else {
        toast({
          title: "❌ Erro",
          description: data.error,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Erro:', error);
      toast({
        title: "❌ Erro",
        description: error.message,
        variant: "destructive"
      });
      setResult({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>📱 Enviar Boleto/PIX Direto</CardTitle>
        <CardDescription>
          Envia automaticamente dados de pagamento para o cliente via WhatsApp
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Digite o telefone (ex: 61953890130)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={loading}
          />
          <Button 
            onClick={handleSend} 
            disabled={loading}
            className="min-w-[120px]"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Enviar
              </>
            )}
          </Button>
        </div>

        {result && (
          <div className={`p-4 rounded-lg border ${
            result.success 
              ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900' 
              : 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900'
          }`}>
            <div className="flex items-start gap-3">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
              )}
              <div className="flex-1 space-y-2">
                <p className={`font-semibold ${
                  result.success 
                    ? 'text-green-900 dark:text-green-100' 
                    : 'text-red-900 dark:text-red-100'
                }`}>
                  {result.success ? 'Sucesso!' : 'Erro'}
                </p>
                
                {result.success && result.data && (
                  <div className="text-sm space-y-1 text-green-800 dark:text-green-200">
                    <p><strong>Cliente:</strong> {result.data.customer.name}</p>
                    <p><strong>Telefone:</strong> {result.data.customer.phone}</p>
                    <p><strong>Valor:</strong> R$ {result.data.payment.valor}</p>
                    <p><strong>Vencimento:</strong> {result.data.payment.vencimento}</p>
                    <p>
                      <strong>Enviado:</strong> PIX {result.data.payment.hasPix ? '✅' : '❌'} | 
                      Boleto {result.data.payment.hasBoleto ? '✅' : '❌'}
                    </p>
                    <p className="text-xs opacity-70">
                      ID Mensagem: {result.data.whatsapp.messageId}
                    </p>
                  </div>
                )}

                {!result.success && (
                  <p className="text-sm text-red-800 dark:text-red-200">
                    {result.error}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Como funciona:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Busca cliente no IXC pelo telefone</li>
            <li>Obtém primeiro título pendente</li>
            <li>Busca dados PIX/Boleto</li>
            <li>Envia mensagem formatada via WhatsApp</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
