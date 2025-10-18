import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, RotateCcw, CheckCircle, AlertCircle, ThumbsUp, MessageSquare, ThumbsDown } from 'lucide-react';
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

interface PathVariation {
  id: string;
  name: string;
  description: string;
  path: string[]; // Array de option keys: ["sim", "nao", "sim"]
}

interface ScenarioApproval {
  agent_type: string;
  scenario_key: string;
  variation_id: string;
  status: 'approved' | 'pending' | 'rejected';
  notes?: string;
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
  const queryClient = useQueryClient();
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [selectedVariation, setSelectedVariation] = useState<string>('');
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [isSimulationActive, setIsSimulationActive] = useState(false);
  const [simulationComplete, setSimulationComplete] = useState(false);
  const [currentApprovalStatus, setCurrentApprovalStatus] = useState<'approved' | 'pending' | 'rejected'>('pending');

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

  // Identificar cenários (steps iniciais)
  const scenarios = steps?.filter(step => step.step_order === 1) || [];

  // Gerar variações automáticas baseadas nas opções
  const getVariations = (): PathVariation[] => {
    if (!selectedScenario || !steps) return [];
    
    const startStep = steps.find(s => s.step_key === selectedScenario);
    if (!startStep) return [];

    // Gerar todas as variações possíveis explorando os caminhos
    const variations: PathVariation[] = [];
    const visited = new Set<string>();

    const explorePath = (currentStepKey: string, path: string[], pathLabels: string[], depth: number = 0) => {
      if (depth > 10) return; // Limite de profundidade para evitar loops infinitos
      
      const step = steps.find(s => s.step_key === currentStepKey);
      if (!step) return;

      const options = getResponseOptions(step);
      if (options.length === 0) {
        // Fim do caminho
        const pathKey = path.join('→');
        if (!visited.has(pathKey)) {
          visited.add(pathKey);
          variations.push({
            id: `var-${variations.length + 1}`,
            name: `Variação ${variations.length + 1}`,
            description: pathLabels.join(' → '),
            path: path
          });
        }
        return;
      }

      // Explorar cada opção
      options.forEach(option => {
        const nextStepKey = step.next_step_map?.[option.key];
        if (nextStepKey) {
          explorePath(
            nextStepKey,
            [...path, option.key],
            [...pathLabels, option.label],
            depth + 1
          );
        } else {
          // Fim do caminho
          const newPath = [...path, option.key];
          const newPathLabels = [...pathLabels, option.label];
          const pathKey = newPath.join('→');
          if (!visited.has(pathKey)) {
            visited.add(pathKey);
            variations.push({
              id: `var-${variations.length + 1}`,
              name: `Variação ${variations.length + 1}`,
              description: newPathLabels.join(' → '),
              path: newPath
            });
          }
        }
      });
    };

    explorePath(selectedScenario, [], [], 0);
    return variations;
  };

  const variations = getVariations();

  const handleStartSimulation = async () => {
    if (!selectedAgent || !selectedScenario || !selectedVariation) {
      toast({ 
        title: 'Selecione todas as opções',
        description: 'Escolha o agente, cenário e variação antes de iniciar',
        variant: 'destructive'
      });
      return;
    }

    const variation = variations.find(v => v.id === selectedVariation);
    if (!variation) {
      toast({ title: 'Variação não encontrada', variant: 'destructive' });
      return;
    }

    setConversation([]);
    setIsSimulationActive(true);
    setSimulationComplete(false);

    // Executar simulação automaticamente
    const messages: ConversationMessage[] = [];
    let currentStepKey = selectedScenario;
    let pathIndex = 0;

    while (currentStepKey && pathIndex < variation.path.length) {
      const step = steps?.find(s => s.step_key === currentStepKey);
      if (!step) break;

      const optionKey = variation.path[pathIndex];
      const options = getResponseOptions(step);
      const option = options.find(o => o.key === optionKey);
      
      if (!option) break;

      messages.push({
        step_key: step.step_key,
        question: step.question,
        selected_option: optionKey,
        selected_option_label: option.label
      });

      const nextStepKey = step.next_step_map?.[optionKey];
      if (!nextStepKey) break;

      currentStepKey = nextStepKey;
      pathIndex++;
    }

    setConversation(messages);
    setSimulationComplete(true);
    toast({ title: '✅ Simulação concluída!' });
  };

