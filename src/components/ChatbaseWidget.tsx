import React, { useState } from 'react';
import { Bot, Minimize2, X } from 'lucide-react';

interface ChatbaseWidgetProps {
  chatbotId?: string;
}

const ChatbaseWidget = ({ chatbotId = "mMFk_B5d94OhD7fQBxvNU" }: ChatbaseWidgetProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      {/* Horizontal Chat Bar at Bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
        
        {/* Collapsed State - Horizontal Bar */}
        {!isExpanded && (
          <div className="pointer-events-auto bg-gradient-to-r from-[#4d64ae] to-[#f48120] shadow-2xl">
            <div 
              onClick={() => setIsExpanded(true)}
              className="flex items-center justify-between px-6 py-4 cursor-pointer hover:opacity-90 transition-all duration-300"
            >
              <div className="flex items-center gap-4">
                {/* Robot Icon */}
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <Bot className="w-7 h-7 text-white" />
                </div>
                
                <div className="text-white">
                  <h3 className="font-bold text-lg">Assistente Virtual SUPERNET</h3>
                  <p className="text-white/90 text-sm">Clique aqui para conversar conosco - Resposta em segundos</p>
                </div>
              </div>
              
              <div className="text-white/80 text-sm font-medium">
                💬 Fale Conosco
              </div>
            </div>
          </div>
        )}

        {/* Expanded State - Full Screen Chat Interface */}
        {isExpanded && (
          <div className="pointer-events-auto bg-white/95 backdrop-blur-sm shadow-2xl border-t-2 border-white/20 transition-all duration-500 fixed bottom-0 left-0 right-0 h-[70vh]">
            
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-[#4d64ae] to-[#f48120] text-white">
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
              
              <button
                onClick={() => setIsExpanded(false)}
                className="hover:bg-white/20 p-2 rounded-lg transition-colors"
                title="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            {/* Chat Content */}
            <div className="flex-1 h-full overflow-hidden">
              <iframe
                src={`https://www.chatbase.co/chatbot-iframe/${chatbotId}`}
                title="Chatbot SUPERNET"
                className="w-full h-full border-0"
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
          </div>
        )}
      </div>
    </>
  );
};

export default ChatbaseWidget;