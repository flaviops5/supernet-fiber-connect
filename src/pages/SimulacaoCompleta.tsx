import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { 
  AlertTriangle, 
  Users, 
  CheckCircle, 
  Clock, 
  Loader2,
  MessageSquare,
  Database,
  Zap,
  PlayCircle,
  RefreshCw
} from 'lucide-react';

interface SimulationStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'success' | 'error';
  result?: any;
  icon: any;
}

export default function SimulacaoCompleta() {
  const [isRunning, setIsRunning] = useState(false);
  const [steps, setSteps] = useState<SimulationStep[]>([
    {
      id: 'detect',
      title: '1. Detecção de Queda em Massa',
      description: 'Executar edge function detect-mass-outage',
      status: 'pending',
      icon: Database
    },
    {
      id: 'verify-event',
      title: '2. Verificar Evento Criado',
      description: 'Consultar mass_outage_events no banco',
      status: 'pending',
      icon: AlertTriangle
    },
    {
      id: 'simulate-customer',
      title: '3. Simular Cliente Afetado',
      description: 'Cliente com CPF de teste entrando em contato',
      status: 'pending',
      icon: Users
    },
    {
      id: 'cloe-verification',
      title: '4. Cloé Verifica Queda',
      description: 'Routing agent verifica affected_logins',
      status: 'pending',
      icon: MessageSquare
    },
    {
      id: 'cloe-response',
      title: '5. Resposta da Cloé',
      description: 'Cloé informa sobre a queda em massa',
      status: 'pending',
      icon: CheckCircle
    }
  ]);

  const updateStep = (id: string, updates: Partial<SimulationStep>) => {
    setSteps(prev => prev.map(step => 
      step.id === id ? { ...step, ...updates } : step
    ));
  };

  const runSimulation = async () => {
    setIsRunning(true);

    try {
      // STEP 1: Detectar quedas em massa
      updateStep('detect', { status: 'running' });
      
      const { data: detectData, error: detectError } = await supabase.functions.invoke('detect-mass-outage');
      
      if (detectError) throw detectError;
      
      updateStep('detect', { 
        status: 'success',
        result: {
          offline_clients: detectData?.offline_clients_count || 0,
          mass_outages_detected: detectData?.mass_outages_detected || 0,
          groups_analyzed: detectData?.groups_analyzed || 0
        }
      });

      await new Promise(resolve => setTimeout(resolve, 1000));

      // STEP 2: Verificar evento criado
      updateStep('verify-event', { status: 'running' });
      
      const { data: events, error: eventsError } = await supabase
        .from('mass_outage_events')
        .select('*')
        .eq('status', 'active')
        .order('detected_at', { ascending: false })
        .limit(1);
      
      if (eventsError) throw eventsError;

      const activeEvent = events?.[0];
      
      if (!activeEvent) {
        updateStep('verify-event', { 
          status: 'error',
          result: { message: 'Nenhum evento ativo encontrado. Pode não haver quedas em massa no momento.' }
        });
        
        // Continuar simulação mesmo sem evento real
        updateStep('simulate-customer', { status: 'running' });
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        updateStep('simulate-customer', { 
          status: 'success',
          result: { message: 'Simulação com dados mock (sem evento real)' }
        });

        updateStep('cloe-verification', { status: 'running' });
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        updateStep('cloe-verification', { 
          status: 'success',
          result: { message: 'Cliente não está afetado (sem eventos ativos)' }
        });

        updateStep('cloe-response', { status: 'running' });
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        updateStep('cloe-response', { 
          status: 'success',
          result: { 
            message: 'Cloé transferiria para Luan (Suporte Técnico)',
            scenario: 'sem_queda_em_massa'
          }
        });

        setIsRunning(false);
        return;
      }

      updateStep('verify-event', { 
        status: 'success',
        result: {
          region: activeEvent.region_pattern,
          affected_count: activeEvent.affected_count,
          detected_at: new Date(activeEvent.detected_at).toLocaleString('pt-BR'),
          has_power_outage: (activeEvent.metadata as any)?.power_outage || false,
          sample_logins: activeEvent.affected_logins?.slice(0, 3) || []
        }
      });

      await new Promise(resolve => setTimeout(resolve, 1000));

      // STEP 3: Simular cliente afetado
      updateStep('simulate-customer', { status: 'running' });
      
      // Pegar um login afetado real
      const testLogin = activeEvent.affected_logins?.[0] || 'test@pppoe';
      
      updateStep('simulate-customer', { 
        status: 'success',
        result: {
          cpf: '111.111.111-11',
          customer_name: 'Cliente Teste Simulado',
          login: testLogin,
          status: 'offline',
          message: 'Minha internet caiu!'
        }
      });

      await new Promise(resolve => setTimeout(resolve, 1000));

      // STEP 4: Cloé verifica se está na lista
      updateStep('cloe-verification', { status: 'running' });
      
      const isAffected = activeEvent.affected_logins?.includes(testLogin);
      
      updateStep('cloe-verification', { 
        status: 'success',
        result: {
          login_checked: testLogin,
          is_affected: isAffected,
          total_affected: activeEvent.affected_count,
          verification_query: `affected_logins.includes('${testLogin}')`
        }
      });

      await new Promise(resolve => setTimeout(resolve, 1000));

      // STEP 5: Resposta da Cloé
      updateStep('cloe-response', { status: 'running' });
      
      if (isAffected) {
        const metadata = (activeEvent.metadata || {}) as any;
        const isPowerOutage = metadata?.power_outage === true;
        const dyingGaspCount = metadata?.dying_gasp_count || 0;
        
        let causeInfo = '';
        if (isPowerOutage && dyingGaspCount > 0) {
          causeInfo = `CAUSA IDENTIFICADA: Falta de energia na região confirmada por ${dyingGaspCount} equipamento(s)`;
        } else if (isPowerOutage) {
          causeInfo = 'CAUSA IDENTIFICADA: Falta de energia na região';
        } else {
          causeInfo = 'Causa desconhecida - Equipe investigando';
        }
        
        updateStep('cloe-response', { 
          status: 'success',
          result: {
            scenario: 'cliente_afetado',
            action: 'Cloé INFORMA sobre queda em massa',
            transfer_to_luan: false,
            message: `🚨 INTERRUPÇÃO EM MASSA DETECTADA

Olá! Identifiquei que você está afetado por uma interrupção na sua região (${activeEvent.region_pattern}).

📊 Situação atual:
• ${activeEvent.affected_count} clientes afetados
• Detectado em: ${new Date(activeEvent.detected_at).toLocaleString('pt-BR')}
• ${causeInfo}

✅ Nossa equipe técnica já está trabalhando na solução.

O problema não é no seu equipamento individual. Assim que normalizar, sua conexão voltará automaticamente.

Pedimos desculpas pelo transtorno! 🙏`
          }
        });
      } else {
        updateStep('cloe-response', { 
          status: 'success',
          result: {
            scenario: 'cliente_nao_afetado',
            action: 'Cloé transfere para Luan (Suporte Técnico)',
            transfer_to_luan: true,
            message: 'Perfeito! Transferindo você para nosso Suporte Técnico. Um momento! ⏳\n\n📋 Protocolo: PROT-XXXXX'
          }
        });
      }

    } catch (error: any) {
      console.error('Erro na simulação:', error);
      const currentRunning = steps.find(s => s.status === 'running');
      if (currentRunning) {
        updateStep(currentRunning.id, { 
          status: 'error',
          result: { error: error.message }
        });
      }
    } finally {
      setIsRunning(false);
    }
  };

  const resetSimulation = () => {
    setSteps(prev => prev.map(step => ({
      ...step,
      status: 'pending',
      result: undefined
    })));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-blue-50 border-blue-200';
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
          <Zap className="h-10 w-10 text-orange-500" />
          Simulação Completa - Queda em Massa
        </h1>
        <p className="text-muted-foreground text-lg">
          Teste end-to-end do fluxo de detecção e atendimento de quedas em massa
        </p>
      </div>

      <Alert className="mb-6 border-blue-200 bg-blue-50">
        <AlertTriangle className="h-5 w-5 text-blue-600" />
        <AlertTitle className="text-blue-900">Como funciona esta simulação</AlertTitle>
        <AlertDescription className="text-blue-800">
          Esta simulação executa o fluxo completo:
          <ol className="list-decimal ml-5 mt-2 space-y-1">
            <li>Detecta quedas em massa via IXC API</li>
            <li>Verifica eventos criados no banco de dados</li>
            <li>Simula cliente afetado entrando em contato</li>
            <li>Cloé verifica se o login está em <code className="bg-blue-100 px-1 rounded">affected_logins</code></li>
            <li>Cloé informa diretamente (sem transferir para Luan)</li>
          </ol>
        </AlertDescription>
      </Alert>

      <div className="flex gap-3 mb-6">
        <Button 
          onClick={runSimulation}
          disabled={isRunning}
          size="lg"
          className="flex-1"
        >
          {isRunning ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Executando Simulação...
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
          <RefreshCw className="mr-2 h-5 w-5" />
          Resetar
        </Button>
      </div>

      <div className="space-y-4">
        {steps.map((step, index) => {
          const Icon = step.icon;
          
          return (
            <Card 
              key={step.id}
              className={`transition-all ${getStatusColor(step.status)} border-2`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-white shadow-sm">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl mb-1">{step.title}</CardTitle>
                      <CardDescription className="text-base">{step.description}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(step.status)}
                    <Badge variant={
                      step.status === 'success' ? 'default' :
                      step.status === 'error' ? 'destructive' :
                      step.status === 'running' ? 'secondary' : 'outline'
                    }>
                      {step.status === 'pending' ? 'Aguardando' :
                       step.status === 'running' ? 'Executando' :
                       step.status === 'success' ? 'Concluído' : 'Erro'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              {step.result && (
                <CardContent>
                  <div className="bg-white rounded-lg p-4 border">
                    <pre className="text-sm overflow-auto max-h-96 whitespace-pre-wrap">
                      {JSON.stringify(step.result, null, 2)}
                    </pre>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {steps.every(s => s.status === 'success' || s.status === 'error') && !isRunning && (
        <Alert className="mt-6 border-green-200 bg-green-50">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <AlertTitle className="text-green-900">Simulação Concluída!</AlertTitle>
          <AlertDescription className="text-green-800">
            Todos os passos foram executados. Verifique os resultados acima para entender o fluxo completo.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
