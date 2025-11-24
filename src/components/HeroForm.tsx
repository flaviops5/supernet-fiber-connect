import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export const HeroSettingsForm = () => {
  return (
    <Card>
      <CardContent className="text-center py-12">
        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">Configurações Hero Desabilitadas</h3>
        <p className="text-sm text-muted-foreground">
          Esta funcionalidade requer as tabelas hero_settings e hero_slides no banco de dados.
        </p>
      </CardContent>
    </Card>
  );
};

export const HeroSlideForm = () => {
  return (
    <Card>
      <CardContent className="text-center py-12">
        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">Slides Hero Desabilitados</h3>
        <p className="text-sm text-muted-foreground">
          Esta funcionalidade requer a tabela hero_slides no banco de dados.
        </p>
      </CardContent>
    </Card>
  );
};
