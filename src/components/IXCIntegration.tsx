import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Search, CheckCircle, XCircle, Users, Database, Wifi, WifiOff, Activity } from 'lucide-react';
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
  const [onlineClients, setOnlineClients] = useState<any[]>([]);
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

  const loadOnlineClients = async () => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('ixc-integration', {
        body: { 
          action: 'getOnlineClients',
          params: { limit: 30, page: 1 }
        }
      });

      if (error) throw error;

      if (data.success) {
        setOnlineClients(data.data || []);
        toast.success(`${data.data?.length || 0} clientes online encontrados`);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Erro ao buscar clientes online:', error);
      toast.error('Erro ao buscar clientes online');
    } finally {
      setLoading(false);
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
      {/* Status da Conexão */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Integração IXC ERP
          </CardTitle>
          <CardDescription>
            Teste e configure a conexão com o sistema IXC para buscar dados dos clientes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button 
              onClick={testConnection} 
              disabled={connectionStatus === 'testing'}
              variant={connectionStatus === 'success' ? 'outline' : 'default'}
            >
              {connectionStatus === 'testing' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : connectionStatus === 'success' ? (
                <CheckCircle className="mr-2 h-4 w-4" />
              ) : connectionStatus === 'error' ? (
                <XCircle className="mr-2 h-4 w-4" />
              ) : null}
              {connectionStatus === 'testing' ? 'Testando...' : 'Testar Conexão'}
            </Button>

            {connectionStatus !== 'idle' && (
              <Badge 
                variant={connectionStatus === 'success' ? 'default' : 'destructive'}
              >
                {connectionStatus === 'success' ? 'Conectado' : 'Erro'}
              </Badge>
            )}
          </div>

          {connectionMessage && (
            <Alert>
              <AlertDescription>{connectionMessage}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Busca de Clientes */}
      {connectionStatus === 'success' && (
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
                  variant="outline"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
                  <Button 
                    onClick={loadCustomers} 
                    disabled={loading}
                  >
                    {loading ? 'Carregando...' : 'Carregar Todos'}
                  </Button>
                  <Button 
                    onClick={loadOnlineClients} 
                    disabled={loading}
                    variant="outline"
                  >
                    <Wifi className="mr-2 h-4 w-4" />
                    {loading ? 'Carregando...' : 'Clientes Online'}
                  </Button>
              </div>
            </div>

            {/* Lista de Clientes Online */}
            {onlineClients.length > 0 && (
              <div className="space-y-4">
                <Separator />
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-green-500" />
                  <h3 className="font-semibold">Clientes Online ({onlineClients.length})</h3>
                </div>
                <div className="grid gap-4 max-h-96 overflow-y-auto">
                  {onlineClients.map((client) => (
                    <Card 
                      key={client.id} 
                      className="cursor-pointer transition-colors hover:bg-muted/50"
                      onClick={() => setSelectedCustomer(client)}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">{client.razao || 'Sem nome'}</h4>
                              <Badge variant="default" className="bg-green-500">
                                <Wifi className="h-3 w-3 mr-1" />
                                Online
                              </Badge>
                            </div>
                            {client.connectionInfo?.ipAddress && (
                              <p className="text-sm text-muted-foreground">
                                IP: {client.connectionInfo.ipAddress}
                              </p>
                            )}
                            {client.connectionInfo?.sessionStart && (
                              <p className="text-sm text-muted-foreground">
                                Conectado desde: {new Date(client.connectionInfo.sessionStart).toLocaleString()}
                              </p>
                            )}
                            <p className="text-sm">
                              <span className="font-medium">Doc:</span> {formatDocument(client.cnpj_cpf)}
                            </p>
                          </div>
                          <Badge variant="outline">ID: {client.id}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

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
                      onClick={() => setSelectedCustomer(customer)}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <h4 className="font-semibold">{customer.razao || 'Sem nome'}</h4>
                            {(customer.nome_fantasia || (customer as any).fantasia) && (
                              <p className="text-sm text-muted-foreground">
                                {customer.nome_fantasia || (customer as any).fantasia}
                              </p>
                            )}
                            <p className="text-sm">
                              <span className="font-medium">Doc:</span> {formatDocument(customer.cnpj_cpf)}
                            </p>
                            {customer.email && (
                              <p className="text-sm">
                                <span className="font-medium">Email:</span> {customer.email}
                              </p>
                            )}
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
                  <CardTitle>Detalhes do Cliente</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>ID</Label>
                      <p className="font-mono">{selectedCustomer.id}</p>
                    </div>
                    <div>
                      <Label>Razão Social</Label>
                      <p>{selectedCustomer.razao}</p>
                    </div>
                    {selectedCustomer.nome_fantasia && (
                      <div>
                        <Label>Nome Fantasia</Label>
                        <p>{selectedCustomer.nome_fantasia}</p>
                      </div>
                    )}
                    <div>
                      <Label>CNPJ/CPF</Label>
                      <p>{formatDocument(selectedCustomer.cnpj_cpf)}</p>
                    </div>
                    {selectedCustomer.email && (
                      <div>
                        <Label>Email</Label>
                        <p>{selectedCustomer.email}</p>
                      </div>
                    )}
                    {selectedCustomer.telefone_comercial && (
                      <div>
                        <Label>Telefone Comercial</Label>
                        <p>{formatPhone(selectedCustomer.telefone_comercial)}</p>
                      </div>
                    )}
                    {selectedCustomer.telefone_celular && (
                      <div>
                        <Label>Celular</Label>
                        <p>{formatPhone(selectedCustomer.telefone_celular)}</p>
                      </div>
                    )}
                    {selectedCustomer.endereco && (
                      <div className="md:col-span-2">
                        <Label>Endereço</Label>
                        <p>
                          {selectedCustomer.endereco}
                          {selectedCustomer.numero && `, ${selectedCustomer.numero}`}
                          {selectedCustomer.bairro && `, ${selectedCustomer.bairro}`}
                          {selectedCustomer.cidade && `, ${selectedCustomer.cidade}`}
                          {selectedCustomer.uf && `/${selectedCustomer.uf}`}
                          {selectedCustomer.cep && ` - CEP: ${selectedCustomer.cep}`}
                        </p>
                      </div>
                    )}
                    {selectedCustomer.status && (
                      <div>
                        <Label>Status</Label>
                        <Badge>{selectedCustomer.status}</Badge>
                      </div>
                    )}
                  </div>
                  
                  {/* Verificação de Status Online */}
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between mb-4">
                      <Label className="text-base font-semibold">Status de Conexão</Label>
                      <Button 
                        onClick={() => checkCustomerStatus(selectedCustomer.id)}
                        disabled={statusLoading}
                        size="sm"
                        variant="outline"
                      >
                        {statusLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Activity className="h-4 w-4 mr-2" />
                        )}
                        Verificar Status
                      </Button>
                    </div>
                    
                    {customerStatus && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          {customerStatus.isOnline ? (
                            <div className="flex items-center gap-2 text-green-600">
                              <Wifi className="h-4 w-4" />
                              <span className="font-medium">Cliente Online</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-red-600">
                              <WifiOff className="h-4 w-4" />
                              <span className="font-medium">Cliente Offline</span>
                            </div>
                          )}
                        </div>
                        
                        {customerStatus.lastConnection && (
                          <p className="text-sm text-muted-foreground">
                            Última conexão: {new Date(customerStatus.lastConnection).toLocaleString()}
                          </p>
                        )}
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <Label>Contratos Totais</Label>
                            <p>{customerStatus.contractCount || 0}</p>
                          </div>
                          <div>
                            <Label>Contratos Ativos</Label>
                            <p>{customerStatus.activeContracts?.length || 0}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      )}

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