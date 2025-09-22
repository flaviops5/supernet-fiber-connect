import { useEffect, useState } from 'react';
import { Bot, X, MessageCircle } from 'lucide-react';

interface ChatbaseWidgetProps {
  chatbotId?: string;
}

const ChatbaseWidget = ({ chatbotId }: ChatbaseWidgetProps) => {
  const [isReady, setIsReady] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

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
    <>
      {/* Chat Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-primary hover:bg-primary/90 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 z-50 flex items-center justify-center group"
        aria-label="Abrir chat AI"
        title="Converse com nossa IA"
      >
        {isOpen ? (
          <X className="w-7 h-7" />
        ) : (
          <MessageCircle className="w-7 h-7" />
        )}
        
        {/* Pulse animation when closed */}
        {!isOpen && (
          <div className="absolute inset-0 w-16 h-16 bg-primary rounded-full animate-ping opacity-20"></div>
        )}
      </button>

      {/* Large Chat Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          ></div>
          
          {/* Chat Container */}
          <div className="relative w-full max-w-4xl h-[80vh] bg-background border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            
            {/* Header */}
            <div className="bg-primary text-white p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <Bot className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">Supernet Fibra</h3>
                  <p className="text-white/80">Contrate agora sua internet!</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Content */}
            <div className="flex-1 relative">
              <iframe
                src={`https://www.chatbase.co/chatbot-iframe/${chatbotId}`}
                className="w-full h-full border-0"
                title="Chatbase AI Assistant"
              />
            </div>

            {/* CTA Footer */}
            <div className="bg-gradient-to-r from-primary to-orange p-4 text-white text-center">
              <p className="text-sm font-medium">
                Precisa de ajuda? Nossa IA está aqui para você! 🚀
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatbaseWidget;