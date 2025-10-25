import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Send, Loader2 } from 'lucide-react';

export function SendRealMessageButton() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');

  const handleSend = async () => {
    if (!phone || !message) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha telefone e mensagem',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp-message', {
        body: { 
          phone: phone.replace(/\D/g, ''),
          message: message
        }
      });

      if (error) throw error;

      toast({
        title: '✅ Mensagem enviada',
        description: `Mensagem enviada para ${phone}`,
      });

      setPhone('');
      setMessage('');
      setOpen(false);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Não foi possível enviar a mensagem');
      console.error('Erro ao enviar:', err);
      toast({
        title: 'Erro ao enviar',
        description: err.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Send className="h-4 w-4 mr-2" />
          Enviar Mensagem Real
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enviar Mensagem WhatsApp</DialogTitle>
          <DialogDescription>
            Enviar mensagem real para um cliente
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="phone">Telefone (com DDD)</Label>
            <Input
              id="phone"
              placeholder="5561999999999"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="message">Mensagem</Label>
            <Textarea
              id="message"
              placeholder="Digite sua mensagem..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
          </div>
          <Button onClick={handleSend} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Enviar Mensagem
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
