import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Bot, ShoppingCart, Wrench, DollarSign, RefreshCw, TestTube2, Settings, Heart } from 'lucide-react';
import OmnichannelChat from './OmnichannelChat';
import AgentConfigEditor from './AgentConfigEditor';

interface AgentStats {
  totalConversations: number;
  activeConversations: number;
  resolvedToday: number;
}

interface AgentConfig {
  id: string;
  agent_type: string;
  name: string;
  description: string;
  system_prompt: string;
  model: string;
  temperature: number;
  max_tokens: number;
  capabilities: string[];
  is_active: boolean;
}

const AgentManagement = () => {
  const [stats, setStats] = useState<Record<string, AgentStats>>({
    routing: { totalConversations: 0, activeConversations: 0, resolvedToday: 0 },
    sales: { totalConversations: 0, activeConversations: 0, resolvedToday: 0 },
    support_tech: { totalConversations: 0, activeConversations: 0, resolvedToday: 0 },
    support_financial: { totalConversations: 0, activeConversations: 0, resolvedToday: 0 },
    telemedicina: { totalConversations: 0, activeConversations: 0, resolvedToday: 0 },
  });
  const [configs, setConfigs] = useState<Record<string, AgentConfig>>({});
  const [editingConfig, setEditingConfig] = useState<AgentConfig | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [showTestChat, setShowTestChat] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadAgentStats();
    loadAgentConfigs();
  }, []);

  const loadAgentConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from('agent_configurations')
        .select('*');

      if (error) throw error;

      if (data) {
        const configsMap: Record<string, AgentConfig> = {};
        data.forEach((config: any) => {
          configsMap[config.agent_type] = config;
        });
        setConfigs(configsMap);
      }
    } catch (error) {
      console.error('Error loading agent configs:', error);
    }
  };

  const loadAgentStats = async () => {
    try {
      // Get conversation counts by department
      const { data: conversations } = await supabase
        .from('conversations')
        .select('department, status');

      if (conversations) {
        const statsByDept: Record<string, AgentStats> = {
          routing: { totalConversations: conversations.length, activeConversations: 0, resolvedToday: 0 },
          sales: { totalConversations: 0, activeConversations: 0, resolvedToday: 0 },
          support_tech: { totalConversations: 0, activeConversations: 0, resolvedToday: 0 },
          support_financial: { totalConversations: 0, activeConversations: 0, resolvedToday: 0 },
        };

        conversations.forEach(conv => {
          const dept = conv.department || 'sales';
          if (statsByDept[dept]) {
            statsByDept[dept].totalConversations++;
            if (conv.status === 'active' || conv.status === 'waiting') {
              statsByDept[dept].activeConversations++;
            }
          }
        });

        setStats(statsByDept);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const syncKnowledgeBase = async () => {
    setSyncing(true);
    try {
      const { error } = await supabase.functions.invoke('sync-chatbot-knowledge');
      
      if (error) throw error;
      
      toast({
        title: 'Base de conhecimento sincronizada',
        description: 'Todos os agentes foram atualizados com as últimas informações.',
      });
    } catch (error: any) {
      console.error('Error syncing knowledge:', error);
      toast({
        title: 'Erro ao sincronizar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  const agents = [
    {
      id: 'routing',
      name: 'Agente de Roteamento',
      icon: Bot,
      color: 'bg-orange-500',
      description: 'Primeiro contato e direcionamento inteligente',
      capabilities: [
        'Identificação de intenção do cliente',
        'Roteamento automático para agente especializado',
        'Coleta de dados do cliente (nome, CPF, telefone)',
        'Verificação de cobertura por CEP',
        'Encaminhamento baseado na necessidade',
      ]
    },
    {
      id: 'sales',
      name: 'Agente de Vendas',
      icon: ShoppingCart,
      color: 'bg-green-500',
      description: 'Especialista em contratação e planos',
      capabilities: [
        'Consulta de disponibilidade por CEP',
        'Apresentação de planos disponíveis',
        'Explicação detalhada de cada plano',
        'Criação de proposta comercial',
        'Agendamento de instalação',
        'Criação de contratos no IXC',
      ]
    },
    {
      id: 'support_tech',
      name: 'Suporte Técnico',
      icon: Wrench,
      color: 'bg-blue-500',
      description: 'Resolução de problemas técnicos',
      capabilities: [
        'Diagnóstico de problemas de conexão',
        'Verificação de status do cliente no IXC',
        'Análise de velocidade e qualidade',
        'Orientações para troubleshooting',
        'Abertura de ordem de serviço',
        'Escalação para técnico presencial',
      ]
    },
    {
      id: 'support_financial',
      name: 'Suporte Financeiro',
      icon: DollarSign,
      color: 'bg-yellow-500',
      description: 'Gestão de pagamentos e inadimplência',
      capabilities: [
        'Consulta de faturas em aberto',
        'Geração de segunda via de boleto',
        'Criação de código PIX para pagamento',
        'Negociação de débitos',
        'Desbloqueio automático após pagamento',
        'Orientações sobre formas de pagamento',
      ]
    },
    {
      id: 'telemedicina',
      name: 'Agente de Telemedicina',
      icon: Heart,
      color: 'bg-pink-500',
      description: 'Assistente de telemedicina e saúde',
      capabilities: [
        'Explicação sobre telemedicina',
        'Apresentação de planos e especialidades',
        'Informações sobre consultas 24h',
        'Orientações sobre receitas digitais',
        'Esclarecimento sobre especialidades disponíveis',
        'Suporte para contratação do serviço',
      ]
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gerenciamento de Agentes IA</h1>
          <p className="text-muted-foreground">
            Sistema inteligente de roteamento e atendimento automatizado
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowTestChat(!showTestChat)}
            variant="outline"
            className="gap-2"
          >
            <TestTube2 className="w-4 h-4" />
            {showTestChat ? 'Esconder Teste' : 'Testar Chat'}
          </Button>
          <Button
            onClick={syncKnowledgeBase}
            disabled={syncing}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            Sincronizar Base de Conhecimento
          </Button>
        </div>
      </div>

      {showTestChat && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube2 className="w-5 h-5" />
              Chat de Teste - Omnichannel
            </CardTitle>
            <CardDescription>
              Teste o sistema de roteamento e os agentes especializados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OmnichannelChat />
          </CardContent>
        </Card>
      )}

      {/* Agent Stats Grid */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
        {agents.map(agent => (
          <Card key={agent.id} className="relative overflow-hidden">
            <div className={`absolute top-0 left-0 right-0 h-1 ${agent.color}`} />
            <CardHeader>
              <div className="flex items-center justify-between">
                <agent.icon className={`w-8 h-8 ${agent.color.replace('bg-', 'text-')}`} />
                <Badge variant="outline">{stats[agent.id]?.activeConversations || 0} ativos</Badge>
              </div>
              <CardTitle className="text-lg mt-2">{agent.name}</CardTitle>
              <CardDescription>{agent.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Stats */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total de conversas</span>
                    <span className="font-medium">{stats[agent.id]?.totalConversations || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Resolvidas hoje</span>
                    <span className="font-medium">{stats[agent.id]?.resolvedToday || 0}</span>
                  </div>
                </div>

                {/* Capabilities */}
                <div>
                  <h4 className="text-sm font-semibold mb-2">Capacidades:</h4>
                  <ul className="space-y-1">
                    {agent.capabilities.map((capability, index) => (
                      <li key={index} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <span className="text-primary mt-0.5">•</span>
                        <span>{capability}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Config Info */}
                {configs[agent.id] && (
                  <div className="pt-3 border-t space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Modelo:</span>
                      <span className="font-mono text-xs">{configs[agent.id].model}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Temperatura:</span>
                      <span>{configs[agent.id].temperature}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant={configs[agent.id].is_active ? 'default' : 'secondary'} className="text-xs">
                        {configs[agent.id].is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => {
                    const config = configs[agent.id];
                    if (config) {
                      setEditingConfig(config);
                    }
                  }}
                >
                  <Settings className="w-3 h-3 mr-2" />
                  Configurar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Config Editor Dialog */}
      <Dialog open={!!editingConfig} onOpenChange={(open) => !open && setEditingConfig(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {editingConfig && (
            <AgentConfigEditor
              config={editingConfig}
              onClose={() => setEditingConfig(null)}
              onSave={() => {
                setEditingConfig(null);
                loadAgentConfigs();
                toast({
                  title: 'Configuração salva',
                  description: 'As configurações do agente foram atualizadas.',
                });
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AgentManagement;
