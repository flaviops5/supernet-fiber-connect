import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Circle, User } from 'lucide-react';

interface AgentPresence {
  id: string;
  user_id: string;
  status: string;
  department: string;
  current_conversations: number;
  max_conversations: number;
  profiles?: {
    name: string;
  } | null;
}

interface Props {
  currentDepartment: string;
  onDepartmentChange: (dept: string) => void;
}

const departmentLabels = {
  comercial: 'Comercial',
  tecnico: 'Técnico',
  financeiro: 'Financeiro',
  administrativo: 'Administrativo'
};

const statusColors = {
  online: 'text-green-500',
  busy: 'text-yellow-500',
  away: 'text-orange-500',
  offline: 'text-gray-500'
};

export default function AgentPresencePanel({ currentDepartment, onDepartmentChange }: Props) {
  const [agents, setAgents] = useState<AgentPresence[]>([]);

  useEffect(() => {
    loadAgents();

    const channel = supabase
      .channel('agent-presence-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_presence'
        },
        () => loadAgents()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadAgents = async () => {
    const { data, error } = await supabase
      .from('agent_presence')
      .select('*')
      .order('status', { ascending: true })
      .order('department', { ascending: true });

    if (error) {
      console.error('Error loading agents:', error);
      return;
    }

    // Load profiles separately
    if (data) {
      const agentsWithProfiles = await Promise.all(
        data.map(async (agent) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('name')
            .eq('user_id', agent.user_id)
            .single();
          
          return {
            ...agent,
            profiles: profile
          } as AgentPresence;
        })
      );
      
      setAgents(agentsWithProfiles);
    }
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      online: 'Online',
      busy: 'Ocupado',
      away: 'Ausente',
      offline: 'Offline'
    };
    return labels[status as keyof typeof labels] || status;
  };

  const agentsByDepartment = agents.reduce((acc, agent) => {
    if (!acc[agent.department]) {
      acc[agent.department] = [];
    }
    acc[agent.department].push(agent);
    return acc;
  }, {} as Record<string, AgentPresence[]>);

  return (
    <Card className="h-full flex flex-col shadow-lg border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Meu Setor</CardTitle>
        <Select value={currentDepartment} onValueChange={onDepartmentChange}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(departmentLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto space-y-4">
        {Object.entries(agentsByDepartment).map(([dept, deptAgents]) => (
          <div key={dept} className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase">
              {departmentLabels[dept as keyof typeof departmentLabels]}
            </h3>
            <div className="space-y-2">
              {deptAgents.map((agent) => (
                <div
                  key={agent.id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">
                      {agent.profiles?.name || 'Agente'}
                    </p>
                    <div className="flex items-center gap-1">
                      <Circle className={`h-2 w-2 fill-current ${statusColors[agent.status as keyof typeof statusColors]}`} />
                      <span className="text-xs text-muted-foreground">
                        {getStatusLabel(agent.status)}
                      </span>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {agent.current_conversations}/{agent.max_conversations}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        ))}

        {agents.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum agente online</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
