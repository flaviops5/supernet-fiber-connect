# 🎯 SPRINT 10 - ELIMINAÇÃO DE TIPOS `any` E CORREÇÕES CRÍTICAS

**Status:** 📋 Planejado  
**Prioridade:** 🔴 Alta  
**Tempo Estimado:** 12-14 horas  
**Dependências:** Sprints 1-9 concluídos ✅

---

## 📊 OBJETIVO

Reduzir tipos `any` de **296 para <50 ocorrências** (~83% de redução) e corrigir **19 problemas críticos** de UI/acessibilidade.

---

## 🚨 FASE 1: CORREÇÕES CRÍTICAS (2h)

### 1.1 - Conflitos de Cores (9 ocorrências)

#### ❌ ANTES (src/components/ui/button.tsx)
```typescript
hero: "bg-white/10 text-white border border-white/20 hover:bg-white/20",
success: "bg-green-600 text-white hover:bg-green-700",
warning: "bg-yellow-600 text-white hover:bg-yellow-700",
```

#### ✅ DEPOIS
```typescript
hero: "bg-primary/10 text-primary-foreground border border-primary/20 hover:bg-primary/20 backdrop-blur-sm",
success: "bg-success text-success-foreground hover:bg-success/80 transition-colors",
warning: "bg-warning text-warning-foreground hover:bg-warning/80 transition-colors",
```

#### Arquivos a Corrigir:
- [x] `src/components/ui/button.tsx` (3 linhas)
- [x] `src/components/HeroSection.tsx` (2 linhas)
- [x] `src/pages/Auth.tsx` (1 linha)
- [x] `src/pages/Automacao.tsx` (1 linha)
- [x] `src/pages/Blog.tsx` (2 linhas)

---

### 1.2 - Cores Hardcoded (10 ocorrências)

#### ❌ ANTES (src/components/FAQ.tsx)
```typescript
<div className="bg-[#f8f7f8] rounded-2xl border-l-4 border-[#4d64ae]">
  <IconComponent className="w-6 h-6 text-[#4d64ae]" />
  <h3 className="group-hover:text-[#4d64ae]">
```

#### ✅ DEPOIS
```typescript
// Usar FAQAccordion já criado no Sprint 8!
import { FAQAccordion } from '@/components/shared/FAQAccordion';

// Simplesmente chamar:
<FAQAccordion category="geral" />
```

#### Arquivos a Refatorar:
- [x] `src/components/FAQ.tsx` - substituir por `<FAQAccordion />`
- [x] `src/pages/Telemedicina.tsx` - substituir por `<FAQAccordion category="telemedicina" />`

**Benefícios:**
- Remove 10 cores hardcoded
- Centraliza lógica de FAQ
- Melhora manutenibilidade
- Usa design system

---

## 🔧 FASE 2: CRIAR TIPOS BASE (3h)

### 2.1 - Tipos de API (src/types/api.types.ts)

```typescript
/**
 * API Response Types
 * Sprint 10: Eliminação de any types
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface IXCResponse<T = unknown> {
  registros: T[];
  total: number;
  page: number;
  per_page?: number;
}

export interface IXCError {
  type: string;
  message: string;
  code?: number;
}

export interface EdgeFunctionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: Record<string, unknown>;
}

export interface PaginationParams {
  page: number;
  per_page: number;
  qtype?: string;
  query?: string;
  oper?: string;
}

export interface IXCContract {
  id: string;
  id_cliente: string;
  razao: string;
  status: string;
  valor: number;
  grupo_plan?: string;
  vencimento?: string;
}

export interface IXCCustomerData {
  id: string;
  razao: string;
  cnpj_cpf: string;
  email?: string;
  celular?: string;
  telefone?: string;
  endereco?: string;
}

export interface IXCFinancialTitle {
  id: string;
  id_cliente: string;
  valor: number;
  data_vencimento: string;
  data_pagamento?: string;
  status: 'aberto' | 'pago' | 'cancelado';
  nosso_numero?: string;
}
```

