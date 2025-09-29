import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IXCCustomer {
  id: string;
  razao: string;
  nome_fantasia?: string;
  cnpj_cpf: string;
  email?: string;
  telefone_comercial?: string;
  telefone_celular?: string;
  endereco?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  status?: string;
}

function normalizeRegistros(input: any): IXCCustomer[] {
  if (!input) return [];
  const arr = Array.isArray(input) ? input : (typeof input === 'object' ? Object.values(input) : []);
  // Normaliza chaves divergentes (ex.: fantasia -> nome_fantasia)
  return arr.map((r: any) => ({
    id: String(r.id ?? ''),
    razao: String(r.razao ?? r.nome ?? ''),
    nome_fantasia: r.nome_fantasia ?? r.fantasia ?? undefined,
    cnpj_cpf: String(r.cnpj_cpf ?? r.cnpj ?? r.cpf ?? ''),
    email: r.email ?? r.hotsite_email ?? undefined,
    telefone_comercial: r.telefone_comercial ?? undefined,
    telefone_celular: r.telefone_celular ?? r.whatsapp ?? undefined,
    endereco: r.endereco ?? undefined,
    numero: r.numero ?? undefined,
    bairro: r.bairro ?? undefined,
    cidade: r.cidade ?? undefined,
    uf: r.uf ?? undefined,
    cep: r.cep ?? undefined,
    status: r.status ?? r.ativo ?? undefined,
  })) as IXCCustomer[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, params = {} } = await req.json();
    
    const username = Deno.env.get('IXC_API_USERNAME');
    const password = Deno.env.get('IXC_API_PASSWORD');
    
    if (!username || !password) {
      throw new Error('Credenciais do IXC não configuradas');
    }

    const auth = btoa(`${username}:${password}`);
    const baseUrl = 'https://central.supernetfibra.com.br/webservice/v1';

    let result: any = null;

    switch (action) {
      case 'getCustomers':
        result = await getCustomers(baseUrl, auth, params);
        break;
      
      case 'getCustomer':
        if (!params.id) {
          throw new Error('ID do cliente é obrigatório');
        }
        result = await getCustomer(baseUrl, auth, params.id);
        break;
      
      case 'searchCustomers':
        if (!params.query) {
          throw new Error('Query de busca é obrigatória');
        }
        result = await searchCustomers(baseUrl, auth, params.query);
        break;
      
      case 'testConnection':
        result = await testConnection(baseUrl, auth);
        break;
      
      default:
        throw new Error(`Ação não suportada: ${action}`);
    }

    console.log(`IXC Integration - Action: ${action}`, { 
      success: true, 
      resultCount: Array.isArray(result) ? result.length : (result ? 1 : 0)
    });

    return new Response(JSON.stringify({ 
      success: true, 
      data: result 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro na integração IXC:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage
    }), {
      status: errorMessage.includes('não configuradas') ? 401 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function postIXC(url: string, auth: string, params: Record<string, string>): Promise<any> {
  const body = new URLSearchParams(params);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'ixcsoft': 'listar',
    },
    body,
  });

  const text = await response.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch (_e) {
    console.error('Resposta não é JSON válido:', text);
    throw new Error('Resposta inválida da API IXC');
  }
  return { ok: response.ok, status: response.status, data };
}

async function getCustomers(baseUrl: string, auth: string, params: any): Promise<IXCCustomer[]> {
  const form: Record<string, string> = {};
  if (params.page) form.page = String(params.page);
  if (params.limit) form.rp = String(params.limit);
  if (params.orderBy) form.sortname = params.orderBy;
  if (params.order) form.sortorder = params.order;

  const { ok, status, data } = await postIXC(`${baseUrl}/cliente`, auth, form);
  console.log('Resposta completa da API IXC (getCustomers):', JSON.stringify(data, null, 2));

  if (!ok) {
    throw new Error(`Erro ao buscar clientes: ${status} - ${data?.message ?? 'Erro desconhecido'}`);
  }

  // Muitas instalações retornam { page, total, registros } sem "type"
  if (data && data.registros) {
    return normalizeRegistros(data.registros);
  }
  if (data && data.data) return data.data;
  console.log('Estrutura de dados não reconhecida:', data);
  return [];
}

