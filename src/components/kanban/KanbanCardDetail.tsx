import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { User, Clock, Trash2, Edit2, Send, MapPin, Link as LinkIcon } from 'lucide-react';
import type { KanbanCard } from '@/hooks/useKanban';

interface Comment {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

interface KanbanCardDetailProps {
  card: KanbanCard | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (cardId: string, updates: Partial<KanbanCard>) => void;
  onDelete: (cardId: string) => void;
}

export function KanbanCardDetail({ card, open, onClose, onUpdate, onDelete }: KanbanCardDetailProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (card && open) {
      loadComments();
      subscribeToComments();
    }
  }, [card?.id, open]);

  const loadComments = async () => {
    if (!card) return;

    const { data, error } = await supabase
      .from('kanban_comments' as any)
      .select('*')
      .eq('card_id', card.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading comments:', error);
      return;
    }

    setComments((data as any) || []);
  };

  const subscribeToComments = () => {
    if (!card) return;

    const channel = supabase
      .channel(`kanban-card-${card.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kanban_comments',
          filter: `card_id=eq.${card.id}`,
        },
        () => {
          loadComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleAddComment = async () => {
    if (!card || !newComment.trim()) return;

    setLoading(true);
    const { error } = await supabase
      .from('kanban_comments' as any)
      .insert({
        card_id: card.id,
        content: newComment,
        user_id: (await supabase.auth.getUser()).data.user?.id,
      });

    if (error) {
      toast({
        title: 'Erro ao adicionar comentário',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setNewComment('');
      toast({
        title: 'Comentário adicionado',
      });
    }
    setLoading(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    const { error } = await supabase
      .from('kanban_comments' as any)
      .delete()
      .eq('id', commentId);

    if (error) {
      toast({
        title: 'Erro ao excluir comentário',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const priorityColors = {
    low: 'bg-blue-500',
    medium: 'bg-yellow-500',
    high: 'bg-orange-500',
    urgent: 'bg-red-500',
  };

  // Helper to detect and format URL-like values
  const isLikelyUrl = (val?: string | null) => {
    if (!val) return false;
    const v = val.trim();
    return /^https?:\/\//i.test(v) || /^www\./i.test(v) || /^[a-z0-9.-]+\.[a-z]{2,}/i.test(v);
  };

  const formatUrl = (v: string) => (/^https?:\/\//i.test(v) ? v : `https://${v.trim()}`);
  
  if (!card) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl">{card.title}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[70vh]">
          <div className="space-y-6 pr-4">
            {/* Card Info */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold mb-2">Descrição</h3>
                <p className="text-sm text-muted-foreground">
                  {card.description || 'Sem descrição'}
                </p>
              </div>

              {/* School Information */}
              {(card.municipio || card.address || card.localizacao_url || card.links_texto || card.data_instalacao || card.periodo || card.provedor_local || card.telefone) && (
                <div className="space-y-3 bg-muted/30 p-4 rounded-lg">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-1">
                    📋 Informações da Escola
                  </h3>
                  
                  {card.municipio && (
                    <div>
                      <h4 className="text-xs font-semibold mb-1 text-muted-foreground">Município</h4>
                      <p className="text-sm">{card.municipio}</p>
                    </div>
                  )}

                  {card.address && (
                    <div>
                      <h4 className="text-xs font-semibold mb-1 text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        Endereço
                      </h4>
                      <p className="text-sm">{card.address}</p>
                    </div>
                  )}

                  {card.localizacao_url && (
                    <div>
                      <h4 className="text-xs font-semibold mb-1 text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        Localização
                      </h4>
                      <a 
                        href={card.localizacao_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                      >
                        Ver no Google Maps <LinkIcon className="h-3 w-3" />
                      </a>
                    </div>
                  )}

                  {card.links_texto && (
                    <div>
                      <h4 className="text-xs font-semibold mb-1 text-muted-foreground flex items-center gap-1">
                        <LinkIcon className="h-3 w-3" />
                        Links
                      </h4>
                      <p className="text-sm">{card.links_texto}</p>
                    </div>
                  )}

                  {card.data_instalacao && (
                    <div>
                      <h4 className="text-xs font-semibold mb-1 text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Data de Instalação
                      </h4>
                      <p className="text-sm">
                        {new Date(card.data_instalacao).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  )}

                  {card.periodo && (
                    <div>
                      <h4 className="text-xs font-semibold mb-1 text-muted-foreground">Período</h4>
                      <p className="text-sm">{card.periodo}</p>
                    </div>
                  )}

                  {card.provedor_local && (
                    <div>
                      <h4 className="text-xs font-semibold mb-1 text-muted-foreground">Provedor Local</h4>
                      <p className="text-sm">{card.provedor_local}</p>
                    </div>
                  )}

                  {card.telefone && (
                    <div>
                      <h4 className="text-xs font-semibold mb-1 text-muted-foreground">Telefone</h4>
                      <p className="text-sm">{card.telefone}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-4">
                <div>
                  <h3 className="text-sm font-semibold mb-2">Prioridade</h3>
                  <Select 
                    value={card.priority} 
                    onValueChange={(value: any) => onUpdate(card.id, { priority: value })}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">🔵 Baixa</SelectItem>
                      <SelectItem value="medium">🟡 Média</SelectItem>
                      <SelectItem value="high">🟠 Alta</SelectItem>
                      <SelectItem value="urgent">🔴 Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-2">Criado em</h3>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {new Date(card.created_at).toLocaleDateString('pt-BR')}
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Comments Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Comentários</h3>

              <div className="space-y-3">
                {comments.map((comment) => (
                  <div key={comment.id} className="bg-muted p-3 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            <User className="h-3 w-3" />
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground">
                          {new Date(comment.created_at).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteComment(comment.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-sm">{comment.content}</p>
                  </div>
                ))}

                {comments.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum comentário ainda
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Textarea
                  placeholder="Adicionar comentário..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                />
                <Button
                  onClick={handleAddComment}
                  disabled={loading || !newComment.trim()}
                  size="sm"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Separator />

            {/* Actions */}
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => onDelete(card.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir Card
              </Button>
              <Button
                variant="outline"
                onClick={onClose}
              >
                Fechar
              </Button>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
