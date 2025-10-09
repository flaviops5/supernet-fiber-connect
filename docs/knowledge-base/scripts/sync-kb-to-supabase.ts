#!/usr/bin/env -S deno run --allow-net --allow-read --allow-env

/**
 * Script de Sincronização da Knowledge Base
 * 
 * Lê todos os arquivos .md em data-sources/ e sincroniza com a tabela knowledge_base do Supabase
 * 
 * USO:
 *   deno run --allow-net --allow-read --allow-env docs/knowledge-base/scripts/sync-kb-to-supabase.ts
 * 
 * REQUISITOS:
 *   - SUPABASE_URL env var
 *   - SUPABASE_SERVICE_ROLE_KEY env var
 */

import { walk } from "https://deno.land/std@0.208.0/fs/walk.ts";
import { parse as parseYaml } from "https://deno.land/std@0.208.0/yaml/parse.ts";

interface KnowledgeBaseMetadata {
  title: string;
  category: string;
  agent_types: string[];
  is_active: boolean;
  last_updated: string;
  author: string;
  version: string;
}

interface KnowledgeBaseRecord {
  title: string;
  content: string;
  category: string;
  source: string;
  is_active: boolean;
  metadata: {
    agent_types: string[];
    last_updated: string;
    author: string;
    version: string;
  };
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const DOCS_PATH = "./docs";

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌ Erro: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem estar definidas");
  Deno.exit(1);
}

/**
 * Determina a categoria baseada no caminho do arquivo
 */
function getCategoryFromPath(filePath: string): string {
  if (filePath.includes('knowledge-base/data-sources/vendas')) return 'vendas';
  if (filePath.includes('knowledge-base/data-sources/suporte')) return 'suporte';
  if (filePath.includes('knowledge-base/data-sources/telemedicina')) return 'telemedicina';
  if (filePath.includes('knowledge-base/data-sources/automacao')) return 'automacao';
  if (filePath.includes('whatsapp')) return 'integracao';
  if (filePath.includes('agent') || filePath.includes('multiagent')) return 'arquitetura';
  if (filePath.includes('tools') || filePath.includes('operational')) return 'documentacao-tecnica';
  if (filePath.includes('system') || filePath.includes('robustness')) return 'sistema';
  return 'geral';
}

/**
 * Extrai metadados YAML do front matter do markdown (opcional)
 */
function extractFrontMatter(content: string): {
  metadata: Partial<KnowledgeBaseMetadata>;
  markdownContent: string;
} {
  const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontMatterRegex);

  if (!match) {
    // Se não tem front matter, retorna conteúdo completo
    return { 
      metadata: {}, 
      markdownContent: content 
    };
  }

  const [, yamlContent, markdownContent] = match;
  const metadata = parseYaml(yamlContent) as Partial<KnowledgeBaseMetadata>;

  return { metadata, markdownContent };
}

/**
 * Lê e processa um arquivo .md
 */
async function processMarkdownFile(filePath: string): Promise<KnowledgeBaseRecord> {
  console.log(`📄 Processando: ${filePath}`);

  const fileContent = await Deno.readTextFile(filePath);
  const { metadata, markdownContent } = extractFrontMatter(fileContent);

  // Extrair título do arquivo ou do metadata
  const fileName = filePath.split("/").pop()?.replace(".md", "") || "Sem título";
  const title = metadata.title || fileName
    .split("-")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  // Determinar categoria
  const category = metadata.category || getCategoryFromPath(filePath);

  // Data de atualização do arquivo
  const fileInfo = await Deno.stat(filePath);
  const lastUpdated = metadata.last_updated || fileInfo.mtime?.toISOString() || new Date().toISOString();

  return {
    title,
    content: markdownContent.trim(),
    category,
    source: filePath,
    is_active: metadata.is_active ?? true,
    metadata: {
      agent_types: metadata.agent_types || ['geral'],
      last_updated: lastUpdated,
      author: metadata.author || 'SUPERNET FIBRA',
      version: metadata.version || '1.0',
    },
  };
}

/**
 * Sincroniza um registro com o Supabase (upsert baseado em source)
 */
async function syncToSupabase(record: KnowledgeBaseRecord): Promise<void> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/knowledge_base`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_SERVICE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Prefer": "resolution=merge-duplicates",
    },
    body: JSON.stringify(record),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro ao sincronizar ${record.source}: ${error}`);
  }

  console.log(`✅ Sincronizado: ${record.title}`);
}

/**
 * Função principal
 */
async function main() {
  console.log("🚀 Iniciando sincronização da Knowledge Base...\n");

  let totalFiles = 0;
  let successCount = 0;
  let errorCount = 0;

  try {
    // Percorrer TODOS os arquivos .md na pasta docs/
    for await (const entry of walk(DOCS_PATH, {
      exts: ["md"],
      skip: [
        /README\.md$/,
        /node_modules/,
        /\.git/,
      ],
    })) {
      totalFiles++;

      try {
        const record = await processMarkdownFile(entry.path);
        await syncToSupabase(record);
        successCount++;
      } catch (error) {
        console.error(`❌ Erro ao processar ${entry.path}:`, error.message);
        errorCount++;
      }
    }

    console.log("\n" + "=".repeat(50));
    console.log("📊 RESUMO DA SINCRONIZAÇÃO");
    console.log("=".repeat(50));
    console.log(`Total de arquivos: ${totalFiles}`);
    console.log(`✅ Sucesso: ${successCount}`);
    console.log(`❌ Erros: ${errorCount}`);
    console.log("=".repeat(50));

    if (errorCount > 0) {
      Deno.exit(1);
    }
  } catch (error) {
    console.error("❌ Erro fatal:", error);
    Deno.exit(1);
  }
}

// Executar
await main();
