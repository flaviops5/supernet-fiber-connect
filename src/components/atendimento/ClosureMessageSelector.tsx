import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ClosureMessage {
  id: string;
  title: string;
  message: string;
}

interface Props {
  conversationId: string;
  onClose: () => void;
}

export default function ClosureMessageSelector({ conversationId, onClose }: Props) {
  const [messages, setMessages] = useState<ClosureMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadMessages();
    }
  }, [open]);

  const loadMessages = async () => {
    const { data } = await supabase
      .from('closure_messages')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    if (data) {
      setMessages(data);
    }
  };

  const handleFinalize = async () => {
    if (!selectedMessage) {
      toast({
        title: 'Selecione uma mensagem',
        description: 'Por favor, selecione uma mensagem de encerramento.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const messageData = messages.find(m => m.id === selectedMessage);
      
      // Get current conversation data
      const { data: conversation } = await supabase
        .from('conversations')
        .select('assigned_agent_id')
        .eq('id', conversationId)
        .single();

      // Send closure message
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('user_id', user?.id)
        .single();

      await supabase
        .from('conversation_messages')
        .insert({
          conversation_id: conversationId,
          sender_type: 'agent',
          sender_id: user?.id,
          sender_name: profile?.name || 'Agente',
          content: messageData?.message || '',
        });

      // Update conversation status
      await supabase
        .from('conversations')
        .update({ 
          status: 'resolved',
          resolved_at: new Date().toISOString()
        })
        .eq('id', conversationId);

      // Decrement agent's conversation count
      if (conversation?.assigned_agent_id) {
        const { data: presenceData } = await supabase
          .from('agent_presence')
          .select('current_conversations')
          .eq('user_id', conversation.assigned_agent_id)
          .single();

        if (presenceData && presenceData.current_conversations > 0) {
          await supabase
            .from('agent_presence')
            .update({ 
              current_conversations: presenceData.current_conversations - 1,
              last_activity: new Date().toISOString()
            })
            .eq('user_id', conversation.assigned_agent_id);
        }
      }

      toast({
        title: 'Atendimento finalizado',
        description: 'A conversa foi encerrada com sucesso.',
      });

      setOpen(false);
      onClose();
    } catch (error) {
      console.error('Error finalizing conversation:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível finalizar o atendimento.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          size="sm" 
          variant="default"
          className="h-auto py-2 flex flex-col gap-1 col-span-2"
        >
          <CheckCircle className="h-4 w-4 text-orange-500" />
          <span className="text-xs font-semibold">Finalizar Atendimento</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Finalizar Atendimento</DialogTitle>
          <DialogDescription>
            Selecione uma mensagem de encerramento para enviar ao cliente
          </DialogDescription>
        </DialogHeader>
        
        <RadioGroup value={selectedMessage} onValueChange={setSelectedMessage}>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {messages.map((msg) => (
              <div key={msg.id} className="flex items-start space-x-2 border rounded-lg p-3 hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value={msg.id} id={msg.id} />
                <Label htmlFor={msg.id} className="flex-1 cursor-pointer">
                  <p className="font-medium mb-1">{msg.title}</p>
                  <p className="text-sm text-muted-foreground">{msg.message}</p>
                </Label>
              </div>
            ))}
          </div>
        </RadioGroup>

        <div className="flex gap-2 justify-end mt-4">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleFinalize} disabled={loading || !selectedMessage}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Finalizando...
              </>
            ) : (
              'Finalizar'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}