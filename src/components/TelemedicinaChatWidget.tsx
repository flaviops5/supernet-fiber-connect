import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Bot, MessageCircle, Send, Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import telemedicinaFamily from '@/assets/telemedicina-family.jpg';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  emoji?: string;
}

interface TelemedicinaChatWidgetProps {
  chatbotId?: string;
}

const TelemedicinaChatWidget = ({ chatbotId = "zyFH0AihcEAIixsQekuvr" }: TelemedicinaChatWidgetProps) => {
  console.log('TelemedicinaChatWidget loading...');
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionCount, setSessionCount] = useState(1);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);

  const emojis = ['😊', '😄', '😢', '😡', '👍', '👎', '❤️', '🤔', '😷', '🏥', '💊', '🩺'];

  // Send message via POST to Chatbase API
  const sendMessageToChatbase = useCallback(async (message: string) => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`https://www.chatbase.co/api/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${chatbotId}`,
        },
        body: JSON.stringify({
          messages: [
            {
              content: message,
              role: 'user'
            }
          ],
          chatbotId: chatbotId,
          stream: false,
          temperature: 0
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.text || 'Desculpe, não consegui processar sua mensagem.';
      } else {
        throw new Error('Erro na comunicação com o servidor');
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      return 'Desculpe, ocorreu um erro. Tente novamente.';
    } finally {
      setIsLoading(false);
    }
  }, [chatbotId]);

  // Handle sending messages
  const handleSendMessage = useCallback(async () => {
    if (!currentMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: currentMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');

    // Send to Chatbase and get response
    const botResponse = await sendMessageToChatbase(currentMessage);
    
    const botMessage: Message = {
      id: (Date.now() + 1).toString(),
      text: botResponse,
      sender: 'bot',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, botMessage]);
  }, [currentMessage, sendMessageToChatbase]);

  // Handle emoji selection
  const handleEmojiSelect = useCallback((emoji: string) => {
    setCurrentMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  }, []);

  // Handle iframe messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'chatbase-response') {
        console.log('Received message from telemedicina chatbot:', event.data);
        
        if (event.data.message) {
          const botMessage: Message = {
            id: Date.now().toString(),
            text: event.data.message,
            sender: 'bot',
            timestamp: new Date()
          };
          setMessages(prev => [...prev, botMessage]);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Auto-reset session every 30 minutes of inactivity
  useEffect(() => {
    const resetChatSession = () => {
      if (iframeRef.current) {
        const newSrc = `https://www.chatbase.co/chatbot-iframe/${chatbotId}?session=${Date.now()}`;
        iframeRef.current.src = newSrc;
        setSessionCount(prev => prev + 1);
        setMessages([]); // Clear messages on reset
        
        setTimeout(() => {
          iframeRef.current?.contentWindow?.postMessage({
            type: 'chatbase-reset',
            timestamp: Date.now()
          }, '*');
        }, 1000);
      }
    };

    // Set 30-minute reset timer
    resetTimerRef.current = setTimeout(resetChatSession, 30 * 60 * 1000);

    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
    };
  }, [chatbotId, sessionCount]);

  const handleWhatsApp = () => {
    const message = "Olá! Gostaria de saber mais sobre os serviços de telemedicina.";
    window.open(`https://api.whatsapp.com/send/?phone=61999475886&text=${encodeURIComponent(message)}`, '_blank');
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <section className="py-16 bg-gradient-to-br from-blue-50 to-blue-100">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold font-varela uppercase text-foreground mb-4">
            Contrate agora a{' '}
            <span className="bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">TELEMEDICINA</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Converse conosco agora mesmo! Tire suas dúvidas sobre telemedicina, conheça nossos planos médicos e comece hoje mesmo. 
            Atendimento especializado disponível.
          </p>
        </div>

        {/* Chat Container */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            
            {/* Chat Header */}
            <div className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-600 to-blue-800 text-white">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Assistente Virtual TELEMEDICINA</h3>
                  <div className="flex items-center gap-2 text-white/90">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-sm">Online - Resposta em segundos</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-white/80">
                <MessageCircle className="w-5 h-5" />
                <span className="text-sm font-medium">Chat médico</span>
              </div>
            </div>

            {/* Chat Messages Area */}
            <div className="h-[400px] bg-blue-50 overflow-y-auto p-4">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-center">
                  <div className="text-muted-foreground">
                    <Bot className="w-12 h-12 mx-auto mb-4 text-blue-600" />
                    <p className="text-lg font-medium mb-2">Olá! Sou seu assistente médico virtual</p>
                    <p className="text-sm">Digite sua pergunta sobre telemedicina abaixo</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] p-3 rounded-2xl ${
                          message.sender === 'user'
                            ? 'bg-blue-600 text-white ml-4'
                            : 'bg-white border border-blue-200 text-foreground mr-4'
                        }`}
                      >
                        <p className="text-sm">{message.text}</p>
                        {message.emoji && (
                          <span className="ml-2 text-lg">{message.emoji}</span>
                        )}
                        <div className="text-xs opacity-70 mt-1">
                          {message.timestamp.toLocaleTimeString('pt-BR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-blue-200 text-foreground mr-4 p-3 rounded-2xl">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Chat Input Area */}
            <div className="p-4 bg-white border-t border-blue-200">
              <div className="flex items-end gap-2">
                <div className="flex-1 relative">
                  <Input
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Digite sua pergunta sobre telemedicina..."
                    className="pr-12 border-blue-200 focus:border-blue-600 focus:ring-blue-600"
                    disabled={isLoading}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-blue-100"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  >
                    <Smile className="w-4 h-4 text-blue-600" />
                  </Button>
                  
                  {/* Emoji Picker */}
                  {showEmojiPicker && (
                    <div className="absolute bottom-full right-0 mb-2 bg-white border border-blue-200 rounded-lg p-2 shadow-lg z-10">
                      <div className="grid grid-cols-6 gap-1">
                        {emojis.map((emoji, index) => (
                          <button
                            key={index}
                            onClick={() => handleEmojiSelect(emoji)}
                            className="p-1 hover:bg-blue-100 rounded text-lg"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <Button
                  onClick={handleSendMessage}
                  disabled={!currentMessage.trim() || isLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Chat Footer */}
            <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 border-t">
              <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Atendimento 24/7</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  <span>Resposta em segundos</span>
                </div>
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4" />
                  <span>Assistente médico</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA with Image */}
        <div className="text-center mt-12">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8 md:p-12 relative overflow-hidden">
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <div className="text-left">
                <h3 className="text-2xl md:text-3xl font-bold font-varela uppercase text-foreground mb-4">
                  Pronto para cuidar da sua saúde de forma digital?
                </h3>
                <p className="text-muted-foreground mb-8">
                  Milhares de famílias já confiam na nossa telemedicina. 
                  Seja você também parte dessa revolução na saúde.
                </p>
                <Button
                  onClick={handleWhatsApp}
                  size="lg"
                  className="bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-lg px-10 py-6"
                >
                  Fale Conosco Agora
                </Button>
              </div>
              <div className="relative">
                <img
                  src={telemedicinaFamily}
                  alt="Família aproveitando consultas médicas online via telemedicina"
                  className="w-full h-80 object-cover rounded-2xl shadow-elegant"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TelemedicinaChatWidget;