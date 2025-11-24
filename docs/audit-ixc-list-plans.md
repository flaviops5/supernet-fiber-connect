# Auditoria: ixc-list-plans Edge Function

**Função:** `supabase/functions/ixc-list-plans/index.ts`  
**Propósito:** Lista planos comerciais combinando dados de `vd_planos` + `radgrupos` do sistema IXC  
**Status:** ⚠️ Requer Otimizações

---

## 📊 Análise Geral

### ✅ Pontos Positivos
1. **Estrutura clara e modular** - Separação entre `postIXC` e `fetchPagedIXC`
2. **Paginação automática** - Busca todos os dados independente do volume
3. **Lookup eficiente** - Usa `Map` para combinar `radgrupos` com `vd_planos`
4. **Normalização de URL** - Remove `/adm.php` e barras finais corretamente
5. **Tratamento de erros** - Captura respostas não-JSON e erros HTTP
6. **Dados enriquecidos** - Retorna informações técnicas + comerciais combinadas

### ⚠️ Problemas Críticos
1. **Performance ruim** - Busca TODOS os planos a cada requisição, sem cache
2. **Loop infinito potencial** - `do/while` pode não ter saída se API retornar dados inconsistentes
3. **Sem timeout** - Requisições podem travar indefinidamente
4. **Sem rate limiting** - Vulnerável a abuse
5. **Logging incompleto** - Falta rastreabilidade para debug em produção
6. **Sem filtros** - Não permite buscar planos específicos por ID ou nome

### 🔧 Melhorias Necessárias
- ✅ Adicionar cache com TTL de 5-10 minutos
- ✅ Implementar timeout de 30s nas requisições
- ✅ Adicionar limite máximo de páginas (ex: 100)
- ✅ Logging estruturado com duração de requisições
- ✅ Parâmetros opcionais de filtro (ids, nome, status)
- ⚠️ Rate limiting (já gerenciado pelo `createAuthenticatedHandler`)

---

## 💻 Código Otimizado

