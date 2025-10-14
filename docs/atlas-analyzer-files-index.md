# 📁 Atlas Analyzer - Índice de Arquivos

## 📚 Documentação

| Arquivo | Descrição | Link |
|---------|-----------|------|
| `atlas-analyzer-system.md` | Documentação técnica completa do sistema | [Ver](./atlas-analyzer-system.md) |
| `atlas-analyzer-quick-start.md` | Guia rápido de início | [Ver](./atlas-analyzer-quick-start.md) |
| `atlas-analyzer-api-reference.md` | Referência da API REST | [Ver](./atlas-analyzer-api-reference.md) |
| `atlas-analyzer-files-index.md` | Este arquivo (índice de todos os arquivos) | - |

## 🔧 Edge Function

| Arquivo | Descrição | Caminho |
|---------|-----------|---------|
| `index.ts` | Função principal do Atlas Analyzer v2.0 | `supabase/functions/atlas-analyzer/index.ts` |

**Dependências compartilhadas:**
- `_shared/structured-logger.ts` - Logger estruturado
- `_shared/ixc-client.ts` - Cliente IXC com retry
- `_shared/circuit-breaker.ts` - Circuit breaker pattern
- `_shared/types.ts` - TypeScript types

## 🖥️ Frontend (React)

| Arquivo | Descrição | Caminho |
|---------|-----------|---------|
| `AtlasInsights.tsx` | Página principal do dashboard | `src/pages/AtlasInsights.tsx` |
| `AdminSidebar.tsx` | Sidebar com link para Atlas Insights | `src/components/AdminSidebar.tsx` |
| `HPFuncoes.tsx` | Hub de funções (inclui atlas-analyzer) | `src/pages/HPFuncoes.tsx` |
| `App.tsx` | Roteamento (route `/admin/atlas-insights`) | `src/App.tsx` |

## 🗄️ Banco de Dados

### Tabelas

| Tabela | Descrição | Schema |
|--------|-----------|--------|
| `atlas_insights` | Armazena os insights gerados | Ver migration |
| `atlas_config` | Configurações e thresholds dinâmicos | Ver migration |
| `responsaveis_alerta` | Cadastro de responsáveis para alertas | Ver migration |

### Migration

**Arquivo**: Executado via `supabase--migration` tool em 2025-01-14

**Conteúdo:**
- Criação das 3 tabelas
- Índices para performance
- RLS policies
- Triggers para updated_at
- Dados iniciais (config padrão + responsáveis exemplo)

**Comandos importantes:**
```sql
-- Ver insights recentes
SELECT * FROM atlas_insights ORDER BY created_at DESC LIMIT 10;

-- Ver configuração atual
SELECT * FROM atlas_config;

-- Ver responsáveis ativos
SELECT * FROM responsaveis_alerta WHERE ativo = true;
```

## ⚙️ Configuração

| Item | Localização | Descrição |
|------|-------------|-----------|
| Route config | `supabase/config.toml` | `[functions.atlas-analyzer] verify_jwt = false` |
| Cron job | SQL via `pg_cron` | Executar a cada 15 minutos |
| Thresholds | Tabela `atlas_config` | Thresholds dinâmicos para severidade |
| Responsáveis | Tabela `responsaveis_alerta` | Destinatários de alertas |

## 🔐 Secrets Necessários

| Secret | Descrição | Usado por |
|--------|-----------|-----------|
| `SUPABASE_URL` | URL base do Supabase | atlas-analyzer |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | atlas-analyzer |
| `SUPABASE_ANON_KEY` | Anon key (opcional) | Frontend |
| `EVOLUTION_INSTANCE_NAME` | Instância Evolution (padrão: SDR2) | Notificações WhatsApp |
| `IXC_API_BASE_URL` | Base URL do IXC | ixc-proxy |
| `IXC_API_USERNAME` | User IXC | ixc-proxy |
| `IXC_API_PASSWORD` | Senha IXC | ixc-proxy |

## 📊 Fluxo de Dados

```
┌─────────────────────────────────────────────────────────────┐
│  1. Trigger (Manual ou Cron Job a cada 15min)              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  2. atlas-analyzer Edge Function                            │
│     - Carrega thresholds de atlas_config                    │
│     - Busca logs (monitoring_logs)                          │
│     - Busca outages (mass_outage_events)                    │
│     - Busca clientes offline (via ixc-proxy)                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Análise & Classificação                                 │
│     - Calcula errors_per_min                                │
│     - Detecta padrões (dying gasp, BGP, timeouts)           │
│     - Infere causa provável                                 │
│     - Determina severidade (LOW/MEDIUM/HIGH)                │
│     - Agrupa por PON/CTO/REGIÃO                             │
│     - Calcula tendência (últimos 3 insights)                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Deduplicação (15 minutos)                               │
│     - Verifica insights similares recentes                  │
│     - Se duplicado: retorna skipped                         │
│     - Se novo: continua para persistência                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  5. Persistência                                            │
│     - INSERT em atlas_insights                              │
│     - Retorna insight_id                                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  6. Notificações (apenas se severity = HIGH)                │
│     - Busca responsáveis ativos (responsaveis_alerta)       │
│     - Envia WhatsApp via send-whatsapp-message              │
│     - UPDATE em atlas_insights com status de notificações   │
└─────────────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  7. Frontend (AtlasInsights.tsx)                            │
│     - Carrega insights de atlas_insights                    │
│     - Exibe KPIs, gráficos e cards                          │
│     - Permite execução manual                               │
└─────────────────────────────────────────────────────────────┘
```

