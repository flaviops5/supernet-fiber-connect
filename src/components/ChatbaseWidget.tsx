import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Smile, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';

interface ChatbaseWidgetProps {
  chatbotId?: string;
}

interface ChatbotSettings {
  id: string;
  chatbot_id: string;
  enabled: boolean;
  title: string;
  subtitle: string;
  cta_text: string;
  position: string;
  primary_color: string;
  secondary_color: string;
  session_timeout_minutes: number;
  auto_open: boolean;
  auto_open_delay_seconds: number;
  show_on_pages: any;
  created_at?: string;
  updated_at?: string;
}

const ChatbaseWidget = ({ chatbotId }: ChatbaseWidgetProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [sessionCount, setSessionCount] = useState(1);
  const [settings, setSettings] = useState<ChatbotSettings | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const closeTimestampRef = useRef<number | null>(null);
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load settings from database
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('chatbot_settings')
          .select('*')
          .eq('enabled', true)
          .maybeSingle();

        if (error) {
          console.error('Erro ao carregar configurações do chatbot:', error);
          return;
        }

        setSettings(data);
      } catch (error) {
        console.error('Erro ao carregar configurações do chatbot:', error);
      }
    };

    loadSettings();
  }, []);

  // Auto-open functionality
  useEffect(() => {
    if (settings?.auto_open && !isExpanded && settings.auto_open_delay_seconds > 0) {
      const timer = setTimeout(() => {
        setIsExpanded(true);
      }, settings.auto_open_delay_seconds * 1000);

      return () => clearTimeout(timer);
    }
  }, [settings, isExpanded]);

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
        const timeoutMs = (settings?.session_timeout_minutes || 30) * 60 * 1000;
        
        if (timeSinceClose >= timeoutMs) {
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
      
      // Set timer to reset session after configured timeout
      const timeoutMs = (settings?.session_timeout_minutes || 30) * 60 * 1000;
      resetTimerRef.current = setTimeout(() => {
        resetChatSession();
      }, timeoutMs);
    }

    // Cleanup on unmount
    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
    };
  }, [isExpanded]);

  const resetChatSession = () => {
    if (iframeRef.current && settings) {
      // Reset the iframe by updating its src to clear the conversation
      const effectiveChatbotId = chatbotId || settings.chatbot_id;
      const newSrc = `https://www.chatbase.co/chatbot-iframe/${effectiveChatbotId}?session=${Date.now()}`;
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

  // Don't render if settings not loaded or chatbot is disabled
  if (!settings || !settings.enabled) {
    return null;
  }

  const getPositionClasses = () => {
    switch (settings.position) {
      case 'bottom-right':
        return 'fixed bottom-6 right-6 z-50 w-full max-w-sm';
      case 'bottom-left':
        return 'fixed bottom-6 left-6 z-50 w-full max-w-sm';
      default:
        return 'fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-2xl px-4';
    }
  };

  const gradientStyle = {
    background: `linear-gradient(to right, ${settings.primary_color}, ${settings.secondary_color})`
  };

  return (
    <>
      {/* Dynamic Chat Widget */}
      <div className={getPositionClasses()}>
        
        {/* Collapsed State */}
        {!isExpanded && (
          <div className="rounded-2xl shadow-lg overflow-hidden" style={gradientStyle}>
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
                  <h3 className="font-medium text-base">{settings.title}</h3>
                  <p className="text-white/90 text-sm">{settings.subtitle}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-white/80 text-sm font-medium">
                <MessageCircle className="w-4 h-4" />
                {settings.cta_text}
              </div>
            </div>
          </div>
        )}

        {/* Expanded State - Full Chat Interface */}
        {isExpanded && (
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden h-[60vh] flex flex-col">
            
            {/* Header */}
            <div className="flex items-center justify-between p-4 text-white" style={gradientStyle}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-medium text-base">{settings.title}</h3>
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
                src={`https://www.chatbase.co/chatbot-iframe/${chatbotId || settings.chatbot_id}`}
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