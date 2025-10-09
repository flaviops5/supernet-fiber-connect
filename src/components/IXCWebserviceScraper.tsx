import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Globe, Search, Copy } from 'lucide-react';

interface EndpointHit {
  path: string;
  fullUrls: string[];
  occurrences: number;
  methods: string[];
  snippets: string[];
}

export function IXCWebserviceScraper() {
  const [startUrl, setStartUrl] = useState('https://demo.ixcsoft.com.br/webservice/');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ totalEndpoints: number; endpoints: EndpointHit[]; crawled: number; tookMs: number } | null>(null);

  const runScrape = async () => {
    setLoading(true);
    setResults(null);
    try {
      console.log('🔍 Iniciando scraping...');
      const { data, error } = await supabase.functions.invoke('ixc-scrape-webservice-v1', {
        body: {
          startUrls: [startUrl],
          maxPages: 30,
          sameHostOnly: true,
        },
      });
      
      console.log('📥 Resposta recebida:', { data, error });
      
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || 'Falha ao executar scraping');
      
      setResults({
        totalEndpoints: data.totalEndpoints,
        endpoints: data.endpoints,
        crawled: data.crawled,
        tookMs: data.tookMs,
      });
      toast.success(`Scraping concluído: ${data.totalEndpoints} endpoints encontrados em ${data.crawled} páginas`);
    } catch (e) {
      console.error('❌ Erro no scraping:', e);
      toast.error(e instanceof Error ? e.message : 'Erro ao executar scraping');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6 space-y-4">
      <CardHeader className="p-0">
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Descobrir endpoints reais (/webservice/v1/)
        </CardTitle>
        <CardDescription>
          Faz scraping do site informado e lista referências reais a caminhos com /webservice/v1/ (sem inventar endpoints)
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 space-y-4">
        <div className="flex gap-2">
          <Input
            value={startUrl}
            onChange={(e) => setStartUrl(e.target.value)}
            placeholder="https://demo.ixcsoft.com.br/webservice/"
          />
          <Button onClick={runScrape} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Coletando...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Iniciar scraping
              </>
            )}
          </Button>
        </div>

        {results && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Visitadas {results.crawled} páginas em {Math.round(results.tookMs)}ms · {results.totalEndpoints} endpoints
            </div>
            <ScrollArea className="h-[380px] rounded border p-3">
              <div className="space-y-4">
                {results.endpoints.map((ep) => (
                  <div key={ep.path} className="p-3 rounded border">
                    <div className="flex items-center justify-between">
                      <div className="font-mono text-sm break-all">{ep.path}</div>
                      <div className="flex items-center gap-2">
                        {ep.methods.length > 0 ? (
                          ep.methods.map((m) => (
                            <Badge key={m} variant="outline">{m}</Badge>
                          ))
                        ) : (
                          <Badge variant="secondary">método não identificado</Badge>
                        )}
                        <Badge variant="outline">{ep.occurrences}x</Badge>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Em:
                      <ul className="list-disc list-inside space-y-1">
                        {ep.fullUrls.slice(0, 5).map((u) => (
                          <li key={u} className="truncate">
                            <a href={u} target="_blank" rel="noreferrer" className="underline">
                              {u}
                            </a>
                          </li>
                        ))}
                        {ep.fullUrls.length > 5 && (
                          <li>+ {ep.fullUrls.length - 5} outras páginas</li>
                        )}
                      </ul>
                    </div>
                    {ep.snippets.length > 0 && (
                      <div className="mt-2">
                        <div className="text-xs font-medium mb-1">Trechos encontrados:</div>
                        <div className="space-y-1">
                          {ep.snippets.map((s, i) => (
                            <div key={i} className="text-xs bg-muted/50 rounded p-2 font-mono break-words">
                              {s}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="mt-2 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigator.clipboard.writeText(ep.path).then(() => toast.success('Copiado'))}
                      >
                        <Copy className="mr-2 h-3 w-3" /> Copiar caminho
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
