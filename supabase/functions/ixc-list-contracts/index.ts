import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createAuthenticatedHandler } from "../_shared/base-handler.ts";

// P0 FIX: Convertido para createAuthenticatedHandler
// Lista de contratos contém dados de clientes sensíveis
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

    // Normalizar URL removendo /adm.php
    const cleanBaseUrl = IXC_API_BASE.replace(/\/adm\.php$/, '');

    interface RequestBody {
      page?: number | string;
      rp?: number | string;
      search?: string;
    }

    interface IXCContract {
      id_grupo?: string | number;
      id?: string | number;
      grupo?: string;
      velocidade?: string;
      download?: string;
      upload?: string;
      valor?: string;
    }

    interface IXCApiResponse {
      registros?: IXCContract[] | Record<string, IXCContract>;
      total?: number;
      message?: string;
    }

    const bodyJson = await req.json().catch(() => ({} as Record<string, unknown>));

    const page = Number((bodyJson as RequestBody).page) > 0 ? Number((bodyJson as RequestBody).page) : 1;
    const rp = Number((bodyJson as RequestBody).rp) > 0 ? Number((bodyJson as RequestBody).rp) : 50;
    const search = typeof (bodyJson as RequestBody).search === 'string' ? String((bodyJson as RequestBody).search) : '';

    const auth = btoa(`${ixcUsername}:${ixcPassword}`);
    const baseUrl = `${cleanBaseUrl}/webservice/v1`;

    // Helper to POST with IXC conventions
    const postIXC = async (endpoint: string, form: Record<string, string>): Promise<IXCApiResponse> => {
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
      let data: IXCApiResponse;
      try { 
        data = JSON.parse(text) as IXCApiResponse;
      } catch {
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

    // Use radgrupos (Planos de velocidades)
    const endpoint = 'radgrupos';
    let found: Array<{
      id: string | number;
      name: string;
      download: string;
      upload: string;
      value: string;
    }> = [];
    let lastTotal = 0;

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

    const result = await postIXC(endpoint, form);
    lastTotal = result?.total ?? 0;

    if (result?.registros && Array.isArray(result.registros)) {
      found = result.registros.map((r) => ({
        id: r.id_grupo || r.id,
        name: r.grupo || r.velocidade || '',
        download: r.download || '',
        upload: r.upload || '',
        value: r.valor || '',
      }));
    }

    console.log(`Found ${found.length} contracts (total: ${lastTotal})`);

    return {
      success: true,
      contracts: found,
      total: lastTotal,
      page,
      totalPages: Math.ceil(lastTotal / rp),
    };
  }
));
