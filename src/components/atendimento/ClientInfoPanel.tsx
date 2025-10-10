import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Phone, Mail, MapPin, FileText, AlertCircle, Calendar, Briefcase, Wifi, WifiOff, ShieldAlert, CreditCard, CheckCircle } from 'lucide-react';
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

interface AgentInfo {
  name: string;
  email: string;
  avatar_url: string | null;
  role: string;
}

interface Props {
  conversationId: string | null;
}

export default function ClientInfoPanel({ conversationId }: Props) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [agentInfo, setAgentInfo] = useState<AgentInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!conversationId) {
      setConversation(null);
      setAgentInfo(null);
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
      
      // Load agent info if assigned
      if (data.assigned_agent_id) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('name, email, avatar_url')
          .eq('user_id', data.assigned_agent_id)
          .single();

        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.assigned_agent_id)
          .single();

        if (profileData) {
          setAgentInfo({
            name: profileData.name,
            email: profileData.email,
            avatar_url: profileData.avatar_url,
            role: roleData?.role === 'admin' ? 'Administrador' : 
                  roleData?.role === 'editor' ? 'Atendente' : 'Visualizador'
          });
        }
      }
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
    <Card className="h-full flex flex-col shadow-lg border-border/50 bg-gradient-to-br from-muted/30 via-background to-background">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <User className="h-4 w-4" />
          Informações do Cliente
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto space-y-4">
        {/* Agent Info */}
        {agentInfo && (
          <>
            <div className="p-3 bg-primary/5 border border-primary/10 rounded-lg space-y-3">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Atendente Responsável</p>
              
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 border-2 border-primary/20">
                  <AvatarImage src={agentInfo.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10">
                    {agentInfo.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium text-sm">{agentInfo.name}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Briefcase className="h-3 w-3" />
                    <span>{agentInfo.role}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-3 w-3" />
                  <span>{agentInfo.email}</span>
                </div>
                {conversation.first_response_at && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>
                      Primeira resposta: {format(new Date(conversation.first_response_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>
                    Conversa iniciada: {format(new Date(conversation.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
              </div>
            </div>
            <Separator />
          </>
        )}
        
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

          {/* PPPoE Status */}
          <div>
            <p className="text-xs text-muted-foreground mb-1">PPPoE</p>
            <p className="text-sm font-mono">cliente@supernet</p>
          </div>

          {/* Online/Offline Status */}
          <div>
            <p className="text-xs text-muted-foreground mb-1">Status Conexão</p>
            <div className="flex items-center gap-2">
              <Wifi className="h-3 w-3 text-green-500" />
              <Badge variant="outline" className="text-xs border-green-500 text-green-700">
                Online
              </Badge>
            </div>
          </div>

          {/* Bloqueio/Financeiro Status */}
          <div>
            <p className="text-xs text-muted-foreground mb-1">Situação</p>
            <div className="flex items-center gap-2">
              <CreditCard className="h-3 w-3 text-yellow-500" />
              <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-700">
                Financeiro em atraso
              </Badge>
            </div>
          </div>

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
            <ClosureMessageSelector 
              conversationId={conversationId}
              onClose={loadConversation}
            />
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
