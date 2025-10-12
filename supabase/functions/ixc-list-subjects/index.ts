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
    console.log('🔍 Buscando assuntos do IXC...');

    const IXC_BASE_URL = Deno.env.get('IXC_API_BASE_URL');
    const IXC_USERNAME = Deno.env.get('IXC_API_USERNAME');
    const IXC_PASSWORD = Deno.env.get('IXC_API_PASSWORD');

    if (!IXC_BASE_URL || !IXC_USERNAME || !IXC_PASSWORD) {
      throw new Error('Credenciais do IXC não configuradas');
    }

    // Buscar assuntos do IXC usando o mesmo padrão das outras funções
    console.log('📡 Buscando assuntos do IXC...');

    const ixcUrl = `${IXC_BASE_URL}/webservice/v1/su_oss_assunto`;
    const authHeader = 'Basic ' + btoa(`${IXC_USERNAME}:${IXC_PASSWORD}`);

    const body = new URLSearchParams({
      qtype: 'su_oss_assunto.id',
      query: '*',
      oper: 'like',
      page: '1',
      rp: '100',
      sortname: 'su_oss_assunto.assunto',
      sortorder: 'asc'
    });

    const response = await fetch(ixcUrl, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
        'ixcsoft': 'listar',
      },
      body,
    });

    const rawText = await response.text();

    // Validação extra do content-type
    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      console.warn('⚠️ IXC retornou content-type inesperado:', contentType);
      console.error('❌ Resposta não JSON do IXC:', rawText.slice(0, 500));
    }

    if (!response.ok) {
      console.error(`❌ HTTP ${response.status}:`, rawText.slice(0, 500));
      throw new Error(`Erro HTTP ${response.status}`);
    }

    // Verifica se retornou HTML de erro
    if (rawText.includes('<div') && rawText.includes('Ocorreu um erro')) {
      console.error('❌ IXC retornou erro HTML:', rawText.slice(0, 500));
      throw new Error('Erro interno do IXC - endpoint pode não existir ou parâmetros inválidos');
    }

    let data: any;
    try {
      data = JSON.parse(rawText);
    } catch (e) {
      console.error('❌ Resposta não é JSON válido:', rawText.slice(0, 500));
      throw new Error('A resposta da API IXC não é JSON válido. Verifique autenticação e endpoint.');
    }
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
