import React, { useState } from 'react';
import { Bot, Minimize2, X } from 'lucide-react';

interface ChatbaseWidgetProps {
  chatbotId?: string;
}

const ChatbaseWidget = ({ chatbotId = "mMFk_B5d94OhD7fQBxvNU" }: ChatbaseWidgetProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  return (
    <>
      {/* Floating Chat Widget */}
      <div className="fixed bottom-6 right-6 z-50">
        
        {/* Minimized State - Floating Button */}
        {!isExpanded && (
          <div 
            onClick={() => setIsExpanded(true)}
            className="w-16 h-16 bg-gradient-to-r from-primary to-orange rounded-full shadow-2xl cursor-pointer hover:scale-110 transition-all duration-300 flex items-center justify-center relative overflow-hidden group"
          >
            {/* Glow effects */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/30 to-orange/30 blur-xl animate-pulse"></div>
            
            {/* Robot Icon */}
            <Bot className="w-8 h-8 text-white drop-shadow-lg relative z-10 group-hover:animate-bounce" />
          </div>
        )}

        {/* Expanded State - Chat Interface */}
        {isExpanded && (
          <div className={`bg-white rounded-lg shadow-2xl border transition-all duration-300 ${
            isMinimized ? 'w-80 h-12' : 'w-80 h-96'
          }`}>
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b bg-primary text-white rounded-t-lg">
              <h3 className="font-semibold text-sm">Chat de Suporte</h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="hover:bg-white/20 p-1 rounded"
                >
                  <Minimize2 size={14} />
                </button>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="hover:bg-white/20 p-1 rounded"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Chat Content */}
            {!isMinimized && (
              <div className="flex-1 h-80">
                <iframe
                  src={`https://www.chatbase.co/chatbot-iframe/${chatbotId}`}
                  title="Chatbot"
                  className="w-full h-full border-0 rounded-b-lg"
                  allow="microphone"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default ChatbaseWidget;