import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';

const ContractTemplatesView: React.FC = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Templates de Contratos
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium mb-2">Funcionalidade Desabilitada</p>
          <p className="text-sm text-muted-foreground">
            Esta funcionalidade requer tabelas de banco de dados que ainda não foram criadas.
            Contate o administrador para configurar as tabelas necessárias.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ContractTemplatesView;
