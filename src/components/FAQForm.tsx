import { Card, CardContent } from '@/components/ui/card';
import { HelpCircle } from 'lucide-react';

export const FAQForm = () => {
  return (
    <Card>
      <CardContent className="text-center py-8">
        <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-sm text-muted-foreground">
          Funcionalidade desabilitada. Tabelas do banco de dados necessárias não foram criadas.
        </p>
      </CardContent>
    </Card>
  );
};
