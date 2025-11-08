# 📋 Auditoria de Arquitetura - Janeiro 2025

**Status:** Análise Completa  
**Data:** 2025-01-09  
**Escopo:** Frontend (React/TypeScript) + Backend (Supabase Edge Functions)

---

## 🎯 Sumário Executivo

### Pontuação Geral: 7.5/10

**Pontos Fortes:**
- ✅ Estrutura de pastas bem organizada com separação por domínio
- ✅ Design system robusto e consistente (HSL + CVA)
- ✅ Uso de TypeScript para type safety
- ✅ Hooks customizados para lógica reutilizável
- ✅ Documentação técnica abrangente

**Pontos Críticos:**
- ⚠️ Lógica de negócio misturada com componentes UI
- ⚠️ Uso inconsistente de loggers (2 sistemas diferentes)
- ⚠️ Edge functions monolíticas (>4.000 linhas)
- ⚠️ Falta de camada de serviços/API abstraída
- ⚠️ Console.log direto em 712 locais (Edge Functions)

---

## 🔴 CRÍTICO - Implementar Imediatamente

### 1. **Separação de Lógica de Negócio dos Componentes**

**Problema:** Componentes fazem chamadas diretas ao Supabase misturando UI + data fetching + business logic.

**Evidências:**
```typescript
// ❌ ATUAL: src/components/admin/UserManagement.tsx (linhas 59-102)
const loadUsers = async () => {
  const { data: profilesData } = await supabase.from('profiles').select('*');
  const usersWithRoles = await Promise.all(
    (profilesData || []).map(async (profile) => {
      const { data: roleData } = await supabase.from('user_roles')...
    })
  );
  setUsers(usersWithRoles);
};

// ❌ ATUAL: src/components/OmnichannelChat.tsx (linhas 78-103)
const loadConversationMessages = async (convId?: string) => {
  const { data, error } = await supabase
    .from('conversation_messages')
    .select('*')
    .eq('conversation_id', targetId)...
};
```

**Impacto:**
- 🔴 Dificulta testes unitários (precisa mockar Supabase em cada componente)
- 🔴 Viola Single Responsibility Principle
- 🔴 Duplicação de queries (mesma lógica em vários componentes)
- 🔴 Dificulta implementação de cache/offline-first

**Solução:**
```typescript
// ✅ PROPOSTA: src/services/user.service.ts
export class UserService {
  static async loadUsersWithRoles(): Promise<UserProfile[]> {
    const { data: profilesData } = await supabase.from('profiles').select('*');
    return Promise.all(
      (profilesData || []).map(async (profile) => {
        const { data: roleData } = await supabase.from('user_roles')...
        return { ...profile, user_roles: roleData ? [roleData] : [{ role: 'viewer' }] };
      })
    );
  }
}

// ✅ PROPOSTA: src/services/conversation.service.ts
export class ConversationService {
  static async getMessages(conversationId: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from('conversation_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    
    if (error) throw new ApiError(error.message);
    return data.map(msg => this.mapToMessage(msg));
  }
}

// ✅ Componente só manipula UI
const UserManagement = () => {
  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => UserService.loadUsersWithRoles()
  });
  
  return <div>...</div>;
};
```

**Arquivos afetados:** ~50 componentes com chamadas diretas ao Supabase

**Esforço:** 40-60 horas

---

### 2. **Unificação do Sistema de Logging**

**Problema:** Existem 2 sistemas de logging concorrentes e inconsistentes.

**Evidências:**
```typescript
// Sistema 1: src/lib/logger.ts (frontend)
export const logger = {
  info: (message: string, meta?: LogMetadata) => {...}
  error: (message: string, error?: Error, meta?: LogMetadata) => {...}
};

// Sistema 2: supabase/functions/_shared/structured-logger.ts (backend)
export function createLogger(agentName: string, req?: Request) {
  return {
    info: (msg: string, meta?: JsonObject) => {...}
    error: (msg: string, meta?: JsonObject) => {...}
  };
}

// ❌ PIOR: Console.log direto em 712 locais (Edge Functions)
console.log('✅ Cache HIT: ${key}');
console.error('❌ IXC call failed:', error);
console.warn('⚠️ Falha ao buscar geo:', e);
```

