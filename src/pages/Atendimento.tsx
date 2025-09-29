import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AuthGuard } from '@/components/AuthGuard';
import AgentPresencePanel from '@/components/atendimento/AgentPresencePanel';
import ConversationQueue from '@/components/atendimento/ConversationQueue';
import ChatArea from '@/components/atendimento/ChatArea';
import ClientInfoPanel from '@/components/atendimento/ClientInfoPanel';
import AtendimentoMetrics from '@/components/atendimento/AtendimentoMetrics';
import SimulationButton from '@/components/atendimento/SimulationButton';

export default function Atendimento() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [agentDepartment, setAgentDepartment] = useState<string>('comercial');

  useEffect(() => {
    // Set agent status to online when component mounts
    const setOnlineStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('agent_presence')
        .upsert({
          user_id: user.id,
          status: 'online' as const,
          department: agentDepartment as any,
          last_activity: new Date().toISOString()
        });

      if (error) {
        console.error('Error setting online status:', error);
        toast({
          title: 'Erro ao conectar',
          description: 'Não foi possível definir status online.',
          variant: 'destructive'
        });
      }
    };

    setOnlineStatus();

    // Update last activity every 30 seconds
    const activityInterval = setInterval(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('agent_presence')
        .update({ last_activity: new Date().toISOString() })
        .eq('user_id', user.id);
    }, 30000);

    // Set offline when component unmounts
    return () => {
      clearInterval(activityInterval);
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          supabase
            .from('agent_presence')
            .update({ status: 'offline' })
            .eq('user_id', user.id);
        }
      });
    };
  }, [agentDepartment, toast]);

  return (
    <AuthGuard requiredRoles={['admin', 'editor']}>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-16 items-center justify-between px-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/admin')}
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                ← Voltar ao Admin
              </button>
              <div className="h-6 w-px bg-border" />
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Central de Atendimento
              </h1>
            </div>
            
            <div className="flex items-center gap-4">
              <SimulationButton />
              <AtendimentoMetrics />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="container mx-auto p-4 h-[calc(100vh-4rem)]">
          <div className="grid grid-cols-12 gap-4 h-full">
            {/* Left Sidebar - Agent Presence */}
            <div className="col-span-2">
              <AgentPresencePanel 
                currentDepartment={agentDepartment}
                onDepartmentChange={setAgentDepartment}
              />
            </div>

            {/* Conversation Queue */}
            <div className="col-span-3">
              <ConversationQueue
                selectedConversation={selectedConversation}
                onSelectConversation={setSelectedConversation}
                agentDepartment={agentDepartment}
              />
            </div>

            {/* Chat Area */}
            <div className="col-span-5">
              <ChatArea conversationId={selectedConversation} />
            </div>

            {/* Right Sidebar - Client Info */}
            <div className="col-span-2">
              <ClientInfoPanel conversationId={selectedConversation} />
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
