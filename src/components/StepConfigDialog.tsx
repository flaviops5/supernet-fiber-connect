import { useState, useEffect } from 'react';
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
import { Loader2, Save, X, Trash2 } from 'lucide-react';

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

interface StepConfigDialogProps {
  stepKey: string;
  agentType: string;
  isOpen: boolean;
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

export default function StepConfigDialog({ stepKey, agentType, isOpen, onClose }: StepConfigDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Partial<FlowStep>>({});
  const [selectedTools, setSelectedTools] = useState<string[]>([]);

  const { data: step, isLoading } = useQuery({
    queryKey: ['flow_step', agentType, stepKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_flow_steps')
        .select('*')
        .eq('agent_type', agentType as any)
        .eq('step_key', stepKey)
        .single();
      
      if (error) throw error;
      return data as FlowStep;
    },
    enabled: isOpen && !!stepKey && !!agentType,
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
        next_step_map: step.next_step_map,
        awaits_response: step.awaits_response,
        media_id: step.media_id,
      });
      
      // Inicializar tools selecionadas
      if (Array.isArray(step.tool_calls)) {
        const tools = step.tool_calls.map((t: any) => 
          typeof t === 'string' ? t : t?.tool || t?.name
        ).filter(Boolean);
        setSelectedTools(tools);
      }
    }
  }, [step]);

  const updateStepMutation = useMutation({
    mutationFn: async (data: Partial<FlowStep>) => {
      if (!step) throw new Error('Step não encontrado');
      
      const { error } = await supabase
        .from('agent_flow_steps')
        .update({
          ...data,
          tool_calls: selectedTools,
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
          <DialogTitle>⚙️ Configurar Step: {stepKey}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Questão */}
          <div>
            <Label>Questão</Label>
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
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>🔧 Step Tools</Label>
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
                    p-2 rounded cursor-pointer transition-all text-xs
                    ${selectedTools.includes(tool.value) 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-background hover:bg-accent'
                    }
                  `}
                >
                  {tool.label}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              💡 Estas tools executam em background ao enviar a mensagem deste step
            </p>
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
