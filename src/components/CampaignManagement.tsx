import { Card, CardContent } from '@/components/ui/card';
import { Send } from 'lucide-react';

export function CampaignManagement() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Campanhas</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie campanhas de marketing, alertas e comunicações
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Send className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium mb-2">Funcionalidade Desabilitada</p>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Esta funcionalidade requer tabelas de banco de dados que ainda não foram criadas.
            Contate o administrador para configurar as tabelas necessárias.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
