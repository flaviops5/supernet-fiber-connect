import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { TrendingUp, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import type { KanbanCard, KanbanColumn } from '@/hooks/useKanban';

interface KanbanDashboardProps {
  columns: KanbanColumn[];
  cards: KanbanCard[];
}

export function KanbanDashboard({ columns, cards }: KanbanDashboardProps) {
  const metrics = useMemo(() => {
    const totalCards = cards.length;
    const cardsByColumn = columns.map((col) => ({
      name: col.name,
      count: cards.filter((c) => c.column_id === col.id).length,
      color: col.color,
    }));

    const cardsByPriority = [
      { name: 'Baixa', count: cards.filter((c) => c.priority === 'low').length, color: '#3b82f6' },
      { name: 'Média', count: cards.filter((c) => c.priority === 'medium').length, color: '#eab308' },
      { name: 'Alta', count: cards.filter((c) => c.priority === 'high').length, color: '#f97316' },
      { name: 'Urgente', count: cards.filter((c) => c.priority === 'urgent').length, color: '#ef4444' },
    ];

    const avgCardsPerColumn = totalCards / columns.length || 0;
    
    // Cards criados nos últimos 7 dias
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentCards = cards.filter(
      (c) => new Date(c.created_at) >= sevenDaysAgo
    ).length;

    return {
      totalCards,
      cardsByColumn,
      cardsByPriority,
      avgCardsPerColumn: avgCardsPerColumn.toFixed(1),
      recentCards,
    };
  }, [columns, cards]);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Total de Cards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalCards}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Média por Coluna
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgCardsPerColumn}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Recentes (7d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.recentCards}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Urgentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {cards.filter((c) => c.priority === 'urgent').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cards por Coluna */}
        <Card>
          <CardHeader>
            <CardTitle>Cards por Coluna</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrics.cardsByColumn}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Cards por Prioridade */}
        <Card>
          <CardHeader>
            <CardTitle>Cards por Prioridade</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={metrics.cardsByPriority}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {metrics.cardsByPriority.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Column Details */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhes das Colunas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics.cardsByColumn.map((col) => (
              <div
                key={col.name}
                className="flex items-center justify-between p-3 bg-muted rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: col.color }}
                  />
                  <span className="font-medium">{col.name}</span>
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
