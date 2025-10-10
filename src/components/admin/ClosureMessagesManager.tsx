import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Edit } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface ClosureMessage {
  id: string;
  title: string;
  message: string;
  display_order: number;
}

export default function ClosureMessagesManager() {
  const [messages, setMessages] = useState<ClosureMessage[]>([]);
  const [editingMessage, setEditingMessage] = useState<ClosureMessage | null>(null);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    const { data } = await supabase
      .from('closure_messages')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    if (data) {
      setMessages(data);
    }
  };

  const handleSave = async (formData: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (editingMessage) {
        await supabase
          .from('closure_messages')
          .update(formData)
          .eq('id', editingMessage.id);
      } else {
        await supabase
          .from('closure_messages')
          .insert({
            ...formData,
            created_by: user?.id
          });
      }

      toast({
        title: 'Mensagem salva',
        description: 'Mensagem de encerramento salva com sucesso.',
      });

      setOpen(false);
      setEditingMessage(null);
      loadMessages();
    } catch (error) {
      console.error('Error saving message:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar a mensagem.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await supabase
        .from('closure_messages')
        .update({ is_active: false })
        .eq('id', id);

      toast({
        title: 'Mensagem removida',
        description: 'Mensagem removida com sucesso.',
      });

      loadMessages();
    } catch (error) {
      console.error('Error deleting message:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover a mensagem.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Mensagens de Encerramento</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => setEditingMessage(null)}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Mensagem
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingMessage ? 'Editar Mensagem' : 'Nova Mensagem'}
                </DialogTitle>
              </DialogHeader>
              <MessageForm 
                message={editingMessage} 
                onSave={handleSave}
                onCancel={() => setOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          <div className="space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className="border rounded-lg p-3">
                <div className="flex items-start justify-between mb-2">
                  <p className="font-medium">{msg.title}</p>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingMessage(msg);
                        setOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(msg.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{msg.message}</p>
              </div>
            ))}

            {messages.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                Nenhuma mensagem cadastrada
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function MessageForm({ message, onSave, onCancel }: any) {
  const [formData, setFormData] = useState({
    title: message?.title || '',
    message: message?.message || '',
    display_order: message?.display_order || 0,
  });

  return (
    <div className="space-y-4">
      <div>
        <Label>Título</Label>
        <Input
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Ex: Falta de resposta"
        />
      </div>

      <div>
        <Label>Mensagem</Label>
        <Textarea
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          placeholder="Texto da mensagem..."
          rows={4}
        />
      </div>

      <div>
        <Label>Ordem de exibição</Label>
        <Input
          type="number"
          value={formData.display_order}
          onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
        />
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={() => onSave(formData)}>
          Salvar
        </Button>
      </div>
    </div>
  );
}