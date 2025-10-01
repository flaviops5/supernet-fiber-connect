import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Send, Bot, User, Loader2 } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  agent?: string;
  timestamp?: Date;
}

interface OmnichannelChatProps {
  conversationId?: string;
  customerData?: {
    name?: string;
    email?: string;
    phone?: string;
    cpf?: string;
  };
}

const OmnichannelChat: React.FC<OmnichannelChatProps> = ({ conversationId, customerData }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentAgent, setCurrentAgent] = useState<string>('routing');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Load initial messages if conversationId exists
    if (conversationId) {
      loadConversationMessages();
    } else {
      // Initial greeting
      setMessages([{
        role: 'assistant',
        content: 'Olá! Tudo bem? Meu nome é Cloé, atendente da SUPERNET FIBRA. Como posso ajudar hoje?\n\n🛒 Vendas — Contratar planos, consultar preços\n🔧 Suporte Técnico — Problemas de conexão\n💰 Financeiro — Boletos e pagamentos',
        agent: 'routing',
        timestamp: new Date()
      }]);
    }
  }, [conversationId]);

  const loadConversationMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('conversation_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data) {
        setMessages(data.map(msg => ({
          role: msg.sender_type === 'client' ? 'user' : 'assistant',
          content: msg.content,
          timestamp: new Date(msg.created_at)
        })));
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // First, determine routing if we're not already routed
      let targetAgent = currentAgent;
      
      if (currentAgent === 'routing' || messages.length < 2) {
        // Call routing agent
        const { data: routingData, error: routingError } = await supabase.functions.invoke('routing-agent', {
          body: {
            message: input,
            conversationId,
            context: customerData
          }
        });

        if (routingError) throw routingError;

        console.log('Routing decision:', routingData);

        if (routingData.agent === 'clarify') {
          // Need clarification
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: routingData.message,
            agent: 'routing',
            timestamp: new Date()
          }]);
          setIsLoading(false);
          return;
        }

        targetAgent = routingData.agent;
        setCurrentAgent(targetAgent);

        // Show routing message
        if (routingData.message) {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: routingData.message,
            agent: 'routing',
            timestamp: new Date()
          }]);
          
          // Small delay to show routing message
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Call the appropriate agent
      const agentEndpoint = 
        targetAgent === 'sales' ? 'sales-agent' :
        targetAgent === 'support_tech' ? 'support-tech-agent' :
        targetAgent === 'support_financial' ? 'support-financial-agent' :
        'sales-agent'; // Default fallback

      const { data: agentData, error: agentError } = await supabase.functions.invoke(agentEndpoint, {
        body: {
          messages: [{ role: 'user', content: input }],
          conversationId,
          customerData
        }
      });

      if (agentError) throw agentError;

      const assistantMessage: Message = {
        role: 'assistant',
        content: agentData.message,
        agent: targetAgent,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Save messages to database if conversationId exists
      if (conversationId) {
        await supabase.from('conversation_messages').insert([
          {
            conversation_id: conversationId,
            sender_type: 'client',
            sender_name: customerData?.name || 'Cliente',
            content: input
          },
          {
            conversation_id: conversationId,
            sender_type: 'agent',
            sender_name: `Agente IA - ${targetAgent}`,
            content: agentData.message,
            ai_suggestion: true
          }
        ]);
      }

    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: 'Erro ao enviar mensagem',
        description: error.message || 'Tente novamente',
        variant: 'destructive',
      });
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Desculpe, estou com dificuldades no momento. Por favor, tente novamente.',
        agent: 'error',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getAgentBadge = (agent?: string) => {
    if (!agent || agent === 'routing') return null;
    
    const agentNames: Record<string, { label: string; color: string }> = {
      sales: { label: 'Vendas', color: 'bg-green-500' },
      support_tech: { label: 'Suporte Técnico', color: 'bg-blue-500' },
      support_financial: { label: 'Financeiro', color: 'bg-purple-500' }
    };

    const agentInfo = agentNames[agent];
    if (!agentInfo) return null;

    return (
      <Badge className={`${agentInfo.color} text-white text-xs`}>
        {agentInfo.label}
      </Badge>
    );
  };

  return (
    <Card className="flex flex-col h-[600px] w-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-primary to-primary/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-6 h-6 text-white" />
            <div>
              <h3 className="font-semibold text-white">Atendimento SUPERNET — Cloé</h3>
              <p className="text-xs text-white/80">
                {currentAgent === 'routing' ? 'Determinando melhor atendimento...' :
                 currentAgent === 'sales' ? 'Setor de Vendas' :
                 currentAgent === 'support_tech' ? 'Suporte Técnico N1' :
                 currentAgent === 'support_financial' ? 'Suporte Financeiro N1' : 'Atendimento'}
              </p>
            </div>
          </div>
          {currentAgent !== 'routing' && getAgentBadge(currentAgent)}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex items-start gap-3 ${
              message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
            }`}
          >
            <div className={`p-2 rounded-full ${
              message.role === 'user' ? 'bg-primary' : 'bg-muted'
            }`}>
              {message.role === 'user' ? (
                <User className="w-4 h-4 text-white" />
              ) : (
                <Bot className="w-4 h-4" />
              )}
            </div>
            <div className={`flex flex-col gap-1 max-w-[70%] ${
              message.role === 'user' ? 'items-end' : 'items-start'
            }`}>
              <div className={`p-3 rounded-lg ${
                message.role === 'user'
                  ? 'bg-primary text-white'
                  : 'bg-muted'
              }`}>
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
              <div className="flex items-center gap-2">
                {message.timestamp && (
                  <span className="text-xs text-muted-foreground">
                    {message.timestamp.toLocaleTimeString('pt-BR', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                )}
                {message.agent && message.role === 'assistant' && getAgentBadge(message.agent)}
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-muted">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-muted p-3 rounded-lg">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite sua mensagem..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button 
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            size="icon"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default OmnichannelChat;
