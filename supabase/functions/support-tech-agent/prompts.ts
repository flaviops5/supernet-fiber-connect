/**
 * Support Tech Agent - Modular Prompts v2.0.0
 * Agent: Luan Aquino
 * 
 * ARQUITETURA MODULAR:
 * - behavior.md: Identidade, regras, KPIs, fluxo principal
 * - variations.md: Scripts dos cenários A/B/C/D + follow-ups
 * - logs-schema.json: Schema de auditoria e telemetria
 * 
 * VANTAGENS:
 * - Manutenção facilitada (editar arquivos MD/JSON sem tocar em TS)
 * - Governança forte (versionamento individual de cada módulo)
 * - Alta performance (carregar apenas o necessário)
 * - Auditoria completa (schema JSON validado)
 */

// Função auxiliar para carregar arquivos de prompt
async function loadPromptFile(filename: string): Promise<string> {
  const path = new URL(`./prompts/${filename}`, import.meta.url).pathname;
  try {
    return await Deno.readTextFile(path);
  } catch (error) {
    console.error(`[SUPPORT-TECH] Erro ao carregar ${filename}:`, error);
    throw new Error(`Failed to load prompt file: ${filename}`);
  }
}

// Função para carregar schema JSON
async function loadLogsSchema(): Promise<Record<string, unknown>> {
  const path = new URL('./prompts/logs-schema.json', import.meta.url).pathname;
  try {
    const content = await Deno.readTextFile(path);
    return JSON.parse(content);
  } catch (error) {
    console.error('[SUPPORT-TECH] Erro ao carregar logs-schema.json:', error);
    throw new Error('Failed to load logs schema');
  }
}

// Carregamento lazy dos módulos (performance)
let behaviorPrompt: string | null = null;
let variationsPrompt: string | null = null;
let logsSchema: Record<string, unknown> | null = null;

/**
 * Retorna o prompt de comportamento base (behavior.md)
 */
export async function getBehaviorPrompt(): Promise<string> {
  if (!behaviorPrompt) {
    behaviorPrompt = await loadPromptFile('behavior.md');
  }
  return behaviorPrompt;
}

/**
 * Retorna os scripts de variações (variations.md)
 */
export async function getVariationsPrompt(): Promise<string> {
  if (!variationsPrompt) {
    variationsPrompt = await loadPromptFile('variations.md');
  }
  return variationsPrompt;
}

/**
 * Retorna o schema de logs estruturados
 */
export async function getLogsSchema(): Promise<Record<string, unknown>> {
  if (!logsSchema) {
    logsSchema = await loadLogsSchema();
  }
  return logsSchema;
}

/**
 * Monta o prompt completo do sistema (behavior + variations)
 * Usado pelo agente na chamada à LLM
 */
export async function getSupportTechSystemPrompt(): Promise<string> {
  const [behavior, variations] = await Promise.all([
    getBehaviorPrompt(),
    getVariationsPrompt()
  ]);
  
  return `${behavior}

---

${variations}`;
}

/**
 * Mensagem de boas-vindas (mantida como constante)
 */
export const SUPPORT_TECH_WELCOME_MESSAGE = 
  "Oi! Sou o Luan Aquino, do Suporte Técnico da Supernet! 🔧\n\n" +
  "Vi que você está com problema na internet. Vamos resolver isso agora mesmo, ok?";

/**
 * Mensagem de erro (mantida como constante)
 */
export const SUPPORT_TECH_ERROR_MESSAGE = 
  "Desculpe, tive um probleminha técnico aqui. Pode repetir o que você estava falando?";
