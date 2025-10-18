import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, RotateCcw, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FlowStep {
  id: string;
  agent_type: string;
  step_key: string;
  step_order: number;
  question: string;
  instruction: string;
  response_options: any;
  tool_calls: any;
  next_step_map: any;
  is_active: boolean;
}

interface ConversationMessage {
  step_key: string;
  question: string;
  selected_option: string;
  selected_option_label: string;
}

const AGENT_TYPES = [
  { value: 'routing-agent', label: 'Cloé (Roteamento)' },
  { value: 'support-tech-agent', label: 'Luan (Suporte Técnico)' },
  { value: 'support-financial-agent', label: 'Suporte Financeiro' },
  { value: 'sales-agent', label: 'Vendas' },
  { value: 'telemedicina-agent', label: 'Telemedicina' },
  { value: 'automacao-agent', label: 'Automação' },
  { value: 'logistics-agent', label: 'Logística' },
];

export default function GuidedFlowSimulator() {
  const { toast } = useToast();
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [selectedStartStep, setSelectedStartStep] = useState<string>('');
  const [currentStep, setCurrentStep] = useState<FlowStep | null>(null);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [isSimulationActive, setIsSimulationActive] = useState(false);

  const { data: steps, isLoading } = useQuery({
    queryKey: ['guided_flow_steps', selectedAgent],
    queryFn: async () => {
      if (!selectedAgent) return [];
      
      const { data, error } = await supabase
        .from('agent_flow_steps')
        .select('*')
        .eq('agent_type', selectedAgent as any)
        .eq('is_active', true)
        .order('step_order');
      
      if (error) throw error;
      return data as FlowStep[];
    },
    enabled: !!selectedAgent,
  });

  const handleStartSimulation = () => {
    if (!selectedStartStep || !steps) {
      toast({ 
        title: 'Selecione um step inicial',
        variant: 'destructive'
      });
      return;
    }

    const startStep = steps.find(s => s.step_key === selectedStartStep);
    if (!startStep) {
      toast({ 
        title: 'Step não encontrado',
        variant: 'destructive'
      });
      return;
    }

    setCurrentStep(startStep);
    setConversation([]);
    setIsSimulationActive(true);
    toast({ title: '🎬 Simulação iniciada!' });
  };

  const handleResetSimulation = () => {
    setCurrentStep(null);
    setConversation([]);
    setIsSimulationActive(false);
    setSelectedStartStep('');
    toast({ title: '🔄 Simulação reiniciada' });
  };

  const handleSelectOption = (optionKey: string, optionLabel: string) => {
    if (!currentStep) return;

    // Adicionar mensagem do agente
    const newMessage: ConversationMessage = {
      step_key: currentStep.step_key,
      question: currentStep.question,
      selected_option: optionKey,
      selected_option_label: optionLabel,
    };

    setConversation(prev => [...prev, newMessage]);

    // Buscar próximo step baseado no next_step_map
    const nextStepKey = currentStep.next_step_map?.[optionKey];
    
    if (!nextStepKey) {
      toast({ 
        title: '⚠️ Fim do fluxo',
        description: `Não há próximo step configurado para a opção "${optionLabel}"`,
        variant: 'destructive'
      });
      setIsSimulationActive(false);
      return;
    }

    const nextStep = steps?.find(s => s.step_key === nextStepKey);
    
    if (!nextStep) {
      toast({ 
        title: '❌ Erro no fluxo',
        description: `Step "${nextStepKey}" não encontrado. Verifique o next_step_map.`,
        variant: 'destructive'
      });
      setIsSimulationActive(false);
      return;
    }

    setCurrentStep(nextStep);
  };

  const selectedAgentLabel = AGENT_TYPES.find(a => a.value === selectedAgent)?.label || selectedAgent;

  // Extrair opções do response_options
  const getResponseOptions = (step: FlowStep) => {
    if (!step.response_options) return [];
    
    // response_options pode ser {"0": "sim", "1": "nao"} ou array [{"key": "0", "label": "sim"}]
    if (Array.isArray(step.response_options)) {
      return step.response_options.map((opt: any) => ({
        key: String(opt.key || opt.value || opt),
        label: String(opt.label || opt.text || opt),
      }));
    }
    
    if (typeof step.response_options === 'object') {
      return Object.entries(step.response_options).map(([key, value]) => ({
        key: String(key),
        label: String(value),
      }));
    }
    
    return [];
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            🎮 Simulador Guiado de Fluxo
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Navegue manualmente pelos steps escolhendo cada resposta
          </p>
        </div>

        {/* Seleção de Agente e Step Inicial */}
        {!isSimulationActive && (
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs mr-2">1</span>
                Selecione o Agente
              </label>
              <Select value={selectedAgent} onValueChange={(value) => {
                setSelectedAgent(value);
                setSelectedStartStep('');
              }}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Escolha um agente..." />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {AGENT_TYPES.map(agent => (
                    <SelectItem key={agent.value} value={agent.value}>
                      {agent.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium block mb-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs mr-2">2</span>
                Selecione o Step Inicial
              </label>
              <Select 
                value={selectedStartStep} 
                onValueChange={setSelectedStartStep}
                disabled={!selectedAgent || isLoading}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder={
                    isLoading ? 'Carregando...' : 
                    !selectedAgent ? 'Selecione um agente primeiro' :
                    'Escolha o step inicial...'
                  } />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {steps?.map(step => (
                    <SelectItem key={step.id} value={step.step_key}>
                      {step.step_order}. {step.step_key}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Botões de Controle */}
        <div className="flex gap-2">
          {!isSimulationActive ? (
            <Button
              onClick={handleStartSimulation}
              disabled={!selectedAgent || !selectedStartStep || isLoading}
              className="gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Iniciar Simulação
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleResetSimulation}
              variant="outline"
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reiniciar
            </Button>
          )}
        </div>

        {/* Conversa */}
        {isSimulationActive && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Conversa: {selectedAgentLabel}</h3>
              <Badge variant="secondary">
                {conversation.length} {conversation.length === 1 ? 'mensagem' : 'mensagens'}
              </Badge>
            </div>

            {/* Histórico da conversa */}
            <div className="space-y-3 max-h-[400px] overflow-y-auto p-4 bg-muted/30 rounded-lg">
              {conversation.map((msg, idx) => (
                <div key={idx} className="space-y-2">
                  {/* Mensagem do agente */}
                  <div className="bg-primary/10 p-3 rounded-lg mr-12">
                    <div className="text-xs font-medium text-muted-foreground mb-1">
                      🤖 {selectedAgentLabel}
                    </div>
                    <div className="text-sm">{msg.question}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Step: {msg.step_key}
                    </div>
                  </div>

                  {/* Resposta do usuário */}
                  <div className="bg-muted p-3 rounded-lg ml-12">
                    <div className="text-xs font-medium text-muted-foreground mb-1">
                      👤 Cliente
                    </div>
                    <div className="text-sm">{msg.selected_option_label}</div>
                  </div>
                </div>
              ))}

              {/* Step atual - mensagem do agente */}
              {currentStep && (
                <div className="bg-primary/10 p-3 rounded-lg mr-12 animate-in fade-in slide-in-from-bottom-4">
                  <div className="text-xs font-medium text-muted-foreground mb-1">
                    🤖 {selectedAgentLabel}
                  </div>
                  <div className="text-sm">{currentStep.question}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Step: {currentStep.step_key}
                  </div>
                </div>
              )}
            </div>

            {/* Opções de resposta */}
            {currentStep && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs">3</span>
                  <label className="text-sm font-medium">
                    Escolha a resposta do cliente:
                  </label>
                </div>
                <div className="grid gap-2">
                  {getResponseOptions(currentStep).length > 0 ? (
                    getResponseOptions(currentStep).map(option => {
                      const nextStepKey = currentStep.next_step_map?.[option.key];
                      const hasNextStep = !!nextStepKey;
                      const nextStepExists = hasNextStep && steps?.some(s => s.step_key === nextStepKey);
                      
                      return (
                        <Button
                          key={option.key}
                          onClick={() => handleSelectOption(option.key, option.label)}
                          variant="outline"
                          className="justify-between h-auto py-3 px-4"
                        >
                          <span className="text-left flex-1">{option.label}</span>
                          <div className="flex items-center gap-2 ml-2">
                            <span className="text-xs text-muted-foreground">
                              {nextStepKey || 'Sem próximo'}
                            </span>
                            {hasNextStep ? (
                              nextStepExists ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-destructive" />
                              )
                            ) : (
                              <AlertCircle className="h-4 w-4 text-yellow-500" />
                            )}
                          </div>
                        </Button>
                      );
                    })
                  ) : (
                    <div className="text-sm text-muted-foreground p-4 bg-muted/50 rounded-lg">
                      ⚠️ Nenhuma opção de resposta configurada para este step
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
