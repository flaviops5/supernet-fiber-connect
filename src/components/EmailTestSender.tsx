import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail } from 'lucide-react';

export const EmailTestSender = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Envio de Email de Teste</CardTitle>
      </CardHeader>
      <CardContent className="text-center py-8">
        <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-sm text-muted-foreground">
          Funcionalidade desabilitada. Tabelas do banco de dados necessárias não foram criadas.
        </p>
      </CardContent>
    </Card>
  );
};
