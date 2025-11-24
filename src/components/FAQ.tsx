import { Card, CardContent } from '@/components/ui/card';
import { HelpCircle } from 'lucide-react';

const FAQ = () => {
  return (
    <div className="py-16 px-4 bg-gradient-to-b from-background to-muted">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">Perguntas Frequentes</h2>
        <Card>
          <CardContent className="text-center py-12">
            <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">
              Funcionalidade desabilitada. Tabelas do banco de dados necessárias não foram criadas.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FAQ;