**Impacto:**
- 🔴 Impossível centralizar monitoramento
- 🔴 Formato inconsistente entre frontend/backend
- 🔴 Não há níveis de severidade padronizados
- 🔴 Logs diretos no console não são rastreáveis em produção

**Solução:**
```typescript
// ✅ PROPOSTA: src/lib/unified-logger.ts
export interface LoggerConfig {
  context: string; // 'frontend' | 'edge-function-name'
  environment: 'dev' | 'staging' | 'prod';
  correlationId?: string;
}

export class UnifiedLogger {
  constructor(private config: LoggerConfig) {}
  
  info(message: string, metadata?: Record<string, unknown>) {
    this.log('info', message, metadata);
  }
  
  error(message: string, error?: Error, metadata?: Record<string, unknown>) {
    this.log('error', message, { ...metadata, error: this.serializeError(error) });
  }
  
  private log(level: string, message: string, metadata?: Record<string, unknown>) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      context: this.config.context,
      message,
      metadata: this.sanitize(metadata),
      correlationId: this.config.correlationId
    };
    
    // Envia para Supabase monitoring_logs (já existe a tabela)
    // + Console (dev) + Sentry (prod)
    this.send(logEntry);
  }
}

// Uso:
const logger = new UnifiedLogger({ context: 'UserManagement', environment: 'prod' });
logger.info('Users loaded', { count: 42 });
```

**Migração:**
1. Criar `UnifiedLogger` em `src/lib/unified-logger.ts`
2. Atualizar `structured-logger.ts` (Edge Functions) para usar `UnifiedLogger`
3. Criar script de busca/substituição para os 712 `console.*` diretos
4. Remover `src/lib/logger.ts` e `src/utils/logger.ts` (duplicados)

**Arquivos afetados:** 
- Frontend: ~30 arquivos
- Edge Functions: 89 arquivos (712 ocorrências de console.*)

**Esforço:** 25-35 horas

---

### 3. **Refatoração de Edge Function Monolítica**

**Problema:** `support-tech-agent/index.ts` tem **4.798 linhas** - impossível de manter.

**Evidências:**
```typescript
// supabase/functions/support-tech-agent/index.ts
// Linhas 1-4798 = tudo em um arquivo
- Validações
- Roteamento de cenários
- Integrações IXC
- Diagnóstico técnico
- Gerenciamento de estado
- Formatação de mensagens
- Cálculos de métricas
- ... e muito mais
```

**Impacto:**
- 🔴 Tempo de cold start elevado
- 🔴 Dificulta debugging (onde está o bug em 4.798 linhas?)
- 🔴 Merges conflituosos constantes
- 🔴 Onboarding de novos devs leva dias

**Solução:**
```
supabase/functions/support-tech-agent/
├── index.ts (150 linhas - apenas router)
├── handlers/
│   ├── scenario-a-handler.ts (diagnóstico básico)
│   ├── scenario-b-handler.ts (ONU/óptica)
│   ├── scenario-c-handler.ts (reinicialização)
│   ├── scenario-d-handler.ts (encaminhamento técnico)
│   └── scenario-e-handler.ts (WAN/WiFi)
├── services/
│   ├── ixc.service.ts (todas as chamadas IXC)
│   ├── diagnostic.service.ts (lógica de diagnóstico)
│   └── state.service.ts (flow state management)
├── validators/
│   ├── input.validator.ts
│   └── state.validator.ts
└── utils/
    ├── message-formatter.ts
    └── metrics-calculator.ts
```

**Implementação:**
```typescript
// ✅ index.ts (router simples)
import { handleScenarioA } from './handlers/scenario-a-handler.ts';
import { handleScenarioB } from './handlers/scenario-b-handler.ts';
// ... outros handlers

serve(async (req) => {
  const { message, conversationId, context } = await req.json();
  
  // Determinar cenário
  const scenario = await detectScenario(message, context);
  
  // Delegar para handler específico
  switch (scenario) {
    case 'A': return handleScenarioA({ message, conversationId, context });
    case 'B': return handleScenarioB({ message, conversationId, context });
    // ...
  }
});
```

