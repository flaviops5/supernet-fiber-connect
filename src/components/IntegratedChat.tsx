import React, { useRef, useEffect, useState } from 'react';
import { Bot, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import confidentWoman from '@/assets/family-internet-v3.jpg';

interface IntegratedChatProps {
  chatbotId?: string;
}

const IntegratedChat = ({ chatbotId = "zyFH0AihcEAIixsQekuvr" }: IntegratedChatProps) => {
  const [sessionCount, setSessionCount] = useState(1);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Listen for messages from iframe
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'chatbase-response') {
        // Chatbot response received
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []); // chatbotId not used in effect

  // Auto-reset session every 30 minutes of inactivity
  useEffect(() => {
    const resetChatSession = () => {
      if (iframeRef.current) {
        const newSrc = `https://www.chatbase.co/chatbot-iframe/${chatbotId}?session=${Date.now()}`;
        iframeRef.current.src = newSrc;
        setSessionCount(prev => prev + 1);
        
        setTimeout(() => {
          iframeRef.current?.contentWindow?.postMessage({
            type: 'chatbase-reset',
            timestamp: Date.now()
          }, '*');
        }, 1000);
      }
    };

    // Set 30-minute reset timer
    resetTimerRef.current = setTimeout(resetChatSession, 30 * 60 * 1000);

    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
    };
  }, [chatbotId, sessionCount]);

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
            Converse conosco agora mesmo! Tire suas dúvidas, conheça nossos planos e faça parte da supernet. 
            Atendimento humanizado disponível.
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
                  <h3 className="font-bold text-lg">Assistente Virtual SUPERNET</h3>
                  <div className="flex items-center gap-2 text-white/90">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-sm">Online - Resposta em segundos</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-white/80">
                <MessageCircle className="w-5 h-5" />
                <span className="text-sm font-medium">Chat ao vivo</span>
              </div>
            </div>

            {/* Chat Content with Iframe */}
            <div className="h-[600px] relative bg-gray-50">
              <iframe
                ref={iframeRef}
                src={`https://www.chatbase.co/chatbot-iframe/${chatbotId}`}
                className="w-full h-full border-0"
                allow="microphone"
                title="Assistente Virtual SUPERNET - Chat"
                style={{ minHeight: '600px' }}
              />
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
                  <span>Resposta em segundos</span>
                </div>
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4" />
                  <span>Assistente inteligente</span>
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

export default IntegratedChat;