---

### 2.2 - Tipos de Erro (src/types/error.types.ts)

```typescript
/**
 * Error Types
 * Sprint 10: Substituir error: any
 */

export interface ErrorWithDetails extends Error {
  code?: string;
  statusCode?: number;
  details?: Record<string, unknown>;
}

export interface ValidationError extends ErrorWithDetails {
  field: string;
  rule: string;
}

export interface NetworkError extends ErrorWithDetails {
  url: string;
  method: string;
  status: number;
}

export interface IXCApiError extends ErrorWithDetails {
  ixcCode?: string;
  endpoint?: string;
}

export type ErrorHandler = (error: ErrorWithDetails) => void;

export function isErrorWithDetails(error: unknown): error is ErrorWithDetails {
  return (
    error instanceof Error &&
    'code' in error &&
    typeof (error as any).code === 'string'
  );
}

export function parseError(error: unknown): ErrorWithDetails {
  if (isErrorWithDetails(error)) {
    return error;
  }
  
  if (error instanceof Error) {
    return {
      ...error,
      name: error.name,
      message: error.message,
      code: 'UNKNOWN_ERROR'
    };
  }
  
  return {
    name: 'Error',
    message: String(error),
    code: 'UNEXPECTED_ERROR'
  } as ErrorWithDetails;
}
```

---

### 2.3 - Tipos de Eventos (src/types/event.types.ts)

```typescript
/**
 * Event Types
 * Sprint 10: Tipar callbacks e handlers
 */

export type EventHandler<T = void> = (event: T) => void;
export type AsyncEventHandler<T = void> = (event: T) => Promise<void>;

export interface FormChangeEvent<T = string> {
  target: {
    name: string;
    value: T;
  };
}

export interface SelectChangeEvent {
  value: string;
  label: string;
}

export interface FileChangeEvent {
  files: FileList | null;
}

export type InputChangeHandler = EventHandler<React.ChangeEvent<HTMLInputElement>>;
export type SelectChangeHandler = EventHandler<string>;
export type SubmitHandler<T = unknown> = AsyncEventHandler<T>;
```

---

## 🔄 FASE 3: SUBSTITUIR TIPOS (7h)

### 3.1 - Error Handling (80 ocorrências)

#### ❌ ANTES
```typescript
try {
  const result = await fetchData();
} catch (error: any) {
  console.error(error);
  toast.error(error.message);
}
```

#### ✅ DEPOIS
```typescript
import { parseError } from '@/types/error.types';
import { handleError } from '@/lib/error-handler';

try {
  const result = await fetchData();
} catch (error) {
  const err = parseError(error);
  handleError(err, {
    context: 'fetchData',
    title: 'Erro ao buscar dados'
  });
}
```

**Arquivos prioritários (top 10):**
1. `src/components/DiagnosticoClienteCompleto.tsx` - 8 ocorrências
2. `src/components/CashFlowProjections.tsx` - 4 ocorrências
3. `src/components/ContractSigning.tsx` - 3 ocorrências
4. `src/components/IXCPlanSelector.tsx` - 3 ocorrências
5. `src/components/EmailTemplateManagement.tsx` - 3 ocorrências
6. `supabase/functions/ixc-integration/index.ts` - 6 ocorrências
7. `supabase/functions/ixc-list-contracts/index.ts` - 3 ocorrências
8. `supabase/functions/sales-agent/index.ts` - 4 ocorrências

---

### 3.2 - IXC API Responses (35 ocorrências)

#### ❌ ANTES
```typescript
const { data } = await supabase.functions.invoke('ixc-proxy', {
  body: { endpoint: 'cliente', oper: 'read' }
});

const contracts: any[] = data?.registros || [];
```

