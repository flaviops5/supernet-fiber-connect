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

    if (!ixcUsername || !ixcPassword) {
      throw new Error('IXC API credentials not configured');
    }

    // Body is optional for future filters (e.g., only active plans)
    const _body = await req.json().catch(() => ({} as Record<string, unknown>));

    const auth = btoa(`${ixcUsername}:${ixcPassword}`);
    const baseUrl = 'https://central.supernetfibra.com.br/webservice/v1';

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

    console.log('Fetching commercial plans from IXC...');

    // Prefer explicit IXC endpoint for planos de venda
    const endpoint = 'vd_contratos';
    let usedEndpoint = endpoint;
    let found: any[] = [];

    // Try multiple GRID filters to get only active sale plans
    const baseForm: Record<string, string> = { page: '1', rp: '1000' };
    const gridAttempts: string[] = [
      JSON.stringify([{ TB: 'vd_contratos.situacao', OP: '=', P: 'A' }]),
      JSON.stringify([{ TB: 'vd_contratos.status', OP: '=', P: 'A' }]),
      JSON.stringify([{ TB: 'vd_contratos.ativo', OP: '=', P: 'S' }]),
      JSON.stringify([{ TB: 'vd_contratos.ativo_venda', OP: '=', P: 'S' }]),
      JSON.stringify([{ TB: 'vd_contratos.tipo', OP: '=', P: 'PLANO' }]),
      JSON.stringify([{ TB: 'vd_contratos.tipo_contrato', OP: '=', P: 'PLANO' }]),
      JSON.stringify([
        { TB: 'vd_contratos.situacao', OP: '=', P: 'A' },
        { TB: 'vd_contratos.tipo', OP: '=', P: 'PLANO' }
      ]),
    ];

    for (const grid of gridAttempts) {
      try {
        const data = await postIXC(endpoint, { ...baseForm, grid_param: grid });
        const registros = Array.isArray(data?.registros)
          ? data.registros
          : (data?.registros ? Object.values(data.registros) : []);
        if (registros && registros.length > 0) {
          console.log(`✓ vd_contratos with grid_param returned ${registros.length} records`);
          found = registros as any[];
          break;
        }
        if (Array.isArray(data?.data) && data.data.length) {
          console.log(`✓ vd_contratos (data) with grid_param returned ${data.data.length} records`);
          found = data.data;
          break;
        }
      } catch (e) {
        console.warn(`vd_contratos grid attempt failed:`, (e as Error)?.message);
      }
    }

    // Fallback: no grid filter
    if (!found.length) {
      try {
        const data = await postIXC(endpoint, baseForm);
        const registros = Array.isArray(data?.registros)
          ? data.registros
          : (data?.registros ? Object.values(data.registros) : []);
        if (registros && registros.length > 0) {
          console.log(`✓ vd_contratos without grid_param returned ${registros.length} records`);
          found = registros as any[];
        } else if (Array.isArray(data?.data) && data.data.length) {
          console.log(`✓ vd_contratos (data) without grid_param returned ${data.data.length} records`);
          found = data.data;
        }
      } catch (e) {
        console.warn(`vd_contratos fallback attempt failed:`, (e as Error)?.message);
      }
    }

    if (!found.length) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Nenhum plano de venda encontrado via /vd_contratos. Confirme no IXC quais filtros/colunas usar (situacao/status/ativo).',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      );
    }

    // Normalize plan fields to a common shape
    const normalized = found.map((r: any) => {
      const price = r.valor ?? r.mensalidade ?? r.preco ?? r.valor_mensal ?? null;
      const down = r.download ?? r.velocidade_download ?? r.vel_down ?? r.vdownload ?? null;
      const up = r.upload ?? r.velocidade_upload ?? r.vel_up ?? r.vupload ?? null;
      const descricao = r.descricao ?? r.nome ?? r.plano ?? r.titulo ?? `Plano ${r.id ?? ''}`;
      const ativo = r.ativo ?? r.status ?? r.situacao ?? null;
      return {
        id: String(r.id ?? ''),
        descricao: String(descricao ?? ''),
        valor: price !== null ? String(price) : undefined,
        download: down !== null ? String(down) : undefined,
        upload: up !== null ? String(up) : undefined,
        ativo: ativo !== null ? String(ativo) : undefined,
        raw: r,
      };
    });

    // Filter only active plans if status field exists
    const activePlans = normalized.filter(p => {
      if (!p.ativo) return true; // No status field, include all
      const statusStr = String(p.ativo).toLowerCase();
      return statusStr === 's' || statusStr === 'sim' || statusStr === 'ativo' || statusStr === 'true' || statusStr === '1';
    });

    console.log(`IXC Plan fetch OK via /${usedEndpoint}: ${activePlans.length} active plans (total: ${normalized.length})`);

    return new Response(
      JSON.stringify({
        success: true,
        contracts: activePlans,
        total: activePlans.length,
        endpoint: usedEndpoint,
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
