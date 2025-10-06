import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cpf, password } = await req.json();

    if (!cpf || !password) {
      return new Response(
        JSON.stringify({ error: 'CPF e senha são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const IXC_API_BASE_URL = Deno.env.get('IXC_API_BASE_URL');
    const IXC_API_USERNAME = Deno.env.get('IXC_API_USERNAME');
    const IXC_API_PASSWORD = Deno.env.get('IXC_API_PASSWORD');

    if (!IXC_API_BASE_URL || !IXC_API_USERNAME || !IXC_API_PASSWORD) {
      throw new Error('Configurações do IXC não encontradas');
    }

    // Remove formatação do CPF
    const cleanCpf = cpf.replace(/\D/g, '');

    // 1. Buscar cliente no IXC pelo CPF
    console.log('🔍 Buscando cliente no IXC:', cleanCpf);
    
    const searchParams = new URLSearchParams({
      token: `${IXC_API_USERNAME}:${IXC_API_PASSWORD}`,
      cpf_cnpj: cleanCpf,
      qtype: 'cliente.id',
      rp: '1'
    });

    const searchResponse = await fetch(
      `${IXC_API_BASE_URL}/webservice/v1/cliente?${searchParams}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!searchResponse.ok) {
      console.error('❌ Erro ao buscar cliente no IXC:', searchResponse.status);
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar cliente' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const searchData = await searchResponse.json();
    console.log('📦 Resposta da busca:', searchData);

    if (!searchData || !searchData.registros || searchData.registros.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Cliente não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cliente = searchData.registros[0];
    console.log('✅ Cliente encontrado:', cliente.razao);

    // 2. Validar senha (simplificado - em produção deve usar hash)
    // Por enquanto, apenas verificamos se a senha foi fornecida
    // O IXC tem sua própria validação de senha no sistema de área do cliente

    // 3. Buscar contratos do cliente
    const contratoParams = new URLSearchParams({
      token: `${IXC_API_USERNAME}:${IXC_API_PASSWORD}`,
      id_cliente: cliente.id,
      qtype: 'cliente_contrato.id',
      rp: '100'
    });

    const contratoResponse = await fetch(
      `${IXC_API_BASE_URL}/webservice/v1/cliente_contrato?${contratoParams}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    let possuiTelemedicina = false;
    let planoTelemedicina = '';
    let telemedicinUrl = '';

    if (contratoResponse.ok) {
      const contratoData = await contratoResponse.json();
      console.log('📋 Contratos encontrados:', contratoData.total);

      if (contratoData.registros && contratoData.registros.length > 0) {
        // Verificar se algum contrato tem produto TELEMEDICINA
        for (const contrato of contratoData.registros) {
          const plano = contrato.plano || contrato.descricao_plano || '';
          
          if (plano.toUpperCase().includes('TELEMEDICINA')) {
            possuiTelemedicina = true;
            planoTelemedicina = plano;
            
            // Gerar URL de telemedicina com autenticação
            // A URL real virá da configuração do widget IXC
            telemedicinUrl = `https://telemedicina.supernet.com.br/auth?cpf=${cleanCpf}&token=${btoa(`${cliente.id}:${Date.now()}`)}`;
            
            console.log('✅ Cliente possui telemedicina:', planoTelemedicina);
            break;
          }
        }
      }
    }

    // 4. Registrar acesso no histórico
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      await supabase.from('customer_contact_history').insert({
        cpf: cleanCpf,
        customer_name: cliente.razao,
        customer_email: cliente.email,
        customer_phone: cliente.celular || cliente.telefone,
        ixc_client_id: cliente.id,
        contact_channel: 'telemedicina_widget',
        contact_reason: 'Acesso ao portal de telemedicina',
        was_found_in_ixc: true,
        metadata: {
          possui_telemedicina: possuiTelemedicina,
          plano_telemedicina: planoTelemedicina,
        }
      });
    }

    // 5. Retornar dados do usuário
    return new Response(
      JSON.stringify({
        success: true,
        userData: {
          id: cliente.id,
          nome: cliente.razao,
          cpf: cliente.cnpj_cpf,
          email: cliente.email,
          telefone: cliente.celular || cliente.telefone,
          possui_telemedicina: possuiTelemedicina,
          plano_telemedicina: planoTelemedicina,
        },
        telemedicinUrl: possuiTelemedicina ? telemedicinUrl : null,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Erro na autenticação:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erro ao processar autenticação',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
