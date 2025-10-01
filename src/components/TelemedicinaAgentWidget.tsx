import React, { useRef, useEffect, useState } from 'react';
import { Bot, MessageCircle, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TelemedicinaAgentWidgetProps {
  chatbotId?: string;
}

const TelemedicinaAgentWidget: React.FC<TelemedicinaAgentWidgetProps> = ({ 
  chatbotId = 'telemedicina-assistant' 
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Auto-open after 8 seconds
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 8000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isOpen && !isLoaded) {
      setIsLoaded(true);
    }
  }, [isOpen, isLoaded]);

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Chat Trigger Button */}
      <Button
        onClick={toggleChat}
        className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full shadow-xl cta-gradient p-0 hover:scale-110 transition-transform"
        aria-label="Abrir chat"
      >
        {isOpen ? (
          <MessageCircle className="w-7 h-7" />
        ) : (
          <Stethoscope className="w-7 h-7 animate-pulse" />
        )}
      </Button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-28 right-6 z-50 w-[380px] h-[600px] max-w-[calc(100vw-3rem)] max-h-[calc(100vh-8rem)] bg-card rounded-2xl shadow-2xl border-2 border-primary/20 overflow-hidden animate-scale-in">
          {/* Header */}
          <div className="bg-gradient-hero text-white p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Assistente de Telemedicina</h3>
              <p className="text-xs text-white/80">Online - Responde em segundos</p>
            </div>
          </div>

          {/* Chat Content */}
          <div className="h-[calc(100%-4rem)] bg-background">
            {isLoaded && (
              <iframe
                ref={iframeRef}
                src={`https://mxdupkbpxjcfxdgrwknp.supabase.co/functions/v1/telemedicina-agent?chatbot_id=${chatbotId}`}
                className="w-full h-full border-0"
                title="Chat de Telemedicina"
                allow="microphone"
              />
            )}
            {!isLoaded && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Stethoscope className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
                  <p className="text-muted-foreground">Carregando assistente...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tooltip para primeira visita */}
      {!isOpen && (
        <div className="fixed bottom-28 right-6 z-40 animate-fade-in">
          <div className="bg-white rounded-lg shadow-lg p-3 max-w-xs border border-border">
            <p className="text-sm text-foreground">
              <strong>Dúvidas sobre telemedicina?</strong><br />
              Fale com nosso assistente médico especializado!
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default TelemedicinaAgentWidget;
