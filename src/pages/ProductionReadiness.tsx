import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Rocket,
  Database,
  Settings,
  Activity,
  Shield,
  ExternalLink
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ValidationResult {
  category: string;
  check: string;
  status: 'pass' | 'warning' | 'fail';
  message: string;
  details?: string;
}

interface ReadinessData {
  status: 'ready' | 'ready_with_warnings' | 'not_ready';
  score: number;
  summary: {
    total_checks: number;
    passed: number;
    warnings: number;
    failed: number;
  };
  results: ValidationResult[];
  timestamp: string;
}

export default function ProductionReadiness() {
  const [data, setData] = useState<ReadinessData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    runValidation();
  }, []);

  const runValidation = async () => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('validate-production-readiness');
      
      if (error) throw error;
      
      setData(result);
      
      if (result.status === 'ready') {
        toast.success('✅ Sistema pronto para produção!');
      } else if (result.status === 'ready_with_warnings') {
        toast.warning('⚠️ Sistema pronto com avisos');
      } else {
        toast.error('❌ Sistema não está pronto para produção');
      }
    } catch (error) {
      console.error('Error validating:', error);
      toast.error('Erro ao validar sistema');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'fail': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return <Activity className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      ready: { variant: 'default', label: '✅ PRONTO', color: 'text-green-600' },
      ready_with_warnings: { variant: 'secondary', label: '⚠️ PRONTO COM AVISOS', color: 'text-yellow-600' },
      not_ready: { variant: 'destructive', label: '❌ NÃO PRONTO', color: 'text-red-600' }
    };
    
    const config = variants[status] || variants.not_ready;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, any> = {
      'Configuração': Settings,
      'Integrações': Activity,
      'Database': Database,
      'Edge Functions': Rocket,
      'Monitoramento': Shield,
      'Backup': Database
    };
    
    const Icon = icons[category] || Activity;
    return <Icon className="w-5 h-5" />;
  };

  const groupedResults = data?.results.reduce((acc, result) => {
    if (!acc[result.category]) {
      acc[result.category] = [];
    }
    acc[result.category].push(result);
    return acc;
  }, {} as Record<string, ValidationResult[]>);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Validando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground flex items-center gap-3">
              <Rocket className="w-10 h-10" />
              Preparação para Produção
            </h1>
            <p className="text-muted-foreground mt-2">
              Validação completa do sistema antes do deploy v1.0.0
            </p>
          </div>
          <Button onClick={runValidation} disabled={loading}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Re-validar
          </Button>
        </div>

        {/* Status Geral */}
        {data && (
          <Card className="border-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">Status Geral</CardTitle>
                {getStatusBadge(data.status)}
              </div>
              <CardDescription>
                Última validação: {new Date(data.timestamp).toLocaleString('pt-BR')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-primary/5 rounded-lg">
                  <div className="text-4xl font-bold text-primary">{data.score}%</div>
                  <p className="text-sm text-muted-foreground mt-1">Score Geral</p>
                </div>
                <div className="text-center p-4 bg-green-500/5 rounded-lg">
                  <div className="text-4xl font-bold text-green-600">{data.summary.passed}</div>
                  <p className="text-sm text-muted-foreground mt-1">Aprovados</p>
                </div>
                <div className="text-center p-4 bg-yellow-500/5 rounded-lg">
                  <div className="text-4xl font-bold text-yellow-600">{data.summary.warnings}</div>
                  <p className="text-sm text-muted-foreground mt-1">Avisos</p>
                </div>
                <div className="text-center p-4 bg-red-500/5 rounded-lg">
                  <div className="text-4xl font-bold text-red-600">{data.summary.failed}</div>
                  <p className="text-sm text-muted-foreground mt-1">Falharam</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Alertas Críticos */}
        {data && data.summary.failed > 0 && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Ação necessária:</strong> {data.summary.failed} check(s) crítico(s) falharam. 
              Resolva todos os problemas antes do deploy em produção.
            </AlertDescription>
          </Alert>
        )}

        {/* Checklist por Categoria */}
        {groupedResults && Object.entries(groupedResults).map(([category, results]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getCategoryIcon(category)}
                {category}
              </CardTitle>
              <CardDescription>
                {results.filter(r => r.status === 'pass').length}/{results.length} checks passaram
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {results.map((result, idx) => (
                  <div 
                    key={idx}
                    className={`flex items-start gap-3 p-4 rounded-lg border ${
                      result.status === 'pass' 
                        ? 'bg-green-50 border-green-200 dark:bg-green-950/20' 
                        : result.status === 'warning'
                          ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20'
                          : 'bg-red-50 border-red-200 dark:bg-red-950/20'
                    }`}
                  >
                    {getStatusIcon(result.status)}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{result.check}</p>
                      <p className="text-sm text-muted-foreground">{result.message}</p>
                      {result.details && (
                        <p className="text-xs text-muted-foreground mt-1 italic">
                          {result.details}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Links Úteis */}
        <Card>
          <CardHeader>
            <CardTitle>Links de Deploy</CardTitle>
            <CardDescription>Recursos necessários para o deploy</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => window.open('https://supabase.com/dashboard/project/mxdupkbpxjcfxdgrwknp/database/backups', '_blank')}
              >
                <Database className="w-4 h-4 mr-2" />
                Database Backups
                <ExternalLink className="w-4 h-4 ml-auto" />
              </Button>
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => window.open('https://supabase.com/dashboard/project/mxdupkbpxjcfxdgrwknp/functions', '_blank')}
              >
                <Rocket className="w-4 h-4 mr-2" />
                Edge Functions
                <ExternalLink className="w-4 h-4 ml-auto" />
              </Button>
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => window.open('/admin/documentacao', '_blank')}
              >
                <Settings className="w-4 h-4 mr-2" />
                Documentação
                <ExternalLink className="w-4 h-4 ml-auto" />
              </Button>
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => window.open('/system-metrics', '_blank')}
              >
                <Activity className="w-4 h-4 mr-2" />
                Métricas do Sistema
                <ExternalLink className="w-4 h-4 ml-auto" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Próximos Passos */}
        {data && data.status === 'ready' && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>✅ Sistema pronto para produção!</strong>
              <br />
              Próximos passos: Criar backup manual do DB → Deploy Edge Functions → Smoke tests → Tag v1.0.0
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
