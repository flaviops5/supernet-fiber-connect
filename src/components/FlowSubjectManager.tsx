import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GitBranch } from 'lucide-react';

export const FlowSubjectManager = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="h-5 w-5" />
          Gerenciador de Assuntos de Fluxo
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center py-8">
        <GitBranch className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-sm text-muted-foreground">
          Funcionalidade desabilitada. Tabelas do banco de dados necessárias não foram criadas.
        </p>
      </CardContent>
    </Card>
  );
};
