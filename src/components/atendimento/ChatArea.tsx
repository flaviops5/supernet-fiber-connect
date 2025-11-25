import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Send, Paperclip, Bot, User, Phone, ArrowLeftRight, X, FileCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MediaUpload } from '@/components/MediaUpload';
import TagManager from './TagManager';
import MessageShortcuts from './MessageShortcuts';
import AISuggestion from './AISuggestion';
import TextReview from './TextReview';
import RebootLoader from './RebootLoader';
import { MediaGuidedMessage } from './MediaGuidedMessage';
import { MediaContext } from '@/lib/media-helper';

interface Message {
  id: string;
  sender_type: string;
  sender_name: string;
  content: string;
  ai_suggestion: boolean;
  created_at: string;
  media_context?: MediaContext | string | null; // PR #14 - Contexto de mídia guiada
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
  const [showTextReview, setShowTextReview] = useState(false);
const messagesEndRef = useRef<HTMLDivElement>(null);

  // Detect reboot-in-progress based on agent messages (Luan)
  const lastAgentTrigger = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (
        m.sender_type === 'agent' &&
        /(reinici|reinício remoto|reboot)/i.test(m.content)
      ) {
        return m;
      }
    }
    return undefined;
  }, [messages]);

  const hasCompletionAfterTrigger = useMemo(() => {
    if (!lastAgentTrigger) return false;
    const idx = messages.findIndex((m) => m.id === lastAgentTrigger.id);
    if (idx === -1) return false;
    return messages.slice(idx + 1).some((m) =>
      m.sender_type === 'agent' &&
      /(ONLINE|ainda está offline|Reboot executado|religado)/i.test(m.content)
    );
  }, [messages, lastAgentTrigger]);

  const rebootInProgress = !!lastAgentTrigger && !hasCompletionAfterTrigger;
  const rebootStartedAt = lastAgentTrigger ? Date.parse(lastAgentTrigger.created_at) : undefined;

  const loadConversationTags = useCallback(async () => {
    if (!conversationId) return;

    const { data } = await supabase
      .from('conversations')
      .select('tags')
      .eq('id', conversationId)
      .single();

    if (data?.tags) {
      setConversationTags(data.tags);
    }
  }, [conversationId]);

  const loadMessages = useCallback(async () => {
    if (!conversationId) return;

    console.log('📥 Carregando mensagens para conversa:', conversationId);
    const { data, error } = await supabase
      .from('conversation_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Erro ao carregar mensagens:', error);
      return;
    }

    console.log('✅ Mensagens carregadas:', data?.length || 0);
    setMessages(data || []);
  }, [conversationId]);

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
          console.log('🔔 Nova mensagem recebida via realtime:', payload.new);
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe((status) => {
        console.log('📡 Status da subscrição:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime conectado para conversa:', conversationId);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, loadMessages, loadConversationTags]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
      <CardHeader className="pb-3">
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
        <Separator className="mt-3" />
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => {
          // PR #6 - Se mensagem tem contexto de mídia, usar MediaGuidedMessage
          if (message.media_context && message.sender_type === 'ai') {
            return (
              <div key={message.id} className="flex justify-start">
                <div className="max-w-[80%]">
                  <MediaGuidedMessage
                    mediaAsset={{
                      type: 'image', // Será determinado pelo helper
                      url: '', // Será determinado pelo helper
                      fallbackText: message.content
                    }}
                    text={message.content}
                    conversationId={conversationId || ''}
                    agentName={message.sender_name}
                    mediaContext={message.media_context as MediaContext}
                    showFeedback={true}
                  />
                </div>
              </div>
            );
          }
          
          // Mensagem normal sem mídia guiada
          return (
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
          );
        })}
{rebootInProgress && (
          <RebootLoader totalSeconds={60} startedAt={rebootStartedAt} />
        )}
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
          {showTextReview && newMessage.trim() && (
            <TextReview
              originalText={newMessage}
              onAccept={(reviewedText) => {
                setNewMessage(reviewedText);
                setShowTextReview(false);
              }}
              onClose={() => setShowTextReview(false)}
            />
          )}
          
          <div className="flex items-center gap-2">
            <AISuggestion 
              conversationId={conversationId}
              onAccept={(suggestion) => setNewMessage(suggestion)}
            />
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
            {newMessage.trim() && !showTextReview && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowTextReview(true)}
                disabled={loading}
                className="gap-2"
              >
                <FileCheck className="h-4 w-4 text-[hsl(var(--orange))]" />
                Revisar texto
              </Button>
            )}
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
