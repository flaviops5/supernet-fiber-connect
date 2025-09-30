import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Bot, ShoppingCart, Wrench, DollarSign, Activity, RefreshCw, TestTube2, Settings } from 'lucide-react';
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
      console.error('Error loading agent stats:', error);
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
      description: 'Analisa mensagens e direciona para o agente especializado correto',
      capabilities: [
        'Análise de intenção com IA',
        'Classificação automática de solicitações',
        'Roteamento inteligente para departamentos',
        'Detecção de contexto da conversa',
        'Solicita esclarecimento quando necessário'
      ]
    },
    {
      id: 'sales',
      name: 'Agente de Vendas',
      icon: ShoppingCart,
      color: 'bg-green-500',
      description: 'Responsável por consultas de planos, vendas e contratações',
      capabilities: [
        'Consultar planos disponíveis',
        'Verificar cobertura por CEP',
        'Agendar instalações',
        'Criar contratos automaticamente',
        'Integração com IXC'
      ]
    },
    {
      id: 'support_tech',
      name: 'Suporte Técnico N1',
      icon: Wrench,
      color: 'bg-blue-500',
      description: 'Atendimento técnico inicial e diagnóstico de problemas',
      capabilities: [
        'Diagnóstico básico de conexão',
        'Reset de senhas e configurações',
        'Orientação sobre roteador',
        'Resolução de problemas simples',
        'Escalonamento para N2/N3 quando necessário'
      ]
    },
    {
      id: 'support_financial',
      name: 'Suporte Financeiro N1',
      icon: DollarSign,
      color: 'bg-purple-500',
      description: 'Atendimento financeiro, cobranças e pagamentos',
      capabilities: [
        'Reenvio de boletos e faturas',
        'Consultar status de pagamento',
        'Informações de contrato',
        'Comprovantes de pagamento',
        'Atualização de dados cadastrais'
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

      {/* Agent Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        {agents.map(agent => {
          const AgentIcon = agent.icon;
          const agentStats = stats[agent.id];
          
          return (
            <Card key={agent.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{agent.name}</CardTitle>
                <div className={`p-2 rounded-full ${agent.color}`}>
                  <AgentIcon className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total:</span>
                    <span className="font-bold">{agentStats.totalConversations}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Ativas:</span>
                    <span className="font-bold text-green-600">{agentStats.activeConversations}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Resolvidas Hoje:</span>
                    <span className="font-bold text-blue-600">{agentStats.resolvedToday}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Agent Details */}
      <Tabs defaultValue="routing" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="routing">Roteamento</TabsTrigger>
          <TabsTrigger value="sales">Vendas</TabsTrigger>
          <TabsTrigger value="support_tech">Suporte Técnico</TabsTrigger>
          <TabsTrigger value="support_financial">Suporte Financeiro</TabsTrigger>
        </TabsList>

        {agents.map(agent => (
          <TabsContent key={agent.id} value={agent.id} className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${agent.color}`}>
                    {React.createElement(agent.icon, { className: 'w-6 h-6 text-white' })}
                  </div>
                  <div className="flex-1">
                    <CardTitle>{agent.name}</CardTitle>
                    <CardDescription className="mt-2">
                      {agent.description}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="gap-1">
                    <Activity className="w-3 h-3" />
                    Ativo
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-3">Capacidades</h3>
                  <ul className="space-y-2">
                    {agent.capabilities.map((capability, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <span className="text-green-500 mt-0.5">✓</span>
                        <span>{capability}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Configuração</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingConfig(configs[agent.id])}
                      className="gap-2"
                    >
                      <Settings className="w-4 h-4" />
                      Editar
                    </Button>
                  </div>
                  {configs[agent.id] ? (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between p-2 bg-muted rounded">
                        <span className="text-muted-foreground">Modelo IA:</span>
                        <span className="font-medium">{configs[agent.id].model}</span>
                      </div>
                      <div className="flex justify-between p-2 bg-muted rounded">
                        <span className="text-muted-foreground">Temperature:</span>
                        <span className="font-medium">{configs[agent.id].temperature}</span>
                      </div>
                      <div className="flex justify-between p-2 bg-muted rounded">
                        <span className="text-muted-foreground">Max Tokens:</span>
                        <span className="font-medium">{configs[agent.id].max_tokens}</span>
                      </div>
                      <div className="flex justify-between p-2 bg-muted rounded">
                        <span className="text-muted-foreground">Status:</span>
                        <Badge variant={configs[agent.id].is_active ? "default" : "secondary"}>
                          {configs[agent.id].is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Carregando configuração...</p>
                  )}
                </div>

                {agent.id === 'routing' && (
                  <div className="p-4 bg-orange-50 dark:bg-orange-950 rounded-lg">
                    <h4 className="font-semibold text-orange-900 dark:text-orange-100 mb-2">
                      Inteligência Artificial
                    </h4>
                    <p className="text-sm text-orange-700 dark:text-orange-300">
                      Este agente utiliza IA avançada para analisar mensagens e direcionar automaticamente para:
                    </p>
                    <ul className="text-sm text-orange-700 dark:text-orange-300 mt-2 space-y-1">
                      <li>• Vendas - Planos, contratos e instalações</li>
                      <li>• Suporte Técnico - Problemas de conexão</li>
                      <li>• Suporte Financeiro - Faturas e pagamentos</li>
                    </ul>
                  </div>
                )}

                {agent.id === 'sales' && (
                  <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                    <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                      Integração IXC
                    </h4>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Este agente está integrado com o sistema IXC e pode criar automaticamente:
                    </p>
                    <ul className="text-sm text-green-700 dark:text-green-300 mt-2 space-y-1">
                      <li>• Clientes no IXC</li>
                      <li>• Contratos de serviço</li>
                      <li>• Atendimentos com OS automática</li>
                    </ul>
                  </div>
                )}

                {agent.id === 'support_tech' && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                      Protocolo de Atendimento
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Segue checklist padrão de diagnóstico e escalona automaticamente para N2/N3 quando necessário.
                    </p>
                  </div>
                )}

                {agent.id === 'support_financial' && (
                  <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
                    <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
                      Segurança Financeira
                    </h4>
                    <p className="text-sm text-purple-700 dark:text-purple-300">
                      NUNCA solicita senhas ou dados bancários. Confirma identidade antes de fornecer informações sensíveis.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>


      {/* Config Editor Dialog */}
      <Dialog open={!!editingConfig} onOpenChange={() => setEditingConfig(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {editingConfig && (
            <AgentConfigEditor
              config={editingConfig}
              onClose={() => setEditingConfig(null)}
              onSave={loadAgentConfigs}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AgentManagement;
