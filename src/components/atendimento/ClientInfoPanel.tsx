import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Phone, Mail, MapPin, FileText, AlertCircle, Calendar, Wifi, WifiOff, ShieldAlert, CreditCard, CheckCircle, Receipt } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import ClosureMessageSelector from './ClosureMessageSelector';

interface Conversation {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  customer_cpf: string;
  ixc_client_id: string;
  department: string;
  tags: string[];
  metadata: any;
  assigned_agent_id: string | null;
  first_response_at: string | null;
  created_at: string;
}

interface Props {
  conversationId: string | null;
}

export default function ClientInfoPanel({ conversationId }: Props) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [openingTicket, setOpeningTicket] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!conversationId) {
      setConversation(null);
      return;
    }

    loadConversation();
  }, [conversationId]);

  const loadConversation = async () => {
    if (!conversationId) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (error) {
      console.error('Error loading conversation:', error);
    } else {
      setConversation(data);
    }
    setLoading(false);
  };

  const handleOpenTicket = async () => {
    if (!conversation?.ixc_client_id) {
      toast({
        title: "Cliente não identificado",
        description: "Não foi possível identificar o cliente no IXC.",
        variant: "destructive",
      });
      return;
    }

    setOpeningTicket(true);
    try {
      const { data, error } = await supabase.functions.invoke('ixc-integration', {
        body: {
          action: 'createAtendimento',
          params: {
            customerId: conversation.ixc_client_id,
            atendimentoData: {
              planName: 'Atendimento via Chat',
              customerName: conversation.customer_name,
              customerPhone: conversation.customer_phone,
              customerEmail: conversation.customer_email,
              observacoes: `Atendimento aberto pelo agente via sistema de chat.\nDepartamento: ${conversation.department}\nProtocolo: ${conversationId}`
            }
          }
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Atendimento criado com sucesso!",
          description: `Ticket aberto no IXC ${data.data?.id ? `#${data.data.id}` : ''}`,
        });
      } else {
        throw new Error(data?.error || 'Erro ao criar atendimento');
      }
    } catch (error) {
      console.error('Error opening ticket:', error);
      toast({
        title: "Erro ao abrir atendimento",
        description: error instanceof Error ? error.message : "Ocorreu um erro inesperado",
        variant: "destructive",
      });
    } finally {
      setOpeningTicket(false);
    }
  };

  if (!conversationId || !conversation) {
    return (
      <Card className="h-full flex items-center justify-center shadow-lg border-border/50">
        <div className="text-center text-muted-foreground p-4">
          <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Informações do cliente</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col shadow-lg border-2 border-border bg-gradient-to-br from-muted/30 via-background to-background">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <User className="h-4 w-4 text-[hsl(var(--orange))]" />
          Informações do Cliente
        </CardTitle>
        <Separator className="mt-3" />
      </CardHeader>

      <CardContent className="flex-1 flex flex-col space-y-4 overflow-hidden">
        {/* Basic Info */}
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <p className="text-xs text-muted-foreground">Nome:</p>
            <p className="text-sm font-medium">João Silva</p>
          </div>

          <div className="flex items-baseline gap-2">
            <p className="text-xs text-muted-foreground">PPPoE:</p>
            <p className="text-sm font-mono">cliente@supernet</p>
          </div>

          <div className="flex items-baseline gap-2">
            <p className="text-xs text-muted-foreground">CPF:</p>
            <p className="text-sm font-mono">123.456.789-00</p>
          </div>

          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground">Telefone:</p>
            <Phone className="h-3 w-3 text-muted-foreground" />
            <p className="text-sm">(11) 98765-4321</p>
          </div>
        </div>

        <Separator />

        {/* Quick Actions */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground mb-2">Ações Rápidas</p>
          <div className="grid grid-cols-2 gap-2">
            <ClosureMessageSelector 
              conversationId={conversationId}
              onClose={loadConversation}
            />
            <Button 
              size="sm" 
              variant="outline" 
              className="h-auto py-2 flex flex-col gap-1"
              onClick={handleOpenTicket}
              disabled={openingTicket || !conversation?.ixc_client_id}
            >
              <AlertCircle className="h-4 w-4 text-[hsl(var(--orange))]" />
              <span className="text-xs">{openingTicket ? 'Abrindo...' : 'Abrir Atendimento'}</span>
            </Button>
            <Button size="sm" variant="outline" className="h-auto py-2 flex flex-col gap-1">
              <Calendar className="h-4 w-4 text-[hsl(var(--orange))]" />
              <span className="text-xs">Agendar</span>
            </Button>
            <Button size="sm" variant="outline" className="h-auto py-2 flex flex-col gap-1">
              <MapPin className="h-4 w-4 text-[hsl(var(--orange))]" />
              <span className="text-xs">Ver Endereço</span>
            </Button>
            <Button size="sm" variant="outline" className="h-auto py-2 flex flex-col gap-1">
              <Receipt className="h-4 w-4 text-[hsl(var(--orange))]" />
              <span className="text-xs">Enviar PIX/Boleto</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
