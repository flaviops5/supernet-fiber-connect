import React, { useState } from 'react';
import { Bot, Minimize2, X } from 'lucide-react';

interface ChatbaseWidgetProps {
  chatbotId?: string;
}

const ChatbaseWidget = ({ chatbotId = "mMFk_B5d94OhD7fQBxvNU" }: ChatbaseWidgetProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);

  return (
    <>
      {/* Full Screen Floating Chat Widget */}
      <div className="fixed inset-4 z-50 pointer-events-none">
        
        {/* Collapsed State - Robot in Corner */}
        {!isExpanded && (
          <div className="absolute bottom-0 left-0 pointer-events-auto">
            <div 
              onClick={() => setIsExpanded(true)}
              className="w-20 h-20 bg-gradient-to-r from-red-accent to-orange rounded-full shadow-2xl cursor-pointer hover:scale-110 transition-all duration-300 flex items-center justify-center relative overflow-hidden group"
            >
              {/* Glow effects */}
              <div className="absolute inset-0 bg-gradient-to-r from-red-accent/30 to-orange/30 blur-xl animate-pulse"></div>
              
              {/* Robot Icon */}
              <Bot className="w-10 h-10 text-white drop-shadow-lg relative z-10 group-hover:animate-bounce" />
              
              {/* Floating text */}
              <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-red-accent to-orange text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                Fale conosco!
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-orange"></div>
              </div>
            </div>
          </div>
        )}

        {/* Expanded State - Full Screen Chat Interface */}
        {isExpanded && (
          <div className={`pointer-events-auto bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border-2 border-white/20 transition-all duration-500 ${
            isMinimized 
              ? 'w-80 h-16 bottom-0 left-0 absolute' 
              : 'w-full h-full max-w-6xl max-h-[80vh] absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2'
          }`}>
            
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-red-accent to-orange text-white rounded-t-2xl">
              <div className="flex items-center gap-4">
                {/* Robot Avatar */}
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <Bot className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Assistente Virtual SUPERNET</h3>
                  <p className="text-white/80 text-sm">🟢 Online - Resposta em segundos</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="hover:bg-white/20 p-2 rounded-lg transition-colors"
                  title="Minimizar"
                >
                  <Minimize2 size={18} />
                </button>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="hover:bg-white/20 p-2 rounded-lg transition-colors"
                  title="Fechar"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Chat Content */}
            {!isMinimized && (
              <div className="flex-1 h-full rounded-b-2xl overflow-hidden">
                <iframe
                  src={`https://www.chatbase.co/chatbot-iframe/${chatbotId}`}
                  title="Chatbot SUPERNET"
                  className="w-full h-full border-0 rounded-b-2xl"
                  allow="microphone; camera; clipboard-read; clipboard-write"
                  style={{
                    minHeight: '500px',
                    filter: 'none',
                  }}
                />
                <style>{`
                  iframe[title="Chatbot SUPERNET"] {
                    border: none !important;
                    background: transparent !important;
                  }
                `}</style>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default ChatbaseWidget;