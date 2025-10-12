// Script temporário para testar a listagem de assuntos do IXC
// Execute: node test-list-subjects.js

const SUPABASE_URL = 'https://mxdupkbpxjcfxdgrwknp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14ZHVwa2JweGpjZnhkZ3J3a25wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3NTg4ODYsImV4cCI6MjA3NDMzNDg4Nn0.np4wHopAwI7HOTsYPaAUSWbe_qVxMBSIHjYv4PnKL6I';

async function listSubjects() {
  try {
    console.log('🔍 Buscando assuntos do IXC...\n');
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/ixc-list-subjects`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      }
    });

    const data = await response.json();

    if (data.success) {
      console.log(`✅ Total de assuntos encontrados: ${data.total}\n`);
      console.log('📋 Lista de Assuntos:\n');
      console.log('ID'.padEnd(5) + ' | ' + 'Nome do Assunto');
      console.log('-'.repeat(60));
      
      data.data.forEach(subject => {
        console.log(subject.id.padEnd(5) + ' | ' + subject.nome);
      });
    } else {
      console.error('❌ Erro:', data.error);
    }
  } catch (error) {
    console.error('❌ Erro ao buscar:', error.message);
  }
}

listSubjects();
