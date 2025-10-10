import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { X, Plus, Tag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface Props {
  conversationId: string;
  currentTags: string[];
  onTagsUpdated: () => void;
}

const SUGGESTED_TAGS = [
  'Urgente',
  'Reclamação',
  'Elogio',
  'Sugestão',
  'Técnico',
  'Financeiro',
  'Comercial',
  'Cancelamento',
  'Mudança de Plano',
  'Instalação'
];

export default function TagManager({ conversationId, currentTags, onTagsUpdated }: Props) {
  const { toast } = useToast();
  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(false);

  const addTag = async (tag: string) => {
    if (!tag.trim() || currentTags.includes(tag)) return;

    setLoading(true);
    try {
      const updatedTags = [...currentTags, tag.trim()];
      
      const { error } = await supabase
        .from('conversations')
        .update({ tags: updatedTags })
        .eq('id', conversationId);

      if (error) throw error;

      toast({
        title: 'Tag adicionada',
        description: `Tag "${tag}" adicionada com sucesso.`
      });
      
      setNewTag('');
      onTagsUpdated();
    } catch (error) {
      console.error('Error adding tag:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível adicionar a tag.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const removeTag = async (tag: string) => {
    setLoading(true);
    try {
      const updatedTags = currentTags.filter(t => t !== tag);
      
      const { error } = await supabase
        .from('conversations')
        .update({ tags: updatedTags })
        .eq('id', conversationId);

      if (error) throw error;

      toast({
        title: 'Tag removida',
        description: `Tag "${tag}" removida com sucesso.`
      });
      
      onTagsUpdated();
    } catch (error) {
      console.error('Error removing tag:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover a tag.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" disabled={loading}>
          <Tag className="h-4 w-4 mr-1" />
          Tags ({currentTags.length})
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2 text-sm">Tags Atuais</h4>
            <div className="flex flex-wrap gap-1">
              {currentTags.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhuma tag adicionada</p>
              ) : (
                currentTags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:text-destructive"
                      disabled={loading}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))
              )}
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2 text-sm">Adicionar Tag</h4>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    addTag(newTag);
                  }
                }}
                placeholder="Digite uma tag..."
                className="h-8 text-sm"
                disabled={loading}
              />
              <Button 
                size="sm" 
                onClick={() => addTag(newTag)}
                disabled={loading || !newTag.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2 text-sm">Tags Sugeridas</h4>
            <div className="flex flex-wrap gap-1">
              {SUGGESTED_TAGS.filter(tag => !currentTags.includes(tag)).map((tag) => (
                <Button
                  key={tag}
                  size="sm"
                  variant="outline"
                  className="h-6 text-xs"
                  onClick={() => addTag(tag)}
                  disabled={loading}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {tag}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
