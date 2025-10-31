# Guia de Contribuição

Obrigado por considerar contribuir para o Supernet Fiber Connect! Este documento fornece diretrizes e melhores práticas para contribuir com o projeto.

## 📋 Índice

- [Código de Conduta](#código-de-conduta)
- [Como Contribuir](#como-contribuir)
- [Padrões de Código](#padrões-de-código)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Testes](#testes)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)

## 🤝 Código de Conduta

Este projeto adere a um código de conduta. Ao participar, espera-se que você mantenha este código:

- Use linguagem acolhedora e inclusiva
- Respeite pontos de vista e experiências diferentes
- Aceite críticas construtivas com graça
- Foque no que é melhor para a comunidade
- Mostre empatia com outros membros da comunidade

## 🚀 Como Contribuir

### Reportando Bugs

Antes de criar um bug report:
1. Verifique se o bug já foi reportado
2. Verifique se você está usando a versão mais recente
3. Colete informações sobre o bug

Inclua no seu report:
- **Título claro e descritivo**
- **Passos para reproduzir** o comportamento
- **Comportamento esperado** vs. **comportamento atual**
- **Screenshots** se aplicável
- **Ambiente**: navegador, SO, versão

### Sugerindo Melhorias

Para sugerir uma melhoria:
1. Use um título claro e descritivo
2. Forneça uma descrição detalhada da melhoria
3. Explique por que esta melhoria seria útil
4. Liste exemplos de como a feature funcionaria

### Seu Primeiro Pull Request

Não sabe por onde começar? Procure por issues com labels:
- `good first issue` - issues boas para iniciantes
- `help wanted` - issues que precisam de ajuda

## 💻 Padrões de Código

### TypeScript

```typescript
// ✅ BOM - Type-safe, sem 'any'
interface User {
  id: string;
  name: string;
  email: string;
}

function getUser(id: string): Promise<User> {
  return fetchUser(id);
}

// ❌ RUIM - Uso de 'any'
function getUser(id: any): any {
  return fetchUser(id);
}
```

### React Components

```typescript
// ✅ BOM - Componente funcional com tipos
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

export const Button: React.FC<ButtonProps> = ({ 
  label, 
  onClick, 
  variant = 'primary' 
}) => {
  return (
    <button 
      onClick={onClick}
      className={cn('btn', `btn-${variant}`)}
      aria-label={label}
    >
      {label}
    </button>
  );
};
```

### Design System

**CRÍTICO**: Use APENAS semantic tokens do design system!

```typescript
// ✅ BOM - Usa tokens do design system
<div className="bg-primary text-primary-foreground">
  <h1 className="text-foreground">Título</h1>
</div>

// ❌ RUIM - Cores hardcoded
<div className="bg-blue-500 text-white">
  <h1 className="text-black">Título</h1>
</div>
```

### Logging

**NUNCA use console.log!** Use o logger estruturado:

```typescript
// ✅ BOM - Logger estruturado
import { logger } from '@/lib/logger';

logger.info('User logged in', { userId: user.id });
logger.error('Failed to fetch data', error, { endpoint: '/api/users' });

// ❌ RUIM - Console logs
console.log('User logged in', user);
console.error('Error:', error);
```

### Sanitização de HTML

**SEMPRE sanitize HTML de usuários!**

```typescript
// ✅ BOM - HTML sanitizado
import { sanitizeHTML } from '@/lib/sanitize';

<div dangerouslySetInnerHTML={{ __html: sanitizeHTML(userContent) }} />

// ❌ RUIM - XSS vulnerability!
<div dangerouslySetInnerHTML={{ __html: userContent }} />
```

### Acessibilidade

Siga WCAG 2.1 AAA:

```typescript
// ✅ BOM - Acessível
<button 
  aria-label="Fechar modal"
  onClick={handleClose}
  className="min-h-[48px] min-w-[48px]"
>
  <X className="h-5 w-5" aria-hidden="true" />
</button>

// ❌ RUIM - Não acessível
<div onClick={handleClose}>
  <X />
</div>
```

## 📁 Estrutura do Projeto

```
src/
├── components/          # Componentes React
│   ├── ui/             # Componentes de UI (shadcn)
│   ├── accessibility/  # Componentes de acessibilidade
│   └── ...             # Componentes de negócio
├── lib/                # Utilitários e helpers
│   ├── logger.ts       # Logger estruturado
│   ├── sanitize.ts     # Sanitização HTML
│   └── utils.ts        # Utilitários gerais
├── types/              # Type definitions
│   └── index.ts        # Export central
├── hooks/              # Custom React hooks
├── integrations/       # Integrações externas
│   └── supabase/       # Cliente Supabase
├── pages/              # Páginas da aplicação
└── tests/              # Testes
    └── __tests__/      # Test files

supabase/
├── functions/          # Edge Functions
│   └── _shared/        # Código compartilhado
└── migrations/         # Database migrations
```

## 🧪 Testes

### Rodando Testes

```bash
# Rodar todos os testes
npm run test

# Rodar com UI
npm run test:ui

# Gerar coverage report
npm run test:coverage
```

### Escrevendo Testes

```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('renders with label', () => {
    render(<Button label="Click me" onClick={() => {}} />);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const handleClick = vi.fn();
    render(<Button label="Click" onClick={handleClick} />);
    
    await userEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledOnce();
  });
});
```

### Coverage Requirements

- **Lines**: 60%+
- **Functions**: 60%+
- **Branches**: 60%+
- **Statements**: 60%+

## 📝 Commit Guidelines

Usamos [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: Nova funcionalidade
- `fix`: Correção de bug
- `docs`: Mudanças em documentação
- `style`: Formatação, ponto e vírgula, etc
- `refactor`: Refatoração de código
- `test`: Adição ou correção de testes
- `chore`: Manutenção, configuração, etc

### Exemplos

```bash
feat(auth): add Google OAuth login
fix(dashboard): resolve data loading issue
docs(api): update endpoint documentation
test(sanitize): add XSS protection tests
```

## 🔄 Pull Request Process

1. **Fork o repositório** e crie uma branch da `main`
   ```bash
   git checkout -b feat/my-feature
   ```

2. **Faça suas mudanças** seguindo os padrões de código

3. **Adicione testes** para suas mudanças

4. **Rode os testes** e certifique-se que passam
   ```bash
   npm run test
   ```

5. **Rode o linter** e corrija problemas
   ```bash
   npm run lint
   ```

6. **Commit suas mudanças** seguindo commit guidelines
   ```bash
   git commit -m "feat(component): add new feature"
   ```

7. **Push para sua branch**
   ```bash
   git push origin feat/my-feature
   ```

8. **Abra um Pull Request** com:
   - Título claro e descritivo
   - Descrição do que foi mudado e por quê
   - Screenshots (se mudanças visuais)
   - Referência a issues relacionadas

### PR Checklist

- [ ] Código segue os padrões do projeto
- [ ] Testes adicionados/atualizados
- [ ] Todos os testes passam
- [ ] Documentação atualizada
- [ ] Sem console.logs
- [ ] HTML sanitizado onde necessário
- [ ] Componentes acessíveis (ARIA labels)
- [ ] Types definidos (sem `any`)

## 🎯 Code Review Process

Todos os PRs serão revisados para:
- **Funcionalidade**: O código faz o que deveria?
- **Qualidade**: Segue os padrões do projeto?
- **Testes**: Tem cobertura adequada?
- **Segurança**: Não introduz vulnerabilidades?
- **Acessibilidade**: Segue WCAG 2.1 AAA?
- **Performance**: Não impacta negativamente?

## 🏆 Reconhecimento

Contribuidores serão reconhecidos no README e nos release notes.

## 📞 Contato

Dúvidas? Entre em contato:
- Abra uma issue
- Envie email para: dev@supernetfibra.com.br

---

**Obrigado por contribuir para o Supernet Fiber Connect!** 🚀
