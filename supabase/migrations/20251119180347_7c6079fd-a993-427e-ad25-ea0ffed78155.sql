-- Inserir DEVELOPMENT-GUIDELINES.md no knowledge_base para vetorização
INSERT INTO knowledge_base (
  title,
  content,
  content_type,
  category,
  tags,
  source,
  is_active,
  is_folder,
  display_order,
  agent_types,
  metadata
)
VALUES (
  'Development Guidelines - Supernet Fiber Connect v2.0',
  'DIRETRIZES DE DESENVOLVIMENTO - SUPERNET FIBER CONNECT v2.0

Este documento define todas as diretrizes obrigatórias para desenvolvimento de novas funcionalidades no sistema Supernet Fiber Connect, garantindo aprovação em auditorias de código, consistência arquitetural, segurança e conformidade LGPD, performance e escalabilidade, e manutenibilidade de longo prazo.

REGRAS TYPESCRIPT:
- Zero any types no código obrigatório
- Interfaces e types definidos para objetos complexos
- Tipos do Supabase importados de types.ts
- Funções com tipos de retorno explícitos
- Props de componentes React tipados

DESIGN SYSTEM:
- Apenas tokens HSL de index.css e tailwind.config.ts
- Nenhuma cor direta hex rgb ou nome
- Variantes Shadcn customizadas quando necessário
- Suporte a dark e light mode automático
- Gradientes definidos como CSS variables

ARQUITETURA COMPONENTES:
- Componentes focados menores que 300 linhas
- Hooks customizados extraídos
- Estrutura de pastas organizada por feature
- Lógica de negócio separada da UI
- Barrel exports via index.ts

BACKEND SUPABASE:
- RLS habilitado em TODAS as tabelas obrigatório
- Políticas restritivas nunca usar true genérico
- Colunas user_id NOT NULL quando usadas em RLS
- Índices em foreign keys e WHERE clauses
- Triggers para updated_at
- Validação no banco com CHECK constraints

EDGE FUNCTIONS:
- Logs estruturados com correlation_id obrigatório
- Circuit breaker para APIs externas IXC Evolution
- Error handling completo try catch
- CORS configurado Access-Control-Allow-Origin
- Validação de input com Zod
- Timeouts configurados
- Secrets via Deno.env.get

SEGURANCA VALIDACAO:
- Todo input validado com Zod schemas obrigatório
- CPF Phone Email formatados e validados
- Sanitização HTML quando necessário DOMPurify
- Rate limiting em endpoints críticos
- Logs de eventos de segurança em security_logs
- HTTPS only configurado no Supabase
- XSS prevention nunca dangerouslySetInnerHTML sem sanitização
- SQL injection prevention via prepared statements RLS

PERFORMANCE:
- React Query para cache staleTime 30s gcTime 5min
- Lazy loading de componentes pesados React.lazy Suspense
- Debounce em buscas 500ms useDebouncedCallback
- Índices no banco de dados foreign keys WHERE ORDER BY
- Paginação em listas grandes
- Memoização com useMemo useCallback
- Virtualização para listas enormes

SEO PAGINAS PUBLICAS:
- Meta tags dinâmicas title meta description canonical
- Schema.org JSON-LD Organization FAQ Product Article BreadcrumbList
- OpenGraph e Twitter Cards
- Alt text em todas as imagens
- noindex nofollow em páginas admin privadas
- OG images otimizadas 1200x630px
- Sitemap.xml estático ou dinâmico

OBSERVABILIDADE:
- Logs estruturados em eventos críticos
- Métricas salvas em agent_metrics
- Alertas configurados para erros críticos alert_config alert_history
- Correlation IDs em todo fluxo UUID
- Dashboards para métricas principais
- Circuit breaker pattern para APIs externas
- Dead Letter Queue DLQ monitorada

LGPD COMPLIANCE:
- Consentimento registrado em conversations lgpd_consent lgpd_consent_date
- Opt-out disponível opt_out_requested opt_out_date
- Anonimização após 90 dias automática
- Auditoria de acessos sensíveis em lgpd_audit
- Logs de alterações de dados
- Política de privacidade acessível
- Direito ao esquecimento implementado

EXEMPLOS VALIDACAO ZOD:
import { z } from zod;
const CreateUserSchema = z.object({
  name: z.string().trim().min(3).max(100),
  email: z.string().email().max(255).toLowerCase(),
  phone: z.string().regex(/^\d{10,11}$/),
  cpf: z.string().regex(/^\d{11}$/),
});
const result = CreateUserSchema.safeParse(body);
if (!result.success) return { error: result.error.errors };

EXEMPLO EDGE FUNCTION:
import { serve } from https://deno.land/std@0.168.0/http/server.ts;
const corsHeaders = {
  Access-Control-Allow-Origin: asterisco,
  Access-Control-Allow-Headers: authorization x-client-info apikey content-type,
};
serve(async (req) => {
  if (req.method === OPTIONS) return new Response(null, { headers: corsHeaders });
  try {
    const supabaseClient = createClient(Deno.env.get(SUPABASE_URL), Deno.env.get(SUPABASE_ANON_KEY), { global: { headers: { Authorization: req.headers.get(Authorization) } } });
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) throw new Error(Unauthorized);
    const body = await req.json();
    // Validar com Zod aqui
    console.log(JSON.stringify({ level: info, correlation_id: crypto.randomUUID(), user_id: user.id, action: function_started }));
    // Lógica de negócio
    return new Response(JSON.stringify({ success: true, data: result }), { headers: { ...corsHeaders, Content-Type: application/json }, status: 200 });
  } catch (error) {
    console.error(JSON.stringify({ level: error, error: error.message }));
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, Content-Type: application/json }, status: error.message === Unauthorized ? 401 : 500 });
  }
});

