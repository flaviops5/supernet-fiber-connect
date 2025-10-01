import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  ThumbsUp, 
  ThumbsDown, 
  Meh,
  AlertCircle,
  CheckCircle,
  MessageSquare
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface NPSStats {
  campaign_id: string;
  campaign_name: string;
  total_responses: number;
  total_promoters: number;
  total_neutrals: number;
  total_detractors: number;
  promoters_percentage: number;
  neutrals_percentage: number;
  detractors_percentage: number;
  nps_score: number;
  follow_ups_needed: number;
  follow_ups_completed: number;
}

interface NPSResponse {
  id: string;
  customer_name: string;
  customer_phone: string;
  score: number;
  category: string;
  feedback: string;
  follow_up_needed: boolean;
  follow_up_completed: boolean;
  responded_at: string;
}

export function NPSDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats] = useState<NPSStats[]>([]);
  const [detractors, setDetractors] = useState<NPSResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNPSData();
  }, []);

  const fetchNPSData = async () => {
    try {
      // Buscar estatísticas NPS
      const { data: statsData, error: statsError } = await supabase
        .from('nps_stats')
        .select(`
          *,
          campaign:campaigns(name)
        `);

      if (statsError) throw statsError;

      const formattedStats = statsData?.map(stat => ({
        ...stat,
        campaign_name: (stat.campaign as any)?.name || 'Sem nome',
      })) || [];

      setStats(formattedStats);

      // Buscar detratores que precisam de follow-up
      const { data: detractorsData, error: detractorsError } = await supabase
        .from('nps_responses')
        .select('*')
        .eq('category', 'detractor')
        .eq('follow_up_needed', true)
        .eq('follow_up_completed', false)
        .order('responded_at', { ascending: false })
        .limit(10);

      if (detractorsError) throw detractorsError;

      setDetractors(detractorsData || []);
    } catch (error) {
      console.error('Erro ao buscar dados NPS:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados NPS',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getNPSScoreColor = (score: number) => {
    if (score >= 50) return 'text-green-600';
    if (score >= 0) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getNPSScoreLabel = (score: number) => {
    if (score >= 75) return 'Excelente';
    if (score >= 50) return 'Muito Bom';
    if (score >= 25) return 'Bom';
    if (score >= 0) return 'Razoável';
    return 'Precisa Melhorar';
  };

  const handleMarkFollowUpComplete = async (responseId: string) => {
    try {
      const { error } = await supabase
        .from('nps_responses')
        .update({ follow_up_completed: true })
        .eq('id', responseId);

      if (error) throw error;

      toast({
        title: 'Follow-up marcado como concluído',
      });

      fetchNPSData();
    } catch (error) {
      console.error('Erro:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o follow-up',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando dados NPS...</p>
        </div>
      </div>
    );
  }

  const overallStats = stats.reduce(
    (acc, stat) => ({
      total_responses: acc.total_responses + stat.total_responses,
      total_promoters: acc.total_promoters + stat.total_promoters,
      total_neutrals: acc.total_neutrals + stat.total_neutrals,
      total_detractors: acc.total_detractors + stat.total_detractors,
    }),
    { total_responses: 0, total_promoters: 0, total_neutrals: 0, total_detractors: 0 }
  );

  const overallNPS =
    overallStats.total_responses > 0
      ? Math.round(
          ((overallStats.total_promoters - overallStats.total_detractors) /
            overallStats.total_responses) *
            100
        )
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard NPS</h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe a satisfação e lealdade dos clientes
          </p>
        </div>
        <Button onClick={() => navigate('/admin/campaigns')}>
          Nova Pesquisa NPS
        </Button>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">NPS Geral</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-4xl font-bold ${getNPSScoreColor(overallNPS)}`}>
              {overallNPS}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {getNPSScoreLabel(overallNPS)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ThumbsUp className="h-4 w-4 text-green-600" />
              Promotores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.total_promoters}</div>
            <Progress
              value={
                overallStats.total_responses > 0
                  ? (overallStats.total_promoters / overallStats.total_responses) * 100
                  : 0
              }
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Meh className="h-4 w-4 text-yellow-600" />
              Neutros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.total_neutrals}</div>
            <Progress
              value={
                overallStats.total_responses > 0
                  ? (overallStats.total_neutrals / overallStats.total_responses) * 100
                  : 0
              }
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ThumbsDown className="h-4 w-4 text-red-600" />
              Detratores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.total_detractors}</div>
            <Progress
              value={
                overallStats.total_responses > 0
                  ? (overallStats.total_detractors / overallStats.total_responses) * 100
                  : 0
              }
              className="mt-2"
            />
          </CardContent>
        </Card>
      </div>

      {/* Campaigns NPS */}
      <Card>
        <CardHeader>
          <CardTitle>NPS por Campanha</CardTitle>
          <CardDescription>Resultados detalhados de cada pesquisa</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma resposta NPS ainda
            </div>
          ) : (
            <div className="space-y-4">
              {stats.map((stat) => (
                <div key={stat.campaign_id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold">{stat.campaign_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {stat.total_responses} respostas
                      </p>
                    </div>
                    <div className="text-right">
                      <div className={`text-3xl font-bold ${getNPSScoreColor(stat.nps_score)}`}>
                        {stat.nps_score}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {getNPSScoreLabel(stat.nps_score)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground mb-1">Promotores</div>
                      <div className="text-2xl font-bold text-green-600">
                        {stat.promoters_percentage}%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {stat.total_promoters} clientes
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground mb-1">Neutros</div>
                      <div className="text-2xl font-bold text-yellow-600">
                        {stat.neutrals_percentage}%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {stat.total_neutrals} clientes
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground mb-1">Detratores</div>
                      <div className="text-2xl font-bold text-red-600">
                        {stat.detractors_percentage}%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {stat.total_detractors} clientes
                      </div>
                    </div>
                  </div>

                  {stat.follow_ups_needed > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                          <span className="text-sm">
                            {stat.follow_ups_needed} follow-ups pendentes
                          </span>
                        </div>
                        <Badge variant="secondary">
                          {stat.follow_ups_completed} concluídos
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detractors Follow-up */}
      {detractors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              Detratores - Follow-up Necessário
            </CardTitle>
            <CardDescription>
              Clientes insatisfeitos que precisam de atenção imediata
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {detractors.map((detractor) => (
                <div key={detractor.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{detractor.customer_name}</h4>
                        <Badge variant="destructive">Score: {detractor.score}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {detractor.customer_phone}
                      </p>
                      {detractor.feedback && (
                        <p className="text-sm mt-2 italic">"{detractor.feedback}"</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(detractor.responded_at), "dd/MM/yyyy 'às' HH:mm", {
                          locale: ptBR,
                        })}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          window.open(
                            `https://wa.me/${detractor.customer_phone}?text=Olá ${detractor.customer_name}, notamos que você nos avaliou com nota ${detractor.score}. Gostaríamos de entender melhor sua experiência e como podemos melhorar.`,
                            '_blank'
                          );
                        }}
                      >
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Contatar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleMarkFollowUpComplete(detractor.id)}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Concluído
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
