import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Lista planos de velocidade do IXC de múltiplos endpoints
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ixcUsername = Deno.env.get("IXC_API_USERNAME");
    const ixcPassword = Deno.env.get("IXC_API_PASSWORD");
    const IXC_API_BASE = Deno.env.get("IXC_API_BASE_URL");

    if (!ixcUsername || !ixcPassword) {
      return new Response(
        JSON.stringify({ error: "IXC API credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!IXC_API_BASE) {
      return new Response(
        JSON.stringify({ error: "IXC_API_BASE_URL not configured" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Lê body opcional (pode vir vazio)
    const bodyJson = await req.json().catch(() => ({} as any));
    const search =
      typeof bodyJson.search === "string" ? String(bodyJson.search) : "";

    // Normalizar URL removendo /adm.php e protocolo duplicado
    const cleanBaseUrl = IXC_API_BASE.replace(/\/adm\.php$/, "").replace(
      /^https?:\/\//,
      "",
    );
    const auth = btoa(`${ixcUsername}:${ixcPassword}`);
    const baseUrl = `https://${cleanBaseUrl}/webservice/v1`;

    const MAX_PER_PAGE = 100;
    const MAX_PAGES = 50;

    // Função genérica para buscar de qualquer endpoint
    const fetchFromEndpoint = async (endpoint: string, sortField: string) => {
      const allRegistros: any[] = [];
      let currentPage = 1;

      console.log(`[${endpoint}] Iniciando busca...`);

      while (currentPage <= MAX_PAGES) {
        const form = new URLSearchParams({
          page: String(currentPage),
          rp: String(MAX_PER_PAGE),
          sortname: sortField,
          sortorder: "asc",
        });

        if (search) {
          form.set("qtype", sortField);
          form.set("oper", "L");
          form.set("query", search);
        }

        try {
          const res = await fetch(`${baseUrl}/${endpoint}`, {
            method: "POST",
            headers: {
              Authorization: `Basic ${auth}`,
              "Content-Type": "application/x-www-form-urlencoded",
              ixcsoft: "listar",
            },
            body: form,
          });

          const text = await res.text();
          let data: any;
          
          try {
            data = JSON.parse(text);
          } catch {
            console.error(`[${endpoint}] Resposta não-JSON:`, text.substring(0, 200));
            break; // Endpoint não disponível, pula para o próximo
          }

          if (!res.ok) {
            console.error(`[${endpoint}] HTTP ${res.status}`);
            break;
          }

          const rawRegistros = Array.isArray(data?.registros)
            ? data.registros
            : data?.registros
            ? Object.values(data.registros)
            : [];

          if (!rawRegistros.length) {
            console.log(`[${endpoint}] Página ${currentPage} vazia`);
            break;
          }

          allRegistros.push(...rawRegistros);
          console.log(`[${endpoint}] Página ${currentPage}: +${rawRegistros.length}`);

          const totalFromEndpoint = Number(data?.total || 0);
          if (totalFromEndpoint > 0 && allRegistros.length >= totalFromEndpoint) {
            break;
          }

          currentPage++;
        } catch (error) {
          console.error(`[${endpoint}] Erro na página ${currentPage}:`, error);
          break;
        }
      }

      console.log(`[${endpoint}] Total: ${allRegistros.length}`);
      return allRegistros;
    };

    console.log("[ixc-list-plans] 🔍 Buscando planos de múltiplos endpoints...");

    // Buscar de todos os endpoints em paralelo
    const [radgruposPlans, vdContratosPlans, produtoPlans, ossPlanoPlans] = await Promise.all([
      fetchFromEndpoint("radgrupos", "radgrupos.grupo"),
      fetchFromEndpoint("vd_contratos", "vd_contratos.plano"),
      fetchFromEndpoint("produto", "produto.descricao"),
      fetchFromEndpoint("su_oss_plano", "su_oss_plano.nome"),
    ]);

    console.log("[ixc-list-plans] 📊 Resultados por endpoint:");
    console.log(`  - radgrupos: ${radgruposPlans.length}`);
    console.log(`  - vd_contratos: ${vdContratosPlans.length}`);
    console.log(`  - produto: ${produtoPlans.length}`);
    console.log(`  - su_oss_plano: ${ossPlanoPlans.length}`);

    // Combinar e deduplicar por ID
    const allPlansMap = new Map<string, any>();
    
    [...radgruposPlans, ...vdContratosPlans, ...produtoPlans, ...ossPlanoPlans].forEach((plan: any) => {
      const id = String(plan.id_grupo ?? plan.id ?? plan.id_plano ?? "");
      if (id && !allPlansMap.has(id)) {
        allPlansMap.set(id, plan);
      }
    });

    const allPlans = Array.from(allPlansMap.values());
    console.log(`[ixc-list-plans] ✅ Total único de planos: ${allPlans.length}`);

    if (!allPlans.length) {
      console.log("[ixc-list-plans] Nenhum plano encontrado no IXC");
      return new Response(
        JSON.stringify({
          success: true,
          plans: [],
          total: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalizar para o formato esperado pelo frontend
    const normalizedPlans = allPlans.map((r: any) => {
      const id = String(r.id_grupo ?? r.id ?? r.id_plano ?? "");
      const name =
        r.grupo ||
        r.plano ||
        r.velocidade ||
        r.nome ||
        (r.descricao as string | undefined) ||
        `Plano ${id}`;

      const download = r.download ?? r.down ?? r.velocidade_down ?? "";
      const upload = r.upload ?? r.up ?? r.velocidade_up ?? "";

      const rawPrice = r.valor_produto ?? r.valor ?? r.preco ?? r.valor_mensalidade ?? null;
      const priceNumber = rawPrice != null ? Number(rawPrice) : 0;

      return {
        id,
        name,
        download: String(download ?? ""),
        upload: String(upload ?? ""),
        price: isNaN(priceNumber) ? 0 : priceNumber,
      };
    });

    console.log(`[ixc-list-plans] ✅ Total normalizado: ${normalizedPlans.length} planos`);

    return new Response(
      JSON.stringify({
        success: true,
        plans: normalizedPlans,
        total: normalizedPlans.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("[ixc-list-plans] Erro:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
