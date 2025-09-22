import { useEffect } from 'react';

interface ChatbaseWidgetProps {
  chatbotId?: string;
}

const ChatbaseWidget = ({ chatbotId }: ChatbaseWidgetProps) => {
  useEffect(() => {
    if (!chatbotId) return;

    // Create script element for Chatbase
    const script = document.createElement('script');
    script.src = 'https://www.chatbase.co/embed.min.js';
    script.defer = true;
    script.setAttribute('chatbotId', chatbotId);
    
    // Add script to document
    document.head.appendChild(script);

    // Add custom CSS to ensure proper positioning
    const style = document.createElement('style');
    style.textContent = `
      .chatbase-bubble {
        position: fixed !important;
        bottom: 20px !important;
        right: 20px !important;
        z-index: 9999 !important;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15) !important;
      }
      
      .chatbase-chat-window {
        position: fixed !important;
        bottom: 80px !important;
        right: 20px !important;
        z-index: 9999 !important;
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2) !important;
        border-radius: 12px !important;
      }
      
      @media (max-width: 640px) {
        .chatbase-chat-window {
          right: 10px !important;
          left: 10px !important;
          bottom: 80px !important;
          width: calc(100vw - 20px) !important;
        }
        
        .chatbase-bubble {
          right: 15px !important;
          bottom: 15px !important;
        }
      }
    `;
    document.head.appendChild(style);

    // Cleanup function
    return () => {
      // Remove script when component unmounts
      const existingScript = document.querySelector(`script[src="https://www.chatbase.co/embed.min.js"]`);
      if (existingScript) {
        document.head.removeChild(existingScript);
      }
      
      // Remove custom style
      const customStyle = document.querySelector('style[data-chatbase="custom"]');
      if (customStyle) {
        document.head.removeChild(customStyle);
      }
      
      // Remove chatbase elements
      const chatbaseElements = document.querySelectorAll('[id^="chatbase"]');
      chatbaseElements.forEach(element => element.remove());
    };
  }, [chatbotId]);

  if (!chatbotId) {
    return (
      <div className="fixed bottom-4 right-4 p-4 bg-white border border-gray-300 rounded-lg shadow-lg max-w-sm">
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

  return null; // The script will handle rendering the widget
};

export default ChatbaseWidget;