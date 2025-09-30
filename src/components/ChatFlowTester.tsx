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
  role: 'client' | 'agent' | 'system';
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
      role: 'client',
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
        sender_type: 'client',
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

      // Add agent response
      const agentMessage: Message = {
        role: 'agent',
        content: data.message || 'Processando...',
        timestamp: new Date(),
        metadata: data
      };

      setMessages(prev => [...prev, agentMessage]);

      // Update customer data if identified
      if (data.customerIdentified && data.customerData) {
        setCustomerData(data.customerData);
      }

      // Update routed agent
      if (data.agent && data.agent !== 'routing' && data.agent !== 'identification') {
        setRoutedAgent(data.agent);
      }

      // Save agent message
      await supabase.from('conversation_messages').insert({
        conversation_id: conversationId,
        sender_type: 'agent',
        sender_name: 'Sistema',
        content: data.message || 'Processando...',
        metadata: data
      });

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

  const getAgentBadge = (agent: string) => {
    const variants: Record<string, { label: string; color: string }> = {
      sales: { label: 'Vendas', color: 'bg-green-500' },
      support_tech: { label: 'Suporte Técnico', color: 'bg-blue-500' },
      support_financial: { label: 'Financeiro', color: 'bg-orange-500' },
      routing: { label: 'Roteamento', color: 'bg-gray-500' },
      identification: { label: 'Identificação', color: 'bg-purple-500' }
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
                    className={`flex ${msg.role === 'client' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`flex gap-2 max-w-[80%] ${
                        msg.role === 'client' ? 'flex-row-reverse' : 'flex-row'
                      }`}
                    >
                      <div className="flex-shrink-0">
                        {msg.role === 'client' ? (
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
                          msg.role === 'client'
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

          {/* Instructions */}
          <div className="mt-4 p-3 bg-muted rounded text-xs space-y-2">
            <p className="font-medium">Como testar:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Inicie uma nova conversa</li>
              <li>Envie "Oi" para saudação</li>
              <li>Envie "Estou sem internet"</li>
              <li>Informe um CPF válido</li>
              <li>Observe o roteamento automático</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
