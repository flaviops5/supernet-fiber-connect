import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export const WhatsAppConversations = () => {
  return (
    <Card>
      <CardContent className="text-center py-12">
        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">Conversas WhatsApp Desabilitadas</h3>
        <p className="text-sm text-muted-foreground">
          Esta funcionalidade requer as tabelas conversations e conversation_messages no banco de dados.
        </p>
      </CardContent>
    </Card>
  );
};

export default WhatsAppConversations;
