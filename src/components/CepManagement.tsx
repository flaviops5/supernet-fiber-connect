import { Card, CardContent } from '@/components/ui/card';
import { MapPin } from 'lucide-react';

const CepManagement = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gerenciamento de CEPs</h1>
          <p className="text-muted-foreground">
            Configure a cobertura por CEPs e associe planos disponíveis
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium mb-2">Funcionalidade Desabilitada</p>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Esta funcionalidade requer tabelas de banco de dados que ainda não foram criadas.
            Contate o administrador para configurar as tabelas necessárias.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default CepManagement;
