import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, TestTube, CheckCircle2, XCircle, Send, List, QrCode } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { parseError } from '@/types/error.types';
import type { JsonObject } from '@/types/common.types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function WhatsAppApiTester() {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<JsonObject | null>(null);
  const [selectedInstance, setSelectedInstance] = useState('SDR2');
  const [instances, setInstances] = useState<JsonObject[]>([]);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [messageText, setMessageText] = useState('Teste de mensagem via Evolution API');

  const listInstances = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-evolution-api', {
        body: { action: 'list-instances' }
      });
      
      if (error) throw error;
      
      if (data?.success && data?.instances) {
        setInstances(Array.isArray(data.instances) ? data.instances : []);
        toast.success(`✅ ${data.instances.length || 0} instâncias encontradas`);
      }
      setResult(data);
    } catch (error) {
      const err = parseError(error);
      toast.error(`Erro: ${err.message}`);
      setResult({ success: false, error: err.message });
    } finally {
      setTesting(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('test-evolution-api', {
        body: { action: 'test-instance', instance: selectedInstance }
      });
      
      if (error) throw error;
      
      setResult(data);
      
      if (data?.success) {
        toast.success(`✅ Instância ${selectedInstance} conectada!`);
      } else {
        toast.error(`❌ Erro na instância ${selectedInstance}`);
      }
    } catch (error) {
      const err = parseError(error);
      console.error('Erro ao testar API:', err);
      toast.error(`Erro: ${err.message}`);
      setResult({ success: false, error: err.message });
    } finally {
      setTesting(false);
    }
  };

  const sendTestMessage = async () => {
    if (!phoneNumber || !messageText) {
      toast.error('Preencha telefone e mensagem');
      return;
    }

    setTesting(true);
    setResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('test-evolution-api', {
        body: { 
          action: 'send-message',
          instance: selectedInstance,
          phone: phoneNumber,
          message: messageText
        }
      });
      
      if (error) throw error;
      
      setResult(data);
      
      if (data?.success) {
        toast.success('✅ Mensagem enviada!');
      } else {
        toast.error('❌ Erro ao enviar mensagem');
      }
    } catch (error) {
      const err = parseError(error);
      toast.error(`Erro: ${err.message}`);
      setResult({ success: false, error: err.message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          Teste da API Evolution
        </CardTitle>
        <CardDescription>
          Ferramentas completas de teste e debug da Evolution API
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Instância</Label>
          <Input 
            value={selectedInstance}
            onChange={(e) => setSelectedInstance(e.target.value)}
            placeholder="SDR2"
          />
        </div>

        <Tabs defaultValue="connection" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="connection">
              <TestTube className="h-4 w-4 mr-2" />
              Conexão
            </TabsTrigger>
            <TabsTrigger value="send">
              <Send className="h-4 w-4 mr-2" />
              Enviar
            </TabsTrigger>
            <TabsTrigger value="instances">
              <List className="h-4 w-4 mr-2" />
              Instâncias
            </TabsTrigger>
          </TabsList>

          <TabsContent value="connection" className="space-y-4">
            <Button 
              onClick={testConnection} 
              disabled={testing}
              className="w-full"
            >
              {testing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testando...
                </>
              ) : (
                <>
                  <TestTube className="h-4 w-4 mr-2" />
                  Testar Conexão
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="send" className="space-y-4">
            <div className="space-y-2">
              <Label>Telefone (com DDI)</Label>
              <Input 
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="5561999999999"
              />
            </div>
            <div className="space-y-2">
              <Label>Mensagem</Label>
              <Input 
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Mensagem de teste"
              />
            </div>
            <Button 
              onClick={sendTestMessage} 
              disabled={testing || !phoneNumber || !messageText}
              className="w-full"
            >
              {testing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Mensagem de Teste
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="instances" className="space-y-4">
            <Button 
              onClick={listInstances} 
              disabled={testing}
              className="w-full"
            >
              {testing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Carregando...
                </>
              ) : (
                <>
                  <List className="h-4 w-4 mr-2" />
                  Listar Todas as Instâncias
                </>
              )}
            </Button>
            
            {instances.length > 0 && (
              <div className="space-y-2">
                <Label>Instâncias encontradas: {instances.length}</Label>
                <div className="max-h-48 overflow-auto space-y-2">
                  {instances.map((instance: { instanceName?: string; name?: string; state?: string; status?: string }, idx: number) => (
                    <div key={idx} className="p-2 border rounded text-sm">
                      <div><strong>{instance.instanceName || instance.name}</strong></div>
                      <div className="text-xs text-muted-foreground">
                        Estado: {instance.state || instance.status || 'unknown'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {result && (
          <Alert variant={result.success ? 'default' : 'destructive'}>
            <div className="flex items-start gap-2">
              {result.success ? (
                <CheckCircle2 className="h-4 w-4 mt-0.5" />
              ) : (
                <XCircle className="h-4 w-4 mt-0.5" />
              )}
              <div className="flex-1">
                <AlertDescription>
                  <div className="font-medium mb-2">
                    {result.success ? 'Operação bem-sucedida!' : 'Falha na operação'}
                  </div>
                  <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-48">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </AlertDescription>
              </div>
            </div>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
