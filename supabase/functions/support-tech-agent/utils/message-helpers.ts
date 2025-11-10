/**
 * Message Helpers
 * Utilitários para gerenciamento de mensagens
 */

/**
 * Sanitizar TODAS as menções incorretas de PON piscando
 */
export function sanitizeRedLightQuestion(text: string): string {
  if (!text) return text;
  let out = text;

  // Remover TODAS as referências a "PON piscando" ou "LOS ou PON piscando"
  out = out.replace(/\*\*LOS\*\*\s*(ou|\/)\s*\*\*PON\*\*/gi, '**LOS (vermelha)**');
  out = out.replace(/luz\s+\*\*PON\*\*\s*(ou|\/)\s*\*\*LOS\*\*/gi, 'luz **LOS (vermelha)**');
  out = out.replace(/\*\*PISCANDO\*\*\s*\(não fixa\)/gi, '**PISCANDO** (intermitente)');
  
  // Garantir que sempre mencione que PON é verde
  if (!/PON.*verde/i.test(out)) {
    out = out.replace(/Está piscando\?/, 'Você está vendo a **luz LOS** piscando? 🔴\n\nObs.: a **luz PON** normalmente é **VERDE** (fixa ou piscando).');
  }

  return out;
}

/**
 * Detecção leve de intenção e humor via regex (sem dependências externas)
 */
export function detectIntentAndMood(msg: string): { intent: string; mood: string } {
  const text = (msg || "").toLowerCase()
    .normalize("NFD").replace(/\p{Diacritic}/gu, ""); // remove acentos
  
  const intent =
    /^(ja (fiz|tentei)|fiz isso|reiniciei|reiniciei o roteador|ja reiniciei|ja desliguei|ja liguei|ja reconectei)/.test(text) ? "ja_fiz" :
    /(sim|ok|feito|pronto|consegui|deu certo)(!|\.)?$/.test(text) ? "confirmacao" :
    /(repete|nao entendi|como assim|pode explicar|poderia explicar|duvida)/.test(text) ? "duvida" :
    /(de novo isso|sempre isso|ja falei|nao aguento|absurdo|ridiculo|pessimo|horrivel|estou irritado|irritante)/.test(text) ? "repetir" :
    "";
  
  const mood =
    /(raiva|irritado|irritante|absurdo|ridiculo|pessimo|horrivel|nao aguento|isso de novo)/.test(text)
      ? "irritado" : "neutro";
  
  return { intent, mood };
}

/**
 * Compõe mensagem reconhecendo esforço do cliente
 */
export function withEffortAck(intent: string, base: string): string {
  return (intent === "ja_fiz" || intent === "confirmacao" || intent === "repetir")
    ? `Perfeito, já validou essa parte 👏 ${base}`
    : base;
}
