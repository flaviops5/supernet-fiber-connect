import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CreateBoardDialogProps {
  open: boolean;
  onClose: () => void;
  onBoardCreated: (boardId: string) => void;
}

export function CreateBoardDialog({ open, onClose, onBoardCreated }: CreateBoardDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: newBoard, error } = await supabase
        .from('kanban_boards' as any)
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Board criado',
        description: 'Board criado com sucesso',
      });

      setTitle('');
      setDescription('');
      onClose();
      onBoardCreated((newBoard as any).id);
    } catch (error: unknown) {
      console.error('Error creating board:', error);
      toast({
        title: 'Erro ao criar board',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar Novo Board</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="board-title">Título do Board</Label>
            <Input
              id="board-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Projeto Web, Sprint 2024"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="board-description">Descrição (opcional)</Label>
            <Textarea
              id="board-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o propósito deste board..."
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !title.trim()}>
              {loading ? 'Criando...' : 'Criar Board'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
