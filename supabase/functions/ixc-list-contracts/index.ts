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

    // Try common plan endpoints (varies by IXC install)
    const candidateEndpoints = [
      'plano',
      'internet_plano',
      'planos',
      'servico_plano',
      'servico',
      'servicos',
      'radplanos',
      'radperfil',
      'cliente_tipo',
      'cliente_tipo_internet',
      'venda_planos',
      'planos_venda',
      'produto',
      'produtos',
    ];
    let found: any[] = [];
    let usedEndpoint = '';

    // Keywords from real day-to-day plans to identify the correct endpoint
    const knownPlanKeywords = ['escolar', 'octo'];

    for (const ep of candidateEndpoints) {
      try {
        const data = await postIXC(ep, {
          page: '1',
          rp: '1000',
        });
        // Many IXC installs return { page, total, registros }
        const registros = Array.isArray(data?.registros)
          ? data.registros
          : (data?.registros ? Object.values(data.registros) : []);
        
        let candidates: any[] = [];
        if (registros && registros.length > 0) {
          candidates = registros;
        } else if (Array.isArray(data?.data) && data.data.length) {
          candidates = data.data;
        }

        // Check if this endpoint contains known real plans
        if (candidates.length > 0) {
          const hasKnownPlans = candidates.some((r: any) => {
            const name = String(r.descricao ?? r.nome ?? r.plano ?? r.titulo ?? '').toLowerCase();
            return knownPlanKeywords.some(kw => name.includes(kw));
          });

          if (hasKnownPlans) {
            console.log(`✓ Found real plans at /${ep} (matched: Escolar/Octo)`);
            found = candidates;
            usedEndpoint = ep;
            break;
          }
        }

        // Some return { type: 'error', message: 'Recurso ... não está disponível!' }
        if (data?.type === 'error') {
          console.warn(`[IXC ${ep}] ${data.message}`);
          continue;
        }
      } catch (e) {
        console.warn(`[IXC ${ep}] attempt failed:`, (e as Error)?.message);
        continue;
      }
    }

    if (!found.length) {
      console.error('No plan endpoint with known plans found.');
      return new Response(
        JSON.stringify({
          success: false,
          error: `Nenhum endpoint retornou os planos conhecidos (Escolar/Octo). Tentativas: ${candidateEndpoints.join(', ')}. Verifique com o suporte IXC.`,
          tried: candidateEndpoints,
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
