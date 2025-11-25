import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Zap, Trash2 } from 'lucide-react';

interface Automation {
  id: string;
  name: string;
  trigger_type: string;
  trigger_conditions: Record<string, unknown>;
  actions: Array<{ type: string; [key: string]: unknown }>;
  is_active: boolean;
}

interface KanbanAutomationsProps {
  boardId: string;
}

export function KanbanAutomations({ boardId }: KanbanAutomationsProps) {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  // Form state
  const [name, setName] = useState('');
  const [triggerType, setTriggerType] = useState('card_moved');
  const [actionType, setActionType] = useState('notify');

  useEffect(() => {
    loadAutomations();
  }, [boardId]);

  const loadAutomations = async () => {
    const { data, error } = await supabase
      .from('kanban_automations' as any)
      .select('*')
      .eq('board_id', boardId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading automations:', error);
      toast({
        title: 'Erro ao carregar automações',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setAutomations((data as any) || []);
    }
    setLoading(false);
  };

  const handleCreateAutomation = async () => {
    if (!name.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Por favor, informe um nome para a automação',
        variant: 'destructive',
      });
      return;
    }

    const { error } = await supabase
      .from('kanban_automations' as any)
      .insert({
        board_id: boardId,
        name,
        trigger_type: triggerType,
        trigger_conditions: {},
        actions: [{ type: actionType }],
        is_active: true,
        created_by: (await supabase.auth.getUser()).data.user?.id,
      });

    if (error) {
      toast({
        title: 'Erro ao criar automação',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Automação criada',
        description: 'Automação criada com sucesso',
      });
      setDialogOpen(false);
      setName('');
      loadAutomations();
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from('kanban_automations' as any)
      .update({ is_active: !isActive })
      .eq('id', id);

    if (error) {
      toast({
        title: 'Erro ao atualizar automação',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      loadAutomations();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('kanban_automations' as any)
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Erro ao excluir automação',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Automação excluída',
      });
      loadAutomations();
    }
  };

  const getTriggerLabel = (type: string) => {
    const labels: Record<string, string> = {
      card_moved: 'Card movido',
      card_created: 'Card criado',
      priority_changed: 'Prioridade alterada',
      time_based: 'Baseado em tempo',
    };
    return labels[type] || type;
  };

  const getActionLabel = (type: string) => {
    const labels: Record<string, string> = {
      assign: 'Atribuir usuário',
      notify: 'Notificar',
      move_card: 'Mover card',
      change_priority: 'Alterar prioridade',
    };
    return labels[type] || type;
  };

  if (loading) {
    return <div>Carregando automações...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Automações</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Automação
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Automação</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Nome</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Notificar ao mover para 'Concluído'"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Gatilho</label>
                <Select value={triggerType} onValueChange={setTriggerType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="card_moved">Card movido</SelectItem>
                    <SelectItem value="card_created">Card criado</SelectItem>
                    <SelectItem value="priority_changed">Prioridade alterada</SelectItem>
                    <SelectItem value="time_based">Baseado em tempo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Ação</label>
                <Select value={actionType} onValueChange={setActionType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="notify">Notificar</SelectItem>
                    <SelectItem value="assign">Atribuir usuário</SelectItem>
                    <SelectItem value="move_card">Mover card</SelectItem>
                    <SelectItem value="change_priority">Alterar prioridade</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreateAutomation} className="w-full">
                Criar Automação
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {automations.map((automation) => (
          <Card key={automation.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Zap className="h-5 w-5" />
                  <CardTitle>{automation.name}</CardTitle>
                  {automation.is_active && (
                    <Badge variant="default">Ativa</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={automation.is_active}
                    onCheckedChange={() =>
                      handleToggleActive(automation.id, automation.is_active)
                    }
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(automation.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Gatilho:</span>{' '}
                  <Badge variant="outline">
                    {getTriggerLabel(automation.trigger_type)}
                  </Badge>
                </div>
                <div>
                  <span className="font-medium">Ações:</span>{' '}
                  {automation.actions.map((action, index) => (
                    <Badge key={index} variant="secondary" className="ml-1">
                      {getActionLabel(action.type)}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {automations.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhuma automação configurada
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
