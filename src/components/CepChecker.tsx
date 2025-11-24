import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin } from 'lucide-react';

interface CepCheckerProps {
  onLocationFound?: (coordinates: [number, number]) => void;
}

const CepChecker = ({ onLocationFound }: CepCheckerProps) => {
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          Consulte sua Cobertura
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center py-8">
        <p className="text-sm text-muted-foreground">
          Esta funcionalidade requer tabelas de banco de dados que ainda não foram criadas.
          Contate o administrador para configurar as tabelas necessárias.
        </p>
      </CardContent>
    </Card>
  );
};

export default CepChecker;
