import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CreateColumnDialogProps {
  open: boolean;
  onClose: () => void;
  boardId: string;
}

export function CreateColumnDialog({ open, onClose, boardId }: CreateColumnDialogProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('kanban_columns' as any)
        .insert({
          board_id: boardId,
          name: name.trim(),
          color,
          position: 0,
        });

      if (error) throw error;

      toast({
        title: 'Coluna criada',
        description: 'Coluna criada com sucesso',
      });

      setName('');
      setColor('#3b82f6');
      onClose();
      
      // Force page reload to show the new column
      window.location.reload();
    } catch (error: any) {
      toast({
        title: 'Erro ao criar coluna',
        description: error.message,
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
          <DialogTitle>Nova Coluna</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="column-name">Nome da Coluna</Label>
            <Input
              id="column-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: A fazer, Em progresso, Concluído"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="column-color">Cor</Label>
            <div className="flex gap-2">
              <Input
                id="column-color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-20 h-10"
              />
              <Input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="#3b82f6"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? 'Criando...' : 'Criar Coluna'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
