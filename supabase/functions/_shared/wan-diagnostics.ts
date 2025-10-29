/**
 * PR #26 — Heurísticas para distinguir problemas de Wi-Fi vs WAN
 * 
 * Sistema de detecção para Scenario E: casos onde ONU e sinal óptico estão OK,
 * mas a internet não funciona devido a problemas de Wi-Fi, porta WAN ou uplink.
 */

export type Signal = { rx?: number; tx?: number };
export type ConnProbe = { 
  reachable?: boolean; 
  latency_ms?: number; 
  http_status?: number | null;
};

/**
 * Verifica se o sinal óptico está bom (acima de -24 dBm)
 * Cenários C e D já trataram sinais piores
 */
export function isOpticalGood(signal?: Signal): boolean {
  if (!signal || typeof signal.rx !== "number") return false;
  return signal.rx > -24; // Bom sinal óptico
}

/**
 * Detecta se o problema relatado pelo usuário parece ser de Wi-Fi
 * baseado em palavras-chave comuns
 */
export function isLikelyWifiIssue(userHints: string): boolean {
  const s = userHints.toLowerCase();
  return /(wifi|wi[-\s]?fi|ssid|rede|conecta mas n[aã]o navega|sinal fraco)/i.test(s);
}

/**
 * Detecta se o problema parece ser na porta WAN ou uplink
 * Características:
 * - Roteador responde localmente (LAN ok)
 * - Internet não funciona (DNS/HTTP falham)
 */
export function isLikelyWanDown(
  routerProbe?: ConnProbe,
  internetProbe?: { 
    dns_ok?: boolean; 
    http_ok?: boolean; 
    last_speedtest_ok?: boolean;
  }
): boolean {
  // Roteador responde (LAN ok)
  const routerAlive = !!routerProbe?.reachable;
  
  // Internet não funciona
  const internetDead = 
    internetProbe?.dns_ok === false || 
    internetProbe?.http_ok === false || 
    internetProbe?.last_speedtest_ok === false;
  
  return routerAlive && internetDead;
}
