import React, { useRef, useEffect, useState } from 'react';
import { Bot, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import telemedicinaFamily from '@/assets/telemedicina-family.jpg';

interface TelemedicinaChatWidgetProps {
  chatbotId?: string;
}

const TelemedicinaChatWidget = ({ chatbotId = "zyFH0AihcEAIixsQekuvr" }: TelemedicinaChatWidgetProps) => {
  console.log('TelemedicinaChatWidget loading with chatbotId:', chatbotId);
  const [sessionCount, setSessionCount] = useState(1);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    console.log('Setting up iframe with URL:', `https://www.chatbase.co/chatbot-iframe/${chatbotId}`);
    
    // Listen for messages from iframe
    const handleMessage = (event: MessageEvent) => {
      console.log('Received iframe message:', event);
      if (event.data && event.data.type === 'chatbase-response') {
        console.log('Received message from telemedicina chatbot:', event.data);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [chatbotId]);

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
    const message = "Olá! Gostaria de saber mais sobre os serviços de telemedicina.";
    window.open(`https://api.whatsapp.com/send/?phone=61999475886&text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <section className="py-16 bg-gradient-to-br from-blue-50 to-blue-100">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold font-varela uppercase text-foreground mb-4">
            Contrate agora a{' '}
            <span className="bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">TELEMEDICINA</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Converse conosco agora mesmo! Tire suas dúvidas sobre telemedicina, conheça nossos planos médicos e comece hoje mesmo. 
            Atendimento especializado disponível.
          </p>
        </div>

        {/* Chat Container */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            
            {/* Chat Header */}
            <div className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-600 to-blue-800 text-white">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Assistente Virtual TELEMEDICINA</h3>
                  <div className="flex items-center gap-2 text-white/90">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-sm">Online - Resposta em segundos</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-white/80">
                <MessageCircle className="w-5 h-5" />
                <span className="text-sm font-medium">Chat médico</span>
              </div>
            </div>

            {/* Chat Content with Chatbase Iframe */}
            <div className="h-[600px] relative bg-blue-50 flex items-center justify-center">
              <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
                <Bot className="w-16 h-16 mx-auto mb-4 text-blue-600" />
                <h3 className="text-xl font-bold text-foreground mb-4">Configuração do Chatbase</h3>
                <p className="text-muted-foreground mb-6">
                  Para usar o chat, você precisa:
                </p>
                <ol className="text-left text-sm text-muted-foreground space-y-2 mb-6">
                  <li>1. Acessar seu dashboard do Chatbase</li>
                  <li>2. Ir em <strong>Settings</strong> → <strong>Embed on site</strong></li>
                  <li>3. Copiar o código do <strong>iframe</strong></li>
                  <li>4. Substituir o código aqui</li>
                </ol>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-xs text-blue-700">
                    <strong>ID do Chatbot:</strong> {chatbotId}
                  </p>
                </div>
              </div>
              
              {/* Uncomment this when you have the correct embed code */}
              {/* 
              <iframe
                ref={iframeRef}
                src="SEU_CODIGO_EMBED_AQUI"
                className="w-full h-full border-0"
                allow="microphone"
                title="Assistente Virtual TELEMEDICINA - Chat"
                style={{ minHeight: '600px' }}
              />
              */}
            </div>

            {/* Chat Footer */}
            <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 border-t">
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
                  <span>Assistente médico</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA with Image */}
        <div className="text-center mt-12">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8 md:p-12 relative overflow-hidden">
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <div className="text-left">
                <h3 className="text-2xl md:text-3xl font-bold font-varela uppercase text-foreground mb-4">
                  Pronto para cuidar da sua saúde de forma digital?
                </h3>
                <p className="text-muted-foreground mb-8">
                  Milhares de famílias já confiam na nossa telemedicina. 
                  Seja você também parte dessa revolução na saúde.
                </p>
                <Button
                  onClick={handleWhatsApp}
                  size="lg"
                  className="bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-lg px-10 py-6"
                >
                  Fale Conosco Agora
                </Button>
              </div>
              <div className="relative">
                <img
                  src={telemedicinaFamily}
                  alt="Família aproveitando consultas médicas online via telemedicina"
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

export default TelemedicinaChatWidget;