import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Save, Trash2 } from 'lucide-react';
import type { KanbanCard } from '@/hooks/useKanban';

interface EditCardDialogProps {
  open: boolean;
  onClose: () => void;
  card: KanbanCard | null;
  onUpdate: () => void;
}

export function EditCardDialog({ open, onClose, card, onUpdate }: EditCardDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    municipio: '',
    address: '',
    localizacao_url: '',
    links_texto: '',
    data_instalacao: '',
    periodo: '',
    provedor_local: '',
    telefone: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
  });

  useEffect(() => {
    if (card) {
      setFormData({
        title: card.title || '',
        description: (card as any).description || '',
        municipio: (card as any).municipio || '',
        address: (card as any).address || '',
        localizacao_url: (card as any).localizacao_url || '',
        links_texto: (card as any).links_texto || '',
        data_instalacao: (card as any).data_instalacao || '',
        periodo: (card as any).periodo || '',
        provedor_local: (card as any).provedor_local || '',
        telefone: (card as any).telefone || '',
        priority: card.priority || 'medium',
      });
    }
  }, [card]);

  const handleSave = async () => {
    if (!card) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('kanban_cards' as any)
        .update({
          title: formData.title,
          description: formData.description || null,
          municipio: formData.municipio || null,
          address: formData.address || null,
          localizacao_url: formData.localizacao_url || null,
          links_texto: formData.links_texto || null,
          data_instalacao: formData.data_instalacao || null,
          periodo: formData.periodo || null,
          provedor_local: formData.provedor_local || null,
          telefone: formData.telefone || null,
          priority: formData.priority,
        })
        .eq('id', card.id);

      if (error) throw error;

      toast({
        title: 'Card atualizado',
        description: 'As alterações foram salvas com sucesso!',
      });

      // Log audit event (non-blocking)
      try {
        await supabase.functions.invoke('kanban-audit', {
          body: {
            board_id: card.board_id,
            action: 'card_updated',
            metadata: { card_id: card.id },
          },
        });
      } catch (auditErr) {
        console.warn('kanban-audit failed:', auditErr);
      }

      onUpdate();
      onClose();
    } catch (error: any) {
      console.error('Error updating card:', error);
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!card || !confirm('Tem certeza que deseja excluir este card?')) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('kanban_cards' as any)
        .delete()
        .eq('id', card.id);

      if (error) throw error;

      toast({
        title: 'Card excluído',
        description: 'O card foi removido com sucesso!',
      });

      // Log audit event (non-blocking)
      try {
        await supabase.functions.invoke('kanban-audit', {
          body: {
            board_id: card.board_id,
            action: 'card_deleted',
            metadata: { card_id: card.id },
          },
        });
      } catch (auditErr) {
        console.warn('kanban-audit failed:', auditErr);
      }

      onUpdate();
      onClose();
    } catch (error: any) {
      console.error('Error deleting card:', error);
      toast({
        title: 'Erro ao excluir',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!card) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Card</DialogTitle>
          <DialogDescription>
            Preencha os campos adicionais conforme necessário.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="municipio">Município *</Label>
            <Input
              id="municipio"
              value={formData.municipio}
              onChange={(e) => setFormData({ ...formData, municipio: e.target.value })}
              placeholder="Nome do município"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="title">Nome da Escola</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Nome da escola"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="address">Endereço</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Endereço completo"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="localizacao_url">Localização (URL)</Label>
            <Input
              id="localizacao_url"
              value={formData.localizacao_url}
              onChange={(e) => setFormData({ ...formData, localizacao_url: e.target.value })}
              placeholder="https://maps.google.com/..."
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="links_texto">Links</Label>
            <Textarea
              id="links_texto"
              value={formData.links_texto}
              onChange={(e) => setFormData({ ...formData, links_texto: e.target.value })}
              placeholder="Links adicionais ou observações"
              rows={2}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descrição detalhada"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="data_instalacao">Data de Instalação</Label>
              <Input
                id="data_instalacao"
                type="date"
                value={formData.data_instalacao}
                onChange={(e) => setFormData({ ...formData, data_instalacao: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="periodo">Período</Label>
              <Input
                id="periodo"
                value={formData.periodo}
                onChange={(e) => setFormData({ ...formData, periodo: e.target.value })}
                placeholder="Ex: Manhã, Tarde"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="provedor_local">Provedor Local</Label>
              <Input
                id="provedor_local"
                value={formData.provedor_local}
                onChange={(e) => setFormData({ ...formData, provedor_local: e.target.value })}
                placeholder="Nome do provedor"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                placeholder="(00) 0000-0000"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="priority">Prioridade</Label>
            <Select value={formData.priority} onValueChange={(value: any) => setFormData({ ...formData, priority: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir
          </Button>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading || !formData.municipio}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
