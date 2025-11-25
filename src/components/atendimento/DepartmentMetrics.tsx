import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Clock, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface DepartmentStats {
  department: string;
  waiting: number;
  active: number;
  resolved: number;
  avgResponseTime: number;
  onlineAgents: number;
}

export default function DepartmentMetrics() {
  const [stats, setStats] = useState<DepartmentStats[]>([]);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      const departments = ['comercial', 'tecnico', 'financeiro', 'administrativo', 'logistica'];
      const allStats: DepartmentStats[] = [];

      for (const dept of departments) {
        // Count conversations by status
        const { data: conversations } = await supabase
          .from('conversations')
          .select('status, created_at, first_response_at')
          .eq('department', dept as Database['public']['Enums']['agent_department']);

        const waiting = conversations?.filter(c => c.status === 'waiting').length || 0;
        const active = conversations?.filter(c => c.status === 'active').length || 0;
        const resolved = conversations?.filter(c => c.status === 'resolved').length || 0;

        // Calculate average response time
        const responseTimes = conversations
          ?.filter(c => c.first_response_at)
          .map(c => {
            const created = new Date(c.created_at).getTime();
            const responded = new Date(c.first_response_at!).getTime();
            return (responded - created) / 1000 / 60; // minutes
          }) || [];

        const avgResponseTime = responseTimes.length > 0
          ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
          : 0;

        // Count online agents
        const { data: agents } = await supabase
          .from('agent_presence')
          .select('user_id')
          .eq('department', dept as Database['public']['Enums']['agent_department'])
          .eq('status', 'online');

        allStats.push({
          department: dept,
          waiting,
          active,
          resolved,
          avgResponseTime: Math.round(avgResponseTime),
          onlineAgents: agents?.length || 0
        });
      }

      setStats(allStats);
    } catch (error) {
      console.error('Error loading department stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
    
    const interval = setInterval(loadStats, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, [loadStats]);

  const getDepartmentLabel = (dept: string) => {
    const labels: Record<string, string> = {
      comercial: 'Comercial',
      tecnico: 'Técnico',
      financeiro: 'Financeiro',
      administrativo: 'Administrativo',
      logistica: 'Logística'
    };
    return labels[dept] || dept;
  };

  const getDepartmentColor = (dept: string) => {
    const colors: Record<string, string> = {
      comercial: 'bg-blue-500',
      tecnico: 'bg-green-500',
      financeiro: 'bg-yellow-500',
      administrativo: 'bg-purple-500',
      logistica: 'bg-orange-500'
    };
    return colors[dept] || 'bg-gray-500';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Métricas por Departamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Métricas por Departamento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {stats.map((stat) => (
          <div key={stat.department} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${getDepartmentColor(stat.department)}`} />
                <h4 className="font-semibold">{getDepartmentLabel(stat.department)}</h4>
              </div>
              <Badge variant={stat.onlineAgents > 0 ? 'default' : 'secondary'}>
                <Users className="h-3 w-3 mr-1" />
                {stat.onlineAgents} online
              </Badge>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-1">
                  <Clock className="h-3 w-3 text-yellow-500" />
                  <span className="text-xs text-muted-foreground">Aguardando</span>
                </div>
                <p className="text-lg font-bold">{stat.waiting}</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-center gap-1">
                  <AlertCircle className="h-3 w-3 text-blue-500" />
                  <span className="text-xs text-muted-foreground">Ativas</span>
                </div>
                <p className="text-lg font-bold">{stat.active}</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-center gap-1">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span className="text-xs text-muted-foreground">Resolvidas</span>
                </div>
                <p className="text-lg font-bold">{stat.resolved}</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-center gap-1">
                  <Clock className="h-3 w-3 text-purple-500" />
                  <span className="text-xs text-muted-foreground">Tempo Médio</span>
                </div>
                <p className="text-lg font-bold">{stat.avgResponseTime}min</p>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
