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
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-primary via-orange to-primary shadow-2xl border-t-4 border-white/20 z-40 animate-fade-in">
      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-orange/20 to-primary/20 blur-xl"></div>
      
      <div className="relative max-w-6xl mx-auto p-6">
        <div className="flex items-center gap-6">
          {/* AI Assistant Info */}
          <div className="flex items-center gap-4 animate-scale-in">
            <div className="relative">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-white/30 shadow-lg hover-scale">
                <Bot className="w-7 h-7 text-white drop-shadow-lg" />
              </div>
              {/* Pulse ring */}
              <div className="absolute inset-0 w-14 h-14 bg-white/20 rounded-full animate-ping"></div>
            </div>
            <div>
              <h3 className="font-bold text-lg text-white drop-shadow-md">Supernet Fibra</h3>
              <p className="text-white/90 font-semibold text-sm bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm border border-white/20">
                ⚡ Tire suas dúvidas!
              </p>
            </div>
          </div>
          
          {/* Message Input */}
          <div className="flex-1 flex gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="CONTRATE AGORA SUA INTERNET"
                className="w-full px-6 py-4 border-2 border-white/30 rounded-2xl bg-white/95 backdrop-blur-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-4 focus:ring-white/50 focus:border-white shadow-xl text-lg font-medium transition-all duration-300 hover:shadow-2xl hover:bg-white"
              />
              {/* Input glow effect */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/20 to-orange/20 blur-md -z-10 opacity-0 transition-opacity duration-300 peer-focus:opacity-100"></div>
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!message.trim()}
              className="relative px-8 py-4 bg-white hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary rounded-2xl transition-all duration-300 flex items-center gap-3 font-bold text-lg shadow-xl hover:shadow-2xl hover-scale group overflow-hidden"
            >
              {/* Button background animation */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-orange/10 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
              
              <Send className="w-5 h-5 relative z-10 group-hover:animate-pulse" />
              <span className="hidden sm:inline relative z-10">Enviar</span>
              
              {/* Button glow */}
              <div className="absolute inset-0 bg-white/20 rounded-2xl blur group-hover:blur-md transition-all duration-300"></div>
            </button>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 left-1/4 w-32 h-1 bg-gradient-to-r from-transparent via-white/50 to-transparent"></div>
        <div className="absolute top-0 right-1/4 w-24 h-1 bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
      </div>
      
      {/* Bottom accent line */}
      <div className="h-1 bg-gradient-to-r from-white/0 via-white/60 to-white/0"></div>
    </div>
  );
};

export default ChatbaseWidget;