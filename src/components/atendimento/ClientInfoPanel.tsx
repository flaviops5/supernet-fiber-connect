import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Phone, Mail, MapPin, FileText, AlertCircle, Calendar } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

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
}

interface Props {
  conversationId: string | null;
}

export default function ClientInfoPanel({ conversationId }: Props) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(false);

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
    <Card className="h-full flex flex-col shadow-lg border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <User className="h-4 w-4" />
          Informações do Cliente
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto space-y-4">
        {/* Basic Info */}
        <div className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Nome</p>
            <p className="text-sm font-medium">{conversation.customer_name}</p>
          </div>

          {conversation.customer_phone && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Telefone</p>
              <div className="flex items-center gap-2">
                <Phone className="h-3 w-3 text-muted-foreground" />
                <p className="text-sm">{conversation.customer_phone}</p>
              </div>
            </div>
          )}

          {conversation.customer_email && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">E-mail</p>
              <div className="flex items-center gap-2">
                <Mail className="h-3 w-3 text-muted-foreground" />
                <p className="text-sm truncate">{conversation.customer_email}</p>
              </div>
            </div>
          )}

          {conversation.customer_cpf && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">CPF</p>
              <p className="text-sm font-mono">{conversation.customer_cpf}</p>
            </div>
          )}
        </div>

        <Separator />

        {/* Tags */}
        {conversation.tags && conversation.tags.length > 0 && (
          <>
            <div>
              <p className="text-xs text-muted-foreground mb-2">Tags</p>
              <div className="flex flex-wrap gap-1">
                {conversation.tags.map((tag, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Quick Actions */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground mb-2">Ações Rápidas</p>
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" variant="outline" className="h-auto py-2 flex flex-col gap-1">
              <FileText className="h-4 w-4" />
              <span className="text-xs">Ver Boletos</span>
            </Button>
            <Button size="sm" variant="outline" className="h-auto py-2 flex flex-col gap-1">
              <AlertCircle className="h-4 w-4" />
              <span className="text-xs">Abrir Ticket</span>
            </Button>
            <Button size="sm" variant="outline" className="h-auto py-2 flex flex-col gap-1">
              <Calendar className="h-4 w-4" />
              <span className="text-xs">Agendar</span>
            </Button>
            <Button size="sm" variant="outline" className="h-auto py-2 flex flex-col gap-1">
              <MapPin className="h-4 w-4" />
              <span className="text-xs">Ver Endereço</span>
            </Button>
          </div>
        </div>

        {conversation.ixc_client_id && (
          <>
            <Separator />
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Cliente IXC</p>
              <p className="text-sm font-mono">#{conversation.ixc_client_id}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
