import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sparkles, ThumbsUp, ThumbsDown, Copy } from 'lucide-react';
import { parseError } from '@/types/error.types';
import type { Database } from '@/integrations/supabase/types';

interface GeneratedConversation {
  id: string;
  scenario_description: string;
  conversation: {
    step: number;
    agent_message: string;
    user_response: string;
    tools_used?: string[];
  }[];
  quality_score: number;
  suggestions: string[];
}

interface AIFlowGeneratorProps {
  agentType: string;
  subjectKey?: string;
}

export default function AIFlowGenerator({ agentType, subjectKey }: AIFlowGeneratorProps) {
  const { toast } = useToast();
  const [theme, setTheme] = useState('');
  const [conversations, setConversations] = useState<GeneratedConversation[]>([]);
  const [approvedConversations, setApprovedConversations] = useState<Set<string>>(new Set());

  const generateMutation = useMutation({
    mutationFn: async (themeText: string) => {
      const { data, error } = await supabase.functions.invoke('generate-ai-flow-simulations', {
        body: { 
          agentType,
          theme: themeText,
          numVariations: 3
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setConversations(data.conversations || []);
      toast({ 
        title: '🎉 Conversas geradas!',
        description: `${data.conversations?.length || 0} variações criadas pela IA`
      });
    },
    onError: (error) => {
      const err = parseError(error);
      toast({ 
        title: 'Erro ao gerar conversas', 
        description: err.message,
        variant: 'destructive'
      });
    },
  });

  const handleGenerate = () => {
    if (!theme.trim()) {
      toast({
        title: 'Digite um tema',
        description: 'Descreva o cenário que deseja simular',
        variant: 'destructive'
      });
      return;
    }
    generateMutation.mutate(theme);
  };

  const approveMutation = useMutation({
    mutationFn: async ({ conversationId, conversation }: { conversationId: string; conversation: GeneratedConversation }) => {
      if (!subjectKey) {
        throw new Error('Subject não definido. Selecione um assunto antes de aprovar.');
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('agent_flow_scenario_approvals')
        .insert([{
          agent_type: agentType as Database['public']['Enums']['agent_type'],
          subject_key: subjectKey,
          scenario_key: conversationId,
          variation_path: conversation.scenario_description,
          status: 'approved',
          notes: `Score: ${conversation.quality_score}/100. ${conversation.suggestions.join('; ')}`,
          approved_by: user?.id || null
        }]);

      if (error) throw error;
      return conversationId;
    },
    onSuccess: (conversationId) => {
      setApprovedConversations(prev => new Set([...prev, conversationId]));
      toast({
        title: '✅ Conversa aprovada!',
        description: 'A conversa foi salva e atrelada ao assunto selecionado.',
      });
    },
    onError: (error) => {
      const err = parseError(error);
      toast({
        title: 'Erro ao aprovar',
        description: err.message,
        variant: 'destructive'
      });
    }
  });

  const handleApprove = (conversationId: string) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation) return;

    if (approvedConversations.has(conversationId)) {
      // Se já aprovada, apenas remove do estado local
      setApprovedConversations(prev => {
        const newSet = new Set(prev);
        newSet.delete(conversationId);
        return newSet;
      });
      return;
    }

    // Aprovar e salvar no banco
    approveMutation.mutate({ conversationId, conversation });
  };

  const handleCopyToClipboard = (conversation: GeneratedConversation) => {
    const text = conversation.conversation
      .map(step => `🤖 ${step.agent_message}\n👤 ${step.user_response}`)
      .join('\n\n');
    
    navigator.clipboard.writeText(text);
    toast({ title: '📋 Copiado!', description: 'Conversa copiada para a área de transferência' });
  };

  return (
    <Card className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          Gerador de Conversas por IA
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Descreva um tema e a IA criará variações completas de conversas para você analisar
        </p>
      </div>

      {!subjectKey && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            ⚠️ <strong>Atenção:</strong> Selecione um assunto acima para que as conversas aprovadas sejam corretamente atreladas.
          </p>
        </div>
      )}

      {/* Input do Tema */}
      <div className="space-y-2">
        <Label>Tema / Cenário para Simular</Label>
        <Textarea
          placeholder="Ex: Cliente reportando que a internet está lenta apenas em alguns dispositivos, principalmente no celular. O roteador está ligado e outros equipamentos funcionam normalmente."
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          className="min-h-[120px]"
        />
        <p className="text-xs text-muted-foreground">
          💡 Quanto mais detalhes você fornecer, melhores serão as simulações geradas
        </p>
      </div>

      {/* Botão Gerar */}
      <Button 
        onClick={handleGenerate}
        disabled={generateMutation.isPending || !theme.trim()}
        className="w-full gap-2"
      >
        {generateMutation.isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Gerando conversas...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Gerar Conversas com IA
          </>
        )}
      </Button>

      {/* Lista de Conversas Geradas */}
      {conversations.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              Conversas Geradas ({conversations.length})
            </h3>
            <Badge variant="secondary">
              {approvedConversations.size} aprovadas
            </Badge>
          </div>

          <ScrollArea className="h-[600px]">
            <div className="space-y-4 pr-4">
              {conversations.map((conv) => {
                const isApproved = approvedConversations.has(conv.id);
                
                return (
                  <Card key={conv.id} className={`p-4 ${isApproved ? 'border-primary' : ''}`}>
                    {/* Header da Conversa */}
                    <div className="flex items-start justify-between mb-3 pb-3 border-b">
                      <div className="flex-1">
                        <p className="font-medium text-sm mb-2">{conv.scenario_description}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            Score: {conv.quality_score}/100
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {conv.conversation.length} steps
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCopyToClipboard(conv)}
                          className="h-8 w-8 p-0"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Conversa */}
                    <div className="space-y-2 mb-3">
                      {conv.conversation.map((step, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="bg-primary/10 p-2 rounded text-xs">
                            <span className="font-medium text-muted-foreground">#{idx + 1} 🤖 </span>
                            {step.agent_message}
                            {step.tools_used && step.tools_used.length > 0 && (
                              <div className="flex gap-1 mt-1">
                                {step.tools_used.map((tool, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    🔧 {tool}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="bg-muted p-2 rounded text-xs ml-4">
                            <span className="font-medium text-muted-foreground">👤 </span>
                            {step.user_response}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Sugestões */}
                    {conv.suggestions && conv.suggestions.length > 0 && (
                      <div className="mb-3 p-2 bg-muted/50 rounded">
                        <p className="text-xs font-medium mb-1">💡 Sugestões de melhoria:</p>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          {conv.suggestions.map((suggestion, idx) => (
                            <li key={idx}>• {suggestion}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Botões de Aprovação */}
                    <div className="flex gap-2 pt-2 border-t">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(conv.id)}
                        variant={isApproved ? 'default' : 'outline'}
                        className="flex-1 gap-1"
                        disabled={approveMutation.isPending || !subjectKey}
                      >
                        {approveMutation.isPending ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <ThumbsUp className="h-3 w-3" />
                        )}
                        {isApproved ? 'Aprovada' : 'Aprovar'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 gap-1"
                      >
                        <ThumbsDown className="h-3 w-3" />
                        Descartar
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      )}
    </Card>
  );
}
