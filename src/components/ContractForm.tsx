import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import ContractSigning from './ContractSigning';

interface ContractFormProps {
  isOpen: boolean;
  onClose: () => void;
  plan: {
    name: string;
    price: number;
    speed: string;
  };
}

const ContractForm: React.FC<ContractFormProps> = ({ isOpen, onClose, plan }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showContractSigning, setShowContractSigning] = useState(false);
  const [appointmentId, setAppointmentId] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    cep: '',
    cpf: '',
    birthDate: '',
    paymentDay: '',
    appointmentDate: null as Date | null,
    appointmentPeriod: '',
    observations: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDateChange = (date: Date | undefined) => {
    setFormData(prev => ({
      ...prev,
      appointmentDate: date || null
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.phone || !formData.address || !formData.cep || !formData.cpf || !formData.birthDate || !formData.paymentDay || !formData.appointmentDate || !formData.appointmentPeriod) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    // Verificar se a data é no futuro
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (formData.appointmentDate && formData.appointmentDate < today) {
      toast({
        title: "Erro",
        description: "A data de instalação deve ser no futuro.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: result, error } = await supabase.functions.invoke('process-contract', {
        body: {
          customerData: {
            ...formData,
            appointmentDate: formData.appointmentDate?.toISOString().split('T')[0] // Converter Date para string YYYY-MM-DD
          },
          planData: plan,
          timestamp: new Date().toISOString()
        }
      });

      if (error) throw error;

      // Store appointment ID for contract signing
      setAppointmentId(result.appointmentId);

      toast({
        title: "Dados Salvos!",
        description: "Agora vamos prosseguir para a assinatura digital do contrato.",
      });

      // Show contract signing modal
      setShowContractSigning(true);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao enviar sua solicitação. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center">
            Contratar {plan.name}
          </DialogTitle>
          <div className="text-center text-sm text-muted-foreground">
            {plan.speed} • R$ {plan.price.toFixed(2).replace('.', ',')}/mês
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nome Completo *</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Digite seu nome completo"
              required
            />
          </div>

          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="seu@email.com"
              required
            />
          </div>

          <div>
            <Label htmlFor="phone">Telefone/WhatsApp *</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="(11) 99999-9999"
              required
            />
          </div>

          <div>
            <Label htmlFor="cep">CEP *</Label>
            <Input
              id="cep"
              name="cep"
              value={formData.cep}
              onChange={handleInputChange}
              placeholder="00000-000"
              required
            />
          </div>

          <div>
            <Label htmlFor="address">Endereço Completo *</Label>
            <Input
              id="address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              placeholder="Rua, número, bairro, cidade"
              required
            />
          </div>

          <div>
            <Label htmlFor="cpf">CPF *</Label>
            <Input
              id="cpf"
              name="cpf"
              value={formData.cpf}
              onChange={handleInputChange}
              placeholder="000.000.000-00"
              required
            />
          </div>

          <div>
            <Label htmlFor="birthDate">Data de Aniversário *</Label>
            <Input
              id="birthDate"
              name="birthDate"
              type="date"
              value={formData.birthDate}
              onChange={handleInputChange}
              required
            />
          </div>

          <div>
            <Label htmlFor="paymentDay">Melhor dia para pagamento *</Label>
            <Select onValueChange={(value) => handleSelectChange('paymentDay', value)} value={formData.paymentDay}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o dia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">Dia 5</SelectItem>
                <SelectItem value="10">Dia 10</SelectItem>
                <SelectItem value="15">Dia 15</SelectItem>
                <SelectItem value="20">Dia 20</SelectItem>
                <SelectItem value="25">Dia 25</SelectItem>
                <SelectItem value="30">Dia 30</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="appointmentDate">Data de Instalação *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.appointmentDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.appointmentDate ? (
                    format(formData.appointmentDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                  ) : (
                    <span>Selecione a data</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.appointmentDate || undefined}
                  onSelect={handleDateChange}
                  disabled={(date) => date < new Date()}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label htmlFor="appointmentPeriod">Período da Instalação *</Label>
            <Select onValueChange={(value) => handleSelectChange('appointmentPeriod', value)} value={formData.appointmentPeriod}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manha">Manhã (08h às 12h)</SelectItem>
                <SelectItem value="tarde">Tarde (13h às 17h)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="observations">Observações (opcional)</Label>
            <Textarea
              id="observations"
              name="observations"
              value={formData.observations}
              onChange={handleInputChange}
              placeholder="Alguma informação adicional?"
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 cta-gradient"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar Solicitação'
              )}
            </Button>
          </div>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-4">
          * Campos obrigatórios. Seus dados serão utilizados apenas para processamento da contratação.
        </p>
      </DialogContent>

      {/* Contract Signing Modal */}
      <ContractSigning
        isOpen={showContractSigning}
        onClose={() => {
          setShowContractSigning(false);
          // Reset form after contract signing
          setFormData({
            name: '',
            email: '',
            phone: '',
            address: '',
            cep: '',
            cpf: '',
            birthDate: '',
            paymentDay: '',
            appointmentDate: null,
            appointmentPeriod: '',
            observations: ''
          });
          onClose();
        }}
        appointmentId={appointmentId}
        customerData={{
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          cpf: formData.cpf,
          address: formData.address,
          cep: formData.cep
        }}
        planData={plan}
        appointmentDate={formData.appointmentDate?.toISOString().split('T')[0] || ''}
        appointmentPeriod={formData.appointmentPeriod}
      />
    </Dialog>
  );
};

export default ContractForm;