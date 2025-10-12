import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Bell, Calendar, CheckCircle, XCircle, Clock, RefreshCw, Play, MessageSquare, Mail, Search, Copy } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Notification {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  due_date: string;
  amount: number;
  days_before_due: number;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  sent_at: string | null;
  created_at: string;
  error_message: string | null;
  whatsapp_message: string | null;
  email_subject: string | null;
  email_message: string | null;
}

const PRESET_DAYS = [5, 10, 15, 20, 25, 30];

export const PaymentNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [testDate, setTestDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [testCpf, setTestCpf] = useState('61953890130');
  const [testingPayment, setTestingPayment] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<any>(null);
  const { toast } = useToast();

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setNotifications((data || []) as Notification[]);
    } catch (error: any) {
      console.error('Erro ao buscar notificações:', error);
      toast({
        title: "Erro ao carregar notificações",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Realtime updates
    const channel = supabase
      .channel('payment_notifications_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payment_notifications'
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleCheckInvoices = async (testMode: boolean = false, customDate?: string) => {
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-due-invoices', {
        body: { 
          testMode,
          testDate: testMode ? (customDate || testDate) : undefined
        }
      });

      if (error) throw error;

      toast({
        title: testMode ? "Teste executado com sucesso!" : "Verificação concluída!",
        description: `${data.notificationsCreated} notificações criadas. 10 dias: ${data.results.created10Days}, 1 dia: ${data.results.created1Day}`,
      });

      fetchNotifications();
    } catch (error: any) {
      console.error('Erro ao verificar faturas:', error);
      toast({
        title: "Erro ao verificar faturas",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setChecking(false);
    }
  };

  const handleCheckPresetDays = async () => {
    if (selectedDays.length === 0) {
      toast({
        title: "Selecione ao menos um dia",
        description: "Escolha os dias de vencimento que deseja verificar",
        variant: "destructive",
      });
      return;
    }

    setChecking(true);
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    
    let totalCreated = 0;
    let total10Days = 0;
    let total1Day = 0;

    try {
      for (const day of selectedDays) {
        const testDateForDay = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        const { data, error } = await supabase.functions.invoke('check-due-invoices', {
          body: { 
            testMode: true,
            testDate: testDateForDay
          }
        });

        if (error) throw error;
        
        totalCreated += data.notificationsCreated || 0;
        total10Days += data.results.created10Days || 0;
        total1Day += data.results.created1Day || 0;
      }

      toast({
        title: "Verificação concluída!",
        description: `${totalCreated} notificações criadas. 10 dias: ${total10Days}, 1 dia: ${total1Day}`,
      });

      fetchNotifications();
    } catch (error: any) {
      console.error('Erro ao verificar faturas:', error);
      toast({
        title: "Erro ao verificar faturas",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setChecking(false);
    }
  };

  const toggleDay = (day: number) => {
    setSelectedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day].sort((a, b) => a - b)
    );
  };

  const toggleAllDays = () => {
    setSelectedDays(prev => 
      prev.length === PRESET_DAYS.length ? [] : [...PRESET_DAYS]
    );
  };

  const handleTestPaymentInfo = async () => {
    setTestingPayment(true);
    setPaymentInfo(null);
    try {
      const cleanCpf = testCpf.replace(/\D/g, '');
      
      // Buscar títulos financeiros
      const { data: titlesData, error: titlesError } = await supabase.functions.invoke('ixc-integration', {
        body: {
          action: 'getFinancialTitles',
          params: { cnpj_cpf: cleanCpf }
        }
      });

      if (titlesError) throw titlesError;
      
      if (!titlesData?.data || titlesData.data.length === 0) {
        toast({
          title: "Nenhum título encontrado",
          description: "Não há títulos pendentes para este CPF",
          variant: "destructive",
        });
        return;
      }

      // Pegar o primeiro título
      const firstTitle = titlesData.data[0];
      
      // Buscar QR Code PIX
      const { data: pixData, error: pixError } = await supabase.functions.invoke('ixc-integration', {
        body: {
          action: 'getPixQrCode',
          params: { id: firstTitle.id }
        }
      });

      if (pixError) throw pixError;

      setPaymentInfo({
        title: firstTitle,
        pix: pixData?.data
      });

      toast({
        title: "Informações carregadas!",
        description: `Encontrado título de R$ ${firstTitle.valor}`,
      });

    } catch (error: any) {
      console.error('Erro ao buscar informações de pagamento:', error);
      toast({
        title: "Erro ao buscar informações",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTestingPayment(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: `${label} copiado para a área de transferência`,
    });
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: { variant: "outline" as const, icon: Clock, label: "Pendente" },
      sent: { variant: "default" as const, icon: CheckCircle, label: "Enviado" },
      failed: { variant: "destructive" as const, icon: XCircle, label: "Falhou" },
      cancelled: { variant: "secondary" as const, icon: XCircle, label: "Cancelado" }
    };

    const config = variants[status as keyof typeof variants] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const stats = {
    pending: notifications.filter(n => n.status === 'pending').length,
    sent: notifications.filter(n => n.status === 'sent').length,
    failed: notifications.filter(n => n.status === 'failed').length,
    total: notifications.length
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2">
            <Bell className="h-8 w-8" />
            Notificações de Vencimento
          </h2>
          <p className="text-muted-foreground mt-1">
            Alertas automáticos 10 e 1 dia antes do vencimento
          </p>
        </div>
        <Button onClick={fetchNotifications} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Enviados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats.sent}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Falharam</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{stats.failed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Test Payment Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Testar Busca de Títulos (PIX/Boleto)
          </CardTitle>
          <CardDescription>
            Teste a funcionalidade de busca de títulos financeiros por CPF
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Digite o CPF"
              value={testCpf}
              onChange={(e) => setTestCpf(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={handleTestPaymentInfo}
              disabled={testingPayment}
            >
              {testingPayment ? "Buscando..." : "Buscar"}
            </Button>
          </div>

          {paymentInfo && (
            <div className="space-y-4 border rounded-lg p-4">
              <div>
                <h3 className="font-semibold mb-2">Informações do Título</h3>
                <div className="space-y-2 text-sm">
                  <p><strong>Valor:</strong> R$ {paymentInfo.title.valor}</p>
                  <p><strong>Vencimento:</strong> {paymentInfo.title.data_vencimento}</p>
                  <p><strong>Status:</strong> {paymentInfo.title.status}</p>
                </div>
              </div>

              {paymentInfo.pix && (
                <div>
                  <h3 className="font-semibold mb-2">PIX Copia e Cola</h3>
                  <div className="flex gap-2">
                    <Input
                      value={paymentInfo.pix.qrcode}
                      readOnly
                      className="font-mono text-xs"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(paymentInfo.pix.qrcode, "Código PIX")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {paymentInfo.title.linhadig && (
                <div>
                  <h3 className="font-semibold mb-2">Código de Barras</h3>
                  <div className="flex gap-2">
                    <Input
                      value={paymentInfo.title.linhadig}
                      readOnly
                      className="font-mono text-xs"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(paymentInfo.title.linhadig, "Código de barras")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Verificar Faturas
          </CardTitle>
          <CardDescription>
            Execute manualmente a verificação ou teste com datas específicas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-4">
            <Button
              onClick={() => handleCheckInvoices(false)}
              disabled={checking}
              className="flex-1"
            >
              {checking ? "Verificando..." : "Verificar Agora (Produção)"}
            </Button>
          </div>

          <div className="border-t pt-4 space-y-4">
            <div>
              <p className="text-sm font-medium mb-3">
                Buscar por dias de vencimento predefinidos
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="select-all"
                    checked={selectedDays.length === PRESET_DAYS.length}
                    onCheckedChange={toggleAllDays}
                  />
                  <Label htmlFor="select-all" className="font-medium cursor-pointer">
                    Selecionar todos
                  </Label>
                </div>
                <div className="grid grid-cols-3 gap-3 ml-6">
                  {PRESET_DAYS.map(day => (
                    <div key={day} className="flex items-center gap-2">
                      <Checkbox
                        id={`day-${day}`}
                        checked={selectedDays.includes(day)}
                        onCheckedChange={() => toggleDay(day)}
                      />
                      <Label htmlFor={`day-${day}`} className="cursor-pointer">
                        Dia {String(day).padStart(2, '0')}
                      </Label>
                    </div>
                  ))}
                </div>
                <Button
                  onClick={handleCheckPresetDays}
                  disabled={checking || selectedDays.length === 0}
                  variant="default"
                  className="w-full"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Verificar Dias Selecionados ({selectedDays.length})
                </Button>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-3">
                Ou buscar por data específica
              </p>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={testDate}
                  onChange={(e) => setTestDate(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={() => handleCheckInvoices(true)}
                  disabled={checking}
                  variant="outline"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Testar Data
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Buscará faturas que vencem 10 e 1 dia após a data selecionada
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications Table */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Notificações</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando notificações...
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma notificação encontrada. Execute uma verificação para criar notificações.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Alerta</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criado</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notifications.map((notification) => (
                    <TableRow key={notification.id}>
                      <TableCell className="font-medium">
                        {notification.customer_name}
                      </TableCell>
                      <TableCell>{notification.customer_phone || '-'}</TableCell>
                      <TableCell>
                        {format(new Date(notification.due_date), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell>
                        R$ {notification.amount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {notification.days_before_due} dias antes
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(notification.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(notification.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              Ver Mensagens
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Mensagens de Notificação</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-6">
                              <div>
                                <h3 className="font-semibold mb-2 flex items-center gap-2">
                                  <MessageSquare className="h-4 w-4" />
                                  Mensagem WhatsApp
                                </h3>
                                <div className="bg-muted p-4 rounded-lg whitespace-pre-wrap">
                                  {notification.whatsapp_message || 'Mensagem não gerada'}
                                </div>
                              </div>
                              
                              <div>
                                <h3 className="font-semibold mb-2 flex items-center gap-2">
                                  <Mail className="h-4 w-4" />
                                  Email - Assunto
                                </h3>
                                <div className="bg-muted p-4 rounded-lg">
                                  {notification.email_subject || 'Assunto não gerado'}
                                </div>
                              </div>
                              
                              <div>
                                <h3 className="font-semibold mb-2">Email - Preview (HTML)</h3>
                                <div className="border rounded-lg p-4 bg-white">
                                  {notification.email_message ? (
                                    <div dangerouslySetInnerHTML={{ __html: notification.email_message }} />
                                  ) : (
                                    'Mensagem não gerada'
                                  )}
                                </div>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-sm">ℹ️ Como funciona</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>• O sistema verifica faturas diariamente e cria notificações para vencimentos em 10 e 1 dia</p>
          <p>• As notificações ficam com status "Pendente" até a integração WhatsApp ser implementada</p>
          <p>• Use o modo de teste para simular verificações sem enviar notificações reais</p>
          <p>• Configure um Cron Job para executar automaticamente: <code className="bg-white px-1 rounded">0 9 * * *</code> (diariamente às 9h)</p>
        </CardContent>
      </Card>
    </div>
  );
};
