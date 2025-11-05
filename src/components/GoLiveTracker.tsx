import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Clock, AlertCircle, ChevronDown, ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

type TaskStatus = "pending" | "in-progress" | "completed" | "blocked";

interface SubTask {
  id: string;
  title: string;
  status: TaskStatus;
  estimatedHours: number;
  dependencies?: string[];
}

interface Phase {
  id: string;
  title: string;
  description: string;
  totalHours: number;
  completionCriteria: string[];
  tasks: SubTask[];
  dependencies?: string[];
}

const initialPhases: Phase[] = [
  {
    id: "phase-1",
    title: "FASE 1: Validação de Infraestrutura",
    description: "Verificar todas as credenciais e integrações",
    totalHours: 3,
    completionCriteria: [
      "Todas as credenciais verificadas",
      "IXC API respondendo",
      "Evolution API conectada",
      "Supabase Health OK"
    ],
    tasks: [
      { id: "1.1", title: "Verificar credenciais IXC (API URL, Token, Cliente ID)", status: "pending", estimatedHours: 0.5 },
      { id: "1.2", title: "Verificar credenciais Evolution API (URL, Instance, API Key)", status: "pending", estimatedHours: 0.5 },
      { id: "1.3", title: "Testar ixc-proxy endpoint", status: "pending", estimatedHours: 1, dependencies: ["1.1"] },
      { id: "1.4", title: "Validar System Health Dashboard", status: "pending", estimatedHours: 1, dependencies: ["1.2", "1.3"] }
    ]
  },
  {
    id: "phase-2",
    title: "FASE 2: Correção Julia - Envio de Boletos",
    description: "Implementar funcionalidade de envio de segunda via",
    totalHours: 4,
    completionCriteria: [
      "Tool getAndSendBoleto implementado",
      "Julia reconhece pedido de boleto",
      "WhatsApp envia PDF/link corretamente"
    ],
    tasks: [
      { id: "2.1", title: "Criar tool getAndSendBoleto no support-financial-agent", status: "pending", estimatedHours: 2 },
      { id: "2.2", title: "Atualizar prompt da Julia para reconhecer pedidos de boleto", status: "pending", estimatedHours: 1, dependencies: ["2.1"] },
      { id: "2.3", title: "Testar envio via WhatsApp", status: "pending", estimatedHours: 1, dependencies: ["2.2"] }
    ],
    dependencies: ["phase-1"]
  },
  {
    id: "phase-3",
    title: "FASE 3: Mass Outage - Automação Completa",
    description: "Configurar detecção e notificação automática de quedas",
    totalHours: 5,
    completionCriteria: [
      "CRON Job configurado (5 min)",
      "Detecção agrupando PON/CTO",
      "Notificações WhatsApp enviadas",
      "Tickets IXC criados automaticamente"
    ],
    tasks: [
      { id: "3.1", title: "Criar Supabase Cron Job para detect-mass-outage", status: "pending", estimatedHours: 2 },
      { id: "3.2", title: "Validar mass-outage-executor (notificações)", status: "pending", estimatedHours: 1.5, dependencies: ["3.1"] },
      { id: "3.3", title: "Validar criação de tickets IXC", status: "pending", estimatedHours: 1, dependencies: ["3.2"] },
      { id: "3.4", title: "Teste completo: simular → detectar → notificar", status: "pending", estimatedHours: 0.5, dependencies: ["3.3"] }
    ],
    dependencies: ["phase-1"]
  },
  {
    id: "phase-4",
    title: "FASE 4: Desbloqueio Automático - Validação",
    description: "Garantir que Julia desbloqueia após pagamento",
    totalHours: 3,
    completionCriteria: [
      "Julia detecta pagamento confirmado",
      "Chamada para ixc-integration/unblock funciona",
      "Cliente recebe confirmação via WhatsApp"
    ],
    tasks: [
      { id: "4.1", title: "Validar fluxo de pagamento → trigger → Julia", status: "pending", estimatedHours: 1.5 },
      { id: "4.2", title: "Testar ixc-integration endpoint /unblock", status: "pending", estimatedHours: 1, dependencies: ["4.1"] },
      { id: "4.3", title: "QA end-to-end com cliente teste", status: "pending", estimatedHours: 0.5, dependencies: ["4.2"] }
    ],
    dependencies: ["phase-1", "phase-2"]
  },
  {
    id: "phase-5",
    title: "FASE 5: Auto-Reboot - Validação e Tune",
    description: "Validar reboot automático de ONUs travadas",
    totalHours: 3,
    completionCriteria: [
      "GPON API respondendo",
      "auto_reboot_settings configurado",
      "Logs de reboot registrados"
    ],
    tasks: [
      { id: "5.1", title: "Validar endpoint GPON API", status: "pending", estimatedHours: 1 },
      { id: "5.2", title: "Configurar auto_reboot_settings (thresholds)", status: "pending", estimatedHours: 1, dependencies: ["5.1"] },
      { id: "5.3", title: "QA: forçar reboot e validar logs", status: "pending", estimatedHours: 1, dependencies: ["5.2"] }
    ],
    dependencies: ["phase-1"]
  },
  {
    id: "phase-6",
    title: "FASE 6: Teste End-to-End Completo",
    description: "Validar todos os fluxos críticos integrados",
    totalHours: 4,
    completionCriteria: [
      "Cliente bloqueado → paga → desbloqueia",
      "Cliente offline → Luan diagnostica → resolve",
      "Queda massa → detecta → notifica → ticket IXC",
      "Novo contrato → campanha → follow-up"
    ],
    tasks: [
      { id: "6.1", title: "Cenário: Cliente bloqueado → Julia desbloqueia", status: "pending", estimatedHours: 1 },
      { id: "6.2", title: "Cenário: Cliente offline → Luan diagnostica", status: "pending", estimatedHours: 1 },
      { id: "6.3", title: "Cenário: Queda massa → notificações automáticas", status: "pending", estimatedHours: 1 },
      { id: "6.4", title: "Validar integridade de logs e métricas", status: "pending", estimatedHours: 1 }
    ],
    dependencies: ["phase-2", "phase-3", "phase-4", "phase-5"]
  },
  {
    id: "phase-7",
    title: "FASE 7: Preparação de Ambiente de Produção",
    description: "Limpar staging e configurar credenciais de produção",
    totalHours: 3,
    completionCriteria: [
      "TEST_HARNESS removido",
      "Secrets de produção configurados",
      "RLS Policies auditadas"
    ],
    tasks: [
      { id: "7.1", title: "Remover TEST_HARNESS do código", status: "pending", estimatedHours: 1 },
      { id: "7.2", title: "Configurar secrets de produção (IXC, Evolution, Anthropic)", status: "pending", estimatedHours: 1 },
      { id: "7.3", title: "Auditar RLS Policies (supabase--linter)", status: "pending", estimatedHours: 1 }
    ],
    dependencies: ["phase-6"]
  },
  {
    id: "phase-8",
    title: "FASE 8: Deploy Coordenado",
    description: "Publicar edge functions e frontend em ordem",
    totalHours: 2,
    completionCriteria: [
      "Edge Functions deployed",
      "Frontend deployed",
      "Smoke tests OK"
    ],
    tasks: [
      { id: "8.1", title: "Deploy Edge Functions (ixc-proxy, routing-agent, etc.)", status: "pending", estimatedHours: 1 },
      { id: "8.2", title: "Deploy Frontend", status: "pending", estimatedHours: 0.5, dependencies: ["8.1"] },
      { id: "8.3", title: "Smoke tests em produção", status: "pending", estimatedHours: 0.5, dependencies: ["8.2"] }
    ],
    dependencies: ["phase-7"]
  },
  {
    id: "phase-9",
    title: "FASE 9: Ativação Progressiva",
    description: "Soft launch → Full launch",
    totalHours: 4,
    completionCriteria: [
      "Testes internos OK",
      "10% dos clientes ativos",
      "100% dos clientes ativos"
    ],
    tasks: [
      { id: "9.1", title: "Ativação interna (equipe)", status: "pending", estimatedHours: 1 },
      { id: "9.2", title: "Soft Launch (10% clientes)", status: "pending", estimatedHours: 2, dependencies: ["9.1"] },
      { id: "9.3", title: "Full Launch (100% clientes)", status: "pending", estimatedHours: 1, dependencies: ["9.2"] }
    ],
    dependencies: ["phase-8"]
  },
  {
    id: "phase-10",
    title: "FASE 10: Monitoramento e Rollback Plan",
    description: "Configurar alertas e procedimentos de emergência",
    totalHours: 2,
    completionCriteria: [
      "Alertas configurados",
      "Runbook de rollback documentado",
      "On-call definido"
    ],
    tasks: [
      { id: "10.1", title: "Configurar alertas críticos (Supabase, Graylog)", status: "pending", estimatedHours: 1 },
      { id: "10.2", title: "Criar runbook de rollback", status: "pending", estimatedHours: 0.5 },
      { id: "10.3", title: "Definir escala de on-call", status: "pending", estimatedHours: 0.5 }
    ],
    dependencies: ["phase-9"]
  }
];

