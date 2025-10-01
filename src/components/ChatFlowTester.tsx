import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Send, RotateCcw, User, Bot } from 'lucide-react';

interface Message {
  role: 'customer' | 'agent' | 'system';
  content: string;
  timestamp: Date;
  metadata?: any;
}

export default function ChatFlowTester() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [customerData, setCustomerData] = useState<any>(null);
  const [routedAgent, setRoutedAgent] = useState<string | null>(null);
  const { toast } = useToast();

  const startNewConversation = async () => {
    try {
      // Create new conversation
      const { data, error } = await supabase
        .from('conversations')
        .insert([{
          customer_name: 'Cliente Teste',
          channel: 'chatbot' as const,
          status: 'waiting' as const
        }])
        .select()
        .single();

      if (error) throw error;

      setConversationId(data.id);
      setMessages([]);
      setCustomerData(null);
      setRoutedAgent(null);
      
      toast({
        title: "Nova conversa iniciada",
        description: `ID: ${data.id.substring(0, 8)}...`
      });
    } catch (error: any) {
      toast({
        title: "Erro ao iniciar conversa",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !conversationId) return;

    const clientMessage: Message = {
      role: 'customer',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, clientMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Save client message
      await supabase.from('conversation_messages').insert({
        conversation_id: conversationId,
        sender_type: 'customer',
        sender_name: 'Cliente Teste',
        content: input
      });

      // Call routing agent
      const { data, error } = await supabase.functions.invoke('routing-agent', {
        body: {
          message: input,
          conversationId: conversationId,
          context: {}
        }
      });

      if (error) throw error;

      console.log('Routing response:', data);

      // Update customer data if identified
      if (data.customerIdentified && data.customerData) {
        setCustomerData(data.customerData);
      }

      // Update routed agent
      if (data.agent && data.agent !== 'routing' && data.agent !== 'identification') {
        setRoutedAgent(data.agent);
      }

      // Se Julia já respondeu pelo server (juliaResponse = true), 
      // a mensagem já vem completa em data.message
      if (data.juliaResponse) {
        console.log('✅ Julia respondeu pelo servidor - mensagem já incluída');
        const juliaMessage: Message = {
          role: 'agent',
          content: data.message,
          timestamp: new Date(),
          metadata: { agent: 'support_financial' }
        };
        setMessages(prev => [...prev, juliaMessage]);
        setRoutedAgent('support_financial');
        toast({ 
          title: 'Transferido para Financeiro', 
          description: 'Julia assumiu o atendimento.' 
        });
        return;
      }

      // Caso normal: adiciona mensagem do routing agent
      const agentMessage: Message = {
        role: 'agent',
        content: data.message || 'Processando...',
        timestamp: new Date(),
        metadata: data
      };

      setMessages(prev => [...prev, agentMessage]);

      // Save routing agent message (apenas se não foi Julia)
      if (data.agent !== 'support_financial') {
        await supabase.from('conversation_messages').insert({
          conversation_id: conversationId,
          sender_type: 'agent',
          sender_name: 'Sistema',
          content: data.message || 'Processando...',
          metadata: data
        });
      }

      // If routed to Financeiro, auto-transfer to Julia and let her reply
      if (data.agent === 'support_financial') {
        try {
          const effectiveCustomerData = data.customerData || customerData;
          const reasonText = String(data.reason || '').toLowerCase();
          const routeReason = reasonText.includes('bloquead') || reasonText.includes('atraso')
            ? 'blocked_or_overdue'
            : undefined;

          console.log('Transbordo para Financeiro iniciado', {
            conversationId,
            routeReason,
            hasCustomerData: Boolean(effectiveCustomerData),
          });
          toast({
            title: 'Transferindo para Financeiro',
            description: 'Chamando Julia Martins...'
          });

          const { data: finData, error: finError } = await supabase.functions.invoke('support-financial-agent', {
            body: {
              messages: [{ role: 'user', content: input }],
              conversationId,
              customerData: effectiveCustomerData,
              routeReason,
            },
          });

          if (finError) throw finError;

          console.log('Resposta da Julia (support-financial-agent):', finData);

          const juliaMessage: string = finData?.message || 'Olá! Sou a Julia Martins do setor financeiro da SUPERNET FIBRA. Vou ajudar você agora.';

          // Append Julia's message to the tester UI
          setMessages(prev => [...prev, {
            role: 'agent',
            content: juliaMessage,
            timestamp: new Date(),
            metadata: { agent: 'support_financial' }
          }]);

          // Persist Julia's answer
          await supabase.from('conversation_messages').insert({
            conversation_id: conversationId,
            sender_type: 'agent',
            sender_name: 'Julia Martins (Financeiro)',
            content: juliaMessage,
            ai_suggestion: true,
          });

          toast({
            title: 'Transferido para Financeiro',
            description: 'Julia assumiu o atendimento.'
          });
        } catch (e: any) {
          console.error('Erro no transbordo para Financeiro:', e);
          toast({
            title: 'Falha ao transferir para Financeiro',
            description: e?.message || 'Erro desconhecido ao chamar a Julia.',
            variant: 'destructive'
          });
        }
      }

    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: "Erro ao enviar mensagem",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const quickMessages = [
    "Oi",
    "Estou sem internet",
    "619.538.901-30",
    "Quero contratar um plano",
    "Minha internet está lenta"
  ];

  // Cenários de teste específicos para roteamento
  const testScenarios = [
    {
      name: "OFFLINE + Sem Pendências",
      description: "Cliente offline, sem dívidas → Técnico",
      cpf: "111.111.111-11",
      message: "Minha internet não está funcionando",
      expectedRoute: "support_tech"
    },
    {
      name: "OFFLINE + Com Pendências",
      description: "Cliente offline e bloqueado → Financeiro",
      cpf: "222.222.222-22", 
      message: "Não consigo mais acessar a internet",
      expectedRoute: "support_financial"
    },
    {
      name: "ONLINE + Sem Pendências",
      description: "Cliente online, tudo ok → Cloé analisa",
      cpf: "333.333.333-33",
      message: "Meu wifi está lento no quarto",
      expectedRoute: "routing"
    },
    {
      name: "ONLINE + Com Pendências",
      description: "Cliente online mas deve pagar → Financeiro",
      cpf: "444.444.444-44",
      message: "Quero a segunda via do boleto",
      expectedRoute: "support_financial"
    },
    {
      name: "Cliente Novo",
      description: "Não tem cadastro no IXC → Vendas",
      cpf: "999.999.999-99",
      message: "Quero contratar internet",
      expectedRoute: "sales"
    }
  ];

  const runScenario = async (scenario: typeof testScenarios[0]) => {
    if (!conversationId) {
      toast({
        title: "Inicie uma conversa primeiro",
        description: "Clique em 'Nova Conversa' para começar",
        variant: "destructive"
      });
      return;
    }

    // Limpar mensagens anteriores
    setMessages([]);
    setCustomerData(null);
    setRoutedAgent(null);

    // Primeiro enviar saudação
    await new Promise(resolve => setTimeout(resolve, 500));
    setInput("Oi");
    await sendMessage();

    // Aguardar resposta
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Enviar CPF
    setInput(scenario.cpf);
    await sendMessage();

    // Aguardar identificação
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Enviar mensagem do cenário
    setInput(scenario.message);
    await sendMessage();

    toast({
      title: `Cenário: ${scenario.name}`,
      description: scenario.description,
    });
  };

  const getAgentBadge = (agent: string) => {
    const variants: Record<string, { label: string; color: string }> = {
      sales: { label: 'Vicente (Vendas)', color: 'bg-green-500' },
      support_tech: { label: 'Suporte Técnico', color: 'bg-blue-500' },
      support_financial: { label: 'Julia Martins (Financeiro)', color: 'bg-orange-500' },
      routing: { label: 'Cloé (Roteamento)', color: 'bg-gray-500' },
      identification: { label: 'Cloé (Identificação)', color: 'bg-purple-500' }
    };

    return variants[agent] || { label: agent, color: 'bg-gray-500' };
  };

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Chat Area */}
      <Card className="md:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Simulador de Conversa</CardTitle>
            <Button onClick={startNewConversation} size="sm" variant="outline">
              <RotateCcw className="w-4 h-4 mr-2" />
              Nova Conversa
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <ScrollArea className="h-[400px] pr-4">
            {!conversationId ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Clique em "Nova Conversa" para começar
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Envie uma mensagem para iniciar
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'customer' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`flex gap-2 max-w-[80%] ${
                        msg.role === 'customer' ? 'flex-row-reverse' : 'flex-row'
                      }`}
                    >
                      <div className="flex-shrink-0">
                        {msg.role === 'customer' ? (
                          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                            <User className="w-4 h-4 text-primary-foreground" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                            <Bot className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                      <div
                        className={`rounded-lg p-3 ${
                          msg.role === 'customer'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        {msg.metadata && (
                          <div className="mt-2 pt-2 border-t border-border/50">
                            <p className="text-xs opacity-70">
                              {msg.metadata.agent && (
                                <Badge variant="outline" className="mr-2">
                                  {getAgentBadge(msg.metadata.agent).label}
                                </Badge>
                              )}
                              {msg.metadata.confidence && (
                                <span>Confiança: {msg.metadata.confidence}%</span>
                              )}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Quick Messages */}
          <div className="flex flex-wrap gap-2">
            {quickMessages.map((msg, idx) => (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                onClick={() => setInput(msg)}
                disabled={!conversationId || isLoading}
              >
                {msg}
              </Button>
            ))}
          </div>

          {/* Input */}
          <div className="flex gap-2">
            <Input
              placeholder="Digite uma mensagem..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !isLoading && sendMessage()}
              disabled={!conversationId || isLoading}
            />
            <Button
              onClick={sendMessage}
              disabled={!conversationId || isLoading || !input.trim()}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Status Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Status da Conversa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Conversation ID */}
          <div>
            <p className="text-sm font-medium mb-1">ID da Conversa:</p>
            <p className="text-xs text-muted-foreground font-mono">
              {conversationId ? `${conversationId.substring(0, 8)}...` : 'N/A'}
            </p>
          </div>

          {/* Customer Data */}
          {customerData && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Dados do Cliente:</p>
              <div className="space-y-1 text-xs">
                <p><strong>Nome:</strong> {customerData.customer_name}</p>
                <p><strong>CPF:</strong> {customerData.customer_cpf}</p>
                {customerData.customer_email && (
                  <p><strong>Email:</strong> {customerData.customer_email}</p>
                )}
                {customerData.customer_phone && (
                  <p><strong>Telefone:</strong> {customerData.customer_phone}</p>
                )}
                {customerData.ixc_client_id && (
                  <p><strong>ID IXC:</strong> {customerData.ixc_client_id}</p>
                )}
              </div>

              {/* Client Status */}
              {customerData.metadata?.cliente_status && (
                <div className="mt-2 p-2 bg-muted rounded">
                  <p className="text-xs font-medium mb-1">Status no IXC:</p>
                  <div className="space-y-1 text-xs">
                    <p>
                      <strong>Online:</strong>{' '}
                      <Badge variant={customerData.metadata.cliente_status.online ? 'default' : 'secondary'}>
                        {customerData.metadata.cliente_status.online ? 'SIM' : 'NÃO'}
                      </Badge>
                    </p>
                    <p>
                      <strong>Bloqueado:</strong>{' '}
                      <Badge variant={customerData.metadata.cliente_status.blocked ? 'destructive' : 'secondary'}>
                        {customerData.metadata.cliente_status.blocked ? 'SIM' : 'NÃO'}
                      </Badge>
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Routed Agent */}
          {routedAgent && (
            <div>
              <p className="text-sm font-medium mb-2">Roteado para:</p>
              <Badge className={getAgentBadge(routedAgent).color}>
                {getAgentBadge(routedAgent).label}
              </Badge>
            </div>
          )}

          {/* Test Scenarios */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Cenários de Teste:</p>
            <div className="space-y-2">
              {testScenarios.map((scenario, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-left h-auto py-2"
                  onClick={() => runScenario(scenario)}
                  disabled={!conversationId || isLoading}
                >
                  <div className="flex flex-col items-start gap-1">
                    <span className="font-medium text-xs">{scenario.name}</span>
                    <span className="text-xs text-muted-foreground">{scenario.description}</span>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-4 p-3 bg-muted rounded text-xs space-y-2">
            <p className="font-medium">Como usar:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Clique em "Nova Conversa"</li>
              <li>Escolha um cenário de teste</li>
              <li>Aguarde o fluxo completo</li>
              <li>Verifique o roteamento correto</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
