import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Phone, Mail, MapPin, FileText, AlertCircle, Calendar, Wifi, WifiOff, ShieldAlert, CreditCard, CheckCircle, Receipt, Sparkles, Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import ClosureMessageSelector from './ClosureMessageSelector';
import OpenTicketDialog from './OpenTicketDialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Copy } from 'lucide-react';
import type { Json } from '@/integrations/supabase/types';

interface Conversation {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  customer_cpf: string;
  ixc_client_id: string;
  department: string;
  status: string;
  tags: string[];
  metadata: Json;
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<Record<string, unknown> | null>(null);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [customerHistory, setCustomerHistory] = useState<Conversation[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
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

  const handleSendPaymentLink = async () => {
    if (!conversation) return;

    let customerId = conversation.ixc_client_id;

    setLoadingPayment(true);
    try {
      // Se não houver customerId, buscar no IXC pelo CPF
      if (!customerId && conversation.customer_cpf) {
        const { data: searchData, error: searchError } = await supabase.functions.invoke('ixc-integration', {
          body: {
            action: 'getClientByCpf',
            params: { cpf: conversation.customer_cpf }
          }
        });

        if (!searchError && searchData?.success && searchData.data?.id) {
          customerId = searchData.data.id;
          
          await supabase
            .from('conversations')
            .update({ ixc_client_id: customerId })
            .eq('id', conversationId);
        }
      }

      if (!customerId) {
        toast({
          title: "Cliente não encontrado",
          description: "Não foi possível identificar o cliente no IXC. Verifique o CPF.",
          variant: "destructive",
        });
        return;
      }

      // Buscar títulos financeiros pendentes
      const { data: titlesData, error: titlesError } = await supabase.functions.invoke('ixc-integration', {
        body: {
          action: 'getFinancialTitles',
          params: { customerId }
        }
      });

      if (titlesError) throw titlesError;

      const titles = titlesData?.data?.titles || [];
      
      if (titles.length === 0) {
        toast({
          title: "Nenhum título pendente",
          description: "Cliente não possui faturas em aberto.",
        });
        return;
      }

      const firstTitle = titles[0];

      // Buscar QR Code PIX
      const { data: pixData, error: pixError } = await supabase.functions.invoke('ixc-integration', {
        body: {
          action: 'getPixQrCode',
          params: { titleId: firstTitle.id }
        }
      });

      if (pixError) {
        console.error('Erro ao buscar PIX:', pixError);
      }

      setPaymentInfo({
        valor: firstTitle.valor,
        vencimento: firstTitle.data_vencimento,
        codbar: firstTitle.codbar,
        url_boleto: firstTitle.url_boleto,
        qrcode: pixData?.data?.qrcode,
        qrcode_link: pixData?.data?.qrcode_link,
      });

      setPaymentDialogOpen(true);

      toast({
        title: "Informações de pagamento carregadas",
        description: "Dados prontos para envio ao cliente",
      });

    } catch (error) {
      console.error('Error getting payment info:', error);
      toast({
        title: "Erro ao buscar informações",
        description: error instanceof Error ? error.message : "Ocorreu um erro inesperado",
        variant: "destructive",
      });
    } finally {
      setLoadingPayment(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: `${label} copiado para a área de transferência`,
    });
  };

  const handleOpenTicket = async (assuntoId: string, observacoes: string) => {
    if (!conversation) return;

    let customerId = conversation.ixc_client_id;

    setOpeningTicket(true);
    try {
      if (!customerId && conversation.customer_cpf) {
        const { data: searchData, error: searchError } = await supabase.functions.invoke('ixc-integration', {
          body: {
            action: 'getClientByCpf',
            params: { cpf: conversation.customer_cpf }
          }
        });

        if (!searchError && searchData?.success && searchData.data?.id) {
          customerId = searchData.data.id;
          
          await supabase
            .from('conversations')
            .update({ ixc_client_id: customerId })
            .eq('id', conversationId);
        }
      }

      if (!customerId) {
        toast({
          title: "Cliente não encontrado",
          description: "Não foi possível identificar o cliente no IXC. Verifique o CPF.",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('ixc-integration', {
        body: {
          action: 'createAtendimento',
          params: {
            customerId: customerId,
            atendimentoData: {
              assuntoId: assuntoId,
              planName: 'Atendimento via Chat',
              customerName: conversation.customer_name,
              customerPhone: conversation.customer_phone,
              customerEmail: conversation.customer_email,
              observacoes: observacoes || `Atendimento aberto pelo agente via sistema de chat.\nDepartamento: ${conversation.department}\nProtocolo: ${conversationId}`
            }
          }
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Atendimento criado com sucesso!",
          description: `Ticket #${data.data?.id || 'N/A'} aberto no IXC`,
        });
        setDialogOpen(false);
        loadConversation();
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

  const handleGenerateSummary = async () => {
    if (!conversationId) return;
    
    setGeneratingSummary(true);
    try {
      const { data, error } = await supabase.functions.invoke('summarize-conversation', {
        body: { conversationId }
      });

      if (error) throw error;

      toast({
        title: 'Resumo gerado!',
        description: 'O resumo foi criado com sucesso.',
      });

      loadConversation();
    } catch (error) {
      console.error('Erro ao gerar resumo:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível gerar o resumo.',
        variant: 'destructive'
      });
    } finally {
      setGeneratingSummary(false);
    }
  };

  const loadCustomerHistory = async () => {
    if (!conversation?.customer_cpf && !conversation?.customer_phone) return;

    setLoadingHistory(true);
    try {
      let query = supabase
        .from('conversations')
        .select('*')
        .eq('status', 'resolved')
        .order('created_at', { ascending: false })
        .limit(20);

      if (conversation.customer_cpf) {
        query = query.eq('customer_cpf', conversation.customer_cpf);
      } else if (conversation.customer_phone) {
        query = query.eq('customer_phone', conversation.customer_phone);
      }

      const { data, error } = await query;

      if (error) throw error;

      setCustomerHistory(data || []);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o histórico.',
        variant: 'destructive'
      });
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (historyDialogOpen) {
      loadCustomerHistory();
    }
  }, [historyDialogOpen]);

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
            <p className="text-sm font-medium">{conversation.customer_name || 'N/A'}</p>
          </div>

          {conversation.metadata && typeof conversation.metadata === 'object' && 'pppoe' in conversation.metadata && (
            <div className="flex items-baseline gap-2">
              <p className="text-xs text-muted-foreground">PPPoE:</p>
              <p className="text-sm font-mono">{String((conversation.metadata as Record<string, unknown>).pppoe)}</p>
            </div>
          )}

          <div className="flex items-baseline gap-2">
            <p className="text-xs text-muted-foreground">CPF:</p>
            <p className="text-sm font-mono">{conversation.customer_cpf || 'N/A'}</p>
          </div>

          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground">Telefone:</p>
            <Phone className="h-3 w-3 text-muted-foreground" />
            <p className="text-sm">{conversation.customer_phone || 'N/A'}</p>
          </div>

          {conversation.ixc_client_id && (
            <div className="flex items-baseline gap-2">
              <p className="text-xs text-muted-foreground">ID IXC:</p>
              <Badge variant="outline" className="text-xs">
                {conversation.ixc_client_id}
              </Badge>
            </div>
          )}
        </div>

        <Separator />

        {/* Quick Actions */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground mb-2">Ações Rápidas</p>
          <div className="grid grid-cols-2 gap-2">
            {conversation?.status === 'resolved' ? (
              <Button
                size="sm"
                variant="outline"
                className="h-auto py-2 flex flex-col gap-1"
                onClick={handleGenerateSummary}
                disabled={generatingSummary || (conversation?.metadata && typeof conversation.metadata === 'object' && 'ai_summary' in conversation.metadata)}
              >
                {generatingSummary ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-[hsl(var(--orange))]" />
                    <span className="text-xs">Gerando...</span>
                  </>
                ) : (conversation?.metadata && typeof conversation.metadata === 'object' && 'ai_summary' in conversation.metadata) ? (
                  <>
                    <Sparkles className="h-4 w-4 text-purple-600" />
                    <span className="text-xs">Resumo Gerado</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 text-[hsl(var(--orange))]" />
                    <span className="text-xs">Gerar Resumo IA</span>
                  </>
                )}
              </Button>
            ) : (
              <ClosureMessageSelector 
                conversationId={conversationId}
                onClose={loadConversation}
              />
            )}
            <Button 
              size="sm" 
              variant="outline" 
              className="h-auto py-2 flex flex-col gap-1"
              onClick={() => setDialogOpen(true)}
              disabled={openingTicket || !conversation?.customer_cpf}
            >
              <AlertCircle className="h-4 w-4 text-[hsl(var(--orange))]" />
              <span className="text-xs">Abrir Atendimento</span>
            </Button>
            
            <OpenTicketDialog
              open={dialogOpen}
              onOpenChange={setDialogOpen}
              onSubmit={handleOpenTicket}
              loading={openingTicket}
            />
            <Button 
              size="sm" 
              variant="outline" 
              className="h-auto py-2 flex flex-col gap-1"
              onClick={() => setHistoryDialogOpen(true)}
              disabled={!conversation?.customer_cpf && !conversation?.customer_phone}
            >
              <FileText className="h-4 w-4 text-[hsl(var(--orange))]" />
              <span className="text-xs">Histórico</span>
            </Button>
            <Button size="sm" variant="outline" className="h-auto py-2 flex flex-col gap-1">
              <MapPin className="h-4 w-4 text-[hsl(var(--orange))]" />
              <span className="text-xs">Ver Endereço</span>
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="h-auto py-2 flex flex-col gap-1"
              onClick={handleSendPaymentLink}
              disabled={loadingPayment || !conversation?.customer_cpf}
            >
              <Receipt className="h-4 w-4 text-[hsl(var(--orange))]" />
              <span className="text-xs">Enviar PIX/Boleto</span>
            </Button>
          </div>
        </div>

        {/* Resumo IA se existir */}
        {conversation?.metadata && typeof conversation.metadata === 'object' && 'ai_summary' in conversation.metadata && (
          <>
            <Separator />
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-purple-600" />
                <h4 className="text-sm font-semibold text-purple-700 dark:text-purple-400">Resumo IA</h4>
              </div>
              <div className="text-sm text-foreground/90 whitespace-pre-wrap">
                {String((conversation.metadata as Record<string, unknown>).ai_summary)}
              </div>
            </div>
          </>
        )}
      </CardContent>

      {/* Customer History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>📋 Histórico de Conversas</DialogTitle>
            <DialogDescription>
              Conversas anteriores do cliente {conversation?.customer_name}
            </DialogDescription>
          </DialogHeader>
          
          {loadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--orange))]" />
            </div>
          ) : customerHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum histórico encontrado para este cliente.
            </div>
          ) : (
            <div className="space-y-4">
              {customerHistory.map((hist) => (
                <div key={hist.id} className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{hist.department || 'N/A'}</Badge>
                      <Badge variant={hist.status === 'resolved' ? 'default' : 'secondary'}>
                        {hist.status}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(hist.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  
                  {hist.tags && hist.tags.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {hist.tags.map((tag, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {hist.metadata && typeof hist.metadata === 'object' && 'ai_summary' in hist.metadata && (
                    <div className="mt-2 p-3 bg-muted rounded text-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-3 w-3 text-purple-600" />
                        <span className="text-xs font-semibold">Resumo IA:</span>
                      </div>
                      <p className="text-xs whitespace-pre-wrap">{String((hist.metadata as Record<string, unknown>).ai_summary)}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Info Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>💳 Informações de Pagamento</DialogTitle>
            <DialogDescription>
              Dados para envio ao cliente via WhatsApp
            </DialogDescription>
          </DialogHeader>
          
          {paymentInfo && (
            <div className="space-y-4">
              {/* Valores */}
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Valor:</span>
                  <span className="text-lg font-bold">R$ {paymentInfo.valor}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Vencimento:</span>
                  <span className="font-medium">{paymentInfo.vencimento}</span>
                </div>
              </div>

              {/* PIX */}
              {paymentInfo.qrcode && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">🏦 PIX Copia e Cola</h4>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(paymentInfo.qrcode, 'PIX')}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copiar
                    </Button>
                  </div>
                  <div className="p-3 bg-muted rounded font-mono text-xs break-all max-h-32 overflow-y-auto">
                    {paymentInfo.qrcode}
                  </div>
                </div>
              )}

              {/* Código de Barras */}
              {paymentInfo.codbar && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">🔢 Código de Barras</h4>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(paymentInfo.codbar, 'Código de Barras')}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copiar
                    </Button>
                  </div>
                  <div className="p-3 bg-muted rounded font-mono text-sm break-all">
                    {paymentInfo.codbar}
                  </div>
                </div>
              )}

              {/* Links */}
              <div className="space-y-2">
                {paymentInfo.url_boleto && (
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => window.open(paymentInfo.url_boleto, '_blank')}
                  >
                    📎 Abrir Boleto
                  </Button>
                )}
                {paymentInfo.qrcode_link && (
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => window.open(paymentInfo.qrcode_link, '_blank')}
                  >
                    🔗 Link de Pagamento
                  </Button>
                )}
              </div>

              {/* Mensagem Pronta */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">📝 Mensagem Pronta</h4>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => {
                      const message = `
Olá! Segue os dados para pagamento:

💵 Valor: R$ ${paymentInfo.valor}
📅 Vencimento: ${paymentInfo.vencimento}

${paymentInfo.qrcode ? `🏦 PIX COPIA E COLA:\n${paymentInfo.qrcode}\n\n` : ''}
${paymentInfo.codbar ? `🔢 Código de Barras:\n${paymentInfo.codbar}\n\n` : ''}
${paymentInfo.url_boleto ? `📎 Link do Boleto:\n${paymentInfo.url_boleto}\n\n` : ''}
${paymentInfo.qrcode_link ? `🔗 Link de Pagamento:\n${paymentInfo.qrcode_link}` : ''}
                      `.trim();
                      copyToClipboard(message, 'Mensagem completa');
                    }}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar Mensagem
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