**Arquivos afetados:** 1 gigante → ~20 focados

**Esforço:** 50-70 horas

---

## 🟠 IMPORTANTE - Implementar em 2-4 semanas

### 4. **Criação de Camada de Serviços**

**Problema:** Não existe uma camada de abstração para chamadas ao backend.

**Evidências:**
- 21 componentes fazem `supabase.from()` ou `supabase.rpc()` diretamente
- Lógica duplicada em múltiplos lugares
- Dificulta implementação de retry, cache, offline-first

**Solução:**
```typescript
// ✅ src/services/api/base.service.ts
export abstract class BaseService {
  protected async query<T>(fn: () => Promise<PostgrestResponse<T>>): Promise<T> {
    try {
      const { data, error } = await fn();
      if (error) throw new ApiError(error.message, error.code);
      return data;
    } catch (error) {
      logger.error('API call failed', error);
      throw error;
    }
  }
}

// ✅ src/services/api/kanban.service.ts
export class KanbanService extends BaseService {
  async getBoardStats(boardId: string) {
    return this.query(() => 
      supabase.rpc('kanban_board_stats', { board_id: boardId })
    );
  }
}
```

**Arquivos afetados:** ~21 componentes

**Esforço:** 20-30 horas

---

### 5. **Organização de Hooks por Domínio**

**Problema:** Todos os hooks estão em `src/hooks/` sem organização por feature.

**Situação Atual:**
```
src/hooks/
├── useActivityLog.ts
├── useFeatureFlag.ts
├── useFileValidation.ts
├── useFocusTrap.ts
├── useKanban.ts (domínio específico!)
├── useKeyboardShortcut.ts
├── usePasswordStrength.ts
├── useProfileValidation.ts
├── useRateLimit.ts
├── useRobustValidation.ts
├── useSanitization.ts
├── useScrollToHash.ts
├── useSecurityLog.ts
└── useUserRole.ts
```

**Proposta:**
```
src/hooks/
├── common/ (hooks genéricos)
│   ├── use-debounce.ts
│   ├── use-toast.ts
│   ├── useScrollToHash.ts
│   └── useFocusTrap.ts
├── security/ (validação/segurança)
│   ├── useFileValidation.ts
│   ├── usePasswordStrength.ts
│   ├── useProfileValidation.ts
│   ├── useRateLimit.ts
│   ├── useRobustValidation.ts
│   ├── useSanitization.ts
│   └── useSecurityLog.ts
├── features/
│   ├── kanban/
│   │   └── useKanban.ts
│   ├── auth/
│   │   └── useUserRole.ts
│   └── admin/
│       ├── useActivityLog.ts
│       └── useFeatureFlag.ts
└── accessibility/
    ├── useKeyboardShortcut.ts
    └── useFocusTrap.ts
```

**Arquivos afetados:** ~15 hooks + imports em ~50 componentes

**Esforço:** 10-15 horas

---

### 6. **Extrair Lógica de Validação**

**Problema:** Validações inline e duplicadas em múltiplos componentes.

**Evidências:**
```typescript
// ❌ src/components/AddUserForm.tsx (inline)
const userSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres')
});

// ❌ Duplicado em outros formulários
```

**Solução:**
```typescript
// ✅ src/lib/validation/schemas/user.schema.ts
export const createUserSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .regex(/[A-Z]/, 'Deve conter letra maiúscula')
    .regex(/[0-9]/, 'Deve conter número')
});

export const updateUserSchema = createUserSchema.partial();

// ✅ Uso no componente
import { createUserSchema } from '@/lib/validation/schemas/user.schema';

const form = useForm({
  resolver: zodResolver(createUserSchema)
});
```

**Estrutura Proposta:**
```
src/lib/validation/
├── schemas/
│   ├── user.schema.ts
│   ├── conversation.schema.ts
│   ├── plan.schema.ts
│   └── index.ts
├── rules/
│   ├── cpf.validator.ts
│   ├── phone.validator.ts
│   └── cep.validator.ts
└── index.ts (exports centralizados)
```

