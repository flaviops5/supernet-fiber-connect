import { useEffect, useState } from 'react';
import { Bot, Send } from 'lucide-react';

interface ChatbaseWidgetProps {
  chatbotId?: string;
}

const ChatbaseWidget = ({ chatbotId }: ChatbaseWidgetProps) => {
  const [isReady, setIsReady] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!chatbotId) return;

    // Create and configure Chatbase script
    const script = document.createElement('script');
    script.src = 'https://www.chatbase.co/embed.min.js';
    script.defer = true;
    script.setAttribute('chatbotId', chatbotId);
    
    script.onload = () => {
      console.log('Chatbase loaded successfully');
      setIsReady(true);
    };
    
    document.head.appendChild(script);

    // Hide default Chatbase widget
    const style = document.createElement('style');
    style.textContent = `
      iframe[src*="chatbase.co"] {
        display: none !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      const existingScript = document.querySelector(`script[src="https://www.chatbase.co/embed.min.js"]`);
      if (existingScript) {
        document.head.removeChild(existingScript);
      }
    };
  }, [chatbotId]);

  const handleSendMessage = () => {
    if (!message.trim()) return;
    
    setIsChatOpen(true);
    
    // Open Chatbase chat with the message
    const chatIframe = document.createElement('iframe');
    chatIframe.src = `https://www.chatbase.co/chatbot-iframe/${chatbotId}?message=${encodeURIComponent(message)}`;
    chatIframe.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 90vw;
      max-width: 800px;
      height: 70vh;
      border: none;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      z-index: 9999;
      background: white;
    `;
    
    // Add backdrop
    const backdrop = document.createElement('div');
    backdrop.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 9998;
      backdrop-filter: blur(4px);
    `;
    
    backdrop.onclick = () => {
      document.body.removeChild(chatIframe);
      document.body.removeChild(backdrop);
      setIsChatOpen(false);
    };
    
    document.body.appendChild(backdrop);
    document.body.appendChild(chatIframe);
    
    setMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  if (!chatbotId) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 shadow-lg z-40">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-sm text-muted-foreground">
            Configure o Chatbase ID para ativar o chat AI
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-lg z-40">
      <div className="max-w-6xl mx-auto p-4">
        <div className="flex items-center gap-4">
          {/* AI Assistant Info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">Supernet Fibra</h3>
              <p className="text-xs text-primary">Contrate agora sua internet!</p>
            </div>
          </div>
          
          {/* Message Input */}
          <div className="flex-1 flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Digite sua dúvida ou inicie o contrato..."
              className="flex-1 px-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <button
              onClick={handleSendMessage}
              disabled={!message.trim()}
              className="px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Enviar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatbaseWidget;