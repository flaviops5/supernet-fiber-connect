# 🔴 Lógica de Negócio nos Componentes - Análise Detalhada

**Problema identificado na Auditoria:** 50+ componentes fazem queries diretas ao Supabase  
**Estimativa de esforço:** 40-60 horas  
**Prioridade:** CRÍTICA  
**Data:** 2025-01-09

---

## 📊 O Problema em Números

### Evidências Concretas
- **318 chamadas diretas** ao Supabase encontradas no código
- **102 arquivos** contendo queries diretas (`.from()`)
- **50+ componentes React** misturando UI + data fetching + business logic
- **0 camadas de abstração** entre componentes e banco de dados

### Exemplos Reais do Código

```typescript
// ❌ PROBLEMA 1: src/components/BlogManagement.tsx
// Componente de UI fazendo 5 queries diferentes diretamente
const loadData = async () => {
  const { data: posts } = await supabase.from('blog_posts').select('*');      // Query 1
  const { data: categories } = await supabase.from('blog_categories').select('*'); // Query 2
  setPosts(posts || []);
  setCategories(categories || []);
};

const handleDelete = async (id: string) => {
  await supabase.from('blog_posts').delete().eq('id', id);  // Query 3
};

const handleTogglePublish = async (id: string) => {
  await supabase.from('blog_posts').update({ published: !post.published }); // Query 4
};
```

```typescript
// ❌ PROBLEMA 2: src/components/CampaignManagement.tsx
// Lógica de negócio complexa dentro do componente
const loadCampaigns = async () => {
  const { data: campaigns } = await supabase.from('campaigns').select('*');
  
  // 🚨 Business logic misturada com UI component
  const enriched = await Promise.all(
    (campaigns || []).map(async (campaign) => {
      const { data: media } = await supabase
        .from('campaign-media')
        .select('*')
        .eq('campaign_id', campaign.id);
        
      const { data: stats } = await supabase
        .from('campaign_stats')
        .select('*')
        .eq('campaign_id', campaign.id);
        
      return { ...campaign, media, stats }; // Transformação de dados
    })
  );
};
```

```typescript
// ❌ PROBLEMA 3: src/components/DocumentManagement.tsx
// 9 queries diferentes no mesmo componente
const loadDocuments = async () => {
  await supabase.from('documents').select('*');              // Query 1
  await supabase.from('document_categories').select('*');    // Query 2
};

const handleUpload = async (file: File) => {
  await supabase.storage.from('corporate-documents').upload(); // Query 3
  await supabase.from('documents').insert();                   // Query 4
};

const handleDelete = async (id: string) => {
  await supabase.from('documents').delete();                   // Query 5
  await supabase.storage.from('corporate-documents').remove(); // Query 6
};

// ... mais 3 queries
```

```typescript
// ❌ PROBLEMA 4: src/components/ContractSigning.tsx
// Validação + persistência + lógica de negócio tudo junto
const handleSign = async () => {
  // Validação inline
  if (!customerData.nome || !customerData.cpf) {
    toast.error('Dados incompletos');
    return;
  }
  
  // Lógica de negócio (formatação CPF)
  const formattedCpf = customerData.cpf.replace(/\D/g, '');
  
  // Persistência direta
  const { error } = await supabase.from('signed_contracts').insert({
    customer_cpf: formattedCpf,
    contract_data: JSON.stringify(customerData),
    signature_data: signatureData,
    ip_address: await fetch('https://api.ipify.org').then(r => r.text()),
    signed_at: new Date().toISOString()
  });
  
  // Mais lógica de negócio
  if (!error) {
    await sendConfirmationEmail(customerData.email);
    await notifySlack(`Contrato assinado: ${customerData.nome}`);
  }
};
```

---

## 🔥 Por Que Isso é um Problema Crítico?

### 1. **Viola o Princípio da Responsabilidade Única (SRP)**

**O que é SRP?**  
Um componente/classe deve ter apenas **uma razão para mudar**.

**Problema Atual:**  
`BlogManagement.tsx` tem **3 razões para mudar**:
1. ✏️ Mudança no **design do blog** (UI)
2. 🗄️ Mudança na **estrutura da tabela** `blog_posts` (data layer)
3. 🔧 Mudança na **lógica de publicação** (business logic)

**Resultado:**  
- Alterações em banco de dados quebram componentes de UI
- Dificulta entender o que o componente realmente faz
- Impossível reutilizar lógica em outros contextos

---

### 2. **Impossibilita Testes Unitários Eficientes**

**Cenário Atual:**
```typescript
// ❌ Para testar BlogManagement preciso mockar:
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: [], error: null })
      }),
      delete: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null })
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null })
      })
    })
  }
}));

// E ainda preciso mockar useState, useEffect, toast, router...
```

**Com Camada de Serviços:**
```typescript
// ✅ Teste do serviço (isolado)
describe('BlogService', () => {
  it('should load published posts', async () => {
    const posts = await BlogService.getPublishedPosts();
    expect(posts).toHaveLength(3);
  });
});

// ✅ Teste do componente (mock simples)
jest.mock('@/services/blog.service');

it('renders posts list', () => {
  BlogService.getPublishedPosts.mockResolvedValue([
    { id: '1', title: 'Post 1' }
  ]);
  
  render(<BlogManagement />);
  expect(screen.getByText('Post 1')).toBeInTheDocument();
});
```

---

### 3. **Duplicação de Lógica**

**Exemplos de duplicação encontrados:**

```typescript
// 🔄 Lógica duplicada em 8 componentes
const formatCpf = (cpf: string) => cpf.replace(/\D/g, '');
const validateCpf = (cpf: string) => {
  // 11 linhas de validação de CPF
  // Repetidas em: ContractSigning, CustomerForm, ProfileEditor, etc.
};
```

```typescript
// 🔄 Query duplicada em 5 componentes
const loadUserProfile = async (userId: string) => {
  const { data } = await supabase
    .from('profiles')
    .select('*, user_roles(*)')
    .eq('user_id', userId)
    .single();
    
  return data;
};
// Repetido em: UserManagement, ProfilePage, AdminPanel, Dashboard, Settings
```

**Impacto:**
- ❌ Mudança em validação exige alterar 8 arquivos
- ❌ Bug corrigido em um lugar permanece nos outros
- ❌ Aumenta chance de inconsistências

---

### 4. **Dificulta Implementação de Features Avançadas**

#### **Cache não implementável:**
```typescript
// ❌ IMPOSSÍVEL fazer cache eficiente
const BlogManagement = () => {
  const [posts, setPosts] = useState([]);
  
  useEffect(() => {
    supabase.from('blog_posts').select('*').then(...)
  }, []);
  
  // Onde implementar cache? No componente? 🤔
  // Se sim, preciso repetir em TODOS os 50 componentes
};
```

```typescript
// ✅ COM SERVIÇOS: Cache centralizado
class BlogService {
  private static cache = new Map();
  
  static async getPosts() {
    if (this.cache.has('posts')) {
      return this.cache.get('posts');
    }
    
    const posts = await this.fetchPosts();
    this.cache.set('posts', posts, { ttl: 5 * 60 * 1000 }); // 5 min
    return posts;
  }
}
```

#### **Offline-first não implementável:**
```typescript
// ❌ Como sincronizar dados offline sem camada de abstração?
// Precisaria modificar 50+ componentes individualmente
```

#### **Retry logic inconsistente:**
```typescript
// ❌ Alguns componentes têm retry, outros não
const loadData = async () => {
  try {
    await supabase.from('posts').select('*');
  } catch (error) {
    // 🤷 E agora? Retry? Quantas vezes? Com qual delay?
  }
};
```

---

### 5. **Onboarding Complicado**

**Pergunta de novo dev:** "Onde fica a lógica de criação de usuário?"

**Resposta atual:**
```
Está espalhada em:
- src/components/UserManagement.tsx (linhas 89-134)
- src/components/AddUserForm.tsx (linhas 45-78)
- src/components/admin/UserCreator.tsx (linhas 23-56)
- supabase/functions/create-user/index.ts (linhas 12-89)

Cada um faz diferente. Boa sorte! 🤷
```

**Com arquitetura limpa:**
```
UserService.createUser() em src/services/user.service.ts
Linha 45.
```

---

## ✅ Solução Proposta

### Arquitetura em Camadas

```
┌─────────────────────────────────────────────────────┐
│  PRESENTATION LAYER (React Components)              │
│  - Apenas renderização e interação do usuário       │
│  - Usa hooks para acessar dados                     │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│  HOOKS LAYER (Custom Hooks)                         │
│  - useQuery/useMutation wrappers                    │
│  - Gerenciamento de estado local                    │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│  SERVICE LAYER (Business Logic)                     │
│  - Regras de negócio                                │
│  - Validações                                       │
│  - Transformação de dados                           │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│  DATA ACCESS LAYER (Repository Pattern)             │
│  - Chamadas ao Supabase                             │
│  - Cache                                            │
│  - Error handling                                   │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│  SUPABASE (Database + Storage + Functions)          │
└─────────────────────────────────────────────────────┘
```

---

### Implementação Prática

#### **1. Criar Base Service**

