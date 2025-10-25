import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, FileText, PenTool, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ContractSigningProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: string;
  customerData: {
    name: string;
    email: string;
    phone: string;
    cpf: string;
    address: string;
    cep: string;
  };
  planData: {
    name: string;
    speed: string;
    price: number;
  };
  appointmentDate: string;
  appointmentPeriod: string;
}

interface SignaturePadRef {
  clear: () => void;
  toDataURL: () => string;
  isEmpty: () => boolean;
}

const ContractSigning: React.FC<ContractSigningProps> = ({
  isOpen,
  onClose,
  appointmentId,
  customerData,
  planData,
  appointmentDate,
  appointmentPeriod
}) => {
  const [step, setStep] = useState(1); // 1: Contract Review, 2: CPF Validation, 3: Signature
  const [contractHTML, setContractHTML] = useState('');
  const [contractNumber, setContractNumber] = useState('');
  const [cpfInput, setCpfInput] = useState('');
  const [cpfValidated, setCpfValidated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidatingCpf, setIsValidatingCpf] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [signatureData, setSignatureData] = useState('');

  // Generate contract when dialog opens
  useEffect(() => {
    if (isOpen && step === 1) {
      generateContract();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, step]); // generateContract called once on mount, step dependency needed

  // Initialize signature pad
  useEffect(() => {
    if (step === 3 && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        
        // Set canvas size
        canvas.width = 400;
        canvas.height = 200;
        
        // Add white background
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [step]);

  const generateContract = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-contract-pdf', {
        body: {
          appointmentId,
          customerName: customerData.name,
          customerEmail: customerData.email,
          customerPhone: customerData.phone,
          customerCpf: customerData.cpf,
          customerAddress: customerData.address,
          customerCep: customerData.cep,
          planName: planData.name,
          planSpeed: planData.speed,
          planPrice: planData.price,
          appointmentDate,
          appointmentPeriod,
          contractNumber: ''
        }
      });

      if (error) throw error;

      setContractHTML(data.contractHTML);
      setContractNumber(data.contractNumber);
    } catch (error) {
      console.error('Error generating contract:', error);
      toast({
        title: "Erro",
        description: "Erro ao gerar contrato. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const validateCPF = async () => {
    if (cpfInput !== customerData.cpf) {
      toast({
        title: "CPF Inválido",
        description: "O CPF informado não confere com os dados do cadastro.",
        variant: "destructive",
      });
      return;
    }

    setIsValidatingCpf(true);
    
    // Simular validação de CPF (em produção, usar API da Receita Federal)
    setTimeout(() => {
      setCpfValidated(true);
      setIsValidatingCpf(false);
      toast({
        title: "CPF Validado",
        description: "CPF validado com sucesso!",
        variant: "default",
      });
    }, 2000);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setSignatureData('');
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return '';
    
    const dataURL = canvas.toDataURL();
    setSignatureData(dataURL);
    return dataURL;
  };

  const isSignatureEmpty = () => {
    const canvas = canvasRef.current;
    if (!canvas) return true;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return true;
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Check if all pixels are white (empty canvas)
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] !== 255 || data[i + 1] !== 255 || data[i + 2] !== 255) {
        return false;
      }
    }
    return true;
  };

  const finalizeContract = async () => {
    if (isSignatureEmpty()) {
      toast({
        title: "Assinatura Obrigatória",
        description: "Por favor, assine o contrato antes de finalizar.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const signature = saveSignature();
      
      // Get user IP and user agent
      const userAgent = navigator.userAgent;
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const ipData = await ipResponse.json();
      
      // Create timestamp hash (simplified implementation)
      const timestamp = new Date().toISOString();
      const timestampHash = btoa(timestamp + contractNumber + customerData.cpf);

      // Save signed contract
      const { error: contractError } = await supabase.from('signed_contracts').insert({
        appointment_id: appointmentId,
        contract_number: contractNumber,
        contract_pdf_url: '', // Will be generated after upload
        signature_data: signature,
        cpf_validated: cpfValidated,
        timestamp_hash: timestampHash,
        ip_address: ipData.ip,
        user_agent: userAgent
      });

      if (contractError) throw contractError;

      toast({
        title: "Contrato Assinado",
        description: "Contrato assinado com sucesso! Criando cliente no IXC...",
        variant: "default",
      });

      // Tenta criar cliente e atendimento no IXC sem bloquear o fluxo
      let ixCustomerId: string | null = null;
      let ixAtendimentoId: string | null = null;
      try {
        // Criar cliente no IXC
        const { data: ixcCustomerData, error: ixcCustomerError } = await supabase.functions.invoke('ixc-integration', {
          body: {
            action: 'createCustomer',
            params: {
              customerData: {
                name: customerData.name,
                cpf: customerData.cpf,
                email: customerData.email,
                phone: customerData.phone,
                birthDate: '', // Campo não coletado no formulário atual
                address: customerData.address,
                cep: customerData.cep,
                cityId: '5564', // Padrão Brasília; ajustaremos quando suporte IXC orientar
                neighborhood: '',
                number: '',
                personType: 'F'
              }
            }
          }
        });

        if (ixcCustomerError || (ixcCustomerData && !(ixcCustomerData as any).success)) {
          throw new Error('Falha ao criar cliente no IXC');
        }

        ixCustomerId = (ixcCustomerData as any)?.data?.id || (ixcCustomerData as any)?.data?.registro?.id || null;

        if (!ixCustomerId) {
          throw new Error('Cliente no IXC criado, mas ID não retornado');
        }

        toast({
          title: 'Cliente Criado',
          description: `Cliente criado no IXC com ID: ${ixCustomerId}. Abrindo atendimento...`,
        });

        // Criar atendimento no IXC
        const { data: ixcAtendimentoData, error: ixcAtendimentoError } = await supabase.functions.invoke('ixc-integration', {
          body: {
            action: 'createAtendimento',
            params: {
              customerId: ixCustomerId,
              atendimentoData: {
                customerName: customerData.name,
                cpf: customerData.cpf,
                email: customerData.email,
                phone: customerData.phone,
                address: customerData.address,
                cep: customerData.cep,
                subject: `Instalação ${planData.name} - ${contractNumber}`,
                planName: planData.name,
                planSpeed: planData.speed,
                planPrice: planData.price,
                paymentDay: 10,
                installationDate: appointmentDate,
                installationPeriod: appointmentPeriod
              }
            }
          }
        });

        if (ixcAtendimentoError || (ixcAtendimentoData && !(ixcAtendimentoData as any).success)) {
          throw new Error('Falha ao abrir atendimento no IXC');
        }

        ixAtendimentoId = (ixcAtendimentoData as any)?.data?.id || (ixcAtendimentoData as any)?.data?.registro?.id || null;
      } catch (ixcErr) {
        console.warn('IXC indisponível ou erro na criação. Prosseguindo sem bloquear.', ixcErr);
        toast({
          title: 'Integração IXC pendente',
          description: 'Contrato assinado. Vamos prosseguir e você pode finalizar no IXC mais tarde.',
        });
      }

      // Mensagem final sempre, independente do IXC
      toast({
        title: 'Processo Concluído',
        description: `Contrato ${contractNumber} assinado! Cliente IXC: ${ixCustomerId ?? 'pendente'}. Atendimento: ${ixAtendimentoId ?? 'pendente'}`,
      });

      onClose();
      
    } catch (error) {
      console.error('Error finalizing contract:', error);
      toast({
        title: "Erro",
        description: "Erro ao finalizar contrato. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                Leia atentamente o contrato antes de prosseguir com a assinatura digital.
              </AlertDescription>
            </Alert>
            
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Gerando contrato...</span>
              </div>
            ) : (
              <div 
                className="border rounded-lg p-4 max-h-96 overflow-y-auto bg-white"
                dangerouslySetInnerHTML={{ __html: contractHTML }}
              />
            )}
            
            <div className="flex justify-between">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button 
                onClick={() => setStep(2)}
                disabled={isLoading || !contractHTML}
              >
                Li e Aceito os Termos
              </Button>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Para validar sua identidade, confirme seu CPF abaixo.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <Label htmlFor="cpf-validation">CPF</Label>
              <Input
                id="cpf-validation"
                type="text"
                placeholder="000.000.000-00"
                value={cpfInput}
                onChange={(e) => setCpfInput(e.target.value)}
                maxLength={14}
                disabled={cpfValidated}
              />
            </div>
            
            {cpfValidated && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription className="text-green-600">
                  CPF validado com sucesso!
                </AlertDescription>
              </Alert>
            )}
            
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                Voltar
              </Button>
              {cpfValidated ? (
                <Button onClick={() => setStep(3)}>
                  Prosseguir para Assinatura
                </Button>
              ) : (
                <Button 
                  onClick={validateCPF}
                  disabled={isValidatingCpf || !cpfInput}
                >
                  {isValidatingCpf && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Validar CPF
                </Button>
              )}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <Alert>
              <PenTool className="h-4 w-4" />
              <AlertDescription>
                Assine digitalmente no quadro abaixo para finalizar o contrato.
              </AlertDescription>
            </Alert>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-center">Área de Assinatura</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center space-y-4">
                  <canvas
                    ref={canvasRef}
                    className="border-2 border-dashed border-gray-300 rounded-lg cursor-crosshair"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                  />
                  
                  <Button variant="outline" onClick={clearSignature}>
                    Limpar Assinatura
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                Voltar
              </Button>
              <Button 
                onClick={finalizeContract}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Finalizar Contrato
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Assinatura Digital do Contrato
            {contractNumber && (
              <span className="text-sm font-normal text-gray-500">
                - {contractNumber}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        
        {/* Progress indicator */}
        <div className="flex items-center justify-center space-x-4 mb-4">
          <div className={`flex items-center ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
              1
            </div>
            <span className="ml-2">Revisar Contrato</span>
          </div>
          <div className="w-8 h-px bg-gray-300" />
          <div className={`flex items-center ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
              2
            </div>
            <span className="ml-2">Validar CPF</span>
          </div>
          <div className="w-8 h-px bg-gray-300" />
          <div className={`flex items-center ${step >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
              3
            </div>
            <span className="ml-2">Assinar</span>
          </div>
        </div>
        
        {renderStep()}
      </DialogContent>
    </Dialog>
  );
};

export default ContractSigning;