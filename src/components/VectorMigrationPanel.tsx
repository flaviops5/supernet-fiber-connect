import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Database, Zap, CheckCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MigrationStats {
  total_docs: number;
  migrated_docs: number;
  pending_docs: number;
  migration_progress: number;
}

const VectorMigrationPanel = () => {
  const { toast } = useToast();
  const [stats, setStats] = useState<MigrationStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [migrating, setMigrating] = useState(false);

  const loadStats = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_migration_stats');
      if (error) throw error;
      setStats(data?.[0] || null);
    } catch (error) {
      console.error('Error loading stats:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar estatísticas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const runMigrationBatch = async () => {
    setMigrating(true);
    try {
      const { data, error } = await supabase.functions.invoke('migrate-knowledge-batch', {
        body: { batchSize: 25 }
      });

      if (error) throw error;

      toast({
        title: data.success ? "Sucesso" : "Atenção",
        description: data.message || `Migrados: ${data.migrated}, Erros: ${data.errors}`,
        variant: data.success ? "default" : "destructive"
      });

      if (data.errorDetails?.length > 0) {
        console.warn('Erros na migração:', data.errorDetails);
      }

      // Recarregar stats
      await loadStats();

      // Se ainda há documentos pendentes, continuar
      if (data.stats?.pending_docs > 0) {
        toast({
          title: "Migração em andamento",
          description: `Restam ${data.stats.pending_docs} documentos. Clique novamente para continuar.`,
        });
      } else {
        toast({
          title: "Migração concluída!",
          description: "Todos os documentos foram migrados com sucesso.",
        });
      }

    } catch (error) {
      console.error('Error running migration:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao executar migração",
        variant: "destructive"
      });
    } finally {
      setMigrating(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const progress = stats?.migration_progress || 0;
  const isComplete = stats?.pending_docs === 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Migração para Busca Vetorial
            </CardTitle>
            <CardDescription className="mt-2">
              Sistema de embeddings com text-embedding-3-small (512 dims)
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadStats}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status atual */}
        {stats && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Progresso da migração</span>
              <Badge variant={isComplete ? "default" : "secondary"}>
                {progress.toFixed(1)}%
              </Badge>
            </div>
            <Progress value={progress} className="h-2" />
            
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{stats.total_docs}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-green-600">{stats.migrated_docs}</div>
                <div className="text-xs text-muted-foreground">Migrados</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{stats.pending_docs}</div>
                <div className="text-xs text-muted-foreground">Pendentes</div>
              </div>
            </div>
          </div>
        )}

        {/* Alertas */}
        {isComplete ? (
          <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              Migração concluída! A busca vetorial está ativa e otimizada.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              A migração processa 25 documentos por vez. Execute múltiplas vezes até completar.
            </AlertDescription>
          </Alert>
        )}

        {/* Botão de migração */}
        <div className="flex gap-2">
          <Button
            onClick={runMigrationBatch}
            disabled={migrating || isComplete}
            className="flex-1"
          >
            {migrating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Migrando...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                {isComplete ? 'Migração Completa' : `Migrar Lote (25 docs)`}
              </>
            )}
          </Button>
        </div>

        {/* Informações técnicas */}
        <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t">
          <div className="flex justify-between">
            <span>Modelo de embedding:</span>
            <span className="font-mono">text-embedding-3-small</span>
          </div>
          <div className="flex justify-between">
            <span>Dimensões:</span>
            <span className="font-mono">512</span>
          </div>
          <div className="flex justify-between">
            <span>Índice vetorial:</span>
            <span className="font-mono">HNSW (m=16, ef=64)</span>
          </div>
          <div className="flex justify-between">
            <span>Similaridade:</span>
            <span className="font-mono">Cosine</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VectorMigrationPanel;