```typescript
// supabase/functions/ixc-list-plans/index.ts
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createAuthenticatedHandler } from "../_shared/base-handler.ts";

// Cache simples em memória (TTL: 5 minutos)
const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_PAGES = 100; // Limite de segurança
const REQUEST_TIMEOUT_MS = 30000; // 30 segundos

interface CacheEntry {
  data: any;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();

function getCached(key: string): any | null {
  const entry = cache.get(key);
  if (!entry) return null;
  
  const age = Date.now() - entry.timestamp;
  if (age > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  
  return entry.data;
}

function setCache(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() });
}

// Lista planos comerciais combinando vd_planos + radgrupos
Deno.serve(
  createAuthenticatedHandler("ixc-list-plans", async (req) => {
    const startTime = Date.now();
    
    // Parse query params para filtros opcionais
    const url = new URL(req.url);
    const filterIds = url.searchParams.get("ids")?.split(",") || [];
    const filterName = url.searchParams.get("name") || "";
    const cacheKey = `plans:${filterIds.join(",")}:${filterName}`;
    
    // Verificar cache
    const cached = getCached(cacheKey);
    if (cached) {
      console.log(`[ixc-list-plans] Cache hit (${Date.now() - startTime}ms)`);
      return cached;
    }
    
    const ixcUsername = Deno.env.get("IXC_API_USERNAME");
    const ixcPassword = Deno.env.get("IXC_API_PASSWORD");
    const IXC_API_BASE = Deno.env.get("IXC_API_BASE_URL");

    if (!ixcUsername || !ixcPassword) {
      throw new Error("IXC API credentials not configured");
    }
    if (!IXC_API_BASE) {
      throw new Error("IXC_API_BASE_URL not configured");
    }

    // Normalizar base: remove /adm.php e barra final
    const cleanBaseUrl = IXC_API_BASE
      .replace(/\/adm\.php$/, "")
      .replace(/\/$/, "");
    const baseUrl = `${cleanBaseUrl}/webservice/v1`;
    const auth = btoa(`${ixcUsername}:${ixcPassword}`);

    const postIXC = async (
      endpoint: string,
      form: Record<string, string>,
    ): Promise<any> => {
      const body = new URLSearchParams(form);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      
      try {
        const res = await fetch(`${baseUrl}/${endpoint}`, {
          method: "POST",
          headers: {
            "Authorization": `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
            "ixcsoft": "listar",
          },
          body,
          signal: controller.signal,
        });

        const text = await res.text();
        let data: any;
        try {
          data = JSON.parse(text);
        } catch {
          console.error(`[IXC ${endpoint}] Non-JSON response:`, text.substring(0, 200));
          throw new Error(`Invalid response from IXC at /${endpoint}`);
        }

        if (!res.ok) {
          console.error(`[IXC ${endpoint}] HTTP ${res.status}:`, text.substring(0, 200));
          throw new Error(data?.message || `HTTP ${res.status}`);
        }

        return data;
      } finally {
        clearTimeout(timeoutId);
      }
    };

    // Helper para buscar tudo com paginação SEGURA
    const fetchPagedIXC = async (
      endpoint: string,
      baseForm: Record<string, string>,
    ): Promise<any[]> => {
      const all: any[] = [];
      let page = 1;
      let totalPages = 1;

      do {
        if (page > MAX_PAGES) {
          console.warn(`[IXC ${endpoint}] Limite de páginas atingido (${MAX_PAGES})`);
          break;
        }
        
        const form = {
          ...baseForm,
          page: String(page),
        };

        const data = await postIXC(endpoint, form);

        const registros = Array.isArray(data?.registros)
          ? data.registros
          : data?.registros
          ? Object.values(data.registros)
          : [];

        if (registros.length > 0) {
          all.push(...registros);
        } else if (page === 1) {
          // Se primeira página vazia, não tem dados
          break;
        }

        const total = Number(data?.total || 0);
        const rp = Number(form.rp || "100");
        totalPages = Math.max(1, Math.ceil(total / rp));
        page++;
      } while (page <= totalPages && page <= MAX_PAGES);

      return all;
    };

    // 1) Buscar TODOS os radgrupos (velocidade técnica)
    const radgrupos = await fetchPagedIXC("radgrupos", {
      page: "1",
      rp: "100",
      sortname: "radgrupos.grupo",
      sortorder: "asc",
    });

    const radMap = new Map<
      string,
      { grupo?: string; download?: string; upload?: string }
    >();

    for (const r of radgrupos) {
      const id = String(r.id_grupo ?? r.id ?? "");
      if (!id) continue;
      radMap.set(id, {
        grupo: r.grupo ?? r.velocidade ?? "",
        download: r.download ?? "",
        upload: r.upload ?? "",
      });
    }

    // 2) Buscar TODOS os vd_planos (planos comerciais)
    const vdPlanos = await fetchPagedIXC("vd_planos", {
      page: "1",
      rp: "100",
      sortname: "vd_planos.id",
      sortorder: "asc",
    });

    // 3) Montar lista unificada
    let combinedPlans = vdPlanos.map((p: any) => {
      const id = String(p.id ?? "");
      const idGrupo = String(p.id_grupo ?? p.id_radgrupo ?? "");
      const grupo = idGrupo ? radMap.get(idGrupo) : undefined;

      const download = grupo?.download ?? "";
      const upload = grupo?.upload ?? "";

      const priceRaw = p.valor_plano ?? p.valor ?? p.valor_contrato ?? "0";

      return {
        id,
        name: p.nome ?? p.descricao ?? grupo?.grupo ?? `Plano ${id}`,
        download,
        upload,
        price: Number(priceRaw || 0),
        ixc_group_id: idGrupo || null,
        raw: {
          vd_planos: p,
          radgrupos: grupo ?? null,
        },
      };
    });

    // 4) Aplicar filtros se fornecidos
    if (filterIds.length > 0) {
      combinedPlans = combinedPlans.filter((p: any) => 
        filterIds.includes(p.id) || filterIds.includes(String(p.id))
      );
    }
    
    if (filterName) {
      const lowerName = filterName.toLowerCase();
      combinedPlans = combinedPlans.filter((p: any) => 
        p.name.toLowerCase().includes(lowerName)
      );
    }

    const duration = Date.now() - startTime;
    const result = {
      success: true,
      plans: combinedPlans,
      total: combinedPlans.length,
      duration_ms: duration,
      cached: false,
    };
    
    // Armazenar em cache
    setCache(cacheKey, result);
    
    console.log(`[ixc-list-plans] Completed in ${duration}ms (${combinedPlans.length} plans)`);
    
    return result;
  }),
);
```

---

## 📋 Checklist de Implementação

- [x] Cache em memória com TTL
- [x] Timeout de requisições (30s)
- [x] Limite de páginas (100)
- [x] Logging estruturado com duração
- [x] Filtros opcionais por IDs e nome
- [x] Proteção contra loop infinito
- [x] Tratamento de resposta vazia na primeira página

---

## 🚀 Próximas Melhorias

1. **Cache Redis** - Para ambientes multi-instância
2. **Background refresh** - Atualizar cache antes de expirar
3. **Métricas Prometheus** - Monitorar performance e taxa de erro
4. **Filtros avançados** - Por faixa de preço, velocidade mínima
5. **Paginação na resposta** - Não retornar todos os planos de uma vez
6. **Compressão** - Gzip/Brotli para respostas grandes

---

**Data da Auditoria:** 2025-11-24  
**Revisor:** AI Code Auditor  
**Versão do Documento:** 1.0
