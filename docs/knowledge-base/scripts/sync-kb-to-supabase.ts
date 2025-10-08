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
const DATA_SOURCES_PATH = "./docs/knowledge-base/data-sources";

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌ Erro: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem estar definidas");
  Deno.exit(1);
}

/**
 * Extrai metadados YAML do front matter do markdown
 */
function extractFrontMatter(content: string): {
  metadata: KnowledgeBaseMetadata;
  markdownContent: string;
} {
  const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontMatterRegex);

  if (!match) {
    throw new Error("Arquivo não contém front matter YAML válido");
  }

  const [, yamlContent, markdownContent] = match;
  const metadata = parseYaml(yamlContent) as KnowledgeBaseMetadata;

  return { metadata, markdownContent };
}

/**
 * Lê e processa um arquivo .md
 */
async function processMarkdownFile(filePath: string): Promise<KnowledgeBaseRecord> {
  console.log(`📄 Processando: ${filePath}`);

  const fileContent = await Deno.readTextFile(filePath);
  const { metadata, markdownContent } = extractFrontMatter(fileContent);

  // Extrair categoria do caminho (ex: data-sources/vendas/planos.md -> vendas)
  const pathParts = filePath.split("/");
  const categoryFromPath = pathParts[pathParts.length - 2];

  return {
    title: metadata.title,
    content: markdownContent.trim(),
    category: metadata.category || categoryFromPath,
    source: filePath,
    is_active: metadata.is_active,
    metadata: {
      agent_types: metadata.agent_types,
      last_updated: metadata.last_updated,
      author: metadata.author,
      version: metadata.version,
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
    // Percorrer todos os arquivos .md em data-sources/
    for await (const entry of walk(DATA_SOURCES_PATH, {
      exts: ["md"],
      skip: [/README\.md$/],
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
