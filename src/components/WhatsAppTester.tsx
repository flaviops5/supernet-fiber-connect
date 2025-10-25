import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import { parseError } from "@/types/error.types";
import type { JsonObject } from "@/types/common.types";

export default function WhatsAppTester() {
  const [phone, setPhone] = useState("5561999999999");
  const [message, setMessage] = useState("Olá! Mensagem de teste enviada via Lovable 🚀");
  const [instance, setInstance] = useState("SDR2");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<JsonObject | null>(null);

  const sendTestMessage = async () => {
    if (!phone || !message) {
      toast.error("Preencha telefone e mensagem");
      return;
    }

    setLoading(true);
    setResponse(null);

    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp-message', {
        body: {
          phone,
          message,
          instanceName: instance
        }
      });

      if (error) throw error;

      setResponse(data);
      toast.success("Mensagem enviada com sucesso!");
    } catch (error) {
      const err = parseError(error);
      console.error("Erro ao enviar mensagem:", err);
      toast.error(`Erro: ${err.message}`);
      setResponse({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const testWebhook = async () => {
    setLoading(true);
    setResponse(null);

    try {
      toast.info("Enviando mensagem de teste simulada...");
      
      const { data, error } = await supabase.functions.invoke('test-whatsapp-webhook');

      if (error) throw error;

      setResponse(data);
      toast.success("Teste concluído! Verifique os resultados abaixo.");
    } catch (error) {
      const err = parseError(error);
      console.error("Erro no teste:", err);
      toast.error(`Erro: ${err.message}`);
      setResponse({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Testar Envio WhatsApp</CardTitle>
        <CardDescription>
          Teste o envio de mensagens via Evolution API
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="instance">Instância</Label>
          <Input
            id="instance"
            value={instance}
            onChange={(e) => setInstance(e.target.value)}
            placeholder="SDR2"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Telefone (com DDI)</Label>
          <Input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="5561999999999"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="message">Mensagem</Label>
          <Textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Digite a mensagem..."
            rows={4}
          />
        </div>

        <div className="space-y-2">
          <Button
            onClick={sendTestMessage}
            disabled={loading}
            className="w-full"
            variant="default"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Enviar Mensagem Real
              </>
            )}
          </Button>

          <Button
            onClick={testWebhook}
            disabled={loading}
            className="w-full"
            variant="outline"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testando...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Simular Webhook (Teste Direto)
              </>
            )}
          </Button>
        </div>

        {response && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <p className="text-sm font-semibold mb-2">Resposta:</p>
            <pre className="text-xs overflow-auto">
              {JSON.stringify(response, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
