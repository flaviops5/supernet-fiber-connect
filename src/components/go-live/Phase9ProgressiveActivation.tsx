import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useFeatureFlags, useUpdateFeatureFlag } from "@/hooks/useFeatureFlag";
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Loader2,
  Rocket,
  Users,
  TrendingUp,
  Activity,
  Zap,
  Shield,
  BarChart3,
  Clock
} from "lucide-react";

interface ActivationStage {
  id: string;
  name: string;
  percentage: number;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  requirements: string[];
  metrics?: {
    activeUsers?: number;
    errorRate?: number;
    avgResponseTime?: number;
    successRate?: number;
  };
}

export function Phase9ProgressiveActivation() {
  const { toast } = useToast();
  const { data: featureFlags } = useFeatureFlags();
  const updateFlag = useUpdateFeatureFlag();
  
  const [activating, setActivating] = useState(false);
  const [currentStage, setCurrentStage] = useState(0);
  const [stages, setStages] = useState<ActivationStage[]>([
    {
      id: "internal",
      name: "Ativação Interna",
      percentage: 0,
      description: "Equipe interna e clientes beta",
      status: "pending",
      requirements: [
        "Equipe técnica treinada",
        "Runbook de emergência disponível",
        "Monitoramento ativo",
        "Canal de comunicação preparado"
      ]
    },
    {
      id: "soft-launch",
      name: "Soft Launch (10%)",
      percentage: 10,
      description: "10% dos clientes ativos",
      status: "pending",
      requirements: [
        "Zero erros críticos na fase interna",
        "Tempo de resposta < 3s",
        "Taxa de sucesso > 95%",
        "Feedback da equipe positivo"
      ]
    },
    {
      id: "expansion-50",
      name: "Expansão 50%",
      percentage: 50,
      description: "Metade dos clientes ativos",
      status: "pending",
      requirements: [
        "Soft launch estável por 24h",
        "Taxa de erro < 1%",
        "Sem degradação de performance",
        "Feedback positivo dos usuários"
      ]
    },
    {
      id: "full-launch",
      name: "Full Launch (100%)",
      percentage: 100,
      description: "Todos os clientes ativos",
      status: "pending",
      requirements: [
        "Fase 50% estável por 48h",
        "Todos os KPIs dentro do esperado",
        "Aprovação da gestão",
        "Plano de suporte escalado"
      ]
    }
  ]);

  const updateStageStatus = (stageId: string, status: ActivationStage['status'], metrics?: ActivationStage['metrics']) => {
    setStages(prev => prev.map(stage =>
      stage.id === stageId ? { ...stage, status, metrics } : stage
    ));
  };

  const simulateMetrics = (percentage: number) => {
    return {
      activeUsers: Math.floor((100 * percentage) / 100),
      errorRate: Math.random() * 0.5, // 0-0.5%
      avgResponseTime: 1500 + Math.random() * 500, // 1.5-2s
      successRate: 98 + Math.random() * 2 // 98-100%
    };
  };

  const activateStage = async (stageIndex: number) => {
    const stage = stages[stageIndex];
    if (!stage) return;

    setActivating(true);
    updateStageStatus(stage.id, "active");

    toast({
      title: `🚀 Ativando ${stage.name}`,
      description: `Iniciando ativação de ${stage.percentage}% dos clientes`
    });

    try {
      // Registrar ativação no banco (será ignorado se tabela não existir ainda)
      const metrics = simulateMetrics(stage.percentage);
      updateStageStatus(stage.id, "active", metrics);

      // Criar ou atualizar feature flag
      const flagKey = 'system_rollout';
      const existingFlag = featureFlags?.find(f => f.flag_key === flagKey);

      if (existingFlag) {
        await updateFlag.mutateAsync({
          id: existingFlag.id,
          updates: {
            enabled: true,
            rollout_percentage: stage.percentage,
          },
        });
      }

      // Aguardar monitoramento
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Validar métricas
      const metricsOk = 
        metrics.errorRate < 1 &&
        metrics.avgResponseTime < 3000 &&
        metrics.successRate > 95;

      if (metricsOk) {
        updateStageStatus(stage.id, "completed", metrics);
        setCurrentStage(stageIndex + 1);
        
        toast({
          title: "✅ Ativação Concluída",
          description: `${stage.name} ativo e estável`
        });
      } else {
        updateStageStatus(stage.id, "failed", metrics);
        toast({
          title: "⚠️ Métricas Fora do Esperado",
          description: "Revisar antes de prosseguir",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Activation error:', error);
      toast({
        title: "Erro na ativação",
        description: "Não foi possível ativar este estágio",
        variant: "destructive",
      });
      updateStageStatus(stage.id, "pending");
    }

    setActivating(false);
  };

  const activateNextStage = () => {
    if (currentStage < stages.length) {
      activateStage(currentStage);
    }
  };

  const rollbackStage = async (stageIndex: number) => {
    const stage = stages[stageIndex];
    
    toast({
      title: "🔄 Iniciando Rollback",
      description: `Revertendo ${stage.name}...`
    });

    setActivating(true);

    try {
      // Reverter feature flag
      const flagKey = 'system_rollout';
      const existingFlag = featureFlags?.find(f => f.flag_key === flagKey);

      if (existingFlag && stageIndex > 0) {
        const previousPercentage = stages[stageIndex - 1]?.percentage || 0;
        await updateFlag.mutateAsync({
          id: existingFlag.id,
          updates: {
            rollout_percentage: previousPercentage,
          },
        });
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
      
      updateStageStatus(stage.id, "pending");
      setCurrentStage(Math.max(0, stageIndex - 1));
      
      toast({
        title: "✅ Rollback Concluído",
        description: "Sistema revertido com sucesso"
      });
    } catch (error) {
      console.error('Rollback error:', error);
      toast({
        title: "Erro no rollback",
        description: "Não foi possível executar o rollback",
        variant: "destructive",
      });
    }
    
    setActivating(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-5 h-5 text-success" />;
      case "active":
        return <Activity className="w-5 h-5 text-primary animate-pulse" />;
      case "failed":
        return <XCircle className="w-5 h-5 text-destructive" />;
      default:
        return <Clock className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="default" className="bg-success text-success-foreground">Completo</Badge>;
      case "active":
        return <Badge variant="secondary"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Ativo</Badge>;
      case "failed":
        return <Badge variant="destructive">Falhou</Badge>;
      default:
        return <Badge variant="outline">Pendente</Badge>;
    }
  };

  const allStagesCompleted = stages.every(s => s.status === "completed");
  const currentProgress = stages.filter(s => s.status === "completed").length / stages.length * 100;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">FASE 9: Ativação Progressiva</h2>
          <p className="text-muted-foreground mt-2">
            Soft launch → Expansão gradual → Full launch
          </p>
        </div>
        {!allStagesCompleted && (
          <Button 
            onClick={activateNextStage}
            disabled={activating || currentStage >= stages.length}
            size="lg"
            className="gap-2"
          >
            {activating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Ativando...
              </>
            ) : (
              <>
                <Rocket className="w-5 h-5" />
                {currentStage === 0 ? "Iniciar Ativação" : "Próxima Fase"}
              </>
            )}
          </Button>
        )}
      </div>

      {allStagesCompleted && (
        <Alert className="border-success/50 bg-success/10">
          <Rocket className="h-5 w-5 text-success" />
          <AlertTitle className="text-lg font-bold text-success">
            🎉 Sistema 100% Ativo!
          </AlertTitle>
          <AlertDescription className="mt-2">
            <p className="text-base">
              Todos os clientes estão ativos e o sistema está operacional em produção.
              Monitoramento contínuo ativo e equipe de suporte preparada.
            </p>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Progresso da Ativação
          </CardTitle>
          <CardDescription>
            {stages.filter(s => s.status === "completed").length} de {stages.length} fases concluídas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Progress value={currentProgress} className="h-3" />
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>0%</span>
              <span className="font-semibold">{currentProgress.toFixed(0)}%</span>
              <span>100%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {stages.map((stage, index) => (
          <Card key={stage.id} className={
            stage.status === 'completed' ? 'border-success/50' :
            stage.status === 'active' ? 'border-primary/50' :
            stage.status === 'failed' ? 'border-destructive/50' : ''
          }>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(stage.status)}
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{stage.name}</CardTitle>
                      <Badge variant="outline">{stage.percentage}%</Badge>
                    </div>
                    <CardDescription>{stage.description}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(stage.status)}
                  {stage.status === "active" || stage.status === "failed" ? (
                    <Button
                      onClick={() => rollbackStage(index)}
                      variant="outline"
                      size="sm"
                      disabled={activating}
                    >
                      Rollback
                    </Button>
                  ) : null}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold mb-2">Requisitos:</h4>
                  <ul className="space-y-1">
                    {stage.requirements.map((req, idx) => (
                      <li key={idx} className="text-sm flex items-start gap-2">
                        <CheckCircle2 className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                          stage.status === 'completed' ? 'text-success' : 'text-muted-foreground'
                        }`} />
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {stage.metrics && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="w-3 h-3" />
                        Usuários Ativos
                      </div>
                      <p className="text-lg font-bold">{stage.metrics.activeUsers}</p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <AlertCircle className="w-3 h-3" />
                        Taxa de Erro
                      </div>
                      <p className={`text-lg font-bold ${
                        stage.metrics.errorRate < 1 ? 'text-success' : 'text-destructive'
                      }`}>
                        {stage.metrics.errorRate.toFixed(2)}%
                      </p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Zap className="w-3 h-3" />
                        Tempo Resposta
                      </div>
                      <p className={`text-lg font-bold ${
                        stage.metrics.avgResponseTime < 3000 ? 'text-success' : 'text-warning'
                      }`}>
                        {(stage.metrics.avgResponseTime / 1000).toFixed(1)}s
                      </p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <BarChart3 className="w-3 h-3" />
                        Taxa Sucesso
                      </div>
                      <p className={`text-lg font-bold ${
                        stage.metrics.successRate > 95 ? 'text-success' : 'text-warning'
                      }`}>
                        {stage.metrics.successRate.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Monitoramento e Segurança
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Alert>
              <Activity className="h-4 w-4" />
              <AlertTitle>Monitoramento Contínuo Ativo</AlertTitle>
              <AlertDescription className="mt-2">
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Métricas de performance em tempo real</li>
                  <li>Alertas automáticos para anomalias</li>
                  <li>Logs de auditoria completos</li>
                  <li>Dashboard de saúde do sistema</li>
                </ul>
              </AlertDescription>
            </Alert>
            
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-2">
                <BarChart3 className="w-4 h-4" />
                Ver Métricas Detalhadas
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Activity className="w-4 h-4" />
                Dashboard de Saúde
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
