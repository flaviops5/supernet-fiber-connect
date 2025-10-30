import { useState, useEffect } from 'react';
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface DiagnosticResult {
  name: string;
  status: 'ok' | 'warning' | 'error';
  message: string;
}

export const DiagnosticStatus = () => {
  const [running, setRunning] = useState(false);
  const [complete, setComplete] = useState(false);
  const [results, setResults] = useState<DiagnosticResult[]>([]);

  const runDiagnostic = () => {
    setRunning(true);
    setComplete(false);
    setResults([]);

    // Simular diagnóstico
    setTimeout(() => {
      setResults([
        { name: 'Conexão', status: 'ok', message: 'Internet conectada' },
        { name: 'Velocidade', status: 'warning', message: 'Velocidade abaixo do esperado' },
        { name: 'Latência', status: 'ok', message: 'Latência normal' }
      ]);
      setRunning(false);
      setComplete(true);
    }, 3000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Diagnóstico Técnico</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!running && !complete && (
          <Button onClick={runDiagnostic}>Executar Diagnóstico</Button>
        )}

        {running && (
          <div data-testid="diagnostic-running" className="flex items-center gap-2 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <span>Executando diagnóstico...</span>
          </div>
        )}

        {complete && (
          <div data-testid="diagnostic-complete" className="space-y-3">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Diagnóstico concluído</span>
            </div>

            <div data-testid="diagnostic-results" className="space-y-2">
              {results.map((result, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="font-medium">{result.name}</span>
                  <Badge variant={result.status === 'ok' ? 'default' : 'destructive'}>
                    {result.message}
                  </Badge>
                </div>
              ))}
            </div>

            <Button data-testid="create-ticket" className="w-full">
              Abrir Ticket Técnico
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
