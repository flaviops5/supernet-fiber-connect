import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createAuthenticatedHandler } from "../_shared/base-handler.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface IXCPlanRecord {
  id: string | number;
  grupo?: string;
  nome?: string;
  download?: string;
  upload?: string;
  valor_produto?: string | number;
  valor?: string | number;
}

interface IXCApiResponse {
  registros?: IXCPlanRecord[] | Record<string, IXCPlanRecord>;
  total?: number;
  message?: string;
}

// P0 FIX: Convertido para createAuthenticatedHandler
// Sincronização de planos é operação administrativa crítica
Deno.serve(createAuthenticatedHandler(
  'ixc-sync-plans',
  async (req, { supabase, user }) => {
    const requestBody = await req.json();
    console.log('📦 Body recebido:', JSON.stringify(requestBody));
    
    const { planIds } = requestBody;
    
    if (!planIds) {
      throw new Error('planIds é obrigatório no body da requisição');
    }
    
    if (!Array.isArray(planIds)) {
      throw new Error(`planIds deve ser um array, recebido: ${typeof planIds}`);
    }
    
    if (planIds.length === 0) {
      throw new Error('planIds não pode ser um array vazio');
    }

    console.log(`✅ Sincronizando ${planIds.length} planos IXC: ${planIds.join(', ')}`);

    // Supabase client já injetado via context

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
    let allRegistros: IXCPlanRecord[] = [];
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
      let data: IXCApiResponse;
      
      try {
        data = JSON.parse(text) as IXCApiResponse;
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
        .maybeSingle();

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

    const hasErrors = syncResults.some(r => r.status === 'error');

    return {
      success: !hasErrors,
      results: syncResults,
      synced: syncResults.filter(r => r.status !== 'error').length,
      errors: syncResults.filter(r => r.status === 'error').length,
    };
  }
));
