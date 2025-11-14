import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createPublicHandlerWithRateLimit } from '../_shared/base-handler.ts';

Deno.serve(createPublicHandlerWithRateLimit(
  'telemedicina-forgot-password', 
  async (req, { supabase }) => {
  const { cpf, email } = await req.json();

  if (!cpf && !email) {
    throw new Error('CPF ou e-mail são obrigatórios');
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
    throw new Error('Cliente não encontrado');
  }

  const cliente = searchData.registros[0];
  console.log('✅ Cliente encontrado:', cliente.razao);

  // 2. Gerar token de recuperação
  const recoveryToken = btoa(`${cliente.id}:${Date.now()}:${Math.random()}`);
  const recoveryUrl = `https://lovable.dev/projects/2cf5ae9f-dc50-45cd-be95-157396f6dc10/telemedicina?recovery_token=${recoveryToken}&customer_id=${cliente.id}`;

  // 3. Registrar solicitação no histórico
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

  // 4. Enviar e-mail de recuperação via Locaweb
  console.log('📧 Enviando e-mail de recuperação...');
  
  const emailResponse = await supabase.functions.invoke('send-locaweb-email', {
    body: {
      to: cliente.email,
      template_slug: 'telemedicina-password-recovery',
      variables: {
        customer_name: cliente.razao,
        recovery_url: recoveryUrl,
        customer_cpf: cleanCpf || 'Não informado'
      }
    }
  });

  if (emailResponse.error) {
    console.error('❌ Erro ao enviar e-mail:', emailResponse.error);
  } else {
    console.log('✅ E-mail de recuperação enviado com sucesso');
  }

  // 5. Retornar sucesso
  return {
    success: true,
    message: 'Instruções de recuperação foram enviadas para o seu e-mail',
    email: cliente.email?.replace(/(.{2})(.*)(@.*)/, '$1***$3'), // Mascara o e-mail
  };
}));
