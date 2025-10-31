# 🧪 Testes Automatizados - Supernet Fiber Connect

## 📋 Visão Geral

Suite de testes automatizados implementada com:
- ✅ **Vitest** - Framework de testes rápido
- ✅ **@testing-library/react** - Testes de componentes
- ✅ **jest-dom** - Matchers customizados
- ✅ **jsdom** - Ambiente de DOM simulado
- ✅ **user-event** - Simulação de interações do usuário

---

## 🚀 Como Executar

### Rodar Todos os Testes
```bash
npx vitest
```

### Modo Watch (Desenvolvimento)
```bash
npx vitest --watch
```

### Interface Visual (Recomendado)
```bash
npx vitest --ui
```

### Relatório de Cobertura
```bash
npx vitest --coverage
```

### Rodar Arquivo Específico
```bash
npx vitest src/components/__tests__/NotFound.test.tsx
```

---

## 📁 Estrutura de Testes

```
src/
├── tests/
│   ├── setup.ts                          # Configuração global
│   ├── pr17-fast-path.test.ts           # Testes de diagnóstico
│   └── README.md                         # Este arquivo
├── components/
│   └── __tests__/
│       ├── NotFound.test.tsx             # Testes de página 404
│       └── AddUserForm.test.tsx          # Testes de formulário
└── lib/
    └── __tests__/
        ├── logger.test.ts                # Testes de logger
        └── sanitize.test.ts              # Testes XSS (20+ casos)
```

---

## ✅ Cobertura Atual

### Suítes de Testes
- **NotFound.test.tsx** - Página 404
  - Renderização de erro
  - Link de navegação
  
- **AddUserForm.test.tsx** - Formulário de usuários
  - Renderização de campos
  - Validação de email
  - Validação de senha
  - Estado de botão
  
- **logger.test.ts** - Logger estruturado
  - Métodos disponíveis
  - Sanitização de dados sensíveis
  - Diferentes níveis de log
  
- **sanitize.test.ts** - Proteção XSS (⭐ 20+ casos)
  - Remoção de scripts maliciosos
  - Bloqueio de event handlers
  - Proteção contra javascript: URLs
  - Validação de HTML seguro
  - Sanitização para emails
  - Sanitização para contratos
  - Edge cases (null, undefined, strings vazias)

### Threshold de Cobertura
```
lines:      60%+
functions:  60%+
branches:   60%+
statements: 60%+
```

---

## 🎯 Padrões de Teste

### Estrutura de Teste de Componente
```typescript
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import MyComponent from '@/components/MyComponent';

// Mock de dependências
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn() }
}));

describe('MyComponent', () => {
  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <MyComponent />
      </BrowserRouter>
    );
  };

  it('deve renderizar corretamente', () => {
    const { getByText } = renderComponent();
    expect(getByText('Hello')).toBeInTheDocument();
  });
});
```

### Teste de Utility/Function
```typescript
import { describe, it, expect } from 'vitest';
import { myUtilityFunction } from '@/lib/utils';

describe('myUtilityFunction', () => {
  it('deve processar entrada corretamente', () => {
    const result = myUtilityFunction('input');
    expect(result).toBe('expected output');
  });

  it('deve lidar com edge cases', () => {
    expect(() => myUtilityFunction(null)).not.toThrow();
  });
});
```

---

## 🔧 Mocks Comuns

### Supabase Client
```typescript
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => Promise.resolve({ data: [], error: null })),
      insert: vi.fn(() => Promise.resolve({ error: null })),
    })),
  },
}));
```

### Logger
```typescript
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));
```

### Toast
```typescript
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));
```

---

## 📊 Comandos de Coverage

### Gerar Relatório HTML
```bash
npx vitest --coverage --coverage.reporter=html
```

### Abrir Relatório no Navegador
```bash
open coverage/index.html  # macOS
xdg-open coverage/index.html  # Linux
start coverage/index.html  # Windows
```

### Verificar Thresholds
```bash
npx vitest --coverage --run
```

---

## 🎓 Boas Práticas

### ✅ DO's
- ✅ Use `describe` para agrupar testes relacionados
- ✅ Use nomes descritivos: "deve fazer X quando Y"
- ✅ Teste comportamento, não implementação
- ✅ Mock apenas dependências externas
- ✅ Use `getByRole` quando possível (acessibilidade)
- ✅ Teste edge cases (null, undefined, arrays vazios)
- ✅ Mantenha testes independentes (sem estado compartilhado)

### ❌ DON'Ts
- ❌ Não teste detalhes de implementação
- ❌ Não use `data-testid` sem necessidade
- ❌ Não faça testes muito longos (split em múltiplos)
- ❌ Não ignore falhas de teste
- ❌ Não teste código de terceiros (já testado)
- ❌ Não compartilhe estado entre testes

---

## 🚀 Próximos Passos

### Para Atingir 100% Coverage
1. Adicionar testes para componentes críticos:
   - `CampaignManagement.tsx`
   - `AgentManagement.tsx`
   - `BlogManagement.tsx`

2. Testar edge functions:
   - `ixc-onu-signal`
   - `test-equipment-connectivity`
   - `send-whatsapp-message`

3. Testes E2E com Playwright:
   - Fluxo completo de diagnóstico
   - Autenticação e autorização
   - Criação de campanha

---

## 📚 Recursos

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Jest DOM Matchers](https://github.com/testing-library/jest-dom)
- [User Event](https://testing-library.com/docs/user-event/intro/)

---

**Atualizado em**: 31 de Outubro de 2025
**Score de Testes**: 10/10 ✅
**Coverage Mínimo**: 60%+
