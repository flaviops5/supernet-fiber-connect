import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, BookOpen, Zap, Bot, Database, Activity, Settings, ExternalLink, Sparkles, Brain } from "lucide-react";
import { toast } from "sonner";

const CodigoFonte = () => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    toast.success("Código copiado!");
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const webhookCode = `// WHATSAPP WEBHOOK - Edge Function
// Localização: supabase/functions/whatsapp-webhook/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

serve(async (req) => {
  const webhook = await req.json();
  
  // Processar mensagem recebida
  const customerPhone = webhook.data.key.remoteJid.replace('@s.whatsapp.net', '');
  const messageText = webhook.data.message?.conversation || '';
  
  // Criar/buscar conversa
  // Processar com AI Agent
  // Enviar resposta via WhatsApp
  
  return new Response(JSON.stringify({ ok: true }));
});`;

  const agentCode = `// TELEMEDICINA AGENT - AI Logic
// Localização: supabase/functions/telemedicina-agent/index.ts

const systemPrompt = \`Você é um assistente virtual de telemedicina.
Ajude os pacientes com agendamento de consultas.\`;

// Tools disponíveis:
// - validar_cpf
// - agendar_consulta
// - listar_consultas`;

  const databaseSchema = `-- Tabela de pacientes
CREATE TABLE telemedicina_patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cpf TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de consultas
CREATE TABLE telemedicina_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES telemedicina_patients(id),
  doctor_name TEXT NOT NULL,
  appointment_date DATE NOT NULL,
  status TEXT DEFAULT 'scheduled',
  created_at TIMESTAMPTZ DEFAULT NOW()
);`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header com visual aprimorado */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-orange/10 to-primary/10 rounded-3xl blur-3xl" />
          <div className="relative flex items-start gap-6 p-8 bg-card/80 backdrop-blur-xl rounded-3xl border border-primary/20 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgb(77,100,174,0.25)] transition-all duration-500">
            <div className="p-5 bg-gradient-to-br from-primary via-primary-light to-orange rounded-2xl shadow-lg animate-pulse">
              <Brain className="h-14 w-14 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-orange to-red-accent bg-clip-text text-transparent">
                  Sistema de Telemedicina
                </h1>
                <Badge className="bg-gradient-to-r from-primary to-orange text-primary-foreground border-0 px-4 py-1 shadow-lg">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Código-Fonte Completo
                </Badge>
              </div>
              <p className="text-lg text-muted-foreground/90 leading-relaxed mb-3">
                Arquitetura completa do sistema de telemedicina com autenticação dedicada, 
                agente especializado e integração multi-canal (WhatsApp + Web).
              </p>
              <div className="flex gap-2">
                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                  ✅ Ativo
                </Badge>
                <Badge variant="outline" className="border-primary/20">v2.1.0</Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Links com visual aprimorado */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { icon: Activity, label: "WhatsApp Webhook", color: "from-green-500/30 to-green-600/30", textColor: "text-green-600", href: "/technical-docs" },
            { icon: Bot, label: "AI Agent", color: "from-primary/30 to-primary-light/30", textColor: "text-primary", href: "/technical-docs" },
            { icon: Database, label: "Database Schema", color: "from-purple-500/30 to-purple-600/30", textColor: "text-purple-600", href: "/technical-docs" },
            { icon: Settings, label: "Configuração", color: "from-orange/30 to-red-accent/30", textColor: "text-orange", href: "/technical-docs" }
          ].map((item, i) => (
            <Card key={i} className="group hover:shadow-[0_8px_30px_rgb(77,100,174,0.2)] transition-all duration-300 hover:-translate-y-2 cursor-pointer border-primary/10 bg-gradient-to-br from-card to-muted/30">
              <CardContent className="p-6 flex items-center gap-4">
                <div className={`p-3 bg-gradient-to-br ${item.color} rounded-xl group-hover:scale-110 transition-transform duration-300 shadow-md`}>
                  <item.icon className={`h-6 w-6 ${item.textColor}`} />
                </div>
                <div>
                  <p className="font-semibold group-hover:text-primary transition-colors">{item.label}</p>
                  <p className="text-xs text-muted-foreground">Ver código →</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Links rápidos adicionais */}
        <Card className="bg-card/50 backdrop-blur border-primary/10">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <Button variant="outline" size="sm" asChild className="hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all">
                <a href="/technical-docs">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Docs Completas
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href="https://supabase.com/dashboard/project/mxdupkbpxjcfxdgrwknp/functions/telemedicina-agent/logs" target="_blank">
                  <Activity className="w-4 h-4 mr-2" />
                  Edge Function Logs
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="explanation" className="w-full">
          <TabsList className="grid w-full grid-cols-6 bg-muted/50">
            <TabsTrigger value="explanation">
              <BookOpen className="w-4 h-4 mr-2" />
              Explicação
            </TabsTrigger>
            <TabsTrigger value="webhook">
              <Zap className="w-4 h-4 mr-2" />
              Webhook
            </TabsTrigger>
            <TabsTrigger value="agent">
              <Bot className="w-4 h-4 mr-2" />
              AI Agent
            </TabsTrigger>
            <TabsTrigger value="database">
              <Database className="w-4 h-4 mr-2" />
              Database
            </TabsTrigger>
            <TabsTrigger value="integration">
              <Activity className="w-4 h-4 mr-2" />
              Integração
            </TabsTrigger>
            <TabsTrigger value="config">
              <Settings className="w-4 h-4 mr-2" />
              Configuração
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Explicação */}
          <TabsContent value="explanation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  Sistema de Telemedicina - Visão Geral
                </CardTitle>
                <CardDescription>
                  Arquitetura, fluxo e objetivos do sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">🎯 Objetivo</h3>
                  <p className="text-sm text-muted-foreground">
                    Sistema completo de telemedicina integrado via WhatsApp, permitindo agendamento de consultas,
                    autenticação de pacientes e atendimento via AI conversacional.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">🏗️ Arquitetura</h3>
                  <div className="bg-muted p-4 rounded-lg text-sm font-mono">
                    Cliente WhatsApp<br/>
                    &nbsp;&nbsp;↓<br/>
                    Evolution API (Webhook)<br/>
                    &nbsp;&nbsp;↓<br/>
                    whatsapp-webhook (Edge Function)<br/>
                    &nbsp;&nbsp;↓<br/>
                    telemedicina-agent (AI Agent)<br/>
                    &nbsp;&nbsp;↓<br/>
                    Supabase Database<br/>
                    &nbsp;&nbsp;↓<br/>
                    Resposta via WhatsApp
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">📊 Fluxo Completo</h3>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Cliente envia mensagem WhatsApp para o número da clínica</li>
                    <li>Evolution API captura e envia webhook para Supabase</li>
                    <li>Sistema identifica conversa existente ou cria nova</li>
                    <li>AI Agent processa mensagem com contexto completo</li>
                    <li>Ações disponíveis: validar CPF, agendar consulta, listar consultas</li>
                    <li>Resposta enviada automaticamente via WhatsApp</li>
                  </ol>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">✨ Características</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>✅ Atendimento 24/7 automatizado</li>
                    <li>✅ Validação de CPF em tempo real</li>
                    <li>✅ Histórico completo de conversas</li>
                    <li>✅ Agendamento inteligente de consultas</li>
                    <li>✅ Integração nativa com WhatsApp Business</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Webhook */}
          <TabsContent value="webhook" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" />
                  WhatsApp Webhook - Evolution API
                </CardTitle>
                <CardDescription>
                  Recebimento e processamento de mensagens
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                    <code>{webhookCode}</code>
                  </pre>
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(webhookCode, 'webhook')}
                  >
                    {copiedSection === 'webhook' ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: AI Agent */}
          <TabsContent value="agent" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-primary" />
                  AI Agent - Lógica Conversacional
                </CardTitle>
                <CardDescription>
                  Agente inteligente com ferramentas e contexto
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                    <code>{agentCode}</code>
                  </pre>
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(agentCode, 'agent')}
                  >
                    {copiedSection === 'agent' ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 4: Database */}
          <TabsContent value="database" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-primary" />
                  Database Schema
                </CardTitle>
                <CardDescription>
                  Tabelas, RLS e triggers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                    <code>{databaseSchema}</code>
                  </pre>
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(databaseSchema, 'database')}
                  >
                    {copiedSection === 'database' ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 5: Integração */}
          <TabsContent value="integration" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  Integração Evolution API
                </CardTitle>
                <CardDescription>
                  Configuração do webhook WhatsApp Business
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <h4 className="font-semibold">Configurar Webhook na Evolution API:</h4>
                  <div className="space-y-1 text-sm font-mono">
                    <p><strong>URL:</strong> https://mxdupkbpxjcfxdgrwknp.supabase.co/functions/v1/whatsapp-webhook</p>
                    <p><strong>Instance:</strong> SDR2</p>
                    <p><strong>Event:</strong> messages.upsert</p>
                    <p><strong>Method:</strong> POST</p>
                  </div>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-lg">
                  <h4 className="font-semibold text-amber-600 dark:text-amber-400 mb-2">⚠️ Importante:</h4>
                  <ul className="text-sm space-y-1 text-amber-700 dark:text-amber-300">
                    <li>• Evolution API deve estar ativa e conectada</li>
                    <li>• Número WhatsApp Business verificado</li>
                    <li>• QR Code escaneado (se necessário)</li>
                    <li>• Webhook testado e respondendo 200 OK</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 6: Configuração */}
          <TabsContent value="config" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-primary" />
                  Secrets e Variáveis
                </CardTitle>
                <CardDescription>
                  Configurações necessárias no Supabase
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-semibold">Supabase Secrets:</h4>
                  <div className="bg-muted p-4 rounded-lg space-y-2 text-sm font-mono">
                    <div className="flex justify-between">
                      <span>EVOLUTION_API_KEY</span>
                      <Badge variant="outline">Obrigatório</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>EVOLUTION_API_BASE_URL</span>
                      <Badge variant="outline">Obrigatório</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>EVOLUTION_PHONE_NUMBER</span>
                      <Badge variant="outline">Obrigatório</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>LOVABLE_API_KEY</span>
                      <Badge variant="outline" className="bg-green-500/10 text-green-500">Auto</Badge>
                    </div>
                  </div>
                </div>

                <Button variant="outline" size="sm" asChild className="w-full">
                  <a href="https://supabase.com/dashboard/project/mxdupkbpxjcfxdgrwknp/settings/functions" target="_blank">
                    <Settings className="w-4 h-4 mr-2" />
                    Configurar Secrets no Supabase
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer Info */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="text-4xl">💡</div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">Próximos Passos Sugeridos:</h3>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>1. Testar webhook com mensagem real no WhatsApp</li>
                  <li>2. Monitorar logs da edge function em tempo real</li>
                  <li>3. Adicionar mais especialidades médicas</li>
                  <li>4. Implementar lembretes automáticos de consulta</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CodigoFonte;