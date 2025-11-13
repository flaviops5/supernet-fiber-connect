# 📊 Guia de Coverage Report

## Visão Geral

Este guia explica como gerar, interpretar e melhorar a cobertura de testes do projeto.

## Gerando Reports

### Coverage Completo

```bash
npm run test:coverage
```

Isso irá:
- Executar todos os testes
- Gerar relatórios em múltiplos formatos
- Criar pasta `./coverage` com HTML navegável

### Ver Relatório HTML

```bash
# Abrir no navegador
open coverage/index.html   # macOS
start coverage/index.html  # Windows
xdg-open coverage/index.html  # Linux
```

### Coverage de Arquivo Específico

```bash
npx vitest run --coverage src/components/MyComponent.tsx
```

## Estrutura do Report

```
coverage/
├── index.html          # Relatório principal (navegável)
├── lcov.info          # Formato LCOV (CI/CD)
├── coverage-final.json # Dados brutos
└── text-summary.txt   # Resumo em texto
```

## Métricas de Coverage

### 4 Tipos de Cobertura

**1. Statement Coverage (Cobertura de Declarações)**
- % de linhas de código executadas
- Métrica mais básica

**2. Branch Coverage (Cobertura de Ramificações)**
- % de branches (if/else, switch) testados
- Mais rigorosa que statements

**3. Function Coverage (Cobertura de Funções)**
- % de funções chamadas durante testes
- Identifica funções não testadas

**4. Line Coverage (Cobertura de Linhas)**
- Similar a statements, mas por linha física
- Usado por muitas ferramentas

## Interpretação dos Resultados

### Níveis de Qualidade

```
90-100%  ⭐⭐⭐⭐⭐  Excelente
80-89%   ⭐⭐⭐⭐    Bom
70-79%   ⭐⭐⭐      Aceitável
60-69%   ⭐⭐        Ruim
<60%     ⭐          Crítico
```

### Meta do Projeto

- **Statements**: 85%+
- **Branches**: 80%+
- **Functions**: 85%+
- **Lines**: 85%+

## O Que Está Incluído

### Frontend (src/)

✅ **Incluído:**
- `src/components/**/*.{ts,tsx}`
- `src/hooks/**/*.ts`
- `src/lib/**/*.ts`
- `src/pages/**/*.tsx`
- `src/utils/**/*.ts`

❌ **Excluído:**
- `src/tests/**` (arquivos de teste)
- `src/integrations/supabase/types.ts` (gerado)
- `**/*.config.*` (configs)
- `**/*.d.ts` (types)

### Backend (supabase/functions/)

✅ **Incluído:**
- `supabase/functions/**/*.ts`

❌ **Excluído:**
- `supabase/functions/_shared/**` (utilitários)
- Arquivos de teste

## Como Melhorar Coverage

### 1. Identificar Gaps

```bash
# Ver relatório detalhado
npm run test:coverage
```

No HTML, arquivos com baixa cobertura aparecem em **vermelho**.

### 2. Priorizar Arquivos Críticos

Focar em:
- ✅ Lógica de negócio
- ✅ Funções de autenticação
- ✅ Manipulação de dados sensíveis
- ✅ Integrações externas (IXC, WhatsApp)
- ❌ UI simples (botões, cards)
- ❌ Componentes puramente visuais

### 3. Estratégias por Tipo

**Components (TSX)**

```typescript
// BadExample.test.tsx
it('renders', () => {
  render(<MyComponent />);
});

// GoodExample.test.tsx
describe('MyComponent', () => {
  it('renders with default props', () => {
    render(<MyComponent />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('handles click event', async () => {
    const onClick = vi.fn();
    render(<MyComponent onClick={onClick} />);
    
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });

  it('shows error state', () => {
    render(<MyComponent error="Test error" />);
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });
});
```

**Hooks**

```typescript
// useMyHook.test.ts
import { renderHook, act } from '@testing-library/react';
import { useMyHook } from './useMyHook';

describe('useMyHook', () => {
  it('initializes with default state', () => {
    const { result } = renderHook(() => useMyHook());
    expect(result.current.value).toBe(0);
  });

  it('updates value', () => {
    const { result } = renderHook(() => useMyHook());
    
    act(() => {
      result.current.increment();
    });
    
    expect(result.current.value).toBe(1);
  });
});
```

**Edge Functions**

