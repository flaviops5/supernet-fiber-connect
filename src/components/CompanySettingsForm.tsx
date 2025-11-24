import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings } from 'lucide-react';

export const CompanySettingsForm = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurações da Empresa
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-sm text-muted-foreground">
            Esta funcionalidade requer tabelas de banco de dados que ainda não foram criadas.
            Contate o administrador para configurar as tabelas necessárias.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
