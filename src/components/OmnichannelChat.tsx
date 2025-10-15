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
        console.log('Loaded conversation agent:', agent, 'from department:', data.department);
        setCurrentAgent(agent);
      }
    } catch (error) {
      console.error('Error loading conversation agent:', error);
    }
  };

  const loadConversationMessages = async (convId?: string) => {
    const targetId = convId || conversationId;
    if (!targetId) {
      console.warn('⚠️ Sem conversationId para carregar mensagens');
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
        console.log('Nova conversa criada:', activeConversationId);
      }

      let finalAgent = currentAgent;
      let responseMessage = '';

      // Se ainda não temos agente atribuído, passa pela Cloé para orquestração inicial
      if (currentAgent === 'routing') {
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

        console.log('🧭 Routing response:', routingData);

        // Após resposta do routing-agent, sempre recarregar mensagens salvas no banco
        await loadConversationMessages(activeConversationId);
        setIsLoading(false);
        return; // Mensagens já carregadas do banco

        finalAgent = routingData?.agent || 'routing';
        responseMessage = routingData?.message || 'Como posso ajudar?';
        
        // Atualizar agente se mudou
        if (finalAgent !== currentAgent) {
          setCurrentAgent(finalAgent);
          
          // Se foi atribuído um agente especializado, atribuir agente humano disponível
          if (activeConversationId && finalAgent !== 'routing') {
            const deptMap: Record<string, 'comercial' | 'tecnico' | 'financeiro'> = {
              'sales': 'comercial',
              'support_tech': 'tecnico',
              'support_financial': 'financeiro'
            };
            const dept = deptMap[finalAgent as keyof typeof deptMap];
            
            if (dept) {
              // Buscar agente disponível do departamento
              const { data: availableAgents, error: agentError } = await supabase
                .rpc('get_available_agents_for_department', {
                  dept: dept,
                  include_universal: true
                });

              if (agentError) {
                console.error('Error finding available agent:', agentError);
              }

              let assignedAgentId = null;
              
              if (availableAgents && availableAgents.length > 0) {
                // Pegar o primeiro agente disponível com menor carga
                assignedAgentId = availableAgents[0].user_id;
                
                // Incrementar contador de conversas do agente
                const { error: presenceError } = await supabase
                  .from('agent_presence')
                  .update({ 
                    current_conversations: availableAgents[0].current_load + 1,
                    last_activity: new Date().toISOString()
                  })
                  .eq('user_id', assignedAgentId);

                if (presenceError) {
                  console.error('Error updating agent presence:', presenceError);
                }
              }

              // Atualizar conversa com departamento e agente atribuído
              await supabase
                .from('conversations')
                .update({ 
                  department: dept,
                  assigned_agent_id: assignedAgentId,
                  status: assignedAgentId ? 'active' : 'waiting'
                })
                .eq('id', activeConversationId);
              
              console.log('Department updated to:', dept, 'Agent assigned:', assignedAgentId);
              
              // Se não há agente disponível, notificar
              if (!assignedAgentId) {
                responseMessage += '\n\n⏳ No momento não há agentes disponíveis. Você foi adicionado à fila de atendimento e em breve um de nossos atendentes irá assumir esta conversa.';
              }
            }
          }
        }
      } else {
        // Já temos um agente especializado atribuído - enviar DIRETO para ele
        const agentEndpointMap: Record<string, string> = {
          'sales': 'sales-agent',
          'support_tech': 'support-tech-agent',
          'support_financial': 'support-financial-agent'
        };
        
        const endpoint = agentEndpointMap[currentAgent];
        if (!endpoint) throw new Error(`Agente desconhecido: ${currentAgent}`);

        // Preparar mensagens no formato esperado pelos agentes
        const conversationMessages = messages.map(m => ({ 
          role: m.role === 'user' ? 'user' : 'assistant', 
          content: m.content 
        }));

        const { data: agentData, error: agentError } = await supabase.functions.invoke(endpoint, {
          body: {
            messages: [
              ...conversationMessages,
              { role: 'user', content: userMessage.content }
            ],
            conversationId: activeConversationId,
            customerData: customerData || {},
            routeReason: currentAgent === 'support_financial' ? 'blocked_or_overdue' : undefined
          }
        });

        if (agentError) throw agentError;

        responseMessage = agentData?.message || 'Entendido. Como mais posso ajudar?';
        finalAgent = currentAgent; // mantém o agente atual
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: responseMessage,
        agent: finalAgent,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Persistir no banco SOMENTE se routing-agent NÃO salvou
      if (activeConversationId && currentAgent !== 'routing') {
        const agentLabelMap: Record<string, string> = {
          routing: 'Cloé',
          sales: 'Vicente - Vendas',
          support_tech: 'Luan - Suporte Técnico',
          support_financial: 'Julia - Financeiro'
        };
        
        await supabase.from('conversation_messages').insert([
          {
            conversation_id: activeConversationId,
            sender_type: 'customer',
            sender_name: customerData?.name || 'Cliente',
            content: userMessage.content
          },
          {
            conversation_id: activeConversationId,
            sender_type: 'agent',
            sender_name: agentLabelMap[finalAgent] || finalAgent,
            content: responseMessage,
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
