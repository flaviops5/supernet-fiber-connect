import { createPublicHandler } from '../_shared/base-handler.ts';

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

Deno.serve(createPublicHandler('sync-ixc-documentation', async (req, { supabase }) => {
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

    return {
      success: true,
      message: `${entries.length} itens sincronizados com sucesso`,
      itemsProcessed: entries.length
    };
}));

function parseIXCDocumentation(html: string): KnowledgeEntry[] {
  const entries: KnowledgeEntry[] = [];
  
  // Estrutura base de conhecimento IXC
  const categories = [
    {
      name: 'RESUMO: Endpoints IXC WebService V1',
      category: 'ixc-api',
      content: `# 📋 ENDPOINTS IXC WEBSERVICE V1 - LISTA CONSOLIDADA

## 📊 RESUMO TOTAL: 29 Endpoints Únicos

### 👥 CLIENTES (6 endpoints)
1. \`GET/POST/PUT/DELETE /webservice/v1/cliente\` - Gerenciar clientes
2. \`POST /webservice/v1/cliente_arquivo\` - Upload de arquivo do cliente
3. \`GET/POST/DELETE /webservice/v1/cliente_arquivos\` - Gerenciar arquivos do cliente
4. \`POST /webservice/v1/consulta_spc_serasa\` - Consultar SPC/Serasa
5. \`POST /webservice/v1/bloquear_desbloquear_sip\` - Bloquear/Desbloquear SIP
6. \`POST /webservice/v1/reenviar_link_assinatura_digital\` - Reenviar link de assinatura digital

### 📄 CONTRATOS (10 endpoints)
8. \`GET/POST/PUT/DELETE /webservice/v1/cliente_contrato\` - Gerenciar contratos
9. \`GET/POST /webservice/v1/cliente_contrato_descontos\` - Descontos de contratos
10. \`GET/POST /webservice/v1/cliente_contrato_acrescimos\` - Acréscimos de contratos
11. \`GET/POST /webservice/v1/cliente_contrato_servicos\` - Serviços de contratos
12. \`POST /webservice/v1/cliente_contrato_ativar_cliente\` - Ativar contrato do cliente
13. \`POST /webservice/v1/desativar_cancelar_financeiro_nao_vencido\` - Cancelar contrato e financeiro não vencido
14. \`POST /webservice/v1/negativar_bloquear\` - Negativar contrato e desbloquear acesso
15. \`GET /webservice/v1/vd_contratos\` - Contratos de venda (planos)
16. \`GET /webservice/v1/vd_contratos_produtos\` - Produtos de contratos de venda
17. \`GET /webservice/v1/plano\` - Listar planos

### 💰 FINANCEIRO (5 endpoints)
18. \`GET/POST /webservice/v1/fn_areceber\` - Contas a receber
19. \`POST /webservice/v1/fn_areceber_recebimentos_baixas_novo\` - Recebimentos e baixas
20. \`POST /webservice/v1/fn_areceber_altera\` - Alterar contas a receber
21. \`GET /webservice/v1/financeiro_titulo\` - Títulos financeiros
22. \`GET /webservice/v1/fn_acessos\` - Listar acessos

### 🛠️ SUPORTE/OSS (1 endpoint)
23. \`GET/POST /webservice/v1/su_oss_chamado\` - Ordens de serviço/chamados

### 🌐 INFRAESTRUTURA GPON (4 endpoints)
24. \`GET /webservice/v1/su_olt\` - Listar OLTs
25. \`GET /webservice/v1/su_olt_pon\` - Portas PON das OLTs
26. \`GET /webservice/v1/su_concentrador\` - Listar concentradores
27. \`GET/POST /webservice/v1/rastreador\` - Rastreamento

### 📱 COMUNICAÇÃO (2 endpoints)
28. \`POST /webservice/v1/botaoAjax_22282\` - Enviar SMS/Omnicanal
29. \`POST /webservice/v1/botao_rel_26658\` - Enviar notificação push

## 🎯 URL Base
\`https://seu-dominio.ixcsoft.com.br/webservice/v1/\`

## 🔐 Autenticação
- Método: Basic Auth
- Header GET: \`ixcsoft: listar\``,
      tags: ['api', 'resumo', 'endpoints', 'lista', 'consolidado'],
      display_order: -1
    },
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

  // Endpoints de Clientes (7 endpoints)
  const clienteEndpoints = [
    {
      name: 'Cliente - Gerenciar (GET/POST/PUT/DELETE)',
      category: 'ixc-cadastros',
      content: `# Cliente - Gerenciar

Endpoint: \`/webservice/v1/cliente\`
Métodos: GET, POST, PUT, DELETE

## GET - Listar Clientes
Header: \`ixcsoft: listar\`

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

## POST - Inserir Cliente
\`\`\`json
{
  "ativo": "S",
  "tipo_pessoa": "F",
  "razao": "Nome do Cliente",
  "cnpj_cpf": "12345678901",
  "contribuinte_icms": "N",
  "tipo_assinante": "1",
  "cep": "89814-680",
  "endereco": "Rua Exemplo",
  "numero": "100",
  "bairro": "Centro",
  "cidade": "1234",
  "uf": "2"
}
\`\`\`

## PUT - Atualizar Cliente
Endpoint: \`/webservice/v1/cliente/{id}\`
Enviar todos os campos, incluindo os não alterados.

## DELETE - Excluir Cliente
Endpoint: \`/webservice/v1/cliente/{id}\``,
      tags: ['cliente', 'cadastros', 'crud'],
      display_order: 10
    },
    {
      name: 'Cliente Arquivo - Upload',
      category: 'ixc-cadastros',
      content: `# Cliente Arquivo - Upload

Endpoint: \`/webservice/v1/cliente_arquivo\`
Método: POST

Faz upload de arquivo para um cliente específico.

## Exemplo
\`\`\`json
{
  "id_cliente": "1234",
  "arquivo": "base64_encoded_file",
  "nome_arquivo": "documento.pdf",
  "descricao": "Documento de identidade"
}
\`\`\``,
      tags: ['cliente', 'arquivo', 'upload'],
      display_order: 11
    },
    {
      name: 'Cliente Arquivos - Gerenciar',
      category: 'ixc-cadastros',
      content: `# Cliente Arquivos - Gerenciar

Endpoint: \`/webservice/v1/cliente_arquivos\`
Métodos: GET, POST, DELETE

## GET - Listar arquivos do cliente
\`\`\`json
{
  "qtype": "cliente_arquivos.id_cliente",
  "query": "1234",
  "oper": "="
}
\`\`\`

## POST - Adicionar arquivo
## DELETE - Remover arquivo
Endpoint: \`/webservice/v1/cliente_arquivos/{id}\``,
      tags: ['cliente', 'arquivos', 'documentos'],
      display_order: 12
    },
    {
      name: 'Consulta SPC/Serasa',
      category: 'ixc-cadastros',
      content: `# Consulta SPC/Serasa

Endpoint: \`/webservice/v1/consulta_spc_serasa\`
Método: POST

Consulta situação do cliente no SPC/Serasa.

## Exemplo
\`\`\`json
{
  "cpf_cnpj": "12345678901"
}
\`\`\`

## Resposta
Retorna status de negativação e score do cliente.`,
      tags: ['cliente', 'spc', 'serasa', 'credito'],
      display_order: 14
    },
    {
      name: 'Bloquear/Desbloquear SIP',
      category: 'ixc-cadastros',
      content: `# Bloquear/Desbloquear SIP

Endpoint: \`/webservice/v1/bloquear_desbloquear_sip\`
Método: POST

Bloqueia ou desbloqueia acesso SIP (telefonia) do cliente.

## Exemplo
\`\`\`json
{
  "id_cliente": "1234",
  "acao": "bloquear"
}
\`\`\`

Valores para ação: "bloquear" ou "desbloquear"`,
      tags: ['cliente', 'sip', 'telefonia', 'voip'],
      display_order: 15
    },
    {
      name: 'Reenviar Link Assinatura Digital',
      category: 'ixc-cadastros',
      content: `# Reenviar Link Assinatura Digital

Endpoint: \`/webservice/v1/reenviar_link_assinatura_digital\`
Método: POST

Reenvia link de assinatura digital do contrato para o cliente.

## Exemplo
\`\`\`json
{
  "id_contrato": "5678",
  "email": "cliente@email.com"
}
\`\`\``,
      tags: ['cliente', 'contrato', 'assinatura', 'digital'],
      display_order: 16
    }
  ];

  // Endpoints Financeiros (5 endpoints)
  const financeiroEndpoints = [
    {
      name: 'Títulos a Receber - Gerenciar',
      category: 'ixc-financeiro',
      content: `# Títulos a Receber

Endpoint: \`/webservice/v1/fn_areceber\`
Métodos: GET, POST

## GET - Listar Títulos
Header: \`ixcsoft: listar\`

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

## POST - Criar Título
\`\`\`json
{
  "id_cliente": "1234",
  "data_vencimento": "2025-10-15",
  "valor": "99.90",
  "descricao": "Mensalidade"
}
\`\`\``,
      tags: ['financeiro', 'titulos', 'boleto', 'receber'],
      display_order: 20
    },
    {
      name: 'Recebimentos e Baixas',
      category: 'ixc-financeiro',
      content: `# Recebimentos e Baixas

Endpoint: \`/webservice/v1/fn_areceber_recebimentos_baixas_novo\`
Método: POST

Registra recebimento/baixa de título financeiro.

## Exemplo
\`\`\`json
{
  "id_titulo": "5678",
  "data_recebimento": "2025-10-10",
  "valor_recebido": "99.90",
  "forma_pagamento": "PIX"
}
\`\`\`

## Formas de Pagamento
- DINHEIRO
- PIX
- CARTAO_CREDITO
- CARTAO_DEBITO
- BOLETO
- TRANSFERENCIA`,
      tags: ['financeiro', 'recebimento', 'baixa', 'pagamento'],
      display_order: 21
    },
    {
      name: 'Alterar Título a Receber',
      category: 'ixc-financeiro',
      content: `# Alterar Título a Receber

Endpoint: \`/webservice/v1/fn_areceber_altera\`
Método: POST

Altera informações de um título existente.

## Exemplo
\`\`\`json
{
  "id_titulo": "5678",
  "data_vencimento": "2025-10-20",
  "valor": "109.90",
  "observacao": "Valor atualizado"
}
\`\`\``,
      tags: ['financeiro', 'alterar', 'titulo'],
      display_order: 22
    },
    {
      name: 'Títulos Financeiros',
      category: 'ixc-financeiro',
      content: `# Títulos Financeiros

Endpoint: \`/webservice/v1/financeiro_titulo\`
Método: GET

Lista todos os títulos financeiros (contas a pagar e receber).

## Exemplo
\`\`\`json
{
  "qtype": "financeiro_titulo.tipo",
  "query": "R",
  "oper": "=",
  "page": "1",
  "rp": "100"
}
\`\`\`

## Tipos
- R - Receber
- P - Pagar`,
      tags: ['financeiro', 'titulos', 'contas'],
      display_order: 23
    },
    {
      name: 'Acessos Financeiros',
      category: 'ixc-financeiro',
      content: `# Acessos Financeiros

Endpoint: \`/webservice/v1/fn_acessos\`
Método: GET

Lista acessos/contratos com informações financeiras consolidadas.

## Exemplo
\`\`\`json
{
  "qtype": "fn_acessos.id_cliente",
  "query": "1234",
  "oper": "="
}
\`\`\`

Retorna informações de inadimplência, valor total, quantidade de títulos, etc.`,
      tags: ['financeiro', 'acessos', 'inadimplencia'],
      display_order: 24
    }
  ];

  // Endpoints de Contratos (10 endpoints)
  const contratoEndpoints = [
    {
      name: 'Contratos - Gerenciar',
      category: 'ixc-provedor',
      content: `# Contratos - Gerenciar

Endpoint: \`/webservice/v1/cliente_contrato\`
Métodos: GET, POST, PUT, DELETE

## GET - Listar Contratos
\`\`\`json
{
  "qtype": "cliente_contrato.id_cliente",
  "query": "1234",
  "oper": "="
}
\`\`\`

## POST - Criar Contrato
\`\`\`json
{
  "id_cliente": "1234",
  "id_plano": "567",
  "data_ativacao": "2025-10-01",
  "valor": "99.90"
}
\`\`\`

## PUT - Atualizar Contrato
Endpoint: \`/webservice/v1/cliente_contrato/{id}\`

## DELETE - Cancelar Contrato
Endpoint: \`/webservice/v1/cliente_contrato/{id}\``,
      tags: ['contratos', 'provedor', 'crud'],
      display_order: 30
    },
    {
      name: 'Descontos de Contratos',
      category: 'ixc-provedor',
      content: `# Descontos de Contratos

Endpoint: \`/webservice/v1/cliente_contrato_descontos\`
Métodos: GET, POST

## GET - Listar descontos
\`\`\`json
{
  "qtype": "cliente_contrato_descontos.id_contrato",
  "query": "5678",
  "oper": "="
}
\`\`\`

## POST - Adicionar desconto
\`\`\`json
{
  "id_contrato": "5678",
  "tipo_desconto": "P",
  "valor": "10.00",
  "descricao": "Desconto promocional"
}
\`\`\`

Tipos: P (Percentual) ou V (Valor fixo)`,
      tags: ['contratos', 'descontos', 'promocao'],
      display_order: 31
    },
    {
      name: 'Acréscimos de Contratos',
      category: 'ixc-provedor',
      content: `# Acréscimos de Contratos

Endpoint: \`/webservice/v1/cliente_contrato_acrescimos\`
Métodos: GET, POST

## GET - Listar acréscimos
\`\`\`json
{
  "qtype": "cliente_contrato_acrescimos.id_contrato",
  "query": "5678",
  "oper": "="
}
\`\`\`

## POST - Adicionar acréscimo
\`\`\`json
{
  "id_contrato": "5678",
  "tipo_acrescimo": "V",
  "valor": "20.00",
  "descricao": "Taxa de instalação"
}
\`\`\``,
      tags: ['contratos', 'acrescimos', 'taxas'],
      display_order: 32
    },
    {
      name: 'Serviços de Contratos',
      category: 'ixc-provedor',
      content: `# Serviços de Contratos

Endpoint: \`/webservice/v1/cliente_contrato_servicos\`
Métodos: GET, POST

Gerencia serviços adicionais vinculados ao contrato.

## GET - Listar serviços
\`\`\`json
{
  "qtype": "cliente_contrato_servicos.id_contrato",
  "query": "5678",
  "oper": "="
}
\`\`\`

## POST - Adicionar serviço
\`\`\`json
{
  "id_contrato": "5678",
  "id_servico": "123",
  "quantidade": "1"
}
\`\`\``,
      tags: ['contratos', 'servicos', 'adicionais'],
      display_order: 33
    },
    {
      name: 'Ativar Cliente',
      category: 'ixc-provedor',
      content: `# Ativar Cliente

Endpoint: \`/webservice/v1/cliente_contrato_ativar_cliente\`
Método: POST

Ativa o contrato do cliente e libera o acesso à internet.

## Exemplo
\`\`\`json
{
  "id_contrato": "5678",
  "data_ativacao": "2025-10-01"
}
\`\`\`

Gera credenciais de acesso e libera na rede.`,
      tags: ['contratos', 'ativar', 'liberacao'],
      display_order: 34
    },
    {
      name: 'Desativar/Cancelar Financeiro',
      category: 'ixc-provedor',
      content: `# Desativar/Cancelar Financeiro Não Vencido

Endpoint: \`/webservice/v1/desativar_cancelar_financeiro_nao_vencido\`
Método: POST

Cancela contrato e títulos financeiros não vencidos.

## Exemplo
\`\`\`json
{
  "id_contrato": "5678",
  "motivo": "Mudança de endereço",
  "cancelar_titulos": true
}
\`\`\``,
      tags: ['contratos', 'cancelar', 'desativar'],
      display_order: 35
    },
    {
      name: 'Negativar e Bloquear',
      category: 'ixc-provedor',
      content: `# Negativar e Bloquear

Endpoint: \`/webservice/v1/negativar_bloquear\`
Método: POST

Negativar contrato e bloquear acesso por inadimplência.

## Exemplo
\`\`\`json
{
  "id_contrato": "5678",
  "motivo": "Inadimplência"
}
\`\`\`

Bloqueia acesso à internet e registra negativação.`,
      tags: ['contratos', 'negativar', 'bloquear', 'inadimplencia'],
      display_order: 36
    },
    {
      name: 'Planos de Venda',
      category: 'ixc-provedor',
      content: `# Planos de Venda

Endpoint: \`/webservice/v1/vd_contratos\`
Método: GET

Lista todos os planos de venda disponíveis.

## Exemplo
\`\`\`json
{
  "qtype": "vd_contratos.ativo",
  "query": "S",
  "oper": "="
}
\`\`\`

## Campos
- id - ID do plano
- nome - Nome do plano
- valor - Valor mensal
- download - Velocidade download (Mbps)
- upload - Velocidade upload (Mbps)`,
      tags: ['planos', 'vendas', 'comercial'],
      display_order: 37
    },
    {
      name: 'Produtos de Planos',
      category: 'ixc-provedor',
      content: `# Produtos de Planos

Endpoint: \`/webservice/v1/vd_contratos_produtos\`
Método: GET

Lista produtos vinculados aos planos de venda.

## Exemplo
\`\`\`json
{
  "qtype": "vd_contratos_produtos.id_contrato",
  "query": "123",
  "oper": "="
}
\`\`\``,
      tags: ['planos', 'produtos', 'vendas'],
      display_order: 38
    },
    {
      name: 'Planos - Obter',
      category: 'ixc-provedor',
      content: `# Planos - Obter

Endpoint: \`/webservice/v1/plano\`
Método: GET

Lista planos técnicos configurados no sistema.

## Exemplo
\`\`\`json
{
  "qtype": "plano.id",
  "query": "1",
  "oper": ">="
}
\`\`\``,
      tags: ['planos', 'tecnicos', 'configuracao'],
      display_order: 39
    }
  ];

  // Endpoints de Suporte (1 endpoint)
  const suporteEndpoints = [
    {
      name: 'Ordens de Serviço - Gerenciar',
      category: 'ixc-suporte',
      content: `# Ordens de Serviço - Gerenciar

Endpoint: \`/webservice/v1/su_oss_chamado\`
Métodos: GET, POST

## GET - Listar OSS
\`\`\`json
{
  "qtype": "su_oss_chamado.status",
  "query": "A",
  "oper": "="
}
\`\`\`

## Status
- A - Aberto
- E - Em andamento
- F - Finalizado
- C - Cancelado

## POST - Criar OSS/Chamado
\`\`\`json
{
  "id_cliente": "1234",
  "id_assunto": "1",
  "descricao": "Cliente sem internet",
  "prioridade": "M"
}
\`\`\`

## Prioridades
- B - Baixa
- M - Média
- A - Alta
- U - Urgente`,
      tags: ['suporte', 'os', 'chamados', 'tickets'],
      display_order: 40
    }
  ];

  // Endpoints GPON (4 endpoints)
  const gponEndpoints = [
    {
      name: 'OLTs - Listar',
      category: 'ixc-infraestrutura',
      content: `# OLTs - Listar

Endpoint: \`/webservice/v1/su_olt\`
Método: GET

Lista todas as OLTs cadastradas no sistema.

## Exemplo
\`\`\`json
{
  "qtype": "su_olt.id",
  "query": "1",
  "oper": ">="
}
\`\`\`

## Campos
- id - ID da OLT
- nome - Nome/Identificação
- ip - Endereço IP
- marca - Fabricante
- modelo - Modelo do equipamento`,
      tags: ['gpon', 'olt', 'infraestrutura'],
      display_order: 50
    },
    {
      name: 'Portas PON',
      category: 'ixc-infraestrutura',
      content: `# Portas PON

Endpoint: \`/webservice/v1/su_olt_pon\`
Método: GET

Lista portas PON das OLTs com informações de utilização.

## Exemplo
\`\`\`json
{
  "qtype": "su_olt_pon.id_olt",
  "query": "123",
  "oper": "="
}
\`\`\`

## Informações retornadas
- Porta PON
- Status (UP/DOWN)
- Quantidade de ONUs conectadas
- Potência de sinal`,
      tags: ['gpon', 'pon', 'olt', 'portas'],
      display_order: 51
    },
    {
      name: 'Concentradores',
      category: 'ixc-infraestrutura',
      content: `# Concentradores

Endpoint: \`/webservice/v1/su_concentrador\`
Método: GET

Lista concentradores/switches da rede.

## Exemplo
\`\`\`json
{
  "qtype": "su_concentrador.ativo",
  "query": "S",
  "oper": "="
}
\`\`\``,
      tags: ['concentradores', 'switches', 'rede'],
      display_order: 52
    },
    {
      name: 'Rastreador',
      category: 'ixc-infraestrutura',
      content: `# Rastreador

Endpoint: \`/webservice/v1/rastreador\`
Métodos: GET, POST

Rastreamento de equipamentos na rede (ONUs, etc).

## GET - Consultar rastreamento
\`\`\`json
{
  "qtype": "rastreador.mac_address",
  "query": "AA:BB:CC:DD:EE:FF",
  "oper": "="
}
\`\`\`

## POST - Iniciar rastreamento
\`\`\`json
{
  "mac_address": "AA:BB:CC:DD:EE:FF"
}
\`\`\``,
      tags: ['rastreador', 'onu', 'localizacao'],
      display_order: 53
    }
  ];

  // Endpoints de Comunicação (2 endpoints)
  const comunicacaoEndpoints = [
    {
      name: 'Enviar SMS/Omnicanal',
      category: 'ixc-comunicacao',
      content: `# Enviar SMS/Omnicanal

Endpoint: \`/webservice/v1/botaoAjax_22282\`
Método: POST

Envia mensagens SMS ou via canais omnicanal para clientes.

## Exemplo
\`\`\`json
{
  "telefone": "47999999999",
  "mensagem": "Sua fatura está disponível",
  "id_cliente": "1234"
}
\`\`\``,
      tags: ['sms', 'omnicanal', 'comunicacao', 'mensagem'],
      display_order: 60
    },
    {
      name: 'Enviar Notificação Push',
      category: 'ixc-comunicacao',
      content: `# Enviar Notificação Push

Endpoint: \`/webservice/v1/botao_rel_26658\`
Método: POST

Envia notificação push para aplicativo do cliente.

## Exemplo
\`\`\`json
{
  "id_cliente": "1234",
  "titulo": "Nova Fatura",
  "mensagem": "Sua fatura está disponível",
  "tipo": "cobranca"
}
\`\`\``,
      tags: ['push', 'notificacao', 'app', 'comunicacao'],
      display_order: 61
    }
  ];

  // Combinar tudo (1 resumo + 3 categorias + 29 endpoints = 33 documentos)
  const allEndpoints = [
    ...categories,
    ...clienteEndpoints,
    ...financeiroEndpoints,
    ...contratoEndpoints,
    ...suporteEndpoints,
    ...gponEndpoints,
    ...comunicacaoEndpoints
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