export function GoLiveTracker() {
  const [phases, setPhases] = useState<Phase[]>(() => {
    const saved = localStorage.getItem("go-live-tracker");
    return saved ? JSON.parse(saved) : initialPhases;
  });

  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());

  useEffect(() => {
    localStorage.setItem("go-live-tracker", JSON.stringify(phases));
  }, [phases]);

  const togglePhase = (phaseId: string) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phaseId)) {
        next.delete(phaseId);
      } else {
        next.add(phaseId);
      }
      return next;
    });
  };

  const updateTaskStatus = (phaseId: string, taskId: string, newStatus: TaskStatus) => {
    setPhases((prev) =>
      prev.map((phase) =>
        phase.id === phaseId
          ? {
              ...phase,
              tasks: phase.tasks.map((task) =>
                task.id === taskId ? { ...task, status: newStatus } : task
              ),
            }
          : phase
      )
    );
  };

  const getPhaseProgress = (phase: Phase) => {
    const completed = phase.tasks.filter((t) => t.status === "completed").length;
    return (completed / phase.tasks.length) * 100;
  };

  const getTotalProgress = () => {
    const totalTasks = phases.reduce((sum, p) => sum + p.tasks.length, 0);
    const completedTasks = phases.reduce(
      (sum, p) => sum + p.tasks.filter((t) => t.status === "completed").length,
      0
    );
    return (completedTasks / totalTasks) * 100;
  };

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "in-progress":
        return <Clock className="h-4 w-4 text-blue-600" />;
      case "blocked":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Circle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: TaskStatus) => {
    const variants: Record<TaskStatus, string> = {
      pending: "bg-gray-100 text-gray-800",
      "in-progress": "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-green-800",
      blocked: "bg-red-100 text-red-800",
    };
    return <Badge className={variants[status]}>{status}</Badge>;
  };

  const isPhaseUnlocked = (phase: Phase) => {
    if (!phase.dependencies || phase.dependencies.length === 0) return true;
    return phase.dependencies.every((depId) => {
      const depPhase = phases.find((p) => p.id === depId);
      return depPhase && getPhaseProgress(depPhase) === 100;
    });
  };

  const resetProgress = () => {
    if (confirm("Resetar todo o progresso? Esta ação não pode ser desfeita.")) {
      setPhases(initialPhases);
      localStorage.removeItem("go-live-tracker");
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">🚀 GO-LIVE MASTERPLAN</h1>
          <p className="text-muted-foreground mt-1">
            Roadmap Técnico-Operacional - Supernet Fiber Connect
          </p>
        </div>
        <Button variant="outline" onClick={resetProgress} size="sm">
          Reset Progress
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Progresso Total</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Conclusão Geral</span>
              <span className="font-semibold">{getTotalProgress().toFixed(1)}%</span>
            </div>
            <Progress value={getTotalProgress()} className="h-3" />
            <div className="text-xs text-muted-foreground">
              {phases.reduce((sum, p) => sum + p.tasks.filter((t) => t.status === "completed").length, 0)} de{" "}
              {phases.reduce((sum, p) => sum + p.tasks.length, 0)} tarefas concluídas
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {phases.map((phase) => {
          const isUnlocked = isPhaseUnlocked(phase);
          const progress = getPhaseProgress(phase);
          const isExpanded = expandedPhases.has(phase.id);

          return (
            <Card key={phase.id} className={!isUnlocked ? "opacity-60" : ""}>
              <Collapsible open={isExpanded} onOpenChange={() => togglePhase(phase.id)}>
                <CardHeader className="cursor-pointer" onClick={() => togglePhase(phase.id)}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                        <CardTitle className="text-lg">{phase.title}</CardTitle>
                        {!isUnlocked && (
                          <Badge variant="outline" className="ml-2">
                            Bloqueado
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{phase.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>⏱️ {phase.totalHours}h estimadas</span>
                        <span>✅ {progress.toFixed(0)}% concluído</span>
                      </div>
                    </div>
                    <Progress value={progress} className="w-24 h-2" />
                  </div>
                </CardHeader>

                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Critérios de Conclusão:</h4>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                        {phase.completionCriteria.map((criteria, idx) => (
                          <li key={idx}>{criteria}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold text-sm mb-3">Tarefas:</h4>
                      <div className="space-y-2">
                        {phase.tasks.map((task) => (
                          <div
                            key={task.id}
                            className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                          >
                            <div className="flex items-center gap-2 min-w-[140px]">
                              <Checkbox
                                checked={task.status === "completed"}
                                onCheckedChange={(checked) =>
                                  updateTaskStatus(
                                    phase.id,
                                    task.id,
                                    checked ? "completed" : "pending"
                                  )
                                }
                                disabled={!isUnlocked}
                              />
                              {getStatusIcon(task.status)}
                              <span className="text-xs font-mono text-muted-foreground">
                                {task.id}
                              </span>
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{task.title}</p>
                              {task.dependencies && task.dependencies.length > 0 && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Depende de: {task.dependencies.join(", ")}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {task.estimatedHours}h
                              </span>
                              <select
                                value={task.status}
                                onChange={(e) =>
                                  updateTaskStatus(phase.id, task.id, e.target.value as TaskStatus)
                                }
                                disabled={!isUnlocked}
                                className="text-xs border rounded px-2 py-1"
                              >
                                <option value="pending">Pendente</option>
                                <option value="in-progress">Em Progresso</option>
                                <option value="completed">Concluído</option>
                                <option value="blocked">Bloqueado</option>
                              </select>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>📊 Resumo Executivo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Fases</p>
              <p className="text-2xl font-bold">{phases.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Tarefas</p>
              <p className="text-2xl font-bold">
                {phases.reduce((sum, p) => sum + p.tasks.length, 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Horas Estimadas</p>
              <p className="text-2xl font-bold">
                {phases.reduce((sum, p) => sum + p.totalHours, 0)}h
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Progresso</p>
              <p className="text-2xl font-bold">{getTotalProgress().toFixed(0)}%</p>
            </div>
          </div>
          <div className="text-xs text-muted-foreground bg-muted p-3 rounded">
            💾 Progresso salvo automaticamente no localStorage
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