## 🧪 Arquivos de Teste

**Não há arquivos de teste dedicados atualmente.**

**Testes manuais via:**
1. Interface: `/admin/atlas-insights` → Botão "Executar análise"
2. SQL: Queries de validação (ver quick-start.md)
3. cURL: Chamada direta à edge function

## 📝 Arquivos de Configuração Relacionados

| Arquivo | Relevância | Descrição |
|---------|-----------|-----------|
| `supabase/config.toml` | ⭐⭐⭐ | Configuração da edge function |
| `README.md` | ⭐⭐ | Seção sobre Atlas Analyzer |
| `package.json` | ⭐ | Dependências do projeto |
| `tailwind.config.ts` | ⭐ | Tokens de design (cores, etc.) |
| `src/index.css` | ⭐ | Variáveis CSS globais |

## 🔗 Dependências com Outros Componentes

### Edge Functions que o Atlas usa:
- `ixc-proxy` - Buscar clientes offline
- `send-whatsapp-message` - Enviar alertas

### Tabelas que o Atlas lê:
- `monitoring_logs` - Fonte de logs
- `mass_outage_events` - Fonte de outages
- `atlas_config` - Configurações
- `responsaveis_alerta` - Destinatários

### Tabelas que o Atlas escreve:
- `atlas_insights` - Resultados da análise

### Componentes frontend relacionados:
- `AdminSidebar` - Navegação
- `HPFuncoes` - Hub de funções
- `AuthGuard` - Controle de acesso

## 🛠️ Como Adicionar Novas Features

### 1. Novo KPI

**Arquivo**: `supabase/functions/atlas-analyzer/index.ts`

```typescript
// Adicionar cálculo
const newKpi = logs.filter(...).length;

// Adicionar ao objeto kpis
const kpis = {
  ...existingKpis,
  new_kpi: newKpi
};
```

**Atualizar documentação**:
- `atlas-analyzer-system.md` (seção Métricas)
- `atlas-analyzer-api-reference.md` (KPIs Object)

### 2. Nova Causa Provável

**Arquivo**: `supabase/functions/atlas-analyzer/index.ts`

```typescript
type Cause = 
  | "power_outage"
  | "bgp"
  | "backbone_break"
  | "integration_instability"
  | "new_cause"        // ← Adicionar aqui
  | "unknown";

// Atualizar função inferCause()
function inferCause(...): Cause {
  // Adicionar lógica para nova causa
  if (newCondition) return "new_cause";
  ...
}
```

**Atualizar documentação**:
- `atlas-analyzer-system.md` (seção Lógica de Inferência)
- `atlas-analyzer-quick-start.md` (tabela Causas Prováveis)

### 3. Novo Filtro no Frontend

**Arquivo**: `src/pages/AtlasInsights.tsx`

```typescript
// Adicionar estado
const [newFilter, setNewFilter] = useState("all");

// Adicionar à query
if (newFilter !== "all") {
  query = query.eq("field", newFilter);
}

// Adicionar Select no JSX
<Select onValueChange={setNewFilter}>
  <SelectItem value="all">Todos</SelectItem>
  <SelectItem value="value1">Opção 1</SelectItem>
</Select>
```

## 📞 Suporte e Contribuição

- **Issues**: Reportar bugs ou sugestões no GitHub
- **Logs**: Supabase > Functions > atlas-analyzer > Logs
- **SQL Editor**: Para queries e ajustes de configuração

## 🎯 Checklist de Deploy

- [ ] Secrets configurados (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, etc.)
- [ ] Migration executada (tabelas criadas)
- [ ] Responsáveis configurados em `responsaveis_alerta`
- [ ] Thresholds ajustados em `atlas_config` (opcional)
- [ ] Cron job agendado via `pg_cron`
- [ ] Teste manual realizado (botão "Executar análise")
- [ ] Verificar logs sem erros
- [ ] Testar notificações HIGH (se possível)
- [ ] Documentação revisada

---

**Última atualização**: 2025-01-14
**Versão do sistema**: 2.0
**Autor**: Sistema Atlas Analyzer Team
