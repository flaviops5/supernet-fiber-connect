import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Settings, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AgentInfo {
  name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  job_title?: string;
  work_hours_start?: string;
  work_hours_end?: string;
}

export default function AgentInfoPanel() {
  const [agentInfo, setAgentInfo] = useState<AgentInfo | null>(null);
  const [agentRole, setAgentRole] = useState<string | null>(null);
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedbackEnabled, setFeedbackEnabled] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadCurrentAgentInfo();
  }, []);

  const loadCurrentAgentInfo = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Buscar informações do perfil do agente logado
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, email, phone, avatar_url, job_title, work_hours_start, work_hours_end')
        .eq('user_id', user.id)
        .single();

      // Buscar role do agente logado
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      // Buscar departamentos atribuídos
      const { data: deptData } = await supabase
        .from('agent_department_assignments')
        .select('department')
        .eq('user_id', user.id);

      // Buscar configuração de feedback
      const { data: presenceData } = await supabase
        .from('agent_presence')
        .select('feedback_enabled')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setAgentInfo(profile);
        setAgentRole(roleData?.role || null);
        setDepartments(deptData?.map(d => d.department) || []);
        setFeedbackEnabled(presenceData?.feedback_enabled ?? true);
      }
    } catch (error) {
      console.error('Error loading agent info:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDepartmentLabel = (dept: string) => {
    const labels: Record<string, string> = {
      technical: 'Técnico',
      financial: 'Financeiro',
      sales: 'Vendas',
      routing: 'Roteamento',
      comercial: 'Comercial',
      tecnico: 'Técnico',
      financeiro: 'Financeiro',
      administrativo: 'Administrativo',
      logistica: 'Logística'
    };
    return labels[dept] || dept;
  };

  const getRoleLabel = (role: string | null) => {
    if (!role) return 'Agente';
    const labels: Record<string, string> = {
      admin: 'Administrador',
      editor: 'Editor',
      viewer: 'Visualizador'
    };
    return labels[role] || role;
  };

  const handleFeedbackToggle = async (enabled: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('agent_presence')
        .update({ feedback_enabled: enabled })
        .eq('user_id', user.id);

      if (error) throw error;

      setFeedbackEnabled(enabled);
      toast({
        title: enabled ? 'Feedback habilitado' : 'Feedback desabilitado',
        description: enabled 
          ? 'Clientes receberão solicitação de avaliação após atendimento.'
          : 'Clientes não receberão solicitação de avaliação.',
      });
    } catch (error) {
      console.error('Error updating feedback setting:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a configuração.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Agente Responsável</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Carregando...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!agentInfo) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Agente Responsável</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Não foi possível carregar suas informações
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-auto bg-gradient-to-br from-muted/30 via-background to-background border-2 border-border">
      <CardHeader className="pb-1 pt-3 px-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-semibold">Agente Responsável</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.location.href = '/perfil-agente'}
            className="h-5 w-5 p-0"
          >
            <Settings className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-1 pt-1 pb-2 px-3">
        {/* Avatar */}
        <div className="flex justify-center mb-1">
          <Avatar className="h-10 w-10">
            <AvatarImage src={agentInfo.avatar_url} alt={agentInfo.name} />
            <AvatarFallback className="text-xs">
              {agentInfo.name.split(' ').map(n => n[0]).join('').toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Nome */}
        <div className="text-center">
          <h3 className="font-semibold text-xs leading-tight">{agentInfo.name}</h3>
        </div>

        {/* Role e Departamentos em linha */}
        <div className="flex items-center justify-center gap-1.5 flex-wrap">
          <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-5">
            {getRoleLabel(agentRole)}
          </Badge>
          {departments.map((dept) => (
            <Badge key={dept} variant="outline" className="text-[10px] py-0 px-1.5 h-5">
              {getDepartmentLabel(dept)}
            </Badge>
          ))}
        </div>

        {/* Toggle de Feedback */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t mt-2">
          <Label htmlFor="feedback-toggle" className="text-xs flex items-center gap-1 cursor-pointer">
            <Star className="h-3 w-3 text-orange-500" />
            Solicitar feedback
          </Label>
          <Switch
            id="feedback-toggle"
            checked={feedbackEnabled}
            onCheckedChange={handleFeedbackToggle}
            className="scale-75"
          />
        </div>
      </CardContent>
    </Card>
  );
}
