import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Bot, Send, MessageCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import confidentWoman from '@/assets/family-internet-v3.jpg';
import ContractSigning from './ContractSigning';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ContractData {
  appointmentId: string;
  customerData: {
    name: string;
    cpf: string;
    email: string;
    phone: string;
    birthDate: string;
    address: string;
    cep: string;
  };
  planData: {
    id: string;
    name: string;
    speed: string;
    price: number;
  };
  paymentDay: number;
  installationDate: string;
  installationPeriod: string;
}

export const SalesAgentChat = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Olá! 👋 Sou o assistente virtual da SUPERNET FIBRA. Estou aqui para ajudá-lo a encontrar o plano perfeito de internet fibra óptica. Qual é o seu CEP para verificarmos a cobertura?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [contractData, setContractData] = useState<ContractData | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll automático para acompanhar a conversa
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    // Adiciona mensagem do usuário
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    try {
      const { data, error } = await supabase.functions.invoke('sales-agent', {
        body: {
          messages: [
            ...messages,
            { role: 'user', content: userMessage }
          ],
          userContext: {
            timestamp: new Date().toISOString()
          }
        }
      });

      if (error) throw error;

      // Adiciona resposta do assistente
      if (data.message) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: data.message 
        }]);
      }

      // Verifica se o pedido foi criado com sucesso
      if (data.tool_results) {
        const orderResult = data.tool_results.find(
          (result: any) => result.name === 'create_installation_order'
        );
        
        if (orderResult) {
          const resultContent = JSON.parse(orderResult.content);
          
          if (resultContent.success && resultContent.appointment_id) {
            // Busca os detalhes do appointment criado
            const { data: appointment, error: appointmentError } = await supabase
              .from('installation_appointments')
              .select('*, plans:plan_name(*)')
              .eq('id', resultContent.appointment_id)
              .single();

            if (!appointmentError && appointment) {
              // Busca o plano completo
              const { data: plan } = await supabase
                .from('plans')
                .select('*')
                .eq('name', appointment.plan_name)
                .single();

              if (plan) {
                // Prepara dados para o contrato
                setContractData({
                  appointmentId: appointment.id,
                  customerData: {
                    name: appointment.customer_name,
                    cpf: appointment.customer_cpf,
                    email: appointment.customer_email,
                    phone: appointment.customer_phone,
                    birthDate: appointment.customer_birth_date,
                    address: appointment.customer_address,
                    cep: appointment.customer_cep,
                  },
                  planData: {
                    id: plan.id,
                    name: plan.name,
                    speed: plan.speed,
                    price: plan.price,
                  },
                  paymentDay: appointment.payment_day,
                  installationDate: appointment.appointment_date,
                  installationPeriod: appointment.appointment_period,
                });
                
                // Abre o modal de contrato
                setShowContractModal(true);
                
                // Adiciona mensagem informativa
                setMessages(prev => [...prev, { 
                  role: 'assistant', 
                  content: '📄 Perfeito! Agora vamos assinar o contrato digitalmente. Por favor, revise os dados e assine o contrato que acabou de aparecer na tela.' 
                }]);
              }
            }
          }
        }
      }

    } catch (error: any) {
      console.error('Erro ao enviar mensagem:', error);
      toast.error('Erro ao processar sua mensagem. Tente novamente.');
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Desculpe, tive um problema ao processar sua mensagem. Pode tentar novamente?' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleWhatsApp = () => {
    const message = "Olá! Gostaria de saber mais sobre os serviços da SUPERNET FIBRA.";
    window.open(`https://wa.me/5511999999999?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <>
      {contractData && (
        <ContractSigning
          isOpen={showContractModal}
          onClose={() => setShowContractModal(false)}
          appointmentId={contractData.appointmentId}
          customerData={{
            name: contractData.customerData.name,
            email: contractData.customerData.email,
            phone: contractData.customerData.phone,
            cpf: contractData.customerData.cpf,
            address: contractData.customerData.address,
            cep: contractData.customerData.cep,
          }}
          planData={{
            name: contractData.planData.name,
            speed: contractData.planData.speed,
            price: contractData.planData.price,
          }}
          appointmentDate={contractData.installationDate}
          appointmentPeriod={contractData.installationPeriod}
        />
      )}
      
      <section className="py-16 bg-gradient-subtle">
        <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold font-varela uppercase text-foreground mb-4">
            Contrate agora a{' '}
            <span className="gradient-text">SUPERNET</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Converse com nosso agente inteligente! Tire suas dúvidas, conheça nossos planos e agende sua instalação. 
            Atendimento com IA disponível 24/7.
          </p>
        </div>

        {/* Chat Container */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            
            {/* Chat Header */}
            <div className="flex items-center justify-between p-6 bg-gradient-to-r from-red-500 to-orange-500 text-white">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Agente de Vendas Virtual</h3>
                  <div className="flex items-center gap-2 text-white/90">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-sm">Online - Resposta instantânea com IA</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-white/80">
                <MessageCircle className="w-5 h-5" />
                <span className="text-sm font-medium">Chat inteligente</span>
              </div>
            </div>

            {/* Chat Content */}
            <div className="h-[600px] relative bg-gray-50">
              <div className="h-full flex flex-col">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.role === 'assistant' && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-red-500 to-orange-500 flex items-center justify-center flex-shrink-0">
                          <Bot className="w-5 h-5 text-white" />
                        </div>
                      )}
                      
                      <div
                        className={`max-w-[75%] rounded-2xl p-4 ${
                          msg.role === 'user'
                            ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white'
                            : 'bg-white border border-gray-200 text-gray-800'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      </div>

                      {msg.role === 'user' && (
                        <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-sm font-bold">Você</span>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {isLoading && (
                    <div className="flex gap-3 justify-start">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-red-500 to-orange-500 flex items-center justify-center">
                        <Bot className="w-5 h-5 text-white" />
                      </div>
                      <div className="bg-white border border-gray-200 rounded-2xl p-4">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="border-t bg-white p-6">
                  <div className="flex gap-3">
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Digite sua mensagem..."
                      disabled={isLoading}
                      className="flex-1"
                    />
                    <Button 
                      onClick={sendMessage}
                      disabled={isLoading || !input.trim()}
                      className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
                    >
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-3 border-t">
                  <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Bot className="w-4 h-4" />
                      <span>Agente com IA</span>
                    </div>
                    <div className="h-4 w-px bg-gray-300"></div>
                    <span>Resposta instantânea</span>
                    <div className="h-4 w-px bg-gray-300"></div>
                    <span>Disponível 24/7</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-12 bg-white rounded-2xl shadow-xl overflow-hidden max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-0">
            <div className="relative h-64 md:h-auto">
              <img 
                src={confidentWoman}
                alt="Família feliz usando internet"
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
            
            <div className="p-8 flex flex-col justify-center">
              <h3 className="text-2xl font-bold mb-4 text-foreground">
                Prefere falar com um humano?
              </h3>
              <p className="text-muted-foreground mb-6">
                Nossa equipe está pronta para atendê-lo pelo WhatsApp. Clique no botão abaixo e fale conosco agora mesmo!
              </p>
              <Button 
                onClick={handleWhatsApp}
                size="lg"
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                Falar no WhatsApp
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
    </>
  );
};
