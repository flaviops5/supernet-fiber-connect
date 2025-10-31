# API Documentation

Documentação completa das APIs e bibliotecas do Supernet Fiber Connect.

## 📋 Índice

- [Logger API](#logger-api)
- [Sanitização HTML](#sanitização-html)
- [Types](#types)
- [Hooks](#hooks)
- [Supabase Integration](#supabase-integration)

---

## 📊 Logger API

Logger estruturado com sanitização automática de dados sensíveis.

### Importação

```typescript
import { logger } from '@/lib/logger';
```

### Métodos

#### `logger.debug(message, metadata?)`

Logs de debug - apenas em desenvolvimento.

```typescript
logger.debug('Processing user request', { 
  userId: user.id,
  action: 'update_profile' 
});
```

**Parâmetros:**
- `message` (string): Mensagem do log
- `metadata` (object, opcional): Dados adicionais

**Comportamento:**
- Exibido apenas em `DEV` mode
- Dados sensíveis automaticamente redacted

---

#### `logger.info(message, metadata?)`

Logs informativos - operações normais.

```typescript
logger.info('User logged in successfully', { 
  userId: user.id,
  timestamp: new Date().toISOString()
});
```

**Parâmetros:**
- `message` (string): Mensagem do log
- `metadata` (object, opcional): Dados adicionais

---

#### `logger.warn(message, metadata?)`

Logs de warning - situações anormais mas não críticas.

```typescript
logger.warn('API rate limit approaching', {
  currentUsage: 950,
  limit: 1000,
  endpoint: '/api/users'
});
```

**Parâmetros:**
- `message` (string): Mensagem do log
- `metadata` (object, opcional): Dados adicionais

---

#### `logger.error(message, error?, metadata?)`

Logs de erro - falhas críticas.

```typescript
try {
  await riskyOperation();
} catch (error) {
  logger.error('Failed to process payment', error, {
    userId: user.id,
    amount: payment.amount
  });
}
```

**Parâmetros:**
- `message` (string): Mensagem do log
- `error` (Error | unknown, opcional): Objeto de erro
- `metadata` (object, opcional): Dados adicionais

---

### Logger para Edge Functions

Para Edge Functions, use o logger específico:

```typescript
import { createEdgeFunctionLogger } from '@/lib/logger';

const logger = createEdgeFunctionLogger('my-function');

logger.info('Function invoked');
logger.error('Function failed', error);
```

---

### Dados Sensíveis

O logger **automaticamente redacta** chaves sensíveis:
- `password`
- `token`
- `apikey`
- `secret`
- `cpf`
- `email`
- `phone`

```typescript
logger.info('User data', {
  name: 'John',
  email: 'john@example.com',  // ← será redacted
  token: 'abc123'              // ← será redacted
});

// Output: { name: 'John', email: '[REDACTED]', token: '[REDACTED]' }
```

---

## 🛡️ Sanitização HTML

Proteção contra XSS com DOMPurify.

### Importação

```typescript
import { 
  sanitizeHTML,
  sanitizeEmailHTML,
  sanitizeContractHTML,
  stripHTML,
  containsDangerousHTML
} from '@/lib/sanitize';
```

---

### `sanitizeHTML(dirty, config?)`

Sanitiza HTML genérico.

```typescript
const clean = sanitizeHTML('<p>Hello <script>alert("xss")</script></p>');
// Result: '<p>Hello </p>'

const userContent = '<p>Valid <strong>content</strong></p>';
const safe = sanitizeHTML(userContent);
// Result: '<p>Valid <strong>content</strong></p>'
```

**Parâmetros:**
- `dirty` (string): HTML não sanitizado
- `config` (object, opcional): Configuração DOMPurify

**Retorna:** String HTML sanitizada

**Tags Permitidas (padrão):**
- Texto: `p`, `br`, `strong`, `em`, `u`, `span`
- Listas: `ul`, `ol`, `li`
- Títulos: `h1`, `h2`, `h3`, `h4`, `h5`, `h6`
- Tabelas: `table`, `thead`, `tbody`, `tr`, `td`, `th`
- Links: `a` (href sanitizado)

**Tags Bloqueadas:**
- `<script>` - JavaScript
- `<iframe>` - Iframes
- `<object>`, `<embed>` - Objetos
- Event handlers (`onclick`, `onerror`, etc.)
- `javascript:` URLs

---

### `sanitizeEmailHTML(dirty)`

Sanitiza HTML para emails (permite mais tags).

```typescript
const emailHTML = `
  <p>Hello!</p>
  <img src="image.jpg" alt="Logo" />
  <code>const x = 1;</code>
`;

const safe = sanitizeEmailHTML(emailHTML);
// Permite: img, code, pre, blockquote além das tags básicas
```

**Tags Adicionais Permitidas:**
- `img` (src, alt sanitizados)
- `code`, `pre`
- `blockquote`

---

### `sanitizeContractHTML(dirty)`

Sanitiza HTML para contratos e templates.

```typescript
const contractHTML = `
  <h1>Contract Title</h1>
  <p>Terms and conditions...</p>
  <table>...</table>
`;

const safe = sanitizeContractHTML(contractHTML);
```

**Proteções Extras:**
- Remove TODOS os scripts
- Remove event handlers
- Remove javascript: URLs
- Mantém formatação de tabelas

---

### `stripHTML(dirty)`

Remove TODO o HTML, retorna apenas texto.

```typescript
const html = '<p>Hello <strong>World</strong>!</p>';
const text = stripHTML(html);
// Result: 'Hello World!'
```

**Uso:** Útil para previews, meta descriptions, etc.

---

### `containsDangerousHTML(input)`

Verifica se uma string contém HTML potencialmente perigoso.

```typescript
if (containsDangerousHTML(userInput)) {
  logger.warn('Dangerous HTML detected', { input: userInput });
  // Rejeitar ou sanitizar
}
```

**Detecta:**
- Tags `<script>`
- Event handlers (`onclick=`, `onerror=`, etc.)
- `javascript:` URLs
- `<iframe>`, `<object>`, `<embed>`

**Retorna:** `boolean`

---

## 📦 Types

Sistema de types centralizado.

### Importação

```typescript
import { 
  IXCCustomer,
  AgentRole,
  ConversationStatus,
  // ... etc
} from '@/types';
```

### Types Disponíveis

#### IXC Types
```typescript
interface IXCCustomer {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  status: 'ativo' | 'inativo';
  plano?: string;
}
```

#### Agent Types
```typescript
type AgentRole = 'support' | 'sales' | 'technical';

interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  active: boolean;
}
```

#### Conversation Types
```typescript
type ConversationStatus = 'open' | 'pending' | 'closed';

interface Conversation {
  id: string;
  userId: string;
  agentId: string;
  status: ConversationStatus;
  messages: Message[];
}
```

Ver `src/types/` para lista completa.

---

## 🪝 Hooks

### `useToast`

```typescript
import { useToast } from '@/hooks/use-toast';

const { toast } = useToast();

toast({
  title: 'Success',
  description: 'Operation completed successfully',
  variant: 'default'
});

toast({
  title: 'Error',
  description: 'Something went wrong',
  variant: 'destructive'
});
```

**Variantes:**
- `default` - Mensagem padrão
- `destructive` - Erro/aviso

---

## 🗄️ Supabase Integration

### Cliente Supabase

```typescript
import { supabase } from '@/integrations/supabase/client';

// Query
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('status', 'active');

// Insert
const { data, error } = await supabase
  .from('users')
  .insert({ name: 'John', email: 'john@example.com' });

// Update
const { data, error } = await supabase
  .from('users')
  .update({ status: 'inactive' })
  .eq('id', userId);
```

### Auth

```typescript
// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
});

// Sign out
await supabase.auth.signOut();

// Get current user
const { data: { user } } = await supabase.auth.getUser();
```

### Storage

```typescript
// Upload file
const { data, error } = await supabase.storage
  .from('avatars')
  .upload(`${userId}/avatar.png`, file);

// Get public URL
const { data } = supabase.storage
  .from('avatars')
  .getPublicUrl(`${userId}/avatar.png`);
```

---

## 🔐 Segurança

### Checklist de Segurança

- [ ] ✅ Sempre sanitize HTML de usuários
- [ ] ✅ Use logger ao invés de console
- [ ] ✅ Valide inputs no backend
- [ ] ✅ Use RLS policies no Supabase
- [ ] ✅ Nunca exponha secrets no frontend
- [ ] ✅ Implemente rate limiting
- [ ] ✅ Use HTTPS em produção

### Exemplo Seguro

```typescript
// ✅ SEGURO
const handleUserInput = async (userHTML: string) => {
  // 1. Validar
  if (containsDangerousHTML(userHTML)) {
    logger.warn('Dangerous HTML detected');
    return;
  }
  
  // 2. Sanitizar
  const cleanHTML = sanitizeHTML(userHTML);
  
  // 3. Salvar
  const { error } = await supabase
    .from('content')
    .insert({ html: cleanHTML });
  
  if (error) {
    logger.error('Failed to save content', error);
    throw new Error('Save failed');
  }
  
  logger.info('Content saved successfully');
};
```

---

## 📞 Suporte

Dúvidas sobre a API?
- Consulte os exemplos em `src/components/`
- Consulte os testes em `src/tests/`
- Abra uma issue no repositório

---

**Última atualização:** 31 de Outubro de 2025
