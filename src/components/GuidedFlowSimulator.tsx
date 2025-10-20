import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Play, RotateCcw, CheckCircle, AlertCircle, ThumbsUp, MessageSquare, ThumbsDown, Edit2, Save, X, CheckCheck, XCircle, Trash2, Settings } from 'lucide-react';
import StepConfigDialog from './StepConfigDialog';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
  subject_key?: string;
}

interface FlowSubject {
  id: string;
  agent_type: string;
  subject_key: string;
  subject_name: string;
  description?: string;
  icon: string;
  display_order: number;
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
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [selectedVariations, setSelectedVariations] = useState<string[]>([]);
  const [conversations, setConversations] = useState<Record<string, ConversationMessage[]>>({});
  const [isSimulationActive, setIsSimulationActive] = useState(false);
  const [simulationComplete, setSimulationComplete] = useState<Record<string, boolean>>({});
  const [variationStatuses, setVariationStatuses] = useState<Record<string, 'approved' | 'pending' | 'rejected'>>({});
  const [editingStep, setEditingStep] = useState<{variationId: string, stepKey: string} | null>(null);
  const [editedQuestion, setEditedQuestion] = useState<string>('');
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [configStepKey, setConfigStepKey] = useState<string>('');

  // Buscar assuntos do agente
  const { data: subjects, isLoading: isLoadingSubjects } = useQuery({
    queryKey: ['flow_subjects', selectedAgent],
    queryFn: async () => {
      if (!selectedAgent) return [];
      
      const { data, error } = await supabase
        .from('agent_flow_subjects')
        .select('*')
        .eq('agent_type', selectedAgent as any)
        .eq('is_active', true)
        .order('display_order');
      
      if (error) throw error;
      return data as FlowSubject[];
    },
    enabled: !!selectedAgent,
  });

  const { data: steps, isLoading } = useQuery({
    queryKey: ['guided_flow_steps', selectedAgent, selectedSubject],
    queryFn: async () => {
      if (!selectedAgent) return [];
      
      let query = supabase
        .from('agent_flow_steps')
        .select('*')
        .eq('agent_type', selectedAgent as any)
        .eq('is_active', true);
      
      // Filtrar por assunto se selecionado
      if (selectedSubject) {
        query = query.eq('subject_key', selectedSubject);
      }
      
      const { data, error } = await query.order('step_order');
      
      if (error) throw error;
      return data as FlowStep[];
    },
    enabled: !!selectedAgent,
  });

