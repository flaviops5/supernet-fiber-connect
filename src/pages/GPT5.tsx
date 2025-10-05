import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Target, Zap, MessageCircle, Activity, Database, TrendingUp, CheckCircle2 } from 'lucide-react';

export default function GPT5() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 py-12 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Documentação: Sistema de Atendimento Inteligente
          </h1>
          <p className="text-muted-foreground text-lg">
            Fluxo completo de atendimento com agentes Cloé e Luan
          </p>
        </div>

        {/* Objetivo */}
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Target className="h-6 w-6 text-primary" />
              <CardTitle>🎯 Objetivo da Simulação</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-semibold text-foreground">Propósito:</p>
              <p className="text-muted-foreground">
                Implementar um fluxo de atendimento inteligente onde dois agentes (Cloé e Luan) lidam com o caso de cliente 
                com internet offline causada por fonte de alimentação queimada.
              </p>
            </div>
            <div>
              <p className="font-semibold text-foreground">Resultado Esperado:</p>
              <p className="text-muted-foreground">
                Diagnóstico automático, comunicação humanizada e agendamento de visita técnica no IXC ERP.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Estrutura Geral */}
        <Card>
          <CardHeader>
            <CardTitle>🧩 1. Estrutura Geral do Sistema</CardTitle>
            <CardDescription>
              Sistema com dois agentes AI integrados ao Supabase e IXC ERP
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-semibold">Agente</th>
                      <th className="text-left p-3 font-semibold">Função</th>
                      <th className="text-left p-3 font-semibold">Endpoint</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="p-3">Cloé</td>
                      <td className="p-3">Atendimento inicial e roteamento</td>
                      <td className="p-3 font-mono text-xs">/supabase/functions/routing-agent</td>
                    </tr>
                    <tr>
                      <td className="p-3">Luan</td>
                      <td className="p-3">Diagnóstico técnico e solução</td>
                      <td className="p-3 font-mono text-xs">/supabase/functions/support-tech-agent</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="flex gap-4 flex-wrap">
                <Badge variant="default">Modelo Base: google/gemini-2.5-flash</Badge>
                <Badge variant="secondary">Linguagem: TypeScript (Deno / Edge Functions)</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CLOÉ - Routing Agent */}
        <Card className="border-2 border-blue-500/20">
          <CardHeader>
            <div className="flex items-center gap-3">
              <MessageCircle className="h-6 w-6 text-blue-500" />
              <CardTitle>🤖 2. CLOÉ — Routing Agent</CardTitle>
            </div>
            <CardDescription>
              Missão: Primeiro ponto de contato, validando cliente, conferindo status de rede e decidindo o próximo passo.
              <br />
              Tom: Calmo, empático e confiante. Sempre explica o que está fazendo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold text-lg mb-3">🔁 Fluxo Lógico (Cloé)</h3>
              <ol className="space-y-4 list-decimal list-inside">
                <li className="text-muted-foreground">
                  <span className="font-semibold text-foreground">Recebe mensagem do cliente</span> (ex: "minha internet não funciona")
                </li>
                
                <li className="text-muted-foreground">
                  <span className="font-semibold text-foreground">Se CPF não estiver no contexto</span> → pede educadamente:
                  <div className="bg-muted/50 p-3 rounded-lg mt-2 ml-6">
                    <p className="text-sm italic">"Entendo sua preocupação. Para verificar o que está acontecendo, poderia me informar seu CPF por favor?"</p>
                  </div>
                </li>

                <li className="text-muted-foreground">
                  <span className="font-semibold text-foreground">Valida CPF via IXC:</span>
                  <div className="bg-muted/50 p-3 rounded-lg mt-2 ml-6">
                    <code className="text-xs">GET /cliente?cpf_cnpj={"{cpf}"}</code>
                  </div>
                  <ul className="ml-6 mt-2 space-y-2">
                    <li>
                      <Badge variant="destructive" className="mr-2">Se inválido</Badge>
                      <span className="text-sm">responde: "Não encontrei seu cadastro. Você é nosso cliente atualmente ou deseja contratar um novo plano?"</span>
                    </li>
                    <li>
                      <Badge variant="outline" className="mr-2">Se "novo cliente"</Badge>
                      <span className="text-sm">→ transfere para departamento de vendas</span>
                    </li>
                  </ul>
                </li>

                <li className="text-muted-foreground">
                  <span className="font-semibold text-foreground">CPF válido → obtém dados:</span>
                  <ul className="ml-6 mt-2 space-y-1">
                    <li className="text-sm">• PPPoE login (radusuarios)</li>
                    <li className="text-sm">• Status do login (online/offline)</li>
                  </ul>
                </li>

                <li className="text-muted-foreground">
                  <span className="font-semibold text-foreground">Verifica se há queda em massa:</span>
                  <div className="bg-muted/50 p-3 rounded-lg mt-2 ml-6">
                    <code className="text-xs">SELECT * FROM mass_outage_events WHERE affected_logins ILIKE '%{"{pppoe_login}"}%';</code>
                  </div>
                  <div className="ml-6 mt-2">
                    <Badge variant="default" className="mr-2">Se queda em massa detectada:</Badge>
                    <div className="bg-muted/50 p-3 rounded-lg mt-2">
                      <p className="text-sm italic">"Verifiquei aqui que há uma instabilidade na sua região e nossa equipe já está trabalhando para resolver. Assim que normalizar, você será avisado automaticamente, tá bem?"</p>
                      <p className="text-xs text-orange-600 mt-2">Encerra conversa, sem transferência.</p>
                    </div>
                  </div>
                </li>

                <li className="text-muted-foreground">
                  <span className="font-semibold text-foreground">Caso não haja queda em massa:</span>
                  <div className="ml-6 mt-2 space-y-3">
                    <div>
                      <p className="text-sm font-medium">Registra conversa:</p>
                      <div className="bg-muted/50 p-3 rounded-lg mt-1">
                        <code className="text-xs">INSERT INTO conversations (cpf, status, assigned_agent) VALUES ({"{cpf}"}, 'routing_completed', 'Luan');</code>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Envia para o agente Luan, passando:</p>
                      <div className="bg-muted/50 p-3 rounded-lg mt-1">
                        <pre className="text-xs overflow-x-auto">{`{
  "cpf": "000.111.222-33",
  "pppoe_login": "maria123@provedor",
  "equipment_status": "offline",
  "last_online": "18h",
  "signal": null
}`}</pre>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Responde ao cliente:</p>
                      <div className="bg-muted/50 p-3 rounded-lg mt-1">
                        <p className="text-sm italic">"Tudo certo, {"{nome_cliente}"}. Vou transferir você para nossa equipe técnica. O Luan vai analisar seu equipamento e resolver o problema para você. Um momento por favor…"</p>
                      </div>
                    </div>
                  </div>
                </li>
              </ol>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold text-lg mb-3">🗣️ Exemplos de Conversa (Cloé)</h3>
              <div className="space-y-4">
                <div className="bg-muted/30 p-4 rounded-lg">
                  <p className="text-sm font-semibold mb-2">Cliente:</p>
                  <p className="text-sm italic">"Oi, minha internet não está pegando."</p>
                </div>
                <div className="bg-blue-500/10 p-4 rounded-lg">
                  <p className="text-sm font-semibold mb-2 text-blue-600">Cloé:</p>
                  <p className="text-sm italic">"Poxa, sinto muito por isso! 😕<br />Pode me informar seu CPF para eu verificar o que está acontecendo?"</p>
                </div>
                <div className="bg-muted/30 p-4 rounded-lg">
                  <p className="text-sm font-semibold mb-2">Cliente:</p>
                  <p className="text-sm italic">"123.456.789-00"</p>
                </div>
                <div className="bg-blue-500/10 p-4 rounded-lg">
                  <p className="text-sm font-semibold mb-2 text-blue-600">Cloé:</p>
                  <p className="text-sm italic">"Obrigada! Só um instante enquanto verifico seus dados no sistema…"</p>
                  <p className="text-xs text-muted-foreground mt-2">(consulta IXC e Supabase)</p>
                  <p className="text-sm italic mt-2">"Verifiquei aqui e não há registro de queda na sua região.<br />Vou transferir você para o Luan, nosso técnico especializado, para resolver rapidinho, tudo bem?"</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* LUAN - Support Tech Agent */}
        <Card className="border-2 border-orange-500/20">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Zap className="h-6 w-6 text-orange-500" />
              <CardTitle>🧠 3. LUAN — Support Tech Agent</CardTitle>
            </div>
            <CardDescription>
              Missão: Diagnosticar tecnicamente e resolver.
              <br />
              Tom: Técnico, porém atencioso e acessível. Mostra domínio, mas mantém linguagem simples e humana.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold text-lg mb-3">⚙️ Fluxo Lógico (Luan)</h3>
              <ol className="space-y-4 list-decimal list-inside">
                <li className="text-muted-foreground">
                  <span className="font-semibold text-foreground">Recebe contexto enviado por Cloé</span> (CPF, login, status do equipamento, último online, sinal)
                </li>

                <li className="text-muted-foreground">
                  <span className="font-semibold text-foreground">Busca informações adicionais no IXC:</span>
                  <div className="bg-muted/50 p-3 rounded-lg mt-2 ml-6">
                    <code className="text-xs">GET /radusuarios?login={"{pppoe_login}"}</code>
                  </div>
                </li>

                <li className="text-muted-foreground">
                  <span className="font-semibold text-foreground">Aplica lógica de diagnóstico:</span>
                  <div className="overflow-x-auto mt-2 ml-6">
                    <table className="w-full text-sm border">
                      <thead>
                        <tr className="bg-muted">
                          <th className="text-left p-3 border">Condição</th>
                          <th className="text-left p-3 border">Diagnóstico</th>
                          <th className="text-left p-3 border">Ação</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border">
                          <td className="p-3 border">Equipamento offline + sem sinal</td>
                          <td className="p-3 border">Fonte de alimentação queimada</td>
                          <td className="p-3 border">Criar chamado tipo "Substituição de fonte"</td>
                        </tr>
                        <tr className="border">
                          <td className="p-3 border">Equipamento online + sinal baixo</td>
                          <td className="p-3 border">Cabo ou fibra com falha</td>
                          <td className="p-3 border">Criar chamado tipo "Verificação de sinal"</td>
                        </tr>
                        <tr className="border">
                          <td className="p-3 border">Equipamento online + desconfiguração</td>
                          <td className="p-3 border">ONU/Roteador desconfigurado</td>
                          <td className="p-3 border">Criar chamado tipo "Reconfiguração"</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </li>

                <li className="text-muted-foreground">
                  <span className="font-semibold text-foreground">Cria chamado no IXC:</span>
                  <div className="bg-muted/50 p-3 rounded-lg mt-2 ml-6">
                    <pre className="text-xs overflow-x-auto">{`POST /su_oss_chamado
{
  "id_cliente": {id_cliente},
  "id_tipo": {id_tipo_chamado},
  "descricao": "Diagnóstico automático via Luan AI",
  "status": "Aberto"
}`}</pre>
                  </div>
                </li>

                <li className="text-muted-foreground">
                  <span className="font-semibold text-foreground">Atualiza Supabase:</span>
                  <div className="bg-muted/50 p-3 rounded-lg mt-2 ml-6">
                    <code className="text-xs">UPDATE conversations SET status = 'diagnosis_completed', resolution = 'Fonte queimada' WHERE cpf = {"{cpf}"};</code>
                  </div>
                </li>
              </ol>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold text-lg mb-3">🗣️ Exemplos de Conversa (Luan)</h3>
              <div className="space-y-4">
                <div className="bg-orange-500/10 p-4 rounded-lg">
                  <p className="text-sm font-semibold mb-2 text-orange-600">Luan:</p>
                  <p className="text-sm italic">"Oi {"{nome_cliente}"}, sou o Luan da equipe técnica. Recebi aqui seu caso e já estou verificando seu equipamento."</p>
                  <p className="text-xs text-muted-foreground mt-2">(após análise)</p>
                  <p className="text-sm italic mt-2">"Verifiquei que o seu equipamento está sem energia há cerca de 18 horas.<br />Pelo padrão do histórico, isso normalmente indica que a fonte de alimentação queimou."</p>
                  <p className="text-sm italic mt-2">"Vou agendar uma visita técnica para amanhã no período da manhã (08h–12h) para substituir a fonte, tudo bem pra você?"</p>
                </div>
                <div className="bg-muted/30 p-4 rounded-lg">
                  <p className="text-sm font-semibold mb-2">Cliente:</p>
                  <p className="text-sm italic">"Pode ser sim."</p>
                </div>
                <div className="bg-orange-500/10 p-4 rounded-lg">
                  <p className="text-sm font-semibold mb-2 text-orange-600">Luan:</p>
                  <p className="text-sm italic">"Perfeito! 😊<br />Sua visita já está confirmada para amanhã cedo.<br />Caso o problema volte antes disso, pode me chamar por aqui mesmo, combinado?"</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Integrações Técnicas */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Database className="h-6 w-6 text-primary" />
              <CardTitle>🧩 4. Integrações Técnicas</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">🔗 Supabase</h3>
              <ul className="space-y-1 text-sm text-muted-foreground ml-4">
                <li>• <code className="text-xs bg-muted px-1 py-0.5 rounded">mass_outage_events</code> → controle de quedas regionais</li>
                <li>• <code className="text-xs bg-muted px-1 py-0.5 rounded">conversations</code>, <code className="text-xs bg-muted px-1 py-0.5 rounded">conversation_messages</code> → fluxo de atendimento</li>
                <li>• <code className="text-xs bg-muted px-1 py-0.5 rounded">customer_contact_history</code> → histórico de interações</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">⚙️ IXC ERP</h3>
              <ul className="space-y-1 text-sm text-muted-foreground ml-4">
                <li>• <code className="text-xs bg-muted px-1 py-0.5 rounded">GET /cliente?cpf_cnpj={"{cpf}"}</code></li>
                <li>• <code className="text-xs bg-muted px-1 py-0.5 rounded">GET /radusuarios?login={"{pppoe_login}"}</code></li>
                <li>• <code className="text-xs bg-muted px-1 py-0.5 rounded">POST /su_oss_chamado</code></li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Métricas */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Activity className="h-6 w-6 text-green-500" />
              <CardTitle>📊 5. Métricas do Fluxo</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-muted/30 p-4 rounded-lg">
                <p className="text-sm font-semibold text-foreground">Tempo até agendamento</p>
                <p className="text-2xl font-bold text-primary">≤ 2 min</p>
              </div>
              <div className="bg-muted/30 p-4 rounded-lg">
                <p className="text-sm font-semibold text-foreground">Diagnóstico correto</p>
                <p className="text-2xl font-bold text-primary">≥ 95%</p>
              </div>
              <div className="bg-muted/30 p-4 rounded-lg">
                <p className="text-sm font-semibold text-foreground">NPS de satisfação</p>
                <p className="text-2xl font-bold text-primary">≥ 4.5 / 5</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Extensões Futuras */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <TrendingUp className="h-6 w-6 text-purple-500" />
              <CardTitle>🧠 6. Extensões Futuras (opcional)</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Cloé identificar padrão de reincidência (falhas recorrentes no mesmo cliente)</li>
              <li>• Luan gerar relatórios de falhas por bairro com base nos chamados criados</li>
              <li>• Implementar webhook de notificação via WhatsApp API (Evolution API ou Twilio)</li>
            </ul>
          </CardContent>
        </Card>

        {/* Instrução Final */}
        <Card className="border-2 border-green-500/20 bg-green-500/5">
          <CardHeader>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
              <CardTitle className="text-green-600">✅ 7. Instrução Final ao Lovable</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <p className="font-semibold">Crie os dois agentes (Cloé e Luan) com base neste documento.<br />Configure-os para se comunicarem via Supabase.</p>
              
              <div className="bg-background/50 p-4 rounded-lg space-y-2">
                <p className="font-semibold text-blue-600">Cloé deve:</p>
                <ul className="ml-4 space-y-1 text-muted-foreground">
                  <li>• Realizar todas as consultas ao IXC e Supabase</li>
                  <li>• Fazer roteamento e triagem completa</li>
                </ul>
              </div>

              <div className="bg-background/50 p-4 rounded-lg space-y-2">
                <p className="font-semibold text-orange-600">Luan deve:</p>
                <ul className="ml-4 space-y-1 text-muted-foreground">
                  <li>• Receber contexto pronto</li>
                  <li>• Fazer diagnóstico técnico</li>
                  <li>• Criar e registrar chamados</li>
                </ul>
              </div>

              <p className="font-semibold text-foreground">Ambos devem usar linguagem natural, respostas humanizadas e respeitar o fluxo descrito.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
