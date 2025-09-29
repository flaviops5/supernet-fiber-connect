import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Users, Wifi, WifiOff, Activity, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface IXCCustomer {
  id: string;
  razao: string;
  nome_fantasia?: string;
  cnpj_cpf: string;
  email?: string;
  telefone_comercial?: string;
  telefone_celular?: string;
  endereco?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  status?: string;
}

const IXCIntegration = () => {
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [connectionMessage, setConnectionMessage] = useState('');
  const [customers, setCustomers] = useState<IXCCustomer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<IXCCustomer | null>(null);
  const [lastResponse, setLastResponse] = useState<any>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [customerStatus, setCustomerStatus] = useState<any>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const testConnection = async () => {
    setConnectionStatus('testing');
    setConnectionMessage('');
    
    try {
      const { data, error } = await supabase.functions.invoke('ixc-integration', {
        body: { action: 'testConnection' }
      });

      if (error) throw error;

      if (data.success) {
        setConnectionStatus('success');
        setConnectionMessage(data.data.message);
        toast.success('Conexão estabelecida com sucesso!');
      } else {
        setConnectionStatus('error');
        setConnectionMessage(data.error);
        toast.error('Erro na conexão');
      }
    } catch (error) {
      console.error('Erro ao testar conexão:', error);
      setConnectionStatus('error');
      setConnectionMessage('Erro ao conectar com IXC ERP');
      toast.error('Erro ao conectar com IXC ERP');
    }
  };

  const loadCustomers = async () => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('ixc-integration', {
        body: { 
          action: 'getCustomers',
          params: { limit: 50, page: 1 }
        }
      });

      if (error) throw error;

      if (data.success) {
        setCustomers(data.data || []);
        setLastResponse(data);
        setDebugInfo(`Carregar Todos - Encontrados: ${data.data?.length || 0} registros`);
        toast.success(`${data.data?.length || 0} clientes carregados`);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      toast.error('Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  };

  const searchCustomers = async () => {
    if (!searchQuery.trim()) {
      toast.error('Digite um termo para buscar');
      return;
    }

    setLoading(true);
    setSelectedCustomer(null);
    setCustomerStatus(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('ixc-integration', {
        body: { 
          action: 'searchCustomers',
          params: { query: searchQuery }
        }
      });

      if (error) throw error;

      if (data.success) {
        setCustomers(data.data || []);
        setLastResponse(data);
        setDebugInfo(`Busca "${searchQuery}" - Encontrados: ${data.data?.length || 0} registros`);
        
        // Se encontrou apenas 1 cliente, seleciona automaticamente e busca status
        if (data.data?.length === 1) {
          const customer = data.data[0];
          setSelectedCustomer(customer);
          await checkCustomerStatus(customer.id);
        }
        
        toast.success(`${data.data?.length || 0} clientes encontrados`);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      toast.error('Erro ao buscar clientes');
    } finally {
      setLoading(false);
    }
  };

  const checkCustomerStatus = async (customerId: string) => {
    setStatusLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('ixc-integration', {
        body: { 
          action: 'getCustomerStatus',
          params: { id: customerId }
        }
      });

      if (error) throw error;

      if (data.success) {
        setCustomerStatus(data.data);
        toast.success('Status verificado com sucesso');
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error);
      toast.error('Erro ao verificar status do cliente');
    } finally {
      setStatusLoading(false);
    }
  };


  const formatPhone = (phone?: string) => {
    if (!phone) return 'N/A';
    return phone.replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3');
  };

  const formatDocument = (doc?: string) => {
    if (!doc) return 'N/A';
    if (doc.length === 11) {
      return doc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (doc.length === 14) {
      return doc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return doc;
  };

  return (
    <div className="space-y-6">
      {/* Busca de Clientes */}
      <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Buscar Clientes
            </CardTitle>
            <CardDescription>
              Busque e visualize dados dos clientes do IXC ERP
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="search">Buscar por nome/razão social</Label>
                <Input
                  id="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Digite o nome do cliente..."
                  onKeyPress={(e) => e.key === 'Enter' && searchCustomers()}
                />
              </div>
              <div className="flex items-end gap-2">
                <Button 
                  onClick={searchCustomers} 
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Buscando...
                    </>
                  ) : (
                    'Buscar'
                  )}
                </Button>
                <Button 
                  onClick={loadCustomers} 
                  disabled={loading}
                  variant="outline"
                >
                  {loading ? 'Carregando...' : 'Carregar Todos'}
                </Button>
              </div>
            </div>


            {/* Lista de Clientes */}
            {customers.length > 0 && (
              <div className="space-y-4">
                <Separator />
                <div className="grid gap-4 max-h-96 overflow-y-auto">
                  {customers.map((customer) => (
                     <Card 
                      key={customer.id} 
                      className={`cursor-pointer transition-colors ${
                        selectedCustomer?.id === customer.id ? 'bg-muted' : 'hover:bg-muted/50'
                      }`}
                      onClick={() => {
                        setSelectedCustomer(customer);
                        checkCustomerStatus(customer.id);
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <h4 className="font-semibold">{customer.razao || 'Sem nome'}</h4>
                            <p className="text-sm">
                              <span className="font-medium">Doc:</span> {formatDocument(customer.cnpj_cpf)}
                            </p>
                            {(customer.telefone_comercial || customer.telefone_celular) && (
                              <p className="text-sm">
                                <span className="font-medium">Fone:</span> {
                                  formatPhone(customer.telefone_comercial || customer.telefone_celular)
                                }
                              </p>
                            )}
                          </div>
                          <Badge variant="outline">ID: {customer.id}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Detalhes do Cliente Selecionado */}
            {selectedCustomer && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Detalhes do Cliente</span>
                    <Badge variant="outline" className="text-sm">
                      ID: {selectedCustomer.id}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Informações Básicas */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="border-2">
                      <CardContent className="p-4">
                        <Label className="text-xs text-muted-foreground">Nome do Cliente</Label>
                        <p className="text-lg font-semibold mt-1">{selectedCustomer.razao}</p>
                      </CardContent>
                    </Card>
                    
                    <Card className="border-2">
                      <CardContent className="p-4">
                        <Label className="text-xs text-muted-foreground">CPF/CNPJ</Label>
                        <p className="text-lg font-mono font-semibold mt-1">{formatDocument(selectedCustomer.cnpj_cpf)}</p>
                      </CardContent>
                    </Card>
                    
                    <Card className="border-2">
                      <CardContent className="p-4">
                        <Label className="text-xs text-muted-foreground">Celular</Label>
                        <p className="text-lg font-semibold mt-1">
                          {formatPhone(selectedCustomer.telefone_celular || selectedCustomer.telefone_comercial)}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <Separator />
                  
                  {/* Status do Cliente */}
                  {statusLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin" />
                      <span className="ml-2">Carregando informações de conexão...</span>
                    </div>
                  ) : customerStatus ? (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Dashboard de Conexão
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Status de Conexão */}
                        <Card className={`border-2 ${
                          customerStatus.isOnline === true ? 'border-green-500 bg-green-50 dark:bg-green-950' : 
                          customerStatus.isOnline === false ? 'border-red-500 bg-red-50 dark:bg-red-950' : 
                          'border-muted'
                        }`}>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-2">
                              {customerStatus.isOnline === true ? (
                                <Wifi className="h-5 w-5 text-green-600" />
                              ) : (
                                <WifiOff className="h-5 w-5 text-red-600" />
                              )}
                              <Label className="text-xs text-muted-foreground">Status de Conexão</Label>
                            </div>
                            <p className={`text-xl font-bold ${
                              customerStatus.isOnline === true ? 'text-green-600' : 
                              customerStatus.isOnline === false ? 'text-red-600' : 
                              'text-muted-foreground'
                            }`}>
                              {customerStatus.isOnline === true ? 'ONLINE' : 
                               customerStatus.isOnline === false ? 'OFFLINE' : 
                               'N/A'}
                            </p>
                            {customerStatus.lastConnection && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Última: {new Date(customerStatus.lastConnection).toLocaleString('pt-BR', { 
                                  day: '2-digit', 
                                  month: '2-digit', 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                        
                        {/* Status de Acesso */}
                        <Card className={`border-2 ${
                          customerStatus.accessStatus?.statusDeAcesso === 'ATIVO' ? 'border-green-500 bg-green-50 dark:bg-green-950' : 
                          customerStatus.accessStatus?.statusDeAcesso === 'BLOQUEADO' ? 'border-red-500 bg-red-50 dark:bg-red-950' : 
                          customerStatus.accessStatus?.statusDeAcesso === 'FINANCEIRO EM ATRASO' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950' : 
                          'border-muted'
                        }`}>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <FileText className="h-5 w-5" />
                              <Label className="text-xs text-muted-foreground">Status de Acesso</Label>
                            </div>
                            <p className={`text-lg font-bold ${
                              customerStatus.accessStatus?.statusDeAcesso === 'ATIVO' ? 'text-green-600' : 
                              customerStatus.accessStatus?.statusDeAcesso === 'BLOQUEADO' ? 'text-red-600' : 
                              customerStatus.accessStatus?.statusDeAcesso === 'FINANCEIRO EM ATRASO' ? 'text-yellow-600' : 
                              'text-muted-foreground'
                            }`}>
                              {customerStatus.accessStatus?.statusDeAcesso || 'N/A'}
                            </p>
                          </CardContent>
                        </Card>
                        
                        {/* Login PPPoE */}
                        <Card className="border-2">
                          <CardContent className="p-4">
                            <Label className="text-xs text-muted-foreground">Login PPPoE</Label>
                            <p className="text-lg font-mono font-semibold mt-1 break-all">
                              {customerStatus.pppoeLogin || 'N/A'}
                            </p>
                          </CardContent>
                        </Card>
                        
                        {/* Número de Contratos */}
                        <Card className="border-2">
                          <CardContent className="p-4">
                            <Label className="text-xs text-muted-foreground">Contratos</Label>
                            <p className="text-3xl font-bold mt-1">
                              {customerStatus.contractCount || 0}
                            </p>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  ) : (
                    <div className="p-12 rounded-lg border-2 border-dashed border-muted bg-muted/30 text-center">
                      <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">Selecione um cliente para ver o status</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>

      {/* Debug Information */}
      {debugInfo && (
        <Card>
          <CardHeader>
            <CardTitle>Informações de Debug</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label>Status da Última Consulta</Label>
                <p className="text-sm bg-muted p-2 rounded">{debugInfo}</p>
              </div>
              
              {lastResponse && (
                <div>
                  <Label>Resposta Completa da API</Label>
                  <pre className="text-xs bg-muted p-4 rounded overflow-auto max-h-96">
                    {JSON.stringify(lastResponse, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default IXCIntegration;