#!/usr/bin/env node

/**
 * Script de migração automática: console.log → unified-logger
 * 
 * Substitui todas as chamadas console.* no frontend por logger.*
 * Com backup automático e validação de sintaxe.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuração
const SRC_DIR = path.join(__dirname, '../src');
const BACKUP_DIR = path.join(__dirname, '../.migration-backup');
const LOGGER_IMPORT = `import { logger } from "@/lib/unified-logger";`;

// Estatísticas
let stats = {
  filesScanned: 0,
  filesModified: 0,
  totalReplacements: 0,
  byLevel: { info: 0, warn: 0, error: 0, debug: 0 },
  errors: []
};

// Padrões de regex para detecção
const CONSOLE_PATTERNS = [
  {
    regex: /console\.error\((.*?)\);?/g,
    replacement: 'logger.error($1);',
    level: 'error'
  },
  {
    regex: /console\.warn\((.*?)\);?/g,
    replacement: 'logger.warn($1);',
    level: 'warn'
  },
  {
    regex: /console\.log\((.*?)\);?/g,
    replacement: 'logger.info($1);',
    level: 'info'
  },
  {
    regex: /console\.debug\((.*?)\);?/g,
    replacement: 'logger.debug($1);',
    level: 'debug'
  },
  {
    regex: /console\.info\((.*?)\);?/g,
    replacement: 'logger.info($1);',
    level: 'info'
  }
];

// Arquivos/diretórios a ignorar
const IGNORE_PATTERNS = [
  'node_modules',
  'dist',
  'build',
  '.git',
  'test',
  'tests',
  '__tests__',
  '*.test.ts',
  '*.test.tsx',
  '*.spec.ts',
  '*.spec.tsx'
];

/**
 * Verifica se o arquivo deve ser ignorado
 */
function shouldIgnore(filePath) {
  return IGNORE_PATTERNS.some(pattern => {
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace('*', '.*'));
      return regex.test(filePath);
    }
    return filePath.includes(pattern);
  });
}

/**
 * Cria backup do arquivo
 */
function backupFile(filePath) {
  const relativePath = path.relative(SRC_DIR, filePath);
  const backupPath = path.join(BACKUP_DIR, relativePath);
  const backupDir = path.dirname(backupPath);

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  fs.copyFileSync(filePath, backupPath);
}

/**
 * Verifica se o arquivo já tem import do logger
 */
function hasLoggerImport(content) {
  return content.includes('@/lib/unified-logger') || 
         content.includes('@/lib/logger') ||
         content.includes('unified-logger');
}

/**
 * Adiciona import do logger no topo do arquivo
 */
function addLoggerImport(content) {
  // Encontra a última linha de import
  const lines = content.split('\n');
  let lastImportIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ')) {
      lastImportIndex = i;
    }
  }

  if (lastImportIndex === -1) {
    // Sem imports, adiciona no topo
    return LOGGER_IMPORT + '\n\n' + content;
  }

  // Adiciona após o último import
  lines.splice(lastImportIndex + 1, 0, LOGGER_IMPORT);
  return lines.join('\n');
}

/**
 * Processa um arquivo
 */
function processFile(filePath) {
  stats.filesScanned++;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  let replacements = 0;

  // Verifica se tem console.* para migrar
  const hasConsole = CONSOLE_PATTERNS.some(p => p.regex.test(content));
  
  if (!hasConsole) {
    return; // Nada para fazer
  }

  // Faz backup
  backupFile(filePath);

  // Aplica todas as substituições
  for (const pattern of CONSOLE_PATTERNS) {
    const matches = content.match(pattern.regex);
    if (matches) {
      content = content.replace(pattern.regex, pattern.replacement);
      const count = matches.length;
      replacements += count;
      stats.byLevel[pattern.level] += count;
      modified = true;
    }
  }

  // Adiciona import se necessário
  if (modified && !hasLoggerImport(content)) {
    content = addLoggerImport(content);
  }

  // Salva arquivo modificado
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    stats.filesModified++;
    stats.totalReplacements += replacements;
    console.log(`✅ ${path.relative(SRC_DIR, filePath)} - ${replacements} substituições`);
  }
}

/**
 * Busca recursivamente arquivos .ts e .tsx
 */
function findFiles(dir, files = []) {
  const entries = fs.readdirSync(dir);

  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    
    if (shouldIgnore(fullPath)) {
      continue;
    }

    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      findFiles(fullPath, files);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Valida sintaxe TypeScript
 */
function validateSyntax() {
  console.log('\n🔍 Validando sintaxe TypeScript...');
  try {
    execSync('npx tsc --noEmit', { stdio: 'inherit' });
    console.log('✅ Sintaxe validada com sucesso!\n');
    return true;
  } catch (error) {
    console.error('❌ Erro de sintaxe detectado!');
    console.error('Execute: npm run type-check para ver os detalhes\n');
    return false;
  }
}

/**
 * Exibe relatório final
 */
function printReport() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 RELATÓRIO DE MIGRAÇÃO');
  console.log('='.repeat(60));
  console.log(`📁 Arquivos escaneados:     ${stats.filesScanned}`);
  console.log(`✏️  Arquivos modificados:    ${stats.filesModified}`);
  console.log(`🔄 Total de substituições:  ${stats.totalReplacements}`);
  console.log('\n📈 Por nível:');
  console.log(`   • logger.info():  ${stats.byLevel.info}`);
  console.log(`   • logger.warn():  ${stats.byLevel.warn}`);
  console.log(`   • logger.error(): ${stats.byLevel.error}`);
  console.log(`   • logger.debug(): ${stats.byLevel.debug}`);
  console.log('\n💾 Backup salvo em: .migration-backup/');
  console.log('='.repeat(60) + '\n');
}

/**
 * Restaura backup em caso de erro
 */
function restoreBackup() {
  console.log('\n⚠️  Restaurando backup...');
  execSync(`cp -r ${BACKUP_DIR}/* ${SRC_DIR}/`);
  console.log('✅ Backup restaurado!\n');
}

/**
 * Main
 */
function main() {
  console.log('\n🚀 Iniciando migração console.log → unified-logger\n');

  // Cria diretório de backup
  if (fs.existsSync(BACKUP_DIR)) {
    fs.rmSync(BACKUP_DIR, { recursive: true });
  }
  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  // Encontra todos os arquivos
  const files = findFiles(SRC_DIR);
  console.log(`📂 ${files.length} arquivos encontrados\n`);

  // Processa cada arquivo
  for (const file of files) {
    try {
      processFile(file);
    } catch (error) {
      stats.errors.push({ file, error: error.message });
      console.error(`❌ Erro ao processar ${file}:`, error.message);
    }
  }

  // Relatório
  printReport();

  // Valida sintaxe
  if (stats.filesModified > 0) {
    const valid = validateSyntax();
    
    if (!valid) {
      console.log('⚠️  Deseja restaurar o backup? (Ctrl+C para cancelar)');
      // Em produção, adicionar prompt interativo aqui
    }
  }

  console.log('✅ Migração concluída!\n');
  console.log('📝 Próximos passos:');
  console.log('   1. Revise as mudanças: git diff');
  console.log('   2. Teste a aplicação: npm run dev');
  console.log('   3. Execute os testes: npm run test');
  console.log('   4. Commit: git add . && git commit -m "feat: migrar para unified-logger"\n');
}

// Executa
main();
