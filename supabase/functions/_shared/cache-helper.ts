/**
 * Cache Helper para Supabase
 * Utiliza a tabela ixc_cache para armazenar dados temporários
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import type { JsonValue } from "./error-types.ts";

interface CacheEntry {
  key: string;
  value: JsonValue;
  expires_at: string;
}

/**
 * Busca um valor do cache
 * @param supabase - Cliente Supabase
 * @param key - Chave do cache
 * @returns Valor cacheado ou null se expirado/inexistente
 */
export async function getCache<T = JsonValue>(
  supabase: SupabaseClient,
  key: string
): Promise<T | null> {
  try {
    const { data, error } = await supabase
      .from('ixc_cache')
      .select('value, expires_at')
      .eq('key', key)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    // Verificar se expirou
    if (new Date(data.expires_at) <= new Date()) {
      // Cache expirado, remover
      await invalidateCache(supabase, key);
      return null;
    }

    return data.value as T;
  } catch (error) {
    console.error('Erro ao buscar cache:', error);
    return null;
  }
}

/**
 * Salva um valor no cache
 * @param supabase - Cliente Supabase
 * @param key - Chave do cache
 * @param value - Valor a ser cacheado (será convertido para JSON)
 * @param ttlSeconds - Tempo de vida em segundos
 */
export async function setCache(
  supabase: SupabaseClient,
  key: string,
  value: JsonValue,
  ttlSeconds: number
): Promise<boolean> {
  try {
    const expires_at = new Date(Date.now() + ttlSeconds * 1000).toISOString();

    const { error } = await supabase
      .from('ixc_cache')
      .upsert(
        { key, value, expires_at },
        { onConflict: 'key' }
      );

    if (error) {
      console.error('Erro ao salvar cache:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erro ao salvar cache:', error);
    return false;
  }
}

/**
 * Remove um valor do cache
 * @param supabase - Cliente Supabase
 * @param key - Chave do cache
 */
export async function invalidateCache(
  supabase: SupabaseClient,
  key: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('ixc_cache')
      .delete()
      .eq('key', key);

    if (error) {
      console.error('Erro ao invalidar cache:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erro ao invalidar cache:', error);
    return false;
  }
}

/**
 * Wrapper para buscar com cache
 * Se não houver cache, executa a função, salva no cache e retorna
 * @param supabase - Cliente Supabase
 * @param key - Chave do cache
 * @param fetchFn - Função assíncrona para buscar os dados
 * @param ttlSeconds - Tempo de vida em segundos
 */
export async function getCachedOrFetch<T = JsonValue>(
  supabase: SupabaseClient,
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds: number
): Promise<T | null> {
  // Tentar buscar do cache
  const cached = await getCache<T>(supabase, key);
  if (cached !== null) {
    console.log(`✅ Cache HIT: ${key}`);
    return cached;
  }

  console.log(`❌ Cache MISS: ${key} - buscando dados...`);

  // Cache miss, buscar dados
  try {
    const data = await fetchFn();
    
    // Salvar no cache
    await setCache(supabase, key, data, ttlSeconds);
    
    return data;
  } catch (error) {
    console.error(`Erro ao buscar dados para cache ${key}:`, error);
    return null;
  }
}
