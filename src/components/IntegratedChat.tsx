import React, { useRef, useEffect, useState } from 'react';
import { Bot, MessageCircle } from 'lucide-react';

interface IntegratedChatProps {
  chatbotId?: string;
}

const IntegratedChat = ({ chatbotId = "mMFk_B5d94OhD7fQBxvNU" }: IntegratedChatProps) => {
  const [sessionCount, setSessionCount] = useState(1);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Listen for messages from iframe
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'chatbase-response') {
        console.log('Received message from chatbot:', event.data);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

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

  return (
    <section className="py-16 bg-gradient-subtle">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold font-varela uppercase text-foreground mb-4">
            Assistente Virtual{' '}
            <span className="gradient-text">SUPERNET</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Converse conosco agora mesmo! Tire suas dúvidas, conheça nossos planos e contrate sua internet. 
            Atendimento humanizado disponível 24/7.
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

        {/* Bottom CTA */}
        <div className="text-center mt-8">
          <p className="text-muted-foreground">
            Prefere falar por WhatsApp?{' '}
            <a 
              href="https://wa.me/5511999999999?text=Olá! Gostaria de saber mais sobre os planos da SUPERNET FIBRA."
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange hover:text-orange/80 font-medium underline"
            >
              Clique aqui
            </a>
          </p>
        </div>
      </div>
    </section>
  );
};

export default IntegratedChat;