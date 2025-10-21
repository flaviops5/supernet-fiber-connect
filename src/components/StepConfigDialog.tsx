import { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, X, Trash2, Smile, Settings } from 'lucide-react';

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
  step_tools: string[] | null;
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

interface StepConfigDialogProps {
  stepKey: string;
  stepId?: string;
  agentType: string;
  isOpen: boolean;
  focusToolsOnOpen?: boolean;
  onClose: () => void;
}

const AVAILABLE_TOOLS = [
  { value: 'test_equipment_connectivity', label: '🔌 Test Equipment Connectivity' },
  { value: 'criar_atendimento_ixc', label: '📋 Criar Atendimento IXC' },
  { value: 'reboot_client_equipment', label: '🔄 Reboot Equipment' },
  { value: 'get_onu_signal_status', label: '📡 Get ONU Signal' },
  { value: 'ixc_client_lookup', label: '🔍 IXC Client Lookup' },
  { value: 'send_payment_to_customer', label: '💳 Send Payment' },
];

export default function StepConfigDialog({ stepKey, stepId, agentType, isOpen, focusToolsOnOpen, onClose }: StepConfigDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Partial<FlowStep>>({});
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);

  const EMOJIS = [
    '😊', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
    '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙',
    '👋', '🤚', '🖐', '✋', '🖖', '👌', '🤏', '✌️', '🤞', '🤟',
    '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎',
    '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏',
    '⏱️', '⏰', '⏳', '📱', '💻', '🖥️', '📡', '🔌', '🔋', '💡',
    '🔦', '🔧', '🔨', '⚙️', '🛠️', '⚡', '🔥', '💧', '🌊', '🌐',
    '📞', '📧', '📨', '📩', '📤', '📥', '📦', '📫', '📪', '📬',
    '✅', '❌', '⭕', '🔴', '🟢', '🟡', '🔵', '⚪', '⚫', '🟣',
    '📊', '📈', '📉', '💰', '💳', '💸', '🏠', '🏢', '🏪', '🏬',
  ];

