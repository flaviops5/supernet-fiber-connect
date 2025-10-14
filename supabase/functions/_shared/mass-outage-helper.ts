/**
 * Mass Outage Context Helper v1.1.0
 * 
 * Fonte de verdade: public.mass_outage_events
 * Arquitetura: Stateless-compatible para Edge Functions
 * 
 * @module mass-outage-helper
 * @version 1.1.0
 * @author GPT-5 — Engenharia de Software
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================
// INTERFACES
// ============================================

export interface MassOutageContext {
  active: boolean;
  affectedRegions: string[];
  affectedCount: number;
  detectedAt: string | null;
  eventId?: string;
  metadata?: any;
}

export interface MassOutageResult {
  context: string;
  hasActiveOutage: boolean;
  outageData: any | null;
}

// ============================================
// CACHE VOLÁTIL (TTL 5s)
// ============================================

interface CacheEntry {
  data: MassOutageContext | null;
  timestamp: number;
}

let cache: CacheEntry = { data: null, timestamp: 0 };

// ============================================
// FUNÇÃO PRINCIPAL - Consulta Direta ao BD
// ============================================

/**
 * Consulta diretamente a tabela mass_outage_events para obter
 * o contexto de panes massivas ativas.
 * 
 * @param supabase - Cliente Supabase
 * @param correlationId - ID de correlação para logs (opcional)
 * @param timeoutMs - Timeout em ms (padrão: 3000ms)
 * @returns MassOutageContext
 */
export async function getMassOutageContext(
  supabase: SupabaseClient,
  correlationId?: string,
  timeoutMs = 3000
): Promise<MassOutageContext> {
  const cid = correlationId || `outage-${Date.now()}`;
  
  try {
    console.log(`🔍 [${cid}] Consultando mass_outage_events...`);
    
    // Criar Promise com timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout na consulta de panes')), timeoutMs);
    });
    
    const queryPromise = supabase
      .from("mass_outage_events")
      .select("*")
      .eq("status", "active")
      .order("detected_at", { ascending: false })
      .limit(1);
    
    // Race entre query e timeout
    const { data: activeOutages, error } = await Promise.race([
      queryPromise,
      timeoutPromise
    ]) as any;
    
    if (error) {
      console.error(`❌ [${cid}] Erro ao consultar panes:`, error);
      return {
        active: false,
        affectedRegions: [],
        affectedCount: 0,
        detectedAt: null
      };
    }
    
    if (activeOutages && activeOutages.length > 0) {
      const outage = activeOutages[0];
      const regions = outage.region_pattern?.split(",").map((r: string) => r.trim()) || [];
      
      console.log(`⚠️ [${cid}] Pane ativa detectada:`, {
        id: outage.id,
        regions,
        affected: outage.affected_count,
        detected: outage.detected_at
      });
      
      return {
        active: true,
        affectedRegions: regions,
        affectedCount: outage.affected_count || 0,
        detectedAt: outage.detected_at,
        eventId: outage.id,
        metadata: outage.metadata
      };
    }
    
    console.log(`✅ [${cid}] Nenhuma pane ativa`);
    
    return {
      active: false,
      affectedRegions: [],
      affectedCount: 0,
      detectedAt: null
    };
    
  } catch (error) {
    console.error(`💥 [${cid}] Exceção ao verificar panes:`, error);
    
    // Fallback seguro em caso de erro
    return {
      active: false,
      affectedRegions: [],
      affectedCount: 0,
      detectedAt: null
    };
  }
}

// ============================================
// FUNÇÃO COM CACHE OPCIONAL (TTL 5s)
// ============================================

/**
 * Versão com cache da consulta de panes.
 * Cache vive apenas durante a execução da Edge Function (stateless-safe).
 * 
 * QUANDO USAR:
 * - Use esta função em agentes de alto volume (routing-agent)
 * - Para reduzir latência sem comprometer consistência
 * 
 * QUANDO NÃO USAR:
 * - Use getMassOutageContext direta em agentes críticos (support-tech-agent)
 * - Quando precisar de dados sempre atualizados
 * 
 * @param supabase - Cliente Supabase
 * @param correlationId - ID de correlação para logs (opcional)
 * @param ttlMs - Time-to-live do cache em ms (padrão: 5000ms)
 * @returns MassOutageContext
 */
export async function getCachedOutage(
  supabase: SupabaseClient,
  correlationId?: string,
  ttlMs = 5000
): Promise<MassOutageContext> {
  const cid = correlationId || `cached-outage-${Date.now()}`;
  const now = Date.now();
  
  // Verificar se cache é válido
  if (cache.data && (now - cache.timestamp) < ttlMs) {
    console.log(`💾 [${cid}] Cache hit (${now - cache.timestamp}ms old)`);
    return cache.data;
  }
  
  console.log(`🔄 [${cid}] Cache miss - consultando BD`);
  
  // Buscar dados frescos
  const data = await getMassOutageContext(supabase, cid);
  
  // Atualizar cache
  cache = { data, timestamp: now };
  
  return data;
}

// ============================================
// FUNÇÃO AUXILIAR - Formatar Contexto para LLM
// ============================================

/**
 * Formata o contexto de pane para ser incluído no prompt do LLM.
 * 
 * @param outageContext - Contexto de pane
 * @returns String formatada para prompt
 */
export function formatOutageContextForPrompt(outageContext: MassOutageContext): string {
  if (!outageContext.active) {
    return '';
  }
  
  const detectedTime = outageContext.detectedAt 
    ? new Date(outageContext.detectedAt).toLocaleString('pt-BR')
    : 'data desconhecida';
  
  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ ALERTA: QUEDA EM MASSA ATIVA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 ${outageContext.affectedCount} clientes afetados
📍 Regiões: ${outageContext.affectedRegions.join(", ")}
🕐 Detectado em: ${detectedTime}

🎯 INSTRUÇÃO PRIORITÁRIA:
Informe ao cliente que há uma instabilidade conhecida na região e que a equipe técnica já está trabalhando na solução. Não realize troubleshooting desnecessário.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
}

// ============================================
// FUNÇÃO AUXILIAR - Verificar se Região Afetada
// ============================================

/**
 * Verifica se uma região específica está afetada pela pane.
 * 
 * @param outageContext - Contexto de pane
 * @param region - Nome da região a verificar
 * @returns boolean
 */
export function isRegionAffected(outageContext: MassOutageContext, region: string): boolean {
  if (!outageContext.active) return false;
  
  const normalizedRegion = region.toLowerCase().trim();
  
  return outageContext.affectedRegions.some(
    r => r.toLowerCase().includes(normalizedRegion) || normalizedRegion.includes(r.toLowerCase())
  );
}

// ============================================
// FUNÇÃO AUXILIAR - Obter Resultado Completo
// ============================================

/**
 * Retorna resultado completo com contexto formatado.
 * Compatível com implementação anterior.
 * 
 * @param supabase - Cliente Supabase
 * @param correlationId - ID de correlação para logs (opcional)
 * @returns MassOutageResult
 */
export async function getMassOutageResult(
  supabase: SupabaseClient,
  correlationId?: string
): Promise<MassOutageResult> {
  const outageContext = await getMassOutageContext(supabase, correlationId);
  
  return {
    context: formatOutageContextForPrompt(outageContext),
    hasActiveOutage: outageContext.active,
    outageData: outageContext.active ? outageContext : null
  };
}
