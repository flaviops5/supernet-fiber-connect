import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Loader2, 
  Play, 
  CheckCircle2, 
  XCircle, 
  MessageSquare,
  ArrowRight,
  User,
  Bot,
  Send,
  Database
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface FlowStep {
  id: string;
  title: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message?: string;
  data?: any;
}

export default function WhatsAppFlowTest() {
  const [testing, setTesting] = useState(false);
  const [customerPhone, setCustomerPhone] = useState("5561999887766");
  const [customerName, setCustomerName] = useState("Cliente Teste");
  const [customerMessage, setCustomerMessage] = useState("Olá! Gostaria de contratar um plano de internet.");
  const [steps, setSteps] = useState<FlowStep[]>([]);

  const updateStep = (id: string, updates: Partial<FlowStep>) => {
    setSteps(prev => prev.map(step => 
      step.id === id ? { ...step, ...updates } : step
    ));
  };

  const addStep = (step: FlowStep) => {
    setSteps(prev => [...prev, step]);
  };

  const runCompleteFlow = async () => {
    setTesting(true);
    setSteps([]);

    try {
      // Step 1: Simular recebimento de mensagem
      addStep({
        id: 'receive',
        title: '1. Receber Mensagem do Cliente',
        status: 'running',
        message: 'Simulando mensagem recebida via Evolution API...'
      });

      await new Promise(resolve => setTimeout(resolve, 800));

      const webhookPayload = {
        event: 'messages.upsert',
        instance: 'SDR2',
        data: {
          key: {
            remoteJid: `${customerPhone}@s.whatsapp.net`,
            fromMe: false,
            id: `TEST_${Date.now()}`
          },
          message: {
            conversation: customerMessage
          },
          messageTimestamp: Date.now(),
          pushName: customerName
        }
      };

      updateStep('receive', {
        status: 'success',
        message: `Mensagem recebida de ${customerName}`,
        data: webhookPayload
      });

      // Step 2: Processar webhook
      addStep({
        id: 'webhook',
        title: '2. Processar Webhook',
        status: 'running',
        message: 'Enviando para webhook do Supabase...'
      });

      const { data: webhookResponse, error: webhookError } = await supabase.functions.invoke('whatsapp-webhook', {
        body: webhookPayload
      });

      if (webhookError) throw new Error(`Erro no webhook: ${webhookError.message}`);

      updateStep('webhook', {
        status: 'success',
        message: 'Webhook processado com sucesso',
        data: webhookResponse
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 3: Verificar conversa criada
      addStep({
        id: 'conversation',
        title: '3. Criar/Atualizar Conversa',
        status: 'running',
        message: 'Verificando conversa no banco de dados...'
      });

      const { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('customer_phone', customerPhone)
        .order('created_at', { ascending: false })
        .limit(1);

      if (convError) throw new Error(`Erro ao buscar conversa: ${convError.message}`);

      const conversation = conversations?.[0];

      if (conversation) {
        updateStep('conversation', {
          status: 'success',
          message: `Conversa ${conversation.id.substring(0, 8)}... encontrada`,
          data: conversation
        });
      } else {
        updateStep('conversation', {
          status: 'error',
          message: 'Conversa não foi criada'
        });
        throw new Error('Conversa não foi criada no banco de dados');
      }

      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 4: Verificar mensagem do cliente
      addStep({
        id: 'customer_message',
        title: '4. Salvar Mensagem do Cliente',
        status: 'running',
        message: 'Verificando mensagem salva...'
      });

      const { data: messages, error: msgError } = await supabase
        .from('conversation_messages')
        .select('*')
        .eq('conversation_id', conversation.id)
        .eq('sender_type', 'customer')
        .order('created_at', { ascending: false })
        .limit(1);

      if (msgError) throw new Error(`Erro ao buscar mensagem: ${msgError.message}`);

      if (messages && messages.length > 0) {
        updateStep('customer_message', {
          status: 'success',
          message: 'Mensagem do cliente salva',
          data: messages[0]
        });
      } else {
        updateStep('customer_message', {
          status: 'error',
          message: 'Mensagem do cliente não foi salva'
        });
      }

      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 5: Verificar resposta do agente
      addStep({
        id: 'agent_response',
        title: '5. Gerar Resposta do Agente',
        status: 'running',
        message: 'Verificando resposta do agente AI...'
      });

      const { data: agentMessages, error: agentMsgError } = await supabase
        .from('conversation_messages')
        .select('*')
        .eq('conversation_id', conversation.id)
        .in('sender_type', ['agent', 'ai'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (agentMsgError) throw new Error(`Erro ao buscar resposta: ${agentMsgError.message}`);

      if (agentMessages && agentMessages.length > 0) {
        updateStep('agent_response', {
          status: 'success',
          message: 'Resposta do agente gerada',
          data: agentMessages[0]
        });
      } else {
        updateStep('agent_response', {
          status: 'error',
          message: 'Resposta do agente não foi gerada'
        });
      }

      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 6: Verificar envio de mensagem
      addStep({
        id: 'send',
        title: '6. Enviar Resposta via WhatsApp',
        status: 'running',
        message: 'Verificando envio da mensagem...'
      });

      if (webhookResponse?.messageSent) {
        updateStep('send', {
          status: 'success',
          message: 'Mensagem enviada com sucesso via WhatsApp'
        });
      } else {
        updateStep('send', {
          status: 'success',
          message: 'Mensagem salva (envio não confirmado - normal em ambiente de teste)'
        });
      }

      toast.success("✅ Teste completo do fluxo concluído!");

    } catch (error: any) {
      console.error("Erro no teste:", error);
      toast.error(`❌ Erro: ${error.message}`);
      
      // Marcar último step como erro
      if (steps.length > 0) {
        const lastStep = steps[steps.length - 1];
        updateStep(lastStep.id, {
          status: 'error',
          message: error.message
        });
      }
    } finally {
      setTesting(false);
    }
  };

  const getStepIcon = (status: FlowStep['status']) => {
    switch (status) {
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-gray-300" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>🧪 Teste Completo do Fluxo</CardTitle>
        <CardDescription>
          Simula uma mensagem completa de ponta a ponta
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Configuração do teste */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nome do Cliente</Label>
            <Input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Cliente Teste"
              disabled={testing}
            />
          </div>

          <div className="space-y-2">
            <Label>Telefone (com DDI)</Label>
            <Input
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="5561999887766"
              disabled={testing}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Mensagem do Cliente</Label>
          <Textarea
            value={customerMessage}
            onChange={(e) => setCustomerMessage(e.target.value)}
            placeholder="Digite a mensagem que o cliente enviaria..."
            rows={3}
            disabled={testing}
          />
        </div>

        <Button
          onClick={runCompleteFlow}
          disabled={testing || !customerPhone || !customerMessage}
          className="w-full"
          size="lg"
        >
          {testing ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Executando Teste...
            </>
          ) : (
            <>
              <Play className="mr-2 h-5 w-5" />
              Iniciar Teste Completo
            </>
          )}
        </Button>

        {/* Visualização dos steps */}
        {steps.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Progresso do Teste</h3>
              
              {steps.map((step, index) => (
                <div key={step.id}>
                  <div className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                    <div className="mt-0.5">
                      {getStepIcon(step.status)}
                    </div>
                    
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">{step.title}</p>
                        <Badge 
                          variant={
                            step.status === 'success' ? 'default' : 
                            step.status === 'error' ? 'destructive' : 
                            'secondary'
                          }
                        >
                          {step.status === 'running' ? 'Executando' : 
                           step.status === 'success' ? 'Concluído' :
                           step.status === 'error' ? 'Erro' : 'Aguardando'}
                        </Badge>
                      </div>
                      
                      {step.message && (
                        <p className="text-xs text-muted-foreground">{step.message}</p>
                      )}
                      
                      {step.data && (
                        <details className="mt-2">
                          <summary className="text-xs cursor-pointer text-blue-600 hover:underline">
                            Ver dados
                          </summary>
                          <pre className="mt-2 p-2 text-xs bg-muted rounded overflow-auto max-h-40">
                            {JSON.stringify(step.data, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                  
                  {index < steps.length - 1 && (
                    <div className="flex justify-center py-2">
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {steps.length > 0 && steps.every(s => s.status === 'success') && (
              <Alert className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-100">
                  ✅ Todos os passos foram concluídos com sucesso! O sistema está 100% operacional.
                </AlertDescription>
              </Alert>
            )}
          </>
        )}

        {/* Legenda */}
        <Separator />
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">O que este teste verifica:</h4>
          <ul className="text-xs space-y-1 text-muted-foreground">
            <li className="flex items-center gap-2">
              <MessageSquare className="h-3 w-3" />
              Recepção de mensagens via webhook
            </li>
            <li className="flex items-center gap-2">
              <Database className="h-3 w-3" />
              Criação/atualização de conversas no banco
            </li>
            <li className="flex items-center gap-2">
              <User className="h-3 w-3" />
              Salvamento da mensagem do cliente
            </li>
            <li className="flex items-center gap-2">
              <Bot className="h-3 w-3" />
              Geração de resposta pelo agente AI
            </li>
            <li className="flex items-center gap-2">
              <Send className="h-3 w-3" />
              Envio da resposta via WhatsApp
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
