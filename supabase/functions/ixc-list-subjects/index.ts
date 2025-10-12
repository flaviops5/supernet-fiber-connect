import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IXCSubject {
  id: string;
  assunto: string;
  ativo: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 Buscando assuntos do IXC via proxy...');

    // Usar o mesmo padrão validado das outras funções (support-tech-agent, support-financial-agent)
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Configuração Supabase não encontrada');
    }

    console.log('📡 Chamando ixc-proxy...');
    const response = await fetch(`${supabaseUrl}/functions/v1/ixc-proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        method: 'GET',
        path: '/webservice/v1/su_oss_assunto',
        query: {
          qtype: 'su_oss_assunto.id',
          query: '*',
          oper: 'like',
          page: '1',
          rp: '100',
          sortname: 'su_oss_assunto.assunto',
          sortorder: 'asc'
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro do proxy:', errorText.slice(0, 500));
      throw new Error(`Erro no proxy IXC: ${response.status}`);
    }

    const proxyData = await response.json();
    console.log('📦 Resposta do proxy:', JSON.stringify(proxyData).slice(0, 300));

    if (!proxyData.ok) {
      throw new Error(`Erro do IXC: ${proxyData.error || 'Erro desconhecido'}`);
    }

    const data = proxyData.data;
    console.log(`✅ Encontrados ${data.registros?.length || 0} assuntos`);

    // Filtrar apenas assuntos ativos e formatar
    const subjects = (data.registros || [])
      .filter((s: IXCSubject) => s.ativo === 'Sim')
      .map((s: IXCSubject) => ({
        id: s.id,
        nome: s.assunto,
      }));

    return new Response(
      JSON.stringify({
        success: true,
        data: subjects,
        total: subjects.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Erro ao buscar assuntos:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
