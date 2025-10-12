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

// Configurações
const IXC_API_BASE_URL = Deno.env.get('IXC_API_BASE_URL') || '';
const IXC_API_USERNAME = Deno.env.get('IXC_API_USERNAME') || '';
const IXC_API_PASSWORD = Deno.env.get('IXC_API_PASSWORD') || '';
const IXC_TIMEOUT_MS = 8000;
const IXC_RETRY_ATTEMPTS = 2;

// Função utilitária de timeout
async function fetchWithTimeout(url: string, options: RequestInit, timeout = IXC_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } finally {
    clearTimeout(timer);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('📥 Buscando assuntos do IXC...');

  try {
    // Validar variáveis de ambiente
    if (!IXC_API_BASE_URL || !IXC_API_USERNAME || !IXC_API_PASSWORD) {
      throw new Error('Variáveis de ambiente IXC não configuradas (IXC_API_BASE_URL, IXC_API_USERNAME, IXC_API_PASSWORD)');
    }

    // Payload para buscar assuntos
    const payload = {
      qtype: 'su_oss_assunto.id',
      query: '*',
      oper: 'like',
      page: '1',
      rp: '100',
      sortname: 'su_oss_assunto.assunto',
      sortorder: 'asc'
    };

    // Headers exigidos pelo IXC para listagens
    const headers = {
      'ixcsoft': 'listar',
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + btoa(`${IXC_API_USERNAME}:${IXC_API_PASSWORD}`)
    };

    const options: RequestInit = {
      method: 'POST',
      headers,
      body: new URLSearchParams(payload as Record<string, string>)
    };

    // Normalizar base URL removendo /adm.php
    const cleanBaseUrl = IXC_API_BASE_URL.replace(/\/adm\.php$/, '');
    
    // URL completa
    const url = `${cleanBaseUrl}/webservice/v1/su_oss_assunto`;
    console.log('📡 URL construída:', url);

    // Tentativas com retry
    let attempt = 0;
    let lastError: any = null;

    while (attempt <= IXC_RETRY_ATTEMPTS) {
      attempt++;
      try {
        console.log(`🔄 Tentativa ${attempt}/${IXC_RETRY_ATTEMPTS + 1}...`);
        
        const res = await fetchWithTimeout(url, options);
        const contentType = res.headers.get('content-type') || '';
        const body = await res.text();

        console.log('📦 Status:', res.status, '| Content-Type:', contentType);
        console.log('📄 Body snippet:', body.slice(0, 200));

        // Validar content-type (alguns IXC usam text/x-json)
        if (!contentType.toLowerCase().includes('json')) {
          console.error('⚠️ IXC retornou conteúdo não JSON:', { status: res.status, contentType });
          throw new Error('IXC retornou HTML ou outro conteúdo inválido — verifique credenciais e URL');
        }

        // Parse JSON
        let parsed: any;
        try {
          parsed = JSON.parse(body);
        } catch (e) {
          console.error('❌ Falha ao interpretar JSON:', e);
          throw new Error('IXC retornou JSON inválido');
        }

        console.log('✅ JSON parseado com sucesso');

        // Extrair registros
        const registrosRaw = parsed?.registros || parsed?.result || [];
        const registrosArr: IXCSubject[] = Array.isArray(registrosRaw)
          ? registrosRaw
          : Object.values(registrosRaw || {});

        console.log(`📊 Encontrados ${registrosArr.length} assuntos (antes do filtro)`);

        // Filtrar apenas assuntos ativos
        const subjects = registrosArr
          .filter((s: IXCSubject) => {
            const v = (s.ativo || '').toString().trim().toLowerCase();
            return v === 'sim' || v === 's' || v === '1' || v === 'ativo' || v === 'a';
          })
          .map((s: IXCSubject) => ({ id: s.id, nome: s.assunto }));

        console.log(`✅ ${subjects.length} assuntos ativos retornados`);

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

      } catch (err) {
        lastError = err;
        console.warn(`⚠️ Tentativa ${attempt} falhou:`, err.message);
        if (attempt > IXC_RETRY_ATTEMPTS) break;
        await new Promise((r) => setTimeout(r, 300 * attempt));
      }
    }

    // Falha após todas as tentativas
    throw new Error(`Falha ao contatar IXC após ${IXC_RETRY_ATTEMPTS + 1} tentativa(s): ${lastError?.message}`);

  } catch (error) {
    console.error('❌ Erro ao buscar assuntos:', error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({
        success: false,
        error: message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
