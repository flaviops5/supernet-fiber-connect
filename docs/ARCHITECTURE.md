# Arquitetura do Sistema

Documentação da arquitetura e design patterns do Supernet Fiber Connect.

## 📋 Visão Geral

Sistema full-stack enterprise para gestão de ISP (Internet Service Provider) com foco em:
- Atendimento automatizado com IA
- Dashboard administrativo completo
- Integração com sistemas legados (IXC)
- Segurança e acessibilidade AAA

## 🏗️ Stack Tecnológico

### Frontend
- **Framework**: React 18.3 + TypeScript 5.x
- **Build**: Vite 5.x
- **Styling**: Tailwind CSS 3.x + shadcn/ui
- **State**: React Query (TanStack Query)
- **Routing**: React Router 6.x
- **Forms**: React Hook Form + Zod

### Backend
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage
- **Functions**: Supabase Edge Functions (Deno)

### Qualidade
- **Testing**: Vitest + Testing Library
- **Linting**: ESLint + TypeScript
- **Security**: DOMPurify (XSS), ESLint rules
- **Accessibility**: WCAG 2.1 AAA compliance

---

## 📁 Estrutura de Diretórios

```
supernet-fiber-connect/
│
├── src/                          # Código fonte frontend
│   ├── components/               # Componentes React
│   │   ├── ui/                   # Componentes base (shadcn)
│   │   │   ├── button.tsx
│   │   │   ├── dialog.tsx
│   │   │   └── ...
│   │   ├── accessibility/        # Componentes de acessibilidade
│   │   │   ├── SkipLink.tsx
│   │   │   └── LiveRegion.tsx
│   │   ├── admin/                # Componentes admin
│   │   ├── agents/               # Sistema de agentes IA
│   │   └── ...
│   │
│   ├── pages/                    # Páginas da aplicação
│   │   ├── Index.tsx             # Home
│   │   ├── Admin.tsx             # Dashboard admin
│   │   └── ...
│   │
│   ├── lib/                      # Bibliotecas e utilitários
│   │   ├── logger.ts             # Logger estruturado
│   │   ├── sanitize.ts           # Sanitização HTML
│   │   └── utils.ts              # Utilitários gerais
│   │
│   ├── types/                    # Type definitions
│   │   ├── index.ts              # Export central
│   │   ├── ixc.types.ts          # IXC API types
│   │   ├── agent.types.ts        # Agent types
│   │   └── ...
│   │
│   ├── hooks/                    # Custom React hooks
│   │   ├── use-toast.ts
│   │   └── ...
│   │
│   ├── integrations/             # Integrações externas
│   │   └── supabase/
│   │       ├── client.ts         # Cliente Supabase
│   │       └── types.ts          # Supabase types (auto-gen)
│   │
│   ├── tests/                    # Setup de testes
│   │   ├── setup.ts
│   │   └── README.md
│   │
│   └── index.css                 # Estilos globais + design system
│
├── supabase/                     # Backend Supabase
│   ├── functions/                # Edge Functions
│   │   ├── _shared/              # Código compartilhado
│   │   │   └── structured-logger.ts
│   │   └── [function-name]/
│   │       └── index.ts
│   │
│   └── migrations/               # Database migrations
│       └── [timestamp]_*.sql
│
├── docs/                         # Documentação
│   ├── API.md                    # API documentation
│   ├── ARCHITECTURE.md           # Este arquivo
│   └── ...
│
├── auditoria/                    # Documentos de auditoria
│   ├── ROADMAP-10-10.md
│   ├── STATUS-ROADMAP-10-10.md
│   └── ...
│
├── vitest.config.ts              # Configuração de testes
├── tailwind.config.ts            # Configuração Tailwind
├── tsconfig.json                 # Configuração TypeScript
├── CHANGELOG.md                  # Histórico de mudanças
├── CONTRIBUTING.md               # Guia de contribuição
└── README.md                     # Documentação principal
```

---

## 🎨 Design System

### Princípios

1. **Semantic Tokens**: Todas as cores são HSL tokens
2. **Componentização**: Componentes reutilizáveis
3. **Acessibilidade**: WCAG 2.1 AAA
4. **Responsividade**: Mobile-first

### Tokens de Cor

Definidos em `src/index.css`:

```css
:root {
  /* Brand Colors */
  --primary: 226 43% 45%;        /* Supernet Blue */
  --orange: 25 90% 54%;          /* Supernet Orange */
  --red-accent: 8 92% 55%;       /* Accent Red */
  
  /* Semantic Colors */
  --background: 0 0% 100%;       /* White */
  --foreground: 0 0% 18%;        /* Dark Gray */
  --success: 142 76% 36%;        /* Green */
  --destructive: 8 92% 55%;      /* Red */
  --warning: 38 92% 50%;         /* Yellow */
  
  /* UI Colors */
  --muted: 300 14% 97%;
  --accent: 300 14% 97%;
  --border: 220 13% 91%;
}
```

### Componentes Base

Sistema baseado em **shadcn/ui**:
- Componentes importados em `src/components/ui/`
- Customizados via `tailwind.config.ts`
- Temas claro/escuro suportados

---

## 🔄 Fluxo de Dados

### Arquitetura Client-Server

