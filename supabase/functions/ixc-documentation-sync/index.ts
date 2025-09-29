import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DocumentationEntry {
  endpoint: string;
  method: string;
  title: string;
  description?: string;
  parameters?: any[];
  request_body?: any;
  response_example?: any;
  content?: string;
  category: string;
  tags?: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, url } = await req.json();

    if (action === 'syncDocumentation') {
      const result = await syncDocumentation(supabaseClient, url);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'getDocumentation') {
      const result = await getDocumentation(supabaseClient);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error(`Ação não suportada: ${action}`);

  } catch (error) {
    console.error('Erro na função de documentação IXC:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function syncDocumentation(supabaseClient: any, documentationUrl: string) {
  try {
    // Buscar conteúdo da documentação
    const response = await fetch(documentationUrl);
    const html = await response.text();
    
    // Processar o conteúdo HTML para extrair endpoints
    const entries = parseDocumentationContent(html);
    
    console.log(`Processados ${entries.length} endpoints da documentação`);

    // Limpar documentação existente
    await supabaseClient
      .from('ixc_documentation')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    // Inserir nova documentação
    const { data, error } = await supabaseClient
      .from('ixc_documentation')
      .insert(entries);

    if (error) {
      console.error('Erro ao inserir documentação:', error);
      throw error;
    }

    return {
      success: true,
      message: `Documentação sincronizada com sucesso! ${entries.length} endpoints processados.`,
      count: entries.length
    };

  } catch (error) {
    console.error('Erro ao sincronizar documentação:', error);
    throw error;
  }
}

async function getDocumentation(supabaseClient: any) {
  try {
    const { data, error } = await supabaseClient
      .from('ixc_documentation')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('endpoint', { ascending: true });

    if (error) throw error;

    return {
      success: true,
      data: data || []
    };

  } catch (error) {
    console.error('Erro ao buscar documentação:', error);
    throw error;
  }
}

function parseDocumentationContent(content: string): DocumentationEntry[] {
  const entries: DocumentationEntry[] = [];
  
  // Lista de endpoints conhecidos do IXC baseados na documentação
  const knownEndpoints = [
    {
      endpoint: '/cliente',
      method: 'POST',
      title: 'Listar Clientes',
      description: 'Lista todos os clientes cadastrados no sistema',
      category: 'clientes',
      tags: ['cliente', 'listagem'],
      parameters: [
        { name: 'page', type: 'string', description: 'Número da página' },
        { name: 'rp', type: 'string', description: 'Registros por página' },
        { name: 'sortname', type: 'string', description: 'Campo para ordenação' },
        { name: 'sortorder', type: 'string', description: 'Ordem: asc ou desc' },
        { name: 'qtype', type: 'string', description: 'Tipo de consulta (ex: cliente.razao)' },
        { name: 'query', type: 'string', description: 'Valor para busca' },
        { name: 'oper', type: 'string', description: 'Operador: = (igual), L (like)' }
      ],
      request_body: {
        page: "1",
        rp: "50",
        sortname: "cliente.razao",
        sortorder: "asc"
      },
      response_example: {
        page: "1",
        total: 1555,
        registros: [
          {
            id: "2119",
            razao: "Nome do Cliente",
            fantasia: "Nome Fantasia",
            cnpj_cpf: "000.000.000-00",
            email: "cliente@email.com",
            telefone_celular: "(11) 99999-9999",
            endereco: "Endereço do cliente",
            cidade: "1234",
            uf: "SP",
            cep: "00000-000"
          }
        ]
      }
    },
    {
      endpoint: '/contas_receber',
      method: 'POST',
      title: 'Contas a Receber',
      description: 'Lista as contas a receber do sistema',
      category: 'financeiro',
      tags: ['contas', 'receber', 'financeiro'],
      parameters: [
        { name: 'page', type: 'string', description: 'Número da página' },
        { name: 'rp', type: 'string', description: 'Registros por página' },
        { name: 'cliente_id', type: 'string', description: 'ID do cliente' }
      ]
    },
    {
      endpoint: '/planos',
      method: 'POST',
      title: 'Listar Planos',
      description: 'Lista todos os planos de serviço disponíveis',
      category: 'planos',
      tags: ['planos', 'serviços'],
      parameters: [
        { name: 'page', type: 'string', description: 'Número da página' },
        { name: 'rp', type: 'string', description: 'Registros por página' }
      ]
    },
    {
      endpoint: '/contratos',
      method: 'POST',
      title: 'Listar Contratos',
      description: 'Lista todos os contratos ativos e inativos',
      category: 'contratos',
      tags: ['contratos', 'serviços'],
      parameters: [
        { name: 'page', type: 'string', description: 'Número da página' },
        { name: 'rp', type: 'string', description: 'Registros por página' },
        { name: 'cliente_id', type: 'string', description: 'ID do cliente' }
      ]
    },
    {
      endpoint: '/caixa',
      method: 'POST',
      title: 'Movimentações do Caixa',
      description: 'Lista as movimentações financeiras do caixa',
      category: 'financeiro',
      tags: ['caixa', 'financeiro', 'movimentações'],
      parameters: [
        { name: 'page', type: 'string', description: 'Número da página' },
        { name: 'rp', type: 'string', description: 'Registros por página' },
        { name: 'data_inicio', type: 'date', description: 'Data inicial' },
        { name: 'data_fim', type: 'date', description: 'Data final' }
      ]
    }
  ];

  // Adicionar endpoints conhecidos
  knownEndpoints.forEach(endpoint => {
    entries.push({
      endpoint: endpoint.endpoint,
      method: endpoint.method,
      title: endpoint.title,
      description: endpoint.description,
      parameters: endpoint.parameters || [],
      request_body: endpoint.request_body || {},
      response_example: endpoint.response_example || {},
      content: `# ${endpoint.title}\n\n${endpoint.description}`,
      category: endpoint.category,
      tags: endpoint.tags || []
    });
  });

  return entries;
}