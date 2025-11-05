import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Loader2,
  Shield,
  Database,
  Zap,
  Bell,
  HardDrive,
  Activity,
  FileText,
  Play
} from "lucide-react";

interface ValidationResult {
  category: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  details?: string[];
}

interface ValidationResponse {
  ready: boolean;
  score: number;
  summary: string;
  results: ValidationResult[];
}

export function Phase7ProductionReadiness() {
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState<ValidationResponse | null>(null);
  const { toast } = useToast();

  const phase7Checklist = [
    { 
      icon: Shield, 
      title: "Secrets de Produção", 
      items: [
        "IXC_API_TOKEN configurado",
        "EVOLUTION_API_KEY configurado",
        "OPENAI_API_KEY configurado",
        "ENCRYPTION_KEY configurado",
        "HMAC_SECRET configurado"
      ]
    },
    {
      icon: Database,
      title: "Banco de Dados",
      items: [
        "RLS habilitado em todas as tabelas",
        "Políticas de segurança configuradas",
        "Backups automáticos ativos (diários)",
        "Índices otimizados"
      ]
    },
    {
      icon: Zap,
      title: "Edge Functions",
      items: [
        "Circuit breaker ativo",
        "Rate limiting configurado",
        "HMAC validation ativa",
        "Health checks funcionando"
      ]
    },
    {
      icon: Bell,
      title: "Monitoramento",
      items: [
        "Sistema de alertas configurado",
        "Dashboards de métricas ativos",
        "DLQ processamento agendado",
        "Logs de auditoria habilitados"
      ]
    },
    {
      icon: HardDrive,
      title: "Cron Jobs",
      items: [
        "DLQ processor (a cada 5 min)",
        "Health check (a cada 2 min)",
        "Log cleanup (diário)",
        "Data anonymization (semanal)"
      ]
    },
    {
      icon: FileText,
      title: "Documentação",
      items: [
        "Guia operacional completo",
        "Runbook de emergência",
        "Procedimentos de rollback",
        "Treinamento da equipe"
      ]
    }
  ];

  const runValidation = async () => {
    setValidating(true);
    try {
      const { data, error } = await supabase.functions.invoke('validate-production-readiness');
      
      if (error) throw error;
      
      setValidation(data);
      
      if (data.ready) {
        toast({
          title: "✅ Ambiente Pronto para Produção!",
          description: `Score: ${data.score}% - ${data.summary}`,
        });
      } else {
        toast({
          title: "⚠️ Ações Necessárias",
          description: data.summary,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro na Validação",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setValidating(false);
    }
  };

  const getValidationIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="w-5 h-5 text-success" />;
      case "warning":
        return <AlertCircle className="w-5 h-5 text-warning" />;
      case "error":
        return <XCircle className="w-5 h-5 text-destructive" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">FASE 7: Preparação de Ambiente de Produção</h2>
          <p className="text-muted-foreground mt-2">
            Validação completa de prontidão para deploy
          </p>
        </div>
        <Button 
          onClick={runValidation}
          disabled={validating}
          size="lg"
          className="gap-2"
        >
          {validating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Validando...
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              Executar Validação
            </>
          )}
        </Button>
      </div>

      {validation && (
        <Alert variant={validation.ready ? "default" : "destructive"} className="border-2">
          <Shield className="h-5 w-5" />
          <AlertTitle className="text-lg font-bold">
            {validation.ready ? "✅ Ambiente Pronto para Go-Live" : "⚠️ Correções Necessárias"}
          </AlertTitle>
          <AlertDescription className="mt-3">
            <div className="flex items-center gap-4 mb-2">
              <div className="flex-1">
                <Progress value={validation.score} className="h-3" />
              </div>
              <span className="font-bold text-2xl">{validation.score}%</span>
            </div>
            <p className="text-base">{validation.summary}</p>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {phase7Checklist.map((section, idx) => {
          const Icon = section.icon;
          return (
            <Card key={idx} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon className="w-5 h-5 text-primary" />
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {section.items.map((item, itemIdx) => (
                    <li key={itemIdx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {validation && validation.results.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            Resultados da Validação
          </h3>
          
          <div className="grid gap-4">
            {validation.results.map((result, idx) => (
              <Card key={idx} className={
                result.status === 'success' ? 'border-success/50' :
                result.status === 'warning' ? 'border-warning/50' :
                'border-destructive/50'
              }>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {getValidationIcon(result.status)}
                    <span>{result.category}</span>
                    <Badge variant={
                      result.status === 'success' ? 'default' :
                      result.status === 'warning' ? 'secondary' : 'destructive'
                    }>
                      {result.status.toUpperCase()}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-3 font-medium">{result.message}</p>
                  {result.details && result.details.length > 0 && (
                    <div className="bg-muted/50 p-3 rounded-md">
                      <ul className="space-y-1">
                        {result.details.map((detail, detailIdx) => (
                          <li key={detailIdx} className="text-sm text-muted-foreground">
                            • {detail}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {!validation && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Shield className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Validação Pendente</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Execute a validação automática para verificar se todos os componentes críticos
              estão configurados e prontos para produção.
            </p>
            <Button onClick={runValidation} disabled={validating} size="lg">
              {validating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Validando...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-2" />
                  Iniciar Validação Completa
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
