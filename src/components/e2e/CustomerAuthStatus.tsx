import { useState, useEffect } from 'react';
import { CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CustomerAuthStatusProps {
  cpf?: string;
}

export const CustomerAuthStatus = ({ cpf }: CustomerAuthStatusProps) => {
  const [authenticated, setAuthenticated] = useState(false);
  const [customerName, setCustomerName] = useState('');

  useEffect(() => {
    // Simular autenticação após CPF fornecido
    if (cpf && cpf.length >= 11) {
      setTimeout(() => {
        setAuthenticated(true);
        setCustomerName('João da Silva');
      }, 1000);
    }
  }, [cpf]);

  if (!authenticated) return null;

  return (
    <div data-testid="customer-authenticated" className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
      <CheckCircle className="h-5 w-5 text-green-600" />
      <div>
        <p className="text-sm font-medium">Cliente autenticado</p>
        <p data-testid="customer-name" className="text-xs text-muted-foreground">
          {customerName}
        </p>
      </div>
    </div>
  );
};
