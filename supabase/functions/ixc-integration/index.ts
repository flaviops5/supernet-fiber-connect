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
      
      case 'createCustomer':
        if (!params.customerData) {
          throw new Error('Dados do cliente são obrigatórios');
        }
        result = await createCustomer(baseUrl, auth, params.customerData);
        break;
      
      case 'createAtendimento':
        if (!params.customerId || !params.atendimentoData) {
          throw new Error('ID do cliente e dados do atendimento são obrigatórios');
        }
        result = await createAtendimento(baseUrl, auth, params.customerId, params.atendimentoData);
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
  
  // Remove pontos e traços para buscar CPF/CNPJ
  const cleanNumber = raw.replace(/[.\-\/]/g, '');
  const isCpfCnpj = /^\d{11,14}$/.test(cleanNumber);
  
  // Baseado na documentação: usar "L" para operador LIKE (contém), "=" para igualdade exata
  const attempts: Array<{ qtype: string; oper: string; sortname: string; q: string }> = [];
  
  // Se for CPF/CNPJ, tenta buscar primeiro por igualdade exata (com formatação)
  if (isCpfCnpj) {
    // Formata CPF: 000.000.000-00 ou CNPJ: 00.000.000/0000-00
    let formatted = cleanNumber;
    if (cleanNumber.length === 11) {
      formatted = cleanNumber.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (cleanNumber.length === 14) {
      formatted = cleanNumber.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    
    attempts.push(
      { qtype: 'cliente.cnpj_cpf', oper: '=', sortname: 'cliente.razao', q: formatted },
      { qtype: 'cnpj_cpf',         oper: '=', sortname: 'razao',         q: formatted },
      { qtype: 'cliente.cnpj_cpf', oper: 'L', sortname: 'cliente.razao', q: cleanNumber },
      { qtype: 'cnpj_cpf',         oper: 'L', sortname: 'razao',         q: cleanNumber },
    );
  }
  
  // Tenta buscar por nome
  attempts.push(
    { qtype: 'cliente.razao',      oper: 'L',   sortname: 'cliente.razao',      q },
    { qtype: 'cliente.fantasia',   oper: 'L',   sortname: 'cliente.fantasia',   q },
    { qtype: 'razao',              oper: 'L',   sortname: 'razao',              q },
    { qtype: 'fantasia',           oper: 'L',   sortname: 'fantasia',           q },
  );

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
    
    // Busca contratos do cliente usando grid_param para melhor precisão
    let contracts: any[] = [];
    console.log('Buscando contratos do cliente...');
    
    try {
      // Método recomendado: usar grid_param com id_cliente
      const form: Record<string, string> = {
        qtype: 'cliente_contrato.id',
        query: '1',
        oper: '>=',
        page: '1',
        rp: '1000',
        sortname: 'cliente_contrato.id',
        sortorder: 'desc',
        grid_param: JSON.stringify([{
          TB: 'cliente_contrato.id_cliente',
          OP: '=',
          P: String(customerId)
        }])
      };
      
      const { ok, data } = await postIXC(`${baseUrl}/cliente_contrato`, auth, form);
      if (ok && data?.registros) {
        const regs = Array.isArray(data.registros) ? data.registros : Object.values(data.registros || {});
        contracts = regs;
        console.log(`Contratos encontrados: ${contracts.length}`);
        
        // Para cada contrato, buscar produtos/serviços vinculados
        for (const contract of contracts) {
          try {
            console.log(`Buscando produtos do contrato ${contract.id}...`);
            const productsForm: Record<string, string> = {
              qtype: 'su_oss_chamado.id',
              query: '1',
              oper: '>=',
              page: '1',
              rp: '100',
              sortname: 'su_oss_chamado.id',
              sortorder: 'desc',
              grid_param: JSON.stringify([{
                TB: 'su_oss_chamado.id_cliente_contrato',
                OP: '=',
                P: String(contract.id)
              }])
            };
            
            const { ok: prodOk, data: prodData } = await postIXC(`${baseUrl}/su_oss_chamado`, auth, productsForm);
            if (prodOk && prodData?.registros) {
              const products = Array.isArray(prodData.registros) ? prodData.registros : Object.values(prodData.registros || {});
              contract.produtos = products;
              console.log(`✅ ${products.length} produto(s) encontrado(s) para contrato ${contract.id}`);
            } else {
              contract.produtos = [];
            }
          } catch (e) {
            console.error(`Erro ao buscar produtos do contrato ${contract.id}:`, (e as Error)?.message);
            contract.produtos = [];
          }
        }
      }
    } catch (e) {
      console.error('Erro ao buscar contratos:', (e as Error)?.message);
    }
    if (!contracts.length) {
      console.log('Nenhum contrato encontrado após múltiplas tentativas');
    }
    
    // Verifica status ONLINE usando o endpoint /radusuarios DIRETAMENTE pelo id_cliente
    let onlineStatus = false;
    let lastConnection = null;
    let pppoeLogin = null;
    
    try {
      console.log('Verificando status online via /radusuarios usando id_cliente...');
      
      // Buscar DIRETAMENTE no radusuarios usando o id_cliente
      try {
        const formOnline: Record<string, string> = {
          qtype: 'radusuarios.id',
          query: '1',
          oper: '>=',
          page: '1',
          rp: '100',
          grid_param: JSON.stringify([
            {
              TB: 'radusuarios.id_cliente',
              OP: '=',
              P: String(customerId)
            },
            {
              TB: 'radusuarios.online',
              OP: '=',
              P: 'S'
            }
          ])
        };
        
        const { ok, data, status: httpStatus } = await postIXC(`${baseUrl}/radusuarios`, auth, formOnline);
        console.log(`Buscando radusuarios para id_cliente ${customerId}: HTTP ${httpStatus}`);
        
        if (ok && data?.registros) {
          const users = Array.isArray(data.registros) ? data.registros : Object.values(data.registros || {});
          console.log(`✓ /radusuarios retornou ${users.length} registros online para id_cliente ${customerId}`);
          
          if (users.length > 0) {
            // Encontrou usuário online!
            const onlineUser = users[0];
            console.log('✓✓ CLIENTE ONLINE ENCONTRADO:', JSON.stringify(onlineUser, null, 2));
            
            onlineStatus = true;
            lastConnection = onlineUser.data_inicio || onlineUser.acctstarttime || onlineUser.data_conexao || new Date().toISOString();
            pppoeLogin = onlineUser.login || onlineUser.usuario || onlineUser.username || null;
            
            console.log(`✓✓✓ Cliente ONLINE confirmado! ID Cliente: ${customerId}, Login PPPoE: ${pppoeLogin}, Última conexão: ${lastConnection}`);
          }
        }
      } catch (e) {
        console.log(`✗ Erro ao buscar status online por id_cliente:`, (e as Error)?.message);
      }
      
      // Se não estiver online, buscar histórico de conexões
      if (!onlineStatus) {
        console.log('Cliente não está online, buscando histórico de conexões...');
        try {
          const formHistory: Record<string, string> = {
            qtype: 'radusuarios.id',
            query: '1',
            oper: '>=',
            page: '1',
            rp: '5',
            sortname: 'radusuarios.data_inicio',
            sortorder: 'desc',
            grid_param: JSON.stringify([{
              TB: 'radusuarios.id_cliente',
              OP: '=',
              P: String(customerId)
            }])
          };
          
          const { ok, data } = await postIXC(`${baseUrl}/radusuarios`, auth, formHistory);
          if (ok && data?.registros) {
            const history = Array.isArray(data.registros) ? data.registros : Object.values(data.registros || {});
            if (history.length > 0) {
              lastConnection = history[0].data_inicio || history[0].acctstarttime || history[0].data_conexao || null;
              pppoeLogin = history[0].login || history[0].usuario || history[0].username || null;
              console.log(`Última conexão encontrada no histórico: ${lastConnection}, Login PPPoE: ${pppoeLogin}`);
            }
          }
        } catch (e) {
          console.log(`Erro ao buscar histórico:`, (e as Error)?.message);
        }
      }

    } catch (radiusError) {
      console.warn('Erro ao verificar status online:', radiusError);
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

    // Classificação do status de serviço baseada nos contratos
    // Regras:
    // - BLOQUEADO: não está online e contrato indica bloqueio (CA/CM/BLOQ/BLOQUEADO/BL) ou acesso desativado
    // - FINANCEIRO EM ATRASO: indicadores de atraso/suspensão parcial (FA, redução de velocidade, janela de suspensão, vencimento em atraso)
    // - ATIVO: caso contrário
    const now = new Date();

    const isBlocked = contracts.some((c: any) => {
      const si = String(c.status_internet ?? '').toUpperCase();
      const accessDisabled = c.data_acesso_desativado && c.data_acesso_desativado !== '0000-00-00';
      const autoBlockedActive = !!c.dt_ult_bloq_auto && (
        !c.dt_ult_desbloq_auto && !c.dt_ult_des_bloq_conf ||
        new Date(c.dt_ult_bloq_auto) >= new Date(c.dt_ult_des_bloq_conf || '1900-01-01')
      );
      const blockedByCode = ['CA','CM','BLOQ','BLOQUEADO','BL'].includes(si);
      // Considera bloqueado apenas se não estiver online (evita falso positivo como no caso do Thiago)
      return !onlineStatus && (blockedByCode || accessDisabled || autoBlockedActive);
    });

    const hasFinancialDelay = contracts.some((c: any) => {
      const si = String(c.status_internet ?? '').toUpperCase();
      const statusVelocidade = String(c.status_velocidade ?? '').toUpperCase();
      
      // Verifica se pago_ate_data está no passado (inadimplente)
      const pagoAte = c.pago_ate_data && c.pago_ate_data !== '0000-00-00' ? new Date(c.pago_ate_data) : null;
      const isOverdue = pagoAte && pagoAte < now;
      
      // Suspensão só é válida se for recente (últimos 30 dias) e sem data final
      const suspensionDate = c.data_inicial_suspensao && c.data_inicial_suspensao !== '0000-00-00' 
        ? new Date(c.data_inicial_suspensao) 
        : null;
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const hasRecentSuspension = suspensionDate && 
        suspensionDate > thirtyDaysAgo && 
        (!c.data_final_suspensao || c.data_final_suspensao === '0000-00-00');
      
      // Atraso financeiro só é válido se for recente (últimos 30 dias) OU se estiver inadimplente
      const atrasoDate = c.dt_ult_finan_atraso && c.dt_ult_finan_atraso !== '0000-00-00'
        ? new Date(c.dt_ult_finan_atraso)
        : null;
      const hasRecentAtraso = atrasoDate && (atrasoDate > thirtyDaysAgo || isOverdue);
      
      // Indicadores de atraso financeiro:
      // - FA: status explícito de financeiro em atraso
      // - R: velocidade reduzida (punição por atraso)
      // - Suspensão recente (últimos 30 dias) sem resolução
      // - Registro de atraso recente OU inadimplência confirmada por pago_ate_data
      return si === 'FA' || statusVelocidade === 'R' || hasRecentSuspension || hasRecentAtraso;
    });

    const normalizedStatus = isBlocked
      ? 'BLOQUEADO'
      : (hasFinancialDelay ? 'FINANCEIRO EM ATRASO' : 'ATIVO');

    const result = {
      isOnline: onlineStatus,
      contracts: contracts,
      lastConnection: lastConnection,
      pppoeLogin: pppoeLogin,
      contractCount: contracts.length,
      accessStatus: accessStatus, // status do cadastro do cliente (referência)
      serviceStatus: normalizedStatus, // status do serviço (baseado no contrato)
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

async function getCustomersByStatus(baseUrl: string, auth: string, params: any): Promise<any[]> {
  try {
    const status = params.status;
    const limit = params.limit || 100;
    const page = params.page || 1;
    
    console.log(`🔍 Buscando clientes com status "${status}" - Página: ${page}, Limite: ${limit}`);
    
    // Mapear status para códigos do IXC status_internet
    const statusMap: Record<string, string[]> = {
      'BLOQUEADO': ['CA', 'CM'],  // CA = Cancelado/Bloqueado, CM = Bloqueio Manual
      'FINANCEIRO EM ATRASO': ['FA'],  // FA = Financeiro em Atraso
      'SERVIÇO NORMALIZADO': ['A']  // A = Ativo
    };
    
    const statusCodes = statusMap[status];
    if (!statusCodes || statusCodes.length === 0) {
      console.log(`⚠️ Status "${status}" não mapeado, retornando vazio`);
      return [];
    }
    
    // Usar grid_param para filtrar contratos por status_internet
    const gridParam = statusCodes.length === 1
      ? [{ TB: 'cliente_contrato.status_internet', OP: '=', P: statusCodes[0] }]
      : [{ TB: 'cliente_contrato.status_internet', OP: 'IN', P: statusCodes[0], P2: statusCodes[1] }];
    
    console.log(`📋 Buscando contratos com grid_param:`, JSON.stringify(gridParam));
    
    const form: Record<string, string> = {
      qtype: 'cliente_contrato.id',
      query: '1',
      oper: '>=',
      page: String(page),
      rp: String(limit),
      sortname: 'cliente_contrato.id',
      sortorder: 'desc',
      grid_param: JSON.stringify(gridParam)
    };
    
    const { ok, data } = await postIXC(`${baseUrl}/cliente_contrato`, auth, form);
    
    if (!ok || !data?.registros) {
      console.log('❌ Nenhum contrato encontrado com o status especificado');
      return [];
    }
    
    const contracts = Array.isArray(data.registros) ? data.registros : Object.values(data.registros || {});
    console.log(`✅ Encontrados ${contracts.length} contratos com status ${status}`);
    
    // Buscar dados dos clientes para cada contrato (sem duplicatas)
    const customerIds = [...new Set(contracts.map((c: any) => c.id_cliente).filter(Boolean))];
    console.log(`👥 Buscando dados de ${customerIds.length} clientes únicos...`);
    
    const clientsWithStatus = [] as any[];
    
    for (const customerId of customerIds) {
      try {
        const customer = await getCustomer(baseUrl, auth, String(customerId));
        if (customer) {
          // Adicionar informações dos contratos ao cliente
          const customerContracts = contracts.filter((c: any) => String(c.id_cliente) === String(customerId));
          clientsWithStatus.push({
            ...customer,
            statusInfo: {
              serviceStatus: status,
              contracts: customerContracts.map((c: any) => ({
                id: c.id,
                status: c.status,
                status_internet: c.status_internet,
                contrato: c.contrato,
                pago_ate_data: c.pago_ate_data,
                dt_ult_bloq_auto: c.dt_ult_bloq_auto,
                dt_ult_des_bloq_conf: c.dt_ult_des_bloq_conf,
                situacao_financeira_contrato: c.situacao_financeira_contrato,
              })),
            },
          });
        }
      } catch (error) {
        console.error(`❌ Erro ao buscar cliente ${customerId}:`, error);
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

async function createCustomer(baseUrl: string, auth: string, customerData: any): Promise<any> {
  try {
    console.log('Criando novo cliente no IXC:', customerData);
    
    const cleanCpf = customerData.cpf.replace(/\D/g, '');
    
    const form: Record<string, string> = {
      razao: customerData.name,
      nome_fantasia: customerData.name,
      cnpj_cpf: cleanCpf,
      email: customerData.email,
      telefone_celular: customerData.phone.replace(/\D/g, ''),
      endereco: customerData.address || '',
      cep: customerData.cep.replace(/\D/g, ''),
      ativo: 'S',
      acesso_automatico_central: '2',
      participa_cobranca: 'S',
      tipo_assinante: '3', // Pessoa Física (código)
      id_tipo_cliente: '2', // Cliente Fibra
    };
    
    // Adiciona data de nascimento se fornecida
    if (customerData.birthDate) {
      form.data_nascimento = customerData.birthDate;
    }

    // Campos obrigatórios do IXC conforme especificação
    // ABA CLIENTE
    form.ativo = 'S'; // Ativo = SIM
    form.contribuinte_icms = 'N'; // Contribuinte ICMS = Não
    form.tipo_pessoa = 'F'; // Pessoa Física
    form.id_tipo_cliente = '2'; // Tipo de Cliente = Cliente Fibra (código)
    
    
    // ABA Endereço
    const rawAddress: string = customerData.address || '';
    const bairroMatch = rawAddress.match(/Bairro\s+([^-,]+)/i);
    const parsedBairro = customerData.neighborhood || (bairroMatch ? bairroMatch[1].trim() : 'Centro');
    const parsedStreet = customerData.street || (rawAddress.split(',')[0] || '').trim();

    if (parsedStreet) {
      form.endereco = parsedStreet;
    }
    form.numero = '0'; // Número = sempre 0
    form.bairro = parsedBairro;
    form.cidade = '5564'; // Cidade = sempre código 5564
    form.tipo_localidade = 'U'; // Tipo de localidade = Zona Urbana
    form.iss_classificacao_padrao = '99';

    console.log('Enviando dados para criar cliente:', form);
    
    const response = await fetch(`${baseUrl}/cliente`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'ixcsoft': 'inserir',
      },
      body: new URLSearchParams(form),
    });
    
    if (!response.ok) {
      const text = await response.text();
      console.error(`Erro ao criar cliente - HTTP ${response.status}:`, text);
      throw new Error(`Erro ao criar cliente: ${response.status} - ${text}`);
    }
    
    const text = await response.text();
    console.log('Resposta bruta do IXC (createCustomer):', text);
    
    // Aguarda um momento para o IXC processar
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Agora busca o cliente recém-criado pelo CPF para obter o ID
    console.log('Buscando cliente recém-criado pelo CPF:', cleanCpf);
    
    try {
      const customers = await searchCustomers(baseUrl, auth, cleanCpf);
      
      if (customers && customers.length > 0) {
        const customer = customers[0];
        console.log('Cliente encontrado após criação:', customer);
        return { 
          success: true,
          id: customer.id,
          customer: customer
        };
      }
      
      // Se não encontrou pela busca, tenta busca direta
      console.log('Tentando busca direta no grid do IXC...');
      const formSearch: Record<string, string> = {
        qtype: 'cliente.cnpj_cpf',
        query: cleanCpf,
        oper: '=',
        page: '1',
        rp: '1',
      };
      
      const { ok, data } = await postIXC(`${baseUrl}/cliente`, auth, formSearch);
      if (ok && data?.registros) {
        const registros = Array.isArray(data.registros) ? data.registros : Object.values(data.registros || {});
        if (registros.length > 0) {
          const customer = registros[0];
          console.log('Cliente encontrado por busca direta:', customer);
          return {
            success: true,
            id: customer.id,
            customer: customer
          };
        }
      }
      
      throw new Error('Cliente criado mas não foi possível recuperar o ID. Verifique manualmente no IXC.');
    } catch (searchError) {
      console.error('Erro ao buscar cliente após criação:', searchError);
      throw new Error('Cliente criado mas não foi possível recuperar o ID. Verifique manualmente no IXC.');
    }
    
  } catch (error) {
    console.error('Erro ao criar cliente no IXC:', error);
    throw new Error(`Erro ao criar cliente: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

async function createAtendimento(baseUrl: string, auth: string, customerId: string, atendimentoData: any): Promise<any> {
  try {
    console.log('Criando atendimento no IXC:', { customerId, atendimentoData });
    
    const form: Record<string, string> = {
      id_cliente: String(customerId),
      id_tipo_problema: '1', // Tipo: Instalação/Novo Cliente
      assunto: `Instalação - ${atendimentoData.planName}`,
      descricao: `
DADOS DO CLIENTE:
- Nome: ${atendimentoData.customerName}
- CPF: ${atendimentoData.cpf}
- Email: ${atendimentoData.email}
- Telefone: ${atendimentoData.phone}
- Endereço: ${atendimentoData.address}
- CEP: ${atendimentoData.cep}

PLANO CONTRATADO:
- Plano: ${atendimentoData.planName}
- Velocidade: ${atendimentoData.planSpeed}
- Valor: R$ ${atendimentoData.planPrice}
- Dia de vencimento: ${atendimentoData.paymentDay}

AGENDAMENTO:
- Data: ${new Date(atendimentoData.installationDate).toLocaleDateString('pt-BR')}
- Período: ${atendimentoData.installationPeriod}
      `.trim(),
      status: 'A', // Aberto
      prioridade: 'N', // Normal
      id_setor_responsavel: '1', // Setor de instalação
    };
    
    // Adiciona data de agendamento se fornecida
    if (atendimentoData.installationDate) {
      form.data_agendamento = atendimentoData.installationDate;
    }
    
    const response = await fetch(`${baseUrl}/su_oss_chamado`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'ixcsoft': 'inserir',
      },
      body: new URLSearchParams(form),
    });
    
    if (!response.ok) {
      const text = await response.text();
      console.error(`Erro ao criar atendimento - HTTP ${response.status}:`, text);
      throw new Error(`Erro ao criar atendimento: ${response.status} - ${text}`);
    }
    
    const text = await response.text();
    console.log('Resposta bruta do IXC (createAtendimento):', text);
    
    const data = JSON.parse(text);
    console.log('Resposta parseada do IXC:', JSON.stringify(data, null, 2));
    
    // Tenta extrair o ID de diferentes estruturas possíveis
    let atendimentoId = null;
    
    if (data.id) {
      atendimentoId = data.id;
    } else if (data.registro?.id) {
      atendimentoId = data.registro.id;
    } else if (data.data?.id) {
      atendimentoId = data.data.id;
    } else if (data.registros && Array.isArray(data.registros) && data.registros[0]?.id) {
      atendimentoId = data.registros[0].id;
    } else if (data.type === 'success' && data.id) {
      atendimentoId = data.id;
    } else if (data.id_atendimento) {
      atendimentoId = data.id_atendimento;
    }
    
    console.log('ID do atendimento extraído:', atendimentoId);
    
    if (!atendimentoId) {
      console.warn('ID do atendimento não encontrado, mas criação pode ter sido bem-sucedida');
    }
    
    return { ...data, id: atendimentoId };
    
  } catch (error) {
    console.error('Erro ao criar atendimento no IXC:', error);
    throw new Error(`Erro ao criar atendimento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}