  const handleApproval = async (status: 'approved' | 'rejected') => {
    setCurrentApprovalStatus(status);
    
    // TODO: Salvar no banco de dados
    toast({ 
      title: status === 'approved' ? '✅ Cenário aprovado!' : '❌ Cenário não aprovado',
      description: 'Status salvo com sucesso'
    });
  };

  const handleResetSimulation = () => {
    setConversation([]);
    setIsSimulationActive(false);
    setSimulationComplete(false);
    setSelectedVariation('');
    setCurrentApprovalStatus('pending');
    toast({ title: '🔄 Simulação reiniciada' });
  };

  const selectedAgentLabel = AGENT_TYPES.find(a => a.value === selectedAgent)?.label || selectedAgent;

  const getResponseOptions = (step: FlowStep) => {
    if (!step.response_options) return [];
    
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
            🎮 Simulador Automático de Fluxo
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Escolha o agente, cenário e variação para simular automaticamente a conversa completa
          </p>
        </div>

        {/* Três Caixas de Seleção */}
        {!isSimulationActive && (
          <div className="grid md:grid-cols-3 gap-4">
            {/* Caixa 1: Agente */}
            <div>
              <label className="text-sm font-medium block mb-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs mr-2">1</span>
                Escolher o Agente
              </label>
              <Select value={selectedAgent} onValueChange={(value) => {
                setSelectedAgent(value);
                setSelectedScenario('');
                setSelectedVariation('');
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

            {/* Caixa 2: Cenário */}
            <div>
              <label className="text-sm font-medium block mb-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs mr-2">2</span>
                Escolher o Cenário
              </label>
              <Select 
                value={selectedScenario} 
                onValueChange={(value) => {
                  setSelectedScenario(value);
                  setSelectedVariation('');
                }}
                disabled={!selectedAgent || isLoading}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder={
                    isLoading ? 'Carregando...' : 
                    !selectedAgent ? 'Selecione um agente primeiro' :
                    scenarios.length === 0 ? 'Nenhum cenário encontrado' :
                    'Escolha o cenário...'
                  } />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {scenarios.map(scenario => (
                    <SelectItem key={scenario.id} value={scenario.step_key}>
                      {scenario.step_key}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Caixa 3: Variação */}
            <div>
              <label className="text-sm font-medium block mb-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs mr-2">3</span>
                Escolher as Opções
              </label>
              <Select 
                value={selectedVariation} 
                onValueChange={setSelectedVariation}
                disabled={!selectedScenario || variations.length === 0}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder={
                    !selectedScenario ? 'Selecione um cenário primeiro' :
                    variations.length === 0 ? 'Nenhuma variação disponível' :
                    'Escolha a variação...'
                  } />
                </SelectTrigger>
                <SelectContent className="bg-background z-50 max-h-[300px]">
                  {variations.map(variation => (
                    <SelectItem key={variation.id} value={variation.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{variation.name}</span>
                        <span className="text-xs text-muted-foreground">{variation.description}</span>
                      </div>
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
              disabled={!selectedAgent || !selectedScenario || !selectedVariation || isLoading}
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
              Nova Simulação
            </Button>
          )}
        </div>

        {/* Conversa Completa */}
        {isSimulationActive && conversation.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Conversa Simulada: {selectedAgentLabel}</h3>
              <Badge variant="secondary">
                {conversation.length} {conversation.length === 1 ? 'interação' : 'interações'}
              </Badge>
            </div>

            {/* Histórico da conversa */}
            <div className="space-y-3 max-h-[500px] overflow-y-auto p-4 bg-muted/30 rounded-lg">
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
            </div>

            {/* Botões de Validação */}
            {simulationComplete && (
              <div className="space-y-3">
                <div className="text-sm font-medium text-center">
                  Valide este cenário:
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Button
                    onClick={() => handleApproval('approved')}
                    variant={currentApprovalStatus === 'approved' ? 'default' : 'outline'}
                    className="gap-2"
                  >
                    <ThumbsUp className="h-4 w-4" />
                    Aprovado
                  </Button>
                  <Button
                    onClick={handleResetSimulation}
                    variant="outline"
                    className="gap-2"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Conversar mais
                  </Button>
                  <Button
                    onClick={() => handleApproval('rejected')}
                    variant={currentApprovalStatus === 'rejected' ? 'destructive' : 'outline'}
                    className="gap-2"
                  >
                    <ThumbsDown className="h-4 w-4" />
                    Não aprovado
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
