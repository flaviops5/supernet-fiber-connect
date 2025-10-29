// PR #21 - Modal de Ação Proativa com Lista de Clientes

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Users, Send, CheckCircle2, AlertCircle, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { massNotifyWhatsApp, type ImpactedCustomer } from "@/lib/mass-notify";
import { toast } from "@/hooks/use-toast";

type RegionData = {
  cidade: string;
  bairro: string | null;
  qtd: number;
  tickets: number;
  rx_critico: number;
};

type ActionModalProps = {
  open: boolean;
  onClose: () => void;
  region: RegionData | null;
};

type Step = 'options' | 'review' | 'confirm' | 'sending' | 'result';

export function ActionModal({ open, onClose, region }: ActionModalProps) {
  const [step, setStep] = useState<Step>('options');
  const [customers, setCustomers] = useState<ImpactedCustomer[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);

  // Reset ao abrir/fechar
  useEffect(() => {
    if (open) {
      setStep('options');
      setCustomers([]);
      setResult(null);
    }
  }, [open]);

  // Buscar lista de clientes
  async function loadCustomers() {
    if (!region) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_impacted_customers_by_region", {
        region_cidade: region.cidade,
        region_bairro: region.bairro
      });

      if (error) throw error;

      setCustomers(data || []);
      setStep('review');
    } catch (err) {
      console.error("❌ Erro ao buscar clientes:", err);
      toast({
        title: "Erro ao carregar clientes",
        description: "Não foi possível buscar os clientes afetados.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }

  // Enviar notificações
  async function handleSendNotifications() {
    if (!region) return;

    setStep('sending');
    
    try {
      const response = await massNotifyWhatsApp(region.cidade, region.bairro);
      
      setResult({
        sent: response.sent,
        failed: response.failed
      });
      
      setStep('result');

      toast({
        title: "✅ Notificações enviadas",
        description: `${response.sent} de ${response.total} mensagens enviadas com sucesso.`
      });
    } catch (err) {
      console.error("❌ Erro ao enviar notificações:", err);
      toast({
        title: "Erro ao enviar notificações",
        description: err instanceof Error ? err.message : "Erro desconhecido",
        variant: "destructive"
      });
      setStep('review');
    }
  }

  if (!region) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            🚨 Ação Proativa - {region.cidade}
            {region.bairro && ` (${region.bairro})`}
          </DialogTitle>
          <DialogDescription>
            {region.qtd} ocorrências detectadas • {region.tickets} tickets • {region.rx_critico} RX crítico
          </DialogDescription>
        </DialogHeader>

        {/* STEP 1: Opções */}
        {step === 'options' && (
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Escolha uma ação proativa para os clientes desta região:
            </p>

            <Button
              disabled={loading}
              variant="destructive"
              onClick={loadCustomers}
              className="w-full justify-start gap-3 h-auto py-4"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
              <div className="text-left">
                <div className="font-semibold">Notificar todos via WhatsApp</div>
                <div className="text-xs opacity-90">Mensagem empática automática</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-4"
              onClick={() => {
                toast({
                  title: "Em breve",
                  description: "Funcionalidade de detalhes em desenvolvimento"
                });
              }}
            >
              <Users className="h-5 w-5" />
              <div className="text-left">
                <div className="font-semibold">Ver detalhes dos clientes</div>
                <div className="text-xs opacity-70">Histórico e informações</div>
              </div>
            </Button>
          </div>
        )}

        {/* STEP 2: Review - Lista de clientes */}
        {step === 'review' && (
          <div className="space-y-4 py-4 flex-1 flex flex-col min-h-0">
            <Alert>
              <Users className="h-4 w-4" />
              <AlertDescription>
                {customers.length} cliente{customers.length !== 1 ? 's' : ''} será{customers.length !== 1 ? 'ão' : ''} notificado{customers.length !== 1 ? 's' : ''}.
                Revise a lista antes de confirmar.
              </AlertDescription>
            </Alert>

            <ScrollArea className="flex-1 border rounded-md p-3">
              <div className="space-y-2">
                {customers.map((customer, idx) => (
                  <div
                    key={customer.customer_phone}
                    className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 text-sm"
                  >
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="font-medium">{customer.customer_name}</div>
                      <div className="text-xs text-muted-foreground">{customer.customer_phone}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      #{idx + 1}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button variant="outline" onClick={() => setStep('options')}>
                Voltar
              </Button>
              <Button onClick={() => setStep('confirm')} variant="destructive">
                Continuar
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* STEP 3: Confirmação final */}
        {step === 'confirm' && (
          <div className="space-y-4 py-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="font-semibold">
                ⚠️ Confirmar envio de {customers.length} mensagens WhatsApp?
              </AlertDescription>
            </Alert>

            <div className="bg-muted p-4 rounded-md text-sm">
              <p className="font-semibold mb-2">Mensagem que será enviada:</p>
              <p className="whitespace-pre-line text-muted-foreground italic">
                🔧 *Estamos cuidando da sua conexão!*{'\n\n'}
                Detectamos uma instabilidade na sua região e nossa equipe técnica já está atuando para resolver rapidamente.{'\n\n'}
                ⏱️ *Previsão inicial:* até 2 horas{'\n\n'}
                Se notar qualquer piora, pode nos chamar aqui mesmo! 😊
              </p>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setStep('review')}>
                Voltar
              </Button>
              <Button onClick={handleSendNotifications} variant="destructive">
                <Send className="h-4 w-4 mr-2" />
                Confirmar e Enviar
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* STEP 4: Enviando */}
        {step === 'sending' && (
          <div className="space-y-4 py-8 text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <div>
              <p className="font-semibold">Enviando notificações...</p>
              <p className="text-sm text-muted-foreground mt-1">
                Processando {customers.length} mensagens em lotes de 15
              </p>
            </div>
          </div>
        )}

        {/* STEP 5: Resultado */}
        {step === 'result' && result && (
          <div className="space-y-4 py-4">
            <div className="text-center space-y-3">
              <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
              <div>
                <p className="text-lg font-semibold text-green-600">
                  ✅ Notificações enviadas!
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {result.sent} de {customers.length} mensagens enviadas com sucesso
                </p>
                {result.failed > 0 && (
                  <p className="text-sm text-orange-600 mt-1">
                    ⚠️ {result.failed} falha{result.failed !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>

            <Alert className="bg-green-50 border-green-200">
              <AlertDescription className="text-sm">
                Os clientes receberão a mensagem no WhatsApp em até 1 minuto.
                As conversas serão criadas automaticamente no sistema.
              </AlertDescription>
            </Alert>

            <DialogFooter>
              <Button onClick={onClose} className="w-full">
                Fechar
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
