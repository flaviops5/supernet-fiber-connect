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
    let rawResponse: any = null;
    let usedEndpoint = '';

    for (const ep of candidateEndpoints) {
      try {
        const data = await postIXC(ep, {
          page: '1',
          rp: '1000',
        });
        rawResponse = data;
        // Many IXC installs return { page, total, registros }
        const registros = Array.isArray(data?.registros)
          ? data.registros
          : (data?.registros ? Object.values(data.registros) : []);
        if (registros && registros.length > 0) {
          found = registros as any[];
          usedEndpoint = ep;
          break;
        }
        // Some return { data: [...] }
        if (Array.isArray(data?.data) && data.data.length) {
          found = data.data;
          usedEndpoint = ep;
          break;
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
      console.error('No plan endpoint returned data.');
      return new Response(
        JSON.stringify({
          success: false,
          error: `Nenhum endpoint de planos do IXC retornou dados. Tentativas: ${candidateEndpoints.join(', ')}. Verifique com o suporte IXC qual recurso está habilitado para listar planos/comercial.`,
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
      return {
        id: String(r.id ?? ''),
        descricao: String(descricao ?? ''),
        valor: price !== null ? String(price) : undefined,
        download: down !== null ? String(down) : undefined,
        upload: up !== null ? String(up) : undefined,
        raw: r,
      } as {
        id: string;
        descricao: string;
        valor?: string;
        download?: string;
        upload?: string;
        raw: any;
      };
    });

    // Prefer day-to-day plans mentioned: Escolar, Octo; fallback to likely internet plans
    const preferredKeywords = ['escolar', 'octo'];
    const preferred = normalized.filter(p =>
      preferredKeywords.some(k => p.descricao.toLowerCase().includes(k))
    );

    const likelyInternet = preferred.length ? preferred : normalized.filter(p =>
      Boolean(p.download || p.upload) || /\b(mega|mbps|gbps|giga|mb|gb|fibra|plano)\b/i.test(p.descricao)
    );

    const finalList = likelyInternet;

    console.log(`IXC Plan fetch OK via /${usedEndpoint}: ${finalList.length} items (filtered)`);

    return new Response(
      JSON.stringify({
        success: true,
        contracts: finalList,
        total: finalList.length,
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
