import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Edit, Save, X, Trash2, Plus, Copy, Sparkles, MessageSquare } from 'lucide-react';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { AuthGuard } from '@/components/AuthGuard';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import GuidedFlowSimulator from '@/components/GuidedFlowSimulator';
import FlowSubjectManager from '@/components/FlowSubjectManager';
import AIFlowGenerator from '@/components/AIFlowGenerator';
import StepConfigDialog from '@/components/StepConfigDialog';

interface FlowStep {
  id: string;
  agent_type: string;
  step_key: string;
  step_order: number;
  question: string;
  instruction: string;
  response_options: any;
  response_variations: any;
  tool_calls: any;
  next_step_map: any;
  awaits_response: boolean;
  is_active: boolean;
  media_id: string | null;
}

interface MediaItem {
  id: string;
  title: string;
  file_url: string;
  file_type: string;
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

export default function AdminFluxoAgentes() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [selectedAgent, setSelectedAgent] = useState<string>('support-tech-agent');
  const [isGeneratingSimulations, setIsGeneratingSimulations] = useState(false);
  const [showSimulations, setShowSimulations] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [configStepKey, setConfigStepKey] = useState('');
  const [configStepId, setConfigStepId] = useState('');

  const { data: steps, isLoading } = useQuery({
    queryKey: ['agent_flow_steps', selectedAgent],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_flow_steps')
        .select('*')
        .eq('agent_type', selectedAgent as any)
        .eq('is_active', true)
        .order('step_order');
      
      if (error) throw error;
      return data as FlowStep[];
    },
  });

  const { data: mediaItems } = useQuery({
    queryKey: ['media_repository'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('media_repository')
        .select('id, title, file_url, file_type')
        .eq('is_active', true)
        .order('title');
      
      if (error) throw error;
      return data as MediaItem[];
    },
  });

  const { data: simulations, refetch: refetchSimulations } = useQuery({
    queryKey: ['flow_simulations', selectedAgent],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('flow_simulations')
        .select('*')
        .eq('agent_type', selectedAgent)
        .order('quality_score', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: showSimulations,
  });

  const updateStepMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase
        .from('agent_flow_steps')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent_flow_steps'] });
      toast({ title: 'Step atualizado com sucesso!' });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao atualizar step', 
        description: error.message,
        variant: 'destructive'
      });
    },
  });

  const handleGenerateSimulations = async () => {
    setIsGeneratingSimulations(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-flow-simulations', {
        body: { agentType: selectedAgent }
      });

      if (error) throw error;

      toast({ 
        title: 'Simulações geradas!', 
        description: `${data.totalSimulations} conversas criadas com sucesso. Score médio: ${data.avgQualityScore.toFixed(1)}` 
      });
      
      setShowSimulations(true);
      refetchSimulations();
    } catch (error: any) {
      toast({ 
        title: 'Erro ao gerar simulações', 
        description: error.message,
        variant: 'destructive' 
      });
    } finally {
      setIsGeneratingSimulations(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const selectedAgentLabel = AGENT_TYPES.find(a => a.value === selectedAgent)?.label || selectedAgent;

  return (
    <AuthGuard requiredRoles={['admin']}>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-16 items-center gap-4 px-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/admin/agents')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <div className="h-6 w-px bg-border" />
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Administrar Fluxos de Agentes
            </h1>
          </div>
        </header>

        <main className="container mx-auto p-6 max-w-6xl">
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Selecionar Agente</label>
            <Select value={selectedAgent} onValueChange={setSelectedAgent}>
              <SelectTrigger className="w-full max-w-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AGENT_TYPES.map(agent => (
                  <SelectItem key={agent.value} value={agent.value}>
                    {agent.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold">Fluxo: {selectedAgentLabel}</h2>
            <p className="text-muted-foreground">
              {steps?.length || 0} steps configurados
            </p>
          </div>

          {/* Tabs para Simulador e Gerenciar Assuntos */}
          <Tabs defaultValue="simulator" className="mb-6">
            <TabsList className="grid w-full max-w-3xl grid-cols-4">
              <TabsTrigger value="simulator">🎮 Simulador</TabsTrigger>
              <TabsTrigger value="subjects">📚 Assuntos</TabsTrigger>
              <TabsTrigger value="ai-generator">✨ IA Gerador</TabsTrigger>
              <TabsTrigger value="auto-simulator">🤖 Simulador Auto</TabsTrigger>
            </TabsList>
            
            <TabsContent value="simulator" className="mt-6">
              <GuidedFlowSimulator />
            </TabsContent>
            
            <TabsContent value="subjects" className="mt-6">
              <FlowSubjectManager agentType={selectedAgent} />
            </TabsContent>
            
            <TabsContent value="ai-generator" className="mt-6">
              <AIFlowGenerator agentType={selectedAgent} />
            </TabsContent>
            
            <TabsContent value="auto-simulator" className="mt-6">
              <Card className="p-6 mb-6 bg-gradient-to-r from-primary/10 to-primary/5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      Simulador Automático de Conversas
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Gere automaticamente todas as conversas possíveis deste fluxo para análise
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {showSimulations && (
                      <Button
                        variant="outline"
                        onClick={() => setShowSimulations(false)}
                      >
                        Ocultar Simulações
                      </Button>
                    )}
                    <Button
                      onClick={handleGenerateSimulations}
                      disabled={isGeneratingSimulations || !steps || steps.length === 0}
                      className="gap-2"
                    >
                      {isGeneratingSimulations ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Gerando...
                        </>
                      ) : (
                        <>
                          <MessageSquare className="h-4 w-4" />
                          Gerar Todas as Simulações
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Lista de Simulações */}
              {showSimulations && simulations && simulations.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-xl font-bold mb-4">
                    📊 Simulações Geradas ({simulations.length})
                  </h2>
                  
                  <div className="grid gap-4">
                    {simulations.map((sim: any) => (
                      <Card key={sim.id} className="p-5">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-base">{sim.simulation_name}</h3>
                            <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                              <span>⏱️ {sim.total_steps} steps</span>
                              <span>🕐 ~{sim.estimated_duration_seconds}s</span>
                              <Badge 
                                variant={sim.quality_score >= 80 ? 'default' : sim.quality_score >= 60 ? 'secondary' : 'destructive'}
                              >
                                Score: {sim.quality_score?.toFixed(0) || 0}/100
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2 mt-4">
                          <details className="group">
                            <summary className="cursor-pointer text-sm font-medium text-primary hover:underline">
                              Ver Conversa Completa ({sim.conversation_transcript?.length || 0} mensagens)
                            </summary>
                            <div className="mt-3 space-y-2 pl-4 border-l-2 border-primary/20">
                              {sim.conversation_transcript?.map((msg: any, idx: number) => (
                                <div key={idx} className={`p-3 rounded-lg ${
                                  msg.role === 'user' 
                                    ? 'bg-muted ml-4' 
                                    : 'bg-primary/10 mr-4'
                                }`}>
                                  <div className="text-xs font-medium text-muted-foreground mb-1">
                                    {msg.role === 'user' ? '👤 Cliente' : '🤖 Luan'}
                                  </div>
                                  <div className="text-sm">{msg.message}</div>
                                </div>
                              ))}
                            </div>
                          </details>

                          {sim.issues_detected && sim.issues_detected.length > 0 && (
                            <details className="group">
                              <summary className="cursor-pointer text-sm font-medium text-destructive hover:underline">
                                ⚠️ Problemas Detectados ({sim.issues_detected.length})
                              </summary>
                              <ul className="mt-2 pl-4 space-y-1 text-sm text-muted-foreground">
                                {sim.issues_detected.map((issue: string, idx: number) => (
                                  <li key={idx}>• {issue}</li>
                                ))}
                              </ul>
                            </details>
                          )}

                          {sim.suggestions && sim.suggestions.length > 0 && (
                            <details className="group">
                              <summary className="cursor-pointer text-sm font-medium text-primary hover:underline">
                                💡 Sugestões de Melhoria ({sim.suggestions.length})
                              </summary>
                              <ul className="mt-2 pl-4 space-y-1 text-sm text-muted-foreground">
                                {sim.suggestions.map((suggestion: string, idx: number) => (
                                  <li key={idx}>• {suggestion}</li>
                                ))}
                              </ul>
                            </details>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="space-y-4">
            {steps?.map((step) => (
              <Card key={step.id} id={`step-${step.id}`} className="p-6 scroll-mt-20">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">
                        {step.step_order}. {step.step_key}
                      </h3>
                    </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => {
                      setConfigStepKey(step.step_key);
                      setConfigStepId(step.id);
                      setConfigDialogOpen(true);
                    }}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                  </div>

                    <div className="space-y-3">
                      <div>
                        <span className="font-medium text-sm">Questão:</span>
                        <p className="text-sm text-muted-foreground">{step.question}</p>
                      </div>

                      <div>
                        <span className="font-medium text-sm">Instrução:</span>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{step.instruction}</p>
                      </div>

                      {step.media_id && mediaItems && (
                        <div>
                          <span className="font-medium text-sm">Mídia anexada:</span>
                          {(() => {
                            const media = mediaItems.find(m => m.id === step.media_id);
                            if (!media) return null;
                            return (
                              <div className="mt-2 p-2 border rounded">
                                <p className="text-sm mb-2">{media.title}</p>
                                {media.file_type.startsWith('image/') && (
                                  <img src={media.file_url} alt={media.title} className="max-h-48 rounded" />
                                )}
                                {media.file_type.startsWith('video/') && (
                                  <video src={media.file_url} controls className="max-h-48 rounded" />
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {step.response_options && Object.keys(step.response_options).length > 0 && (
                        <div>
                          <span className="font-medium text-sm">Opções de Resposta e Fluxo:</span>
                          <div className="space-y-2 mt-2">
                            {Object.entries(step.response_options).map(([key, value]) => {
                              const responseValue = String(value);
                              const nextStep = step.next_step_map?.[responseValue];
                              const stepKey = nextStep ? String(nextStep) : null;
                              const targetStep = stepKey ? steps?.find(s => s.step_key === stepKey) : null;
                              
                              return (
                                <div key={key} className="bg-muted/50 border border-border p-3 rounded-lg hover:bg-muted transition-colors">
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 flex-1">
                                      <Badge variant="outline" className="font-mono text-xs">
                                        {key}
                                      </Badge>
                                      <span className="text-sm font-medium">
                                        {responseValue}
                                      </span>
                                    </div>
                                    
                                    {stepKey && (
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground">→</span>
                                        {targetStep ? (
                                          <button
                                            onClick={() => {
                                              const element = document.getElementById(`step-${targetStep.id}`);
                                              if (element) {
                                                const headerOffset = 80;
                                                const elementPosition = element.getBoundingClientRect().top;
                                                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                                                
                                                window.scrollTo({
                                                  top: offsetPosition,
                                                  behavior: 'smooth'
                                                });
                                              }
                                            }}
                                            className="text-xs font-mono text-primary hover:underline hover:bg-primary/10 px-2 py-1 rounded transition-colors"
                                          >
                                            {stepKey}
                                          </button>
                                        ) : (
                                          <span className="text-xs font-mono text-muted-foreground px-2 py-1 rounded bg-muted">
                                            {stepKey}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {step.tool_calls && step.tool_calls.length > 0 && (
                        <div>
                          <span className="font-medium text-sm">🔧 Step Tools:</span>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {step.tool_calls.map((tool: any, idx: number) => {
                              const toolName = typeof tool === 'string' ? tool : tool?.tool || tool?.name || JSON.stringify(tool);
                              return (
                                <Badge key={idx} variant="outline" className="font-mono text-xs">
                                  {toolName}
                                </Badge>
                              );
                            })}
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            ℹ️ Estas tools sobrescrevem as configurações padrão do assunto
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
          </div>
        </main>

        {/* Dialog de Configuração do Step */}
        <StepConfigDialog
          stepKey={configStepKey}
          stepId={configStepId}
          agentType={selectedAgent}
          isOpen={configDialogOpen}
          onClose={() => {
            setConfigDialogOpen(false);
            setConfigStepKey('');
            setConfigStepId('');
          }}
        />
      </div>
    </AuthGuard>
  );
}
