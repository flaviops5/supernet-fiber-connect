import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { User, Shield, Trash2, Plus, Users } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Profile {
  user_id: string;
  name: string;
  email: string;
}

interface Assignment {
  id: string;
  user_id: string;
  department: string;
  is_universal: boolean;
  created_at: string;
}

const DEPARTMENTS = [
  { value: 'comercial', label: 'Comercial', color: 'bg-blue-500' },
  { value: 'tecnico', label: 'Técnico', color: 'bg-green-500' },
  { value: 'financeiro', label: 'Financeiro', color: 'bg-yellow-500' },
  { value: 'administrativo', label: 'Administrativo', color: 'bg-purple-500' },
  { value: 'logistica', label: 'Logística', color: 'bg-orange-500' }
];

export default function AgentDepartmentManagement() {
  const { toast } = useToast();
  const [agents, setAgents] = useState<Profile[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [isUniversal, setIsUniversal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Buscar perfis de usuários com role admin ou editor
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, name, email')
        .order('name');

      if (profilesError) throw profilesError;

      // Filtrar apenas admins e editors
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['admin', 'editor']);

      const agentUserIds = roles?.map(r => r.user_id) || [];
      const filteredProfiles = profiles?.filter(p => agentUserIds.includes(p.user_id)) || [];

      setAgents(filteredProfiles);

      // Buscar atribuições
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('agent_department_assignments')
        .select('*')
        .order('created_at', { ascending: false });

      if (assignmentsError) throw assignmentsError;
      setAssignments(assignmentsData || []);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const addAssignment = async () => {
    if (!selectedAgent || !selectedDept) {
      toast({
        title: 'Atenção',
        description: 'Selecione um agente e um departamento.',
        variant: 'destructive'
      });
      return;
    }

    // Verificar se já existe
    const exists = assignments.some(
      a => a.user_id === selectedAgent && a.department === selectedDept
    );

    if (exists) {
      toast({
        title: 'Atenção',
        description: 'Esta atribuição já existe.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('agent_department_assignments')
        .insert([{
          user_id: selectedAgent,
          department: selectedDept as any,
          is_universal: isUniversal
        }]);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Atribuição criada com sucesso!'
      });

      // Reset
      setSelectedAgent('');
      setSelectedDept('');
      setIsUniversal(false);
      
      await loadData();
    } catch (error: any) {
      console.error('Erro ao adicionar:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível criar a atribuição.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = (id: string) => {
    setDeleteDialog({ open: true, id });
  };

  const deleteAssignment = async () => {
    if (!deleteDialog.id) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('agent_department_assignments')
        .delete()
        .eq('id', deleteDialog.id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Atribuição removida com sucesso!'
      });

      await loadData();
    } catch (error: any) {
      console.error('Erro ao remover:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível remover a atribuição.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
      setDeleteDialog({ open: false, id: null });
    }
  };

  const getAgentName = (userId: string) => {
    return agents.find(a => a.user_id === userId)?.name || 'Desconhecido';
  };

  const getDeptLabel = (dept: string) => {
    return DEPARTMENTS.find(d => d.value === dept)?.label || dept;
  };

  const getDeptColor = (dept: string) => {
    return DEPARTMENTS.find(d => d.value === dept)?.color || 'bg-gray-500';
  };

  const getAgentAssignments = (userId: string) => {
    return assignments.filter(a => a.user_id === userId);
  };

  return (
    <div className="space-y-6">
      {/* Card de Adição */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Nova Atribuição
          </CardTitle>
          <CardDescription>
            Atribua agentes a departamentos específicos ou marque como universal para atender todos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Agente</Label>
                <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um agente" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map(agent => (
                      <SelectItem key={agent.user_id} value={agent.user_id}>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span>{agent.name}</span>
                          <span className="text-xs text-muted-foreground">({agent.email})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Departamento</Label>
                <Select value={selectedDept} onValueChange={setSelectedDept}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map(dept => (
                      <SelectItem key={dept.value} value={dept.value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${dept.color}`} />
                          {dept.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="universal"
                checked={isUniversal}
                onCheckedChange={(checked) => setIsUniversal(checked as boolean)}
              />
              <Label
                htmlFor="universal"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <span>Agente Universal (atende todos os departamentos como backup)</span>
                </div>
              </Label>
            </div>

            <Button onClick={addAssignment} disabled={loading} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Atribuição
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Agentes e suas Atribuições */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Atribuições Atuais
          </CardTitle>
          <CardDescription>
            Visualize e gerencie as atribuições de departamentos para cada agente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {agents.map(agent => {
              const agentAssignments = getAgentAssignments(agent.user_id);
              const hasUniversal = agentAssignments.some(a => a.is_universal);

              return (
                <div key={agent.user_id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold">{agent.name}</h4>
                        <p className="text-sm text-muted-foreground">{agent.email}</p>
                      </div>
                    </div>
                    {hasUniversal && (
                      <Badge variant="default" className="gap-1">
                        <Shield className="h-3 w-3" />
                        Universal
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {agentAssignments.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">
                        Nenhum departamento atribuído
                      </p>
                    ) : (
                      agentAssignments.map(assignment => (
                        <Badge
                          key={assignment.id}
                          variant="secondary"
                          className="gap-2 pr-1"
                        >
                          <div className={`w-2 h-2 rounded-full ${getDeptColor(assignment.department)}`} />
                          {getDeptLabel(assignment.department)}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 hover:bg-destructive/10"
                            onClick={() => confirmDelete(assignment.id)}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
              );
            })}

            {agents.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum agente encontrado</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Confirmação */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, id: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Remoção</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover esta atribuição? O agente não poderá mais atender este departamento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deleteAssignment} className="bg-destructive">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}