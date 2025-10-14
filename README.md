# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/2cf5ae9f-dc50-45cd-be95-157396f6dc10

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/2cf5ae9f-dc50-45cd-be95-157396f6dc10) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/2cf5ae9f-dc50-45cd-be95-157396f6dc10) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Integração com IXC ERP

Este projeto inclui integração completa com o IXC Provedor através de Edge Functions.

### Configuração dos Secrets

Para configurar a integração com IXC, você precisa definir os seguintes secrets no Supabase:

1. **IXC_API_USERNAME**: Usuário da API IXC
2. **IXC_API_PASSWORD**: Senha da API IXC
3. **IXC_API_BASE_URL**: Domínio base da API IXC

#### Importante sobre IXC_API_BASE_URL

⚠️ **Formato correto**: `central.supernetfibra.com.br`

**NÃO** inclua:
- Protocolo (`https://` ou `http://`)
- Caminhos (`/app/login` ou `/webservice/v1`)

✅ **Correto**: `central.supernetfibra.com.br`  
❌ **Incorreto**: `https://central.supernetfibra.com.br/app/login`

As Edge Functions (`ixc-integration`, `ixc-count-clients`) normalizam automaticamente o valor do secret, mas é recomendado configurar no formato correto.

### Edge Functions Disponíveis

- **ixc-integration**: Proxy principal para todas as operações com IXC (clientes, contratos, atendimentos, etc)
- **ixc-count-clients**: Contagem e análise de clientes cadastrados no IXC
- **ixc-list-contracts**: Listagem de contratos
- **sales-agent**: Agente de vendas com integração IXC
- **support-tech-agent** / **support-financial-agent**: Agentes de suporte técnico e financeiro

### Como testar a conexão

1. Acesse `/admin/ixc-integration`
2. Configure os secrets necessários
3. Clique em "Testar Conexão" ou "Criar Cliente de Teste no IXC"

### Solução de problemas comuns

**Erro: "dns error: failed to lookup address information"**
- Verifique se `IXC_API_BASE_URL` está sem `https://` e sem caminhos adicionais
- Exemplo correto: `central.supernetfibra.com.br`

**Erro: "Credenciais do IXC não configuradas"**
- Certifique-se de que `IXC_API_USERNAME` e `IXC_API_PASSWORD` estão definidos nos secrets do Supabase

## 🧠 Atlas Analyzer - Análise Preditiva de Falhas

Sistema avançado de monitoramento que analisa logs e eventos de rede para detectar falhas antes que se tornem críticas.

### Características Principais

- **Análise Multi-Sinal**: Correlaciona dados de logs, mass outage events e status do IXC
- **Detecção Inteligente**: Identifica padrões de falhas (power_outage, BGP, backbone_break, integration_instability)
- **Alertas Automáticos**: Envia notificações WhatsApp para severidade HIGH
- **Agrupamento Geográfico**: PON/CTO/Região para identificar áreas afetadas
- **Thresholds Dinâmicos**: Configuráveis via banco de dados
- **Deduplicação**: Evita alertas duplicados em janela de 15 minutos
- **Análise de Tendências**: Compara com insights anteriores (worsening/stable/improving)

### Acesso

```
https://seu-projeto.lovable.app/admin/atlas-insights
```

**Permissões**: Admin e Editor

### Documentação

- 📚 [Documentação Técnica Completa](docs/atlas-analyzer-system.md)
- 🚀 [Guia Rápido de Uso](docs/atlas-analyzer-quick-start.md)

### Início Rápido

1. **Configurar responsáveis de alerta**
```sql
INSERT INTO responsaveis_alerta (nome, telefone, funcao, tipo_evento)
VALUES ('João Silva', '5561912345678', 'Gerente NOC', 'mass_outage');
```

2. **Ativar análise automática (cron job a cada 15min)**
```sql
SELECT cron.schedule(
  'atlas-analyzer-15min',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url:='https://mxdupkbpxjcfxdgrwknp.supabase.co/functions/v1/atlas-analyzer',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
    body:='{"windowMinutes":90}'::jsonb
  );
  $$
);
```

3. **Testar manualmente**
   - Acesse `/admin/atlas-insights`
   - Clique em "Executar análise"
   - Verifique os insights gerados

### Níveis de Severidade

| Nível | Quando aparece | Ação |
|-------|----------------|------|
| 🟢 **LOW** | < 2 erros/min | Monitorar |
| 🟠 **MEDIUM** | 2-5 erros/min | Investigar |
| 🔴 **HIGH** | > 5 erros/min OU outages críticos | **Alerta automático via WhatsApp + ação imediata** |

### Edge Function

```
POST /functions/v1/atlas-analyzer
Body: { "windowMinutes": 90 }
```

**Retorna**: Insight com severidade, causa provável, KPIs, grupos afetados e status de notificações.
