import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, AlertCircle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const InstructionsCard = () => {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <CheckCircle className="w-5 h-5 text-green-500" />
        Como integrar com Google Reviews
      </h3>
      
      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Importante:</strong> Esta funcionalidade coleta depoimentos reais do Google My Business da sua empresa,
          garantindo autenticidade e atualizações automáticas.
        </AlertDescription>
      </Alert>

      <div className="space-y-6">
        <div>
          <Badge variant="outline" className="mb-2">Passo 1</Badge>
          <h4 className="font-medium mb-2">Obter Google Places API Key</h4>
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground ml-4">
            <li>Acesse o <a href="https://console.cloud.google.com/" target="_blank" className="text-blue-600 hover:underline inline-flex items-center gap-1">Google Cloud Console <ExternalLink className="w-3 h-3" /></a></li>
            <li>Crie um projeto ou selecione um existente</li>
            <li>Vá em "APIs & Services" → "Library"</li>
            <li>Procure por "Places API" e ative</li>
            <li>Vá em "Credentials" → "Create Credentials" → "API Key"</li>
            <li>Copie a API Key gerada</li>
          </ol>
        </div>

        <div>
          <Badge variant="outline" className="mb-2">Passo 2</Badge>
          <h4 className="font-medium mb-2">Encontrar o Place ID da sua empresa</h4>
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground ml-4">
            <li>Acesse <a href="https://developers.google.com/maps/documentation/places/web-service/place-id" target="_blank" className="text-blue-600 hover:underline inline-flex items-center gap-1">Place ID Finder <ExternalLink className="w-3 h-3" /></a></li>
            <li>Digite o nome da sua empresa</li>
            <li>Selecione a empresa correta no mapa</li>
            <li>Copie o Place ID (formato: ChIJ...)</li>
          </ol>
        </div>

        <div>
          <Badge variant="outline" className="mb-2">Passo 3</Badge>
          <h4 className="font-medium mb-2">Configurar no painel</h4>
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground ml-4">
            <li>Cole a API Key e Place ID na aba "Google Reviews"</li>
            <li>Clique em "Salvar Configuração"</li>
            <li>As avaliações serão carregadas automaticamente</li>
          </ol>
        </div>

        <div>
          <Badge variant="outline" className="mb-2">Passo 4</Badge>
          <h4 className="font-medium mb-2">Adicionar depoimentos ao site</h4>
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground ml-4">
            <li>Selecione as melhores avaliações</li>
            <li>Clique em "Copiar Código" na avaliação desejada</li>
            <li>Abra o arquivo <code className="bg-muted px-1 rounded">src/components/Testimonials.tsx</code></li>
            <li>Adicione o código copiado no array <code className="bg-muted px-1 rounded">testimonials</code></li>
            <li>Salve o arquivo - as alterações aparecerão automaticamente</li>
          </ol>
        </div>

        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Dica:</strong> As avaliações do Google são atualizadas automaticamente. 
            Execute a sincronização periodicamente para manter os depoimentos sempre atualizados.
          </AlertDescription>
        </Alert>
      </div>
    </Card>
  );
};