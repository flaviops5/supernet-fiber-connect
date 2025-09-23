import React, { useState } from 'react';
import { Bot, Send, Minimize2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

interface ChatMessage {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
}

interface ChatbaseWidgetProps {
  chatbotId?: string;
}

const ChatbaseWidget = ({ chatbotId = "mMFk_B5d94OhD7fQBxvNU" }: ChatbaseWidgetProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const { toast } = useToast();

  const sendMessageToChatbase = async (userMessage: string) => {
    if (!apiKey) {
      toast({
        title: "API Key necessária",
        description: "Por favor, configure sua API Key do Chatbase nas configurações",
        variant: "destructive",
      });
      setShowSettings(true);
      return;
    }

    setIsLoading(true);
    
    // Add user message immediately
    const userMsgId = Date.now().toString();
    const userChatMessage: ChatMessage = {
      id: userMsgId,
      text: userMessage,
      isBot: false,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userChatMessage]);

    try {
      const response = await fetch('https://www.chatbase.co/api/v1/chat', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatbotId: chatbotId,
          messages: [
            {
              content: userMessage,
              role: 'user'
            }
          ]
        }),
      });

      if (!response.ok) {
        throw new Error(`Erro da API: ${response.status}`);
      }

      const data = await response.json();
      
      // Add bot response
      const botMsgId = (Date.now() + 1).toString();
      const botChatMessage: ChatMessage = {
        id: botMsgId,
        text: data.text || "Desculpe, não consegui processar sua mensagem.",
        isBot: true,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, botChatMessage]);
      
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar a mensagem. Verifique sua API Key.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    
    const messageToSend = message;
    setMessage('');
    await sendMessageToChatbase(messageToSend);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Floating Chat Widget */}
      <div className={`fixed z-50 transition-all duration-500 ease-in-out ${
        isExpanded 
          ? 'inset-0 bg-black/50 backdrop-blur-sm' 
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

        {/* Expanded State - Full Screen Chat Interface */}
        {isExpanded && (
          <div className="w-full h-full flex items-center justify-center p-4">
            <div className="w-full max-w-2xl h-[90vh] bg-gradient-to-br from-primary via-orange/90 to-primary rounded-3xl shadow-2xl border border-white/20 backdrop-blur-sm flex flex-col overflow-hidden animate-scale-in">
              
              {/* Chat Header */}
              <div className="p-6 border-b border-white/20 flex items-center justify-between bg-gradient-to-r from-white/10 to-white/5">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                      <Bot className="w-8 h-8 text-white" />
                    </div>
                    <div className="absolute inset-0 w-12 h-12 bg-white/10 rounded-full animate-ping"></div>
                  </div>
                  <div>
                    <h3 className="font-bold font-varela uppercase text-white text-lg">Supernet Fibra</h3>
                    <p className="text-white/80 text-sm">⚡ Tire suas dúvidas sobre nossa internet!</p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowSettings(!showSettings)}
                    className="p-3 hover:bg-white/10 rounded-xl transition-colors group"
                  >
                    <Settings className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
                  </button>
                  <button 
                    onClick={() => setIsExpanded(false)}
                    className="p-3 hover:bg-white/10 rounded-xl transition-colors group"
                  >
                    <Minimize2 className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
                  </button>
                </div>
              </div>

              {/* Settings Panel */}
              {showSettings && (
                <div className="p-4 border-b border-white/20 bg-white/5">
                  <div className="mb-2">
                    <label className="text-white text-sm font-medium">API Key do Chatbase:</label>
                    <Input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Insira sua API Key do Chatbase"
                      className="mt-1 bg-white/10 border-white/30 text-white placeholder:text-white/60"
                    />
                    <p className="text-white/60 text-xs mt-1">
                      Configure sua API Key para usar o chat. Encontre em Settings → API no painel do Chatbase.
                    </p>
                  </div>
                </div>
              )}

              {/* Chat Messages Area */}
              <div className="flex-1 p-6 overflow-y-auto">
                {messages.length === 0 ? (
                  <div className="text-center max-w-md mx-auto">
                    <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
                      <Bot className="w-12 h-12 text-white animate-pulse" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-4 font-varela">
                      Olá! 👋
                    </h2>
                    <p className="text-white/90 text-lg leading-relaxed">
                      Sou o assistente da Supernet Fibra. Estou aqui para te ajudar com informações sobre nossos planos de internet!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.isBot ? 'justify-start' : 'justify-end'}`}
                      >
                        <div
                          className={`max-w-[80%] p-4 rounded-2xl ${
                            msg.isBot
                              ? 'bg-white/10 text-white backdrop-blur-sm'
                              : 'bg-white text-primary'
                          }`}
                        >
                          <p className="text-sm">{msg.text}</p>
                          <p className={`text-xs mt-2 ${msg.isBot ? 'text-white/60' : 'text-primary/60'}`}>
                            {msg.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="bg-white/10 text-white backdrop-blur-sm p-4 rounded-2xl">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Message Input Area */}
              <div className="p-6 border-t border-white/20 bg-gradient-to-r from-white/5 to-white/10">
                <div className="flex gap-4">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Digite sua mensagem..."
                    disabled={isLoading}
                    className="flex-1 px-6 py-4 border-2 border-white/30 rounded-2xl bg-white/95 text-foreground placeholder:text-foreground/70 focus:outline-none focus:ring-2 focus:ring-white/60 shadow-lg text-lg transition-all duration-300"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!message.trim() || isLoading}
                    className="px-6 py-4 bg-white hover:bg-white/90 disabled:opacity-50 text-primary rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 group"
                  >
                    <Send className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
                
                {/* Helper text */}
                <p className="text-white/60 text-sm mt-3 text-center">
                  {!apiKey ? "Configure sua API Key nas configurações para começar" : "Digite sua mensagem e pressione Enter"}
                </p>
              </div>

              {/* Decorative bottom accent */}
              <div className="h-2 bg-gradient-to-r from-white/0 via-white/60 to-white/0"></div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ChatbaseWidget;