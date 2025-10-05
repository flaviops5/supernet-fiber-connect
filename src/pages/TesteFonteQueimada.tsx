import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, PlayCircle, RotateCcw, CheckCircle2, AlertCircle, Zap } from 'lucide-react';

export default function TesteFonteQueimada() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  const steps = [
    {
      title: 'Cliente entra em contato',
      description: 'Cliente reporta que a internet está offline',
      status: 'pending',
      icon: AlertCircle,
      color: 'text-yellow-500',
      details: {
        customer: 'Maria Santos',
        cpf: '123.456.789-00',
        phone: '(61) 99999-8888',
        complaint: 'Internet não está funcionando desde ontem à noite'
      }
    },
    {
      title: 'Cloé (Routing Agent) identifica o cliente',
      description: 'Validação de CPF e busca de dados no IXC',
      status: 'pending',
      icon: CheckCircle2,
      color: 'text-blue-500',
      details: {
        cpf_valid: true,
        ixc_found: true,
        client_id: '12345',
        status: 'Ativo',
        plan: 'Fibra 300MB',
        pppoe_login: 'maria.santos@fibra'
      }
    },
    {
      title: 'Cloé verifica queda em massa',
      description: 'Consulta mass_outage_events no banco de dados',
      status: 'pending',
      icon: CheckCircle2,
      color: 'text-green-500',
      details: {
        has_mass_outage: false,
        message: 'Cliente não está em região com queda em massa'
      }
    },
    {
      title: 'Transferência para Luan (Support Tech Agent)',
      description: 'Cloé identifica problema técnico e transfere',
      status: 'pending',
      icon: CheckCircle2,
      color: 'text-purple-500',
      details: {
        reason: 'Problema técnico - Internet offline',
        department: 'support_tech',
        agent: 'Luan'
      }
    },
    {
      title: 'Luan realiza diagnóstico',
      description: 'Verificação de conectividade do equipamento',
      status: 'pending',
      icon: Zap,
      color: 'text-orange-500',
      details: {
        equipment_status: 'Offline',
        last_online: 'Há 18 horas',
        signal_level: 'Sem sinal',
        diagnosis: 'Equipamento não está enviando sinal de conexão',
        probable_cause: 'Fonte de alimentação queimada'
      }
    },
    {
      title: 'Solução proposta',
      description: 'Agendamento de visita técnica',
      status: 'pending',
      icon: CheckCircle2,
      color: 'text-green-600',
      details: {
        solution: 'Substituição da fonte de alimentação',
        action: 'Visita técnica agendada',
        date: 'Amanhã',
        period: 'Manhã (08h - 12h)',
        ticket_id: 'TECH-2025-00142'
      }
    }
  ];

  const runSimulation = async () => {
    setIsRunning(true);
    setCurrentStep(0);

    for (let i = 0; i <= steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setCurrentStep(i);
    }

    setIsRunning(false);
  };

  const resetSimulation = () => {
    setCurrentStep(0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 py-12 px-4">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Simulação: Fonte Queimada
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Fluxo completo de atendimento para problema de fonte de alimentação queimada
          </p>
        </div>

        <div className="flex gap-4 justify-center">
          <Button
            onClick={runSimulation}
            disabled={isRunning}
            size="lg"
            className="min-w-[200px]"
          >
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Executando...
              </>
            ) : (
              <>
                <PlayCircle className="mr-2 h-5 w-5" />
                Iniciar Simulação
              </>
            )}
          </Button>
          <Button
            onClick={resetSimulation}
            disabled={isRunning}
            variant="outline"
            size="lg"
          >
            <RotateCcw className="mr-2 h-5 w-5" />
            Resetar
          </Button>
        </div>

        <div className="space-y-6">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = index < currentStep;
            const isCurrent = index === currentStep - 1;

            return (
              <Card
                key={index}
                className={`transition-all duration-500 ${
                  isActive
                    ? 'border-primary shadow-lg scale-[1.02]'
                    : 'opacity-50'
                } ${isCurrent ? 'ring-2 ring-primary' : ''}`}
              >
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg bg-muted ${isActive ? step.color : ''}`}>
                      <StepIcon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-xl">{step.title}</CardTitle>
                        {isActive && (
                          <Badge variant="default" className="animate-pulse">
                            Concluído
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="mt-2">
                        {step.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                {isActive && (
                  <CardContent>
                    <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                      {Object.entries(step.details).map(([key, value]) => (
                        <div key={key} className="flex items-start gap-3">
                          <span className="text-sm font-medium text-muted-foreground min-w-[140px]">
                            {key.replace(/_/g, ' ').toUpperCase()}:
                          </span>
                          <span className="text-sm font-mono">
                            {typeof value === 'boolean' ? (
                              value ? (
                                <Badge variant="default">Sim</Badge>
                              ) : (
                                <Badge variant="secondary">Não</Badge>
                              )
                            ) : (
                              value
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        {currentStep > steps.length && (
          <Card className="border-green-500 bg-green-500/5">
            <CardHeader>
              <CardTitle className="text-green-600 flex items-center gap-2">
                <CheckCircle2 className="h-6 w-6" />
                Simulação Concluída
              </CardTitle>
              <CardDescription>
                Atendimento finalizado com sucesso. Visita técnica agendada para substituição da fonte.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                <p className="text-sm">
                  <strong>Resumo:</strong> Cliente Maria Santos reportou internet offline. Após diagnóstico,
                  foi identificado que a fonte de alimentação estava queimada. Visita técnica agendada para
                  substituição do equipamento.
                </p>
                <p className="text-sm text-muted-foreground">
                  Tempo total de atendimento: ~9 segundos • Ticket: TECH-2025-00142
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
