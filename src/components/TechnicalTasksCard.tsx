import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";

interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in-progress' | 'done';
  category: string;
}

const tasks: Task[] = [
  {
    id: 'ixc-refactor-remaining',
    title: 'Refatorar funções IXC restantes para usar proxy',
    description: 'Migrar ixc-pon-status, ixc-radio-status, ixc-sync-plans e demais funções para usar o ixc-proxy centralizado com retry/circuit breaker',
    priority: 'high',
    status: 'pending',
    category: 'IXC Integration'
  },
  {
    id: 'agents-phase3',
    title: 'Fase 3: Modificação dos Agentes',
    description: 'Implementar melhorias na arquitetura dos agentes de atendimento (routing, vendas, suporte técnico, telemedicina)',
    priority: 'medium',
    status: 'pending',
    category: 'AI Agents'
  },
  {
    id: 'ixc-critical-refactor',
    title: 'Refatoração crítica: ixc-count-clients e detect-mass-outage',
    description: 'Migrar funções críticas para usar proxy centralizado (CONCLUÍDO)',
    priority: 'high',
    status: 'done',
    category: 'IXC Integration'
  }
];

export function TechnicalTasksCard() {
  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const inProgressTasks = tasks.filter(t => t.status === 'in-progress');
  const doneTasks = tasks.filter(t => t.status === 'done');

  return (
    <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-950/20 dark:to-yellow-950/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Tarefas Técnicas Pendentes
            </CardTitle>
            <CardDescription className="mt-1">
              {pendingTasks.length} pendente{pendingTasks.length !== 1 ? 's' : ''} • {inProgressTasks.length} em progresso • {doneTasks.length} concluída{doneTasks.length !== 1 ? 's' : ''}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 space-y-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {task.status === 'done' && (
                    <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                  )}
                  {task.status === 'in-progress' && (
                    <Clock className="h-4 w-4 text-blue-600 flex-shrink-0 animate-pulse" />
                  )}
                  {task.status === 'pending' && (
                    <AlertTriangle className="h-4 w-4 text-orange-600 flex-shrink-0" />
                  )}
                  <h3 className="font-semibold text-sm">{task.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{task.description}</p>
              </div>
              <div className="flex flex-col gap-1 items-end">
                <Badge
                  variant={
                    task.priority === 'high' ? 'destructive' :
                    task.priority === 'medium' ? 'default' : 
                    'secondary'
                  }
                  className="text-xs"
                >
                  {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {task.category}
                </Badge>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
