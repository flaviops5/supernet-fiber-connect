import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, PlayCircle, RotateCcw, CheckCircle2, AlertCircle, Zap, BookOpen, Info } from 'lucide-react';

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
      title: 'Luan recebe dados e atende',
      description: 'Atendimento com base nos dados processados por Cloé',
      status: 'pending',
      icon: Zap,
      color: 'text-orange-500',
      details: {
        received_data: {
          cpf: '123.456.789-00',
          pppoe_login: 'maria.santos@fibra',
          equipment_status: 'Offline',
          last_online: 'Há 18 horas',
          signal_level: 'Sem sinal'
        },
        action: 'Luan não faz consultas, apenas atende com os dados recebidos'
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
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Simulação: Fonte Queimada
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Fluxo completo de atendimento para problema de fonte de alimentação queimada
          </p>
        </div>

        {/* Seção de Documentação para LLM Training */}
        <Card className="border-2 border-primary/20 bg-primary/5">
          <CardHeader>
            <div className="flex items-center gap-3">
              <BookOpen className="h-6 w-6 text-primary" />
              <CardTitle className="text-2xl">Documentação do Fluxo - LLM Training Guide</CardTitle>
            </div>
            <CardDescription>
              Guia completo para compreensão e otimização do fluxo de atendimento técnico
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Objetivo */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Info className="h-5 w-5 text-blue-500" />
                1. Objetivo da Simulação
              </h3>
              <div className="bg-background/50 p-4 rounded-lg space-y-2 text-sm">
                <p>
                  <strong>Propósito:</strong> Demonstrar o fluxo completo de atendimento quando um cliente reporta
                  internet offline causada por fonte de alimentação queimada.
                </p>
                <p>
                  <strong>Cenário Real:</strong> Cliente sem conhecimento técnico entra em contato reportando "internet não funciona",
                  sem mencionar causa raiz. O sistema deve diagnosticar e solucionar.
                </p>
                <p>
                  <strong>Resultado Esperado:</strong> Identificação automática do problema e agendamento de visita técnica
                  para substituição do equipamento.
                </p>
              </div>
            </div>

            <Separator />

            {/* Agentes Envolvidos */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Zap className="h-5 w-5 text-purple-500" />
                2. Agentes AI Envolvidos
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-background/50 p-4 rounded-lg space-y-2">
                  <Badge variant="default">Cloé - Routing Agent</Badge>
                  <p className="text-sm"><strong>Função:</strong> Primeiro contato, consultas e roteamento</p>
                  <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                    <li>Valida CPF do cliente</li>
                    <li>Busca TODOS os dados no IXC (cliente, PPPoE, status)</li>
                    <li>Verifica quedas em massa (mass_outage_events)</li>
                    <li>Se queda em massa: informa e ENCERRA (não transfere)</li>
                    <li>Se problema individual: registra conversa e transfere para Luan</li>
                    <li>Passa TODOS os dados processados para Luan</li>
                  </ul>
                  <p className="text-xs text-muted-foreground mt-2">
                    <strong>Edge Function:</strong> /supabase/functions/routing-agent
                  </p>
                </div>

                <div className="bg-background/50 p-4 rounded-lg space-y-2">
                  <Badge variant="secondary">Luan - Support Tech Agent</Badge>
                  <p className="text-sm"><strong>Função:</strong> Atendimento e suporte técnico</p>
                  <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                    <li>Recebe dados já processados por Cloé</li>
                    <li>NÃO faz consultas ao IXC ou banco de dados</li>
                    <li>Foca apenas no atendimento ao cliente</li>
                    <li>Propõe solução baseada nos dados recebidos</li>
                    <li>Agenda visita técnica quando necessário</li>
                  </ul>
                  <p className="text-xs text-muted-foreground mt-2">
                    <strong>Edge Function:</strong> /supabase/functions/support-tech-agent
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Pontos de Decisão Críticos */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                3. Pontos de Decisão Críticos
              </h3>
              <div className="space-y-3">
                <div className="bg-background/50 p-4 rounded-lg space-y-2">
                  <Badge variant="outline">Checkpoint 1: Validação de Cliente</Badge>
                  <p className="text-sm">
                    <strong>Decisão:</strong> CPF válido e encontrado no IXC?
                  </p>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>✅ SIM → Prosseguir para verificação de queda em massa</p>
                    <p>❌ NÃO → Solicitar dados corretos ou transferir para vendas (novo cliente)</p>
                  </div>
                </div>

                <div className="bg-background/50 p-4 rounded-lg space-y-2">
                  <Badge variant="outline">Checkpoint 2: Queda em Massa</Badge>
                  <p className="text-sm">
                    <strong>Decisão:</strong> PPPoE login está na lista de affected_logins?
                  </p>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>✅ SIM → Cloé informa sobre queda regional e NÃO transfere para Luan</p>
                    <p>❌ NÃO → Transferir para Luan (problema individual)</p>
                  </div>
                  <p className="text-xs text-orange-600 mt-2">
                    <strong>CRÍTICO:</strong> Esta verificação EVITA sobrecarga do suporte técnico durante quedas massivas.
                  </p>
                </div>

                <div className="bg-background/50 p-4 rounded-lg space-y-2">
                  <Badge variant="outline">Checkpoint 3: Transferência com Contexto</Badge>
                  <p className="text-sm">
                    <strong>Decisão:</strong> Cloé registra conversa e envia dados completos para Luan
                  </p>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>📝 INSERT INTO conversations (cpf, status, assigned_agent) VALUES (cpf, 'routing_completed', 'Luan')</p>
                    <p>📦 Dados enviados: CPF, PPPoE login, equipment_status, last_online, signal, etc.</p>
                    <p>💬 Luan recebe contexto completo e faz apenas atendimento (SEM consultas adicionais)</p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Integrações Técnicas */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                4. Integrações Técnicas Utilizadas
              </h3>
              <div className="bg-background/50 p-4 rounded-lg space-y-3 text-sm">
                <div>
                  <strong className="text-primary">IXC ERP API:</strong>
                  <ul className="list-disc list-inside ml-2 text-muted-foreground space-y-1 mt-1">
                    <li>GET /cliente - Busca dados do cliente por CPF</li>
                    <li>GET /su_oss_chamado_tipo - Lista tipos de chamados</li>
                    <li>GET /radusuarios - Status do PPPoE e conectividade</li>
                    <li>POST /su_oss_chamado - Cria chamado técnico</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-primary">Supabase Database:</strong>
                  <ul className="list-disc list-inside ml-2 text-muted-foreground space-y-1 mt-1">
                    <li>mass_outage_events - Eventos de queda em massa detectados</li>
                    <li>conversations - Registro de conversas do atendimento</li>
                    <li>conversation_messages - Histórico de mensagens</li>
                    <li>customer_contact_history - Histórico de contatos</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-primary">AI Models (Lovable AI Gateway):</strong>
                  <ul className="list-disc list-inside ml-2 text-muted-foreground space-y-1 mt-1">
                    <li>google/gemini-2.5-flash - Modelo padrão para agentes</li>
                    <li>Análise de contexto e tomada de decisão inteligente</li>
                    <li>Geração de respostas humanizadas</li>
                  </ul>
                </div>
              </div>
            </div>

            <Separator />

            {/* Exemplos de Prompts */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-500" />
                5. Exemplos de Prompts e Respostas Esperadas
              </h3>
              <div className="space-y-3">
                <div className="bg-background/50 p-4 rounded-lg space-y-2">
                  <Badge>Cliente → Cloé</Badge>
                  <div className="text-sm space-y-2">
                    <p><strong>Input:</strong> "Minha internet não está funcionando"</p>
                    <p className="text-muted-foreground">
                      <strong>Cloé deve:</strong> Solicitar CPF para identificação
                    </p>
                    <p className="text-green-600">
                      <strong>Resposta esperada:</strong> "Entendo sua preocupação. Para verificar o que está acontecendo,
                      poderia me informar seu CPF?"
                    </p>
                  </div>
                </div>

                <div className="bg-background/50 p-4 rounded-lg space-y-2">
                  <Badge>Após validação → Transfer para Luan</Badge>
                  <div className="text-sm space-y-2">
                    <p><strong>Context:</strong> Cliente validado, sem queda em massa, problema técnico</p>
                    <p className="text-green-600">
                      <strong>Cloé:</strong> "Entendi, Maria. Vou transferir você para nossa equipe técnica especializada.
                      O Luan irá fazer um diagnóstico completo e resolver o problema. Um momento, por favor."
                    </p>
                  </div>
                </div>

                <div className="bg-background/50 p-4 rounded-lg space-y-2">
                  <Badge>Luan → Atendimento (com dados já processados)</Badge>
                  <div className="text-sm space-y-2">
                    <p><strong>Dados recebidos de Cloé:</strong> cpf: "123.456.789-00", pppoe_login: "maria.santos@fibra", 
                    equipment_status: "offline", last_online: "18h", signal: null</p>
                    <p className="text-muted-foreground">
                      <strong>Luan NÃO faz consultas.</strong> Apenas atende com base nos dados recebidos.
                    </p>
                    <p className="text-green-600">
                      <strong>Resposta esperada:</strong> "Olá Maria! Vi aqui que seu equipamento está offline há 18 horas. 
                      Vou agendar uma visita técnica para trocar a fonte. Você pode amanhã entre 08h e 12h?"
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Métricas de Sucesso */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                6. Métricas de Sucesso do Fluxo
              </h3>
              <div className="bg-background/50 p-4 rounded-lg space-y-2 text-sm">
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <p className="font-semibold text-primary">Tempo de Resolução</p>
                    <p className="text-2xl font-bold">≤ 2 min</p>
                    <p className="text-xs text-muted-foreground">Até agendamento da visita</p>
                  </div>
                  <div>
                    <p className="font-semibold text-primary">Taxa de Acerto</p>
                    <p className="text-2xl font-bold">≥ 95%</p>
                    <p className="text-xs text-muted-foreground">Diagnóstico correto</p>
                  </div>
                  <div>
                    <p className="font-semibold text-primary">Satisfação Cliente</p>
                    <p className="text-2xl font-bold">≥ 4.5/5</p>
                    <p className="text-xs text-muted-foreground">NPS após resolução</p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Pontos de Melhoria */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-orange-600">
                <AlertCircle className="h-5 w-5" />
                7. Pontos de Atenção para Refinamento da LLM
              </h3>
              <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-lg space-y-2 text-sm">
                <ul className="space-y-2 list-disc list-inside">
                  <li>
                    <strong>Empatia:</strong> Agentes devem demonstrar compreensão da frustração do cliente
                    por estar sem internet, evitando respostas robotizadas.
                  </li>
                  <li>
                    <strong>Clareza Técnica:</strong> Explicar "fonte queimada" de forma simples, sem jargões técnicos
                    excessivos (ex: "o adaptador de energia parou de funcionar").
                  </li>
                  <li>
                    <strong>Proatividade:</strong> Luan deve sempre sugerir horários para visita, não apenas informar
                    que será agendada.
                  </li>
                  <li>
                    <strong>Contexto Completo:</strong> Ao transferir de Cloé para Luan, passar todo o histórico da conversa
                    para evitar que o cliente precise repetir informações.
                  </li>
                  <li>
                    <strong>Falsos Positivos:</strong> Se equipamento mostra "online" mas cliente reporta offline,
                    investigar possibilidade de cache na API do IXC ou problema de WiFi (não de fonte).
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

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
