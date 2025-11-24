import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail } from 'lucide-react';

export function EmailTemplateManagement() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Gerenciamento de Templates de Email
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center py-8">
        <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-lg font-medium mb-2">Funcionalidade Desabilitada</p>
        <p className="text-sm text-muted-foreground">
          Esta funcionalidade requer tabelas de banco de dados que ainda não foram criadas.
          Contate o administrador para configurar as tabelas necessárias.
        </p>
      </CardContent>
    </Card>
  );
}
