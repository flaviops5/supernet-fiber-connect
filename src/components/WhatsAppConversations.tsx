import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Search, User, Clock, Phone, Mail, Send, Filter, X } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import 'react-chat-elements/dist/main.css';

interface Message {
  id: string;
  content: string;
  sender_type: string;
  sender_name: string;
  created_at: string;
  ai_suggestion: boolean;
}

interface Conversation {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  customer_cpf?: string;
  channel: string;
  status: string;
  department?: string;
  priority: number;
  created_at: string;
  last_message_at?: string;
  metadata?: unknown;
}

export default function WhatsAppConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadConversations();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('whatsapp-conversations')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversations'
      }, () => {
        loadConversations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!selectedConversation?.id) return;
    
    const conversationId = selectedConversation.id;
    loadMessages(conversationId);
    
    // Subscribe to messages for selected conversation
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'conversation_messages',
        filter: `conversation_id=eq.${conversationId}`
      }, () => {
        loadMessages(conversationId);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation?.id]); // Apenas o ID nas dependências

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('channel', 'whatsapp')
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast.error('Erro ao carregar conversas');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('conversation_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Erro ao carregar mensagens');
    }
  };

  const sendReply = async () => {
    if (!selectedConversation || !replyText.trim()) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('conversation_messages')
        .insert({
          conversation_id: selectedConversation.id,
          sender_type: 'agent',
          sender_name: 'Atendente',
          content: replyText.trim(),
          ai_suggestion: false
        });

      if (error) throw error;

      setReplyText("");
      toast.success('Mensagem enviada!');
      
      // Focus back on textarea
      textareaRef.current?.focus();
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error('Erro ao enviar mensagem');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendReply();
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      waiting: { variant: "secondary", label: "Aguardando" },
      active: { variant: "default", label: "Ativa" },
      resolved: { variant: "outline", label: "Resolvida" },
      closed: { variant: "destructive", label: "Fechada" }
    };
    const config = variants[status] || variants.waiting;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = conv.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.customer_phone?.includes(searchTerm) ||
      conv.customer_cpf?.includes(searchTerm);
    
    const matchesStatus = statusFilter === "all" || conv.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getUnreadCount = (status: string) => {
    if (status === "all") return conversations.length;
    return conversations.filter(c => c.status === status).length;
  };

  if (loading) {
    return <div className="p-6">Carregando conversas...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Conversas WhatsApp</h1>
        <p className="text-muted-foreground">Gerencie todas as conversas via WhatsApp</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Lista de conversas */}
        <Card className="md:col-span-1">
          <CardHeader className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Conversas</CardTitle>
                <CardDescription>
                  {filteredConversations.length} conversa(s)
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchTerm("")}
                className={searchTerm ? "visible" : "invisible"}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, telefone ou CPF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all" className="text-xs">
                  Todas
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {getUnreadCount("all")}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="waiting" className="text-xs">
                  Aguardando
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {getUnreadCount("waiting")}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="active" className="text-xs">
                  Ativas
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {getUnreadCount("active")}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="resolved" className="text-xs">
                  Resolvidas
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="mx-auto h-12 w-12 mb-2 opacity-50" />
                <p>Nenhuma conversa encontrada</p>
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <Button
                  key={conv.id}
                  variant={selectedConversation?.id === conv.id ? "secondary" : "ghost"}
                  className="w-full justify-start text-left h-auto py-3"
                  onClick={() => setSelectedConversation(conv)}
                >
                  <div className="flex flex-col w-full gap-1">
                    <div className="flex items-center justify-between w-full">
                      <span className="font-semibold truncate">{conv.customer_name}</span>
                      {getStatusBadge(conv.status)}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {conv.customer_phone}
                    </div>
                    {conv.last_message_at && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(conv.last_message_at), {
                          addSuffix: true,
                          locale: ptBR
                        })}
                      </div>
                    )}
                  </div>
                </Button>
              ))
            )}
          </CardContent>
        </Card>

        {/* Detalhes da conversa */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">
              {selectedConversation ? "Detalhes da Conversa" : "Selecione uma conversa"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedConversation ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="mx-auto h-16 w-16 mb-4 opacity-50" />
                <p>Selecione uma conversa para ver os detalhes</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Informações do cliente */}
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span className="font-semibold">Informações do Cliente</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Nome:</span>
                      <p className="font-medium">{selectedConversation.customer_name}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <div className="mt-1">{getStatusBadge(selectedConversation.status)}</div>
                    </div>
                    {selectedConversation.customer_phone && (
                      <div>
                        <span className="text-muted-foreground">Telefone:</span>
                        <p className="font-medium">{selectedConversation.customer_phone}</p>
                      </div>
                    )}
                    {selectedConversation.customer_email && (
                      <div>
                        <span className="text-muted-foreground">Email:</span>
                        <p className="font-medium">{selectedConversation.customer_email}</p>
                      </div>
                    )}
                    {selectedConversation.customer_cpf && (
                      <div>
                        <span className="text-muted-foreground">CPF:</span>
                        <p className="font-medium">{selectedConversation.customer_cpf}</p>
                      </div>
                    )}
                    {selectedConversation.department && (
                      <div>
                        <span className="text-muted-foreground">Departamento:</span>
                        <p className="font-medium capitalize">{selectedConversation.department}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Mensagens */}
                <div className="space-y-3 flex flex-col h-[calc(100vh-450px)]">
                  <h3 className="font-semibold">Chat</h3>
                  
                  {/* Messages Area */}
                  <div className="flex-1 overflow-y-auto p-4 border rounded-lg bg-muted/30 space-y-3">
                    {messages.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <MessageSquare className="mx-auto h-12 w-12 mb-2 opacity-50" />
                        <p>Nenhuma mensagem ainda</p>
                        <p className="text-sm mt-1">Seja o primeiro a responder!</p>
                      </div>
                    ) : (
                      <>
                        {messages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex ${msg.sender_type === 'customer' ? 'justify-start' : 'justify-end'} animate-in slide-in-from-bottom-2`}
                          >
                            <div
                              className={`max-w-[75%] p-3 rounded-2xl shadow-sm ${
                                msg.sender_type === 'customer'
                                  ? 'bg-background border'
                                  : msg.ai_suggestion
                                  ? 'bg-blue-100 dark:bg-blue-950 border border-blue-200 dark:border-blue-900'
                                  : 'bg-primary text-primary-foreground'
                              }`}
                            >
                              <div className="text-xs font-semibold mb-1 flex items-center gap-2">
                                <User className="h-3 w-3" />
                                {msg.sender_name}
                                {msg.ai_suggestion && (
                                  <Badge variant="outline" className="text-xs py-0 px-1">AI</Badge>
                                )}
                              </div>
                              <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                              <p className="text-xs opacity-70 mt-2 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDistanceToNow(new Date(msg.created_at), {
                                  addSuffix: true,
                                  locale: ptBR
                                })}
                              </p>
                            </div>
                          </div>
                        ))}
                        <div ref={messagesEndRef} />
                      </>
                    )}
                  </div>

                  {/* Reply Input */}
                  <div className="flex gap-2 items-end">
                    <Textarea
                      ref={textareaRef}
                      placeholder="Digite sua mensagem... (Enter para enviar, Shift+Enter para nova linha)"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="min-h-[60px] max-h-[120px] resize-none"
                      disabled={sending}
                    />
                    <Button
                      onClick={sendReply}
                      disabled={!replyText.trim() || sending}
                      size="icon"
                      className="h-[60px] w-[60px]"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
