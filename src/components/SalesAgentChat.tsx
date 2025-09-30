import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Avatar } from './ui/avatar';
import { Bot, Send, User, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const SalesAgentChat = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Olá! 👋 Sou o assistente virtual da SUPERNET FIBRA. Estou aqui para ajudá-lo a encontrar o plano perfeito de internet fibra óptica. Qual é o seu CEP para verificarmos a cobertura?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    // Adiciona mensagem do usuário
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    try {
      const { data, error } = await supabase.functions.invoke('sales-agent', {
        body: {
          messages: [
            ...messages,
            { role: 'user', content: userMessage }
          ],
          userContext: {
            timestamp: new Date().toISOString()
          }
        }
      });

      if (error) throw error;

      // Adiciona resposta do assistente
      if (data.message) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: data.message 
        }]);
      }

      // Se houve tool calls bem-sucedidos, mostra confirmação
      if (data.tool_results) {
        const successResults = data.tool_results.filter((r: any) => {
          const content = JSON.parse(r.content);
          return content.success;
        });

        if (successResults.length > 0) {
          toast.success('Ação concluída com sucesso!');
        }
      }

    } catch (error: any) {
      console.error('Erro ao enviar mensagem:', error);
      toast.error('Erro ao processar sua mensagem. Tente novamente.');
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Desculpe, tive um problema ao processar sua mensagem. Pode tentar novamente?' 
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

  return (
    <Card className="flex flex-col h-[600px] max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-gradient-to-r from-primary/10 to-primary/5">
        <Avatar className="w-10 h-10 bg-primary">
          <Bot className="w-6 h-6 text-primary-foreground" />
        </Avatar>
        <div>
          <h3 className="font-semibold">Agente de Vendas Virtual</h3>
          <p className="text-sm text-muted-foreground">SUPERNET FIBRA</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <Avatar className="w-8 h-8 bg-primary flex-shrink-0">
                <Bot className="w-5 h-5 text-primary-foreground" />
              </Avatar>
            )}
            
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            </div>

            {msg.role === 'user' && (
              <Avatar className="w-8 h-8 bg-secondary flex-shrink-0">
                <User className="w-5 h-5 text-secondary-foreground" />
              </Avatar>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className="flex gap-3 justify-start">
            <Avatar className="w-8 h-8 bg-primary">
              <Bot className="w-5 h-5 text-primary-foreground" />
            </Avatar>
            <div className="bg-muted rounded-lg p-3">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite sua mensagem..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            size="icon"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
