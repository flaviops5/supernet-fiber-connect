import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface IXCSubject {
  id: string;
  nome: string;
}

export default function TestIXCSubjects() {
  const [subjects, setSubjects] = useState<IXCSubject[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const loadSubjects = async () => {
    setLoading(true);
    try {
      console.log('🔍 Buscando assuntos do IXC...');
      
      const { data, error } = await supabase.functions.invoke('ixc-list-subjects');
      
      console.log('Resposta:', { data, error });
      
      if (error) throw error;
      
      if (data?.success && data.data) {
        setSubjects(data.data);
        toast({
          title: "Assuntos carregados",
          description: `${data.data.length} assuntos encontrados no IXC`,
        });
      } else {
        throw new Error(data?.error || 'Erro ao carregar assuntos');
      }
    } catch (error) {
      console.error('❌ Erro ao carregar assuntos:', error);
      toast({
        title: "Erro ao carregar assuntos",
        description: error.message || "Não foi possível carregar a lista de assuntos do IXC.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Assuntos de Atendimento IXC</CardTitle>
          <CardDescription>
            Lista de assuntos disponíveis no sistema IXC para abertura de atendimentos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={loadSubjects} 
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Carregando...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Buscar Assuntos
              </>
            )}
          </Button>

          {subjects.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  Total: {subjects.length} assuntos
                </h3>
              </div>
              
              <div className="grid gap-2">
                {subjects.map((subject) => (
                  <div 
                    key={subject.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="font-mono">
                        ID: {subject.id}
                      </Badge>
                      <span className="font-medium">{subject.nome}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && subjects.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Clique no botão acima para carregar os assuntos do IXC
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
