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
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-br from-primary via-primary/90 to-orange/80 shadow-2xl border-t-4 border-white/30 z-40 animate-fade-in backdrop-blur-md">
      {/* Multi-layer glow effects */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/15 to-pink-500/10 blur-2xl"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-white/5 via-transparent to-white/10"></div>
      
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-1/4 w-2 h-2 bg-white rounded-full animate-ping animation-delay-100"></div>
        <div className="absolute top-2 right-1/3 w-1 h-1 bg-white/70 rounded-full animate-pulse animation-delay-300"></div>
        <div className="absolute bottom-2 left-2/3 w-1.5 h-1.5 bg-white/50 rounded-full animate-ping animation-delay-500"></div>
      </div>
      
      <div className="relative max-w-6xl mx-auto p-6">
        <div className="flex items-center gap-6">
          {/* AI Assistant Info with enhanced robot */}
          <div className="flex items-center gap-4 animate-scale-in">
            <div className="relative group">
              {/* Robot container with enhanced design */}
              <div className="w-16 h-16 bg-gradient-to-br from-white/25 to-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center border-2 border-white/40 shadow-2xl hover-scale relative overflow-hidden">
                {/* Robot face with more realistic features */}
                <div className="relative w-10 h-10">
                  {/* Head */}
                  <div className="w-10 h-8 bg-gradient-to-b from-white/90 to-white/70 rounded-lg relative shadow-inner">
                    {/* Eyes */}
                    <div className="absolute top-2 left-2 w-2 h-2 bg-primary rounded-full shadow-md">
                      <div className="w-1 h-1 bg-white rounded-full absolute top-0.5 left-0.5 animate-pulse"></div>
                    </div>
                    <div className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full shadow-md">
                      <div className="w-1 h-1 bg-white rounded-full absolute top-0.5 left-0.5 animate-pulse"></div>
                    </div>
                    {/* Mouth */}
                    <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-4 h-1 bg-primary/60 rounded-full"></div>
                    {/* Antenna */}
                    <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-0.5 h-2 bg-white/80"></div>
                    <div className="absolute -top-1.5 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-orange rounded-full animate-pulse"></div>
                  </div>
                  {/* Body */}
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-6 h-3 bg-gradient-to-b from-white/80 to-white/60 rounded-md shadow-inner">
                    {/* Control panel */}
                    <div className="absolute top-0.5 left-1/2 transform -translate-x-1/2 flex gap-0.5">
                      <div className="w-0.5 h-0.5 bg-green-400 rounded-full animate-ping animation-delay-100"></div>
                      <div className="w-0.5 h-0.5 bg-orange rounded-full animate-pulse animation-delay-200"></div>
                      <div className="w-0.5 h-0.5 bg-blue-400 rounded-full animate-ping animation-delay-300"></div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Enhanced pulse rings */}
              <div className="absolute inset-0 w-16 h-16 bg-white/10 rounded-2xl animate-ping animation-delay-100"></div>
              <div className="absolute inset-1 w-14 h-14 bg-gradient-to-r from-primary/20 to-orange/20 rounded-xl animate-pulse animation-delay-300"></div>
            </div>
            
            <div>
              <h3 className="font-bold text-xl text-white drop-shadow-lg">Supernet Fibra</h3>
              <p className="text-white/95 font-semibold text-sm bg-gradient-to-r from-white/20 to-white/10 px-4 py-1.5 rounded-full backdrop-blur-sm border border-white/30 shadow-lg">
                ⚡ Tire suas dúvidas!
              </p>
            </div>
          </div>
          
          {/* Enhanced Message Input */}
          <div className="flex-1 flex gap-3">
            <div className="relative flex-1 group">
              {/* Input with enhanced styling */}
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="CONTRATE AGORA SUA INTERNET"
                className="w-full px-8 py-5 border-3 border-white/40 rounded-3xl bg-gradient-to-r from-white/95 to-white/90 backdrop-blur-sm text-foreground placeholder:text-muted-foreground/80 placeholder:font-bold focus:outline-none focus:ring-4 focus:ring-white/60 focus:border-white/60 shadow-2xl text-lg font-medium transition-all duration-500 hover:shadow-3xl hover:bg-white group-hover:scale-[1.02] transform"
              />
              
              {/* Enhanced input effects */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-primary/5 via-orange/5 to-primary/5 blur-lg -z-10 opacity-0 group-focus-within:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-white/20 to-white/10 blur-md -z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              {/* Floating particles effect */}
              <div className="absolute top-1 right-4 w-2 h-2 bg-gradient-to-r from-primary to-orange rounded-full animate-bounce animation-delay-100 opacity-60"></div>
            </div>
            
            <button
              onClick={handleSendMessage}
              disabled={!message.trim()}
              className="relative px-10 py-5 bg-gradient-to-r from-white via-white/95 to-white/90 hover:from-white hover:to-white/95 disabled:opacity-50 disabled:cursor-not-allowed text-primary rounded-3xl transition-all duration-500 flex items-center gap-4 font-bold text-lg shadow-2xl hover:shadow-3xl hover-scale group overflow-hidden border-2 border-white/50"
            >
              {/* Enhanced button effects */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-orange/5 to-primary/5 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
              <div className="absolute inset-0 bg-white/30 rounded-3xl blur-lg group-hover:blur-xl transition-all duration-300 opacity-0 group-hover:opacity-50"></div>
              
              <Send className="w-6 h-6 relative z-10 group-hover:animate-pulse drop-shadow-md" />
              <span className="hidden sm:inline relative z-10 drop-shadow-sm">Enviar</span>
              
              {/* Button sparkle effect */}
              <div className="absolute top-2 right-3 w-1 h-1 bg-orange rounded-full animate-ping animation-delay-200 opacity-70"></div>
            </button>
          </div>
        </div>
        
        {/* Enhanced decorative elements */}
        <div className="absolute top-0 left-1/4 w-40 h-1 bg-gradient-to-r from-transparent via-white/60 to-transparent"></div>
        <div className="absolute top-0 right-1/4 w-32 h-1 bg-gradient-to-r from-transparent via-white/40 to-transparent"></div>
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-20 h-1 bg-gradient-to-r from-orange/50 to-primary/50"></div>
      </div>
      
      {/* Enhanced bottom accent */}
      <div className="h-2 bg-gradient-to-r from-white/0 via-white/70 to-white/0 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/30 via-orange/30 to-primary/30 blur-sm"></div>
      </div>
    </div>
  );
};

export default ChatbaseWidget;