import { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';

interface ChatbaseWidgetProps {
  chatbotId?: string;
}

const ChatbaseWidget = ({ chatbotId }: ChatbaseWidgetProps) => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!chatbotId) return;

    // Create and configure Chatbase script
    const script = document.createElement('script');
    script.src = 'https://www.chatbase.co/embed.min.js';
    script.defer = true;
    script.setAttribute('chatbotId', chatbotId);
    
    // Add custom configuration
    script.onload = () => {
      console.log('Chatbase loaded successfully');
      setIsReady(true);
    };
    
    document.head.appendChild(script);

    // Add custom CSS to control Chatbase appearance
    const style = document.createElement('style');
    style.textContent = `
      /* Hide default Chatbase bubble */
      iframe[src*="chatbase.co"] {
        display: none !important;
      }
      
      /* Style the chat window when open */
      .chatbase-chat-window,
      iframe[title="chatbase chat bubble"] {
        position: fixed !important;
        bottom: 90px !important;
        right: 20px !important;
        z-index: 9998 !important;
        border-radius: 12px !important;
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15) !important;
        border: none !important;
        width: 400px !important;
        height: 600px !important;
      }
      
      @media (max-width: 640px) {
        .chatbase-chat-window,
        iframe[title="chatbase chat bubble"] {
          right: 10px !important;
          left: 10px !important;
          width: calc(100vw - 20px) !important;
          height: 500px !important;
        }
      }
    `;
    document.head.appendChild(style);

    // Cleanup
    return () => {
      const existingScript = document.querySelector(`script[src="https://www.chatbase.co/embed.min.js"]`);
      if (existingScript) {
        document.head.removeChild(existingScript);
      }
      
      const chatbaseElements = document.querySelectorAll('iframe[src*="chatbase.co"], [id*="chatbase"]');
      chatbaseElements.forEach(element => element.remove());
    };
  }, [chatbotId]);

  const openChat = () => {
    // Method 1: Try to find and click the hidden Chatbase button
    const chatbaseButton = document.querySelector('iframe[src*="chatbase.co"]') as HTMLElement;
    
    if (chatbaseButton) {
      chatbaseButton.style.display = 'block';
      chatbaseButton.click();
    } else {
      // Method 2: Create a temporary iframe to open the chat
      const chatIframe = document.createElement('iframe');
      chatIframe.src = `https://www.chatbase.co/chatbot-iframe/${chatbotId}`;
      chatIframe.style.cssText = `
        position: fixed;
        bottom: 90px;
        right: 20px;
        width: 400px;
        height: 600px;
        border: none;
        border-radius: 12px;
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
        z-index: 9998;
        background: white;
      `;
      
      // Add close button
      const closeBtn = document.createElement('button');
      closeBtn.innerHTML = '✕';
      closeBtn.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: #f3f4f6;
        border: none;
        border-radius: 50%;
        width: 30px;
        height: 30px;
        cursor: pointer;
        z-index: 9999;
        font-size: 14px;
      `;
      
      closeBtn.onclick = () => {
        document.body.removeChild(chatIframe);
        document.body.removeChild(closeBtn);
      };
      
      document.body.appendChild(chatIframe);
      document.body.appendChild(closeBtn);
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
    <button
      onClick={openChat}
      className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 z-50 flex items-center justify-center group"
      aria-label="Abrir chat AI"
      title="Converse com nossa IA"
    >
      <MessageCircle className="w-6 h-6" />
      
      {/* Pulse animation */}
      <div className="absolute inset-0 w-14 h-14 bg-blue-600 rounded-full animate-ping opacity-20"></div>
      
      {/* Tooltip */}
      <div className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
        Chat com IA - Supernet
      </div>
    </button>
  );
};

export default ChatbaseWidget;