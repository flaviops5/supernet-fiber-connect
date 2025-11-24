# Auditoria: ixc-sync-plans Edge Function

**Função:** `supabase/functions/ixc-sync-plans/index.ts`  
**Propósito:** Sincroniza planos específicos do IXC para a tabela local `plans` (upsert)  
**Status:** ⚠️ Requer Otimizações

---

## 📊 Análise Geral

### ✅ Pontos Positivos
1. **Validação robusta** - Verifica tipo, presença e tamanho do array `planIds`
2. **Paginação completa** - Busca todos os dados via `fetchPagedIXC`
3. **Mapeamento correto** - Combina `vd_planos` + `radgrupos` corretamente
4. **Lógica de upsert inteligente** - Verifica existência antes de inserir/atualizar
5. **Resultados detalhados** - Retorna status individual de cada plano
6. **Tratamento de erros granular** - Não falha toda sincronização se um plano der erro
7. **Features automáticas** - Gera JSON com características do plano

### ⚠️ Problemas Críticos
1. **Performance péssima** - Busca TODOS os planos IXC sempre, mesmo sincronizando apenas 2
2. **Sem timeout** - Requisições podem travar indefinidamente
3. **Sem cache** - Busca radgrupos/vd_planos toda vez (poderia cachear)
4. **Loop infinito potencial** - `do/while` sem proteção
5. **Processamento sequencial** - Poderia usar `Promise.all` para paralelizar upserts
6. **Sem rate limiting** - Operação administrativa crítica sem proteção extra

### 🔧 Melhorias Necessárias
- ✅ Adicionar timeout de 45s (operação mais longa)
- ✅ Implementar limite máximo de páginas
- ✅ Paralelizar upserts com `Promise.all` (batch de 5)
- ✅ Cache compartilhado com `ixc-list-plans`
- ✅ Logging estruturado com métricas
- ✅ Buscar apenas planos solicitados da API (se possível)

---

## 💻 Código Otimizado

