import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Smile, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface ChatbaseWidgetProps {
  chatbotId?: string;
}

const ChatbaseWidget = ({ chatbotId = "mMFk_B5d94OhD7fQBxvNU" }: ChatbaseWidgetProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [sessionCount, setSessionCount] = useState(1);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const closeTimestampRef = useRef<number | null>(null);
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  // Handle chat open/close and 30-minute reset logic
  useEffect(() => {
    if (isExpanded) {
      // When opening chat, check if 30 minutes have passed since last close
      if (closeTimestampRef.current) {
        const timeSinceClose = Date.now() - closeTimestampRef.current;
        const thirtyMinutesInMs = 30 * 60 * 1000; // 30 minutes
        
        if (timeSinceClose >= thirtyMinutesInMs) {
          resetChatSession();
        }
      }
      
      // Clear any pending reset timer
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
        resetTimerRef.current = null;
      }
    } else {
      // When chat is closed, record timestamp and start 30-minute timer
      closeTimestampRef.current = Date.now();
      
      // Set timer to reset session after 30 minutes
      resetTimerRef.current = setTimeout(() => {
        resetChatSession();
      }, 30 * 60 * 1000); // 30 minutes
    }

    // Cleanup on unmount
    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
    };
  }, [isExpanded]);

  const resetChatSession = () => {
    if (iframeRef.current) {
      // Reset the iframe by updating its src to clear the conversation
      const newSrc = `https://www.chatbase.co/chatbot-iframe/${chatbotId}?session=${Date.now()}`;
      iframeRef.current.src = newSrc;
      
      // Update session count for tracking
      setSessionCount(prev => prev + 1);
      
      // Clear input message
      setInputMessage('');
      
      // Send reset signal to iframe (if it supports this)
      setTimeout(() => {
        iframeRef.current?.contentWindow?.postMessage({
          type: 'chatbase-reset',
          timestamp: Date.now()
        }, '*');
      }, 1000);
    }
  };

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
      {/* Floating Chat Widget - Bottom Right */}
      <div className="fixed bottom-6 right-6 z-50 max-w-sm w-80">
        
        {/* Collapsed State - Compact Widget */}
        {!isExpanded && (
          <div className="bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl shadow-lg overflow-hidden">
            {/* Header */}
            <div 
              onClick={() => setIsExpanded(true)}
              className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:opacity-90 transition-all duration-300"
            >
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <Bot className="w-4 h-4 text-white" />
              </div>
              
              <div className="text-white flex-1">
                <h3 className="font-medium text-sm">Assistente SUPERNET</h3>
                <p className="text-white/90 text-xs">Fale conosco</p>
              </div>
              
              <MessageCircle className="w-4 h-4 text-white/80" />
            </div>
            
            {/* Always Visible Input Area */}
            <div className="bg-white p-3 border-t border-white/20">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Textarea
                    ref={textareaRef}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Digite sua mensagem..."
                    className="min-h-[32px] text-sm resize-none rounded-xl border border-gray-200 focus:border-red-500 focus:ring-red-500 focus:ring-1"
                    rows={1}
                  />
                </div>
                
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim()}
                  className="rounded-full bg-gradient-to-r from-red-500 to-orange-500 hover:opacity-90 h-8 w-8"
                  size="icon"
                >
                  <Send className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Expanded State - Full Chat Interface */}
        {isExpanded && (
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden h-96 flex flex-col">
            
            {/* Header */}
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-red-500 to-orange-500 text-white">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-medium text-sm">Assistente SUPERNET</h3>
                  <p className="text-white/80 text-xs">🟢 Online</p>
                </div>
              </div>
              
              <button
                onClick={() => setIsExpanded(false)}
                className="hover:bg-white/20 p-1.5 rounded-lg transition-colors"
                title="Fechar"
              >
                <X size={14} />
              </button>
            </div>

            {/* Chat Content with Iframe */}
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
              <div className="absolute bottom-16 left-2 right-2 bg-white border border-gray-200 rounded-xl shadow-lg p-3 z-10">
                <div className="grid grid-cols-8 gap-1 max-h-24 overflow-y-auto">
                  {commonEmojis.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => addEmoji(emoji)}
                      className="text-lg hover:bg-gray-100 rounded-lg p-1 transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Area */}
            <div className="p-3 border-t bg-white">
              <div className="flex items-end gap-2">
                <Button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  variant="outline"
                  size="icon"
                  className="rounded-full hover:bg-gray-100 h-8 w-8"
                  title="Emojis"
                >
                  <Smile className="w-3 h-3" />
                </Button>
                
                <div className="flex-1">
                  <Textarea
                    ref={textareaRef}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Digite sua mensagem..."
                    className="min-h-[32px] max-h-20 text-sm resize-none rounded-xl border border-gray-200 focus:border-red-500 focus:ring-red-500 focus:ring-1"
                    rows={1}
                  />
                </div>
                
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim()}
                  className="rounded-full bg-gradient-to-r from-red-500 to-orange-500 hover:opacity-90 h-8 w-8"
                  size="icon"
                >
                  <Send className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ChatbaseWidget;