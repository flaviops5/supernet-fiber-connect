import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Bot, Send, MessageCircle, Loader2 } from 'lucide-react';
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
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

      // Se houve criação de OS, mostra confirmação
      if (data.tool_results) {
        const hasOrderCreation = data.tool_results.some((r: any) => {
          try {
            const content = JSON.parse(r.content);
            return content.success && r.name === 'create_installation_order';
          } catch {
            return false;
          }
        });

        if (hasOrderCreation) {
          toast.success('✅ Ordem de instalação criada com sucesso!');
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

                {/* Input */}
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
