import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createAuthenticatedHandler } from "../_shared/base-handler.ts";

// Cache em memória (5 min TTL)
const CACHE_TTL_MS = 5 * 60 * 1000;
let memoryCache: { data: any; timestamp: number } | null = null;

// Lista de contratos = planos de velocidade (radgrupos)
Deno.serve(createAuthenticatedHandler(
  'ixc-list-contracts',
  async (req, { supabase, user }) => {
    const ixcUsername = Deno.env.get('IXC_API_USERNAME');
    const ixcPassword = Deno.env.get('IXC_API_PASSWORD');
    const IXC_API_BASE = Deno.env.get('IXC_API_BASE_URL');

    if (!ixcUsername || !ixcPassword) {
      throw new Error('IXC API credentials not configured');
    }
    if (!IXC_API_BASE) {
      throw new Error('IXC_API_BASE_URL not configured');
    }

    // Normalizar URL
    const cleanBaseUrl = IXC_API_BASE
      .replace(/\/adm\.php$/, '')
      .replace(/^https?:\/\//, '');
    const baseUrl = `https://${cleanBaseUrl}/webservice/v1`;
    const auth = btoa(`${ixcUsername}:${ixcPassword}`);

    const bodyJson = await req.json().catch(() => ({} as any));
    const page = Number(bodyJson.page) > 0 ? Number(bodyJson.page) : 1;
    const perPage = Number(bodyJson.rp) > 0 ? Number(bodyJson.rp) : 50;
    const search = typeof bodyJson.search === 'string' ? String(bodyJson.search).trim() : '';

    // Função com timeout
    const fetchWithTimeout = async (url: string, options: any, timeoutMs = 30000) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      
      try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timeout);
        return response;
      } catch (error) {
        clearTimeout(timeout);
        throw error;
      }
    };

    // POST IXC com timeout
    const postIXC = async (endpoint: string, form: Record<string, string>) => {
      const body = new URLSearchParams(form);
      const res = await fetchWithTimeout(`${baseUrl}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'ixcsoft': 'listar',
        },
        body,
      }, 30000);

      const text = await res.text();
      let data: any;
      
      try {
        data = JSON.parse(text);
      } catch {
        console.error(`[IXC ${endpoint}] Non-JSON:`, text);
        throw new Error(`Invalid response from IXC at /${endpoint}`);
      }
      
      if (!res.ok) {
        console.error(`[IXC ${endpoint}] HTTP ${res.status}:`, text);
        throw new Error(data?.message || `HTTP ${res.status}`);
      }
      
      return data;
    };

    // Verificar cache
    const now = Date.now();
    if (!search && memoryCache && (now - memoryCache.timestamp) < CACHE_TTL_MS) {
      console.log('[ixc-list-contracts] Using cached data');
      const cached = memoryCache.data;
      const totalPages = Math.ceil(cached.length / perPage);
      const safePage = Math.min(page, totalPages);
      const start = (safePage - 1) * perPage;
      const pageItems = cached.slice(start, start + perPage);
      
      return {
        success: true,
        contracts: pageItems,
        page: safePage,
        total: cached.length,
        totalPages,
        perPage,
      };
    }

    console.log('[ixc-list-contracts] Fetching from IXC radgrupos...');

    // Buscar todos radgrupos com paginação real
    let allContracts: any[] = [];
    let currentPage = 1;
    const maxPages = 100;

    while (currentPage <= maxPages) {
      const form: Record<string, string> = {
        page: String(currentPage),
        rp: '100',
        sortname: 'radgrupos.grupo',
        sortorder: 'asc',
      };
      
      if (search) {
        form.qtype = 'radgrupos.grupo';
        form.oper = 'L';
        form.query = search;
      }

      const result = await postIXC('radgrupos', form);
      const total = result?.total ?? 0;
      
      let registros: any[] = [];
      if (Array.isArray(result?.registros)) {
        registros = result.registros;
      } else if (result?.registros && typeof result.registros === 'object') {
        registros = Object.values(result.registros);
      }

      if (registros.length === 0) break;

      // Mapear para formato esperado
      const mapped = registros.map((r: any) => ({
        id: String(r.id_grupo || r.id),
        descricao: r.grupo || r.velocidade || `Plano ${r.id}`,
        valor: r.valor || '0.00',
        download: r.download || '',
        upload: r.upload || '',
        tipo: 'velocidade',
      }));

      allContracts = allContracts.concat(mapped);

      if (allContracts.length >= total) break;
      currentPage++;
    }

    console.log(`[ixc-list-contracts] Fetched ${allContracts.length} total contracts`);

    // Atualizar cache (somente se não houver busca)
    if (!search) {
      memoryCache = { data: allContracts, timestamp: now };
    }

    // Paginar resultado
    const totalPages = Math.ceil(allContracts.length / perPage);
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * perPage;
    const pageItems = allContracts.slice(start, start + perPage);

    return {
      success: true,
      contracts: pageItems,
      page: safePage,
      total: allContracts.length,
      totalPages,
      perPage,
    };
  }
));
