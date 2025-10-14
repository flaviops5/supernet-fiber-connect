import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Info, 
  MessageSquare, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  ClipboardList,
  MessageCircle
} from "lucide-react";
import OmnichannelChat from "@/components/OmnichannelChat";

const TEST_CPFS = [
  {
    cpf: "111.111.111-11",
    scenario: "Cliente OFFLINE + Sem Pendências",
    expected: "Luan Silva (Suporte Técnico)",
    color: "bg-blue-500"
  },
  {
    cpf: "222.222.222-22",
    scenario: "Cliente OFFLINE + Bloqueado",
    expected: "Julia Martins (Financeiro)",
    color: "bg-purple-500"
  },
  {
    cpf: "333.333.333-33",
    scenario: "Cliente ONLINE + Sem Pendências",
    expected: "Cloé Martins (aguarda intenção)",
    color: "bg-green-500"
  },
  {
    cpf: "444.444.444-44",
    scenario: "Cliente ONLINE + Com Pendências",
    expected: "Julia Martins (Financeiro)",
    color: "bg-purple-500"
  },
  {
    cpf: "999.999.999-99",
    scenario: "Cliente Novo (não existe)",
    expected: "Vicente (Vendas após 3 tentativas)",
    color: "bg-orange-500"
  }
];

const VALIDATION_CHECKLIST = [
  { id: 1, item: "Cloé solicita CPF no início" },
  { id: 2, item: "Sistema consulta customer_contact_history antes do IXC" },
  { id: 3, item: "CPF é validado no formato correto" },
  { id: 4, item: "Tentativas são registradas no histórico" },
  { id: 5, item: "Cliente BLOQUEADO → Julia (Financeiro)" },
  { id: 6, item: "Cliente OFFLINE → Luan (Técnico)" },
  { id: 7, item: "Cliente ONLINE → Cloé continua" },
  { id: 8, item: "Julia SEMPRE informa STATUS do cliente" },
  { id: 9, item: "Julia tenta desbloqueio automático" },
  { id: 10, item: "Julia SEMPRE envia PIX e Boleto" },
  { id: 11, item: "Protocolos são gerados (PROT-XXXXX)" },
  { id: 12, item: "Mensagens são salvas no banco" }
];

export const TestOmnichannelComplete = () => {
  const [checkedItems, setCheckedItems] = useState<number[]>([]);

  const toggleCheck = (id: number) => {
    setCheckedItems(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="test" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Chat de Teste
          </TabsTrigger>
          <TabsTrigger value="cpfs" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            CPFs de Teste
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

        <TabsContent value="cpfs" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>CPFs de Teste (Mock Data)</CardTitle>
              <CardDescription>
                Use estes CPFs para testar todos os cenários sem depender do IXC real
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {TEST_CPFS.map((test, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <code className="text-lg font-mono font-bold">
                            {test.cpf}
                          </code>
                          <Badge className={`${test.color} text-white`}>
                            CPF #{index + 1}
                          </Badge>
                        </div>
                        
                        <div className="space-y-1">
                          <p className="text-sm">
                            <span className="font-semibold">Cenário:</span> {test.scenario}
                          </p>
                          <p className="text-sm flex items-center gap-2">
                            <span className="font-semibold">Roteamento Esperado:</span>
                            <Badge variant="outline">{test.expected}</Badge>
                          </p>
                        </div>
                      </div>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(test.cpf);
                        }}
                      >
                        Copiar CPF
                      </Button>
                    </div>
                  </Card>
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
              <div className="space-y-3">
                {VALIDATION_CHECKLIST.map((item) => (
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
