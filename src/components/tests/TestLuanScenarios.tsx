import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Wrench,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Zap,
  PlayCircle,
  Signal,
  Power,
  Activity,
  Users,
  Loader2
} from 'lucide-react';

interface TestScenario {
  id: string;
  name: string;
  description: string;
  icon: any;
  variant: 'default' | 'destructive' | 'outline' | 'secondary';
  mockData: {
    customer: {
      cpf: string;
      name: string;
      phone: string;
    };
    signal?: {
      tx: string;
      rx: string;
      status: string;
    };
    radusuario?: {
      status: 'online' | 'offline';
      last_online_minutes?: number;
    };
    massOutage?: boolean;
  };
  expectedBehavior: string[];
}

const SCENARIOS: TestScenario[] = [
  {
    id: 'offline-no-power',
    name: 'Equipamento Offline - Sem Energia',
    description: 'TX: 0.00 / RX: 0.00 - Equipamento desligado',
    icon: Power,
    variant: 'destructive',
    mockData: {
      customer: {
        cpf: '111.111.111-11',
        name: 'Cliente Teste - Sem Energia',
        phone: '61999000001'
      },
      signal: {
        tx: '0.00',
        rx: '0.00',
        status: 'offline'
      },
      radusuario: {
        status: 'offline',
        last_online_minutes: 45
      }
    },
    expectedBehavior: [
      '🔌 Deve detectar TX/RX = 0.00',
      '✅ Deve informar problema de ENERGIA',
      '✅ Deve solicitar verificação de equipamento ligado',
      '✅ Deve orientar sobre fonte e cabos'
    ]
  },
  {
    id: 'weak-signal',
    name: 'Sinal Fraco - Cabo/Conector',
    description: 'RX: -26 dBm (fraco) - Problema de recepção',
    icon: Signal,
    variant: 'secondary',
    mockData: {
      customer: {
        cpf: '222.222.222-22',
        name: 'Cliente Teste - Sinal Fraco',
        phone: '61999000002'
      },
      signal: {
        tx: '0.2',
        rx: '-26.5',
        status: 'offline'
      },
      radusuario: {
        status: 'offline',
        last_online_minutes: 30
      }
    },
    expectedBehavior: [
      '🟡 Deve detectar RX entre -26 e -28 dBm',
      '✅ Deve identificar problema de recepção',
      '✅ Deve mencionar cabo ou conector',
      '✅ Deve abrir atendimento técnico no IXC'
    ]
  },
  {
    id: 'critical-signal',
    name: 'Sinal Crítico - Problema Grave',
    description: 'RX: -32 dBm - Problema crítico na rede',
    icon: AlertTriangle,
    variant: 'destructive',
    mockData: {
      customer: {
        cpf: '333.333.333-33',
        name: 'Cliente Teste - Sinal Crítico',
        phone: '61999000003'
      },
      signal: {
        tx: '-3.0',
        rx: '-32.0',
        status: 'offline'
      },
      radusuario: {
        status: 'offline',
        last_online_minutes: 120
      }
    },
    expectedBehavior: [
      '🔴 Deve detectar RX < -28 dBm (crítico)',
      '⚠️ Deve alertar problema GRAVE',
      '✅ Deve mencionar possível rompimento',
      '✅ Deve abrir atendimento URGENTE'
    ]
  },
  {
    id: 'good-signal-offline',
    name: 'Sinal OK mas Offline',
    description: 'RX: -18 dBm (excelente) - Problema não é sinal',
    icon: Activity,
    variant: 'outline',
    mockData: {
      customer: {
        cpf: '444.444.444-44',
        name: 'Cliente Teste - Sinal OK',
        phone: '61999000004'
      },
      signal: {
        tx: '0.5',
        rx: '-18.2',
        status: 'offline'
      },
      radusuario: {
        status: 'offline',
        last_online_minutes: 15
      }
    },
    expectedBehavior: [
      '🟢 Deve detectar RX entre -25 e -12 dBm (excelente)',
      '✅ Deve informar que sinal está OK',
      '✅ Deve investigar outras causas',
      '✅ Pode sugerir verificar configurações ou reiniciar'
    ]
  },
  {
    id: 'mass-outage',
    name: 'Mass Outage Detectado',
    description: 'Pane massiva ativa - 1542 clientes afetados',
    icon: Zap,
    variant: 'destructive',
    mockData: {
      customer: {
        cpf: '555.555.555-55',
        name: 'Cliente Teste - Mass Outage',
        phone: '61999000005'
      },
      signal: {
        tx: '0.3',
        rx: '-19.0',
        status: 'offline'
      },
      radusuario: {
        status: 'offline',
        last_online_minutes: 10
      },
      massOutage: true
    },
    expectedBehavior: [
      '🚨 Deve detectar mass outage ativo',
      '✅ Deve mencionar região afetada (SRI)',
      '✅ Deve informar número de clientes afetados',
      '✅ Deve tranquilizar cliente e informar sobre equipe trabalhando',
      '✅ NÃO deve fazer reboot durante mass outage'
    ]
  },
  {
    id: 'multiple-contracts',
    name: 'Múltiplos Contratos',
    description: 'Cliente com 2+ contratos ativos',
    icon: Users,
    variant: 'outline',
    mockData: {
      customer: {
        cpf: '666.666.666-66',
        name: 'Cliente Teste - Multi Contratos',
        phone: '61999000006'
      },
      signal: {
        tx: '0.4',
        rx: '-20.0',
        status: 'offline'
      },
      radusuario: {
        status: 'offline',
        last_online_minutes: 60
      }
    },
    expectedBehavior: [
      '✅ Deve listar todos os contratos',
      '✅ Deve perguntar qual contrato está com problema',
      '✅ Deve fazer diagnóstico no contrato correto'
    ]
  }
];

