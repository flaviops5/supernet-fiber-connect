import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

const VectorMigrationPanel = () => {
  return (
    <Card>
      <CardContent className="text-center py-12">
        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">Migração de Vetores Desabilitada</h3>
        <p className="text-sm text-muted-foreground">
          Esta funcionalidade requer funções de banco de dados específicas.
        </p>
      </CardContent>
    </Card>
  );
};

export default VectorMigrationPanel;
