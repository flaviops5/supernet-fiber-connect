/**
 * PR10A - Geolocalização Helper
 * Sistema inteligente de captura de cidade/bairro para KPIs regionalizados
 */

import { updateFlowState } from "./flow-state.ts";
import { logAudit } from "./audit-logger.ts";

export interface GeoData {
  cidade: string | null;
  bairro: string | null;
  source: 'cache' | 'history' | 'ixc' | 'none';
}

/**
 * Busca geolocalização com prioridade inteligente:
 * 1. Cache (flow_state.geo) - evita chamadas repetidas
 * 2. Histórico (customer_contact_history) - fonte primária confiável
 * 3. IXC API (getCustomer) - fallback quando necessário
 * 
 * @param supabaseAdmin - Cliente Supabase com permissões admin
 * @param ctx - Contexto com conversation_id e flowState
 * @param ixc_client_id - ID do cliente no IXC (opcional)
 * @param customer_phone - Telefone do cliente para busca no histórico (opcional)
 * @returns GeoData com cidade, bairro e fonte dos dados
 */
export async function ensureGeo(
  supabaseAdmin: any,
  ctx: { conversation_id: string; flowState?: any },
  ixc_client_id?: string | null,
  customer_phone?: string | null
): Promise<GeoData> {
  const { conversation_id, flowState } = ctx;

  // ✅ 1. Cache já existe? Retorna imediatamente
  if (flowState?.geo?.cidade) {
    return { ...flowState.geo, source: 'cache' };
  }

  // ✅ 2. Buscar no histórico (PRIORIDADE - 101 registros disponíveis!)
  if (customer_phone) {
    try {
      const cleanPhone = customer_phone.replace(/\D/g, '');
      const { data: history } = await supabaseAdmin
        .from('customer_contact_history')
        .select('customer_address, metadata')
        .eq('customer_phone', cleanPhone)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (history) {
        const cidade = history.metadata?.cidade || extractCityFromAddress(history.customer_address);
        const bairro = history.metadata?.bairro || null;
        
        if (cidade) {
          const geoData: GeoData = { cidade, bairro, source: 'history' };
          await saveGeoToFlowState(supabaseAdmin, ctx, geoData);
          return geoData;
        }
      }
    } catch (e) {
      console.warn('⚠️ Falha ao buscar geo do histórico:', e);
      // Não lançar erro - continuar para próxima estratégia
    }
  }

  // ✅ 3. Buscar no IXC (fallback)
  if (ixc_client_id) {
    try {
      const { data: ixcResp, error } = await supabaseAdmin.functions.invoke('ixc-proxy', {
        body: { endpoint: '/webservice/v1/cliente', qsParams: { id: ixc_client_id } }
      });

      if (!error && ixcResp?.registros) {
        const cliente = Array.isArray(ixcResp.registros) ? ixcResp.registros[0] : ixcResp.registros;
        const cidade = cliente?.cidade || null;
        const bairro = cliente?.bairro || null;

        if (cidade) {
          const geoData: GeoData = { cidade, bairro, source: 'ixc' };
          await saveGeoToFlowState(supabaseAdmin, ctx, geoData);
          return geoData;
        }
      }
    } catch (e) {
      console.error('❌ Erro ao buscar geo do IXC:', e);
      await logAudit({
        action: 'geo_ixc_error',
        conversation_id,
        fluxo: 'support-tech',
        detalhes: { error: String(e), ixc_client_id },
        supabaseClient: supabaseAdmin
      }).catch(() => {}); // Erro de logging não deve atrapalhar fluxo
    }
  }

  // Sem geo disponível
  return { cidade: null, bairro: null, source: 'none' };
}

/**
 * Salva geo no flow_state e registra auditoria
 */
async function saveGeoToFlowState(
  supabaseAdmin: any,
  ctx: { conversation_id: string; flowState?: any },
  geo: GeoData
) {
  await updateFlowState(supabaseAdmin, ctx, { geo });
  
  await logAudit({
    action: 'geo_cached',
    conversation_id: ctx.conversation_id,
    fluxo: 'support-tech',
    detalhes: { cidade: geo.cidade, bairro: geo.bairro, source: geo.source },
    supabaseClient: supabaseAdmin
  }).catch(() => {}); // Erro de logging não deve atrapalhar fluxo
}

/**
 * Extrai cidade de endereço usando regex simples
 * Exemplo: "Rua X, 123 - Centro, São Paulo" → "São Paulo"
 */
function extractCityFromAddress(address?: string): string | null {
  if (!address) return null;
  
  // Regex: captura última palavra/grupo após vírgula ou traço
  const match = address.match(/[,\-]\s*([A-Za-zÀ-ú\s]+)$/);
  return match?.[1]?.trim() || null;
}

/**
 * Adiciona geolocalização aos detalhes de um log
 * Uso: detalhes: withGeo({ ticket_id: 123 }, flowState)
 * 
 * @param detalhes - Objeto com detalhes do log
 * @param flowState - Estado do fluxo contendo geo
 * @returns Objeto com detalhes + cidade + bairro
 */
export function withGeo(detalhes: Record<string, any>, flowState: any): Record<string, any> {
  const geo = flowState?.geo;
  if (!geo?.cidade) return detalhes;
  
  return {
    ...detalhes,
    cidade: geo.cidade,
    bairro: geo.bairro
  };
}
