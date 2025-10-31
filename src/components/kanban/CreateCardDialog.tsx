import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { KanbanColumn } from '@/hooks/useKanban';

interface CreateCardDialogProps {
  open: boolean;
  onClose: () => void;
  columns: KanbanColumn[];
  onCreateCard: (columnId: string, title: string, description?: string) => Promise<void>;
}

export function CreateCardDialog({ open, onClose, columns, onCreateCard }: CreateCardDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [columnId, setColumnId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !columnId) return;

    setLoading(true);
    try {
      await onCreateCard(columnId, title.trim(), description.trim() || undefined);
      setTitle('');
      setDescription('');
      setColumnId('');
      onClose();
    } catch (error) {
      // Error handled by useKanban
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Card</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="card-title">Título</Label>
            <Input
              id="card-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Implementar nova funcionalidade"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="card-description">Descrição</Label>
            <Textarea
              id="card-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva os detalhes do card..."
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="card-column">Coluna</Label>
            <Select value={columnId} onValueChange={setColumnId} required>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma coluna" />
              </SelectTrigger>
              <SelectContent>
                {columns.map((column) => (
                  <SelectItem key={column.id} value={column.id}>
                    {column.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !title.trim() || !columnId}>
              {loading ? 'Criando...' : 'Criar Card'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