const { data: step, isLoading } = useQuery({
  queryKey: ['flow_step', agentType, stepKey, stepId],
  queryFn: async () => {
    if (stepId) {
      const { data, error } = await supabase
        .from('agent_flow_steps')
        .select('*')
        .eq('id', stepId)
        .single();
      if (error) throw error;
      return data as FlowStep;
    }

    const { data, error } = await supabase
      .from('agent_flow_steps')
      .select('*')
      .eq('agent_type', agentType as any)
      .eq('step_key', stepKey)
      .single();
    
    if (error) throw error;
    return data as FlowStep;
  },
  enabled: isOpen && (!!stepId || (!!stepKey && !!agentType)),
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

  useEffect(() => {
    if (step) {
      setFormData({
        question: step.question,
        instruction: step.instruction,
        response_options: step.response_options,
        response_variations: step.response_variations,
        tool_calls: step.tool_calls,
        step_tools: step.step_tools,
        next_step_map: step.next_step_map,
        awaits_response: step.awaits_response,
        media_id: step.media_id,
      });
      
      // Inicializar tools selecionadas - priorizar step_tools
      const toolsToUse = step.step_tools || step.tool_calls;
      if (Array.isArray(toolsToUse)) {
        const tools = toolsToUse.map((t: any) => 
          typeof t === 'string' ? t : t?.tool || t?.name
        ).filter(Boolean);
        setSelectedTools(tools);
      }
    }
  }, [step]);

  useEffect(() => {
    if (isOpen && focusToolsOnOpen) {
      const t = setTimeout(() => {
        toolsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
      return () => clearTimeout(t);
    }
  }, [isOpen, focusToolsOnOpen, step]);
 
   const updateStepMutation = useMutation({
    mutationFn: async (data: Partial<FlowStep>) => {
      if (!step) throw new Error('Step não encontrado');
      
      const { error } = await supabase
        .from('agent_flow_steps')
        .update({
          ...data,
          step_tools: selectedTools.length > 0 ? selectedTools : null,
          updated_at: new Date().toISOString()
        } as any)
        .eq('id', step.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flow_step'] });
      queryClient.invalidateQueries({ queryKey: ['agent_flow_steps'] });
      queryClient.invalidateQueries({ queryKey: ['guided_flow_steps'] });
      toast({ title: '✅ Configurações salvas com sucesso!' });
      onClose();
    },
    onError: (error: any) => {
      toast({ 
        title: 'Erro ao salvar', 
        description: error.message,
        variant: 'destructive'
      });
    },
  });

  const handleSave = () => {
    updateStepMutation.mutate(formData);
  };

  const toggleTool = (toolName: string) => {
    setSelectedTools(prev => 
      prev.includes(toolName) 
        ? prev.filter(t => t !== toolName)
        : [...prev, toolName]
    );
  };

  const insertEmoji = (emoji: string) => {
    const currentQuestion = formData.question || '';
    setFormData({ ...formData, question: currentQuestion + emoji });
    setShowEmojiPicker(false);
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>⚙️ Configurar Step: {step?.step_key || stepKey}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Questão */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label>Questão</Label>
              <div className="relative">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="h-7 gap-1"
                >
                  <Smile className="h-3 w-3" />
                  Emojis
                </Button>
                
                {showEmojiPicker && (
                  <div className="absolute right-0 top-9 z-50 bg-background border rounded-lg shadow-lg p-3 w-64">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium">Selecione um emoji</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowEmojiPicker(false)}
                        className="h-5 w-5 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-10 gap-1 max-h-48 overflow-y-auto">
                      {EMOJIS.map((emoji, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => insertEmoji(emoji)}
                          className="text-lg hover:bg-accent rounded p-1 transition-colors"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <Textarea
              value={formData.question || ''}
              onChange={(e) => setFormData({ ...formData, question: e.target.value })}
              className="mt-1"
              rows={3}
            />
          </div>

          {/* Instrução */}
          <div>
            <Label>Instrução</Label>
            <Textarea
              value={formData.instruction || ''}
              onChange={(e) => setFormData({ ...formData, instruction: e.target.value })}
              className="mt-1"
              rows={4}
            />
          </div>

          {/* Mídia */}
          <div>
            <Label>Mídia da Biblioteca</Label>
            <div className="flex gap-2 items-center mt-1">
              <Select 
                value={formData.media_id || undefined} 
                onValueChange={(value) => setFormData({ ...formData, media_id: value || null })}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Selecione uma mídia (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {mediaItems?.map(media => (
                    <SelectItem key={media.id} value={media.id}>
                      {media.title} ({media.file_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.media_id && (
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => setFormData({ ...formData, media_id: null })}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Tools */}
          <div ref={toolsRef}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <Label className="text-base">🔧 Step Tools (Override)</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Tools específicas deste step (sobrescreve as padrão do assunto)
                </p>
              </div>
              <Badge variant="secondary" className="text-xs">
                {selectedTools.length} selecionada(s)
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 p-3 bg-muted/50 rounded-lg">
              {AVAILABLE_TOOLS.map(tool => (
                <div
                  key={tool.value}
                  onClick={() => toggleTool(tool.value)}
                  className={`
                    p-2 rounded cursor-pointer transition-all text-xs font-medium
                    ${selectedTools.includes(tool.value) 
                      ? 'bg-primary text-primary-foreground shadow-sm' 
                      : 'bg-background hover:bg-accent border border-border'
                    }
                  `}
                >
                  {tool.label}
                </div>
              ))}
            </div>
            <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-xs text-blue-600 dark:text-blue-400 flex items-start gap-2">
                <span className="text-sm">💡</span>
                <span>
                  <strong>Como funciona:</strong> Se nenhuma tool for selecionada, o step usa as tools padrão do assunto.
                  Se você selecionar pelo menos uma, ela substitui completamente as padrão.
                </span>
              </p>
            </div>
          </div>

          {/* Response Options */}
          <div>
            <Label>Response Options (JSON)</Label>
            <Textarea
              value={JSON.stringify(formData.response_options, null, 2)}
              onChange={(e) => {
                try {
                  setFormData({ ...formData, response_options: JSON.parse(e.target.value) });
                } catch {}
              }}
              className="mt-1 font-mono text-xs"
              rows={6}
            />
          </div>

          {/* Response Variations */}
          <div>
            <Label>Response Variations (JSON)</Label>
            <Textarea
              value={JSON.stringify(formData.response_variations, null, 2)}
              onChange={(e) => {
                try {
                  setFormData({ ...formData, response_variations: JSON.parse(e.target.value) });
                } catch {}
              }}
              className="mt-1 font-mono text-xs"
              rows={6}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button
            variant="outline"
            title="Configurar tools deste step"
            onClick={() => toolsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button onClick={handleSave} disabled={updateStepMutation.isPending}>
            {updateStepMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
