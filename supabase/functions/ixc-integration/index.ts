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
  // Campos adicionais para status de acesso
  ativo?: string;
  acesso_automatico_central?: string;
  hotsite_acesso?: string;
  status_prospeccao?: string;
  ultima_atualizacao?: string;
  participa_cobranca?: string;
  cob_envia_email?: string;
  tipo_assinante?: string;
  [key: string]: any; // Para permitir campos dinâmicos
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
      
      case 'getCustomerStatus':
        if (!params.id) {
          throw new Error('ID do cliente é obrigatório');
        }
        result = await getCustomerStatus(baseUrl, auth, params.id);
        break;
      
      case 'getOnlineClients':
        result = await getOnlineClients(baseUrl, auth, params);
        break;
      
      case 'getCustomersByStatus':
        result = await getCustomersByStatus(baseUrl, auth, params);
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

  if (!response.ok) {
    const text = await response.text();
    console.error(`HTTP ${response.status}:`, text);
    throw new Error(`Erro HTTP ${response.status}: ${text}`);
  }

  const text = await response.text();
  
  // Verifica se retornou HTML de erro do IXC
  if (text.includes('<div') && text.includes('Ocorreu um erro ao processar')) {
    console.error('IXC retornou erro HTML:', text);
    throw new Error('Erro interno do IXC - parâmetros inválidos ou endpoint não suportado');
  }

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
    const registrosArr = Array.isArray(data.registros) ? data.registros : Object.values(data.registros || {});
    const normalizedArr = normalizeRegistros(registrosArr);
    const raw = registrosArr[0];
    const norm = normalizedArr[0];
    return raw ? { ...raw, ...(norm || {}) } : (norm || null);
  }
  if (data.registro) return data.registro;
  if (data.data) return Array.isArray(data.data) ? (data.data[0] ?? null) : data.data;
  return null;
}

