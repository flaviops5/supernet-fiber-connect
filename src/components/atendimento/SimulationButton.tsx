import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, FlaskConical } from 'lucide-react';

export default function SimulationButton() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const createSimulation = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // 1. Check if agent presence exists, if not create it
      const { data: existingPresence } = await supabase
        .from('agent_presence')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!existingPresence) {
        const { error: presenceError } = await supabase
          .from('agent_presence')
          .insert({
            user_id: user.id,
            status: 'online',
            department: 'comercial',
            current_conversations: 0,
            max_conversations: 5,
            last_activity: new Date().toISOString()
          });

        if (presenceError) throw presenceError;
      }

      // 2. Create sample conversations
      const conversations = [
        {
          customer_name: 'João Silva',
          customer_phone: '(11) 98765-4321',
          customer_email: 'joao.silva@email.com',
          customer_cpf: '123.456.789-00',
          channel: 'whatsapp' as const,
          status: 'waiting' as const,
          department: 'comercial' as const,
          priority: 1,
          metadata: { source: 'website' },
          tags: ['novo_cliente', 'plano_500mb']
        },
        {
          customer_name: 'Maria Santos',
          customer_phone: '(11) 97654-3210',
          customer_email: 'maria.santos@email.com',
          channel: 'facebook' as const,
          status: 'waiting' as const,
          department: 'tecnico' as const,
          priority: 2,
          metadata: { source: 'facebook' },
          tags: ['suporte_tecnico', 'sem_internet']
        },
        {
          customer_name: 'Pedro Oliveira',
          customer_phone: '(11) 96543-2109',
          customer_email: 'pedro.oliveira@email.com',
          channel: 'chatbot' as const,
          status: 'waiting' as const,
          department: 'financeiro' as const,
          priority: 0,
          metadata: { source: 'chatbot' },
          tags: ['segunda_via', 'boleto']
        },
        {
          customer_name: 'Ana Costa',
          customer_phone: '(11) 95432-1098',
          customer_email: 'ana.costa@email.com',
          channel: 'instagram' as const,
          status: 'active' as const,
          department: 'comercial' as const,
          assigned_agent_id: user.id,
          priority: 0,
          metadata: { source: 'instagram' },
          tags: ['upgrade_plano']
        },
        {
          customer_name: 'Carlos Ferreira',
          customer_phone: '(11) 94321-0987',
          customer_email: 'carlos.ferreira@email.com',
          channel: 'whatsapp' as const,
          status: 'waiting' as const,
          department: 'tecnico' as const,
          priority: 3,
          metadata: { source: 'whatsapp' },
          tags: ['urgente', 'sem_conexao']
        }
      ];

      const { data: createdConversations, error: convError } = await supabase
        .from('conversations')
        .insert(conversations)
        .select();

      if (convError) throw convError;

      // 3. Create sample messages for each conversation
      if (createdConversations) {
        const messages = [];
        
        // João Silva - Comercial
        messages.push({
          conversation_id: createdConversations[0].id,
          sender_type: 'customer',
          sender_name: 'João Silva',
          content: 'Olá! Gostaria de contratar um plano de internet. Vocês atendem na Rua das Flores, 123?',
          created_at: new Date(Date.now() - 5 * 60000).toISOString()
        });

        messages.push({
          conversation_id: createdConversations[0].id,
          sender_type: 'ai',
          sender_name: 'Assistente IA',
          content: 'Olá João! Vou verificar a disponibilidade no seu endereço. Por favor, aguarde um momento.',
          ai_suggestion: true,
          created_at: new Date(Date.now() - 4 * 60000).toISOString()
        });

        // Maria Santos - Técnico
        messages.push({
          conversation_id: createdConversations[1].id,
          sender_type: 'customer',
          sender_name: 'Maria Santos',
          content: 'Boa tarde, minha internet caiu e não consigo mais conectar. A luz do roteador está piscando vermelha.',
          created_at: new Date(Date.now() - 10 * 60000).toISOString()
        });

        messages.push({
          conversation_id: createdConversations[1].id,
          sender_type: 'ai',
          sender_name: 'Assistente IA',
          content: 'Boa tarde Maria! Vou direcionar você para o suporte técnico. Eles vão te ajudar imediatamente.',
          ai_suggestion: true,
          created_at: new Date(Date.now() - 9 * 60000).toISOString()
        });

        // Pedro Oliveira - Financeiro
        messages.push({
          conversation_id: createdConversations[2].id,
          sender_type: 'customer',
          sender_name: 'Pedro Oliveira',
          content: 'Preciso da segunda via do boleto deste mês. Pode me enviar?',
          created_at: new Date(Date.now() - 15 * 60000).toISOString()
        });

        // Ana Costa - Em atendimento
        messages.push({
          conversation_id: createdConversations[3].id,
          sender_type: 'customer',
          sender_name: 'Ana Costa',
          content: 'Olá! Estou interessada em fazer upgrade do meu plano atual.',
          created_at: new Date(Date.now() - 20 * 60000).toISOString()
        });

        messages.push({
          conversation_id: createdConversations[3].id,
          sender_type: 'agent',
          sender_name: 'Você',
          sender_id: user.id,
          content: 'Olá Ana! Ficamos felizes com seu interesse. Qual plano você tem atualmente?',
          created_at: new Date(Date.now() - 18 * 60000).toISOString()
        });

        messages.push({
          conversation_id: createdConversations[3].id,
          sender_type: 'customer',
          sender_name: 'Ana Costa',
          content: 'Tenho o plano de 200MB. Queria passar para 500MB ou 1GB.',
          created_at: new Date(Date.now() - 15 * 60000).toISOString()
        });

        // Carlos Ferreira - Urgente
        messages.push({
          conversation_id: createdConversations[4].id,
          sender_type: 'customer',
          sender_name: 'Carlos Ferreira',
          content: 'URGENTE! Estou trabalhando de casa e a internet caiu completamente. Preciso de ajuda AGORA!',
          created_at: new Date(Date.now() - 2 * 60000).toISOString()
        });

        const { error: msgError } = await supabase
          .from('conversation_messages')
          .insert(messages);

        if (msgError) throw msgError;
      }

      toast({
        title: 'Simulação criada!',
        description: 'Dados de teste foram adicionados com sucesso.',
      });
    } catch (error) {
      console.error('Error creating simulation:', error);
      toast({
        title: 'Erro ao criar simulação',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const clearSimulation = async () => {
    setLoading(true);
    try {
      // Delete all conversations (messages will be deleted via CASCADE)
      const { error } = await supabase
        .from('conversations')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (error) throw error;

      toast({
        title: 'Simulação limpa!',
        description: 'Todos os dados de teste foram removidos.',
      });
    } catch (error) {
      console.error('Error clearing simulation:', error);
      toast({
        title: 'Erro ao limpar simulação',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={createSimulation}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <FlaskConical className="h-4 w-4 mr-2" />
        )}
        Criar Simulação
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={clearSimulation}
        disabled={loading}
      >
        Limpar
      </Button>
    </div>
  );
}
