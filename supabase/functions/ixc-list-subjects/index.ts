import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    console.log('📋 Listando assuntos do IXC...');

    // Credenciais IXC
    const ixcUsername = Deno.env.get('IXC_API_USERNAME');
    const ixcPassword = Deno.env.get('IXC_API_PASSWORD');
    const IXC_API_BASE = Deno.env.get('IXC_API_BASE_URL');

    if (!ixcUsername || !ixcPassword) {
      throw new Error('Credenciais IXC não configuradas');
    }

    if (!IXC_API_BASE) {
      throw new Error('IXC_API_BASE_URL não configurado');
    }

    // Normalizar URL removendo /adm.php
    const cleanBaseUrl = IXC_API_BASE.replace(/\/adm\.php$/, '').replace(/^https?:\/\//, '');
    const auth = btoa(`${ixcUsername}:${ixcPassword}`);
    const baseUrl = `https://${cleanBaseUrl}/webservice/v1`;

    // Buscar assuntos do IXC
    const body = new URLSearchParams({
      qtype: 'su_oss_assunto.assunto',
      query: '',
      oper: 'listar',
      page: '1',
      rp: '100',
      sortname: 'su_oss_assunto.assunto',
      sortorder: 'asc',
    });

    const response = await fetch(`${baseUrl}/su_oss_assunto`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'ixcsoft': 'listar',
      },
      body,
    });

    const text = await response.text();
    let data: any;
    
    try {
      data = JSON.parse(text);
    } catch {
      console.error('❌ Resposta não-JSON do IXC:', text.slice(0, 200));
      throw new Error('Resposta inválida do IXC');
    }

    if (!response.ok) {
      console.error(`❌ IXC HTTP ${response.status}:`, text.slice(0, 200));
      throw new Error(data?.message || `HTTP ${response.status}`);
    }

    // Extrair registros
    const registros: IXCSubject[] = Array.isArray(data?.registros)
      ? data.registros
      : (data?.registros ? Object.values(data.registros) : []);

    console.log(`📄 Total de assuntos: ${registros.length}`);

    // Filtrar apenas assuntos ativos
    const activeSubjects = registros
      .filter((subject: IXCSubject) => subject.ativo === 'Sim')
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
