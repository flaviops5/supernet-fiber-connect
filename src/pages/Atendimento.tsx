import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AuthGuard } from '@/components/AuthGuard';
import ConversationQueue from '@/components/atendimento/ConversationQueue';
import ChatArea from '@/components/atendimento/ChatArea';
import ClientInfoPanel from '@/components/atendimento/ClientInfoPanel';
import AgentInfoPanel from '@/components/atendimento/AgentInfoPanel';
import AtendimentoMetrics from '@/components/atendimento/AtendimentoMetrics';
import SimulationButton from '@/components/atendimento/SimulationButton';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function Atendimento() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [agentDepartment, setAgentDepartment] = useState<string>('comercial');
  const [agentName, setAgentName] = useState<string>('');

  useEffect(() => {
    loadAgentInfo();
  }, []);

  const loadAgentInfo = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('user_id', user.id)
      .single();

    if (profile) {
      setAgentName(profile.name);
    }
  };

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
          last_activity: new Date().toISOString(),
          current_conversations: 0,
          max_conversations: 5
        }, {
          onConflict: 'user_id'
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
                Atendimento
              </h1>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Meu Setor:</span>
                <Select value={agentDepartment} onValueChange={setAgentDepartment}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="comercial">Comercial</SelectItem>
                    <SelectItem value="tecnico">Técnico</SelectItem>
                    <SelectItem value="financeiro">Financeiro</SelectItem>
                    <SelectItem value="administrativo">Administrativo</SelectItem>
                    <SelectItem value="logistica">Logística</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <AtendimentoMetrics />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="container mx-auto p-4 h-[calc(100vh-4rem)]">
          <div className="space-y-4 h-full flex flex-col">
            {/* Top Row - Simulation Buttons */}
            <div className="flex gap-2 justify-end">
              <SimulationButton />
            </div>

            {/* Main Grid - 3 Column Layout */}
            <div className="grid grid-cols-12 gap-4 flex-1 min-h-0">
              {/* Left Column - Conversation Queue */}
              <div className="col-span-12 lg:col-span-3 flex flex-col min-h-0">
                <ConversationQueue
                  selectedConversation={selectedConversation}
                  onSelectConversation={setSelectedConversation}
                  agentDepartment={agentDepartment}
                />
              </div>

              {/* Center Column - Chat Area */}
              <div className="col-span-12 lg:col-span-6 flex flex-col min-h-0">
                <ChatArea 
                  conversationId={selectedConversation} 
                  agentDepartment={agentDepartment}
                />
              </div>

              {/* Right Column - Agent + Client Info */}
              <div className="col-span-12 lg:col-span-3 flex flex-col gap-0.5 min-h-0 h-full">
                {/* Agent Info Card - fixed height */}
                <div className="h-[30%] flex-shrink-0">
                  <AgentInfoPanel />
                </div>
                
                {/* Client Info Card - fill remaining space */}
                <div className="h-[70%] flex-shrink-0 overflow-hidden">
                  <ClientInfoPanel conversationId={selectedConversation} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
