import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { FileText } from 'lucide-react';

interface ContractSigningProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: string;
  customerData: {
    name: string;
    email: string;
    phone: string;
    cpf: string;
    address: string;
    cep: string;
  };
  planData: {
    name: string;
    speed: string;
    price: number;
  };
  appointmentDate: string;
  appointmentPeriod: string;
}

const ContractSigning: React.FC<ContractSigningProps> = ({
  isOpen,
  onClose,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Assinatura de Contrato</DialogTitle>
        </DialogHeader>
        <Card>
          <CardContent className="text-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">
              Esta funcionalidade requer tabelas de banco de dados que ainda não foram criadas.
              Contate o administrador para configurar as tabelas necessárias.
            </p>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
};

export default ContractSigning;
