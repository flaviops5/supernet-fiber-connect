import { useEffect, useState } from 'react';
import { Bot, Send, Minimize2, Maximize2 } from 'lucide-react';

interface ChatbaseWidgetProps {
  chatbotId?: string;
}

const ChatbaseWidget = ({ chatbotId }: ChatbaseWidgetProps) => {
  const [isReady, setIsReady] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

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
      <div className="fixed bottom-4 right-4 bg-background border border-border p-4 rounded-lg shadow-lg max-w-sm z-50">
        <p className="text-sm text-muted-foreground">
          Configure o Chatbase ID para ativar o chat AI
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Floating Chat Widget */}
      <div className={`fixed z-50 transition-all duration-500 ease-in-out ${
        isExpanded 
          ? 'bottom-4 right-4 left-4 md:left-auto md:right-4 md:w-96 h-[600px]' 
          : 'bottom-6 right-6 w-20 h-20'
      }`}>
        
        {/* Minimized State - Floating Button */}
        {!isExpanded && (
          <div 
            onClick={() => setIsExpanded(true)}
            className="w-20 h-20 bg-gradient-to-r from-primary via-orange to-primary rounded-full shadow-2xl cursor-pointer hover:scale-110 transition-all duration-300 flex items-center justify-center relative overflow-hidden group"
          >
            {/* Glow effects */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/30 via-orange/30 to-primary/30 blur-xl animate-pulse"></div>
            <div className="absolute inset-0 bg-white/5 rounded-full animate-ping"></div>
            
            {/* Robot Icon */}
            <Bot className="w-10 h-10 text-white drop-shadow-lg relative z-10 group-hover:animate-bounce" />
            
            {/* Floating notification badge */}
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-orange rounded-full flex items-center justify-center border-2 border-white shadow-lg">
              <span className="text-xs font-bold text-white">!</span>
            </div>
          </div>
        )}

        {/* Expanded State - Full Chat Interface */}
        {isExpanded && (
          <div className="w-full h-full bg-gradient-to-br from-primary via-orange/90 to-primary rounded-2xl shadow-2xl border border-white/20 backdrop-blur-sm flex flex-col overflow-hidden animate-scale-in">
            
            {/* Chat Header */}
            <div className="p-4 border-b border-white/20 flex items-center justify-between bg-gradient-to-r from-white/10 to-white/5">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <Bot className="w-6 h-6 text-white" />
                  </div>
                  <div className="absolute inset-0 w-10 h-10 bg-white/10 rounded-full animate-ping"></div>
                </div>
                <div>
                  <h3 className="font-bold font-varela uppercase text-white text-sm">Supernet Fibra</h3>
                  <p className="text-white/80 text-xs">⚡ Tire suas dúvidas!</p>
                </div>
              </div>
              
              <button 
                onClick={() => setIsExpanded(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <Minimize2 className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Chat Content Area */}
            <div className="flex-1 p-4 flex flex-col justify-end">
              <div className="mb-4 bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                <p className="text-white text-sm">
                  Olá! 👋 Sou o assistente da Supernet Fibra. Como posso te ajudar hoje?
                </p>
              </div>
            </div>

            {/* Message Input Area */}
            <div className="p-4 border-t border-white/20 bg-gradient-to-r from-white/5 to-white/10">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="CONTRATE AGORA SUA INTERNET"
                  className="flex-1 px-4 py-3 border-2 border-white/30 rounded-xl bg-white/95 text-foreground placeholder:text-muted-foreground/80 placeholder:font-bold focus:outline-none focus:ring-2 focus:ring-white/60 shadow-lg text-sm font-medium transition-all duration-300"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!message.trim()}
                  className="px-4 py-3 bg-white hover:bg-white/90 disabled:opacity-50 text-primary rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Decorative bottom accent */}
            <div className="h-1 bg-gradient-to-r from-white/0 via-white/60 to-white/0"></div>
          </div>
        )}
      </div>
    </>
  );
};

export default ChatbaseWidget;