#### ✅ DEPOIS
```typescript
import type { IXCResponse, IXCContract } from '@/types/api.types';

const { data } = await supabase.functions.invoke<IXCResponse<IXCContract>>('ixc-proxy', {
  body: { endpoint: 'cliente', oper: 'read' }
});

const contracts: IXCContract[] = data?.registros || [];
```

**Arquivos a atualizar:**
- `supabase/functions/ixc-proxy/index.ts`
- `supabase/functions/ixc-integration/index.ts`
- `supabase/functions/ixc-list-contracts/index.ts`
- `supabase/functions/send-payment-to-customer/index.ts`

---

### 3.3 - Callbacks e Handlers (40 ocorrências)

#### ❌ ANTES
```typescript
interface Props {
  onSuccess?: (data: any) => void;
  onChange?: (value: any) => void;
}
```

#### ✅ DEPOIS
```typescript
import type { EventHandler } from '@/types/event.types';
import type { ApiResponse } from '@/types/api.types';

interface Props<T = unknown> {
  onSuccess?: EventHandler<ApiResponse<T>>;
  onChange?: EventHandler<T>;
}
```

---

## 📊 CHECKLIST DE EXECUÇÃO

### Fase 1: Correções Críticas (2h)
- [ ] Atualizar `src/components/ui/button.tsx` (variants hero/success/warning)
- [ ] Corrigir `src/components/HeroSection.tsx` (navigation buttons)
- [ ] Corrigir `src/pages/Auth.tsx` (botão voltar)
- [ ] Corrigir `src/pages/Automacao.tsx` (botão CTA)
- [ ] Corrigir `src/pages/Blog.tsx` (input newsletter)
- [ ] Substituir `src/components/FAQ.tsx` por `<FAQAccordion />`
- [ ] Substituir FAQ em `src/pages/Telemedicina.tsx`
- [ ] Testar acessibilidade em dark mode
- [ ] Validar contraste WCAG 2.1 AA

### Fase 2: Criar Tipos (3h)
- [ ] Criar `src/types/api.types.ts`
- [ ] Criar `src/types/error.types.ts`
- [ ] Criar `src/types/event.types.ts`
- [ ] Exportar em `src/types/index.ts`
- [ ] Documentar tipos com JSDoc
- [ ] Criar testes unitários para parseError()

### Fase 3: Substituir any (7h)
- [ ] Substituir 80 `catch (error: any)` usando parseError()
- [ ] Tipar 35 IXC API responses
- [ ] Tipar 40 callbacks e handlers
- [ ] Atualizar imports nos arquivos modificados
- [ ] Rodar `tsc --noEmit` para validar
- [ ] Testar fluxos críticos

### Fase 4: Validação (2h)
- [ ] Executar ESLint (zero erros)
- [ ] Executar TypeScript strict check
- [ ] Testar build de produção
- [ ] Validar edge functions deploy
- [ ] Rodar testes E2E críticos
- [ ] Atualizar documentação

---

## 📈 MÉTRICAS DE SUCESSO

### Antes (Sprint 9)
- **Tipos any:** 296
- **Conflitos UI:** 9
- **Cores hardcoded:** 10
- **Health Score:** 78/100

### Depois (Sprint 10)
- **Tipos any:** <50 (-83%)
- **Conflitos UI:** 0 (-100%)
- **Cores hardcoded:** 0 (-100%)
- **Health Score:** 88/100 (+10)

---

## 🎯 PRÓXIMA SPRINT

**Sprint 11: Testes E2E e Cobertura**
- Implementar testes com Playwright
- Cobertura mínima: 30%
- Focus: Fluxos críticos (vendas, suporte, IXC)

**Sprint 12: Performance e Observabilidade**
- Migrar 100% console.log → logger
- Implementar métricas de performance
- Setup Sentry/DataDog

---

**Autor:** Agente Auditor de Código  
**Versão:** 1.0.0  
**Data:** 2025-10-25
