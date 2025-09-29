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

    let result = null;

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
      resultCount: Array.isArray(result) ? result.length : 1 
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

async function getCustomers(baseUrl: string, auth: string, params: any): Promise<IXCCustomer[]> {
  const queryParams = new URLSearchParams();
  
  if (params.limit) queryParams.append('rp', params.limit.toString());
  if (params.page) queryParams.append('page', params.page.toString());
  if (params.orderBy) queryParams.append('sortname', params.orderBy);
  if (params.order) queryParams.append('sortorder', params.order);
  
  const url = `${baseUrl}/cliente?${queryParams.toString()}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Erro na resposta da API IXC:', { status: response.status, error: errorText });
    throw new Error(`Erro ao buscar clientes: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('Resposta completa da API IXC (getCustomers):', JSON.stringify(data, null, 2));
  
  if (data.type === 'success' && data.registros) {
    return data.registros;
  } else if (Array.isArray(data)) {
    return data;
  } else if (data.data) {
    return data.data;
  } else {
    console.log('Estrutura de dados não reconhecida:', data);
    return [];
  }
}

async function getCustomer(baseUrl: string, auth: string, customerId: string): Promise<IXCCustomer | null> {
  const url = `${baseUrl}/cliente/${customerId}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    const errorText = await response.text();
    console.error('Erro na resposta da API IXC:', { status: response.status, error: errorText });
    throw new Error(`Erro ao buscar cliente: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  if (data.type === 'success' && data.registro) {
    return data.registro;
  } else if (data.data) {
    return data.data;
  } else {
    return data;
  }
}

async function searchCustomers(baseUrl: string, auth: string, query: string): Promise<IXCCustomer[]> {
  const queryParams = new URLSearchParams();
  queryParams.append('qtype', 'razao');
  queryParams.append('query', query);
  queryParams.append('rp', '50');
  
  const url = `${baseUrl}/cliente?${queryParams.toString()}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Erro na resposta da API IXC:', { status: response.status, error: errorText });
    throw new Error(`Erro ao buscar clientes: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('Resposta completa da API IXC (searchCustomers):', JSON.stringify(data, null, 2));
  
  if (data.type === 'success' && data.registros) {
    return data.registros;
  } else if (Array.isArray(data)) {
    return data;
  } else if (data.data) {
    return data.data;
  } else {
    console.log('Estrutura de dados não reconhecida:', data);
    return [];
  }
}

async function testConnection(baseUrl: string, auth: string): Promise<{ status: string; message: string }> {
  try {
    const url = `${baseUrl}/cliente?rp=1`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      return {
        status: 'success',
        message: 'Conexão com IXC ERP estabelecida com sucesso!'
      };
    } else {
      return {
        status: 'error',
        message: `Erro na conexão: ${response.status} - ${response.statusText}`
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return {
      status: 'error',
      message: `Erro na conexão: ${errorMessage}`
    };
  }
}