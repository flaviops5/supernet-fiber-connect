import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface KnowledgeEntry {
  title: string;
  content: string;
  content_type: string;
  category: string;
  tags: string[];
  agent_types: string[];
  is_active: boolean;
  parent_id?: string;
  is_folder: boolean;
  display_order: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🔄 Iniciando sincronização da documentação IXC...');

    // Fetch da documentação do Postman
    const postmanUrl = 'https://documenter.getpostman.com/view/40255984/2sAYBbe9Ma';
    console.log('📥 Buscando documentação do Postman...');
    
    const response = await fetch(postmanUrl);
    const html = await response.text();

    // Parse e estruturação dos endpoints
    const entries = parseIXCDocumentation(html);
    
    console.log(`📊 Encontrados ${entries.length} itens para sincronizar`);

    // Limpar documentação IXC antiga da knowledge_base
    const { error: deleteError } = await supabase
      .from('knowledge_base')
      .delete()
      .in('category', ['ixc-api', 'ixc-endpoints', 'ixc-cadastros', 'ixc-financeiro', 'ixc-suporte', 'ixc-provedor']);

    if (deleteError) {
      console.error('❌ Erro ao limpar documentação antiga:', deleteError);
      throw deleteError;
    }

    // Log de verificação do content_type e quantidade
    console.log('🧪 Primeiro item content_type:', entries[0]?.content_type, 'total:', entries.length);

    // Inserir nova documentação
    const { error: insertError } = await supabase
      .from('knowledge_base')
      .insert(entries);

    if (insertError) {
      console.error('❌ Erro ao inserir documentação:', insertError);
      throw insertError;
    }

    console.log('✅ Sincronização concluída com sucesso!');

    return new Response(
      JSON.stringify({
        success: true,
        message: `${entries.length} itens sincronizados com sucesso`,
        itemsProcessed: entries.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro na sincronização:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function parseIXCDocumentation(html: string): KnowledgeEntry[] {
  const entries: KnowledgeEntry[] = [];
  
  // Estrutura base de conhecimento IXC
  const categories = [
    {
      name: 'Introdução à API IXC',
      category: 'ixc-api',
      content: `# API IXC Provedor

Documentação completa da API REST do IXC Provedor. Esta API permite integração com o sistema de gestão para provedores de internet.

## Autenticação
- Método: Basic Auth
- Headers obrigatórios: \`ixcsoft: listar\` para requisições GET
- URL Base: \`https://seu-dominio.ixcsoft.com.br/webservice/v1/\`

## Métodos Disponíveis
- **GET**: Listar/consultar registros
- **POST**: Inserir novos registros  
- **PUT**: Atualizar registros existentes
- **DELETE**: Excluir registros

## Links Úteis
- Documentação Oficial: https://wikiapiprovedor.ixcsoft.com.br/
- Suporte API: WhatsApp +55 49 3344-6001`,
      tags: ['api', 'introducao', 'autenticacao'],
      display_order: 0
    },
    {
      name: 'Métodos HTTP',
      category: 'ixc-api',
      content: `# Métodos da API

## GET (Listar/Consultar)
Estrutura padrão para consultas:

\`\`\`json
{
  "qtype": "tabela.campo",
  "query": "valor",
  "oper": "=",
  "page": "1",
  "rp": "100",
  "sortname": "tabela.id",
  "sortorder": "asc"
}
\`\`\`

### Operadores Disponíveis
- \`=\` - Igual
- \`!=\` - Diferente
- \`>\` - Maior que
- \`<\` - Menor que
- \`>=\` - Maior ou igual
- \`<=\` - Menor ou igual
- \`L\` - Contém (texto)
- \`NL\` - Não contém (texto)
- \`IN\` - Está contido (números)
- \`NI\` - Não está contido (números)
- \`BE\` - Entre
- \`NBE\` - Não está entre

## POST (Inserir)
Enviar objeto JSON com todos os campos obrigatórios.

## PUT (Atualizar)
Enviar objeto JSON completo + ID na URL.

## DELETE (Excluir)
Enviar ID na URL.`,
      tags: ['metodos', 'get', 'post', 'put', 'delete'],
      display_order: 1
    },
    {
      name: 'Tratamento de Erros',
      category: 'ixc-api',
      content: `# Erros Comuns da API

## 400 - Bad Request
- Erro no certificado SSL
- Método de autenticação incorreto (use Basic Auth)

## 401 - Authorization Required
- Token inválido ou expirado
- Usuário inativo
- URL incorreta
- Endpoint bloqueado

## 403 - Forbidden
- Token precisa ser recriado após migração de servidor

## 404 - Not Found
- Faltando header \`ixcsoft: listar\` em requisições GET
- Endpoint não existe

## 500 - Internal Server Error
- Endpoint incorreto
- Campo sem prefixo de tabela
- Erro no servidor

## 504 - Timeout
- Servidor sobrecarregado
- Consulta muito pesada`,
      tags: ['erros', 'troubleshooting', 'debug'],
      display_order: 2
    }
  ];

  // Endpoints de Clientes
  const clienteEndpoints = [
    {
      name: 'Cliente - Listar',
      category: 'ixc-cadastros',
      content: `# Cliente - Listar (GET)

Endpoint: \`/webservice/v1/cliente\`
Método: GET
Header: \`ixcsoft: listar\`

## Exemplo de Requisição
\`\`\`json
{
  "qtype": "cliente.id",
  "query": "1",
  "oper": ">=",
  "page": "1",
  "rp": "100",
  "sortname": "cliente.id",
  "sortorder": "asc"
}
\`\`\`

## Campos Principais
- id - ID do cliente
- razao - Nome/Razão social
- cnpj_cpf - CPF/CNPJ
- email - E-mail
- telefone_celular - Celular
- endereco - Endereço
- cidade - ID da cidade
- ativo - Status (S/N)`,
      tags: ['cliente', 'listar', 'get', 'cadastros'],
      display_order: 10
    },
    {
      name: 'Cliente - Inserir',
      category: 'ixc-cadastros',
      content: `# Cliente - Inserir (POST)

Endpoint: \`/webservice/v1/cliente\`
Método: POST

## Campos Obrigatórios
\`\`\`json
{
  "ativo": "S",
  "tipo_pessoa": "F",
  "razao": "Nome do Cliente",
  "contribuinte_icms": "N",
  "tipo_assinante": "1",
  "cep": "89814-680",
  "endereco": "Rua Exemplo",
  "numero": "100",
  "bairro": "Centro",
  "cidade": "1234",
  "uf": "2",
  "tipo_localidade": "U",
  "iss_classificacao_padrao": "00"
}
\`\`\``,
      tags: ['cliente', 'inserir', 'post', 'cadastros'],
      display_order: 11
    },
    {
      name: 'Cliente - Atualizar',
      category: 'ixc-cadastros',
      content: `# Cliente - Atualizar (PUT)

Endpoint: \`/webservice/v1/cliente/{id}\`
Método: PUT

**IMPORTANTE**: É necessário enviar TODOS os campos, mesmo os não alterados.

## Exemplo
\`\`\`json
{
  "ativo": "S",
  "razao": "Nome Atualizado",
  "tipo_pessoa": "F",
  // ... todos os outros campos
}
\`\`\``,
      tags: ['cliente', 'atualizar', 'put', 'cadastros'],
      display_order: 12
    },
    {
      name: 'Cliente - Deletar',
      category: 'ixc-cadastros',
      content: `# Cliente - Deletar (DELETE)

Endpoint: \`/webservice/v1/cliente/{id}\`
Método: DELETE

## Exemplo
\`\`\`bash
DELETE /webservice/v1/cliente/1234
\`\`\``,
      tags: ['cliente', 'deletar', 'delete', 'cadastros'],
      display_order: 13
    }
  ];

  // Endpoints Financeiros
  const financeiroEndpoints = [
    {
      name: 'Títulos a Receber - Listar',
      category: 'ixc-financeiro',
      content: `# Títulos a Receber - Listar (GET)

Endpoint: \`/webservice/v1/fn_areceber\`
Método: GET
Header: \`ixcsoft: listar\`

## Exemplo - Títulos em Aberto
\`\`\`json
{
  "qtype": "fn_areceber.status",
  "query": "A",
  "oper": "=",
  "page": "1",
  "rp": "1000",
  "sortname": "fn_areceber.data_vencimento",
  "sortorder": "asc"
}
\`\`\`

## Status Possíveis
- A - Em aberto
- R - Recebido
- C - Cancelado

## Campos Principais
- id - ID do título
- id_cliente - ID do cliente
- data_vencimento - Data de vencimento
- valor - Valor do título
- status - Status atual`,
      tags: ['financeiro', 'titulos', 'receber', 'boleto', 'listar'],
      display_order: 20
    },
    {
      name: 'Títulos - Filtrar por Vencimento',
      category: 'ixc-financeiro',
      content: `# Filtrar Títulos por Data de Vencimento

## Vencimentos Futuros
\`\`\`json
{
  "qtype": "fn_areceber.data_vencimento",
  "query": "2025-10-01",
  "oper": ">=",
  "page": "1",
  "rp": "1000"
}
\`\`\`

## Vencimentos entre Datas
Use \`grid_param\`:
\`\`\`json
{
  "grid_param": "[{\\"TB\\":\\"fn_areceber.data_vencimento\\", \\"OP\\":\\">=\\", \\"P\\":\\"01/10/2025\\"},{\\"TB\\":\\"fn_areceber.data_vencimento\\", \\"OP\\":\\"<=\\", \\"P\\":\\"31/10/2025\\"}]"
}
\`\`\``,
      tags: ['financeiro', 'titulos', 'vencimento', 'filtros'],
      display_order: 21
    }
  ];

  // Endpoints de Contratos
  const contratoEndpoints = [
    {
      name: 'Contratos - Listar',
      category: 'ixc-provedor',
      content: `# Contratos - Listar (GET)

Endpoint: \`/webservice/v1/cliente_contrato\`
Método: GET
Header: \`ixcsoft: listar\`

## Exemplo
\`\`\`json
{
  "qtype": "cliente_contrato.id_cliente",
  "query": "1234",
  "oper": "=",
  "page": "1",
  "rp": "100"
}
\`\`\`

## Campos Principais
- id - ID do contrato
- id_cliente - ID do cliente
- status - Status (A=Ativo, I=Inativo, C=Cancelado)
- data_cadastro - Data de cadastro
- valor - Valor do contrato`,
      tags: ['contratos', 'provedor', 'listar'],
      display_order: 30
    },
    {
      name: 'Planos de Venda - Listar',
      category: 'ixc-provedor',
      content: `# Planos de Venda - Listar (GET)

Endpoint: \`/webservice/v1/vd_contratos\`
Método: GET

## Exemplo
\`\`\`json
{
  "qtype": "vd_contratos.id",
  "query": "1",
  "oper": ">=",
  "page": "1",
  "rp": "100"
}
\`\`\`

## Campos
- id - ID do plano
- nome - Nome do plano
- valor - Valor do plano
- download - Velocidade download
- upload - Velocidade upload`,
      tags: ['planos', 'vendas', 'provedor'],
      display_order: 31
    }
  ];

  // Endpoints de Suporte
  const suporteEndpoints = [
    {
      name: 'Ordens de Serviço - Listar',
      category: 'ixc-suporte',
      content: `# Ordens de Serviço - Listar (GET)

Endpoint: \`/webservice/v1/su_oss_chamado\`
Método: GET

## Exemplo
\`\`\`json
{
  "qtype": "su_oss_chamado.status",
  "query": "A",
  "oper": "=",
  "page": "1",
  "rp": "100"
}
\`\`\`

## Status Possíveis
- A - Aberto
- E - Em andamento
- F - Finalizado
- C - Cancelado`,
      tags: ['suporte', 'os', 'chamados', 'tickets'],
      display_order: 40
    },
    {
      name: 'Tickets - Criar',
      category: 'ixc-suporte',
      content: `# Criar Ticket de Suporte (POST)

Endpoint: \`/webservice/v1/su_oss_chamado\`
Método: POST

## Campos Obrigatórios
\`\`\`json
{
  "id_cliente": "1234",
  "id_assunto": "1",
  "descricao": "Descrição do problema",
  "prioridade": "M"
}
\`\`\`

## Prioridades
- B - Baixa
- M - Média  
- A - Alta
- U - Urgente`,
      tags: ['suporte', 'tickets', 'criar', 'post'],
      display_order: 41
    }
  ];

  // Combinar tudo
  const allEndpoints = [
    ...categories,
    ...clienteEndpoints,
    ...financeiroEndpoints,
    ...contratoEndpoints,
    ...suporteEndpoints
  ];

  // Converter para formato knowledge_base
  allEndpoints.forEach((endpoint, index) => {
    entries.push({
      title: endpoint.name,
      content: endpoint.content,
      content_type: 'document',
      category: endpoint.category,
      tags: endpoint.tags,
      agent_types: ['support_tech', 'support_financial'], // Disponível para agentes de suporte
      is_active: true,
      is_folder: false,
      display_order: endpoint.display_order
    });
  });

  return entries;
}
