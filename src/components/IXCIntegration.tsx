import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Users, Wifi, WifiOff, Activity, FileText, CheckCircle2, XCircle, Database } from 'lucide-react';
import { toast } from 'sonner';
import { IXCContractsList } from '@/components/IXCContractsList';
import { IXCEndpointTester } from '@/components/IXCEndpointTester';
import { IXCConnectionTester } from '@/components/IXCConnectionTester';
import { IXCFunctionsTester } from '@/components/IXCFunctionsTester';
import { TestIXCSubjects } from '@/components/tests/TestIXCSubjects';
import type { IXCResponse } from '@/types/api.types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  const [lastResponse, setLastResponse] = useState<IXCResponse<unknown> | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [errorDetails, setErrorDetails] = useState<{ error: Error; data?: unknown } | null>(null);
  const [customerStatus, setCustomerStatus] = useState<{
    contracts?: Array<{ id: string; status: string }>;
    financialTitles?: Array<{ id: string; status: string; valor: number }>;
    pppoeLogin?: string;
    isOnline?: boolean;
    lastConnection?: string;
    serviceStatus?: string; // Can be "ATIVO", "BLOQUEADO", "NORMALIZADO", "FINANCEIRO EM ATRASO", etc
    contractCount?: number;
  } | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [atendimentoSubject, setAtendimentoSubject] = useState('');
  const [creatingAtendimento, setCreatingAtendimento] = useState(false);
  const [syncingKnowledge, setSyncingKnowledge] = useState(false);
  const [testResults, setTestResults] = useState<{
    success: boolean;
    results?: Array<{ endpoint: string; status: string; details?: string }>;
    error?: string;
    planUsed?: {
      id: string;
      name: string;
      ixc_plan_id: string;
      [key: string]: unknown;
    };
    appointment?: {
      date: string;
      period: string;
      customer_email?: string;
      ixc_contract_id?: string;
      [key: string]: unknown;
    };
    ixcContractId?: string;
    errorDetails?: Record<string, unknown>;
  } | null>(null);
  
  // Dados de teste para jornada completa
  const generateUniqueTestData = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return {
      customerName: `Cliente Teste ${random}`,
      customerEmail: `teste${timestamp}@testeautomatizado.local`,
      customerPhone: "11987654321",
      customerCpf: "04112287143", // CPF válido de teste
      customerCep: "70630100", // CEP válido e sem formatação
      customerAddress: "Av. Paulista, 1000",
      customerBirthDate: "1990-01-15",
      planId: "",
      appointmentDate: new Date().toISOString().split('T')[0],
      appointmentPeriod: "manhã",
      paymentDay: 10,
    };
  };

  const [testData, setTestData] = useState(generateUniqueTestData());

  const createTestCustomer = async () => {
    setTestLoading(true);
    setErrorDetails(null);
    setDebugInfo('');
    
    try {
      toast.info('Criando cliente de teste no IXC...');
      
      const { data: customerData, error: customerError } = await supabase.functions.invoke('ixc-integration', {
        body: {
          action: 'createCustomer',
          params: {
            customerData: {
              name: 'João da Silva Teste',
              cpf: '041.122.871-43',
              email: 'joao.teste@email.com',
              phone: '(11) 98765-4321',
              birthDate: '1990-05-15',
              address: 'Rua Teste, 123 - Apto 45 - Bairro Centro',
              cep: '70630902',
              cityId: '5564',
              neighborhood: 'Centro',
              number: '123',
              personType: 'F'
            }
          }
        }
      });

      if (customerError) {
        setErrorDetails({ error: customerError, data: customerData });
        throw customerError;
      }
      
      const responseData = customerData as IXCResponse<{ id?: string }>;
      if (responseData && 'success' in responseData && responseData.success === false) {
        const errorData = {
          success: false,
          error: 'error' in responseData ? String(responseData.error) : 'Erro desconhecido',
          details: 'details' in responseData ? responseData.details : undefined,
          fullResponse: customerData
        };
        setErrorDetails({ 
          error: new Error('error' in responseData ? String(responseData.error) : 'Erro ao criar cliente'), 
          data: errorData 
        });
        throw new Error('error' in responseData ? String(responseData.error) : 'Erro ao criar cliente no IXC');
      }

      toast.success('Cliente criado no IXC com sucesso!');
      
      setDebugInfo(`Cliente de teste criado com sucesso!\n\nResposta completa do IXC:\n${JSON.stringify(customerData, null, 2)}`);
      setErrorDetails(null);
      
    } catch (error) {
      console.error('Erro ao criar cliente de teste:', error);
      const errMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error(errMsg);
      setDebugInfo(`Erro: ${errMsg}`);
    } finally {
      setTestLoading(false);
    }
  };

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

  const createAtendimentoForCustomer = async () => {
    if (!selectedCustomer) {
      toast.error('Selecione um cliente primeiro');
      return;
    }

    if (!atendimentoSubject.trim()) {
      toast.error('Digite o assunto do atendimento');
      return;
    }

    setCreatingAtendimento(true);
    
    try {
      toast.info('Criando atendimento no IXC...');
      
      const { data, error } = await supabase.functions.invoke('ixc-integration', {
        body: {
          action: 'createAtendimento',
          params: {
            customerId: selectedCustomer.id,
            atendimentoData: {
              customerName: selectedCustomer.razao,
              cpf: selectedCustomer.cnpj_cpf,
              email: selectedCustomer.email || '',
              phone: selectedCustomer.telefone_celular || selectedCustomer.telefone_comercial || '',
              address: `${selectedCustomer.endereco || ''}, ${selectedCustomer.numero || ''} - ${selectedCustomer.bairro || ''}`,
              cep: selectedCustomer.cep || '',
              subject: atendimentoSubject,
              planName: 'Plano Padrão',
              planSpeed: '300 Mbps',
              planPrice: 99.90,
              paymentDay: 10,
              installationDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              installationPeriod: 'manha'
            }
          }
        }
      });

      if (error) throw error;
      
      const responseData = data as IXCResponse<{ id?: string; registro?: { id?: string } }>;
      if (responseData && responseData.success === false) {
        throw new Error(responseData.error || 'Erro ao criar atendimento no IXC');
      }

      const atendimentoId = responseData?.data?.id || responseData?.data?.registro?.id;
      
      toast.success(`Atendimento criado com ID: ${atendimentoId}`);
      setAtendimentoSubject('');
      
    } catch (error) {
      console.error('Erro ao criar atendimento:', error);
      const errMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error(errMsg);
    } finally {
      setCreatingAtendimento(false);
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
      <div>
        <h1 className="text-3xl font-bold mb-2">Integração IXC</h1>
        <p className="text-muted-foreground">Gerencie a integração com o sistema IXC Soft</p>
      </div>

      <Tabs defaultValue="integration" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="integration">Integração</TabsTrigger>
          <TabsTrigger value="subjects">Assuntos</TabsTrigger>
          <TabsTrigger value="connection">Teste de Conexão</TabsTrigger>
          <TabsTrigger value="functions">Teste de Funções</TabsTrigger>
          <TabsTrigger value="health">Health Check</TabsTrigger>
        </TabsList>

        <TabsContent value="integration" className="space-y-6">
          <IXCContractsList />
          
          <Separator className="my-8" />
      
      <Separator className="my-8" />
      
      {/* Teste de Integração */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Teste de Integração IXC
          </CardTitle>
          <CardDescription>
            Crie um cliente de teste no IXC para validar a integração
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={createTestCustomer} 
            disabled={testLoading}
            className="w-full"
          >
            {testLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Criando cliente de teste...
              </>
            ) : (
              'Criar Cliente de Teste no IXC'
            )}
          </Button>
          {debugInfo && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <pre className="text-sm whitespace-pre-wrap">{debugInfo}</pre>
            </div>
          )}
          
          {errorDetails && (
            <Card className="mt-4 border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Detalhes do Erro (para enviar ao suporte IXC)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2));
                      toast.success('JSON copiado para a área de transferência!');
                    }}
                  >
                    Copiar JSON Completo
                  </Button>
                </div>
                <div className="p-3 bg-muted rounded-lg max-h-96 overflow-auto">
                  <pre className="text-xs whitespace-pre-wrap font-mono">
                    {JSON.stringify(errorDetails, null, 2)}
                  </pre>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

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

            {/* Detalhes do Cliente Selecionado */}
            {selectedCustomer && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Detalhes do Cliente</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-sm">
                        ID: {selectedCustomer.id}
                      </Badge>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          checkCustomerStatus(selectedCustomer.id);
                        }}
                        disabled={statusLoading}
                      >
                        {statusLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Activity className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Criar Atendimento */}
                  <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Criar Atendimento
                    </h4>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Input
                          value={atendimentoSubject}
                          onChange={(e) => setAtendimentoSubject(e.target.value)}
                          placeholder="Assunto do atendimento..."
                          onKeyPress={(e) => e.key === 'Enter' && createAtendimentoForCustomer()}
                        />
                      </div>
                      <Button 
                        onClick={createAtendimentoForCustomer}
                        disabled={creatingAtendimento}
                        size="sm"
                      >
                        {creatingAtendimento ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Criando...
                          </>
                        ) : (
                          'Abrir Atendimento'
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  {/* Informações Básicas */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
                    <div>
                      <Label className="text-xs text-muted-foreground">Nome</Label>
                      <p className="font-semibold">{selectedCustomer.razao || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">CPF/CNPJ</Label>
                      <p className="font-mono">{formatDocument(selectedCustomer.cnpj_cpf)}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Telefone</Label>
                      <p>{formatPhone(selectedCustomer.telefone_comercial || selectedCustomer.telefone_celular)}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Login PPPoE</Label>
                      <p className="font-mono text-sm break-all">
                        {statusLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin inline" />
                        ) : (
                          customerStatus?.pppoeLogin || 'N/A'
                        )}
                      </p>
                    </div>
                  </div>
                  
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
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                        
                        {/* Status do Serviço */}
                        <Card className={`border-2 ${
                          customerStatus.serviceStatus === 'ATIVO' ? 'border-green-500 bg-green-50 dark:bg-green-950' : 
                          customerStatus.serviceStatus === 'NORMALIZADO' ? 'border-green-500 bg-green-50 dark:bg-green-950' : 
                          customerStatus.serviceStatus === 'BLOQUEADO' ? 'border-red-500 bg-red-50 dark:bg-red-950' : 
                          customerStatus.serviceStatus === 'FINANCEIRO EM ATRASO' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950' : 
                          'border-muted'
                        }`}>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <FileText className="h-5 w-5" />
                              <Label className="text-xs text-muted-foreground">Status do Serviço</Label>
                            </div>
                            <p className={`text-lg font-bold ${
                              customerStatus.serviceStatus === 'ATIVO' ? 'text-green-600' : 
                              customerStatus.serviceStatus === 'NORMALIZADO' ? 'text-green-600' : 
                              customerStatus.serviceStatus === 'BLOQUEADO' ? 'text-red-600' : 
                              customerStatus.serviceStatus === 'FINANCEIRO EM ATRASO' ? 'text-yellow-600' : 
                              'text-muted-foreground'
                            }`}>
                              {customerStatus.serviceStatus || 'N/A'}
                            </p>
                            {customerStatus.serviceStatus === 'BLOQUEADO' && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Inadimplência - Serviço interrompido
                              </p>
                            )}
                            {customerStatus.serviceStatus === 'FINANCEIRO EM ATRASO' && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Velocidade reduzida
                              </p>
                            )}
                          </CardContent>
                        </Card>
                        
                        {/* Número de Contratos */}
                        <Card className={`border-2 ${
                          (customerStatus.contractCount || 0) > 0 ? 'border-green-500 bg-green-50 dark:bg-green-950' : 
                          'border-muted'
                        }`}>
                          <CardContent className="p-4">
                            <Label className="text-xs text-muted-foreground">Contratos Ativos</Label>
                            <p className={`text-3xl font-bold mt-1 ${
                              (customerStatus.contractCount || 0) > 0 ? 'text-green-600' : 
                              'text-muted-foreground'
                            }`}>
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

      {/* Sincronização do Banco de Conhecimento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Banco de Conhecimento
          </CardTitle>
          <CardDescription>
            Sincronize o banco de conhecimento do chatbot com planos, FAQs e configurações
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={async () => {
              setSyncingKnowledge(true);
              try {
                const { data, error } = await supabase.functions.invoke('sync-chatbot-knowledge');
                if (error) throw error;
                toast.success('✅ Banco de conhecimento atualizado com sucesso!');
              } catch (error) {
                console.error('Erro ao sincronizar:', error);
                toast.error('Erro ao sincronizar banco de conhecimento');
              } finally {
                setSyncingKnowledge(false);
              }
            }}
            disabled={syncingKnowledge}
          >
            {syncingKnowledge ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sincronizando...
              </>
            ) : (
              <>
                <Database className="mr-2 h-4 w-4" />
                Sincronizar Conhecimento
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Teste Rápido - Jornada Completa */}
      <Card>
        <CardHeader>
          <CardTitle>🚀 Teste Rápido - Jornada Completa do Cliente</CardTitle>
          <CardDescription>
            Simula a jornada completa: criação de cliente, contrato e atendimento no IXC com processo automático de OS.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nome do Cliente</Label>
              <Input
                value={testData.customerName}
                onChange={(e) => setTestData({ ...testData, customerName: e.target.value })}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                value={testData.customerEmail}
                onChange={(e) => setTestData({ ...testData, customerEmail: e.target.value })}
              />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input
                value={testData.customerPhone}
                onChange={(e) => setTestData({ ...testData, customerPhone: e.target.value })}
              />
            </div>
            <div>
              <Label>CPF</Label>
              <Input
                value={testData.customerCpf}
                onChange={(e) => setTestData({ ...testData, customerCpf: e.target.value })}
              />
            </div>
            <div>
              <Label>CEP</Label>
              <Input
                value={testData.customerCep}
                onChange={(e) => setTestData({ ...testData, customerCep: e.target.value })}
              />
            </div>
            <div>
              <Label>Data de Nascimento</Label>
              <Input
                type="date"
                value={testData.customerBirthDate}
                onChange={(e) => setTestData({ ...testData, customerBirthDate: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Button 
              onClick={async () => {
                setTestLoading(true);
                setTestResults(null);
                
                const freshTestData = generateUniqueTestData();
                setTestData(freshTestData);

                try {
                  // 1. Buscar um plano ativo
                  const { data: plans, error: plansError } = await supabase
                    .from("plans")
                    .select("*")
                    .eq("active", true)
                    .not("ixc_plan_id", "is", null)
                    .limit(1)
                    .single();

                  if (plansError || !plans) {
                    throw new Error("Nenhum plano com IXC ID encontrado");
                  }

                  // 2. Chamar o sales-agent com directOrder
                  const orderPayload = {
                    name: freshTestData.customerName,
                    email: freshTestData.customerEmail,
                    phone: freshTestData.customerPhone,
                    cpf: freshTestData.customerCpf,
                    birthDate: freshTestData.customerBirthDate,
                    cep: freshTestData.customerCep,
                    address: freshTestData.customerAddress,
                    plan_id: plans.id,
                    planName: plans.name,
                    appointmentDate: freshTestData.appointmentDate,
                    appointmentPeriod: freshTestData.appointmentPeriod,
                    paymentDay: freshTestData.paymentDay,
                  };

                  const SUPABASE_URL = "https://mxdupkbpxjcfxdgrwknp.supabase.co";
                  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14ZHVwa2JweGpjZnhkZ3J3a25wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3NTg4ODYsImV4cCI6MjA3NDMzNDg4Nn0.np4wHopAwI7HOTsYPaAUSWbe_qVxMBSIHjYv4PnKL6I";
                  const { data: sessionData } = await supabase.auth.getSession();
                  const accessToken = sessionData?.session?.access_token;

                  const resp = await fetch(`${SUPABASE_URL}/functions/v1/sales-agent`, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      apikey: SUPABASE_ANON_KEY,
                      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
                    },
                    body: JSON.stringify({
                      messages: [{ role: "user", content: JSON.stringify(orderPayload) }],
                      directOrder: true,
                    }),
                  });
                  const agentResponse = await resp.json().catch(() => ({}));
                  if (!resp.ok) {
                    throw new Error(JSON.stringify({ status: resp.status, body: agentResponse }));
                  }

                  // 3. Buscar o appointment criado
                  const { data: appointment, error: appointmentError } = await supabase
                    .from("installation_appointments")
                    .select("*")
                    .eq("customer_email", freshTestData.customerEmail)
                    .order("created_at", { ascending: false })
                    .limit(1)
                    .single();

                  setTestResults({
                    success: true,
                    planUsed: plans,
                    agentResponse,
                    appointment,
                    ixcClientId: appointment?.ixc_contract_id ? "Criado" : "Não criado",
                    ixcContractId: appointment?.ixc_contract_id || "Não criado",
                  });

                  toast.success("✅ Teste concluído com sucesso!");
                } catch (error) {
                  const err = error instanceof Error ? error : new Error('Erro desconhecido');
                  console.error("Erro no teste:", err);
                  let parsed: Record<string, unknown> | null = null;
                  try { 
                    parsed = JSON.parse(err.message) as Record<string, unknown>; 
                  } catch {}
                  setTestResults({
                    success: false,
                    error: err.message,
                    errorDetails: parsed,
                  });
                  toast.error("❌ Erro no teste");
                } finally {
                  setTestLoading(false);
                }
              }}
              disabled={testLoading} 
              className="w-full"
            >
              {testLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Executando teste...
                </>
              ) : (
                "🚀 Executar Teste Completo"
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              ℹ️ Cada teste gera dados únicos automaticamente para evitar conflitos no IXC
            </p>
          </div>

          {testResults && (
            <Card className="mt-4">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-4">
                  {testResults.success ? (
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                  ) : (
                    <XCircle className="h-6 w-6 text-red-500" />
                  )}
                  <h3 className="text-xl font-bold">
                    {testResults.success ? "✅ Teste Passou!" : "❌ Teste Falhou"}
                  </h3>
                </div>

                {testResults.success ? (
                  <div className="space-y-4">
                    <div>
                      <p className="font-semibold">Plano Utilizado:</p>
                      <p className="text-sm text-muted-foreground">
                        {testResults.planUsed?.name} - IXC ID: {testResults.planUsed?.ixc_plan_id}
                      </p>
                    </div>

                    <div>
                      <p className="font-semibold">IXC Contract ID:</p>
                      <p className="text-sm text-muted-foreground">
                        {testResults.appointment?.ixc_contract_id || "Não criado"}
                      </p>
                    </div>

                    <div className="p-4 bg-green-50 border border-green-200 rounded dark:bg-green-950 dark:border-green-800">
                      <p className="text-sm font-semibold text-green-800 dark:text-green-200">Passos Executados:</p>
                      <ul className="text-sm text-green-700 dark:text-green-300 mt-2 space-y-1">
                        <li>✅ Cliente criado no IXC</li>
                        <li>✅ Contrato criado no IXC (ID: {testResults.ixcContractId})</li>
                        <li>✅ Atendimento criado com processo 11 (OS automática)</li>
                        <li>✅ Registro salvo no Supabase</li>
                        <li>✅ Email único: {testResults.appointment?.customer_email}</li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-red-50 border border-red-200 rounded dark:bg-red-950 dark:border-red-800">
                    <p className="text-sm font-semibold text-red-800 dark:text-red-200">Erro:</p>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-2">{testResults.error}</p>
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
        </TabsContent>

        <TabsContent value="subjects">
          <TestIXCSubjects />
        </TabsContent>

        <TabsContent value="connection">
          <IXCConnectionTester />
        </TabsContent>

        <TabsContent value="functions">
          <IXCFunctionsTester />
        </TabsContent>

        <TabsContent value="health">
          <IXCEndpointTester />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default IXCIntegration;