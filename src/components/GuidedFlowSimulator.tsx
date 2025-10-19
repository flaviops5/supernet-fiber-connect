import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Play, RotateCcw, CheckCircle, AlertCircle, ThumbsUp, MessageSquare, ThumbsDown, Edit2, Save, X } from 'lucide-react';
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
  const [variationStatuses, setVariationStatuses] = useState<Record<string, 'approved' | 'pending' | 'rejected'>>({});
  const [editingStepKey, setEditingStepKey] = useState<string | null>(null);
  const [editedQuestion, setEditedQuestion] = useState<string>('');

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

  // Carregar aprovações salvas do banco
  const { data: savedApprovals } = useQuery({
    queryKey: ['scenario_approvals', selectedAgent, selectedScenario],
    queryFn: async () => {
      if (!selectedAgent || !selectedScenario) return [];
      
      const { data, error } = await supabase
        .from('agent_flow_scenario_approvals')
        .select('*')
        .eq('agent_type', selectedAgent as any)
        .eq('scenario_key', selectedScenario);
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedAgent && !!selectedScenario,
  });

  // Identificar cenários (steps que começam com "cenario_")
  const scenarios = steps?.filter(step => step.step_key.startsWith('cenario_')) || [];

  // Função auxiliar para extrair opções de resposta
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

  const updateStepMutation = useMutation({
    mutationFn: async ({ stepKey, question }: { stepKey: string; question: string }) => {
      const step = steps?.find(s => s.step_key === stepKey);
      if (!step) throw new Error('Step não encontrado');

      const { error } = await supabase
        .from('agent_flow_steps')
        .update({ question, updated_at: new Date().toISOString() })
        .eq('id', step.id);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['guided_flow_steps'] });
      
      // Atualizar a conversa local
      setConversation(prev => 
        prev.map(msg => 
          msg.step_key === variables.stepKey 
            ? { ...msg, question: variables.question }
            : msg
        )
      );
      
      toast({ title: '✅ Texto atualizado com sucesso!' });
      setEditingStepKey(null);
      setEditedQuestion('');
    },
    onError: (error: any) => {
      toast({ 
        title: 'Erro ao atualizar', 
        description: error.message,
        variant: 'destructive'
      });
    },
  });

  const saveApprovalMutation = useMutation({
    mutationFn: async ({ 
      agentType, 
      scenarioKey, 
      variationPath, 
      status 
    }: { 
      agentType: string; 
      scenarioKey: string; 
      variationPath: string; 
      status: 'approved' | 'rejected' 
    }) => {
      const { error } = await supabase
        .from('agent_flow_scenario_approvals')
        .upsert({
          agent_type: agentType as any,
          scenario_key: scenarioKey,
          variation_path: variationPath,
          status,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'agent_type,scenario_key,variation_path'
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenario_approvals'] });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Erro ao salvar aprovação', 
        description: error.message,
        variant: 'destructive'
      });
    },
  });

  const handleStartEdit = (stepKey: string, currentQuestion: string) => {
    setEditingStepKey(stepKey);
    setEditedQuestion(currentQuestion);
  };

  const handleSaveEdit = () => {
    if (!editingStepKey || !editedQuestion.trim()) {
      toast({ title: 'Digite um texto válido', variant: 'destructive' });
      return;
    }
    updateStepMutation.mutate({ stepKey: editingStepKey, question: editedQuestion });
  };

  const handleCancelEdit = () => {
    setEditingStepKey(null);
    setEditedQuestion('');
  };

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
    
    if (selectedVariation && selectedAgent && selectedScenario) {
      const variation = variations.find(v => v.id === selectedVariation);
      if (variation) {
        const variationPath = variation.path.join('→');
        
        // Salvar no banco
        saveApprovalMutation.mutate({
          agentType: selectedAgent,
          scenarioKey: selectedScenario,
          variationPath,
          status
        });
        
        // Atualizar estado local
        setVariationStatuses(prev => ({
          ...prev,
          [selectedVariation]: status
        }));
      }
    }
    
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
                  {variations.map(variation => {
                    // Buscar status salvo no banco
                    const variationPath = variation.path.join('→');
                    const savedStatus = savedApprovals?.find(
                      (approval: any) => approval.variation_path === variationPath
                    );
                    const status = savedStatus?.status || variationStatuses[variation.id] || 'pending';
                    const statusColor = status === 'approved' ? 'text-green-600' : status === 'rejected' ? 'text-red-600' : 'text-orange-600';
                    const statusIcon = status === 'approved' ? '✅' : status === 'rejected' ? '❌' : '⏳';
                    
                    return (
                      <SelectItem key={variation.id} value={variation.id}>
                        <div className="flex items-start gap-2">
                          <span className={statusColor}>{statusIcon}</span>
                          <div className="flex flex-col">
                            <span className="font-medium">{variation.name}</span>
                            <span className="text-xs text-muted-foreground">{variation.description}</span>
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
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
              <h3 className="text-lg font-semibold">
                Conversa Simulada: {selectedAgentLabel}/{variations.find(v => v.id === selectedVariation)?.name}
              </h3>
              <Badge variant="secondary">
                {conversation.length} {conversation.length === 1 ? 'interação' : 'interações'}
              </Badge>
            </div>

            {/* Histórico da conversa */}
            <div className="space-y-3 max-h-[500px] overflow-y-auto p-4 bg-muted/30 rounded-lg">
              {conversation.map((msg, idx) => (
                <div key={idx} className="space-y-2">
                  {/* Mensagem do agente */}
                  <div className="bg-primary/10 p-3 rounded-lg mr-12 group relative">
                    <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs">{idx + 1}</span>
                        🤖 {selectedAgentLabel}
                      </div>
                      {editingStepKey !== msg.step_key && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleStartEdit(msg.step_key, msg.question)}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    
                    {editingStepKey === msg.step_key ? (
                      <div className="space-y-2 mt-2">
                        <Textarea
                          value={editedQuestion}
                          onChange={(e) => setEditedQuestion(e.target.value)}
                          className="min-h-[60px] text-sm"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={handleSaveEdit}
                            disabled={updateStepMutation.isPending}
                            className="h-7"
                          >
                            {updateStepMutation.isPending ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Save className="h-3 w-3 mr-1" />
                            )}
                            Salvar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleCancelEdit}
                            className="h-7"
                          >
                            <X className="h-3 w-3 mr-1" />
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm">{msg.question}</div>
                    )}
                    
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