**Arquivos afetados:** ~15 formulários

**Esforço:** 15-20 horas

---

## 🟡 MELHORIAS - Implementar em 1-2 meses

### 7. **Documentação de API Interna**

**Problema:** Não há documentação centralizada dos serviços internos.

**Solução:**
- Criar OpenAPI spec para Edge Functions
- JSDoc completo em todos os serviços
- Storybook para componentes (já sugerido em docs/sugestoes-arquitetura.md)

**Esforço:** 30-40 horas

---

### 8. **Testes Unitários**

**Problema:** Não há testes unitários (apenas alguns E2E).

**Proposta:**
```
src/
├── services/
│   ├── user.service.ts
│   └── user.service.test.ts (✅ novo)
├── hooks/
│   ├── useKanban.ts
│   └── useKanban.test.ts (✅ novo)
└── components/
    ├── Button.tsx
    └── Button.test.tsx (✅ novo)
```

**Frameworks:** Vitest + Testing Library (já instalados!)

**Esforço:** 60-80 horas (cobertura de 60%)

---

### 9. **Padronização de Error Handling**

**Problema:** Tratamento de erros inconsistente.

**Evidências:**
```typescript
// ❌ Diferentes padrões
try { ... } catch (error) { console.error(error); }
try { ... } catch (error) { logger.error('Failed', error as Error); }
try { ... } catch (error) { toast.error('Erro'); }
try { ... } catch (e) { throw new Error(String(e)); }
```

**Solução:**
```typescript
// ✅ src/lib/errors/app-error.ts
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, fields?: Record<string, string>) {
    super(message, 'VALIDATION_ERROR', 400, { fields });
  }
}

// ✅ Global error boundary
export function handleError(error: unknown) {
  if (error instanceof AppError) {
    logger.error(error.message, error, error.context);
    toast.error(error.message);
  } else if (error instanceof Error) {
    logger.error('Unexpected error', error);
    toast.error('Erro inesperado');
  }
}
```

**Arquivos afetados:** ~100 componentes/funções

**Esforço:** 20-30 horas

---

### 10. **Mover Lógica Complexa de Components para Hooks**

**Problema:** Componentes com lógica pesada (state management complexo).

**Evidências:**
```typescript
// ❌ src/pages/AdminFluxoAgentes.tsx (linhas 62-69)
const [selectedAgent, setSelectedAgent] = useState<string>('support-tech-agent');
const [selectedSubject, setSelectedSubject] = useState<string>('');
const [isGeneratingSimulations, setIsGeneratingSimulations] = useState(false);
const [showSimulations, setShowSimulations] = useState(false);
const [configDialogOpen, setConfigDialogOpen] = useState(false);
const [configStepKey, setConfigStepKey] = useState('');
const [configStepId, setConfigStepId] = useState('');
const [configFocusTools, setConfigFocusTools] = useState(false);
// + 200 linhas de lógica
```

**Solução:**
```typescript
// ✅ src/hooks/features/admin/useFluxoAgentes.ts
export function useFluxoAgentes() {
  const [state, dispatch] = useReducer(fluxoAgentesReducer, initialState);
  
  const selectAgent = (agent: string) => dispatch({ type: 'SELECT_AGENT', payload: agent });
  const generateSimulations = async () => { ... };
  
  return {
    state,
    selectAgent,
    generateSimulations,
    // ... outras ações
  };
}

// ✅ Componente só renderiza UI
const AdminFluxoAgentes = () => {
  const { state, selectAgent, generateSimulations } = useFluxoAgentes();
  
  return <div>...</div>;
};
```

**Arquivos afetados:** ~10 páginas complexas

**Esforço:** 25-35 horas

---

## 🟢 OPCIONAIS - Nice to Have

### 11. **Migração para Arquitetura de Features**

**Atual:**
```
src/
├── components/ (150+ arquivos)
├── pages/
├── hooks/
└── lib/
```

**Feature-Based:**
```
src/
├── features/
│   ├── kanban/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── types/
│   │   └── index.ts
│   ├── admin/
│   └── atendimento/
└── shared/
    ├── components/
    ├── hooks/
    └── utils/
```

