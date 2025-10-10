import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, User as UserIcon, Briefcase, Settings, Building2 } from 'lucide-react';

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

      if (profile) {
        setAgentInfo(profile);
        setAgentRole(roleData?.role || null);
        setDepartments(deptData?.map(d => d.department) || []);
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
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Agente Responsável</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.location.href = '/perfil-agente'}
            className="text-xs h-7 px-2"
          >
            <Settings className="h-3 w-3 mr-1" />
            Editar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Avatar */}
        <div className="flex justify-center">
          <Avatar className="h-20 w-20">
            <AvatarImage src={agentInfo.avatar_url} alt={agentInfo.name} />
            <AvatarFallback className="text-lg">
              {agentInfo.name.split(' ').map(n => n[0]).join('').toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Nome e Email */}
        <div className="text-center space-y-1">
          <h3 className="font-semibold text-base">{agentInfo.name}</h3>
          <p className="text-xs text-muted-foreground">{agentInfo.email}</p>
          {agentInfo.phone && (
            <p className="text-xs text-muted-foreground">{agentInfo.phone}</p>
          )}
        </div>

        {/* Função */}
        {agentInfo.job_title && (
          <div className="flex items-center gap-2 text-sm">
            <Briefcase className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Cargo:</span>
            <span className="font-medium">{agentInfo.job_title}</span>
          </div>
        )}

        {/* Role */}
        <div className="flex items-center gap-2 text-sm">
          <UserIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Função:</span>
          <Badge variant="secondary" className="font-medium">
            {getRoleLabel(agentRole)}
          </Badge>
        </div>

        {/* Departamentos */}
        {departments.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Departamentos:</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {departments.map((dept) => (
                <Badge key={dept} variant="outline" className="text-xs">
                  {getDepartmentLabel(dept)}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Horário de Trabalho */}
        {agentInfo.work_hours_start && agentInfo.work_hours_end && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Horário:</span>
            <span className="text-xs font-medium">
              {agentInfo.work_hours_start.substring(0, 5)} - {agentInfo.work_hours_end.substring(0, 5)}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
