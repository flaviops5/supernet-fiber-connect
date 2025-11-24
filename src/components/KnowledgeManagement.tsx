import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export const KnowledgeManagement = () => {
  return (
    <Card>
      <CardContent className="text-center py-12">
        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">Gestão de Conhecimento Desabilitada</h3>
        <p className="text-sm text-muted-foreground">
          Esta funcionalidade requer a tabela knowledge_base no banco de dados.
        </p>
      </CardContent>
    </Card>
  );
};

export default KnowledgeManagement;
