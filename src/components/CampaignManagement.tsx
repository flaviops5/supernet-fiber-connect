import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Send, Pause, Play, BarChart, Users, Calendar } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CampaignForm } from './CampaignForm';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Campaign {
  id: string;
  name: string;
  description: string;
  type: string;
  status: string;
  channels: string[];
  scheduled_at: string | null;
  created_at: string;
  stats?: {
    total_recipients: number;
    total_sent: number;
    delivery_rate: number;
    reply_rate: number;
  };
}

export function CampaignManagement() {
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('campaigns')
        .select(`
          *,
          stats:campaign_stats(
            total_recipients,
            total_sent,
            delivery_rate,
            reply_rate
          )
        `)
        .order('created_at', { ascending: false });

      if (campaignsError) throw campaignsError;

      setCampaigns(campaignsData || []);
    } catch (error) {
      console.error('Erro ao buscar campanhas:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as campanhas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: 'Rascunho', variant: 'secondary' as const },
      scheduled: { label: 'Agendada', variant: 'outline' as const },
      running: { label: 'Em Andamento', variant: 'default' as const },
      completed: { label: 'Concluída', variant: 'secondary' as const },
      paused: { label: 'Pausada', variant: 'destructive' as const },
      cancelled: { label: 'Cancelada', variant: 'destructive' as const },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const typeConfig = {
      marketing: { label: 'Marketing', color: 'bg-blue-500' },
      alert: { label: 'Alerta', color: 'bg-yellow-500' },
      commemorative: { label: 'Comemorativa', color: 'bg-purple-500' },
      network_outage: { label: 'Queda de Rede', color: 'bg-red-500' },
      nps: { label: 'NPS', color: 'bg-green-500' },
    };
    const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.marketing;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const handleStatusChange = async (campaignId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ status: newStatus as any })
        .eq('id', campaignId);

      if (error) throw error;

      toast({
        title: 'Status atualizado',
        description: 'O status da campanha foi atualizado com sucesso',
      });

      fetchCampaigns();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando campanhas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Campanhas</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie campanhas de marketing, alertas e comunicações
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Campanha
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Criar Nova Campanha</DialogTitle>
            </DialogHeader>
            <CampaignForm
              onSuccess={() => {
                setIsCreateDialogOpen(false);
                fetchCampaigns();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total de Campanhas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaigns.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Ativas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campaigns.filter(c => c.status === 'running').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Agendadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campaigns.filter(c => c.status === 'scheduled').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Rascunhos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campaigns.filter(c => c.status === 'draft').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns List */}
      <div className="grid grid-cols-1 gap-4">
        {campaigns.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Send className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">Nenhuma campanha criada</p>
              <p className="text-sm text-muted-foreground mb-4">
                Crie sua primeira campanha para começar
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Campanha
              </Button>
            </CardContent>
          </Card>
        ) : (
          campaigns.map((campaign) => (
            <Card key={campaign.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CardTitle>{campaign.name}</CardTitle>
                      {getStatusBadge(campaign.status)}
                      {getTypeBadge(campaign.type)}
                    </div>
                    <CardDescription>{campaign.description}</CardDescription>
                  </div>

                  <div className="flex gap-2">
                    {campaign.status === 'draft' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusChange(campaign.id, 'scheduled')}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        Agendar
                      </Button>
                    )}
                    {campaign.status === 'scheduled' && (
                      <Button
                        size="sm"
                        onClick={() => handleStatusChange(campaign.id, 'running')}
                      >
                        <Play className="mr-2 h-4 w-4" />
                        Iniciar
                      </Button>
                    )}
                    {campaign.status === 'running' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusChange(campaign.id, 'paused')}
                      >
                        <Pause className="mr-2 h-4 w-4" />
                        Pausar
                      </Button>
                    )}
                    {campaign.status === 'paused' && (
                      <Button
                        size="sm"
                        onClick={() => handleStatusChange(campaign.id, 'running')}
                      >
                        <Play className="mr-2 h-4 w-4" />
                        Retomar
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        {campaign.stats?.[0]?.total_recipients || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Destinatários</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Send className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        {campaign.stats?.[0]?.total_sent || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Enviados</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <BarChart className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        {campaign.stats?.[0]?.delivery_rate || 0}%
                      </p>
                      <p className="text-xs text-muted-foreground">Entrega</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        {campaign.scheduled_at
                          ? format(new Date(campaign.scheduled_at), 'dd/MM/yyyy', { locale: ptBR })
                          : 'Não agendada'}
                      </p>
                      <p className="text-xs text-muted-foreground">Agendamento</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  {campaign.channels.map((channel) => (
                    <Badge key={channel} variant="outline">
                      {channel}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
