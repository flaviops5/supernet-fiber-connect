import { CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TicketCreatedProps {
  ticketNumber: string;
}

export const TicketCreated = ({ ticketNumber }: TicketCreatedProps) => {
  return (
    <div data-testid="ticket-created" className="space-y-3">
      <Alert className="border-green-200 bg-green-50 dark:bg-green-950">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription data-testid="success-message" className="text-green-900 dark:text-green-100">
          Ticket criado com sucesso
        </AlertDescription>
      </Alert>

      <div className="p-4 bg-muted rounded-lg">
        <p className="text-sm text-muted-foreground">Número do ticket</p>
        <p data-testid="ticket-number" className="text-2xl font-bold">{ticketNumber}</p>
      </div>
    </div>
  );
};
