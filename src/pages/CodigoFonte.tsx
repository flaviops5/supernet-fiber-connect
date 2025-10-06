import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function CodigoFonte() {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    toast.success("Código copiado!");
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const evolutionConfig = `// ============================================
// CONFIGURAÇÃO EVOLUTION API - WhatsApp
// ============================================

// 1. CREDENCIAIS (Supabase Secrets)
const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');
const EVOLUTION_API_BASE_URL = Deno.env.get('EVOLUTION_API_BASE_URL');
const EVOLUTION_PHONE_NUMBER = Deno.env.get('EVOLUTION_PHONE_NUMBER');

// Valores testados:
// - API Key: 39CB1B9361A2415781A4C8F26565D38A
// - API Key alternativa: 39CB1B9361A2-4157-81A4-C8F26565D38A
// - Instance: SDR2

// 2. ENVIAR MENSAGEM (Edge Function)
async function sendWhatsAppMessage(phone: string, message: string) {
  const cleanPhone = phone.replace(/\\D/g, '');
  const formattedPhone = cleanPhone.includes('@') 
    ? cleanPhone 
    : \`\${cleanPhone}@s.whatsapp.net\`;

  const response = await fetch(\`\${EVOLUTION_API_BASE_URL}/message/sendText/SDR2\`, {
    method: 'POST',
    headers: {
      'apikey': EVOLUTION_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      number: formattedPhone,
      text: message,
      delay: 1200
    }),
  });

  return await response.json();
}

// 3. WEBHOOK CONFIGURATION
// URL: https://mxdupkbpxjcfxdgrwknp.supabase.co/functions/v1/whatsapp-webhook
// Event: messages.upsert
// Method: POST

// 4. ESTRUTURA WEBHOOK RECEBIDO
interface WhatsappWebhook {
  event: 'messages.upsert';
  instance: string;
  data: {
    key: {
      remoteJid: string;    // Telefone do cliente
      fromMe: boolean;       // Se é mensagem nossa
      id: string;           // ID da mensagem
    };
    pushName: string;       // Nome do contato
    message: {
      conversation?: string;
      extendedTextMessage?: {
        text: string;
      };
    };
    messageTimestamp: number;
  };
}`;

  const telemedicinAgent = `// ============================================
// AGENTE TELEMEDICINA - Sistema Completo
// ============================================

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuração da IA
const AI_CONFIG = {
  model: 'google/gemini-2.5-flash',
  endpoint: 'https://ai.gateway.lovable.dev/v1/chat/completions'
};

// Prompt do Sistema
const SYSTEM_PROMPT = \`Você é Carolina, assistente virtual especializada em telemedicina da SUPERNET FIBRA.

SERVIÇOS DE TELEMEDICINA:
- Consultas médicas online 24/7
- Especialidades: Clínico Geral, Pediatria, Dermatologia, Psicologia
- Atendimento por vídeo, áudio ou chat
- Prescrição digital de receitas
- Pedidos de exames laboratoriais

PLANOS DISPONÍVEIS:
1. Essencial - R$ 29,90/mês (3 consultas)
2. Família - R$ 49,90/mês (10 consultas + até 4 dependentes)
3. Premium - R$ 79,90/mês (consultas ilimitadas + telemedicina preventiva)

FUNCIONALIDADES:
- Agendamento de consultas
- Histórico médico digital
- Receitas e atestados online
- Chat com médicos

PROCESSO:
1. Cumprimente de forma empática
2. Identifique a necessidade (consulta, informação, agendamento)
3. Colete dados necessários (nome, CPF, sintomas se aplicável)
4. Use as tools apropriadas
5. Confirme agendamento ou forneça informações

IMPORTANTE:
- Seja empática e acolhedora
- Não diagnostique, apenas oriente
- Em emergências, recomende buscar atendimento presencial
- Valide CPF antes de agendamentos
- Explique funcionamento da telemedicina
\`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, userContext } = await req.json();
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    // Buscar planos de telemedicina
    const { data: plans } = await supabase
      .from('telemedicine_plans')
      .select('*')
      .eq('active', true);

    const response = await fetch(AI_CONFIG.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${LOVABLE_API_KEY}\`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: AI_CONFIG.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'schedule_consultation',
              description: 'Agenda consulta de telemedicina',
              parameters: {
                type: 'object',
                properties: {
                  patientName: { type: 'string' },
                  patientCPF: { type: 'string' },
                  specialty: { 
                    type: 'string',
                    enum: ['clinico_geral', 'pediatria', 'dermatologia', 'psicologia']
                  },
                  preferredDate: { type: 'string' },
                  preferredTime: { type: 'string' },
                  symptoms: { type: 'string' }
                },
                required: ['patientName', 'patientCPF', 'specialty']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'check_patient_history',
              description: 'Busca histórico médico do paciente',
              parameters: {
                type: 'object',
                properties: {
                  cpf: { type: 'string' }
                },
                required: ['cpf']
              }
            }
          }
        ]
      })
    });

    const data = await response.json();
    const aiMessage = data.choices[0]?.message;

    // Processar tool calls se houver
    if (aiMessage?.tool_calls) {
      for (const toolCall of aiMessage.tool_calls) {
        const functionName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);

        if (functionName === 'schedule_consultation') {
          // Criar consulta no banco
          const { data: consultation } = await supabase
            .from('telemedicine_consultations')
            .insert({
              patient_name: args.patientName,
              patient_cpf: args.patientCPF,
              specialty: args.specialty,
              preferred_date: args.preferredDate,
              preferred_time: args.preferredTime,
              symptoms: args.symptoms,
              status: 'scheduled'
            })
            .select()
            .single();

          console.log('Consulta agendada:', consultation?.id);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        message: aiMessage?.content || 'Resposta processada',
        toolCalls: aiMessage?.tool_calls 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});`;

  const databaseSchema = `-- ============================================
-- SCHEMA BANCO DE DADOS - Telemedicina
-- ============================================

-- Tabela de Planos
CREATE TABLE telemedicine_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  max_consultations INTEGER,
  max_dependents INTEGER DEFAULT 0,
  features JSONB DEFAULT '[]'::jsonb,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de Usuários
CREATE TABLE telemedicine_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  cpf TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  birth_date DATE,
  plan_id UUID REFERENCES telemedicine_plans(id),
  subscription_status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de Consultas
CREATE TABLE telemedicine_consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_name TEXT NOT NULL,
  patient_cpf TEXT NOT NULL,
  specialty TEXT NOT NULL,
  preferred_date DATE,
  preferred_time TIME,
  symptoms TEXT,
  status TEXT DEFAULT 'scheduled',
  doctor_name TEXT,
  consultation_link TEXT,
  prescription TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de Dependentes
CREATE TABLE telemedicine_dependents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES telemedicine_users(id),
  name TEXT NOT NULL,
  cpf TEXT,
  birth_date DATE,
  relationship TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices
CREATE INDEX idx_consultations_cpf ON telemedicine_consultations(patient_cpf);
CREATE INDEX idx_consultations_status ON telemedicine_consultations(status);
CREATE INDEX idx_users_cpf ON telemedicine_users(cpf);

-- RLS Policies
ALTER TABLE telemedicine_consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemedicine_users ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários podem ver suas próprias consultas
CREATE POLICY "Users view own consultations"
  ON telemedicine_consultations FOR SELECT
  USING (patient_cpf IN (
    SELECT cpf FROM telemedicine_users WHERE user_id = auth.uid()
  ));`;

  const frontendWidget = `// ============================================
// WIDGET TELEMEDICINA - Frontend React
// ============================================

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';

export function TelemedicinaChatWidget() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('telemedicina-agent', {
        body: {
          messages: [...messages, userMessage]
        }
      });

      if (error) throw error;

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.message
      }]);
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Botão Flutuante */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 rounded-full w-16 h-16"
        >
          💊
        </Button>
      )}

      {/* Widget de Chat */}
      {isOpen && (
        <Card className="fixed bottom-6 right-6 w-96 h-[600px] flex flex-col">
          <div className="p-4 border-b flex justify-between items-center bg-primary text-primary-foreground">
            <h3 className="font-semibold">Telemedicina SUPERNET</h3>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setIsOpen(false)}
            >
              ✕
            </Button>
          </div>

          {/* Mensagens */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={\`flex \${msg.role === 'user' ? 'justify-end' : 'justify-start'}\`}
              >
                <div
                  className={\`max-w-[80%] p-3 rounded-lg \${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }\`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted p-3 rounded-lg">
                  Digitando...
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Digite sua mensagem..."
                disabled={loading}
              />
              <Button onClick={sendMessage} disabled={loading}>
                Enviar
              </Button>
            </div>
          </div>
        </Card>
      )}
    </>
  );
}`;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-4xl font-bold mb-2">Código Fonte - Sistema Telemedicina</h1>
          <p className="text-muted-foreground">
            Documentação técnica completa do sistema de telemedicina integrado com WhatsApp
          </p>
        </div>

        <Tabs defaultValue="evolution" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="evolution">Evolution API</TabsTrigger>
            <TabsTrigger value="agent">Agente IA</TabsTrigger>
            <TabsTrigger value="database">Database</TabsTrigger>
            <TabsTrigger value="frontend">Frontend</TabsTrigger>
          </TabsList>

          <TabsContent value="evolution" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Configuração Evolution API</CardTitle>
                <CardDescription>
                  Integração WhatsApp para envio/recebimento de mensagens
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                    <code>{evolutionConfig}</code>
                  </pre>
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute top-4 right-4"
                    onClick={() => copyToClipboard(evolutionConfig, 'evolution')}
                  >
                    {copiedSection === 'evolution' ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="agent" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Agente de Telemedicina (Edge Function)</CardTitle>
                <CardDescription>
                  Processamento de mensagens com IA usando Lovable AI Gateway
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                    <code>{telemedicinAgent}</code>
                  </pre>
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute top-4 right-4"
                    onClick={() => copyToClipboard(telemedicinAgent, 'agent')}
                  >
                    {copiedSection === 'agent' ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="database" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Schema do Banco de Dados</CardTitle>
                <CardDescription>
                  Tabelas e políticas RLS para telemedicina
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
                    className="absolute top-4 right-4"
                    onClick={() => copyToClipboard(databaseSchema, 'database')}
                  >
                    {copiedSection === 'database' ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="frontend" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Widget Frontend (React)</CardTitle>
                <CardDescription>
                  Componente de chat para interface do usuário
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                    <code>{frontendWidget}</code>
                  </pre>
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute top-4 right-4"
                    onClick={() => copyToClipboard(frontendWidget, 'frontend')}
                  >
                    {copiedSection === 'frontend' ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900 dark:text-blue-100">
              📋 Informações Importantes
            </CardTitle>
          </CardHeader>
          <CardContent className="text-blue-800 dark:text-blue-200 space-y-2">
            <p>• <strong>Evolution API Key:</strong> Configure no Supabase Secrets</p>
            <p>• <strong>Instance:</strong> SDR2 (configurável)</p>
            <p>• <strong>Webhook URL:</strong> https://mxdupkbpxjcfxdgrwknp.supabase.co/functions/v1/whatsapp-webhook</p>
            <p>• <strong>Model IA:</strong> google/gemini-2.5-flash (padrão)</p>
            <p>• <strong>Lovable AI Key:</strong> Automática no ambiente Supabase</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