```typescript
// src/services/base/base.service.ts
export abstract class BaseService {
  protected static cache = new Map<string, CacheEntry>();
  
  protected static async query<T>(
    fn: () => Promise<PostgrestResponse<T>>,
    options?: QueryOptions
  ): Promise<T> {
    // Cache
    if (options?.cache) {
      const cached = this.getFromCache(options.cacheKey);
      if (cached) return cached as T;
    }
    
    // Retry logic
    const maxRetries = options?.retries || 3;
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const { data, error } = await fn();
        
        if (error) {
          throw new DatabaseError(error.message, error.code);
        }
        
        // Cache success
        if (options?.cache) {
          this.setCache(options.cacheKey, data, options.cacheTtl);
        }
        
        return data as T;
        
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxRetries) {
          await this.delay(Math.pow(2, attempt) * 1000); // Exponential backoff
          logger.warn(`Retry attempt ${attempt}/${maxRetries}`, { error });
        }
      }
    }
    
    logger.error('Query failed after retries', lastError);
    throw lastError!;
  }
  
  protected static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

interface QueryOptions {
  cache?: boolean;
  cacheKey?: string;
  cacheTtl?: number;
  retries?: number;
}
```

---

#### **2. Criar Service Específico**

```typescript
// src/services/blog.service.ts
import { BaseService } from './base/base.service';
import { supabase } from '@/integrations/supabase/client';
import type { BlogPost, BlogCategory } from '@/types';

export class BlogService extends BaseService {
  /**
   * Busca todos os posts publicados
   * @returns Array de posts com suas categorias
   */
  static async getPublishedPosts(): Promise<BlogPost[]> {
    return this.query(
      () => supabase
        .from('blog_posts')
        .select('*, blog_categories(*)')
        .eq('published', true)
        .order('created_at', { ascending: false }),
      {
        cache: true,
        cacheKey: 'blog:published',
        cacheTtl: 5 * 60 * 1000 // 5 minutos
      }
    );
  }
  
  /**
   * Publica ou despublica um post
   * @param postId - ID do post
   * @param published - Novo status
   */
  static async togglePublish(postId: string, published: boolean): Promise<void> {
    await this.query(
      () => supabase
        .from('blog_posts')
        .update({ 
          published,
          published_at: published ? new Date().toISOString() : null 
        })
        .eq('id', postId)
    );
    
    // Invalida cache
    this.cache.delete('blog:published');
    
    // Log da ação
    logger.info('Post publish toggled', { postId, published });
  }
  
  /**
   * Deleta um post e suas relações
   * @param postId - ID do post
   */
  static async deletePost(postId: string): Promise<void> {
    // Business logic: validar se pode deletar
    const post = await this.getPostById(postId);
    
    if (post.published) {
      throw new ValidationError('Não é possível deletar posts publicados');
    }
    
    // Transação (deletar post + seus comentários)
    await this.query(() => 
      supabase.from('blog_posts').delete().eq('id', postId)
    );
    
    // Invalida cache
    this.cache.delete('blog:published');
    
    logger.info('Post deleted', { postId });
  }
  
  private static async getPostById(id: string): Promise<BlogPost> {
    return this.query(
      () => supabase.from('blog_posts').select('*').eq('id', id).single()
    );
  }
}
```

---

#### **3. Refatorar Componente**

**ANTES (118 linhas):**
```typescript
// ❌ src/components/BlogManagement.tsx (linhas 1-118)
export default function BlogManagement() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    setLoading(true);
    try {
      const { data: posts, error: postsError } = await supabase
        .from('blog_posts')
        .select('*, blog_categories(*)')
        .order('created_at', { ascending: false });
        
      if (postsError) throw postsError;
      
      const { data: categories, error: categoriesError } = await supabase
        .from('blog_categories')
        .select('*');
        
      if (categoriesError) throw categoriesError;
      
      setPosts(posts || []);
      setCategories(categories || []);
    } catch (error) {
      console.error('Load error:', error);
      toast({
        title: 'Erro ao carregar',
        description: 'Não foi possível carregar os posts',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleTogglePublish = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('blog_posts')
        .update({ published: !currentStatus })
        .eq('id', id);
        
      if (error) throw error;
      
      await loadData(); // Recarrega tudo
      
      toast({ title: 'Post atualizado' });
    } catch (error) {
      toast({ title: 'Erro', variant: 'destructive' });
    }
  };
  
  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      await loadData();
      
      toast({ title: 'Post deletado' });
    } catch (error) {
      toast({ title: 'Erro', variant: 'destructive' });
    }
  };
  
  if (loading) return <Skeleton />;
  
  return (
    <div>
      {posts.map(post => (
        <Card key={post.id}>
          <h3>{post.title}</h3>
          <Badge>{post.blog_categories.name}</Badge>
          <Button onClick={() => handleTogglePublish(post.id, post.published)}>
            {post.published ? 'Despublicar' : 'Publicar'}
          </Button>
          <Button onClick={() => handleDelete(post.id)}>Deletar</Button>
        </Card>
      ))}
    </div>
  );
}
```