```
┌─────────────────────────────────────────────┐
│             FRONTEND (React)                 │
│                                              │
│  ┌──────────┐      ┌──────────────────┐    │
│  │  Pages   │─────▶│   Components     │    │
│  └──────────┘      └──────────────────┘    │
│       │                     │                │
│       │                     │                │
│       ▼                     ▼                │
│  ┌──────────────────────────────────────┐  │
│  │      React Query (State)             │  │
│  └──────────────────────────────────────┘  │
│                    │                        │
└────────────────────┼────────────────────────┘
                     │
                     ▼ (Supabase Client)
┌─────────────────────────────────────────────┐
│         SUPABASE (Backend)                   │
│                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │PostgreSQL│  │   Auth   │  │ Storage  │  │
│  └──────────┘  └──────────┘  └──────────┘  │
│                                              │
│  ┌──────────────────────────────────────┐  │
│  │      Edge Functions (Deno)           │  │
│  │  - API integrations                   │  │
│  │  - Business logic                     │  │
│  │  - Background jobs                    │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

### Exemplo: Criar Conversa

```typescript
// 1. UI Event (Component)
const handleCreateConversation = async () => {
  try {
    // 2. API Call via Supabase Client
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        user_id: userId,
        agent_id: agentId,
        status: 'open'
      })
      .select()
      .single();
    
    // 3. Handle Response
    if (error) throw error;
    
    // 4. Update UI
    toast({ title: 'Conversa criada!' });
    navigate(`/chat/${data.id}`);
    
  } catch (error) {
    logger.error('Failed to create conversation', error);
    toast({ 
      title: 'Erro', 
      variant: 'destructive' 
    });
  }
};
```

---

## 🔐 Segurança

### Camadas de Segurança

#### 1. Frontend
- **XSS Protection**: DOMPurify sanitização
- **Type Safety**: TypeScript strict mode
- **Input Validation**: Zod schemas

#### 2. Backend (Supabase)
- **RLS (Row Level Security)**: Controle de acesso
- **Auth**: JWT-based authentication
- **Rate Limiting**: Edge Functions

#### 3. Database
- **Encryption**: At-rest encryption
- **Backups**: Automated backups
- **Audit Logs**: Structured logging

### Exemplo: RLS Policy

```sql
-- Usuários podem ver apenas suas próprias conversas
CREATE POLICY "Users can view own conversations"
ON conversations
FOR SELECT
USING (auth.uid() = user_id);

-- Admins podem ver tudo
CREATE POLICY "Admins can view all conversations"
ON conversations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
```

---

## 🧪 Testes

### Estratégia de Testes

```
┌─────────────────────────────────────┐
│        Pirâmide de Testes           │
│                                     │
│            /\                       │
│           /E2E\                     │
│          /──────\                   │
│         /  Int   \                  │
│        /──────────\                 │
│       /    Unit    \                │
│      /──────────────\               │
│                                     │
└─────────────────────────────────────┘
```

- **Unit Tests**: 70% - Componentes isolados, funções
- **Integration Tests**: 20% - Interação entre módulos
- **E2E Tests**: 10% - Fluxos críticos completos

### Exemplo: Component Test

```typescript
describe('Button', () => {
  it('renders with correct styles', () => {
    render(<Button variant="primary">Click</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-primary');
  });
  
  it('handles click events', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
```

---

## ♿ Acessibilidade

### WCAG 2.1 AAA Compliance

#### Contraste de Cores
- **Texto Normal**: Ratio 7:1 (AAA)
- **Texto Grande**: Ratio 4.5:1 (AAA)

#### Navegação por Teclado
- Focus indicators: 3px outline
- Skip links implementados
- Tab order lógico

#### ARIA Labels
Todos os elementos interativos têm labels:

```typescript
<button
  aria-label="Fechar modal"
  onClick={handleClose}
>
  <X aria-hidden="true" />
</button>
```

#### Touch Targets
- Mínimo: 48x48px (dispositivos touch)
- Desktop: 44x44px

---

## 📈 Performance

### Otimizações

#### Code Splitting
```typescript
// Lazy loading de rotas
const AdminDashboard = lazy(() => import('./pages/Admin'));

<Route 
  path="/admin" 
  element={
    <Suspense fallback={<Loading />}>
      <AdminDashboard />
    </Suspense>
  } 
/>
```

#### Image Optimization
```typescript
<img 
  src={imageUrl}
  loading="lazy"
  decoding="async"
  alt="Description"
/>
```

#### Bundle Size
- Vite tree-shaking automático
- Dynamic imports para features opcionais
- Meta: < 500kb gzipped

---

## 🚀 Deployment

### Ambientes

- **Development**: `localhost:8080`
- **Staging**: `staging.supernetfibra.com.br`
- **Production**: `app.supernetfibra.com.br`

### CI/CD Pipeline

```
┌───────────┐     ┌───────────┐     ┌───────────┐
│   Commit  │────▶│   Tests   │────▶│   Build   │
└───────────┘     └───────────┘     └───────────┘
                         │                 │
                         │                 │
                         ▼                 ▼
                  ┌───────────┐     ┌───────────┐
                  │   Lint    │     │  Deploy   │
                  └───────────┘     └───────────┘
```

### Quality Gates

- ✅ Todos os testes passam (100%)
- ✅ Coverage > 60%
- ✅ No ESLint errors
- ✅ TypeScript compila sem erros
- ✅ Bundle size < threshold

---

## 📞 Suporte

Para questões sobre arquitetura:
1. Consulte esta documentação
2. Consulte `CONTRIBUTING.md`
3. Abra uma issue no repositório

---

**Última atualização:** 31 de Outubro de 2025
**Versão:** 4.0.0
