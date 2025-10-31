import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  to?: string;
  label?: string;
}

export function BackButton({ to = '/admin', label = 'Voltar ao Menu' }: BackButtonProps) {
  const navigate = useNavigate();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => navigate(to)}
      className="mb-4"
    >
      <ArrowLeft className="mr-2 h-4 w-4" />
      {label}
    </Button>
  );
}