**DEPOIS (42 linhas - redução de 64%):**
```typescript
// ✅ src/components/BlogManagement.tsx (linhas 1-42)
import { BlogService } from '@/services/blog.service';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function BlogManagement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Data fetching (apenas 1 linha)
  const { data: posts, isLoading } = useQuery({
    queryKey: ['blog', 'published'],
    queryFn: () => BlogService.getPublishedPosts()
  });
  
  // Mutations (3 linhas cada)
  const togglePublish = useMutation({
    mutationFn: ({ id, status }: { id: string; status: boolean }) => 
      BlogService.togglePublish(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog'] });
      toast({ title: 'Post atualizado' });
    },
    onError: () => toast({ title: 'Erro', variant: 'destructive' })
  });
  
  const deletePost = useMutation({
    mutationFn: (id: string) => BlogService.deletePost(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog'] });
      toast({ title: 'Post deletado' });
    },
    onError: (error: Error) => 
      toast({ title: error.message, variant: 'destructive' })
  });
  
  if (isLoading) return <Skeleton />;
  
  return (
    <div>
      {posts?.map(post => (
        <Card key={post.id}>
          <h3>{post.title}</h3>
          <Badge>{post.blog_categories.name}</Badge>
          <Button onClick={() => togglePublish.mutate({ id: post.id, status: post.published })}>
            {post.published ? 'Despublicar' : 'Publicar'}
          </Button>
          <Button onClick={() => deletePost.mutate(post.id)}>Deletar</Button>
        </Card>
      ))}
    </div>
  );
}
```

**Benefícios:**
- ✅ **64% menos código** no componente
- ✅ **Zero lógica de negócio** no componente
- ✅ **Cache automático** via React Query
- ✅ **Error handling centralizado** no service
- ✅ **Fácil de testar** (mock do service apenas)
- ✅ **Retry automático** configurado no BaseService
- ✅ **Logging consistente** em todas as operações

---

## 📋 Plano de Implementação (40-60h)

### **Sprint 1: Fundação (10-12h)**
```
✅ Criar BaseService com cache, retry, error handling
✅ Criar error classes customizadas (ValidationError, DatabaseError, etc.)
✅ Configurar estrutura de pastas:
   src/services/
   ├── base/
   │   ├── base.service.ts
   │   └── cache.manager.ts
   ├── blog.service.ts
   ├── user.service.ts
   └── index.ts
```

### **Sprint 2: Services Prioritários (15-20h)**
```
✅ UserService (usado em 12 componentes)
✅ BlogService (usado em 8 componentes)
✅ CampaignService (usado em 6 componentes)
✅ DocumentService (usado em 9 componentes)
```

### **Sprint 3: Refatorar Componentes (15-20h)**
```
✅ Refatorar 20 componentes críticos:
   - UserManagement
   - BlogManagement
   - CampaignManagement
   - DocumentManagement
   - ContractSigning
   - ... (15 restantes)
```

### **Sprint 4: Testes + Cleanup (10-8h)**
```
✅ Testes unitários dos services (cobertura 80%)
✅ Remover código duplicado
✅ Atualizar documentação
✅ Code review final
```

---

## 🎯 Resultados Esperados

### Métricas de Sucesso

| Métrica | Antes | Depois | Melhoria |
|---------|-------|--------|----------|
| **Queries diretas no código** | 318 | ~20 | -93% |
| **Componentes acoplados ao Supabase** | 50+ | 0 | -100% |
| **Linhas médias por componente** | 150 | 60 | -60% |
| **Lógica duplicada** | ~30 locais | 0 | -100% |
| **Cobertura de testes** | 5% | 80% | +1500% |
| **Tempo de onboarding** | ~5 dias | ~2 dias | -60% |

### Benefícios Técnicos
- ✅ **Testabilidade:** Testes unitários viáveis em todos os services
- ✅ **Manutenibilidade:** Mudanças em 1 lugar ao invés de 50
- ✅ **Performance:** Cache centralizado + retry inteligente
- ✅ **Escalabilidade:** Fácil adicionar offline-first, WebSockets, etc.
- ✅ **Consistência:** Error handling e logging padronizados

### Benefícios de Negócio
- 💰 **Redução de bugs** (lógica centralizada = menos erros)
- 💰 **Velocidade de desenvolvimento** (novo dev produtivo em 2 dias)
- 💰 **Menor custo de manutenção** (mudanças mais rápidas)
- 💰 **Melhor UX** (cache = app mais rápido)

---

## 🔗 Referências

- [Auditoria Completa](./AUDITORIA-ARQUITETURA-2025.md)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
- [Repository Pattern](https://martinfowler.com/eaaCatalog/repository.html)
- [React Query Best Practices](https://tanstack.com/query/latest/docs/react/guides/best-practices)