EXEMPLO RLS POLICY:
CREATE POLICY users_select_own ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY admin_full_access ON public.system_logs FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = admin));
NUNCA: CREATE POLICY allow_all ON public.users FOR ALL USING (true);

CHECKLIST APROVACAO:
TypeScript: Zero any, interfaces definidos, tipos Supabase importados
Design: Tokens HSL, cores semânticas, dark light mode
Arquitetura: Componentes menor 300 linhas, hooks extraídos, estrutura organizada
Backend: RLS ativo, políticas restritivas, índices, validação Zod
Edge Functions: Logs estruturados, circuit breaker, CORS, error handling
Segurança: Input validado, sanitização HTML, rate limiting, secrets
Performance: React Query, lazy loading, debounce, índices
SEO: Meta tags, Schema.org, noindex em privadas
Observabilidade: Logs estruturados, métricas, alertas
LGPD: Consentimento, auditoria, anonimização

WORKFLOW DESENVOLVIMENTO:
1. Planning: Requisito completo, impacto DB, componentes necessários
2. Database First: Migration SQL, RLS policies, índices, testar SQL Editor
3. Backend: Edge Function, validação Zod, logs estruturados, secrets
4. Frontend: Componentes focados, hooks customizados, React Query, design system
5. Testing: Fluxo completo, performance, logs, edge cases, responsive
6. Documentation: Features críticas, comentários código complexo, README
7. Review: Checklist aprovação, auditoria segurança, LGPD

FERRAMENTAS:
Packages: zod, @tanstack/react-query, react-hook-form, dompurify, date-fns, lucide-react
VS Code: ESLint, Prettier, Tailwind CSS IntelliSense, Error Lens, TypeScript Error Translator
Supabase: SQL Editor, Auth Management, Edge Functions Logs, Storage Buckets

Versão 2.0.0 Data 2025-01-19 Equipe Técnica Supernet Fiber Connect',
  'document',
  'development',
  ARRAY['guidelines', 'standards', 'best-practices', 'typescript', 'react', 'supabase', 'security', 'performance', 'seo', 'lgpd', 'zod', 'rls', 'edge-functions', 'validation', 'design-system'],
  'docs/DEVELOPMENT-GUIDELINES.md',
  true,
  false,
  0,
  ARRAY['support-tech-agent', 'support-commercial-agent', 'sales-agent', 'financial-agent'],
  jsonb_build_object(
    'version', '2.0.0',
    'approved_date', '2025-01-19',
    'audit_status', 'approved',
    'total_sections', 15,
    'total_checklists', 11,
    'priority', 'critical',
    'target_audience', 'developers',
    'file_path', 'docs/DEVELOPMENT-GUIDELINES.md',
    'file_size_kb', 40,
    'last_updated_by', 'system',
    'keywords', ARRAY['typescript', 'zod', 'rls', 'supabase', 'react-query', 'edge-functions', 'lgpd', 'seo', 'performance', 'security']
  )
)
ON CONFLICT (source) 
DO UPDATE SET
  content = EXCLUDED.content,
  title = EXCLUDED.title,
  updated_at = now(),
  metadata = EXCLUDED.metadata,
  tags = EXCLUDED.tags,
  agent_types = EXCLUDED.agent_types,
  is_active = true,
  migrated_at = now();
