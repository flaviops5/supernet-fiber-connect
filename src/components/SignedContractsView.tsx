import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  FileSignature,
  Calendar,
  User,
  MapPin,
  Clock,
  Download,
  Eye,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  FileText,
  Wifi
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SignedContract {
  id: string;
  contract_number: string;
  contract_pdf_url: string;
  signature_data: string;
  cpf_validated: boolean;
  timestamp_hash: string;
  ip_address: string;
  user_agent: string;
  signed_at: string;
  created_at: string;
  installation_appointments: {
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    customer_cpf: string;
    customer_address: string;
    customer_cep: string;
    plan_name: string;
    plan_speed: string;
    plan_price: number;
    appointment_date: string;
    appointment_period: string;
    status: string;
  };
}

const SignedContractsView: React.FC = () => {
  const [contracts, setContracts] = useState<SignedContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContract, setSelectedContract] = useState<SignedContract | null>(null);
  const [showContractModal, setShowContractModal] = useState(false);

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    try {
      const { data, error } = await supabase
        .from('signed_contracts')
        .select(`
          *,
          installation_appointments (
            customer_name,
            customer_email,
            customer_phone,
            customer_cpf,
            customer_address,
            customer_cep,
            plan_name,
            plan_speed,
            plan_price,
            appointment_date,
            appointment_period,
            status
          )
        `)
        .order('signed_at', { ascending: false });

      if (error) throw error;
      setContracts((data as any[])?.map(contract => ({
        ...contract,
        ip_address: contract.ip_address?.toString() || 'N/A'
      })) || []);
    } catch (error) {
      console.error('Error fetching contracts:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar contratos assinados.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredContracts = contracts.filter(contract =>
    contract.contract_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contract.installation_appointments?.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contract.installation_appointments?.customer_cpf.includes(searchTerm)
  );

  const handleViewContract = (contract: SignedContract) => {
    setSelectedContract(contract);
    setShowContractModal(true);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendente':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Pendente</Badge>;
      case 'agendado':
        return <Badge variant="outline" className="text-blue-600 border-blue-600">Agendado</Badge>;
      case 'instalado':
        return <Badge variant="outline" className="text-green-600 border-green-600">Instalado</Badge>;
      case 'cancelado':
        return <Badge variant="outline" className="text-red-600 border-red-600">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Carregando contratos...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5" />
            Contratos Assinados Digitalmente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar por número do contrato, nome ou CPF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Badge variant="outline" className="px-3 py-1">
              {filteredContracts.length} contratos
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Contracts List */}
      <div className="grid gap-4">
        {filteredContracts.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FileSignature className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'Nenhum contrato encontrado' : 'Nenhum contrato assinado'}
              </h3>
              <p className="text-gray-500">
                {searchTerm 
                  ? 'Tente ajustar os filtros de busca.' 
                  : 'Os contratos assinados digitalmente aparecerão aqui.'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredContracts.map((contract) => (
            <Card key={contract.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {contract.contract_number}
                    </h3>
                    <p className="text-gray-600">
                      {contract.installation_appointments?.customer_name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {contract.cpf_validated ? (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        CPF Validado
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        CPF Pendente
                      </Badge>
                    )}
                    {getStatusBadge(contract.installation_appointments?.status)}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <User className="h-4 w-4" />
                    <div>
                      <p className="font-medium">Cliente</p>
                      <p>{contract.installation_appointments?.customer_cpf}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Wifi className="h-4 w-4" />
                    <div>
                      <p className="font-medium">Plano</p>
                      <p>{contract.installation_appointments?.plan_name}</p>
                      <p>{contract.installation_appointments?.plan_speed}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <div>
                      <p className="font-medium">Instalação</p>
                      <p>{format(new Date(contract.installation_appointments?.appointment_date), "dd/MM/yyyy", { locale: ptBR })}</p>
                      <p>{contract.installation_appointments?.appointment_period === 'manha' ? 'Manhã' : 'Tarde'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="h-4 w-4" />
                    <div>
                      <p className="font-medium">Assinado em</p>
                      <p>{formatDate(contract.signed_at)}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-gray-500">
                    Valor: R$ {contract.installation_appointments?.plan_price.toFixed(2).replace('.', ',')}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewContract(contract)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Visualizar
                    </Button>
                    {contract.contract_pdf_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(contract.contract_pdf_url, '_blank')}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Contract Details Modal */}
      <Dialog open={showContractModal} onOpenChange={setShowContractModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Detalhes do Contrato - {selectedContract?.contract_number}
            </DialogTitle>
          </DialogHeader>

          {selectedContract && (
            <div className="space-y-6">
              {/* Contract Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Dados do Cliente</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Nome Completo</p>
                      <p className="text-base">{selectedContract.installation_appointments?.customer_name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">CPF</p>
                      <p className="text-base">{selectedContract.installation_appointments?.customer_cpf}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Email</p>
                      <p className="text-base">{selectedContract.installation_appointments?.customer_email}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Telefone</p>
                      <p className="text-base">{selectedContract.installation_appointments?.customer_phone}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Endereço</p>
                      <p className="text-base">{selectedContract.installation_appointments?.customer_address}</p>
                      <p className="text-sm text-gray-500">CEP: {selectedContract.installation_appointments?.customer_cep}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Dados do Contrato</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Número do Contrato</p>
                      <p className="text-base font-mono">{selectedContract.contract_number}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Plano Contratado</p>
                      <p className="text-base">{selectedContract.installation_appointments?.plan_name}</p>
                      <p className="text-sm text-gray-500">{selectedContract.installation_appointments?.plan_speed}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Valor Mensal</p>
                      <p className="text-base">R$ {selectedContract.installation_appointments?.plan_price.toFixed(2).replace('.', ',')}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Data de Instalação</p>
                      <p className="text-base">
                        {format(new Date(selectedContract.installation_appointments?.appointment_date), "dd/MM/yyyy", { locale: ptBR })} - 
                        {selectedContract.installation_appointments?.appointment_period === 'manha' ? ' Manhã' : ' Tarde'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Status</p>
                      {getStatusBadge(selectedContract.installation_appointments?.status)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Signature */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Assinatura Digital</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <div className="border rounded-lg p-4 bg-gray-50">
                        <img
                          src={selectedContract.signature_data}
                          alt="Assinatura Digital"
                          className="max-w-full h-auto border rounded"
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Data da Assinatura</p>
                        <p className="text-base">{formatDate(selectedContract.signed_at)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">CPF Validado</p>
                        <div className="flex items-center gap-2">
                          {selectedContract.cpf_validated ? (
                            <>
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span className="text-green-600">Sim</span>
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="h-4 w-4 text-yellow-600" />
                              <span className="text-yellow-600">Pendente</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">IP de Origem</p>
                        <p className="text-base font-mono">{selectedContract.ip_address}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Hash de Timestamp</p>
                        <p className="text-xs font-mono text-gray-600 break-all">
                          {selectedContract.timestamp_hash}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowContractModal(false)}>
                  Fechar
                </Button>
                {selectedContract.contract_pdf_url && (
                  <Button onClick={() => window.open(selectedContract.contract_pdf_url, '_blank')}>
                    <Download className="h-4 w-4 mr-2" />
                    Baixar PDF
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SignedContractsView;