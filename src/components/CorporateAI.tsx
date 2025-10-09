import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bot, Send, User, Brain, MessageCircle, Clock, Trash2, Plus, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface Conversation {
  id: string;
  user_id: string;
  title?: string;
  created_at: string;
  updated_at: string;
  messages?: Message[];
}

const CorporateAI = () => {
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadConversations = async () => {
    setLoadingConversations(true);
    try {
      const { data, error } = await supabase
        .from('ai_conversations')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar conversas",
        variant: "destructive"
      });
    } finally {
      setLoadingConversations(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('ai_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      const formattedMessages = (data || []).map(msg => ({
        ...msg,
        role: msg.role as 'user' | 'assistant'
      }));
      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar mensagens",
        variant: "destructive"
      });
    }
  };

  const createNewConversation = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('ai_conversations')
        .insert([{
          title: 'Nova conversa',
          user_id: user.id
        }])
        .select()
        .single();

      if (error) throw error;
      
      setCurrentConversation(data);
      setMessages([]);
      loadConversations();
      
      return data;
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar nova conversa",
        variant: "destructive"
      });
      return null;
    }
  };

  const selectConversation = async (conversation: Conversation) => {
    setCurrentConversation(conversation);
    await loadMessages(conversation.id);
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    let conversation = currentConversation;
    
    if (!conversation) {
      conversation = await createNewConversation();
      if (!conversation) return;
    }

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    try {
      // Add user message to database
      const { error: userError } = await supabase
        .from('ai_messages')
        .insert({
          conversation_id: conversation.id,
          role: 'user',
          content: userMessage
        });

      if (userError) throw userError;

      // Add user message to UI immediately
      const newUserMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: userMessage,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, newUserMessage]);

      // Call AI function
      const { data: aiResponse, error: aiError } = await supabase.functions.invoke('corporate-ai-chat', {
        body: { 
          message: userMessage,
          conversationId: conversation.id
        }
      });

      if (aiError) throw aiError;

      // Add AI response to database
      const { error: aiMessageError } = await supabase
        .from('ai_messages')
        .insert({
          conversation_id: conversation.id,
          role: 'assistant',
          content: aiResponse.response
        });

      if (aiMessageError) throw aiMessageError;

      // Add AI message to UI
      const newAiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse.response,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, newAiMessage]);

      // Update conversation title if it's the first message
      if (messages.length === 0 && conversation.title === 'Nova conversa') {
        const title = userMessage.length > 50 ? userMessage.substring(0, 50) + '...' : userMessage;
        await supabase
          .from('ai_conversations')
          .update({ title })
          .eq('id', conversation.id);
        
        setCurrentConversation(prev => prev ? { ...prev, title } : null);
        loadConversations();
      }

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar mensagem",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteConversation = async (conversationId: string) => {
    try {
      const { error } = await supabase
        .from('ai_conversations')
        .delete()
        .eq('id', conversationId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Conversa excluída com sucesso"
      });

      if (currentConversation?.id === conversationId) {
        setCurrentConversation(null);
        setMessages([]);
      }

      loadConversations();
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir conversa",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Brain className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">IA Corporativa</h1>
            <p className="text-muted-foreground">
              Assistente inteligente com acesso à base de conhecimento da empresa
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-240px)]">
        {/* Sidebar com conversas */}
        <Card className="lg:col-span-1 flex flex-col border-2">
          <div className="p-4 border-b bg-muted/30">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary" />
                <h2 className="font-semibold">Conversas</h2>
              </div>
              <Badge variant="secondary" className="text-xs">
                {conversations.length}
              </Badge>
            </div>
            <Button 
              onClick={createNewConversation} 
              className="w-full"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Conversa
            </Button>
          </div>
          
          <ScrollArea className="flex-1">
            {loadingConversations ? (
              <div className="p-4 text-center">
                <div className="animate-pulse space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 bg-muted rounded-lg" />
                  ))}
                </div>
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-6 text-center">
                <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-sm text-muted-foreground">
                  Nenhuma conversa ainda
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={cn(
                      "p-3 rounded-lg cursor-pointer transition-all duration-200 group relative",
                      "hover:bg-muted hover:shadow-sm",
                      currentConversation?.id === conversation.id && "bg-primary/10 border border-primary/20"
                    )}
                    onClick={() => selectConversation(conversation)}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate mb-1">
                          {conversation.title || 'Nova conversa'}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {new Date(conversation.updated_at).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 h-7 w-7 p-0 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteConversation(conversation.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </Card>

        {/* Chat principal */}
        <Card className="lg:col-span-3 flex flex-col border-2">
          {/* Header do chat */}
          <div className="p-4 border-b bg-gradient-to-r from-primary/5 to-primary/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border-2 border-primary/20">
                  <AvatarFallback className="bg-primary/10">
                    <Bot className="h-5 w-5 text-primary" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold flex items-center gap-2">
                    Assistente IA
                    <Sparkles className="h-4 w-4 text-primary" />
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Online • Respondendo com base na documentação
                  </p>
                </div>
              </div>
              {currentConversation && (
                <Badge variant="outline" className="text-xs">
                  {messages.length} mensagens
                </Badge>
              )}
            </div>
          </div>

          {/* Área de mensagens */}
          <ScrollArea className="flex-1 p-6">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-md">
                  <div className="mb-6 relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-24 w-24 bg-primary/5 rounded-full animate-pulse" />
                    </div>
                    <Bot className="h-20 w-20 text-primary mx-auto relative z-10" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3">
                    Olá! Como posso ajudar?
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Tenho acesso a toda a base de conhecimento da empresa e posso responder 
                    suas dúvidas sobre políticas, procedimentos, produtos e muito mais.
                  </p>
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    <div className="p-3 bg-muted/50 rounded-lg text-left">
                      <p className="font-medium mb-1">💡 Dica</p>
                      <p className="text-muted-foreground text-xs">
                        Faça perguntas específicas para obter respostas mais precisas
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((message, index) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500",
                      message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                    )}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className={message.role === 'user' ? 'bg-primary/10' : 'bg-muted'}>
                        {message.role === 'user' ? (
                          <User className="h-4 w-4" />
                        ) : (
                          <Bot className="h-4 w-4" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={cn(
                        "flex-1 max-w-[85%] rounded-2xl p-4 shadow-sm",
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground ml-auto rounded-br-sm'
                          : 'bg-muted rounded-bl-sm'
                      )}
                    >
                      <div className="text-sm leading-relaxed whitespace-pre-wrap">
                        {message.content}
                      </div>
                      <div className={cn(
                        "text-xs mt-2 opacity-70",
                        message.role === 'user' ? 'text-right' : 'text-left'
                      )}>
                        {new Date(message.created_at).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-4">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-muted">
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-muted rounded-2xl rounded-bl-sm p-4">
                      <div className="flex gap-1.5">
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* Input de mensagem */}
          <div className="border-t p-4 bg-muted/20">
            <div className="flex gap-3">
              <Input
                placeholder="Digite sua pergunta aqui..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !isLoading && sendMessage()}
                disabled={isLoading}
                className="flex-1 h-11 bg-background"
              />
              <Button 
                onClick={sendMessage} 
                disabled={isLoading || !inputMessage.trim()}
                size="lg"
                className="px-6"
              >
                {isLoading ? (
                  <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" />
              Respostas baseadas na base de conhecimento corporativa
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default CorporateAI;
