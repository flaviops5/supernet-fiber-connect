import { CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface WhatsAppNotificationProps {
  message: string;
  sent?: boolean;
}

export const WhatsAppNotification = ({ message, sent = true }: WhatsAppNotificationProps) => {
  if (!sent) return null;

  return (
    <Alert 
      data-testid="whatsapp-notification-sent" 
      className="border-green-200 bg-green-50 dark:bg-green-950"
    >
      <CheckCircle className="h-4 w-4 text-green-600" />
      <AlertDescription className="text-green-900 dark:text-green-100">
        {message}
      </AlertDescription>
    </Alert>
  );
};