export default function TestLuanScenarios() {
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, any>>({});
  const [massOutageActive, setMassOutageActive] = useState(false);

  const activateMassOutage = async () => {
    setLoading('mass-outage-setup');
    try {
      await supabase.functions.invoke('simulate-mass-outage', {
        body: { action: 'activate' }
      });
      setMassOutageActive(true);
      toast.success('Mass Outage ativado para testes');
    } catch (error: any) {
      toast.error('Erro ao ativar Mass Outage: ' + error.message);
    } finally {
      setLoading(null);
    }
  };

  const deactivateMassOutage = async () => {
    setLoading('mass-outage-setup');
    try {
      await supabase.functions.invoke('simulate-mass-outage', {
        body: { action: 'deactivate' }
      });
      setMassOutageActive(false);
      toast.success('Mass Outage desativado');
    } catch (error: any) {
      toast.error('Erro ao desativar Mass Outage: ' + error.message);
    } finally {
      setLoading(null);
    }
  };

  const runScenario = async (scenario: TestScenario) => {
    setLoading(scenario.id);
    setResults(prev => ({ ...prev, [scenario.id]: null }));

    try {
      // 1. Buscar ou criar conversa
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .eq('customer_phone', scenario.mockData.customer.phone)
        .maybeSingle();

      let conversationId: string;

      if (existingConv) {
        await supabase
          .from('conversations')
          .update({ 
            status: 'waiting', 
            current_department: 'tecnico',
            assigned_agent_id: null 
          })
          .eq('id', existingConv.id);
        conversationId = existingConv.id;
      } else {
        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert({
            customer_cpf: scenario.mockData.customer.cpf,
            customer_name: scenario.mockData.customer.name,
            customer_phone: scenario.mockData.customer.phone,
            channel: 'whatsapp',
            current_department: 'tecnico',
            status: 'waiting'
          })
          .select('id')
          .single();

        if (convError) throw convError;
        conversationId = newConv.id;
      }

      // 2. Chamar support-tech-agent
      const { data: agentData, error: agentError } = await supabase.functions.invoke(
        'support-tech-agent',
        {
          body: {
            conversation_id: conversationId,
            customer_cpf: scenario.mockData.customer.cpf,
            message: 'Minha internet está offline'
          }
        }
      );

      if (agentError) throw agentError;

      // 3. Buscar mensagens
      const { data: messages } = await supabase
        .from('conversation_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      // 4. Verificar mass outage se aplicável
      let outageData = null;
      if (scenario.mockData.massOutage) {
        const { data: outages } = await supabase
          .from('mass_outage_events')
          .select('*')
          .eq('status', 'active')
          .limit(1);
        outageData = outages?.[0] || null;
      }

      setResults(prev => ({
        ...prev,
        [scenario.id]: {
          success: true,
          conversationId,
          messages: messages || [],
          outageData,
          agentResponse: agentData
        }
      }));

      toast.success(`Cenário "${scenario.name}" executado com sucesso`);
    } catch (error: any) {
      setResults(prev => ({
        ...prev,
        [scenario.id]: {
          success: false,
          error: error.message
        }
      }));
      toast.error(`Erro no cenário: ${error.message}`);
    } finally {
      setLoading(null);
    }
  };

  const runAllScenarios = async () => {
    for (const scenario of SCENARIOS) {
      await runScenario(scenario);
      // Pequeno delay entre cenários
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    toast.success('Todos os cenários foram executados!');
  };

  return (
    <div className="space-y-6">
      <Alert>
        <Wrench className="h-4 w-4" />
        <AlertDescription>
          Teste o agente Luan (Suporte Técnico) em diferentes cenários de diagnóstico. Cada cenário simula uma situação real com dados específicos.
        </AlertDescription>
      </Alert>

      {/* Controle Mass Outage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Configuração de Mass Outage
          </CardTitle>
          <CardDescription>
            Ative/desative pane massiva para testar cenários com outage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-3">
            <Button
              onClick={activateMassOutage}
              disabled={loading === 'mass-outage-setup' || massOutageActive}
              variant="destructive"
              className="flex-1"
            >
              {loading === 'mass-outage-setup' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <AlertTriangle className="mr-2 h-4 w-4" />
              )}
              Ativar Mass Outage
            </Button>
            <Button
              onClick={deactivateMassOutage}
              disabled={loading === 'mass-outage-setup' || !massOutageActive}
              variant="outline"
              className="flex-1"
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Desativar Mass Outage
            </Button>
          </div>
          {massOutageActive && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                🚨 Mass Outage ATIVO - Cenários relevantes irão detectar
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Ação em lote */}
      <Card>
        <CardContent className="pt-6">
          <Button
            onClick={runAllScenarios}
            disabled={!!loading}
            variant="default"
            size="lg"
            className="w-full"
          >
            <PlayCircle className="mr-2 h-5 w-5" />
            Executar Todos os Cenários
          </Button>
        </CardContent>
      </Card>

      {/* Cenários */}
      <Tabs defaultValue={SCENARIOS[0].id} className="w-full">
        <TabsList className="w-full grid grid-cols-3 lg:grid-cols-6">
          {SCENARIOS.map(scenario => {
            const Icon = scenario.icon;
            return (
              <TabsTrigger key={scenario.id} value={scenario.id} className="flex items-center gap-1">
                <Icon className="h-3 w-3" />
                <span className="hidden lg:inline">{scenario.name.split('-')[0]}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {SCENARIOS.map(scenario => {
          const Icon = scenario.icon;
          const result = results[scenario.id];
          const isLoading = loading === scenario.id;

          return (
            <TabsContent key={scenario.id} value={scenario.id} className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Icon className="h-5 w-5" />
                    {scenario.name}
                  </CardTitle>
                  <CardDescription>{scenario.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Dados Mock */}
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Dados de Teste:</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs bg-muted p-3 rounded">
                      <div>
                        <span className="text-muted-foreground">CPF:</span>{' '}
                        <code>{scenario.mockData.customer.cpf}</code>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Nome:</span>{' '}
                        <code>{scenario.mockData.customer.name}</code>
                      </div>
                      {scenario.mockData.signal && (
                        <>
                          <div>
                            <span className="text-muted-foreground">TX:</span>{' '}
                            <code>{scenario.mockData.signal.tx} dBm</code>
                          </div>
                          <div>
                            <span className="text-muted-foreground">RX:</span>{' '}
                            <code>{scenario.mockData.signal.rx} dBm</code>
                          </div>
                        </>
                      )}
                      {scenario.mockData.radusuario && (
                        <>
                          <div>
                            <span className="text-muted-foreground">Status:</span>{' '}
                            <Badge variant={scenario.mockData.radusuario.status === 'online' ? 'default' : 'destructive'}>
                              {scenario.mockData.radusuario.status}
                            </Badge>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Offline há:</span>{' '}
                            <code>{scenario.mockData.radusuario.last_online_minutes}min</code>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Comportamento Esperado */}
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Comportamento Esperado:</h4>
                    <ul className="space-y-1 text-sm">
                      {scenario.expectedBehavior.map((behavior, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-muted-foreground">•</span>
                          <span>{behavior}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Executar */}
                  <Button
                    onClick={() => runScenario(scenario)}
                    disabled={isLoading}
                    variant={scenario.variant}
                    className="w-full"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Executando...
                      </>
                    ) : (
                      <>
                        <PlayCircle className="mr-2 h-4 w-4" />
                        Executar Cenário
                      </>
                    )}
                  </Button>

                  {/* Resultados */}
                  {result && (
                    <div className="space-y-3 pt-4 border-t">
                      {result.success ? (
                        <>
                          <Alert className="border-green-600 bg-green-50 dark:bg-green-950">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <AlertDescription className="text-green-900 dark:text-green-100">
                              ✅ Cenário executado com sucesso
                            </AlertDescription>
                          </Alert>

                          {result.outageData && (
                            <Alert variant="destructive">
                              <Zap className="h-4 w-4" />
                              <AlertDescription>
                                🚨 Mass Outage detectado: {result.outageData.affected_count} clientes em{' '}
                                {result.outageData.region_pattern}
                              </AlertDescription>
                            </Alert>
                          )}

                          <Card>
                            <CardHeader>
                              <CardTitle className="text-sm">Mensagens do Luan ({result.messages.length})</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2 max-h-96 overflow-y-auto">
                                {result.messages.map((msg: any, idx: number) => (
                                  <div key={idx} className="p-3 bg-muted rounded text-xs space-y-1">
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline">{msg.sender_name || 'Sistema'}</Badge>
                                      <span className="text-muted-foreground text-xs">
                                        {new Date(msg.created_at).toLocaleTimeString()}
                                      </span>
                                    </div>
                                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        </>
                      ) : (
                        <Alert variant="destructive">
                          <XCircle className="h-4 w-4" />
                          <AlertDescription>❌ Erro: {result.error}</AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
