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
    const { planIds } = await req.json();
    
    if (!Array.isArray(planIds) || planIds.length === 0) {
      throw new Error('planIds deve ser um array com pelo menos um ID');
    }

    console.log(`Sincronizando planos IXC: ${planIds.join(', ')}`);

    // Inicializar Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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

    // Normalizar URL removendo /adm.php e protocol duplicado
    const cleanBaseUrl = IXC_API_BASE.replace(/\/adm\.php$/, '').replace(/^https?:\/\//, '');
    const auth = btoa(`${ixcUsername}:${ixcPassword}`);
    const baseUrl = `https://${cleanBaseUrl}/webservice/v1`;

    // Buscar TODOS os planos do IXC com paginação
    console.log('🔄 Iniciando busca paginada de planos...');
    let allRegistros: any[] = [];
    let currentPage = 1;
    let totalPages = 1;

    do {
      const body = new URLSearchParams({
        page: String(currentPage),
        rp: '100', // 100 registros por página
        sortname: 'radgrupos.grupo',
        sortorder: 'asc',
      });

      const response = await fetch(`${baseUrl}/radgrupos`, {
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
        console.error('Resposta não-JSON do IXC:', text);
        throw new Error('Resposta inválida do IXC');
      }

      if (!response.ok) {
        console.error(`IXC HTTP ${response.status}:`, text);
        throw new Error(data?.message || `HTTP ${response.status}`);
      }

      // Extrair registros da página atual
      const pageRegistros = Array.isArray(data?.registros)
        ? data.registros
        : (data?.registros ? Object.values(data.registros) : []);

      if (pageRegistros.length > 0) {
        allRegistros = allRegistros.concat(pageRegistros);
        console.log(`📄 Página ${currentPage}: ${pageRegistros.length} planos carregados (Total: ${allRegistros.length})`);
      }

      // Calcular total de páginas
      const total = Number(data?.total || 0);
      const rp = 100;
      totalPages = Math.ceil(total / rp);

      currentPage++;
    } while (currentPage <= totalPages);

    console.log(`✅ Total de ${allRegistros.length} planos carregados do IXC`);

    if (allRegistros.length === 0) {
      throw new Error('Nenhum plano encontrado no IXC');
    }

    const registros = allRegistros;

    console.log(`Total de ${registros.length} planos no IXC`);
    console.log('Primeiros 5 IDs:', registros.slice(0, 5).map((r: any) => ({ id: r.id, tipo: typeof r.id, nome: r.grupo })));
    console.log('IDs buscados:', planIds);

    // Filtrar pelos IDs solicitados - tentar múltiplos formatos
    const plansToSync = registros.filter((r: any) => {
      const rid = r.id;
      return planIds.includes(Number(rid)) || 
             planIds.includes(String(rid)) || 
             planIds.some(pid => String(pid) === String(rid));
    });

    console.log(`Encontrados ${plansToSync.length} planos para sincronizar`);
    
    if (plansToSync.length === 0) {
      // Mostrar todos os IDs disponíveis para debug
      const allIds = registros.slice(0, 20).map((r: any) => r.id);
      throw new Error(`Nenhum dos planos solicitados (${planIds.join(', ')}) foi encontrado no IXC. IDs disponíveis (primeiros 20): ${allIds.join(', ')}`);
    }

    console.log(`Encontrados ${plansToSync.length} planos para sincronizar`);

    // Sincronizar cada plano
    const syncResults = [];
    
    for (const ixcPlan of plansToSync) {
      const ixcId = String(ixcPlan.id);
      const name = ixcPlan.grupo || ixcPlan.nome || `Plano ${ixcId}`;
      const download = ixcPlan.download || '0';
      const upload = ixcPlan.upload || '0';
      const price = ixcPlan.valor_produto || ixcPlan.valor || 0;

      // Formatar velocidade
      const speed = download && upload 
        ? `${download}/${upload} Mbps`
        : download 
          ? `${download} Mbps`
          : 'N/A';

      // Verificar se já existe
      const { data: existing } = await supabase
        .from('plans')
        .select('id')
        .eq('ixc_plan_id', ixcId)
        .single();

      const planData = {
        name,
        speed,
        price: Number(price),
        ixc_plan_id: ixcId,
        description: `Plano de ${speed}`,
        active: true,
        features: JSON.stringify([
          `${download} Mbps de download`,
          `${upload} Mbps de upload`,
          'Fibra óptica',
          'Suporte 24/7'
        ]),
      };

      if (existing) {
        // Atualizar plano existente
        const { error } = await supabase
          .from('plans')
          .update(planData)
          .eq('id', existing.id);

        if (error) {
          console.error(`Erro ao atualizar plano ${ixcId}:`, error);
          syncResults.push({ ixcId, status: 'error', error: error.message });
        } else {
          console.log(`✓ Plano ${ixcId} atualizado`);
          syncResults.push({ ixcId, status: 'updated', name });
        }
      } else {
        // Criar novo plano
        const { error } = await supabase
          .from('plans')
          .insert(planData);

        if (error) {
          console.error(`Erro ao criar plano ${ixcId}:`, error);
          syncResults.push({ ixcId, status: 'error', error: error.message });
        } else {
          console.log(`✓ Plano ${ixcId} criado`);
          syncResults.push({ ixcId, status: 'created', name });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        results: syncResults,
        synced: syncResults.filter(r => r.status !== 'error').length,
        errors: syncResults.filter(r => r.status === 'error').length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );

  } catch (error) {
    console.error('Erro ao sincronizar planos:', error);
    const msg = (error as Error)?.message || 'Erro desconhecido';
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  }
});
