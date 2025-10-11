import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Send, Paperclip, Bot, User, Phone, ArrowLeftRight, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MediaUpload } from '@/components/MediaUpload';
import TagManager from './TagManager';
import MessageShortcuts from './MessageShortcuts';
import AISuggestion from './AISuggestion';

interface Message {
  id: string;
  sender_type: string;
  sender_name: string;
  content: string;
  ai_suggestion: boolean;
  created_at: string;
}

interface Props {
  conversationId: string | null;
  agentDepartment: string;
}

export default function ChatArea({ conversationId, agentDepartment }: Props) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [conversationTags, setConversationTags] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadConversationTags = async () => {
    if (!conversationId) return;

    const { data } = await supabase
      .from('conversations')
      .select('tags')
      .eq('id', conversationId)
      .single();

    if (data?.tags) {
      setConversationTags(data.tags);
    }
  };

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setConversationTags([]);
      return;
    }

    loadMessages();
    loadConversationTags();

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    if (!conversationId) return;

    const { data, error } = await supabase
      .from('conversation_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      return;
    }

    setMessages(data || []);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!conversationId || (!newMessage.trim() && !attachedImage)) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('user_id', user.id)
        .single();

      const messageContent = attachedImage 
        ? `${newMessage.trim()} [Imagem anexada: ${attachedImage.substring(0, 50)}...]`
        : newMessage.trim();

      const { error } = await supabase
        .from('conversation_messages')
        .insert({
          conversation_id: conversationId,
          sender_type: 'agent',
          sender_id: user.id,
          sender_name: profile?.name || 'Agente',
          content: messageContent
        });

      if (error) throw error;

      // Update conversation status to active if waiting
      await supabase
        .from('conversations')
        .update({ 
          status: 'active',
          assigned_agent_id: user.id,
          first_response_at: new Date().toISOString()
        })
        .eq('id', conversationId)
        .eq('status', 'waiting');

      setNewMessage('');
      setAttachedImage(null);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Erro ao enviar',
        description: 'Não foi possível enviar a mensagem.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!conversationId) {
    return (
      <Card className="h-full flex items-center justify-center shadow-lg border-border/50">
        <div className="text-center text-muted-foreground">
          <Phone className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">Selecione uma conversa</p>
          <p className="text-sm">Escolha uma conversa da fila para começar</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col shadow-lg border-2 border-border bg-gradient-to-br from-muted/30 via-background to-background">
      <CardHeader className="border-b pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Chat</CardTitle>
          <div className="flex gap-2">
            {conversationId && (
              <TagManager
                conversationId={conversationId}
                currentTags={conversationTags}
                onTagsUpdated={loadConversationTags}
              />
            )}
            <Button size="sm" variant="outline">
              <ArrowLeftRight className="h-4 w-4 mr-1" />
              Transferir
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-2 ${
              message.sender_type === 'agent' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.sender_type === 'agent'
                  ? 'bg-primary text-primary-foreground'
                  : message.sender_type === 'ai'
                  ? 'bg-purple-500/10 border border-purple-500/20'
                  : 'bg-muted'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                {message.sender_type === 'ai' && <Bot className="h-3 w-3" />}
                {message.sender_type === 'customer' && <User className="h-3 w-3" />}
                <span className="text-xs font-medium">{message.sender_name}</span>
                {message.ai_suggestion && (
                  <Badge variant="secondary" className="text-xs">IA</Badge>
                )}
              </div>
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              <p className="text-xs opacity-70 mt-1">
                {format(new Date(message.created_at), 'HH:mm', { locale: ptBR })}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </CardContent>

      <div className="border-t p-4">
        {attachedImage && (
          <div className="mb-3 relative inline-block">
            <img 
              src={attachedImage} 
              alt="Imagem anexada" 
              className="max-w-xs rounded-lg border"
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
              onClick={() => setAttachedImage(null)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
        
        <div className="space-y-2">
          <AISuggestion 
            conversationId={conversationId}
            onAccept={(suggestion) => setNewMessage(suggestion)}
          />
          
          <div className="flex gap-2">
            <MessageShortcuts 
              department={agentDepartment}
              onSelectShortcut={(shortcut) => {
                let content = shortcut.message_text || '';
                if (shortcut.media) {
                  content += `\n[Mídia: ${shortcut.media.file_url}]`;
                }
                setNewMessage(prev => prev + (prev ? '\n' : '') + content);
              }}
            />
          </div>
          
          <div className="flex gap-2 items-end">
            <MediaUpload
              onAudioTranscribed={(text) => {
                setNewMessage(prev => prev + (prev ? ' ' : '') + text);
              }}
              onImageSelected={setAttachedImage}
              disabled={loading}
            />
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Digite, grave ou use /atalho..."
              className="min-h-[60px] resize-none flex-1"
              disabled={loading}
            />
            <Button
              size="icon"
              onClick={handleSendMessage}
              disabled={loading || (!newMessage.trim() && !attachedImage)}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
