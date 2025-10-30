import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle } from 'lucide-react';

interface ClientStatusProps {
  status: 'bloqueado' | 'ativo';
  blockReason?: string;
}

export const ClientStatus = ({ status, blockReason }: ClientStatusProps) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
        <span className="font-medium">Status do Cliente</span>
        <Badge
          data-testid="client-status"
          variant={status === 'ativo' ? 'default' : 'destructive'}
        >
          {status}
        </Badge>
      </div>

      {status === 'bloqueado' && blockReason && (
        <Alert data-testid="client-blocked-warning" variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <span data-testid="block-reason">{blockReason}</span>
          </AlertDescription>
        </Alert>
      )}

      {status === 'ativo' && (
        <Alert data-testid="unblock-confirmation" className="border-green-200 bg-green-50 dark:bg-green-950">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription data-testid="success-message" className="text-green-900 dark:text-green-100">
            Cliente desbloqueado com sucesso
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
