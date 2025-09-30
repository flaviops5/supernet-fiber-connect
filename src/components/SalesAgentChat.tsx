import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Bot, Send, MessageCircle, Loader2, Calendar, Clock } from 'lucide-react';
import { toast } from 'sonner';
import confidentWoman from '@/assets/family-internet-v3.jpg';

interface Message {
  role: 'user' | 'assistant';
  content: string;
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
  const [showForm, setShowForm] = useState(false);
  const [showScheduler, setShowScheduler] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    cpf: '',
    email: '',
    phone: '',
    birthDate: '',
    address: '',
    cep: '',
    paymentDay: '10'
  });
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<'manha' | 'tarde'>('manha');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getAvailableDates = () => {
    const dates = [];
    const today = new Date();
    
    for (let i = 1; i <= 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dayOfWeek = date.getDay();
      
      // Domingo (0) não disponível
      if (dayOfWeek === 0) continue;
      
      dates.push({
        date: date.toISOString().split('T')[0],
        dayName: date.toLocaleDateString('pt-BR', { weekday: 'long' }),
        isSaturday: dayOfWeek === 6
      });
    }
    
    return dates;
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações básicas
    if (!formData.name || !formData.cpf || !formData.email || !formData.phone) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }
    
    setShowForm(false);
    setShowScheduler(true);
    
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: '✅ Dados recebidos! Agora vamos agendar a instalação. Escolha uma data e período disponível:'
    }]);
  };

  const handleScheduleSubmit = async () => {
    if (!selectedDate || !selectedPeriod) {
      toast.error('Por favor, selecione uma data e período');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('sales-agent', {
        body: {
          messages: [{
            role: 'user',
            content: JSON.stringify({
              action: 'create_order',
              ...formData,
              plan_id: selectedPlanId,
              installation_date: selectedDate,
              installation_period: selectedPeriod
            })
          }],
          directOrder: true
        }
      });

      if (error) throw error;

      setShowScheduler(false);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `🎉 Perfeito! Sua instalação foi agendada para ${new Date(selectedDate).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })} no período da ${selectedPeriod}.\n\nEm breve nossa equipe entrará em contato para confirmar. Obrigado por escolher a SUPERNET FIBRA! 🚀`
      }]);
      
      toast.success('✅ Agendamento realizado com sucesso!');
      
      // Reset
      setFormData({
        name: '', cpf: '', email: '', phone: '', birthDate: '', address: '', cep: '', paymentDay: '10'
      });
      setSelectedDate('');
      setSelectedPeriod('manha');
      setSelectedPlanId('');
      
    } catch (error) {
      console.error('Erro ao criar agendamento:', error);
      toast.error('Erro ao processar agendamento. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

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
        
        // Detecta se o usuário escolheu um plano
        const lastMessage = data.message.toLowerCase();
        if ((lastMessage.includes('escolheu') || lastMessage.includes('ótima escolha')) && lastMessage.includes('plano')) {
          setShowForm(true);
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

                {/* Form */}
                {showForm && (
                  <div className="border-t bg-white p-6 max-h-[400px] overflow-y-auto">
                    <form onSubmit={handleFormSubmit} className="space-y-4">
                      <h3 className="font-semibold text-lg mb-4">📋 Dados para Contratação</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="name">Nome Completo *</Label>
                          <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            required
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="cpf">CPF *</Label>
                          <Input
                            id="cpf"
                            value={formData.cpf}
                            onChange={(e) => setFormData(prev => ({ ...prev, cpf: e.target.value }))}
                            placeholder="000.000.000-00"
                            required
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="email">Email *</Label>
                          <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                            required
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="phone">WhatsApp *</Label>
                          <Input
                            id="phone"
                            value={formData.phone}
                            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                            placeholder="(11) 99999-9999"
                            required
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="birthDate">Data de Nascimento</Label>
                          <Input
                            id="birthDate"
                            type="date"
                            value={formData.birthDate}
                            onChange={(e) => setFormData(prev => ({ ...prev, birthDate: e.target.value }))}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="paymentDay">Dia de Vencimento</Label>
                          <Input
                            id="paymentDay"
                            type="number"
                            min="1"
                            max="28"
                            value={formData.paymentDay}
                            onChange={(e) => setFormData(prev => ({ ...prev, paymentDay: e.target.value }))}
                          />
                        </div>
                        
                        <div className="md:col-span-2">
                          <Label htmlFor="address">Endereço Completo</Label>
                          <Input
                            id="address"
                            value={formData.address}
                            onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                            placeholder="Rua, número, complemento, bairro"
                          />
                        </div>
                      </div>
                      
                      <Button type="submit" className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600">
                        Continuar para Agendamento →
                      </Button>
                    </form>
                  </div>
                )}

                {/* Scheduler */}
                {showScheduler && (
                  <div className="border-t bg-white p-6 max-h-[400px] overflow-y-auto">
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        Agende sua Instalação
                      </h3>
                      
                      <div>
                        <Label>Escolha o dia</Label>
                        <RadioGroup value={selectedDate} onValueChange={setSelectedDate}>
                          <div className="grid grid-cols-1 gap-2 mt-2 max-h-[200px] overflow-y-auto">
                            {getAvailableDates().map((dateInfo) => (
                              <div key={dateInfo.date} className="flex items-center space-x-2">
                                <RadioGroupItem value={dateInfo.date} id={dateInfo.date} />
                                <Label htmlFor={dateInfo.date} className="flex-1 cursor-pointer">
                                  {new Date(dateInfo.date + 'T00:00:00').toLocaleDateString('pt-BR', { 
                                    weekday: 'long', 
                                    day: '2-digit', 
                                    month: 'long' 
                                  })}
                                  {dateInfo.isSaturday && (
                                    <span className="ml-2 text-xs text-muted-foreground">(somente manhã até 11h)</span>
                                  )}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </RadioGroup>
                      </div>
                      
                      {selectedDate && (
                        <div>
                          <Label className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Período
                          </Label>
                          <RadioGroup value={selectedPeriod} onValueChange={(val) => setSelectedPeriod(val as 'manha' | 'tarde')}>
                            <div className="flex gap-4 mt-2">
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="manha" id="manha" />
                                <Label htmlFor="manha" className="cursor-pointer">
                                  Manhã (8h - 12h)
                                </Label>
                              </div>
                              
                              {!getAvailableDates().find(d => d.date === selectedDate)?.isSaturday && (
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="tarde" id="tarde" />
                                  <Label htmlFor="tarde" className="cursor-pointer">
                                    Tarde (13h - 18h)
                                  </Label>
                                </div>
                              )}
                            </div>
                          </RadioGroup>
                        </div>
                      )}
                      
                      <Button 
                        onClick={handleScheduleSubmit} 
                        disabled={!selectedDate || !selectedPeriod || isLoading}
                        className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Agendando...
                          </>
                        ) : (
                          'Confirmar Agendamento'
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Input */}
                {!showForm && !showScheduler && (
                  <div className="p-4 border-t bg-white">
                    <div className="flex gap-2">
                      <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Digite sua mensagem..."
                        disabled={isLoading}
                        className="flex-1 border-gray-300 focus:border-primary"
                      />
                      <Button
                        onClick={sendMessage}
                        disabled={isLoading || !input.trim()}
                        className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Chat Footer */}
            <div className="p-4 bg-gradient-to-r from-red-50 to-orange-50 border-t">
              <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Atendimento 24/7</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  <span>Resposta instantânea</span>
                </div>
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4" />
                  <span>Inteligência artificial</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA with Image */}
        <div className="text-center mt-12">
          <div className="bg-gradient-subtle rounded-2xl p-8 md:p-12 relative overflow-hidden">
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <div className="text-left">
                <h3 className="text-2xl md:text-3xl font-bold font-varela uppercase text-foreground mb-4">
                  Pronto para ter a melhor internet da sua vida?
                </h3>
                <p className="text-muted-foreground mb-8">
                  Milhares de famílias já confiam na SUPERNET FIBRA. 
                  Seja você também parte dessa revolução digital.
                </p>
                <Button
                  onClick={handleWhatsApp}
                  size="lg"
                  className="cta-gradient text-lg px-10 py-6"
                >
                  Fale Conosco Agora
                </Button>
              </div>
              <div className="relative">
                <img
                  src={confidentWoman}
                  alt="Família aproveitando internet de alta velocidade em diversos dispositivos"
                  className="w-full h-80 object-cover rounded-2xl shadow-elegant"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};