```typescript
// supabase/functions/ixc-sync-plans/index.ts
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createAuthenticatedHandler } from "../_shared/base-handler.ts";

const REQUEST_TIMEOUT_MS = 45000; // 45s (operação mais longa)
const MAX_PAGES = 100;
const BATCH_SIZE = 5; // Processa 5 planos em paralelo

// Sincronização de planos é operação administrativa crítica
Deno.serve(
  createAuthenticatedHandler("ixc-sync-plans", async (req, { supabase }) => {
    const startTime = Date.now();
    const requestBody = await req.json();
    const { planIds } = requestBody;

    // ✅ Validação robusta
    if (!planIds) {
      throw new Error("planIds é obrigatório no body da requisição");
    }
    if (!Array.isArray(planIds)) {
      throw new Error(`planIds deve ser um array, recebido: ${typeof planIds}`);
    }
    if (planIds.length === 0) {
      throw new Error("planIds não pode ser um array vazio");
    }

    const ixcUsername = Deno.env.get("IXC_API_USERNAME");
    const ixcPassword = Deno.env.get("IXC_API_PASSWORD");
    const IXC_API_BASE = Deno.env.get("IXC_API_BASE_URL");

    if (!ixcUsername || !ixcPassword) {
      throw new Error("Credenciais IXC não configuradas");
    }
    if (!IXC_API_BASE) {
      throw new Error("IXC_API_BASE_URL não configurado");
    }

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
          break;
        }

        const total = Number(data?.total || 0);
        const rp = Number(form.rp || "100");
        totalPages = Math.max(1, Math.ceil(total / rp));
        page++;
      } while (page <= totalPages && page <= MAX_PAGES);

      return all;
    };

    console.log(`[ixc-sync-plans] Sincronizando ${planIds.length} planos`);

    // Buscar TODOS os radgrupos (cache poderia ser implementado aqui)
    const radgrupos = await fetchPagedIXC("radgrupos", {
      page: "1",
      rp: "100",
      sortname: "radgrupos.grupo",
      sortorder: "asc",
    });

    const radMap = new Map<
      string,
      { grupo?: string; download?: string; upload?: string; valor?: string }
    >();

    for (const r of radgrupos) {
      const id = String(r.id_grupo ?? r.id ?? "");
      if (!id) continue;
      radMap.set(id, {
        grupo: r.grupo ?? r.velocidade ?? "",
        download: r.download ?? "",
        upload: r.upload ?? "",
        valor: r.valor ?? r.valor_produto ?? "",
      });
    }

    // Buscar TODOS os vd_planos
    const vdPlanos = await fetchPagedIXC("vd_planos", {
      page: "1",
      rp: "100",
      sortname: "vd_planos.id",
      sortorder: "asc",
    });

    const registros = vdPlanos;
    if (registros.length === 0) {
      throw new Error("Nenhum plano comercial (vd_planos) encontrado no IXC");
    }

    // Filtrar pelos IDs solicitados
    const plansToSync = registros.filter((p: any) => {
      const rid = String(p.id ?? "");
      return planIds.includes(Number(rid)) ||
        planIds.includes(String(rid)) ||
        planIds.some((pid: any) => String(pid) === rid);
    });

    if (plansToSync.length === 0) {
      const allIds = registros.slice(0, 20).map((p: any) => p.id);
      throw new Error(
        `Nenhum dos planos solicitados (${planIds.join(
          ", ",
        )}) foi encontrado em vd_planos. IDs disponíveis (primeiros 20): ${
          allIds.join(", ")
        }`,
      );
    }

    console.log(`[ixc-sync-plans] ${plansToSync.length} planos encontrados no IXC`);

    // 🚀 Processar em lotes paralelos
    const syncResults: {
      ixcId: string;
      status: "created" | "updated" | "error";
      name?: string;
      error?: string;
    }[] = [];

    for (let i = 0; i < plansToSync.length; i += BATCH_SIZE) {
      const batch = plansToSync.slice(i, i + BATCH_SIZE);
      
      const batchPromises = batch.map(async (plano) => {
        const ixcId = String(plano.id);
        const idGrupo = String(plano.id_grupo ?? plano.id_radgrupo ?? "");
        const grupo = idGrupo ? radMap.get(idGrupo) : undefined;

        const name =
          plano.nome ?? plano.descricao ?? grupo?.grupo ?? `Plano ${ixcId}`;
        const download = grupo?.download ?? "";
        const upload = grupo?.upload ?? "";
        const priceRaw = plano.valor_plano ?? plano.valor ?? grupo?.valor ?? "0";

        const speed = download && upload
          ? `${download}/${upload} Mbps`
          : download
          ? `${download} Mbps`
          : "N/A";

        try {
          const { data: existing } = await supabase
            .from("plans")
            .select("id")
            .eq("ixc_plan_id", ixcId)
            .maybeSingle();

          const planData = {
            name,
            speed,
            price: Number(priceRaw || 0),
            ixc_plan_id: ixcId,
            description: `Plano de ${speed}`,
            active: true,
            features: JSON.stringify([
              download ? `${download} Mbps de download` : "Download não informado",
              upload ? `${upload} Mbps de upload` : "Upload não informado",
              "Fibra óptica",
              "Suporte 24/7",
            ]),
          };

          if (existing) {
            const { error } = await supabase
              .from("plans")
              .update(planData)
              .eq("id", existing.id);

            if (error) throw error;
            
            return {
              ixcId,
              status: "updated" as const,
              name,
            };
          } else {
            const { error } = await supabase.from("plans").insert(planData);

            if (error) throw error;
            
            return {
              ixcId,
              status: "created" as const,
              name,
            };
          }
        } catch (error: any) {
          console.error(`[ixc-sync-plans] Erro ao sincronizar plano ${ixcId}:`, error);
          return {
            ixcId,
            status: "error" as const,
            error: error.message || "Erro desconhecido",
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      syncResults.push(...batchResults);
      
      console.log(`[ixc-sync-plans] Batch ${Math.floor(i / BATCH_SIZE) + 1} completo (${batchResults.length} planos)`);
    }

    const hasErrors = syncResults.some((r) => r.status === "error");
    const duration = Date.now() - startTime;

    console.log(`[ixc-sync-plans] Completed in ${duration}ms - Created: ${
      syncResults.filter(r => r.status === "created").length
    }, Updated: ${
      syncResults.filter(r => r.status === "updated").length
    }, Errors: ${
      syncResults.filter(r => r.status === "error").length
    }`);

    return {
      success: !hasErrors,
      results: syncResults,
      synced: syncResults.filter((r) => r.status !== "error").length,
      errors: syncResults.filter((r) => r.status === "error").length,
      duration_ms: duration,
    };
  }),
);
```

---

## 📋 Checklist de Implementação

- [x] Timeout de requisições (45s)
- [x] Limite de páginas (100)
- [x] Processamento paralelo em lotes de 5
- [x] Logging estruturado com métricas
- [x] Proteção contra loop infinito
- [x] Tratamento de resposta vazia
- [x] Métricas de performance detalhadas

---

## 🚀 Próximas Melhorias

1. **Cache compartilhado** - Compartilhar cache de radgrupos/vd_planos com `ixc-list-plans`
2. **Busca seletiva** - Tentar buscar apenas os planos solicitados da API IXC (se suportado)
3. **Webhook de conclusão** - Notificar quando sincronização terminar (para grandes volumes)
4. **Versionamento** - Detectar mudanças e manter histórico
5. **Dry-run mode** - Preview das mudanças antes de aplicar
6. **Retry automático** - Para erros temporários em planos específicos

---

**Data da Auditoria:** 2025-11-24  
**Revisor:** AI Code Auditor  
**Versão do Documento:** 1.0
