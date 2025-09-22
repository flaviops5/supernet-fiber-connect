import { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';

interface ChatbaseWidgetProps {
  chatbotId?: string;
}

// Extend Window interface to include chatbase
declare global {
  interface Window {
    chatbase?: {
      toggle: () => void;
    };
  }
}

const ChatbaseWidget = ({ chatbotId }: ChatbaseWidgetProps) => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!chatbotId) return;

    // Create script element for Chatbase
    const script = document.createElement('script');
    script.src = 'https://www.chatbase.co/embed.min.js';
    script.defer = true;
    script.setAttribute('chatbotId', chatbotId);
    
    // Add script to document
    document.head.appendChild(script);

    // Add custom CSS to hide default bubble and position chat window
    const style = document.createElement('style');
    style.textContent = `
      /* Hide the default Chatbase bubble */
      .chatbase-bubble {
        display: none !important;
      }
      
      /* Position the chat window properly */
      .chatbase-chat-window {
        position: fixed !important;
        bottom: 90px !important;
        right: 24px !important;
        z-index: 9998 !important;
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2) !important;
        border-radius: 12px !important;
      }
      
      @media (max-width: 640px) {
        .chatbase-chat-window {
          right: 16px !important;
          left: 16px !important;
          bottom: 90px !important;
          width: calc(100vw - 32px) !important;
        }
      }
    `;
    document.head.appendChild(style);

    // Wait for Chatbase to load
    const checkChatbase = setInterval(() => {
      if (window.chatbase) {
        setIsReady(true);
        clearInterval(checkChatbase);
      }
    }, 100);

    // Cleanup function
    return () => {
      clearInterval(checkChatbase);
      
      const existingScript = document.querySelector(`script[src="https://www.chatbase.co/embed.min.js"]`);
      if (existingScript) {
        document.head.removeChild(existingScript);
      }
      
      const customStyle = document.querySelector('style[data-chatbase="custom"]');
      if (customStyle) {
        document.head.removeChild(customStyle);
      }
      
      const chatbaseElements = document.querySelectorAll('[id^="chatbase"]');
      chatbaseElements.forEach(element => element.remove());
    };
  }, [chatbotId]);

  const toggleChat = () => {
    if (isReady && window.chatbase?.toggle) {
      window.chatbase.toggle();
    }
  };

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
      {/* Custom Chat Icon Button */}
      <button
        onClick={toggleChat}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 z-50 flex items-center justify-center group"
        aria-label="Abrir chat AI"
        title="Converse com nossa IA"
      >
        <MessageCircle className="w-6 h-6" />
        
        {/* Pulse animation */}
        <div className="absolute inset-0 w-14 h-14 bg-blue-600 rounded-full animate-ping opacity-20"></div>
        
        {/* Tooltip */}
        <div className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
          Chat com IA
        </div>
      </button>
    </>
  );
};

export default ChatbaseWidget;