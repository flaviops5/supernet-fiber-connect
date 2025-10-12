import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callIxcWithRetry } from "../_shared/ixc-client.ts";

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
    console.log('📋 Listando assuntos do IXC via proxy...');

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    if (!SUPABASE_URL) {
      throw new Error('SUPABASE_URL não configurado');
    }

    const proxyUrl = `${SUPABASE_URL}/functions/v1/ixc-proxy`;

    // Parâmetros de listagem baseados no exemplo fornecido
    const body = {
      qtype: 'su_oss_assunto.id',
      query: '1',
      oper: '>=',
      page: '1',
      rp: '1000',
      sortname: 'su_oss_assunto.id',
      sortorder: 'desc',
    };

    console.log('📤 Chamando proxy com body:', JSON.stringify(body));

    // Chamar IXC via proxy usando ixc-client
    const response = await callIxcWithRetry(
      proxyUrl,
      'POST',
      '/webservice/v1/su_oss_assunto',
      body
    );

    console.log('📥 Resposta do proxy:', JSON.stringify(response).slice(0, 200));

    if (!response.ok || !response.data) {
      throw new Error(response.error || 'Erro ao buscar assuntos no IXC');
    }

    const data = response.data;

    // Extrair registros
    const registros: IXCSubject[] = Array.isArray(data?.registros)
      ? data.registros
      : (data?.registros ? Object.values(data.registros) : []);

    console.log(`📄 Total de assuntos: ${registros.length}`);

    // Filtrar apenas assuntos ativos (ativo === 'Sim' ou 'S')
    const activeSubjects = registros
      .filter((subject: IXCSubject) => subject.ativo === 'Sim' || subject.ativo === 'S')
      .map((subject: IXCSubject) => ({
        id: subject.id,
        nome: subject.assunto
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome));

    console.log(`✅ ${activeSubjects.length} assuntos ativos encontrados`);

    return new Response(
      JSON.stringify({
        success: true,
        data: activeSubjects,
        total: activeSubjects.length,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      },
    );

  } catch (error) {
    console.error('❌ Erro ao listar assuntos:', error);
    const msg = (error as Error)?.message || 'Erro desconhecido';
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      },
    );
  }
});
