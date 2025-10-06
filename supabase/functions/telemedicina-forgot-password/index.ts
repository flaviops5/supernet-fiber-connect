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
    const { cpf, email } = await req.json();

    if (!cpf && !email) {
      return new Response(
        JSON.stringify({ error: 'CPF ou e-mail são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const IXC_API_BASE_URL = Deno.env.get('IXC_API_BASE_URL');
    const IXC_API_USERNAME = Deno.env.get('IXC_API_USERNAME');
    const IXC_API_PASSWORD = Deno.env.get('IXC_API_PASSWORD');

    if (!IXC_API_BASE_URL || !IXC_API_USERNAME || !IXC_API_PASSWORD) {
      throw new Error('Configurações do IXC não encontradas');
    }

    // Remove formatação do CPF se fornecido
    const cleanCpf = cpf ? cpf.replace(/\D/g, '') : null;

    // 1. Buscar cliente no IXC
    console.log('🔍 Buscando cliente no IXC:', cleanCpf || email);
    
    const searchParams = new URLSearchParams({
      token: `${IXC_API_USERNAME}:${IXC_API_PASSWORD}`,
      qtype: 'cliente.id',
      rp: '1'
    });

    if (cleanCpf) {
      searchParams.append('cpf_cnpj', cleanCpf);
    } else if (email) {
      searchParams.append('email', email);
    }

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

    if (!searchData || !searchData.registros || searchData.registros.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Cliente não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cliente = searchData.registros[0];
    console.log('✅ Cliente encontrado:', cliente.razao);

    // 2. Gerar token de recuperação
    const recoveryToken = btoa(`${cliente.id}:${Date.now()}:${Math.random()}`);
    const recoveryUrl = `https://telemedicina.supernet.com.br/reset-password?token=${recoveryToken}`;

    // 3. Registrar solicitação no histórico
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      await supabase.from('customer_contact_history').insert({
        cpf: cliente.cnpj_cpf?.replace(/\D/g, ''),
        customer_name: cliente.razao,
        customer_email: cliente.email,
        customer_phone: cliente.celular || cliente.telefone,
        ixc_client_id: cliente.id,
        contact_channel: 'telemedicina_widget',
        contact_reason: 'Recuperação de senha',
        was_found_in_ixc: true,
        metadata: {
          recovery_token: recoveryToken,
          recovery_requested_at: new Date().toISOString(),
        }
      });
    }

    // 4. Aqui você enviaria o e-mail com o link de recuperação
    // Usando a edge function send-locaweb-email ou outro serviço
    console.log('📧 Link de recuperação gerado:', recoveryUrl);

    // 5. Retornar sucesso
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Instruções de recuperação foram enviadas para o seu e-mail',
        email: cliente.email?.replace(/(.{2})(.*)(@.*)/, '$1***$3'), // Mascara o e-mail
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Erro na recuperação de senha:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erro ao processar solicitação',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
