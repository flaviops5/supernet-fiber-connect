import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📦 Generating Omnichannel ZIP...');

    // Ler os arquivos reais do sistema de arquivos
    const files = [
      {
        path: 'whatsapp-webhook/index.ts',
        localPath: '../whatsapp-webhook/index.ts'
      },
      {
        path: 'routing-agent/index.ts',
        localPath: '../routing-agent/index.ts'
      },
      {
        path: 'routing-agent/prompts.ts',
        localPath: '../routing-agent/prompts.ts'
      },
      {
        path: 'routing-agent/config.ts',
        localPath: '../routing-agent/config.ts'
      },
      {
        path: 'send-whatsapp-message/index.ts',
        localPath: '../send-whatsapp-message/index.ts'
      },
      {
        path: '_shared/rate-limiter.ts',
        localPath: '../_shared/rate-limiter.ts'
      }
    ];

    // Ler conteúdo dos arquivos
    const fileContents = await Promise.all(
      files.map(async (file) => {
        try {
          const content = await Deno.readTextFile(file.localPath);
          return { path: file.path, content };
        } catch (error) {
          console.error(`Error reading ${file.path}:`, error);
          return { path: file.path, content: `// Erro ao ler arquivo: ${error.message}` };
        }
      })
    );

    // Criar README
    const readme = `# Omnichannel Backend - SUPERNET FIBRA

Este pacote contém o código backend completo do sistema Omnichannel.

## 📁 Estrutura

\`\`\`
omnichannel_backend/
├── whatsapp-webhook/
│   └── index.ts              # Webhook que recebe mensagens do WhatsApp
├── routing-agent/
│   ├── index.ts              # Agente de roteamento inteligente (Cloé)
│   ├── prompts.ts            # Prompts do sistema
│   └── config.ts             # Configurações do agente
├── send-whatsapp-message/
│   └── index.ts              # Função para enviar mensagens
└── _shared/
    └── rate-limiter.ts       # Controle de taxa de mensagens
\`\`\`

## 🚀 Como Usar

### 1. Supabase Edge Functions

Estes arquivos são Edge Functions do Supabase. Para implantá-los:

\`\`\`bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Link ao projeto
supabase link --project-ref SEU_PROJECT_REF

# Deploy das funções
supabase functions deploy whatsapp-webhook
supabase functions deploy routing-agent
supabase functions deploy send-whatsapp-message
\`\`\`

### 2. Variáveis de Ambiente

Configure as seguintes secrets no Supabase:

\`\`\`bash
# Evolution API (WhatsApp)
supabase secrets set EVOLUTION_API_KEY=sua-api-key
supabase secrets set EVOLUTION_API_BASE_URL=https://sua-api.com

# OpenAI (para o agente de IA)
supabase secrets set OPENAI_API_KEY=sua-openai-key
\`\`\`

### 3. Configuração do Webhook

Configure o webhook na Evolution API para apontar para:
\`\`\`
https://SEU_PROJECT_REF.supabase.co/functions/v1/whatsapp-webhook
\`\`\`

## 🔄 Fluxo de Funcionamento

1. **WhatsApp Webhook** recebe mensagens do cliente
2. **Routing Agent (Cloé)** analisa a mensagem e identifica:
   - CPF do cliente
   - Intenção (vendas, suporte técnico, financeiro, etc.)
   - Status do cliente no sistema IXC
3. Roteia para o agente especializado apropriado
4. Envia resposta via **Send WhatsApp Message**

## 📚 Agentes Disponíveis

- **sales-agent**: Vendas e novos contratos
- **support-tech-agent**: Suporte técnico (Luan)
- **support-financial-agent**: Suporte financeiro (Julia)
- **automacao-agent**: Automação residencial
- **telemedicina-agent**: Serviços de telemedicina
- **logistics-agent**: Agendamentos e instalações

## 🔐 Segurança

- Rate limiting por CPF (máx 10 mensagens/minuto)
- Validação de CPF antes do roteamento
- Logs detalhados para auditoria
- Integração segura com IXC via proxy

## 📊 Monitoramento

Acesse os logs no Supabase Dashboard:
- Edge Functions > [nome-da-funcao] > Logs

## 🛠️ Tecnologias

- **Runtime**: Deno (Supabase Edge Functions)
- **IA**: OpenAI GPT-4
- **WhatsApp**: Evolution API
- **Database**: Supabase (PostgreSQL)
- **Billing**: Integração IXC Soft

---

**Gerado automaticamente pelo sistema SUPERNET FIBRA**
`;

    // Criar estrutura de diretórios e arquivos em texto
    let zipContent = '';
    
    // Adicionar README
    zipContent += `=== README.md ===\n${readme}\n\n`;
    
    // Adicionar cada arquivo
    for (const file of fileContents) {
      zipContent += `=== ${file.path} ===\n${file.content}\n\n`;
    }

    // Como alternativa simples ao ZIP, vamos criar um arquivo de texto estruturado
    // que pode ser facilmente separado depois
    
    // Ou podemos usar uma biblioteca ZIP diferente
    // Vou usar a abordagem de criar um arquivo tar.gz simplificado
    
    // Por enquanto, vamos retornar um JSON estruturado que pode ser baixado
    const bundle = {
      readme: readme,
      files: fileContents.reduce((acc, file) => {
        acc[file.path] = file.content;
        return acc;
      }, {} as Record<string, string>)
    };

    // Converter para formato de texto legível
    const textBundle = `${'='.repeat(80)}
OMNICHANNEL BACKEND - SUPERNET FIBRA
Código Fonte Completo
${'='.repeat(80)}

${readme}

${'='.repeat(80)}
ARQUIVOS DO SISTEMA
${'='.repeat(80)}

${fileContents.map(file => `
${'─'.repeat(80)}
📄 ${file.path}
${'─'.repeat(80)}

${file.content}

`).join('\n')}

${'='.repeat(80)}
FIM DO PACOTE
${'='.repeat(80)}
`;

    return new Response(textBundle, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': 'attachment; filename="omnichannel-backend.txt"',
      },
    });

  } catch (error) {
    console.error('Error generating ZIP:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
