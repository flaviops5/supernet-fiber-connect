import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, TestTube, CheckCircle2, XCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function WhatsAppApiTester() {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const testApi = async () => {
    setTesting(true);
    setResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('test-evolution-api');
      
      if (error) throw error;
      
      setResult(data);
      
      if (data?.success) {
        toast.success('✅ API Evolution está funcionando!');
      } else {
        toast.error('❌ Erro na API Evolution');
      }
    } catch (error: any) {
      console.error('Erro ao testar API:', error);
      toast.error(`Erro: ${error.message}`);
      setResult({ success: false, error: error.message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          Teste da API Evolution
        </CardTitle>
        <CardDescription>
          Teste rápido da conexão com a Evolution API
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={testApi} 
          disabled={testing}
          className="w-full"
        >
          {testing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Testando...
            </>
          ) : (
            <>
              <TestTube className="h-4 w-4 mr-2" />
              Testar Conexão
            </>
          )}
        </Button>

        {result && (
          <Alert variant={result.success ? 'default' : 'destructive'}>
            <div className="flex items-start gap-2">
              {result.success ? (
                <CheckCircle2 className="h-4 w-4 mt-0.5" />
              ) : (
                <XCircle className="h-4 w-4 mt-0.5" />
              )}
              <div className="flex-1">
                <AlertDescription>
                  <div className="font-medium mb-2">
                    {result.success ? 'Conexão bem-sucedida!' : 'Falha na conexão'}
                  </div>
                  <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-48">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </AlertDescription>
              </div>
            </div>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
