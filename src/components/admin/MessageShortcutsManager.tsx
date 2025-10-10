import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface MessageShortcut {
  id: string;
  title: string;
  shortcut_key: string;
  message_text: string | null;
  department: string[];
  ai_agents: string[];
  usage_context: string | null;
  usage_count: number;
}

export default function MessageShortcutsManager() {
  const [shortcuts, setShortcuts] = useState<MessageShortcut[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingShortcut, setEditingShortcut] = useState<MessageShortcut | null>(null);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadShortcuts();
  }, []);

  const loadShortcuts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('message_shortcuts')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    if (data) {
      setShortcuts(data);
    }
    setLoading(false);
  };

  const handleSave = async (formData: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (editingShortcut) {
        await supabase
          .from('message_shortcuts')
          .update({
            ...formData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingShortcut.id);
      } else {
        await supabase
          .from('message_shortcuts')
          .insert({
            ...formData,
            created_by: user?.id
          });
      }

      toast({
        title: 'Atalho salvo',
        description: 'Atalho de mensagem salvo com sucesso.',
      });

      setOpen(false);
      setEditingShortcut(null);
      loadShortcuts();
    } catch (error) {
      console.error('Error saving shortcut:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar o atalho.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await supabase
        .from('message_shortcuts')
        .update({ is_active: false })
        .eq('id', id);

      toast({
        title: 'Atalho removido',
        description: 'Atalho removido com sucesso.',
      });

      loadShortcuts();
    } catch (error) {
      console.error('Error deleting shortcut:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o atalho.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Atalhos de Mensagens</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => setEditingShortcut(null)}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Atalho
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingShortcut ? 'Editar Atalho' : 'Novo Atalho'}
                </DialogTitle>
              </DialogHeader>
              <ShortcutForm 
                shortcut={editingShortcut} 
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
            {shortcuts.map((shortcut) => (
              <div key={shortcut.id} className="border rounded-lg p-3">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium">{shortcut.title}</p>
                    <Badge variant="secondary" className="text-xs mt-1">
                      {shortcut.shortcut_key}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingShortcut(shortcut);
                        setOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(shortcut.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                {shortcut.message_text && (
                  <p className="text-sm text-muted-foreground mb-2">
                    {shortcut.message_text}
                  </p>
                )}
                <div className="flex gap-2 text-xs text-muted-foreground">
                  <span>Usos: {shortcut.usage_count}</span>
                  {shortcut.department.length > 0 && (
                    <span>• Deptos: {shortcut.department.join(', ')}</span>
                  )}
                </div>
              </div>
            ))}

            {shortcuts.length === 0 && !loading && (
              <div className="text-center py-12 text-muted-foreground">
                Nenhum atalho cadastrado
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function ShortcutForm({ shortcut, onSave, onCancel }: any) {
  const [formData, setFormData] = useState({
    title: shortcut?.title || '',
    shortcut_key: shortcut?.shortcut_key || '',
    message_text: shortcut?.message_text || '',
    department: shortcut?.department || [],
    ai_agents: shortcut?.ai_agents || [],
    usage_context: shortcut?.usage_context || '',
  });

  return (
    <div className="space-y-4">
      <div>
        <Label>Título</Label>
        <Input
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Ex: Reiniciar equipamento"
        />
      </div>

      <div>
        <Label>Atalho</Label>
        <Input
          value={formData.shortcut_key}
          onChange={(e) => setFormData({ ...formData, shortcut_key: e.target.value })}
          placeholder="Ex: /reiniciar"
        />
      </div>

      <div>
        <Label>Mensagem</Label>
        <Textarea
          value={formData.message_text}
          onChange={(e) => setFormData({ ...formData, message_text: e.target.value })}
          placeholder="Texto da mensagem..."
        />
      </div>

      <div>
        <Label>Contexto de uso (para IA)</Label>
        <Textarea
          value={formData.usage_context}
          onChange={(e) => setFormData({ ...formData, usage_context: e.target.value })}
          placeholder="Ex: quando cliente relatar lentidão ou queda de conexão"
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