import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, Briefcase } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AgentInfo {
  name: string;
  email: string;
  avatar_url?: string;
  job_title?: string;
  work_hours_start?: string;
  work_hours_end?: string;
}

interface AgentRole {
  role: string;
}

interface Props {
  conversationId: string | null;
}

export default function AgentInfoPanel({ conversationId }: Props) {
  const [agentInfo, setAgentInfo] = useState<AgentInfo | null>(null);
  const [agentRole, setAgentRole] = useState<string | null>(null);
  const [assignedAt, setAssignedAt] = useState<string | null>(null);
  const [department, setDepartment] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!conversationId) {
      setAgentInfo(null);
      setAgentRole(null);
      setAssignedAt(null);
      setDepartment(null);
      return;
    }

    loadAgentInfo();
  }, [conversationId]);

  const loadAgentInfo = async () => {
    if (!conversationId) return;
    
    setLoading(true);
    try {
      const { data: conversation } = await supabase
        .from('conversations')
        .select('assigned_agent_id, created_at, department')
        .eq('id', conversationId)
        .single();

      if (conversation?.assigned_agent_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, email, avatar_url, job_title, work_hours_start, work_hours_end')
          .eq('user_id', conversation.assigned_agent_id)
          .single();

        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', conversation.assigned_agent_id)
          .single();

        if (profile) {
          setAgentInfo(profile);
          setAgentRole(roleData?.role || null);
          setAssignedAt(conversation.created_at);
          setDepartment(conversation.department);
        }
      }
    } catch (error) {
      console.error('Error loading agent info:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!conversationId) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Agente Responsável</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Selecione uma conversa
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
            Sem agente atribuído
          </p>
        </CardContent>
      </Card>
    );
  }

  const getDepartmentLabel = (dept: string | null) => {
    if (!dept) return 'N/A';
    const labels: Record<string, string> = {
      comercial: 'Comercial',
      tecnico: 'Técnico',
      financeiro: 'Financeiro',
      administrativo: 'Administrativo',
      logistica: 'Logística'
    };
    return labels[dept] || dept;
  };

  const getRoleLabel = (role: string | undefined) => {
    if (!role) return 'Agente';
    const labels: Record<string, string> = {
      admin: 'Administrador',
      editor: 'Editor',
      viewer: 'Visualizador'
    };
    return labels[role] || role;
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Agente Responsável</CardTitle>
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

        {/* Nome */}
        <div className="text-center">
          <h3 className="font-semibold text-base">{agentInfo.name}</h3>
        </div>

        {/* Função */}
        <div className="flex items-center gap-2 text-sm">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Função:</span>
          <span className="font-medium">{agentInfo.job_title || getRoleLabel(agentRole || undefined)}</span>
        </div>

        {/* Setor */}
        <div className="flex items-center gap-2 text-sm">
          <Briefcase className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Setor:</span>
          <Badge variant="secondary" className="font-medium">
            {getDepartmentLabel(department)}
          </Badge>
        </div>

        {/* Data/Hora */}
        {assignedAt && (
          <>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Atribuído:</span>
            </div>
            <div className="flex items-center gap-2 text-sm pl-6">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs">
                {formatDistanceToNow(new Date(assignedAt), {
                  addSuffix: true,
                  locale: ptBR
                })}
              </span>
            </div>
          </>
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
