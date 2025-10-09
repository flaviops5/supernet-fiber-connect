import React, { useState, useEffect } from 'react';
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

  const runFullMigration = async () => {
    setMigrating(true);
    try {
      toast({
        title: "Iniciando migração completa",
        description: "Isso pode levar alguns minutos...",
      });

      const { data, error } = await supabase.functions.invoke('migrate-knowledge-full');

      if (error) throw error;

      if (data.errors?.length > 0) {
        console.warn('Erros na migração:', data.errors);
      }

      toast({
        title: data.success ? "Sucesso!" : "Atenção",
        description: data.message || `${data.migrated} documentos migrados${data.failed > 0 ? `, ${data.failed} com erro` : ''}`,
        variant: data.success ? "default" : "destructive"
      });

      // Recarregar stats
      await loadStats();

    } catch (error) {
      console.error('Error running full migration:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao executar migração completa",
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Database className="h-5 w-5" />
            Migração para Busca Vetorial
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Sistema de busca semântica inteligente
          </p>
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

      <div className="space-y-4">
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
              Use "Migrar Tudo" para processar todos os documentos de uma vez, ou "Lote" para processar 25 por vez.
            </AlertDescription>
          </Alert>
        )}

        {/* Botões de migração */}
        <div className="flex gap-2">
          <Button
            onClick={runFullMigration}
            disabled={migrating || isComplete}
            className="flex-1"
            variant="default"
          >
            {migrating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Migrando...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                {isComplete ? 'Migração Completa' : `Migrar Tudo (${stats?.pending_docs || 0} docs)`}
              </>
            )}
          </Button>
          <Button
            onClick={runMigrationBatch}
            disabled={migrating || isComplete}
            variant="outline"
          >
            {migrating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Lote (25)'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VectorMigrationPanel;
