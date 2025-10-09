import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Copy, 
  ExternalLink,
  RefreshCw,
  MessageSquare,
  Webhook
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface InstanceStatus {
  instanceName: string;
  status: string;
  phoneNumber?: string;
  qrCode?: string;
}

export default function WhatsAppSetup() {
  const [loading, setLoading] = useState(false);
  const [instanceStatus, setInstanceStatus] = useState<InstanceStatus | null>(null);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [webhookConfigured, setWebhookConfigured] = useState<boolean | null>(null);

  const webhookUrl = "https://mxdupkbpxjcfxdgrwknp.supabase.co/functions/v1/whatsapp-webhook";
  const instanceName = "SDR2";

  useEffect(() => {
    checkInstanceStatus();
  }, []);

  const checkInstanceStatus = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-evolution-api', {
        body: { instanceName }
      });
      const mapped: InstanceStatus = {
        instanceName,
        status: String((data as any)?.status ?? (data as any)?.data?.status ?? 'UNKNOWN'),
        phoneNumber: (data as any)?.config?.phoneNumber,
        qrCode: (data as any)?.data?.qrCode,
      };

      setInstanceStatus(mapped);
      toast.success("Status da instância verificado!");
    } catch (error: any) {
      console.error("Erro ao verificar status:", error);
      toast.error(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testWebhook = async () => {
    setTestingWebhook(true);
    try {
      // Tenta enviar uma mensagem de teste para o próprio número
      const { data, error } = await supabase.functions.invoke('send-whatsapp-message', {
        body: {
          phone: "5561933008252", // Número da própria instância
          message: "✅ Teste de integração WhatsApp - Sistema funcionando!",
          instanceName
        }
      });

      if (error) throw error;

      setWebhookConfigured(true);
      toast.success("Webhook testado com sucesso! Mensagem enviada.");
    } catch (error: any) {
      console.error("Erro no teste:", error);
      setWebhookConfigured(false);
      toast.error(`Erro no teste: ${error.message}`);
    } finally {
      setTestingWebhook(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado para a área de transferência!");
  };

  const getStatusBadge = (status?: unknown) => {
    const safe = status == null ? '' : String(status);
    if (!safe) return <Badge variant="secondary">Desconhecido</Badge>;
    
    const statusLower = safe.toLowerCase();
    if (statusLower.includes('open') || statusLower.includes('connected') || statusLower.includes('200')) {
      return <Badge className="bg-green-600">Conectado</Badge>;
    }
    if (statusLower.includes('close') || statusLower.includes('disconnected') || statusLower.startsWith('http 4') || statusLower.startsWith('http 5')) {
      return <Badge variant="destructive">Desconectado</Badge>;
    }
    return <Badge variant="secondary">{safe}</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Configuração WhatsApp Business</CardTitle>
              <CardDescription>
                Evolution API - Instância {instanceName}
              </CardDescription>
            </div>
            <Button onClick={checkInstanceStatus} disabled={loading} variant="outline">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar Status
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status da Instância */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="space-y-1">
                <p className="text-sm font-medium">Status da Instância</p>
                <p className="text-xs text-muted-foreground">
                  {instanceStatus?.phoneNumber || "Carregando..."}
                </p>
              </div>
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                getStatusBadge(instanceStatus?.status)
              )}
            </div>

            {instanceStatus?.qrCode && (
              <Alert>
                <MessageSquare className="h-4 w-4" />
                <AlertDescription>
                  QR Code disponível para conexão. Escaneie com o WhatsApp para conectar.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <Separator />

          {/* Configuração do Webhook */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Configuração do Webhook</h3>
            </div>

            <Alert>
              <AlertDescription className="space-y-3">
                <p className="font-medium">Para finalizar a integração, configure o webhook na Evolution API:</p>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-background rounded border">
                    <div className="space-y-1 flex-1 mr-2">
                      <p className="text-xs font-medium text-muted-foreground">URL do Webhook:</p>
                      <code className="text-xs break-all">{webhookUrl}</code>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(webhookUrl)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-background rounded border">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Instância:</p>
                      <code className="text-xs">{instanceName}</code>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(instanceName)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open('https://evo.rodolforomao.com.br/', '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Abrir Evolution API
                  </Button>
                </div>
              </AlertDescription>
            </Alert>

            <div className="bg-muted p-4 rounded-lg space-y-3">
              <p className="text-sm font-medium">📋 Passo a Passo:</p>
              <ol className="text-sm space-y-2 list-decimal list-inside">
                <li>Acesse o painel da Evolution API</li>
                <li>Navegue até a seção de "Webhooks" ou "Configurações"</li>
                <li>Selecione a instância "{instanceName}"</li>
                <li>Cole a URL do webhook fornecida acima</li>
                <li>Ative os eventos: <code className="text-xs bg-background px-1 py-0.5 rounded">messages.upsert</code></li>
                <li>Salve as configurações</li>
                <li>Clique em "Testar Integração" abaixo</li>
              </ol>
            </div>
          </div>

          <Separator />

          {/* Teste de Integração */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Teste de Integração</h3>
            
            <Button 
              onClick={testWebhook} 
              disabled={testingWebhook}
              className="w-full"
              size="lg"
            >
              {testingWebhook ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testando...
                </>
              ) : (
                <>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Testar Integração
                </>
              )}
            </Button>

            {webhookConfigured !== null && (
              <Alert variant={webhookConfigured ? "default" : "destructive"}>
                {webhookConfigured ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>
                      ✅ Integração funcionando! O WhatsApp está pronto para uso.
                    </AlertDescription>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>
                      ❌ Erro na integração. Verifique se o webhook foi configurado corretamente na Evolution API.
                    </AlertDescription>
                  </>
                )}
              </Alert>
            )}
          </div>

          <Separator />

          {/* Status Final */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <p className="text-sm font-medium">API Evolution</p>
              {instanceStatus ? (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Conectado</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm">Não verificado</span>
                </div>
              )}
            </div>

            <div className="p-4 bg-muted rounded-lg space-y-2">
              <p className="text-sm font-medium">Webhook</p>
              {webhookConfigured === null ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Não testado</span>
                </div>
              ) : webhookConfigured ? (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Configurado</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm">Não configurado</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