  // Carregar aprovações salvas do banco
  const { data: savedApprovals } = useQuery({
    queryKey: ['scenario_approvals', selectedAgent, selectedSubject, selectedScenario],
    queryFn: async () => {
      if (!selectedAgent || !selectedScenario) return [];
      
      let query = supabase
        .from('agent_flow_scenario_approvals')
        .select('*')
        .eq('agent_type', selectedAgent as any)
        .eq('scenario_key', selectedScenario);
      
      // Filtrar por assunto se selecionado
      if (selectedSubject) {
        query = query.eq('subject_key', selectedSubject);
      }
      
      const { data, error } = await query;
      
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
      return step.response_options.map((opt: any) => {
        // Formato complexo: { label: "...", value: "...", next_step: "..." }
        if (typeof opt === 'object' && opt !== null && (opt.value || opt.key)) {
          return {
            key: String(opt.value || opt.key),
            label: String(opt.label || opt.text || opt.value || opt.key),
          };
        }
        // Formato simples: string direta
        return {
          key: String(opt),
          label: String(opt),
        };
      });
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
          const nextStep = steps.find(s => s.step_key === nextStepKey);
          if (nextStep) {
            explorePath(
              nextStepKey,
              [...path, option.key],
              [...pathLabels, option.label],
              depth + 1
            );
          } else {
            // Next step não está nos steps carregados: tratar como término do caminho
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
      
      // Atualizar todas as conversas locais
      setConversations(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(varId => {
          updated[varId] = updated[varId].map(msg => 
            msg.step_key === variables.stepKey 
              ? { ...msg, question: variables.question }
              : msg
          );
        });
        return updated;
      });
      
      toast({ title: '✅ Texto atualizado com sucesso!' });
      setEditingStep(null);
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
      subjectKey,
      scenarioKey, 
      variationPath, 
      status 
    }: { 
      agentType: string;
      subjectKey?: string;
      scenarioKey: string; 
      variationPath: string; 
      status: 'approved' | 'rejected' 
    }) => {
      const { error } = await supabase
        .from('agent_flow_scenario_approvals')
        .upsert({
          agent_type: agentType as any,
          subject_key: subjectKey,
          scenario_key: scenarioKey,
          variation_path: variationPath,
          status,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'agent_type,subject_key,scenario_key,variation_path'
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

  const handleStartEdit = (variationId: string, stepKey: string, currentQuestion: string) => {
    setEditingStep({ variationId, stepKey });
    setEditedQuestion(currentQuestion);
  };

  const handleSaveEdit = () => {
    if (!editingStep || !editedQuestion.trim()) {
      toast({ title: 'Digite um texto válido', variant: 'destructive' });
      return;
    }
    updateStepMutation.mutate({ stepKey: editingStep.stepKey, question: editedQuestion });
  };

  const handleCancelEdit = () => {
    setEditingStep(null);
    setEditedQuestion('');
  };

  const toggleVariationSelection = (variationId: string) => {
    setSelectedVariations(prev => {
      if (prev.includes(variationId)) {
        return prev.filter(id => id !== variationId);
      } else {
        return [...prev, variationId];
      }
    });
  };

  const handleStartSimulation = async () => {
    if (!selectedAgent || !selectedScenario) {
      toast({ 
        title: 'Selecione todas as opções',
        description: 'Escolha o agente e cenário antes de iniciar',
        variant: 'destructive'
      });
      return;
    }

    if (variations.length > 0 && selectedVariations.length === 0) {
      toast({ 
        title: 'Selecione variações',
        description: 'Selecione pelo menos uma variação para simular',
        variant: 'destructive'
      });
      return;
    }

    if (variations.length === 0) {
      toast({
        title: 'Nenhuma variação encontrada',
        description: 'Este cenário não possui caminhos configurados para simulação',
        variant: 'destructive'
      });
      return;
    }

    setConversations({});
    setIsSimulationActive(true);
    setSimulationComplete({});

    const newConversations: Record<string, ConversationMessage[]> = {};
    const newCompletions: Record<string, boolean> = {};

    // Executar simulação para cada variação selecionada
    for (const variationId of selectedVariations) {
      const variation = variations.find(v => v.id === variationId);
      if (!variation) continue;

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

      newConversations[variationId] = messages;
      newCompletions[variationId] = true;
    }

    setConversations(newConversations);
    setSimulationComplete(newCompletions);
    toast({ 
      title: '✅ Simulações concluídas!',
      description: `${selectedVariations.length} variação(ões) simulada(s)`
    });
  };

  const handleApproval = async (variationId: string, status: 'approved' | 'rejected') => {
    if (selectedAgent && selectedScenario) {
      const variation = variations.find(v => v.id === variationId);
      if (variation) {
        const variationPath = variation.path.join('→');
        
        // Salvar no banco
        saveApprovalMutation.mutate({
          agentType: selectedAgent,
          subjectKey: selectedSubject,
          scenarioKey: selectedScenario,
          variationPath,
          status
        });
        
        // Atualizar estado local
        setVariationStatuses(prev => ({
          ...prev,
          [variationId]: status
        }));
      }
    }
    
    toast({ 
      title: status === 'approved' ? '✅ Variação aprovada!' : '❌ Variação não aprovada',
      description: 'Status salvo com sucesso'
    });
  };

  const handleBulkApproval = async (status: 'approved' | 'rejected') => {
    for (const variationId of selectedVariations) {
      await handleApproval(variationId, status);
    }
    toast({ 
      title: status === 'approved' ? '✅ Todas aprovadas!' : '❌ Todas não aprovadas',
      description: `${selectedVariations.length} variação(ões) ${status === 'approved' ? 'aprovadas' : 'reprovadas'}`
    });
  };

  const handleResetSimulation = () => {
    setConversations({});
    setIsSimulationActive(false);
    setSimulationComplete({});
    setSelectedVariations([]);
    toast({ title: '🔄 Simulação reiniciada' });
  };

  const handleClearApprovals = async () => {
    if (!selectedAgent || !selectedSubject) {
      toast({
        title: 'Selecione agente e assunto',
        variant: 'destructive'
      });
      return;
    }

    // Buscar nome do assunto para mostrar na confirmação
    const subjectName = subjects?.find(s => s.subject_key === selectedSubject)?.subject_name || selectedSubject;

    const { error } = await supabase
      .from('agent_flow_scenario_approvals')
      .delete()
      .eq('agent_type', selectedAgent as any)
      .eq('subject_key', selectedSubject);

    if (error) {
      toast({
        title: 'Erro ao limpar aprovações',
        description: error.message,
        variant: 'destructive'
      });
    } else {
      queryClient.invalidateQueries({ queryKey: ['scenario_approvals'] });
      setVariationStatuses({});
      toast({
        title: '✅ Aprovações limpas!',
        description: `Todas as aprovações de "${subjectName}" foram removidas`
      });
    }
  };

  const selectedSubjectName = subjects?.find(s => s.subject_key === selectedSubject)?.subject_name || selectedSubject;

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
            Escolha o agente, assunto, cenário e variações para simular
          </p>
        </div>

        {/* Duas Caixas de Seleção */}
        {!isSimulationActive && (
          <div className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              {/* Caixa 1: Agente */}
              <div>
                <label className="text-sm font-medium block mb-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs mr-2">1</span>
                  Escolher o Agente
                </label>
                <Select value={selectedAgent} onValueChange={(value) => {
                  setSelectedAgent(value);
                  setSelectedSubject('');
                  setSelectedScenario('');
                  setSelectedVariations([]);
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

              {/* Caixa 2: Assunto */}
              <div>
                <label className="text-sm font-medium block mb-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs mr-2">2</span>
                  Escolher o Assunto
                </label>
                <Select 
                  value={selectedSubject} 
                  onValueChange={(value) => {
                    setSelectedSubject(value);
                    setSelectedScenario('');
                    setSelectedVariations([]);
                  }}
                  disabled={!selectedAgent || isLoadingSubjects}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder={
                      isLoadingSubjects ? 'Carregando...' : 
                      !selectedAgent ? 'Selecione um agente primeiro' :
                      subjects && subjects.length === 0 ? 'Nenhum assunto cadastrado' :
                      'Escolha o assunto...'
                    } />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {subjects?.map(subject => (
                      <SelectItem key={subject.id} value={subject.subject_key}>
                        {subject.icon} {subject.subject_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Caixa 3: Cenário */}
              <div>
                <label className="text-sm font-medium block mb-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs mr-2">3</span>
                  Escolher o Cenário
                </label>
                <Select 
                  value={selectedScenario} 
                  onValueChange={(value) => {
                    setSelectedScenario(value);
                    setSelectedVariations([]);
                  }}
                  disabled={!selectedSubject || isLoading}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder={
                      isLoading ? 'Carregando...' : 
                      !selectedSubject ? 'Selecione um assunto primeiro' :
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
            </div>

        {/* Caixa 4: Variações com checkboxes */}
        {selectedScenario && (
          <div>
            <label className="text-sm font-medium block mb-2">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs mr-2">4</span>
              Escolher Variações
              <Badge variant="secondary" className="ml-2">
                {selectedVariations.length} selecionadas
              </Badge>
            </label>
            {variations.length === 0 ? (
              <div className="border rounded-lg p-4 text-center text-sm text-muted-foreground">
                ⚠️ Nenhuma variação encontrada para este cenário. Verifique se o cenário tem opções de resposta e próximos passos configurados.
              </div>
            ) : (
                <ScrollArea className="h-[300px] border rounded-lg p-4">
                  <div className="space-y-2">
                    {variations.map(variation => {
                      const variationPath = variation.path.join('→');
                      const savedStatus = savedApprovals?.find(
                        (approval: any) => approval.variation_path === variationPath
                      );
                      const status = savedStatus?.status || variationStatuses[variation.id] || 'pending';
                      const statusColor = status === 'approved' ? 'text-green-600' : status === 'rejected' ? 'text-red-600' : 'text-orange-600';
                      const statusIcon = status === 'approved' ? '✅' : status === 'rejected' ? '❌' : '⏳';
                      const isSelected = selectedVariations.includes(variation.id);
                      
                      return (
                        <div 
                          key={variation.id}
                          className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                            isSelected ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'
                          }`}
                          onClick={() => toggleVariationSelection(variation.id)}
                        >
                          <Checkbox 
                            checked={isSelected}
                            onCheckedChange={() => toggleVariationSelection(variation.id)}
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`${statusColor} text-lg`}>{statusIcon}</span>
                              <span className="font-medium">{variation.name}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 break-words">
                              {variation.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}
        </div>
        )}

        {/* Botões de Controle */}
        <div className="flex gap-2">
          {!isSimulationActive ? (
            <>
              <Button
                onClick={handleStartSimulation}
                disabled={!selectedAgent || !selectedScenario || (variations.length > 0 && selectedVariations.length === 0) || variations.length === 0 || isLoading}
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
                    Simular {selectedVariations.length > 0 && `(${selectedVariations.length})`}
                  </>
                )}
              </Button>
              {selectedAgent && selectedSubject && savedApprovals && savedApprovals.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      Limpar Aprovações ({savedApprovals.length})
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>⚠️ Confirmar Limpeza de Aprovações</AlertDialogTitle>
                      <AlertDialogDescription className="space-y-2">
                        <p>Você está prestes a remover:</p>
                        <div className="bg-destructive/10 p-3 rounded-lg border border-destructive/20">
                          <p className="font-semibold text-destructive">
                            {savedApprovals.length} aprovação(ões) do assunto "{selectedSubjectName}"
                          </p>
                        </div>
                        <p className="text-muted-foreground text-xs mt-2">
                          ✅ Aprovações de outros assuntos NÃO serão afetadas
                        </p>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleClearApprovals} className="bg-destructive hover:bg-destructive/90">
                        Confirmar Limpeza
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </>
          ) : (
            <>
              <Button
                onClick={handleResetSimulation}
                variant="outline"
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Nova Simulação
              </Button>
              {Object.values(simulationComplete).some(v => v) && (
                <>
                  <Button
                    onClick={() => handleBulkApproval('approved')}
                    variant="default"
                    className="gap-2"
                  >
                    <CheckCheck className="h-4 w-4" />
                    Aprovar Todas
                  </Button>
                  <Button
                    onClick={() => handleBulkApproval('rejected')}
                    variant="destructive"
                    className="gap-2"
                  >
                    <XCircle className="h-4 w-4" />
                    Reprovar Todas
                  </Button>
                </>
              )}
            </>
          )}
        </div>

        {/* Simulações em Paralelo */}
        {isSimulationActive && Object.keys(conversations).length > 0 && (
          <div className={`grid gap-4 ${selectedVariations.length === 1 ? 'grid-cols-1' : selectedVariations.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
            {selectedVariations.map(variationId => {
              const variation = variations.find(v => v.id === variationId);
              const conversation = conversations[variationId] || [];
              const isComplete = simulationComplete[variationId];
              const variationPath = variation?.path.join('→') || '';
              const savedStatus = savedApprovals?.find(
                (approval: any) => approval.variation_path === variationPath
              );
              const currentStatus = savedStatus?.status || variationStatuses[variationId] || 'pending';

              return (
                <Card key={variationId} className="p-4 space-y-3">
                  {/* Header do Card */}
                  <div className="flex items-center justify-between pb-2 border-b">
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm">{variation?.name}</h3>
                      <p className="text-xs text-muted-foreground">{variation?.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {conversation.length > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setConfigStepKey(conversation[0].step_key);
                            setConfigDialogOpen(true);
                          }}
                          className="h-7 gap-1 text-xs"
                        >
                          <Settings className="h-3 w-3" />
                          Configurar
                        </Button>
                      )}
                      <Badge variant={currentStatus === 'approved' ? 'default' : currentStatus === 'rejected' ? 'destructive' : 'secondary'}>
                        {currentStatus === 'approved' ? '✅' : currentStatus === 'rejected' ? '❌' : '⏳'}
                      </Badge>
                    </div>
                  </div>

                  {/* Conversa */}
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2 pr-3">
                      {conversation.map((msg, idx) => (
                        <div key={idx} className="space-y-1">
                          {/* Mensagem do agente */}
                          <div className="bg-primary/10 p-2 rounded-lg text-xs group relative">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-muted-foreground">
                                #{idx + 1} 🤖
                              </span>
                              {editingStep?.variationId !== variationId || editingStep?.stepKey !== msg.step_key ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
                                  onClick={() => handleStartEdit(variationId, msg.step_key, msg.question)}
                                >
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                              ) : null}
                            </div>
                            
                            {editingStep?.variationId === variationId && editingStep?.stepKey === msg.step_key ? (
                              <div className="space-y-1">
                                <Textarea
                                  value={editedQuestion}
                                  onChange={(e) => setEditedQuestion(e.target.value)}
                                  className="min-h-[40px] text-xs"
                                  autoFocus
                                />
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    onClick={handleSaveEdit}
                                    disabled={updateStepMutation.isPending}
                                    className="h-6 text-xs"
                                  >
                                    {updateStepMutation.isPending ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Save className="h-3 w-3" />
                                    )}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={handleCancelEdit}
                                    className="h-6 text-xs"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs">{msg.question}</p>
                            )}
                          </div>

                          {/* Resposta do usuário */}
                          <div className="bg-muted p-2 rounded-lg text-xs ml-4">
                            <span className="font-medium text-muted-foreground">👤 </span>
                            <span>{msg.selected_option_label}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  {/* Botões de aprovação individual */}
                  {isComplete && (
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                      <Button
                        size="sm"
                        onClick={() => handleApproval(variationId, 'approved')}
                        variant={currentStatus === 'approved' ? 'default' : 'outline'}
                        className="gap-1 text-xs"
                      >
                        <ThumbsUp className="h-3 w-3" />
                        Aprovar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleApproval(variationId, 'rejected')}
                        variant={currentStatus === 'rejected' ? 'destructive' : 'outline'}
                        className="gap-1 text-xs"
                      >
                        <ThumbsDown className="h-3 w-3" />
                        Reprovar
                      </Button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Dialog de Configuração do Step */}
      <StepConfigDialog
        stepKey={configStepKey}
        agentType={selectedAgent}
        isOpen={configDialogOpen}
        onClose={() => {
          setConfigDialogOpen(false);
          setConfigStepKey('');
        }}
      />
    </Card>
  );
}
