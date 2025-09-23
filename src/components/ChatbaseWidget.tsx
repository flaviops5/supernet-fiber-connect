import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Paperclip, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface ChatbaseWidgetProps {
  chatbotId?: string;
}

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  type: 'text' | 'emoji';
}

const ChatbaseWidget = ({ chatbotId = "mMFk_B5d94OhD7fQBxvNU" }: ChatbaseWidgetProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Olá! Sou o assistente virtual da SUPERNET FIBRA. Como posso ajudá-lo hoje?',
      sender: 'bot',
      timestamp: new Date(),
      type: 'text'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: 'user',
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    // Simular resposta do bot
    setTimeout(() => {
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: getBotResponse(inputMessage),
        sender: 'bot',
        timestamp: new Date(),
        type: 'text'
      };
      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
    }, 1500);
  };

  const getBotResponse = (userInput: string) => {
    const input = userInput.toLowerCase();
    
    if (input.includes('plano') || input.includes('preço')) {
      return 'Temos planos de 100MB, 300MB e 500MB! Todos com instalação gratuita e suporte 24/7. Gostaria de saber mais detalhes sobre algum plano específico?';
    }
    
    if (input.includes('instalação')) {
      return 'Nossa instalação é 100% gratuita! Nossa equipe agenda um horário e deixa tudo funcionando em até 2 horas. Que bairro você mora?';
    }
    
    if (input.includes('velocidade')) {
      return 'Nossa fibra óptica entrega 100% da velocidade contratada! Se contratar 100MB, recebe exatos 100MB. Quer fazer um teste de velocidade?';
    }
    
    if (input.includes('suporte') || input.includes('problema')) {
      return 'Nosso suporte funciona 24/7! Pode me contar qual problema está enfrentando que vou te ajudar imediatamente.';
    }
    
    return 'Entendi! Posso te ajudar com informações sobre planos, instalação, velocidade ou suporte técnico. O que mais gostaria de saber?';
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const addEmoji = (emoji: string) => {
    setInputMessage(prev => prev + emoji);
    textareaRef.current?.focus();
  };

  const commonEmojis = ['😊', '👍', '❤️', '😂', '🤔', '👋', '🙌', '🔥'];

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
            <div className="flex flex-col h-full">
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                        message.sender === 'user'
                          ? 'bg-gradient-to-r from-[#4d64ae] to-[#f48120] text-white'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      <p className="text-sm leading-relaxed">{message.content}</p>
                      <span className="text-xs opacity-70 mt-1 block">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
                
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-2xl px-4 py-3">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Emoji Bar */}
              <div className="px-4 py-2 border-t bg-gray-50">
                <div className="flex gap-2 justify-center">
                  {commonEmojis.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => addEmoji(emoji)}
                      className="text-xl hover:scale-125 transition-transform duration-200"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input Area */}
              <div className="p-4 border-t bg-white">
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <Textarea
                      ref={textareaRef}
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Digite sua mensagem..."
                      className="min-h-[40px] max-h-[120px] resize-none rounded-2xl border-2 border-gray-200 focus:border-[#4d64ae] focus:ring-[#4d64ae]"
                      rows={1}
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-full hover:bg-gray-100"
                      title="Anexar arquivo"
                    >
                      <Paperclip className="w-4 h-4" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-full hover:bg-gray-100"
                      title="Gravar áudio"
                    >
                      <Mic className="w-4 h-4" />
                    </Button>
                    
                    <Button
                      onClick={handleSendMessage}
                      disabled={!inputMessage.trim()}
                      className="rounded-full bg-gradient-to-r from-[#4d64ae] to-[#f48120] hover:opacity-90"
                      size="icon"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ChatbaseWidget;