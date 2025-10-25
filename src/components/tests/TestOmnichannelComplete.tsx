import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Info, 
  MessageSquare, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  ClipboardList,
  MessageCircle,
  Search,
  User,
  Loader2,
  Database
} from "lucide-react";
import OmnichannelChat from "@/components/OmnichannelChat";

const TEST_CPFS = [
  // Cenários de Roteamento
  {
    cpf: "111.111.111-11",
    scenario: "Cliente OFFLINE + Sem Pendências",
    expected: "Luan Silva (Suporte Técnico)",
    color: "bg-blue-500",
    category: "Roteamento"
  },
  {
    cpf: "222.222.222-22",
    scenario: "Cliente OFFLINE + Bloqueado",
    expected: "Julia Martins (Financeiro)",
    color: "bg-purple-500",
    category: "Roteamento"
  },
  {
    cpf: "333.333.333-33",
    scenario: "Cliente ONLINE + Sem Pendências",
    expected: "Cloé Martins (aguarda intenção)",
    color: "bg-green-500",
    category: "Roteamento"
  },
  {
    cpf: "444.444.444-44",
    scenario: "Cliente ONLINE + Com Pendências",
    expected: "Julia Martins (Financeiro)",
    color: "bg-purple-500",
    category: "Roteamento"
  },
  {
    cpf: "999.999.999-99",
    scenario: "Cliente Novo (não existe)",
    expected: "Vicente (Vendas após 3 tentativas)",
    color: "bg-orange-500",
    category: "Roteamento"
  },
  
  // Cenários do Luan - Diagnóstico Técnico
  {
    cpf: "100.000.000-01",
    scenario: "🔌 OFFLINE - TX/RX = 0.00 (Sem Energia)",
    expected: "Luan detecta problema de ENERGIA",
    color: "bg-red-600",
    category: "Luan - TX/RX",
    details: "Equipamento desligado, TX: 0.00, RX: 0.00"
  },
  {
    cpf: "100.000.000-02",
    scenario: "🟡 OFFLINE - Sinal Fraco (RX: -26 dBm)",
    expected: "Luan detecta problema de cabo/conector",
    color: "bg-yellow-600",
    category: "Luan - TX/RX",
    details: "TX: 0.2, RX: -26.5 (fraco)"
  },
  {
    cpf: "100.000.000-03",
    scenario: "🔴 OFFLINE - Sinal Crítico (RX: -32 dBm)",
    expected: "Luan detecta problema GRAVE na rede",
    color: "bg-red-700",
    category: "Luan - TX/RX",
    details: "TX: -3.0, RX: -32.0 (crítico)"
  },
  {
    cpf: "100.000.000-04",
    scenario: "🟢 OFFLINE - Sinal OK (RX: -18 dBm)",
    expected: "Luan informa que sinal está OK",
    color: "bg-green-600",
    category: "Luan - TX/RX",
    details: "TX: 0.5, RX: -18.2 (excelente) - problema não é sinal"
  },
  {
    cpf: "100.000.000-05",
    scenario: "🚨 Mass Outage Ativo",
    expected: "Luan detecta mass outage (1542 clientes)",
    color: "bg-orange-600",
    category: "Luan - Mass Outage",
    details: "Pane massiva em Taguatinga/Samambaia - SRI"
  },
  {
    cpf: "100.000.000-06",
    scenario: "👥 Cliente com Múltiplos Contratos",
    expected: "Luan lista contratos e pergunta qual",
    color: "bg-cyan-600",
    category: "Luan - Outros",
    details: "2+ contratos ativos, precisa identificar qual está com problema"
  }
];

const VALIDATION_CHECKLIST = [
  // Roteamento Básico
  { id: 1, item: "✅ Cloé solicita CPF no início", category: "Roteamento" },
  { id: 2, item: "✅ Sistema consulta customer_contact_history antes do IXC", category: "Roteamento" },
  { id: 3, item: "✅ CPF é validado no formato correto", category: "Roteamento" },
  { id: 4, item: "✅ Tentativas são registradas no histórico", category: "Roteamento" },
  { id: 5, item: "✅ Cliente BLOQUEADO → Julia (Financeiro)", category: "Roteamento" },
  { id: 6, item: "✅ Cliente OFFLINE → Luan (Técnico)", category: "Roteamento" },
  { id: 7, item: "✅ Cliente ONLINE → Cloé continua", category: "Roteamento" },
  { id: 8, item: "✅ Protocolos são gerados (PROT-XXXXX)", category: "Roteamento" },
  { id: 9, item: "✅ Mensagens são salvas no banco", category: "Roteamento" },
  
  // Julia (Financeiro)
  { id: 10, item: "✅ Julia SEMPRE informa STATUS do cliente", category: "Julia" },
  { id: 11, item: "✅ Julia tenta desbloqueio automático", category: "Julia" },
  { id: 12, item: "✅ Julia SEMPRE envia PIX e Boleto", category: "Julia" },
  
  // Luan (Técnico) - Diagnóstico TX/RX
  { id: 13, item: "🔌 Luan detecta TX/RX = 0.00 (sem energia)", category: "Luan - TX/RX" },
  { id: 14, item: "🟡 Luan detecta sinal fraco (-26 a -28 dBm)", category: "Luan - TX/RX" },
  { id: 15, item: "🔴 Luan detecta sinal crítico (< -28 dBm)", category: "Luan - TX/RX" },
  { id: 16, item: "🟢 Luan identifica sinal OK mas offline", category: "Luan - TX/RX" },
  { id: 17, item: "✅ Luan abre atendimento IXC quando necessário", category: "Luan - TX/RX" },
  
  // Luan - Mass Outage
  { id: 18, item: "🚨 Luan detecta mass outage ativo", category: "Luan - Mass Outage" },
  { id: 19, item: "✅ Luan informa região afetada (SRI)", category: "Luan - Mass Outage" },
  { id: 20, item: "✅ Luan informa número de clientes afetados", category: "Luan - Mass Outage" },
  { id: 21, item: "✅ Luan NÃO faz reboot durante mass outage", category: "Luan - Mass Outage" },
  
  // Luan - Outros
  { id: 22, item: "👥 Luan lista múltiplos contratos corretamente", category: "Luan - Outros" },
  { id: 23, item: "✅ Luan pergunta qual contrato está com problema", category: "Luan - Outros" }
];

interface IXCClient {
  id: string;
  razao: string;
  cnpj_cpf: string;
  email?: string;
  fone1?: string;
  cidade?: string;
  bloqueado?: 'S' | 'N';
  situacao?: string;
}

export const TestOmnichannelComplete = () => {
  const [checkedItems, setCheckedItems] = useState<number[]>([]);
  const [searchCPF, setSearchCPF] = useState("");
  const [searchingIXC, setSearchingIXC] = useState(false);
  const [ixcClients, setIxcClients] = useState<IXCClient[]>([]);

  const toggleCheck = (id: number) => {
    setCheckedItems(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const searchIXCClient = async () => {
    if (!searchCPF || searchCPF.length < 11) {
      toast.error("CPF inválido. Digite um CPF com 11 dígitos.");
      return;
    }

    setSearchingIXC(true);
    try {
      const { data, error } = await supabase.functions.invoke('ixc-proxy', {
        body: {
          endpoint: 'cliente',
          method: 'GET',
          params: {
            qtype: 'cliente.cnpj_cpf',
            query: searchCPF.replace(/\D/g, ''),
            oper: '=',
            page: '1',
            rp: '10',
            sortname: 'cliente.id',
            sortorder: 'desc'
          }
        }
      });

      if (error) throw error;

      if (data?.registros && data.registros.length > 0) {
        setIxcClients(data.registros);
        toast.success(`${data.registros.length} cliente(s) encontrado(s)`);
      } else {
        setIxcClients([]);
        toast.info("Nenhum cliente encontrado com este CPF");
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      toast.error("Erro ao buscar cliente: " + err.message);
      setIxcClients([]);
    } finally {
      setSearchingIXC(false);
    }
  };

  const formatCPF = (cpf: string) => {
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return cpf;
  };

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Este teste valida o fluxo completo de atendimento omnichannel: desde a solicitação de CPF pela Cloé Martins 
          até o roteamento correto para Julia (Financeiro), Luan (Técnico) ou Vicente (Vendas).
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="test" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="test" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Chat
          </TabsTrigger>
          <TabsTrigger value="real-clients" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Clientes Reais
          </TabsTrigger>
          <TabsTrigger value="cpfs" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            CPFs Mock
          </TabsTrigger>
          <TabsTrigger value="validation" className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Checklist
          </TabsTrigger>
        </TabsList>

        <TabsContent value="test" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Chat Omnichannel - Ambiente de Teste
              </CardTitle>
              <CardDescription>
                Converse com a Cloé Martins e teste o roteamento automático
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Como testar:
                </h4>
                <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
                  <li>Cloé irá solicitar seu CPF</li>
                  <li>Use um dos CPFs de teste da aba "CPFs de Teste"</li>
                  <li>Observe o roteamento automático para o departamento correto</li>
                  <li>Verifique os logs no console do navegador (F12)</li>
                  <li>Valide que o protocolo foi gerado (PROT-XXXXX)</li>
                </ol>
              </div>

              <OmnichannelChat />

              <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
                <h4 className="font-semibold mb-2 flex items-center gap-2 text-amber-900 dark:text-amber-100">
                  <AlertTriangle className="h-4 w-4" />
                  Monitoramento:
                </h4>
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Abra o Console do navegador (F12 → Console) para ver os logs detalhados:
                  <code className="block mt-2 p-2 bg-amber-100 dark:bg-amber-900 rounded text-xs">
                    🧭 Routing Agent started<br />
                    📥 Message: [CPF redacted]<br />
                    📊 Histórico de contatos: {`{ hasHistory: false, contactCount: 0 }`}<br />
                    🧪 TEST CPF detected - using mock data<br />
                    🧪 MOCK: Cliente OFFLINE - roteando para Luan
                  </code>
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="real-clients" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Buscar Clientes Reais do IXC
              </CardTitle>
              <CardDescription>
                Busque clientes reais do IXC Soft por CPF para testar o Chat Omnichannel com dados reais
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <Input
                  placeholder="Digite o CPF (somente números)"
                  value={searchCPF}
                  onChange={(e) => setSearchCPF(e.target.value.replace(/\D/g, ''))}
                  maxLength={11}
                  className="flex-1"
                />
                <Button
                  onClick={searchIXCClient}
                  disabled={searchingIXC || searchCPF.length < 11}
                >
                  {searchingIXC ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Buscando...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Buscar
                    </>
                  )}
                </Button>
              </div>

              {ixcClients.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">
                    {ixcClients.length} cliente(s) encontrado(s):
                  </h4>
                  {ixcClients.map((client) => (
                    <Card key={client.id} className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3">
                            <User className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="font-semibold">{client.razao}</p>
                              <code className="text-xs text-muted-foreground">
                                ID IXC: {client.id}
                              </code>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-muted-foreground">CPF:</span>{' '}
                              <code className="font-mono">{formatCPF(client.cnpj_cpf)}</code>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Email:</span>{' '}
                              <span>{client.email || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Telefone:</span>{' '}
                              <span>{client.fone1 || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Cidade:</span>{' '}
                              <span>{client.cidade || 'N/A'}</span>
                            </div>
                          </div>

                          <div className="flex gap-2 pt-2">
                            <Badge variant={client.bloqueado === 'N' ? 'default' : 'destructive'}>
                              {client.bloqueado === 'N' ? '✓ Desbloqueado' : '⚠️ Bloqueado'}
                            </Badge>
                            <Badge variant="outline">
                              Status: {client.situacao || 'N/A'}
                            </Badge>
                          </div>
                        </div>

                        <Button
                          size="sm"
                          onClick={() => {
                            const cpf = formatCPF(client.cnpj_cpf);
                            navigator.clipboard.writeText(cpf);
                            toast.success(`CPF copiado: ${cpf}`);
                          }}
                        >
                          Copiar CPF
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Como usar:</strong> Busque um cliente real do IXC, copie o CPF e use no Chat de Teste 
                  para validar o comportamento com dados reais (status de conexão, bloqueios, contratos, etc).
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cpfs" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>CPFs de Teste (Mock Data)</CardTitle>
              <CardDescription>
                Use estes CPFs para testar todos os cenários sem depender do IXC real
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Agrupar por categoria */}
                {Array.from(new Set(TEST_CPFS.map(t => t.category))).map(category => (
                  <div key={category} className="space-y-3">
                    <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                      {category}
                    </h4>
                    <div className="space-y-3">
                      {TEST_CPFS.filter(t => t.category === category).map((test, index) => (
                        <Card key={test.cpf} className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-3">
                                <code className="text-base font-mono font-bold">
                                  {test.cpf}
                                </code>
                                <Badge className={`${test.color} text-white`}>
                                  {test.category}
                                </Badge>
                              </div>
                              
                              <div className="space-y-1">
                                <p className="text-sm">
                                  <span className="font-semibold">Cenário:</span> {test.scenario}
                                </p>
                                <p className="text-sm flex items-start gap-2">
                                  <span className="font-semibold whitespace-nowrap">Esperado:</span>
                                  <span>{test.expected}</span>
                                </p>
                                {test.details && (
                                  <p className="text-xs text-muted-foreground bg-muted p-2 rounded mt-2">
                                    💡 {test.details}
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                navigator.clipboard.writeText(test.cpf);
                              }}
                            >
                              Copiar
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}

                <Alert className="mt-6">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Validação Progressiva:</strong> Use o CPF <code>000.000.000-00</code> três vezes 
                    seguidas para testar as mensagens progressivas (1ª, 2ª e 3ª tentativa) e transferência 
                    para vendas após falhas.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="validation" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Checklist de Validação
              </CardTitle>
              <CardDescription>
                Marque os itens conforme valida cada funcionalidade
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Agrupar checklist por categoria */}
                {Array.from(new Set(VALIDATION_CHECKLIST.map(i => i.category))).map(category => (
                  <div key={category} className="space-y-2">
                    <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                      {category}
                    </h4>
                    <div className="space-y-2">
                      {VALIDATION_CHECKLIST.filter(i => i.category === category).map((item) => (
                        <div
                          key={item.id}
                          className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                          onClick={() => toggleCheck(item.id)}
                        >
                          <div className="mt-0.5">
                            {checkedItems.includes(item.id) ? (
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                            ) : (
                              <XCircle className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className={`text-sm ${checkedItems.includes(item.id) ? 'line-through text-muted-foreground' : ''}`}>
                              {item.item}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">Progresso do Teste</p>
                    <p className="text-sm text-muted-foreground">
                      {checkedItems.length} de {VALIDATION_CHECKLIST.length} itens validados
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-3xl font-bold">
                      {Math.round((checkedItems.length / VALIDATION_CHECKLIST.length) * 100)}%
                    </div>
                    {checkedItems.length === VALIDATION_CHECKLIST.length && (
                      <CheckCircle2 className="h-8 w-8 text-green-600" />
                    )}
                  </div>
                </div>
              </div>

              {checkedItems.length === VALIDATION_CHECKLIST.length && (
                <Alert className="mt-4 border-green-600 bg-green-50 dark:bg-green-950">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-900 dark:text-green-100">
                    <strong>🎉 Parabéns!</strong> Todos os testes foram validados com sucesso! 
                    O sistema omnichannel está funcionando corretamente.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Próximos Passos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2 list-decimal list-inside text-sm">
            <li>Validar todos os cenários de teste acima</li>
            <li>Verificar logs no console do navegador</li>
            <li>Consultar tabelas do banco: <code className="text-xs bg-muted px-1 py-0.5 rounded">conversations</code>, <code className="text-xs bg-muted px-1 py-0.5 rounded">conversation_messages</code>, <code className="text-xs bg-muted px-1 py-0.5 rounded">customer_contact_history</code></li>
            <li>Testar com IXC real (não mock) em ambiente de homologação</li>
            <li>Validar integração WhatsApp com routing-agent</li>
            <li>Testar detecção de mass outage em produção</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
};
