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
  if (Array.isArray(input)) return input as IXCCustomer[];
  if (typeof input === 'object') return Object.values(input) as IXCCustomer[];
  return [];
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

  if (data.type === 'success' && data.registros) {
    return normalizeRegistros(data.registros);
  }
  if (data.data) return data.data;
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

  if (data.type === 'success' && data.registros) {
    const arr = normalizeRegistros(data.registros);
    return arr.length ? arr[0] : null;
  }
  if (data.registro) return data.registro;
  if (data.data) return Array.isArray(data.data) ? (data.data[0] ?? null) : data.data;
  return null;
}

async function searchCustomers(baseUrl: string, auth: string, query: string): Promise<IXCCustomer[]> {
  const form: Record<string, string> = {
    qtype: 'cliente.razao',
    query,
    oper: 'like',
    page: '1',
    rp: '50',
    sortname: 'cliente.razao',
    sortorder: 'asc',
  };

  const { ok, status, data } = await postIXC(`${baseUrl}/cliente`, auth, form);
  console.log('Resposta completa da API IXC (searchCustomers):', JSON.stringify(data, null, 2));

  if (!ok) {
    throw new Error(`Erro ao buscar clientes: ${status} - ${data?.message ?? 'Erro desconhecido'}`);
  }

  if (data.type === 'success' && data.registros) {
    return normalizeRegistros(data.registros);
  }
  if (data.data) return data.data;
  console.log('Estrutura de dados não reconhecida:', data);
  return [];
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
