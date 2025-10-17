import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Bot, 
  Settings, 
  MessageSquare, 
  CheckCircle2,
  Users,
  DollarSign,
  ShoppingCart,
  Stethoscope,
  Home,
  Truck,
  ExternalLink
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import AgentConfigEditor from './AgentConfigEditor';
import { useNavigate } from 'react-router-dom';

interface AgentStats {
  totalConversations: number;
  activeConversations: number;
  resolvedToday: number;
}

interface AgentConfig {
  id: string;
  agent_type: string;
  name: string;
  description?: string;
  system_prompt: string;
  model: string;
  temperature: number;
  max_tokens: number;
  capabilities: any;
  is_active: boolean;
}

export function AgentManagement() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Record<string, AgentStats>>({});
  const [configs, setConfigs] = useState<AgentConfig[]>([]);
  const [editingConfig, setEditingConfig] = useState<AgentConfig | null>(null);

  useEffect(() => {
    loadAgentConfigs();
    loadAgentStats();
  }, []);

  const loadAgentConfigs = async () => {
    const { data, error } = await supabase
      .from('agent_configurations')
      .select('*')
      .order('agent_type');
    
    if (error) {
      toast({
        title: 'Erro ao carregar configurações',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    setConfigs(data || []);
  };

  const loadAgentStats = async () => {
    const { data, error } = await supabase
      .from('conversations')
      .select('department, status, created_at');

    if (error) {
      console.error('Error loading stats:', error);
      return;
    }

    const statsByDept: Record<string, AgentStats> = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    data?.forEach(conv => {
      const dept = conv.department || 'routing';
      if (!statsByDept[dept]) {
        statsByDept[dept] = {
          totalConversations: 0,
          activeConversations: 0,
          resolvedToday: 0,
        };
      }

      statsByDept[dept].totalConversations++;
      
      if (conv.status === 'active' || conv.status === 'waiting') {
        statsByDept[dept].activeConversations++;
      }

      if (conv.status === 'resolved' && new Date(conv.created_at) >= today) {
        statsByDept[dept].resolvedToday++;
      }
    });

    setStats(statsByDept);
  };

  const agents = [
    {
      id: 'routing-agent',
      name: 'Cloé',
      icon: Users,
      color: 'text-purple-500',
      description: 'Agente de roteamento inteligente que direciona clientes para os departamentos corretos',
      capabilities: [
        'Validação de CPF',
        'Consulta IXC',
        'Verificação de quedas em massa',
        'Direcionamento inteligente'
      ]
    },
    {
      id: 'support-tech-agent',
      name: 'Luan',
      icon: Bot,
      color: 'text-blue-500',
      description: 'Especialista em suporte técnico e diagnósticos de conectividade',
      capabilities: [
        'Diagnóstico de sinal ONU',
        'Reinicialização de equipamentos',
        'Análise de status de conexão',
        'Abertura de tickets IXC'
      ]
    },
    {
      id: 'support-financial-agent',
      name: 'Financeiro',
      icon: DollarSign,
      color: 'text-green-500',
      description: 'Assistente financeiro para consultas de faturas e negociações',
      capabilities: [
        'Consulta de faturas',
        'Envio de boletos/PIX',
        'Negociação de débitos',
        'Histórico de pagamentos'
      ]
    },
    {
      id: 'sales-agent',
      name: 'Vendas',
      icon: ShoppingCart,
      color: 'text-orange-500',
      description: 'Agente de vendas para novos clientes e upgrades de planos',
      capabilities: [
        'Consulta de planos',
        'Verificação de cobertura',
        'Agendamento de instalação',
        'Upgrade de planos'
      ]
    },
    {
      id: 'telemedicina-agent',
      name: 'Telemedicina',
      icon: Stethoscope,
      color: 'text-red-500',
      description: 'Assistente para serviços de telemedicina',
      capabilities: [
        'Consulta de planos',
        'Informações sobre serviços',
        'Agendamento',
        'Suporte aos usuários'
      ]
    },
    {
      id: 'automacao-agent',
      name: 'Automação',
      icon: Home,
      color: 'text-cyan-500',
      description: 'Especialista em automação residencial',
      capabilities: [
        'Informações sobre dispositivos',
        'Suporte técnico',
        'Integração de sistemas',
        'Vendas de produtos'
      ]
    },
    {
      id: 'logistics-agent',
      name: 'Logística',
      icon: Truck,
      color: 'text-amber-500',
      description: 'Gerenciamento de instalações e logística',
      capabilities: [
        'Agendamento de instalações',
        'Rastreamento de técnicos',
        'Gestão de materiais',
        'Otimização de rotas'
      ]
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Agentes de IA</h2>
          <p className="text-muted-foreground">
            Configure e monitore os agentes especializados do sistema
          </p>
        </div>
        <Button 
          variant="outline"
          onClick={() => navigate('/admin/fluxo-agentes')}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Gerenciar Fluxos
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => {
          const Icon = agent.icon;
          const agentStats = stats[agent.id] || { totalConversations: 0, activeConversations: 0, resolvedToday: 0 };
          const config = configs.find(c => c.agent_type === agent.id);

          return (
            <Card key={agent.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-muted ${agent.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{agent.name}</h3>
                    <Badge variant={config?.is_active ? 'default' : 'secondary'}>
                      {config?.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => config && setEditingConfig(config)}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>

              <p className="text-sm text-muted-foreground mb-4">
                {agent.description}
              </p>

              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="text-center p-2 bg-muted rounded">
                  <MessageSquare className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <div className="text-lg font-semibold">{agentStats.totalConversations}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
                <div className="text-center p-2 bg-muted rounded">
                  <Users className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <div className="text-lg font-semibold">{agentStats.activeConversations}</div>
                  <div className="text-xs text-muted-foreground">Ativos</div>
                </div>
                <div className="text-center p-2 bg-muted rounded">
                  <CheckCircle2 className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <div className="text-lg font-semibold">{agentStats.resolvedToday}</div>
                  <div className="text-xs text-muted-foreground">Hoje</div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                  Capacidades
                </h4>
                <div className="flex flex-wrap gap-1">
                  {agent.capabilities.map((capability) => (
                    <Badge key={capability} variant="outline" className="text-xs">
                      {capability}
                    </Badge>
                  ))}
                </div>
              </div>

              {config && (
                <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
                  <div>Modelo: <span className="font-mono">{config.model}</span></div>
                  <div>Temperatura: {config.temperature}</div>
                  <div>Max Tokens: {config.max_tokens}</div>
                </div>
              )}

              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => navigate(`/fluxo-agente?agent=${agent.id}`)}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ver Fluxo
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!editingConfig} onOpenChange={(open) => !open && setEditingConfig(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configurar Agente: {editingConfig?.name}</DialogTitle>
          </DialogHeader>
          {editingConfig && (
            <AgentConfigEditor
              config={{...editingConfig, description: editingConfig.description || ''}}
              onClose={() => setEditingConfig(null)}
              onSave={() => {
                loadAgentConfigs();
                setEditingConfig(null);
                toast({
                  title: 'Configuração salva',
                  description: 'As alterações foram aplicadas com sucesso',
                });
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AgentManagement;
