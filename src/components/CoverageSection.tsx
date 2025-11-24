import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

const CoverageSection = () => {
  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <Card>
          <CardContent className="text-center py-12">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Cobertura Desabilitada</h3>
            <p className="text-sm text-muted-foreground">
              Esta funcionalidade requer a tabela coverage_areas no banco de dados.
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default CoverageSection;
