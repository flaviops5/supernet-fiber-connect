import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { logger } from '@/lib/logger';

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

const OmnichannelChat: React.FC<OmnichannelChatProps> = ({ conversationId: initialConversationId, customerData }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentAgent, setCurrentAgent] = useState<string>('routing');
  const [conversationId, setConversationId] = useState<string | undefined>(initialConversationId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Load initial messages if conversationId exists
    if (conversationId) {
      loadConversationMessages();
      loadConversationAgent();
    }
    // Chat começa vazio - Cloé responde quando o usuário envia a primeira mensagem
  }, [conversationId]);

  const loadConversationAgent = async () => {
    if (!conversationId) return;
    
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('department')
        .eq('id', conversationId)
        .single();

      if (error) throw error;

      if (data?.department) {
        // Map department to agent (departments são: comercial, tecnico, financeiro)
        const agentMap: Record<string, string> = {
          'comercial': 'sales',
          'tecnico': 'support_tech',
          'financeiro': 'support_financial'
        };
        
        const agent = agentMap[data.department] || 'routing';
        setCurrentAgent(agent);
      }
    } catch (error) {
      // Error loading conversation agent
    }
  };

  const loadConversationMessages = async (convId?: string) => {
    const targetId = convId || conversationId;
    if (!targetId) {
      return;
    }

    try {
      const { data, error } = await supabase
        .from('conversation_messages')
        .select('*')
        .eq('conversation_id', targetId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data) {
        setMessages(data.map(msg => ({
          role: msg.sender_type === 'customer' ? 'user' : 'assistant',
          content: msg.content,
          timestamp: new Date(msg.created_at)
        })));
      }
    } catch (error) {
      logger.error('Error loading messages', error as Error);
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
      // Se não temos conversationId, criar uma nova conversa
      let activeConversationId = conversationId;
      
      if (!activeConversationId) {
        const { data: newConversation, error: convError } = await supabase
          .from('conversations')
          .insert({
            channel: 'chatbot',
            customer_name: customerData?.name || 'Visitante',
            customer_email: customerData?.email,
            customer_phone: customerData?.phone,
            customer_cpf: customerData?.cpf,
            status: 'active',
          })
          .select()
          .single();

        if (convError) throw convError;
        
        activeConversationId = newConversation.id;
        setConversationId(activeConversationId);
      }

      let finalAgent = currentAgent;
      let responseMessage = '';

      // Verificar se a conversa já tem mensagens (não é a primeira interação)
      const { data: existingMessages } = await supabase
        .from('conversation_messages')
        .select('id')
        .eq('conversation_id', activeConversationId)
        .limit(1);

      const isFirstInteraction = !existingMessages || existingMessages.length === 0;

      // Se não é a primeira interação, verificar departamento e enviar direto ao agente
      if (!isFirstInteraction) {
        const { data: conversation } = await supabase
          .from('conversations')
          .select('department')
          .eq('id', activeConversationId)
          .single();

        // Se já tem departamento atribuído, enviar direto para o agente especializado
        if (conversation?.department) {
          
          // Salvar mensagem do cliente
          await supabase.from('conversation_messages').insert({
            conversation_id: activeConversationId,
            sender_type: 'customer',
            sender_name: customerData?.name || 'Cliente',
            content: userMessage.content
          });

          let agentFunction = '';
          if (conversation.department === 'comercial') agentFunction = 'sales-agent';
          else if (conversation.department === 'tecnico') agentFunction = 'support-tech-agent';
          else if (conversation.department === 'financeiro') agentFunction = 'support-financial-agent';

          if (agentFunction) {
            const { data: agentResponse, error: agentError } = await supabase.functions.invoke(agentFunction, {
              body: {
                conversation_id: activeConversationId,
                customer_cpf: customerData?.cpf,
                message: userMessage.content,
              },
          });

          if (agentError) {
            logger.error('Error calling agent', agentError);
            throw agentError;
          }

            // Atualizar estado do agente
            setCurrentAgent(agentFunction);
          }

          await loadConversationMessages(activeConversationId);
          setIsLoading(false);
          return;
        }
      }

      // Primeira interação ou sem departamento: passa pelo routing-agent
      // Salvar mensagem do cliente ANTES de chamar routing-agent
      await supabase.from('conversation_messages').insert({
        conversation_id: activeConversationId,
        sender_type: 'customer',
        sender_name: customerData?.name || 'Cliente',
        content: userMessage.content
      });

      const { data: routingData, error: routingError } = await supabase.functions.invoke('routing-agent', {
          body: {
            message: userMessage.content,
            conversationId: activeConversationId,
            context: customerData,
          }
        });

      if (routingError) throw routingError;

      // Após resposta do routing-agent, sempre recarregar mensagens salvas no banco
      await loadConversationMessages(activeConversationId);

      // Se foi transferido para departamento especializado, chamar o agente correto
      if (routingData.targetDepartment && routingData.targetDepartment !== 'cloe') {
          
          let agentFunction = '';
          if (routingData.targetDepartment === 'comercial') agentFunction = 'sales-agent';
          else if (routingData.targetDepartment === 'tecnico') agentFunction = 'support-tech-agent';
          else if (routingData.targetDepartment === 'financeiro') agentFunction = 'support-financial-agent';

          // Atualizar estado do agente
        if (agentFunction) {
          setCurrentAgent(agentFunction);
        }

        if (agentFunction) {
          try {
            const { data: agentResponse, error: agentError } = await supabase.functions.invoke(agentFunction, {
                body: {
                  messages: [{ role: 'user', content: userMessage.content }],
                  userContext: {
                    protocol: routingData.protocol,
                    department: routingData.targetDepartment,
                    customerData,
                  },
                },
            });

            if (agentError) {
              logger.error('Error calling specialized agent', agentError);
              throw agentError;
            }

              // Sales-agent retorna mensagem diretamente ou em um objeto
              const agentMessage = typeof agentResponse === 'string' 
                ? agentResponse 
                : agentResponse?.message || agentResponse?.content;

              if (agentMessage) {
                await supabase.from('conversation_messages').insert({
                  conversation_id: activeConversationId,
                  sender_type: 'agent',
                  sender_name: routingData.targetDepartment === 'comercial' ? 'Vicente' : 
                              routingData.targetDepartment === 'tecnico' ? 'Luan' : 'Julia',
                  content: agentMessage,
                });
              }

            await loadConversationMessages(activeConversationId);
          } catch (error) {
            logger.error('Error calling specialized agent', error as Error);
          }
        }
      }

        setIsLoading(false);
        return;

    } catch (error: any) {
      logger.error('Error sending message', error);
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
