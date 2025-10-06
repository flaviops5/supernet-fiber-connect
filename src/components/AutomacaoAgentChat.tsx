import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Bot, Send, MessageCircle, Loader2, X, Home } from 'lucide-react';
import { toast } from 'sonner';
import automacaoHero from '@/assets/automacao-hero.jpg';
import { MediaUpload } from './MediaUpload';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const AutomacaoAgentChat = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '🏠 Olá! Sou o assistente especializado em Automação Residencial da SUPERNET FIBRA. Posso ajudá-lo a transformar sua casa em um lar inteligente! Como posso ajudar: consultar planos, entender soluções de automação ou esclarecer dúvidas?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if ((!input.trim() && !attachedImage) || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    const messageContent: any = attachedImage 
      ? [
          { type: 'text', text: userMessage || 'Veja a imagem anexada' },
          { type: 'image_url', image_url: { url: attachedImage } }
        ]
      : userMessage;

    setMessages(prev => [...prev, { 
      role: 'user', 
      content: attachedImage ? `${userMessage} [Imagem anexada]` : userMessage
    }]);
    
    setAttachedImage(null);

    try {
      const { data, error } = await supabase.functions.invoke('automacao-agent', {
        body: {
          messages: [
            ...messages.map(m => ({ 
              role: m.role, 
              content: m.content 
            })),
            { role: 'user', content: messageContent }
          ],
          userContext: {
            timestamp: new Date().toISOString(),
            page: 'automacao-residencial'
          }
        }
      });

      if (error) throw error;

      if (data.message) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: data.message 
        }]);
      }

    } catch (error: any) {
      console.error('Erro ao enviar mensagem:', error);
      toast.error('Erro ao processar sua mensagem. Tente novamente.');
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro. Por favor, tente novamente ou entre em contato pelo WhatsApp: (61) 99947-5886'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (isMinimized) {
    return (
      <Button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-4 right-4 rounded-full w-16 h-16 shadow-elegant z-50 bg-primary hover:bg-primary/90"
        aria-label="Abrir chat"
      >
        <Home className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <section id="chat-automacao" className="py-16 px-4 bg-gradient-to-br from-muted/30 to-primary/5">
      <div className="container mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Coluna da Imagem */}
          <div className="relative order-2 lg:order-1">
            <div className="relative bg-card rounded-2xl overflow-hidden shadow-elegant">
              <img 
                src={automacaoHero} 
                alt="Automação Residencial Inteligente" 
                className="w-full h-[500px] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-dark-gray/80 to-transparent" />
              <div className="absolute bottom-8 left-8 right-8 text-white">
                <h3 className="text-2xl font-bold font-varela uppercase mb-2">
                  🏠 Sua Casa Inteligente
                </h3>
                <p className="text-white/90 text-lg">
                  Controle total através do seu smartphone
                </p>
              </div>
            </div>
          </div>

          {/* Coluna do Chat */}
          <div className="order-1 lg:order-2">
            <div className="bg-card rounded-2xl shadow-elegant overflow-hidden border">
              {/* Header do Chat */}
              <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-primary-foreground/10 p-2 rounded-lg">
                    <Home className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg font-varela uppercase">Assistente de Automação</h3>
                    <p className="text-xs text-primary-foreground/80">Especialista em Casa Inteligente</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMinimized(true)}
                  className="hover:bg-primary-foreground/10"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Área de Mensagens */}
              <div className="h-96 overflow-y-auto p-4 space-y-4 bg-muted/20">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-card border shadow-sm'
                      }`}
                    >
                      {message.role === 'assistant' && (
                        <div className="flex items-center space-x-2 mb-2">
                          <Home className="h-4 w-4 text-primary" />
                          <span className="text-xs font-semibold text-primary uppercase">Automação AI</span>
                        </div>
                      )}
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">
                        {message.content}
                      </p>
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-card border shadow-sm rounded-2xl px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">Processando...</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Área de Input */}
              <div className="border-t p-4 bg-card">
                {attachedImage && (
                  <div className="mb-2 relative inline-block">
                    <img 
                      src={attachedImage} 
                      alt="Anexo" 
                      className="h-20 w-20 object-cover rounded-lg border"
                    />
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                      onClick={() => setAttachedImage(null)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                
                <div className="flex space-x-2">
                  <MediaUpload
                    onImageSelected={setAttachedImage}
                    onAudioTranscribed={(text) => setInput(prev => prev + ' ' + text)}
                    disabled={isLoading}
                  />
                  
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Digite sua dúvida sobre automação residencial..."
                    disabled={isLoading}
                    className="flex-1"
                  />
                  
                  <Button
                    onClick={sendMessage}
                    disabled={(!input.trim() && !attachedImage) || isLoading}
                    className="bg-primary hover:bg-primary/90"
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </Button>
                </div>
                
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  💡 Dica: Pergunte sobre iluminação inteligente, segurança, climatização e mais!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
