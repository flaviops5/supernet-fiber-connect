import { useEffect, useState } from 'react';
import { MessageCircle, X } from 'lucide-react';

interface ChatbaseWidgetProps {
  chatbotId?: string;
}

const ChatbaseWidget = ({ chatbotId }: ChatbaseWidgetProps) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!chatbotId) return;

    // Create script element for Chatbase
    const script = document.createElement('script');
    script.src = 'https://www.chatbase.co/embed.min.js';
    script.defer = true;
    script.setAttribute('chatbotId', chatbotId);
    
    // Add script to document
    document.head.appendChild(script);

    // Cleanup function
    return () => {
      // Remove script when component unmounts
      const existingScript = document.querySelector(`script[src="https://www.chatbase.co/embed.min.js"]`);
      if (existingScript) {
        document.head.removeChild(existingScript);
      }
      
      // Remove chatbase elements
      const chatbaseElements = document.querySelectorAll('[id^="chatbase"]');
      chatbaseElements.forEach(element => element.remove());
    };
  }, [chatbotId]);

  if (!chatbotId) {
    return (
      <div className="fixed bottom-4 right-4 p-4 bg-white border border-gray-300 rounded-lg shadow-lg max-w-sm z-50">
        <h3 className="font-semibold text-sm mb-2">Configure o Chatbase</h3>
        <p className="text-xs text-gray-600 mb-2">
          Para ativar o chat AI, adicione seu Chatbot ID do Chatbase no componente ChatbaseWidget.
        </p>
        <p className="text-xs text-gray-500">
          Visite: chatbase.co para criar seu chatbot
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Chat Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 z-50 flex items-center justify-center group"
        aria-label="Abrir chat AI"
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <MessageCircle className="w-6 h-6" />
        )}
        
        {/* Pulse animation when closed */}
        {!isOpen && (
          <div className="absolute inset-0 w-14 h-14 bg-blue-600 rounded-full animate-ping opacity-20"></div>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-80 h-96 bg-white rounded-lg shadow-2xl border z-50 flex flex-col overflow-hidden sm:w-80 max-sm:w-[calc(100vw-2rem)] max-sm:right-4 max-sm:left-4">
          <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
            <h3 className="font-semibold">Chat AI - Supernet</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:text-gray-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex-1 p-4 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="w-12 h-12 text-blue-600 mx-auto mb-3" />
              <p className="text-gray-600 text-sm mb-3">
                Olá! Sou a IA da Supernet. Como posso ajudá-lo hoje?
              </p>
              <p className="text-gray-400 text-xs">
                Digite sua pergunta abaixo para começar a conversar.
              </p>
            </div>
          </div>
          
          <div className="p-4 border-t">
            <div className="flex">
              <input
                type="text"
                placeholder="Digite sua pergunta..."
                className="flex-1 px-3 py-2 border rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    // Trigger Chatbase widget programmatically
                    const chatbaseButton = document.querySelector('[data-chatbase-open]') as HTMLElement;
                    if (chatbaseButton) {
                      chatbaseButton.click();
                    }
                  }
                }}
              />
              <button
                onClick={() => {
                  // Trigger Chatbase widget programmatically
                  const chatbaseButton = document.querySelector('[data-chatbase-open]') as HTMLElement;
                  if (chatbaseButton) {
                    chatbaseButton.click();
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700"
              >
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatbaseWidget;