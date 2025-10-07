import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Play, Pause } from "lucide-react";
import { toast } from "sonner";

export const MaintenanceTasks = () => {
  const queryClient = useQueryClient();

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['maintenance-tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('network_maintenance_tasks')
        .select('*')
        .order('priority', { ascending: true })
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data;
    }
  });

  const toggleTask = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase
        .from('network_maintenance_tasks')
        .update({ enabled })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-tasks'] });
      toast.success('Tarefa atualizada');
    },
    onError: () => {
      toast.error('Erro ao atualizar tarefa');
    }
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return '🟥 Alta';
      case 'medium': return '🟧 Média';
      case 'low': return '🟩 Baixa';
      default: return priority;
    }
  };

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  const tasksByPriority = {
    high: tasks?.filter(t => t.priority === 'high') || [],
    medium: tasks?.filter(t => t.priority === 'medium') || [],
    low: tasks?.filter(t => t.priority === 'low') || []
  };

  return (
    <div className="space-y-6">
      {(['high', 'medium', 'low'] as const).map((priority) => (
        <Card key={priority}>
          <CardHeader>
            <CardTitle>{getPriorityLabel(priority)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tasksByPriority[priority].map((task) => (
                <div key={task.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-semibold">{task.name}</h4>
                      <Badge variant={getPriorityColor(task.priority)}>
                        {task.task_type}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {task.description}
                    </p>
                    <div className="text-xs text-muted-foreground mt-2">
                      Intervalo: {task.execution_interval_minutes} minutos | 
                      Retries: {task.retry_count} | 
                      Timeout: {task.timeout_seconds}s
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={task.enabled}
                      onCheckedChange={(enabled) => 
                        toggleTask.mutate({ id: task.id, enabled })
                      }
                    />
                    {task.enabled ? (
                      <Play className="h-4 w-4 text-green-500" />
                    ) : (
                      <Pause className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
