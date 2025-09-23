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
      {/* Horizontal Chat Widget - Bottom Center */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-2xl px-4">
        
        {/* Collapsed State - Horizontal Bar */}
        {!isExpanded && (
          <div className="bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl shadow-lg overflow-hidden">
            {/* Header */}
            <div 
              onClick={() => setIsExpanded(true)}
              className="flex items-center justify-between px-6 py-4 cursor-pointer hover:opacity-90 transition-all duration-300"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                
                <div className="text-white">
                  <h3 className="font-medium text-base">Assistente Virtual SUPERNET</h3>
                  <p className="text-white/90 text-sm">Contrate agora sua internet - resposta em segundos</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-white/80 text-sm font-medium">
                <MessageCircle className="w-4 h-4" />
                Fale conosco
              </div>
            </div>
          </div>
        )}

        {/* Expanded State - Full Chat Interface */}
        {isExpanded && (
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden h-[60vh] flex flex-col">
            
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-red-500 to-orange-500 text-white">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-medium text-base">Assistente Virtual SUPERNET</h3>
                  <p className="text-white/80 text-sm">🟢 Online - Resposta em segundos</p>
                </div>
              </div>
              
              <button
                onClick={() => setIsExpanded(false)}
                className="hover:bg-white/20 p-2 rounded-lg transition-colors"
                title="Fechar"
              >
                <X size={16} />
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
          </div>
        )}
      </div>
    </>
  );
};

export default ChatbaseWidget;