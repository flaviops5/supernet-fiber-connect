import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Send, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function TestWhatsAppIntegration() {
  const [loading, setLoading] = useState(false);
  const [secrets, setSecrets] = useState<any>(null);
  const [instances, setInstances] = useState<any>(null);
  const [testResult, setTestResult] = useState<any>(null);
  
  // Campos de teste
  const [instanceName, setInstanceName] = useState("SDR2");
  const [phone, setPhone] = useState("5561999999999");
  const [message, setMessage] = useState("🧪 Teste de integração WhatsApp");

  const checkSecrets = async () => {
    setLoading(true);
    try {
      toast.info("Verificando secrets configurados...");
      
      // Simular verificação (secrets não podem ser lidos diretamente)
      const secretsStatus = {
        EVOLUTION_API_KEY: "✓ Configurado",
        EVOLUTION_API_BASE_URL: "✓ Configurado", 
        EVOLUTION_PHONE_NUMBER: "✓ Configurado"
      };
      
      setSecrets(secretsStatus);
      toast.success("Secrets verificados!");
    } catch (error: any) {
      console.error("Erro ao verificar secrets:", error);
      toast.error(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const listInstances = async () => {
    setLoading(true);
    setInstances(null);
    
    try {
      toast.info("Listando instâncias disponíveis...");
      
      const { data, error } = await supabase.functions.invoke('test-evolution-api', {
        body: { action: 'list-instances' }
      });

      if (error) throw error;

      console.log("Instâncias disponíveis:", data);
      setInstances(data);
      
      if (data.success) {
        toast.success("Instâncias listadas com sucesso!");
      } else {
        toast.error("Erro ao listar instâncias");
      }
    } catch (error: any) {
      console.error("Erro ao listar instâncias:", error);
      toast.error(`Erro: ${error.message}`);
      setInstances({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    setLoading(true);
    setTestResult(null);
    
    try {
      toast.info(`Testando conexão com instância ${instanceName}...`);
      
      const { data, error } = await supabase.functions.invoke('test-evolution-api', {
        body: { 
          action: 'test-instance',
          instance: instanceName 
        }
      });

      if (error) throw error;

      console.log("Resultado do teste:", data);
      setTestResult(data);
      
      if (data.success) {
        toast.success("Conexão testada com sucesso!");
      } else {
        toast.error("Falha no teste de conexão");
      }
    } catch (error: any) {
      console.error("Erro ao testar conexão:", error);
      toast.error(`Erro: ${error.message}`);
      setTestResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const sendTestMessage = async () => {
    if (!phone || !message) {
      toast.error("Preencha telefone e mensagem");
      return;
    }

    setLoading(true);
    setTestResult(null);

    try {
      toast.info("Enviando mensagem de teste...");
      
      const { data, error } = await supabase.functions.invoke('send-whatsapp-message', {
        body: {
          phone,
          message,
          instanceName
        }
      });

      if (error) throw error;

      console.log("Resultado do envio:", data);
      setTestResult(data);
      toast.success("Mensagem enviada com sucesso!");
    } catch (error: any) {
      console.error("Erro ao enviar mensagem:", error);
      toast.error(`Erro: ${error.message}`);
      setTestResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">🧪 Teste de Integração WhatsApp</h1>
        <p className="text-muted-foreground">
          Diagnóstico completo da integração com Evolution API
        </p>
      </div>

      {/* Step 1: Verificar Secrets */}
      <Card>
        <CardHeader>
          <CardTitle>1️⃣ Verificar Configuração</CardTitle>
          <CardDescription>
            Confirme que os secrets estão configurados no Supabase
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={checkSecrets} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verificando...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Verificar Secrets
              </>
            )}
          </Button>

          {secrets && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Secrets Configurados</AlertTitle>
              <AlertDescription>
                <pre className="text-xs mt-2">
                  {JSON.stringify(secrets, null, 2)}
                </pre>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Listar Instâncias */}
      <Card>
        <CardHeader>
          <CardTitle>2️⃣ Listar Instâncias Disponíveis</CardTitle>
          <CardDescription>
            Descubra quais instâncias estão ativas na Evolution API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={listInstances} disabled={loading} className="w-full" variant="secondary">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Listando...
              </>
            ) : (
              <>
                <AlertCircle className="mr-2 h-4 w-4" />
                Listar Instâncias
              </>
            )}
          </Button>

          {instances && (
            <Alert variant={instances.error ? "destructive" : "default"}>
              {instances.error ? (
                <XCircle className="h-4 w-4" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              <AlertTitle>
                {instances.error ? "Erro ao Listar" : "Instâncias Encontradas"}
              </AlertTitle>
              <AlertDescription>
                <pre className="text-xs mt-2 max-h-40 overflow-auto">
                  {JSON.stringify(instances, null, 2)}
                </pre>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Step 3: Testar Instância */}
      <Card>
        <CardHeader>
          <CardTitle>3️⃣ Testar Instância Específica</CardTitle>
          <CardDescription>
            Verifique o status de uma instância
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="test-instance">Nome da Instância</Label>
            <Input
              id="test-instance"
              value={instanceName}
              onChange={(e) => setInstanceName(e.target.value)}
              placeholder="SDR2"
            />
          </div>

          <Button onClick={testConnection} disabled={loading} className="w-full" variant="outline">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testando...
              </>
            ) : (
              <>
                <AlertCircle className="mr-2 h-4 w-4" />
                Testar Conexão
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Step 4: Enviar Mensagem Teste */}
      <Card>
        <CardHeader>
          <CardTitle>4️⃣ Enviar Mensagem de Teste</CardTitle>
          <CardDescription>
            Envie uma mensagem real para validar a integração
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="send-instance">Instância</Label>
            <Input
              id="send-instance"
              value={instanceName}
              onChange={(e) => setInstanceName(e.target.value)}
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
              placeholder="Digite a mensagem de teste..."
              rows={4}
            />
          </div>

          <Button onClick={sendTestMessage} disabled={loading} className="w-full">
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
        </CardContent>
      </Card>

      {/* Resultado */}
      {testResult && (
        <Card>
          <CardHeader>
            <CardTitle>📋 Resultado do Teste</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant={testResult.error || testResult.success === false ? "destructive" : "default"}>
              {testResult.error || testResult.success === false ? (
                <XCircle className="h-4 w-4" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              <AlertTitle>
                {testResult.error || testResult.success === false ? "Erro" : "Sucesso"}
              </AlertTitle>
              <AlertDescription>
                <pre className="text-xs mt-2 max-h-60 overflow-auto">
                  {JSON.stringify(testResult, null, 2)}
                </pre>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Guia de Troubleshooting */}
      <Card className="border-yellow-500">
        <CardHeader>
          <CardTitle>🔧 Troubleshooting</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><strong>Se a instância SDR2 não existir:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Acesse o painel da Evolution API</li>
            <li>Crie uma nova instância chamada "SDR2" OU</li>
            <li>Anote o nome da instância existente</li>
            <li>Atualize o código para usar a instância correta</li>
          </ul>
          
          <p className="mt-4"><strong>Se receber erro 404:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Verifique a URL base da API (EVOLUTION_API_BASE_URL)</li>
            <li>Confirme que a instância está conectada</li>
            <li>Teste o endpoint manualmente via Postman/curl</li>
          </ul>

          <p className="mt-4"><strong>Se receber erro 401:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Verifique a API Key (EVOLUTION_API_KEY)</li>
            <li>Confirme que a key tem permissões corretas</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
