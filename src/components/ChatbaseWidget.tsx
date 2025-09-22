import { useEffect } from 'react';

interface ChatbaseWidgetProps {
  chatbotId?: string;
}

const ChatbaseWidget = ({ chatbotId }: ChatbaseWidgetProps) => {
  useEffect(() => {
    if (!chatbotId) return;

    // Create script element for Chatbase
    const script = document.createElement('script');
    script.src = 'https://www.chatbase.co/embed.min.js';
    script.defer = true;
    script.setAttribute('chatbotId', chatbotId);
    
    // Add script to document
    document.head.appendChild(script);

    // Cleanup function
    return () => {
      // Remove script when component unmounts
      const existingScript = document.querySelector(`script[src="https://www.chatbase.co/embed.min.js"]`);
      if (existingScript) {
        document.head.removeChild(existingScript);
      }
      
      // Remove chatbase elements
      const chatbaseElements = document.querySelectorAll('[id^="chatbase"]');
      chatbaseElements.forEach(element => element.remove());
    };
  }, [chatbotId]);

  if (!chatbotId) {
    return (
      <div className="fixed bottom-4 right-4 p-4 bg-white border border-gray-300 rounded-lg shadow-lg max-w-sm">
        <h3 className="font-semibold text-sm mb-2">Configure o Chatbase</h3>
        <p className="text-xs text-gray-600 mb-2">
          Para ativar o chat AI, adicione seu Chatbot ID do Chatbase no componente ChatbaseWidget.
        </p>
        <p className="text-xs text-gray-500">
          Visite: chatbase.co para criar seu chatbot
        </p>
      </div>
    );
  }

  return null; // The script will handle rendering the widget
};

export default ChatbaseWidget;