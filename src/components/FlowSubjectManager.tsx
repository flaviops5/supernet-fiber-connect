import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

interface FlowSubject {
  id: string;
  agent_type: string;
  subject_key: string;
  subject_name: string;
  description?: string;
  icon: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface FlowSubjectManagerProps {
  agentType?: string;
}

const AGENT_TYPES = [
  { value: 'routing-agent', label: 'Cloé (Roteamento)' },
  { value: 'support-tech-agent', label: 'Luan (Suporte Técnico)' },
  { value: 'support-financial-agent', label: 'Suporte Financeiro' },
  { value: 'sales-agent', label: 'Vendas' },
  { value: 'telemedicina-agent', label: 'Telemedicina' },
  { value: 'automacao-agent', label: 'Automação' },
  { value: 'logistics-agent', label: 'Logística' },
];

const DEFAULT_ICONS = ['📁', '⚡', '📶', '🌐', '🔧', '💰', '📞', '🏥', '🚚', '📦', '🎯', '⚙️'];

export default function FlowSubjectManager({ agentType: propAgentType }: FlowSubjectManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedAgent, setSelectedAgent] = useState<string>(propAgentType || 'support-tech-agent');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<FlowSubject | null>(null);
  
  // Sincronizar selectedAgent com propAgentType
  useEffect(() => {
    if (propAgentType) {
      setSelectedAgent(propAgentType);
    }
  }, [propAgentType]);
  
  // Form states
  const [formData, setFormData] = useState({
    subject_key: '',
    subject_name: '',
    description: '',
    icon: '📁',
    display_order: 0,
  });

  const { data: subjects, isLoading } = useQuery({
    queryKey: ['flow_subjects', selectedAgent],
    queryFn: async () => {
      const agentToUse = propAgentType || selectedAgent;
      if (!agentToUse) return [];
      
      const { data, error } = await supabase
        .from('agent_flow_subjects')
        .select('*')
        .eq('agent_type', agentToUse as any)
        .order('display_order');
      
      if (error) throw error;
      return data as FlowSubject[];
    },
    enabled: !!(propAgentType || selectedAgent),
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const agentToUse = propAgentType || selectedAgent;
      const { error } = await supabase
        .from('agent_flow_subjects')
        .insert({
          agent_type: agentToUse as any,
          ...data,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flow_subjects'] });
      toast({ title: '✅ Assunto criado com sucesso!' });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({ 
        title: 'Erro ao criar assunto', 
        description: error.message,
        variant: 'destructive'
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase
        .from('agent_flow_subjects')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flow_subjects'] });
      toast({ title: '✅ Assunto atualizado com sucesso!' });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({ 
        title: 'Erro ao atualizar assunto', 
        description: error.message,
        variant: 'destructive'
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('agent_flow_subjects')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flow_subjects'] });
      toast({ title: '🗑️ Assunto removido com sucesso!' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Erro ao remover assunto', 
        description: error.message,
        variant: 'destructive'
      });
    },
  });

  const handleSubmit = () => {
    if (!formData.subject_key || !formData.subject_name) {
      toast({ 
        title: 'Campos obrigatórios', 
        description: 'Preencha chave e nome do assunto',
        variant: 'destructive'
      });
      return;
    }

    if (editingSubject) {
      updateMutation.mutate({ id: editingSubject.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (subject: FlowSubject) => {
    setEditingSubject(subject);
    setFormData({
      subject_key: subject.subject_key,
      subject_name: subject.subject_name,
      description: subject.description || '',
      icon: subject.icon,
      display_order: subject.display_order,
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingSubject(null);
    setFormData({
      subject_key: '',
      subject_name: '',
      description: '',
      icon: '📁',
      display_order: subjects?.length || 0,
    });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja remover este assunto?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              📚 Gerenciar Assuntos de Fluxo
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Configure os assuntos que agrupam os cenários de cada agente
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setFormData({ ...formData, display_order: subjects?.length || 0 })}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Assunto
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-background">
              <DialogHeader>
                <DialogTitle>
                  {editingSubject ? 'Editar Assunto' : 'Novo Assunto'}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label>Chave do Assunto *</Label>
                  <Input
                    placeholder="ex: energia, wifi, dns_conectividade"
                    value={formData.subject_key}
                    onChange={(e) => setFormData({ ...formData, subject_key: e.target.value })}
                    disabled={!!editingSubject}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Identificador único (sem espaços, use underline)
                  </p>
                </div>

                <div>
                  <Label>Nome do Assunto *</Label>
                  <Input
                    placeholder="ex: Energia, Wi-Fi, DNS/Conectividade"
                    value={formData.subject_name}
                    onChange={(e) => setFormData({ ...formData, subject_name: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Descrição</Label>
                  <Textarea
                    placeholder="Descreva os tipos de problemas deste assunto..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Ícone</Label>
                  <div className="flex gap-2 flex-wrap mt-2">
                    {DEFAULT_ICONS.map(icon => (
                      <Button
                        key={icon}
                        type="button"
                        variant={formData.icon === icon ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFormData({ ...formData, icon })}
                      >
                        {icon}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Ordem de Exibição</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={handleCloseDialog}>
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
                <Button onClick={handleSubmit}>
                  <Save className="w-4 h-4 mr-2" />
                  {editingSubject ? 'Atualizar' : 'Criar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Agent Selector - only show if no prop provided */}
        {!propAgentType && (
          <div>
            <Label className="mb-2 block">Agente</Label>
            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
              <SelectTrigger className="bg-background max-w-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {AGENT_TYPES.map(agent => (
                  <SelectItem key={agent.value} value={agent.value}>
                    {agent.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Subjects List */}
        <ScrollArea className="h-[500px]">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando assuntos...
            </div>
          ) : subjects && subjects.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum assunto cadastrado. Clique em "Novo Assunto" para criar.
            </div>
          ) : (
            <div className="space-y-3">
              {subjects?.map((subject) => (
                <Card key={subject.id} className="p-4 hover:bg-accent/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="text-3xl">{subject.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg">{subject.subject_name}</h3>
                          <Badge variant="secondary" className="text-xs">
                            {subject.subject_key}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            Ordem: {subject.display_order}
                          </Badge>
                        </div>
                        {subject.description && (
                          <p className="text-sm text-muted-foreground">
                            {subject.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(subject)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(subject.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </Card>
  );
}