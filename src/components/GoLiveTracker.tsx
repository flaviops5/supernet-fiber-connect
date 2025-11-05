import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Clock, AlertCircle, ChevronDown, ChevronRight, Shield, Phone, Brain, DollarSign, Radio, MessageSquare, BarChart3, Zap, Database, TrendingUp, Activity } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfrastructureValidator } from "./go-live/InfrastructureValidator";

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

interface GoLiveCriterion {
  id: string;
  icon: any;
  title: string;
  description: string;
  requirements: string[];
  validated: boolean;
  relatedPhases: string[];
}

const goLiveCriteria: GoLiveCriterion[] = [
  {
    id: "comunicacao-canal",
    icon: Phone,
    title: "🧩 I. Comunicação e Canal Oficial",
    description: "Sistema conectado ao WhatsApp Business API da Meta",
    requirements: [
      "1️⃣ Recebimento via WhatsApp Oficial - Sistema conectado ao número verificado da Meta (API Business)",
      "2️⃣ Envio via WhatsApp Oficial - Mensagens enviadas pelo canal oficial (Evolution + HSM Meta)",
      "3️⃣ Atalhos HSM - Botões de 'iniciar conversa' (💬 Falar com Suporte / 💵 Segunda Via / ⚡ Sem Internet)",
      "4️⃣ Histórico de Conversas - Operadores e agentes IA visualizam todo o histórico no Omnichannel"
    ],
    validated: false,
    relatedPhases: ["phase-1", "phase-8", "phase-9"]
  },
  {
    id: "roteamento-ia",
    icon: Brain,
    title: "🧠 II. Roteamento e Inteligência (Cloé Martins)",
    description: "IA classifica e roteia automaticamente",
    requirements: [
      "5️⃣ Classificação automática - Detectar se cliente precisa de suporte técnico, financeiro ou comercial",
      "6️⃣ Roteamento dinâmico - Encaminhar para agente certo (Luan, Julia/Sofia, Vicente) com base em CPF e contexto",
      "7️⃣ Escalação humana - Transferência automática para atendente humano com contexto preservado"
    ],
    validated: false,
    relatedPhases: ["phase-0", "phase-0.5", "phase-6"]
  },
  {
    id: "modulo-financeiro",
    icon: DollarSign,
    title: "💰 III. Módulo Financeiro (Julia/Sofia)",
    description: "Gestão completa de faturas e pagamentos",
    requirements: [
      "8️⃣ Segunda via de boleto (.PDF) - Gerar e enviar fatura em PDF diretamente via IXC",
      "9️⃣ PIX dinâmico - Gerar PIX válido pelo IXC quando solicitado",
      "🔟 Detecção de bloqueio/pendência - Verificar status financeiro do cliente",
      "1️⃣1️⃣ Liberação de acesso - Aplicar regras de desbloqueio conforme política",
      "1️⃣2️⃣ Lembrete de vencimento - Enviar lembrete automático antes da data limite"
    ],
    validated: false,
    relatedPhases: ["phase-2", "phase-4"]
  },
  {
    id: "modulo-tecnico",
    icon: Radio,
    title: "⚙️ IV. Módulo Técnico (Luan/Érik)",
    description: "Diagnóstico e monitoramento de rede",
    requirements: [
      "1️⃣3️⃣ Verificação de conexão - Mostrar status ONLINE = SIM/NÃO no painel do Omnichannel",
      "1️⃣4️⃣ Abertura de atendimento técnico (IXC) - Criar automaticamente ticket técnico no IXC",
      "1️⃣5️⃣ Integração GPON/IXC - Validar status ONU, IP PPPoE e CTO acessíveis",
      "1️⃣6️⃣ Detecção de quedas em massa - Módulo mass-outage-helper ativo com notificações automáticas"
    ],
    validated: false,
    relatedPhases: ["phase-3", "phase-5", "phase-6"]
  },
  {
    id: "omnichannel-integrado",
    icon: MessageSquare,
    title: "💬 V. Omnichannel Integrado",
    description: "Integração total IXC ↔ Omnichannel",
    requirements: [
      "1️⃣7️⃣ Integração total IXC ↔ Omnichannel - Dados de cliente disponíveis em tempo real",
      "1️⃣8️⃣ Abertura de tickets no IXC - Ação direta no chat: 'Abrir atendimento técnico/financeiro'",
      "1️⃣9️⃣ Atualização bidirecional - Atualizações do IXC refletidas no chat e vice-versa",
      "2️⃣0️⃣ Visão do cliente - Card com nome, CPF, status, IP, ONU online/offline, plano"
    ],
    validated: false,
    relatedPhases: ["phase-6", "phase-9"]
  },
  {
    id: "dashboards-monitoramento",
    icon: BarChart3,
    title: "📊 VI. Dashboards e Monitoramento",
    description: "Painéis de controle em tempo real",
    requirements: [
      "2️⃣1️⃣ Dash Técnico - Exibir atendimentos, mass outage, auto-reboots, ONUs off",
      "2️⃣2️⃣ Dash Financeiro - MRR, inadimplência, faturamento, liberações, PIX enviados",
      "2️⃣3️⃣ Dash Omnichannel - Conversas ativas, agentes online, taxa de transferência IA → humano",
      "2️⃣4️⃣ Dash de Performance - Tempo médio de resposta, latência edge functions, uptime geral"
    ],
    validated: false,
    relatedPhases: ["phase-7", "phase-10"]
  },
  {
    id: "controle-producao",
    icon: Shield,
    title: "🧱 VII. Controle de Produção e Auditoria",
    description: "Segurança e rastreabilidade total",
    requirements: [
      "2️⃣5️⃣ Structured Logging ativo - Nenhum console.log, todos os eventos via logger auditável",
      "2️⃣6️⃣ QA Orchestrator diário - Execução automática com taxa ≥ 90%",
      "2️⃣7️⃣ Rollback seguro - Mecanismo de reversão de deploy e alertas automáticos",
      "2️⃣8️⃣ Certificação de Go-Live - Checklist 'Production Readiness' 100% concluído"
    ],
    validated: false,
    relatedPhases: ["phase-0", "phase-0.5", "phase-7", "phase-10"]
  },
  {
    id: "kpis-sucesso",
    icon: TrendingUp,
    title: "🧩 VIII. KPIs de Sucesso do Go-Live",
    description: "Metas de desempenho operacional",
    requirements: [
      "📊 Latência média de resposta ≤ 3s",
      "📊 Taxa de sucesso QA diário ≥ 90%",
      "📊 Tempo médio de primeira resposta ≤ 15s",
      "📊 Estabilidade de mensagens Meta ≥ 99% entrega",
      "📊 Uptime das funções Edge ≥ 99,5%",
      "📊 Erros críticos (Graylog) ≤ 0,5% das requisições"
    ],
    validated: false,
    relatedPhases: ["phase-10"]
  }
];


