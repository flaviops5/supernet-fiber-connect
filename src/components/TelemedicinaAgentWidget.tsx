import React, { useEffect, useState } from 'react';
import { Stethoscope, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TelemedicinaChatAgent } from './TelemedicinaChatAgent';

const TelemedicinaAgentWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(true);

  useEffect(() => {
    // Auto-open after 8 seconds
    const timer = setTimeout(() => {
      setIsOpen(true);
      setShowTooltip(false);
    }, 8000);

    return () => clearTimeout(timer);
  }, []);

  const toggleChat = () => {
    setIsOpen(!isOpen);
    setShowTooltip(false);
  };

  return (
    <>
      {/* Chat Trigger Button - Only show when chat is closed */}
      {!isOpen && (
        <Button
          onClick={toggleChat}
          className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full shadow-xl cta-gradient p-0 hover:scale-110 transition-transform"
          aria-label="Abrir chat de telemedicina"
        >
          <Stethoscope className="w-7 h-7 animate-pulse" />
        </Button>
      )}

      {/* Chat Window - TelemedicinaChatAgent with custom positioning */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-96 h-[600px] max-w-[calc(100vw-3rem)] max-h-[calc(100vh-8rem)] animate-scale-in">
          <div className="relative h-full">
            <TelemedicinaChatAgent />
            {/* Close button overlay */}
            <Button
              onClick={toggleChat}
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 bg-background/80 backdrop-blur-sm hover:bg-background"
              aria-label="Fechar chat"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Tooltip for first visit */}
      {!isOpen && showTooltip && (
        <div className="fixed bottom-28 right-6 z-40 animate-fade-in">
          <div className="bg-card rounded-lg shadow-elegant p-3 max-w-xs border border-border">
            <button
              onClick={() => setShowTooltip(false)}
              className="absolute top-1 right-1 text-muted-foreground hover:text-foreground"
              aria-label="Fechar dica"
            >
              <X className="w-4 h-4" />
            </button>
            <p className="text-sm text-foreground pr-6">
              <strong className="text-primary">Dúvidas sobre telemedicina?</strong><br />
              Fale com nosso assistente médico especializado!
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default TelemedicinaAgentWidget;