**Esforço:** 80-100 horas

---

### 12. **Implementar Cache Strategy**

**Proposta:**
- React Query com cache persistente
- Service Worker para offline-first
- Stale-While-Revalidate pattern

**Esforço:** 40-50 horas

---

### 13. **Code Splitting Avançado**

**Proposta:**
- Lazy loading por rota
- Dynamic imports para componentes pesados
- Preload crítico

**Esforço:** 20-30 horas

---

## 📊 Resumo de Priorização

| Prioridade | Item | Impacto | Esforço | ROI |
|------------|------|---------|---------|-----|
| 🔴 CRÍTICO | Separar lógica de negócio | Muito Alto | 40-60h | ⭐⭐⭐⭐⭐ |
| 🔴 CRÍTICO | Unificar logging | Alto | 25-35h | ⭐⭐⭐⭐⭐ |
| 🔴 CRÍTICO | Refatorar Edge Function | Muito Alto | 50-70h | ⭐⭐⭐⭐ |
| 🟠 IMPORTANTE | Camada de serviços | Alto | 20-30h | ⭐⭐⭐⭐ |
| 🟠 IMPORTANTE | Organizar hooks | Médio | 10-15h | ⭐⭐⭐⭐ |
| 🟠 IMPORTANTE | Extrair validações | Médio | 15-20h | ⭐⭐⭐ |
| 🟡 MELHORIA | Documentação API | Médio | 30-40h | ⭐⭐⭐ |
| 🟡 MELHORIA | Testes unitários | Alto | 60-80h | ⭐⭐⭐⭐ |
| 🟡 MELHORIA | Error handling | Médio | 20-30h | ⭐⭐⭐ |
| 🟡 MELHORIA | Extrair lógica p/ hooks | Alto | 25-35h | ⭐⭐⭐ |
| 🟢 OPCIONAL | Arquitetura features | Alto | 80-100h | ⭐⭐ |
| 🟢 OPCIONAL | Cache strategy | Médio | 40-50h | ⭐⭐ |
| 🟢 OPCIONAL | Code splitting | Baixo | 20-30h | ⭐⭐ |

---

## 📋 Plano de Ação Sugerido

### Sprint 1 (2 semanas) - Fundação
1. ✅ Unificar sistema de logging (25-35h)
2. ✅ Criar camada de serviços base (20-30h)

### Sprint 2 (2 semanas) - Separação de Responsabilidades
3. ✅ Extrair lógica de negócio (40-60h)

### Sprint 3 (3 semanas) - Refatoração Crítica
4. ✅ Refatorar support-tech-agent (50-70h)

### Sprint 4 (1 semana) - Organização
5. ✅ Reorganizar hooks (10-15h)
6. ✅ Extrair validações (15-20h)

### Sprint 5+ - Melhorias Contínuas
7. Implementar melhorias opcionais conforme prioridade

---

## 🎓 Boas Práticas Recomendadas

### Clean Code
- ✅ Funções com no máximo 50 linhas
- ✅ Componentes com no máximo 200 linhas
- ✅ Nomes descritivos (evitar abreviações)
- ✅ Um nível de abstração por função

### Type Safety
- ✅ Evitar `any` (usar `unknown` quando necessário)
- ✅ Interfaces explícitas para props
- ✅ Zod para runtime validation

### Performance
- ✅ Memo para componentes pesados
- ✅ useMemo/useCallback quando necessário
- ✅ Code splitting por rota
- ✅ Lazy loading de imagens

### Testing
- ✅ 60% cobertura de código mínima
- ✅ Testes unitários para services/hooks
- ✅ Testes de integração para features críticas
- ✅ E2E para fluxos principais

---

## 📚 Referências

- [Clean Architecture - Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Feature-Sliced Design](https://feature-sliced.design/)
- [React Best Practices 2024](https://react.dev/learn/thinking-in-react)
- [Supabase Edge Functions Best Practices](https://supabase.com/docs/guides/functions/best-practices)

---

**Próximo Passo:** Aprovar prioridades e iniciar Sprint 1 (Unificação de Logging + Camada de Serviços).
