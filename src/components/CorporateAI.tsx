import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain } from 'lucide-react';

const CorporateAI = () => {
  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Brain className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">IA Corporativa</h1>
            <p className="text-muted-foreground">
              Assistente inteligente com acesso à base de conhecimento da empresa
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Funcionalidade Desabilitada</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">
            Esta funcionalidade requer tabelas de banco de dados que ainda não foram criadas.
            Contate o administrador para configurar as tabelas necessárias.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default CorporateAI;
