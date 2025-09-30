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
      
      case 'createContract':
        if (!params.customerId || !params.contractData) {
          throw new Error('ID do cliente e dados do contrato são obrigatórios');
        }
        result = await createContract(baseUrl, auth, params.customerId, params.contractData);
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
    const errorDetails = (error as any)?.details;
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage,
      details: errorDetails
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function postIXC(url: string, auth: string, params: Record<string, string>): Promise<any> {
  const { ixcsoft: ixcsoftParam, ...rest } = params || ({} as any);
  const ixcsoftHeader = (typeof ixcsoftParam === 'string' && ixcsoftParam) ? ixcsoftParam : 'listar';
  const body = new URLSearchParams(rest as Record<string, string>);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'ixcsoft': ixcsoftHeader,
    },
    body,
  });

  const rawText = await response.text();

  if (!response.ok) {
    console.error(`HTTP ${response.status}:`, rawText);
    const err: any = new Error(`Erro HTTP ${response.status}`);
    err.details = { status: response.status, rawText, url, ixcsoft: ixcsoftHeader, form: Object.fromEntries(body as any) };
    throw err;
  }

  // Verifica se retornou HTML de erro do IXC
  if (rawText.includes('<div') && rawText.includes('Ocorreu um erro ao processar')) {
    console.error('IXC retornou erro HTML:', rawText);
    const err: any = new Error('Erro interno do IXC - parâmetros inválidos ou endpoint não suportado');
    err.details = { rawText, url, ixcsoft: ixcsoftHeader, form: Object.fromEntries(body as any) };
    throw err;
  }

  let data: any;
  try {
    data = JSON.parse(rawText);
  } catch (_e) {
    console.error('Resposta não é JSON válido:', rawText);
    const err: any = new Error('Resposta inválida da API IXC');
    err.details = { rawText, url, ixcsoft: ixcsoftHeader, form: Object.fromEntries(body as any) };
    throw err;
  }
  return { ok: response.ok, status: response.status, data, rawText, ixcsoft: ixcsoftHeader };
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
    const cleanCep = customerData.cep.replace(/\D/g, '');
    
    // Validar CEP
    if (!cleanCep || cleanCep === '00000000' || !/^\d{8}$/.test(cleanCep)) {
      throw new Error(`CEP inválido: ${customerData.cep}. O CEP deve conter exatamente 8 dígitos numéricos.`);
    }

    // Enriquecer dados do CEP via ViaCEP para preencher UF automaticamente
    let ufFromCep = '';
    try {
      const viaCepResp = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      if (viaCepResp.ok) {
        const viaCep = await viaCepResp.json();
        if (!viaCep.erro && typeof viaCep.uf === 'string') {
          ufFromCep = String(viaCep.uf || '').toUpperCase();
        }
      }
    } catch (_e) {
      // Se ViaCEP falhar, seguimos sem UF (IXC pode aceitar dependendo da config)
    }
    
    // Formatar CEP com máscara 00000-000
    const formattedCep = cleanCep.replace(/(\d{5})(\d{3})/, '$1-$2');
    
    // Formatar CPF com máscara XXX.XXX.XXX-XX
    const formattedCpf = cleanCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    // Formatar CNPJ se for pessoa jurídica (XX.XXX.XXX/XXXX-XX)
    const formattedCnpj = customerData.personType === 'J' && cleanCpf.length === 14
      ? cleanCpf.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
      : '';
    
    // Converter data de nascimento para formato DD/MM/YYYY
    let formattedBirthDate = '';
    if (customerData.birthDate) {
      const dateMatch = customerData.birthDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (dateMatch) {
        formattedBirthDate = `${dateMatch[3]}/${dateMatch[2]}/${dateMatch[1]}`;
      } else {
        formattedBirthDate = customerData.birthDate;
      }
    }
    
    const documentField = customerData.personType === 'J' ? formattedCnpj : formattedCpf;
    
    console.log('📋 Dados formatados:', {
      cpf_cnpj: documentField,
      cep: formattedCep,
      data_nascimento: formattedBirthDate,
      tipo_pessoa: customerData.personType,
      ufFromCep,
    });
    
    // Campos obrigatórios conforme documentação oficial do IXC
    const payload: Record<string, string> = {
      // OBRIGATÓRIOS
      ativo: 'S',
      tipo_pessoa: customerData.personType || 'F',
      razao: customerData.name,
      cnpj_cpf: documentField, // CPF ou CNPJ com máscara
      contribuinte_icms: 'I',
      tipo_assinante: '1',
      cep: formattedCep,
      endereco: customerData.address || 'Rua Teste',
      numero: customerData.number || '1200',
      bairro: customerData.neighborhood || 'Centro',
      cidade: customerData.cityId || '5564',
      tipo_localidade: 'U',
      iss_classificacao_padrao: '00',
      
      // DADOS ADICIONAIS
      fantasia: customerData.name,
      email: customerData.email || '',
      hotsite_email: customerData.email || '',
      senha: '1234',
      telefone_celular: customerData.phone ? customerData.phone.replace(/\D/g, '') : '',
      whatsapp: customerData.phone ? customerData.phone.replace(/\D/g, '') : '',
      data_nascimento: formattedBirthDate,
      contato: customerData.name,
      
    // CONFIGURAÇÕES
    acesso_automatico_central: '2',
    participa_cobranca: 'S',
    id_tipo_cliente: '0',
    filial_id: '1',
    uf: ufFromCep || '',
    
    // COBRANÇA
    cep_cob: cleanCep,
    endereco_cob: customerData.address || 'Rua Teste',
      numero_cob: customerData.number || '1200',
      bairro_cob: customerData.neighborhood || 'Centro',
      cidade_cob: customerData.cityId || '5564',
      complemento_cob: '',
      referencia_cob: '',
      uf_cob: ufFromCep || '',
      
      // CONTATOS
      fone: customerData.phone ? customerData.phone.replace(/\D/g, '') : '',
      telefone_comercial: '',
      ramal: '',
      id_operadora_celular: '',
      website: '',
      skype: '',
      facebook: '',
      
      // FINANCEIRO
      cond_pagamento: '0',
      id_conta: '0',
      deb_automatico: '',
      deb_agencia: '',
      deb_conta: '',
      codigo_operacao: '',
      tipo_pessoa_titular_conta: '',
      cnpj_cpf_titular_conta: '',
      id_vendedor: '0',
      tabela_preco: '0',
      num_dias_cob: '0',
      
      // OUTROS
      obs: '',
      alerta: '',
      ie_identidade: '',
      complemento: '',
      referencia: '',
      id_condominio: '0',
      bloco: '',
      apartamento: '',
      latitude: '',
      longitude: '',
    };

    console.log('📤 Enviando dados do cliente para IXC:', payload);

    const { ok, data } = await postIXC(`${baseUrl}/cliente`, auth, {
      ...payload,
      ixcsoft: 'inserir'
    });

    console.log('✅ Resposta do IXC:', JSON.stringify(data, null, 2));

    if (!ok) {
      console.error('❌ Erro ao inserir cliente no IXC:', data);
      throw new Error(`Erro ao inserir cliente: ${data?.message || JSON.stringify(data)}`);
    }

    // Verificar se houve erro na resposta
    if (data?.type === 'error') {
      throw new Error(`Erro do IXC: ${data.message || 'Erro desconhecido ao criar cliente'}`);
    }

    console.log('✅ Cliente inserido no IXC com sucesso!');
    return { 
      success: true,
      message: 'Cliente inserido com sucesso',
      response: data
    };

  } catch (error) {
    console.error('Erro ao criar cliente no IXC:', error);
    throw new Error(`Erro ao criar cliente: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

async function createAtendimento(baseUrl: string, auth: string, customerId: string, atendimentoData: any): Promise<any> {
  try {
    console.log('========== CRIAR ATENDIMENTO IXC - INÍCIO ==========');
    console.log('📋 Customer ID:', customerId);
    console.log('📋 Dados recebidos:', JSON.stringify(atendimentoData, null, 2));
    
    const form: Record<string, string> = {
      // CAMPOS OBRIGATÓRIOS SEGUNDO DOCUMENTAÇÃO IXC
      tipo: 'C', // C = Cliente (obrigatório)
      id_cliente: String(customerId), // Obrigatório
      id_assunto: '25', // Obrigatório - IXC preenche automaticamente setor
      titulo: `Instalação - ${atendimentoData.planName}`, // Obrigatório
      id_ticket_setor: '3', // Obrigatório - Setor 3 para instalações (id_assunto 25)
      prioridade: 'B', // Obrigatório - B = Baixa, N = Normal, A = Alta
      menssagem: `Nova instalação do plano ${atendimentoData.planName} para ${atendimentoData.customerName}`, // Obrigatório
      su_status: 'N', // Obrigatório - N = Normal
      
      // CAMPOS ADICIONAIS
      id_filial: '1',
      origem_endereco: 'C', // C = Cliente
      
      // DESCRIÇÃO DETALHADA
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
      
      status: 'A', // A = Aberto
    };
    
    console.log('📝 Formulário montado (ANTES de enviar):');
    console.log(JSON.stringify(form, null, 2));
    console.log('📝 Campos do formulário que serão enviados:');
    for (const [key, value] of Object.entries(form)) {
      console.log(`  ${key}: ${typeof value === 'string' && value.length > 100 ? value.substring(0, 100) + '...' : value}`);
    }
    
    // Adiciona data de agendamento - usar data futura (3 dias à frente)
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 3);
    const formattedDate = futureDate.toISOString().split('T')[0]; // formato YYYY-MM-DD
    form.data_agendamento = formattedDate;
    console.log('📅 Data de agendamento adicionada (3 dias no futuro):', form.data_agendamento);
    
    const url = `${baseUrl}/su_oss_chamado`;
    console.log('🌐 URL completa da requisição:', url);
    console.log('🔐 Authorization header:', auth.substring(0, 30) + '...');
    
    const bodyParams = new URLSearchParams(form);
    console.log('📤 Body da requisição (URLSearchParams):');
    for (const [key, value] of bodyParams.entries()) {
      console.log(`  ${key}=${typeof value === 'string' && value.length > 100 ? value.substring(0, 100) + '...' : value}`);
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'ixcsoft': 'inserir',
      },
      body: bodyParams,
    });
    
    console.log('📥 Status HTTP recebido:', response.status, response.statusText);
    console.log('📥 Headers da resposta:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const text = await response.text();
      console.error('❌ Erro HTTP ao criar atendimento');
      console.error('Status:', response.status);
      console.error('Status Text:', response.statusText);
      console.error('Resposta completa:', text);
      throw new Error(`Erro ao criar atendimento: ${response.status} - ${text}`);
    }
    
    const text = await response.text();
    console.log('📥 Resposta bruta do IXC (texto completo):');
    console.log(text);
    console.log('📥 Tamanho da resposta:', text.length, 'caracteres');
    
    let data;
    try {
      data = JSON.parse(text);
      console.log('✅ JSON parseado com sucesso');
    } catch (parseError) {
      console.error('❌ ERRO ao fazer parse do JSON');
      console.error('Erro:', parseError);
      console.error('Primeiros 500 caracteres da resposta:', text.substring(0, 500));
      throw new Error(`Resposta inválida do IXC: ${text.substring(0, 200)}`);
    }
    
    console.log('📋 Resposta parseada do IXC (estrutura completa):');
    console.log(JSON.stringify(data, null, 2));
    
    // Verifica se há erro na resposta
    if (data.type === 'error') {
      console.error('❌ IXC retornou erro:', data.message);
      console.error('Detalhes completos:', JSON.stringify(data, null, 2));
      throw new Error(`IXC: ${data.message}`);
    }
    
    if (data.type === 'success') {
      console.log('✅ IXC confirmou sucesso:', data.message);
    }
    
    // Tenta extrair o ID de diferentes estruturas possíveis
    let atendimentoId = null;
    
    console.log('🔍 Tentando extrair ID do atendimento...');
    console.log('  data.id:', data.id);
    console.log('  data.registro?.id:', data.registro?.id);
    console.log('  data.data?.id:', data.data?.id);
    console.log('  data.registros[0]?.id:', data.registros?.[0]?.id);
    console.log('  data.id_atendimento:', data.id_atendimento);
    
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
    
    console.log('✅ ID final extraído:', atendimentoId);
    
    if (!atendimentoId && data.type !== 'success') {
      console.warn('⚠️ ID do atendimento não encontrado e sem confirmação de sucesso do IXC');
    }
    
    console.log('========== CRIAR ATENDIMENTO IXC - FIM ==========');
    
    return { ...data, id: atendimentoId };
    
  } catch (error) {
    console.error('========== ERRO NA CRIAÇÃO DO ATENDIMENTO ==========');
    console.error('Tipo do erro:', error?.constructor?.name);
    console.error('Mensagem:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack);
    }
    console.error('========== FIM DO ERRO ==========');
    throw new Error(`Erro ao criar atendimento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

async function createContract(baseUrl: string, auth: string, customerId: string, contractData: any): Promise<any> {
  try {
    console.log('📝 Criando contrato no IXC para cliente:', customerId, contractData);
    
    // Data atual no formato DD/MM/YYYY
    const today = new Date();
    const formattedDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
    
    // Campos obrigatórios conforme documentação IXC
    const payload: Record<string, string> = {
      // OBRIGATÓRIOS BÁSICOS
      tipo: 'I', // I = Internet
      id_cliente: String(customerId),
      id_vd_contrato: String(contractData.planId), // ID do plano (ixc_plan_id da tabela plans)
      contrato: contractData.planName || 'Plano Internet',
      id_tipo_contrato: '10', // Tipo de contrato padrão
      id_modelo: '1', // Modelo de contrato padrão
      id_filial: '1', // Filial padrão
      data: formattedDate, // Data do contrato
      
      // DOCUMENTOS E COBRANÇA
      id_tipo_documento: '502', // Tipo de documento padrão
      id_carteira_cobranca: '1', // Carteira de cobrança padrão
      id_vendedor: '1', // Vendedor padrão
      cc_previsao: 'M', // M = Mensal
      tipo_cobranca: 'P', // P = Padrão
      renovacao_automatica: 'S', // S = Sim
      base_geracao_tipo_doc: 'P', // P = Padrão
      
      // BLOQUEIO E AVISOS
      bloqueio_automatico: 'S', // S = Sim
      aviso_atraso: 'S', // S = Sim
      
      // ENDEREÇO
      endereco_padrao_cliente: 'S', // S = Usar endereço do cliente
      
      // CAMPOS OPCIONAIS (podem ser vazios)
      descricao_aux_plano_venda: '',
      assinatura_digital: '',
      integracao_assinatura_digital: '',
      liberacao_bloqueio_manual: '',
      indicacao_contrato_id: '',
      data_assinatura: '',
      data_ativacao: '',
      data_renovacao: '',
      pago_ate_data: '',
      status: '',
      status_internet: '',
      status_velocidade: '',
      tipo_produtos_plano: '',
      motivo_inclusao: '',
      id_indexador_reajuste: '',
      url_assinatura_digital: '',
      token_assinatura_digital: '',
      comissao: '',
      gerar_finan_assin_digital_contrato: '',
      id_contrato_principal: '',
      num_parcelas_atraso: '',
      nf_info_adicionais: '',
      credit_card_recorrente_bandeira_cartao: '',
      credit_card_recorrente_token: '',
      ids_contratos_recorrencia: '',
      tipo_doc_opc: '',
      tipo_doc_opc2: '',
      tipo_doc_opc3: '',
      tipo_doc_opc4: '',
      id_tipo_doc_ativ: '',
      id_produto_ativ: '',
      taxa_instalacao: '',
      id_cond_pag_ativ: '',
      id_responsavel: '',
      id_vendedor_ativ: '',
      ativacao_numero_parcelas: '',
      ativacao_vencimentos: '',
      ativacao_valor_parcela: '',
      fidelidade: '',
      data_expiracao: '',
      desconto_fidelidade: '',
      id_instalador: '',
      taxa_improdutiva: '',
      venc_personalizado: '',
      com_entrada: '',
      dia_fixo_vencimento: '',
      tipo_condicao_pag: '',
      nao_bloquear_ate: '',
      nao_avisar_ate: '',
      desbloqueio_confianca: '',
      desbloqueio_confianca_ativo: '',
      restricao_auto_desbloqueio: '',
      obs: '',
      nao_susp_parc_ate: '',
      liberacao_suspensao_parcial: '',
      utilizando_auto_libera_susp_parc: '',
      restricao_auto_libera_susp_parcial: '',
      motivo_restri_auto_libera_parc: '',
      contrato_suspenso: '',
      data_inicial_suspensao: '',
      data_final_suspensao: '',
      data_acesso_desativado: '',
      id_responsavel_cancelamento: '',
      motivo_cancelamento: '',
      obs_cancelamento: '',
      data_negativacao: '',
      id_responsavel_negativacao: '',
      protocolo_negativacao: '',
      id_motivo_negativacao: '',
      obs_negativacao: '',
      data_desistencia: '',
      id_responsavel_desistencia: '',
      motivo_desistencia: '',
      obs_desistencia: '',
      obs_contrato: '',
      alerta_contrato: '',
      dt_ult_bloq_auto: '',
      dt_ult_bloq_manual: '',
      dt_ult_finan_atraso: '',
      dt_ult_des_bloq_conf: '',
      dt_ult_liberacao_susp_parc: '',
      dt_ult_ativacao: '',
      dt_utl_negativacao: '',
      dt_ult_desiste: '',
      data_cadastro_sistema: '',
      ultima_atualizacao: '',
      data_retomada_contrato: '',
      id_condominio: '',
      condominio_novo: '',
      bloco: '',
      bloco_novo: '',
      apartamento: '',
      apartamento_novo: '',
      cep: '',
      cep_novo: '',
      endereco: '',
      endereco_novo: '',
      numero: '',
      numero_novo: '',
      bairro: '',
      bairro_novo: '',
      cidade: '',
      cidade_novo: '',
      complemento: '',
      complemento_novo: '',
      referencia: '',
      referencia_novo: '',
      latitude: '',
      latitude_novo: '',
      longitude: '',
      longitude_novo: '',
      avalista_1: '',
      avalista_2: '',
      testemunha_assinatura_digital: '',
      document_photo: '',
      selfie_photo: '',
    };

    console.log('📤 Enviando dados do contrato para IXC:', {
      id_cliente: payload.id_cliente,
      id_vd_contrato: payload.id_vd_contrato,
      contrato: payload.contrato,
      data: payload.data,
    });

    const { ok, data } = await postIXC(`${baseUrl}/cliente_contrato`, auth, {
      ...payload,
      ixcsoft: 'inserir'
    });

    console.log('✅ Resposta do IXC (criar contrato):', JSON.stringify(data, null, 2));

    if (!ok) {
      console.error('❌ Erro ao inserir contrato no IXC:', data);
      throw new Error(`Erro ao inserir contrato: ${data?.message || JSON.stringify(data)}`);
    }

    // Verificar se houve erro na resposta
    if (data?.type === 'error') {
      throw new Error(`Erro do IXC: ${data.message || 'Erro desconhecido ao criar contrato'}`);
    }

    console.log('✅ Contrato inserido no IXC com sucesso!');
    return { 
      success: true,
      message: 'Contrato inserido com sucesso',
      contractId: data.id || data.get_id,
      response: data
    };

  } catch (error) {
    console.error('Erro ao criar contrato no IXC:', error);
    throw new Error(`Erro ao criar contrato: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}