async function searchCustomers(baseUrl: string, auth: string, query: string): Promise<IXCCustomer[]> {
  const raw = String(query ?? '').trim();
  const q = raw.replace(/["']/g, '').replace(/\s+/g, ' ');
  
  // Baseado na documentação: usar "L" para operador LIKE (contém)
  const attempts: Array<{ qtype: string; oper: string; sortname: string; q: string }> = [
    { qtype: 'cliente.razao',      oper: 'L',   sortname: 'cliente.razao',      q },
    { qtype: 'cliente.fantasia',   oper: 'L',   sortname: 'cliente.fantasia',   q },
    { qtype: 'razao',              oper: 'L',   sortname: 'razao',              q },
    { qtype: 'fantasia',           oper: 'L',   sortname: 'fantasia',           q },
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
      if (ok && data && data.registros) {
        const registros = normalizeRegistros(data.registros);
        if (Array.isArray(registros) && registros.length > 0) {
          console.log(`searchCustomers: sucesso com ${attempt.qtype} - ${registros.length} resultados`);
          return registros as IXCCustomer[];
        }
      }
    } catch (e) {
      console.warn(`searchCustomers: tentativa ${attempt.qtype} falhou:`, (e as Error)?.message);
      // Continua para próxima tentativa
    }
  }

  // Fallback: carrega um lote e filtra localmente
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

async function getCustomerStatus(baseUrl: string, auth: string, customerId: string): Promise<any> {
  try {
    console.log(`Verificando status do cliente: ${customerId}`);
    
    // Primeiro, busca dados completos do cliente para verificar campos de status
    const customerData = await getCustomer(baseUrl, auth, customerId);
    console.log('Dados completos do cliente:', JSON.stringify(customerData, null, 2));
    
    // Busca contratos do cliente tentando múltiplos endpoints/qtypes
    const contractsEndpoints = ['/cliente_contrato', '/contratos', '/cliente_contrato_servico'];
    const contractsQtypes = ['cliente_id', 'cliente', 'id_cliente', 'cliente.id'];
    let contracts: any[] = [];
    console.log('Buscando contratos do cliente (múltiplas tentativas)...');
    for (const endpoint of contractsEndpoints) {
      if (contracts.length) break;
      for (const qtype of contractsQtypes) {
        try {
          const form: Record<string, string> = {
            qtype,
            query: String(customerId),
            oper: '=',
            page: '1',
            rp: '50',
          };
          const { ok, data } = await postIXC(`${baseUrl}${endpoint}`, auth, form);
          if (ok && data?.registros) {
            const regs = Array.isArray(data.registros) ? data.registros : Object.values(data.registros || {});
            if (regs.length) {
              contracts = regs;
              console.log(`Contratos encontrados via ${endpoint} com qtype ${qtype}: ${contracts.length}`);
              break;
            }
          }
        } catch (e) {
          console.log(`Tentativa ${endpoint} (${qtype}) falhou:`, (e as Error)?.message);
          continue;
        }
      }
    }
    if (!contracts.length) {
      console.log('Nenhum contrato encontrado após múltiplas tentativas');
    }
    
    // Tenta verificar sessões ativas usando endpoints alternativos
    let onlineStatus = false;
    let lastConnection = null;
    
    try {
      console.log('Tentando buscar logs de radius...');
      const radiusEndpoints = ['/radius_acct', '/radius_log', '/sessao_radius', '/conexao'];

      // 1) Se tivermos contratos, tenta por username/login do contrato
      const candidateUsernames = new Set<string>();
      for (const c of contracts) {
        for (const [key, value] of Object.entries(c || {})) {
          const k = key.toLowerCase();
          if (['login','usuario','username','pppoe_login','login_pppoe','nome_login','user'].some(s => k.includes(s))) {
            if (value) candidateUsernames.add(String(value));
          }
        }
      }

      const radiusQtypes = ['username','login','usuario','user','acctusername'];
      outer_loop:
      for (const user of candidateUsernames) {
        for (const endpoint of radiusEndpoints) {
          for (const qtype of radiusQtypes) {
            try {
              const form: Record<string, string> = {
                qtype,
                query: user,
                oper: '=',
                page: '1',
                rp: '5',
                sortname: 'data_inicio',
                sortorder: 'desc',
              };
              const { ok, data } = await postIXC(`${baseUrl}${endpoint}`, auth, form);
              if (ok && data?.registros) {
                const logs = Array.isArray(data.registros) ? data.registros : Object.values(data.registros || {});
                console.log(`Radius ${endpoint} por ${qtype}=${user}: ${logs.length} logs`);
                if (logs.length > 0) {
                  const latestLog = logs[0];
                  lastConnection = latestLog.data_inicio || latestLog.data_conexao || latestLog.acctstarttime || null;
                  onlineStatus = logs.some((log: any) => !log.data_fim && !log.acctstoptime);
                  console.log(`Online (username) via ${endpoint}: ${onlineStatus}`);
                  break outer_loop;
                }
              }
            } catch (_e) { /* tenta próxima combinação */ }
          }
        }
      }

      // 2) Caso não tenha encontrado por username, tenta por cliente_id (fallback)
      if (!onlineStatus) {
        const radiusFormCliente: Record<string, string> = {
          qtype: 'cliente_id',
          query: String(customerId),
          oper: '=',
          page: '1',
          rp: '5',
          sortname: 'data_inicio',
          sortorder: 'desc',
        };

        for (const endpoint of radiusEndpoints) {
          try {
            const { ok: radiusOk, data: radiusData } = await postIXC(`${baseUrl}${endpoint}`, auth, radiusFormCliente);
            if (radiusOk && radiusData?.registros) {
              const logs = Array.isArray(radiusData.registros) ? radiusData.registros : Object.values(radiusData.registros || {});
              console.log(`Endpoint ${endpoint} (cliente_id): ${logs.length} logs`);
              if (logs.length > 0) {
                const latestLog = logs[0];
                lastConnection = latestLog.data_inicio || latestLog.data_conexao || latestLog.acctstarttime || null;
                onlineStatus = logs.some((log: any) => !log.data_fim && !log.acctstoptime);
                console.log(`Online (cliente_id) via ${endpoint}: ${onlineStatus}`);
                break;
              }
            }
          } catch (_e) { continue; }
        }
      }
    } catch (radiusError) {
      console.warn('Erro geral ao buscar logs de radius:', radiusError);
    }

    // Procura especificamente pelo campo "STATUS DE ACESSO" e campos relacionados
    let accessStatus = null;
    let statusDeAcesso = null;
    
    if (customerData) {
      // Primeiro, procura por campos que podem conter o "STATUS DE ACESSO"
      // Campos possíveis: status_acesso, situacao, status, ativo, etc.
      const possibleStatusFields = [
        'status_acesso', 'STATUS_ACESSO', 'status_de_acesso',
        'situacao', 'SITUACAO', 'situacao_cliente',
        'status_cliente', 'status_contrato', 'status_servico',
        'status_financeiro', 'situacao_financeira'
      ];
      
      for (const field of possibleStatusFields) {
        if (customerData[field] !== undefined && customerData[field] !== null) {
          statusDeAcesso = customerData[field];
          console.log(`Campo ${field} encontrado com valor:`, statusDeAcesso);
          break;
        }
      }
      
      // Se não encontrou um campo específico, tenta interpretar com base nos campos disponíveis
      if (!statusDeAcesso) {
        // Verifica se cliente está ativo
        if (customerData.ativo === 'S') {
          // Cliente ativo, mas precisa verificar situação financeira
          if (customerData.participa_cobranca === 'S') {
            statusDeAcesso = 'ATIVO';
          }
        } else if (customerData.ativo === 'N') {
          statusDeAcesso = 'BLOQUEADO';
        }
      }
      
      accessStatus = {
        statusDeAcesso: statusDeAcesso,
        ativo: customerData.ativo,
        acesso_automatico_central: customerData.acesso_automatico_central,
        hotsite_acesso: customerData.hotsite_acesso,
        status_prospeccao: customerData.status_prospeccao,
        ultima_atualizacao: customerData.ultima_atualizacao,
        participa_cobranca: customerData.participa_cobranca,
        cob_envia_email: customerData.cob_envia_email,
        tipo_assinante: customerData.tipo_assinante,
        // Log todos os campos para debug
        allFields: Object.keys(customerData).filter(key => 
          key.toLowerCase().includes('status') || 
          key.toLowerCase().includes('situacao') ||
          key.toLowerCase().includes('ativo')
        ).reduce((obj: any, key) => {
          obj[key] = customerData[key];
          return obj;
        }, {})
      };
      
      console.log('Status de acesso completo encontrado:', accessStatus);
      console.log('Todos os campos do cliente:', Object.keys(customerData));
    }

    const result = {
      isOnline: onlineStatus,
      contracts: contracts,
      lastConnection: lastConnection,
      contractCount: contracts.length,
      accessStatus: accessStatus,
      activeContracts: contracts.filter((c: any) => 
        c.status === 'Ativo' || 
        c.ativo === '1' || 
        c.ativo === 'S' || 
        c.situacao === 'A'
      )
    };
    
    console.log('Resultado final do status:', result);
    return result;
    
  } catch (error) {
    console.error('Erro ao verificar status do cliente:', error);
    throw new Error(`Erro ao verificar status: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

async function getOnlineClients(baseUrl: string, auth: string, params: any): Promise<any[]> {
  try {
    console.log('Iniciando busca por clientes online...');
    
    // Estratégia alternativa: buscar clientes ativos e verificar contratos ativos
    const clientsForm: Record<string, string> = {
      qtype: 'ativo',
      query: 'S',
      oper: '=',
      page: String(params.page || 1),
      rp: String(params.limit || 30),
      sortname: 'ultima_atualizacao',
      sortorder: 'desc',
    };

    console.log('Buscando clientes ativos...');
    const { ok: clientsOk, data: clientsData } = await postIXC(`${baseUrl}/cliente`, auth, clientsForm);
    
    if (!clientsOk || !clientsData?.registros) {
      console.log('Nenhum cliente ativo encontrado');
      return [];
    }

    const activeClients = Array.isArray(clientsData.registros) ? clientsData.registros : Object.values(clientsData.registros || {});
    console.log(`Encontrados ${activeClients.length} clientes ativos`);
    
    const onlineClients = [];
    
    // Para cada cliente ativo, verifica se tem contratos ativos (indicando possível conexão)
    for (const client of activeClients.slice(0, 15)) { // Limita para não sobrecarregar
      try {
        // Busca contratos do cliente
        const contractsForm: Record<string, string> = {
          qtype: 'cliente_id',
          query: String(client.id),
          oper: '=',
          page: '1',
          rp: '10',
        };
        
        const { ok: contractsOk, data: contractsData } = await postIXC(`${baseUrl}/contratos`, auth, contractsForm);
        
        if (contractsOk && contractsData?.registros) {
          const contracts = Array.isArray(contractsData.registros) ? contractsData.registros : Object.values(contractsData.registros || {});
          const activeContracts = contracts.filter((c: any) => 
            c.status === 'Ativo' || 
            c.ativo === '1' || 
            c.ativo === 'S' || 
            c.situacao === 'A'
          );
          
          if (activeContracts.length > 0) {
            // Normaliza os dados do cliente
            const normalizedClient = {
              id: String(client.id ?? ''),
              razao: String(client.razao ?? client.nome ?? ''),
              nome_fantasia: client.nome_fantasia ?? client.fantasia ?? undefined,
              cnpj_cpf: String(client.cnpj_cpf ?? client.cnpj ?? client.cpf ?? ''),
              email: client.email ?? client.hotsite_email ?? undefined,
              telefone_comercial: client.telefone_comercial ?? undefined,
              telefone_celular: client.telefone_celular ?? client.whatsapp ?? undefined,
              endereco: client.endereco ?? undefined,
              numero: client.numero ?? undefined,
              bairro: client.bairro ?? undefined,
              cidade: client.cidade ?? undefined,
              uf: client.uf ?? undefined,
              cep: client.cep ?? undefined,
              status: client.status ?? client.ativo ?? undefined,
              connectionInfo: {
                contractsCount: activeContracts.length,
                lastUpdate: client.ultima_atualizacao,
                clientStatus: client.ativo === 'S' ? 'Ativo' : 'Inativo'
              }
            };
            
            onlineClients.push(normalizedClient);
          }
        }
      } catch (clientError) {
        console.warn(`Erro ao verificar contratos do cliente ${client.id}:`, clientError);
      }
    }
    
    console.log(`Encontrados ${onlineClients.length} clientes com contratos ativos`);
    return onlineClients;
    
  } catch (error) {
    console.error('Erro ao buscar clientes online:', error);
    throw new Error(`Erro ao buscar clientes online: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

async function getCustomersByStatus(baseUrl: string, auth: string, params: any): Promise<IXCCustomer[]> {
  try {
    const status = params.status;
    const limit = params.limit || 100;
    const page = params.page || 1;
    
    console.log(`🔍 Buscando clientes com status "${status}" - Página: ${page}, Limite: ${limit}`);
    
    // Buscar todos os clientes primeiro
    const customersData = await getCustomers(baseUrl, auth, { limit, page });
    
    if (!customersData || !Array.isArray(customersData)) {
      return [];
    }

    // Filtrar clientes por status
    const clientsWithStatus = [];
    
    for (const customer of customersData) {
      try {
        // Verificar status de cada cliente
        const statusData = await getCustomerStatus(baseUrl, auth, customer.id);
        
        if (statusData?.accessStatus?.statusDeAcesso === status) {
          clientsWithStatus.push({
            ...customer,
            statusInfo: statusData.accessStatus
          });
        }
      } catch (error) {
        console.error(`Erro ao verificar status do cliente ${customer.id}:`, error);
      }
    }

    console.log(`✅ Encontrados ${clientsWithStatus.length} clientes com status "${status}"`);
    return clientsWithStatus;
    
  } catch (error) {
    console.error('Erro ao buscar clientes por status:', error);
    throw new Error(`Erro ao buscar clientes por status: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
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