import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface ChatbaseWidgetProps {
  chatbotId?: string;
}

const ChatbaseWidget = ({ chatbotId = "mMFk_B5d94OhD7fQBxvNU" }: ChatbaseWidgetProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Listen for messages from iframe
    const handleMessage = (event: MessageEvent) => {
      // Handle messages from the chatbot iframe
      if (event.data && event.data.type === 'chatbase-response') {
        console.log('Received message from chatbot:', event.data);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleSendMessage = () => {
    if (!inputMessage.trim() || !iframeRef.current) return;

    // Send message to iframe via postMessage
    const message = {
      type: 'chatbase-message',
      content: inputMessage,
      timestamp: Date.now()
    };

    iframeRef.current.contentWindow?.postMessage(message, '*');
    setInputMessage('');
    textareaRef.current?.focus();
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
    setShowEmojiPicker(false);
  };

  const commonEmojis = [
    '😊', '😂', '🥰', '😍', '🤔', '👍', '👏', '🙌',
    '❤️', '💕', '🔥', '⭐', '🎉', '👋', '😎', '😮',
    '😢', '😭', '😱', '🤯', '🤗', '🤝', '💪', '✨'
  ];

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

        {/* Expanded State - Chat Interface with Iframe */}
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

            {/* Chat Content with Iframe */}
            <div className="flex flex-col h-full">
              {/* Iframe for Chatbot */}
              <div className="flex-1 relative">
                <iframe
                  ref={iframeRef}
                  src={`https://www.chatbase.co/chatbot-iframe/${chatbotId}`}
                  className="w-full h-full border-0"
                  allow="microphone"
                  title="Chatbot"
                />
              </div>

              {/* Emoji Picker */}
              {showEmojiPicker && (
                <div className="absolute bottom-20 left-4 right-4 bg-white border-2 border-gray-200 rounded-2xl shadow-lg p-4 z-10">
                  <div className="grid grid-cols-8 gap-2 max-h-32 overflow-y-auto">
                    {commonEmojis.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => addEmoji(emoji)}
                        className="text-2xl hover:bg-gray-100 rounded-lg p-2 transition-colors"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input Area with Emoji Support */}
              <div className="p-4 border-t bg-white relative">
                <div className="flex items-end gap-3">
                  <Button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    variant="outline"
                    size="icon"
                    className="rounded-full hover:bg-gray-100"
                    title="Emojis"
                  >
                    <Smile className="w-4 h-4" />
                  </Button>
                  
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
        )}
      </div>
    </>
  );
};

export default ChatbaseWidget;