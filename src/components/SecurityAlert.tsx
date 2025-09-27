import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Shield, AlertTriangle, XCircle, Info } from 'lucide-react';

interface SecurityAlertProps {
  type: 'blocked' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  details?: string[];
  onDismiss?: () => void;
  className?: string;
}

export const SecurityAlert: React.FC<SecurityAlertProps> = ({
  type,
  title,
  message,
  details = [],
  onDismiss,
  className = ''
}) => {
  const getIcon = () => {
    switch (type) {
      case 'blocked':
        return <Shield className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      case 'error':
        return <XCircle className="h-4 w-4" />;
      case 'info':
        return <Info className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getVariant = () => {
    switch (type) {
      case 'blocked':
      case 'error':
        return 'destructive';
      case 'warning':
        return 'default';
      case 'info':
        return 'default';
      default:
        return 'default';
    }
  };

  return (
    <Alert 
      variant={getVariant() as 'destructive' | 'default'} 
      className={`relative ${className}`}
    >
      {getIcon()}
      <AlertTitle className="flex items-center justify-between">
        {title}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="ml-2 opacity-70 hover:opacity-100 transition-opacity"
            aria-label="Dispensar alerta"
          >
            <XCircle className="h-4 w-4" />
          </button>
        )}
      </AlertTitle>
      <AlertDescription className="space-y-2">
        <p>{message}</p>
        {details.length > 0 && (
          <ul className="space-y-1 text-sm">
            {details.map((detail, index) => (
              <li key={index} className="flex items-start">
                <span className="inline-block w-1 h-1 bg-current rounded-full mt-2 mr-2 flex-shrink-0" />
                {detail}
              </li>
            ))}
          </ul>
        )}
      </AlertDescription>
    </Alert>
  );
};