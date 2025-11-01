import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { TrendingUp, Clock, CheckCircle, AlertTriangle, Search, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from '@/hooks/use-debounce';

interface KanbanDashboardProps {
  boardId: string;
}

interface DashboardStats {
  total_cards: number;
  cards_por_coluna: Array<{
    column_id: string;
    column_name: string;
    column_color: string;
    count: number;
  }>;
  cards_por_prioridade: Array<{
    priority: string;
    count: number;
  }>;
  recentes_7d: number;
  atualizados_hoje: number;
  urgentes: number;
  total_colunas: number;
  media_por_coluna: number;
}

export function KanbanDashboard({ boardId }: KanbanDashboardProps) {
  // Carregar filtros salvos do localStorage
  const [filters, setFilters] = useState(() => {
    const saved = localStorage.getItem(`kanbanFilters_${boardId}`);
    return saved ? JSON.parse(saved) : { search: '', periodo: '' };
  });
  
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Debounce para evitar múltiplas requisições
  const debouncedFilters = useDebounce(filters, 400);

  // Persistir filtros no localStorage
  useEffect(() => {
    localStorage.setItem(`kanbanFilters_${boardId}`, JSON.stringify(filters));
  }, [filters, boardId]);

  // Buscar estatísticas com RPC otimizada
  useEffect(() => {
    if (!boardId) return;
    
    const loadStats = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.rpc('kanban_board_stats', {
          p_board_id: boardId,
          p_search: debouncedFilters.search || null,
          p_periodo: debouncedFilters.periodo || null,
        });

        if (error) throw error;
        setStats(data as unknown as DashboardStats);
      } catch (error) {
        console.error('Error loading dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [boardId, debouncedFilters]);

  // Mapear prioridades para cores e nomes em português
  const priorityMap = {
    low: { name: 'Baixa', color: '#3b82f6' },
    medium: { name: 'Média', color: '#eab308' },
    high: { name: 'Alta', color: '#f97316' },
    urgent: { name: 'Urgente', color: '#ef4444' },
  };

  const chartData = {
    cardsByColumn: stats?.cards_por_coluna || [],
    cardsByPriority: (stats?.cards_por_prioridade || []).map((item) => ({
      name: priorityMap[item.priority as keyof typeof priorityMap]?.name || item.priority,
      count: item.count,
      color: priorityMap[item.priority as keyof typeof priorityMap]?.color || '#6b7280',
    })),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título ou descrição..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="pl-9 w-full sm:w-72"
          />
        </div>
        <div className="relative w-full sm:w-auto">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filtrar por período (ex: Março)"
            value={filters.periodo}
            onChange={(e) => setFilters({ ...filters, periodo: e.target.value })}
            className="pl-9 w-full sm:w-48"
          />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Total de Cards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_cards || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Média por Coluna
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.media_por_coluna || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Recentes (7d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.recentes_7d || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Urgentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {stats?.urgentes || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cards por Coluna */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Cards por Coluna</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData.cardsByColumn}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                <XAxis 
                  dataKey="column_name" 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Cards por Prioridade */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Cards por Prioridade</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData.cardsByPriority}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    percent > 0 ? `${name}: ${(percent * 100).toFixed(0)}%` : ''
                  }
                  outerRadius={90}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {chartData.cardsByPriority.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Column Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Detalhes das Colunas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {chartData.cardsByColumn.map((col) => (
              <div
                key={col.column_id}
                className="flex items-center justify-between p-3 bg-muted/30 border border-border/60 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: col.column_color }}
                  />
                  <span className="font-medium">{col.column_name}</span>
                </div>
                <Badge variant="secondary">{col.count} cards</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
