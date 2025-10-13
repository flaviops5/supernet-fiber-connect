import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Clock, User, Tag, ArrowRight, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Conversation {
  id: string;
  customer_name: string;
  customer_phone: string;
  channel: string;
  department: string;
  status: string;
  tags: string[];
  created_at: string;
  resolved_at: string;
  metadata: any;
}

interface Props {
  onSelectConversation: (id: string) => void;
}

export default function ConversationHistory({ onSelectConversation }: Props) {
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingSummary, setGeneratingSummary] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
    
    // Realtime subscription
    const channel = supabase
      .channel('history-conversations')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
          filter: 'status=eq.resolved'
        },
        () => {
          loadHistory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('status', 'resolved')
      .order('resolved_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Erro ao carregar histórico:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o histórico.',
        variant: 'destructive'
      });
    } else {
      setConversations(data || []);
    }
    setLoading(false);
  };

  const generateSummary = async (conversationId: string) => {
    setGeneratingSummary(conversationId);
    
    try {
      const { data, error } = await supabase.functions.invoke('summarize-conversation', {
        body: { conversationId }
      });

      if (error) throw error;

      toast({
        title: 'Resumo gerado!',
        description: 'O resumo foi criado com sucesso.',
      });

      // Recarregar para pegar o resumo atualizado
      loadHistory();
    } catch (error) {
      console.error('Erro ao gerar resumo:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível gerar o resumo.',
        variant: 'destructive'
      });
    } finally {
      setGeneratingSummary(null);
    }
  };

  const getChannelBadge = (channel: string) => {
    const colors = {
      whatsapp: 'bg-green-500/10 text-green-700 dark:text-green-400',
      email: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
      phone: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
      web: 'bg-orange-500/10 text-orange-700 dark:text-orange-400'
    };
    return colors[channel as keyof typeof colors] || 'bg-gray-500/10';
  };

  if (loading) {
    return (
      <Card className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Histórico de Conversas
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-3">
            {conversations.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">Nenhuma conversa finalizada</p>
                <p className="text-sm">As conversas resolvidas aparecerão aqui</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <Card 
                  key={conv.id}
                  className="p-4 hover:shadow-md transition-all cursor-pointer border-2 border-border/50 hover:border-primary/30"
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold text-sm">{conv.customer_name}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{conv.customer_phone}</p>
                      </div>
                      <Badge className={getChannelBadge(conv.channel)}>
                        {conv.channel}
                      </Badge>
                    </div>

                    {/* Tags */}
                    {conv.tags && conv.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {conv.tags.map((tag, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            <Tag className="h-3 w-3 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* AI Summary */}
                    {conv.metadata?.ai_summary ? (
                      <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="h-4 w-4 text-purple-600" />
                          <span className="text-xs font-semibold text-purple-700 dark:text-purple-400">
                            Resumo IA
                          </span>
                        </div>
                        <div 
                          className="text-xs text-foreground/80 whitespace-pre-wrap line-clamp-4"
                          onClick={() => onSelectConversation(conv.id)}
                        >
                          {conv.metadata.ai_summary}
                        </div>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full gap-2"
                        onClick={() => generateSummary(conv.id)}
                        disabled={generatingSummary === conv.id}
                      >
                        {generatingSummary === conv.id ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Gerando resumo...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4" />
                            Gerar Resumo IA
                          </>
                        )}
                      </Button>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(conv.resolved_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onSelectConversation(conv.id)}
                        className="gap-1"
                      >
                        Ver conversa
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}