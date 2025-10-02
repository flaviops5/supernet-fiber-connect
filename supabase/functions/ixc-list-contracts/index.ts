import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ixcUsername = Deno.env.get('IXC_API_USERNAME');
    const ixcPassword = Deno.env.get('IXC_API_PASSWORD');
    const IXC_API_BASE = Deno.env.get('IXC_API_BASE_URL');

    if (!ixcUsername || !ixcPassword) {
      throw new Error('IXC API credentials not configured');
    }

    if (!IXC_API_BASE) {
      throw new Error('IXC_API_BASE_URL not configured');
    }

    const bodyJson = await req.json().catch(() => ({} as Record<string, unknown>));

    const page = Number((bodyJson as any).page) > 0 ? Number((bodyJson as any).page) : 1;
    const rp = Number((bodyJson as any).rp) > 0 ? Number((bodyJson as any).rp) : 50;
    const search = typeof (bodyJson as any).search === 'string' ? String((bodyJson as any).search) : '';

    const auth = btoa(`${ixcUsername}:${ixcPassword}`);
    const baseUrl = `https://${IXC_API_BASE}/webservice/v1`;

    // Helper to POST with IXC conventions
    const postIXC = async (endpoint: string, form: Record<string, string>) => {
      const body = new URLSearchParams(form);
      const res = await fetch(`${baseUrl}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'ixcsoft': 'listar',
        },
        body,
      });
      const text = await res.text();
      let data: any;
      try { data = JSON.parse(text); } catch {
        console.error(`[IXC ${endpoint}] Non-JSON response:`, text);
        throw new Error(`Invalid response from IXC at /${endpoint}`);
      }
      if (!res.ok) {
        console.error(`[IXC ${endpoint}] HTTP ${res.status}:`, text);
        throw new Error(data?.message || `HTTP ${res.status}`);
      }
      return data;
    };

    console.log('Fetching speed plans from IXC radgrupos...');

    // Use radgrupos (Planos de velocidades) which has all info: name, download, upload, value
    const endpoint = 'radgrupos';
    let found: any[] = [];
    let lastTotal = 0;

    try {
      const form: Record<string, string> = {
        page: String(page),
        rp: String(rp),
        sortname: 'radgrupos.grupo',
        sortorder: 'asc',
      };
      if (search) {
        form.qtype = 'radgrupos.grupo';
        form.oper = 'L';
        form.query = search;
      }

      const data = await postIXC(endpoint, form);
      lastTotal = Number(data?.total || 0);

      const registros = Array.isArray(data?.registros)
        ? data.registros
        : (data?.registros ? Object.values(data.registros) : []);

      if (registros && registros.length > 0) {
        console.log(`✓ radgrupos returned ${registros.length} speed plans`);
        found = registros as any[];
      } else if (Array.isArray(data?.data) && data.data.length) {
        console.log(`✓ radgrupos (data) returned ${data.data.length} speed plans`);
        found = data.data;
      }
    } catch (e) {
      console.error('radgrupos fetch failed:', (e as Error)?.message);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Erro ao buscar planos de velocidade via /radgrupos: ${(e as Error)?.message}`,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      );
    }

    if (!found.length) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Nenhum plano de velocidade encontrado via /radgrupos.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      );
    }

    // Normalize radgrupos fields
    const normalized = found.map((r: any) => {
      const price = r.valor_produto ?? r.valor ?? r.mensalidade ?? null;
      const down = r.download ?? null;
      const up = r.upload ?? null;
      const descricao = r.grupo ?? r.nome ?? r.descricao ?? `Plano ${r.id ?? ''}`;
      return {
        id: String(r.id ?? ''),
        descricao: String(descricao ?? ''),
        valor: price !== null ? String(price) : undefined,
        download: down !== null ? String(down) : undefined,
        upload: up !== null ? String(up) : undefined,
        raw: r,
      };
    });

    // Filter plans with download/upload (actual internet plans)
    const internetPlans = normalized.filter(p => p.download || p.upload);

    console.log(`IXC radgrupos fetch OK: ${internetPlans.length} internet plans (total: ${normalized.length})`);

    const total = lastTotal || internetPlans.length;
    const totalPages = Math.max(1, Math.ceil(total / rp));

    return new Response(
      JSON.stringify({
        success: true,
        contracts: internetPlans,
        total,
        page,
        rp,
        totalPages,
        endpoint: 'radgrupos',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );

  } catch (error) {
    console.error('Error fetching plans from IXC:', error);
    const msg = (error as Error)?.message || 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  }
});