async function getCustomer(baseUrl: string, auth: string, customerId: string): Promise<IXCCustomer | null> {
  const form: Record<string, string> = {
    qtype: 'cliente.id',
    query: String(customerId),
    oper: '=',
    page: '1',
    rp: '1',
  };

  const { ok, status, data } = await postIXC(`${baseUrl}/cliente`, auth, form);
  console.log('Resposta completa da API IXC (getCustomer):', JSON.stringify(data, null, 2));

  if (!ok) {
    if (status === 404) return null;
    throw new Error(`Erro ao buscar cliente: ${status} - ${data?.message ?? 'Erro desconhecido'}`);
  }

  if (data && data.registros) {
    const arr = normalizeRegistros(data.registros);
    return arr.length ? arr[0] : null;
  }
  if (data.registro) return data.registro;
  if (data.data) return Array.isArray(data.data) ? (data.data[0] ?? null) : data.data;
  return null;
}

async function searchCustomers(baseUrl: string, auth: string, query: string): Promise<IXCCustomer[]> {
  // Normaliza a busca e tenta múltiplas estratégias compatíveis com diferentes instalações IXC
  const q = query.trim().replace(/\s+/g, ' ');

  const attempts: Array<{ qtype: string; oper: string; sortname: string; q: string }> = [
    { qtype: 'razao',          oper: 'like',   sortname: 'razao',          q: `%${q}%` },
    { qtype: 'cliente.razao',  oper: 'like',   sortname: 'cliente.razao',  q: `%${q}%` },
    { qtype: 'nome_fantasia',  oper: 'like',   sortname: 'nome_fantasia',  q: `%${q}%` },
    { qtype: 'fantasia',       oper: 'like',   sortname: 'fantasia',       q: `%${q}%` },
    { qtype: 'cnpj_cpf',       oper: 'like',   sortname: 'razao',          q: `%${q}%` },
  ];

  for (const attempt of attempts) {
    try {
      const form: Record<string, string> = {
        qtype: attempt.qtype,
        query: attempt.q,
        oper: attempt.oper,
        page: '1',
        rp: '50',
        sortname: attempt.sortname,
        sortorder: 'asc',
      };

      const { ok, data } = await postIXC(`${baseUrl}/cliente`, auth, form);
      if (ok && data && (data.registros || data.data)) {
        const registros = data.registros ? normalizeRegistros(data.registros) : data.data;
        if (Array.isArray(registros)) {
          console.log(`searchCustomers: tentativa bem-sucedida (${attempt.qtype}) com ${registros.length} resultados`);
          return registros as IXCCustomer[];
        }
      }
    } catch (e) {
      console.warn(`searchCustomers: tentativa falhou (${attempt.qtype}):`, (e as Error)?.message);
      // Continua para a próxima tentativa
    }
  }

  // Fallback: carrega um lote e filtra localmente (evita erro HTML do IXC ao usar qtype inválido)
  try {
    const lote = await getCustomers(baseUrl, auth, { limit: 200, page: 1, orderBy: 'razao', order: 'asc' });
    const qLower = q.toLowerCase();
    const filtrados = (lote || []).filter((c) =>
      [c.razao, c.nome_fantasia, c.cnpj_cpf]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(qLower))
    );
    console.log(`searchCustomers: fallback local retornou ${filtrados.length} resultados`);
    return filtrados;
  } catch (e) {
    console.error('searchCustomers: fallback também falhou:', (e as Error)?.message);
    throw new Error('Não foi possível realizar a busca no IXC');
  }
}

async function testConnection(baseUrl: string, auth: string): Promise<{ status: string; message: string }> {
  try {
    const { ok, status, data } = await postIXC(`${baseUrl}/cliente`, auth, { rp: '1', page: '1' });
    console.log('Resposta completa da API IXC (testConnection):', JSON.stringify(data, null, 2));
    if (ok) {
      return { status: 'success', message: 'Conexão com IXC ERP estabelecida com sucesso!' };
    }
    return { status: 'error', message: `Erro na conexão: ${status} - ${data?.message ?? 'Erro desconhecido'}` };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return { status: 'error', message: `Erro na conexão: ${errorMessage}` };
  }
}