```typescript
// myFunction.test.ts
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

Deno.test("myFunction - success case", async () => {
  const result = await myFunction({ input: "test" });
  assertEquals(result.success, true);
});

Deno.test("myFunction - error case", async () => {
  const result = await myFunction({ input: "" });
  assertEquals(result.error, "Input required");
});
```

## Configuração Atual (vitest.config.ts)

```typescript
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html', 'lcov', 'text-summary'],
  reportsDirectory: './coverage',
  include: [
    'src/**/*.{ts,tsx}',
    'supabase/functions/**/*.ts'
  ],
  exclude: [
    // ... ver arquivo completo
  ]
}
```

## CI/CD Integration

### GitHub Actions (exemplo)

```yaml
- name: Run tests with coverage
  run: npm run test:coverage

- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info
    flags: unittests
```

### Quality Gates

```yaml
- name: Check coverage thresholds
  run: |
    COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.statements.pct')
    if (( $(echo "$COVERAGE < 85" | bc -l) )); then
      echo "Coverage $COVERAGE% is below threshold 85%"
      exit 1
    fi
```

## Comandos Úteis

```bash
# Coverage completo
npm run test:coverage

# Coverage + watch mode
npx vitest --coverage --watch

# Coverage de arquivo específico
npx vitest run --coverage src/path/to/file.ts

# Só mostrar arquivos não cobertos
npx vitest run --coverage --reporter=verbose

# Gerar somente LCOV (para CI)
npx vitest run --coverage --reporter=lcov
```

## Análise de Trends

### Tracking Histórico

```bash
# Salvar snapshot
cp coverage/coverage-summary.json coverage-$(date +%Y%m%d).json

# Comparar com baseline
diff coverage-baseline.json coverage/coverage-summary.json
```

### Métricas no Tempo

| Data | Statements | Branches | Functions | Lines |
|------|-----------|----------|-----------|-------|
| 2024-01 | 72% | 65% | 70% | 73% |
| 2024-02 | 78% | 71% | 76% | 79% |
| 2024-03 | 85% | 80% | 84% | 86% |
| **Meta** | **85%** | **80%** | **85%** | **85%** |

## Áreas Críticas Atuais

### Alta Prioridade (0-50% coverage)

- [ ] `supabase/functions/ixc-integration/index.ts`
- [ ] `supabase/functions/support-tech-agent/index.ts`
- [ ] `src/components/chat/`
- [ ] `src/hooks/useIXC*.ts`

### Média Prioridade (50-80% coverage)

- [ ] `src/pages/Atendimento.tsx`
- [ ] `src/components/IXC*.tsx`
- [ ] `src/utils/`

### Baixa Prioridade (80%+ coverage)

- [x] `src/tests/integration/`
- [x] `src/components/ui/` (componentes básicos)

## Anti-Patterns

### ❌ Não Fazer

```typescript
// Teste inútil - só para números
it('exists', () => {
  expect(true).toBe(true);
});

// Teste sem assertions
it('renders', () => {
  render(<Component />);
  // Sem expect!
});

// Mock excessivo
it('calls API', async () => {
  vi.mock('everything');
  // Testa mock, não código real
});
```

### ✅ Fazer

```typescript
// Teste com valor
it('displays user data correctly', async () => {
  const user = { name: 'Test', email: 'test@example.com' };
  render(<UserProfile user={user} />);
  
  expect(screen.getByText('Test')).toBeInTheDocument();
  expect(screen.getByText('test@example.com')).toBeInTheDocument();
});

// Teste de comportamento
it('handles form submission', async () => {
  const onSubmit = vi.fn();
  render(<Form onSubmit={onSubmit} />);
  
  await userEvent.type(screen.getByLabelText('Name'), 'John');
  await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
  
  expect(onSubmit).toHaveBeenCalledWith({ name: 'John' });
});
```

## Próximos Passos

1. **Executar baseline**: `npm run test:coverage`
2. **Identificar gaps**: Analisar relatório HTML
3. **Priorizar**: Focar em lógica crítica primeiro
4. **Iterar**: Adicionar testes incrementalmente
5. **Monitorar**: Executar coverage antes de cada PR
6. **Automatizar**: Integrar no CI/CD

## Recursos

- [Vitest Coverage Docs](https://vitest.dev/guide/coverage.html)
- [Testing Library Best Practices](https://testing-library.com/docs/guiding-principles/)
- [Istanbul Coverage Formats](https://istanbul.js.org/)