// Versão do schema - incrementar quando houver mudanças importantes
const TRACKER_VERSION = 5;

const initialPhases: Phase[] = [
  {
    id: "phase-0",
    title: "🔥 FASE 0: Logger Migration Completa (CRÍTICO)",
    description: "Migrar todos console.log para logger estruturado - ESSENCIAL para debugar produção",
    totalHours: 4,
    completionCriteria: [
      "Zero console.log em edge functions críticas",
      "Todos os logs salvos em monitoring_logs",
      "Logs estruturados com metadata adequada",
      "Dashboard de logs funcionando"
    ],
    tasks: [
      { id: "0.1", title: "✅ Migrar routing-agent (Cloé) para logger estruturado", status: "completed", estimatedHours: 0.75 },
      { id: "0.2", title: "✅ Migrar support-financial-agent (Julia) para logger", status: "completed", estimatedHours: 0.75 },
      { id: "0.3", title: "✅ Migrar support-tech-agent (Luan) para logger", status: "completed", estimatedHours: 0.75 },
      { id: "0.4", title: "✅ Migrar sales-agent para logger", status: "completed", estimatedHours: 0.75 },
      { id: "0.5", title: "✅ Migrar automacao-agent para logger", status: "completed", estimatedHours: 0.5 },
      { id: "0.6", title: "✅ Migrar telemedicina-agent para logger", status: "completed", estimatedHours: 0.5 },
      { id: "0.7", title: "Criar LOGGER-MIGRATION-TRACKING.md", status: "completed", estimatedHours: 0.25 }
    ]
  },
  {
    id: "phase-0.5",
    title: "🔥 FASE 0.5: TypeScript Zero-Any Backend (CRÍTICO)",
    description: "Eliminar 'any' em Edge Functions críticas - prevenir crashes em produção",
    totalHours: 6,
    completionCriteria: [
      "Zero 'any' em edge functions críticas",
      "Tipos importados de _shared/types.ts",
      "TypeScript strict mode passando",
      "Autocomplete funcionando 100%"
    ],
    tasks: [
      { id: "0.5.1", title: "✅ Migrar log-sanitizer.ts (5 any eliminados)", status: "completed", estimatedHours: 0.5 },
      { id: "0.5.2", title: "✅ Migrar ixc-client.ts (2 any eliminados)", status: "completed", estimatedHours: 0.5 },
      { id: "0.5.3", title: "✅ Migrar base-handler.ts (1 any eliminado)", status: "completed", estimatedHours: 0.5 },
      { id: "0.5.4", title: "✅ Migrar aging.ts (2 any eliminados)", status: "completed", estimatedHours: 0.25 },
      { id: "0.5.5", title: "✅ Migrar flow-state.ts (3 any eliminados)", status: "completed", estimatedHours: 0.5 },
      { id: "0.5.6", title: "✅ Migrar geo.ts (6 any eliminados)", status: "completed", estimatedHours: 1 },
      { id: "0.5.7", title: "✅ Migrar replies.ts (3 any eliminados)", status: "completed", estimatedHours: 0.5 },
      { id: "0.5.8", title: "✅ Migrar retests.ts (1 any eliminado)", status: "completed", estimatedHours: 0.25 },
      { id: "0.5.9", title: "✅ Migrar onu-tracker.ts (1 any eliminado)", status: "completed", estimatedHours: 0.25 },
      { id: "0.5.10", title: "✅ Criar FASE-0.5-PROGRESSO.md", status: "completed", estimatedHours: 0.25 }
    ]
  },
  {
    id: "phase-1",
    title: "✅ FASE 1: Validação de Infraestrutura",
    description: "Verificar todas as credenciais e integrações",
    totalHours: 3,
    completionCriteria: [
      "Todas as credenciais verificadas",
      "IXC API respondendo",
      "Evolution API conectada",
      "Supabase Health OK"
    ],
    tasks: [
      { id: "1.1", title: "✅ Verificar credenciais IXC (API URL, Token, Cliente ID)", status: "completed", estimatedHours: 0.5 },
      { id: "1.2", title: "✅ Verificar credenciais Evolution API (URL, Instance, API Key)", status: "completed", estimatedHours: 0.5 },
      { id: "1.3", title: "✅ Testar ixc-proxy endpoint", status: "completed", estimatedHours: 1, dependencies: ["1.1"] },
      { id: "1.4", title: "✅ Validar System Health Dashboard", status: "completed", estimatedHours: 1, dependencies: ["1.2", "1.3"] }
    ],
    dependencies: ["phase-0", "phase-0.5"]
  },
  {
    id: "phase-2",
    title: "✅ FASE 2: Correção Julia - Envio de Boletos",
    description: "Implementar funcionalidade de envio de segunda via",
    totalHours: 4,
    completionCriteria: [
      "Tool getAndSendBoleto implementado",
      "Julia reconhece pedido de boleto",
      "WhatsApp envia PDF/link corretamente"
    ],
    tasks: [
      { id: "2.1", title: "✅ Criar tool getAndSendBoleto no support-financial-agent", status: "completed", estimatedHours: 2 },
      { id: "2.2", title: "✅ Atualizar prompt da Julia para reconhecer pedidos de boleto", status: "completed", estimatedHours: 1, dependencies: ["2.1"] },
      { id: "2.3", title: "✅ Testar envio via WhatsApp", status: "completed", estimatedHours: 1, dependencies: ["2.2"] }
    ],
    dependencies: ["phase-1"]
  },
  {
    id: "phase-3",
    title: "✅ FASE 3: Mass Outage - Automação Completa",
    description: "Configurar detecção e notificação automática de quedas",
    totalHours: 5,
    completionCriteria: [
      "CRON Job configurado (5 min)",
      "Detecção agrupando PON/CTO",
      "Notificações WhatsApp enviadas",
      "Tickets IXC criados automaticamente"
    ],
    tasks: [
      { id: "3.1", title: "✅ Criar Supabase Cron Job para detect-mass-outage", status: "completed", estimatedHours: 2 },
      { id: "3.2", title: "✅ Validar mass-outage-executor (notificações)", status: "completed", estimatedHours: 1.5, dependencies: ["3.1"] },
      { id: "3.3", title: "✅ Validar criação de tickets IXC", status: "completed", estimatedHours: 1, dependencies: ["3.2"] },
      { id: "3.4", title: "✅ Teste completo: simular → detectar → notificar", status: "completed", estimatedHours: 0.5, dependencies: ["3.3"] }
    ],
    dependencies: ["phase-1"]
  },
  {
    id: "phase-4",
    title: "✅ FASE 4: Desbloqueio Automático - Validação",
    description: "Garantir que Julia desbloqueia após pagamento",
    totalHours: 3,
    completionCriteria: [
      "Julia detecta pagamento confirmado",
      "Chamada para ixc-integration/unblock funciona",
      "Cliente recebe confirmação via WhatsApp"
    ],
    tasks: [
      { id: "4.1", title: "✅ Validar fluxo de pagamento → trigger → Julia", status: "completed", estimatedHours: 1.5 },
      { id: "4.2", title: "✅ Testar ixc-integration endpoint /unblock", status: "completed", estimatedHours: 1, dependencies: ["4.1"] },
      { id: "4.3", title: "✅ QA end-to-end com cliente teste", status: "completed", estimatedHours: 0.5, dependencies: ["4.2"] }
    ],
    dependencies: ["phase-1", "phase-2"]
  },
  {
    id: "phase-5",
    title: "✅ FASE 5: Auto-Reboot - Validação e Tune",
    description: "Validar reboot automático de ONUs travadas",
    totalHours: 3,
    completionCriteria: [
      "GPON API respondendo",
      "auto_reboot_settings configurado",
      "Logs de reboot registrados"
    ],
    tasks: [
      { id: "5.1", title: "✅ Validar endpoint GPON API", status: "completed", estimatedHours: 1 },
      { id: "5.2", title: "✅ Configurar auto_reboot_settings (thresholds)", status: "completed", estimatedHours: 1, dependencies: ["5.1"] },
      { id: "5.3", title: "✅ QA: forçar reboot e validar logs", status: "completed", estimatedHours: 1, dependencies: ["5.2"] }
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
  },
  {
    id: "phase-11",
    title: "📊 FASE 11: TypeScript Zero-Any Frontend (PÓS-LIVE)",
    description: "Eliminar 'any' restantes no frontend - melhoria contínua",
    totalHours: 8,
    completionCriteria: [
      "Zero 'any' em frontend",
      "ESLint passando sem warnings",
      "Autocomplete 100% funcional",
      "IDE performance melhorada"
    ],
    tasks: [
      { id: "11.1", title: "Eliminar 'any' em components/", status: "pending", estimatedHours: 3 },
      { id: "11.2", title: "Eliminar 'any' em hooks/", status: "pending", estimatedHours: 2 },
      { id: "11.3", title: "Eliminar 'any' em utils/", status: "pending", estimatedHours: 2 },
      { id: "11.4", title: "Validar com ESLint @typescript-eslint/no-explicit-any", status: "pending", estimatedHours: 1 }
    ],
    dependencies: ["phase-10"]
  },
  {
    id: "phase-12",
    title: "📊 FASE 12: Arquitetura Enterprise (PÓS-LIVE)",
    description: "Refactoring completo para padrões enterprise - longo prazo",
    totalHours: 12,
    completionCriteria: [
      "Padrões enterprise implementados",
      "Code coverage > 80%",
      "CI/CD pipeline funcionando",
      "Documentação completa e atualizada"
    ],
    tasks: [
      { id: "12.1", title: "Implementar Design Patterns (Factory, Strategy, Observer)", status: "pending", estimatedHours: 4 },
      { id: "12.2", title: "Criar camada de Repository Pattern", status: "pending", estimatedHours: 3 },
      { id: "12.3", title: "Implementar Unit Tests (>80% coverage)", status: "pending", estimatedHours: 3 },
      { id: "12.4", title: "CI/CD com automated tests", status: "pending", estimatedHours: 1 },
      { id: "12.5", title: "Documentação API completa", status: "pending", estimatedHours: 1 }
    ],
    dependencies: ["phase-11"]
  }
];

export function GoLiveTracker() {
  const [phases, setPhases] = useState<Phase[]>(() => {
    const saved = localStorage.getItem("go-live-tracker");
    const savedVersion = localStorage.getItem("go-live-tracker-version");
    
    // Se não há dados salvos ou versão mudou, usar initialPhases
    if (!saved || !savedVersion || parseInt(savedVersion) !== TRACKER_VERSION) {
      localStorage.setItem("go-live-tracker-version", TRACKER_VERSION.toString());
      return initialPhases;
    }
    
    // Se versão é a mesma, fazer merge inteligente
    const savedPhases: Phase[] = JSON.parse(saved);
    
    // Merge: preservar progresso do usuário, mas aplicar mudanças do initialPhases
    return initialPhases.map(initialPhase => {
      const savedPhase = savedPhases.find(p => p.id === initialPhase.id);
      
      if (!savedPhase) return initialPhase;
      
      // Merge tasks: se tarefa foi marcada como completed no initialPhases, manter completed
      const mergedTasks = initialPhase.tasks.map(initialTask => {
        const savedTask = savedPhase.tasks.find(t => t.id === initialTask.id);
        
        if (!savedTask) return initialTask;
        
        // Se tarefa está completed no initialPhases, usar esse status
        if (initialTask.status === "completed") {
          return { ...initialTask, status: "completed" as TaskStatus };
        }
        
        // Caso contrário, preservar status do usuário
        return { ...savedTask, status: savedTask.status as TaskStatus };
      });
      
      return { ...initialPhase, tasks: mergedTasks };
    });
  });

  // Abrir Fases 0 e 0.5 por padrão (críticas para go-live)
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set(["phase-0", "phase-0.5"]));

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
          <p className="text-sm text-orange-500 font-semibold mt-2">
            ⚠️ FASES 0 e 0.5 são CRÍTICAS - sem elas, debugar produção será impossível
          </p>
        </div>
        <Button variant="outline" onClick={resetProgress} size="sm">
          Reset Progress
        </Button>
      </div>

      {/* Critérios Obrigatórios de Go-Live */}
      <Alert className="border-red-500 bg-red-50">
        <Shield className="h-5 w-5 text-red-600" />
        <AlertTitle className="text-red-900 font-bold">
          ⚠️ CRITÉRIOS OBRIGATÓRIOS DE GO-LIVE
        </AlertTitle>
        <AlertDescription className="text-red-800 text-sm mt-2">
          O sistema <strong>NÃO PODE</strong> ser colocado em produção até que TODOS os critérios abaixo estejam 100% validados.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {goLiveCriteria.map((criterion) => {
          const Icon = criterion.icon;
          const relatedPhasesCompleted = criterion.relatedPhases.every(phaseId => {
            const phase = phases.find(p => p.id === phaseId);
            return phase && getPhaseProgress(phase) === 100;
          });

          return (
            <Card key={criterion.id} className={relatedPhasesCompleted ? "border-green-500" : "border-orange-500"}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className={`h-6 w-6 ${relatedPhasesCompleted ? "text-green-600" : "text-orange-600"}`} />
                    <div>
                      <CardTitle className="text-base">{criterion.title}</CardTitle>
                      <CardDescription className="text-sm">{criterion.description}</CardDescription>
                    </div>
                  </div>
                  {relatedPhasesCompleted ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">
                    {criterion.id === "kpis-sucesso" ? "Metas:" : "Requisitos:"}
                  </p>
                  <ul className="space-y-1.5">
                    {criterion.requirements.map((req, idx) => (
                      <li key={idx} className="text-xs flex items-start gap-2">
                        {criterion.id === "kpis-sucesso" ? (
                          <Activity className="h-3 w-3 mt-0.5 flex-shrink-0 text-primary" />
                        ) : (
                          <CheckCircle2 className={`h-3 w-3 mt-0.5 flex-shrink-0 ${relatedPhasesCompleted ? "text-green-600" : "text-gray-400"}`} />
                        )}
                        <span className={relatedPhasesCompleted && criterion.id !== "kpis-sucesso" ? "text-green-700 font-medium" : ""}>{req}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-muted-foreground">
                      Fases relacionadas: {criterion.relatedPhases.map(id => {
                        const phase = phases.find(p => p.id === id);
                        return phase?.title.split(':')[0];
                      }).join(', ')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
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

                    {phase.id === "phase-1" && (
                      <div className="my-6">
                        <InfrastructureValidator />
                      </div>
                    )}

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
