-- Inserir documentação IXC na base de conhecimento
INSERT INTO knowledge_base (title, category, content_type, content, tags, is_active)
VALUES 
  ('IXC API - Listar Clientes', 'ixc-api', 'document', 
   '# Endpoint: /cliente (POST)

## Descrição
Lista todos os clientes cadastrados no sistema IXC ERP.

## Parâmetros
- **page**: Número da página (string)
- **rp**: Registros por página (string)
- **sortname**: Campo para ordenação (ex: cliente.razao)
- **sortorder**: Ordem de ordenação (asc ou desc)
- **qtype**: Tipo de consulta (ex: cliente.razao)
- **query**: Valor para busca (string)
- **oper**: Operador de busca: = (igual), L (like)

## Request Body Exemplo
```json
{
  "page": "1",
  "rp": "50",
  "sortname": "cliente.razao",
  "sortorder": "asc"
}
```

## Response Exemplo
```json
{
  "page": "1",
  "total": 1555,
  "registros": [
    {
      "id": "2119",
      "razao": "Nome do Cliente",
      "fantasia": "Nome Fantasia",
      "cnpj_cpf": "000.000.000-00",
      "email": "cliente@email.com",
      "telefone_celular": "(11) 99999-9999",
      "endereco": "Endereço do cliente",
      "cidade": "1234",
      "uf": "SP",
      "cep": "00000-000"
    }
  ]
}
```', 
   ARRAY['ixc', 'api', 'clientes', 'erp', 'integração'], true),
   
  ('IXC API - Listar Contratos', 'ixc-api', 'document',
   '# Endpoint: /contratos (POST)

## Descrição
Lista todos os contratos ativos e inativos do sistema IXC ERP.

## Parâmetros
- **page**: Número da página (string)
- **rp**: Registros por página (string)
- **cliente_id**: ID do cliente para filtrar contratos (string)

## Uso
Este endpoint permite consultar contratos de clientes, incluindo dados como planos contratados, status, valores e datas de vigência.',
   ARRAY['ixc', 'api', 'contratos', 'erp'], true),
   
  ('IXC API - Contas a Receber', 'ixc-api', 'document',
   '# Endpoint: /contas_receber (POST)

## Descrição
Lista as contas a receber do sistema IXC ERP, permitindo consultar faturas e débitos de clientes.

## Parâmetros
- **page**: Número da página (string)
- **rp**: Registros por página (string)
- **cliente_id**: ID do cliente para filtrar (string)

## Uso
Útil para verificar situação financeira de clientes, valores em aberto, vencimentos e histórico de pagamentos.',
   ARRAY['ixc', 'api', 'financeiro', 'contas', 'erp'], true),
   
  ('IXC API - Listar Planos', 'ixc-api', 'document',
   '# Endpoint: /planos (POST)

## Descrição
Lista todos os planos de serviço disponíveis no sistema IXC ERP.

## Parâmetros
- **page**: Número da página (string)
- **rp**: Registros por página (string)

## Uso
Retorna informações sobre planos de internet, incluindo velocidades, valores, características e disponibilidade.',
   ARRAY['ixc', 'api', 'planos', 'produtos', 'erp'], true),
   
  ('IXC API - Movimentações do Caixa', 'ixc-api', 'document',
   '# Endpoint: /caixa (POST)

## Descrição
Lista as movimentações financeiras do caixa no sistema IXC ERP.

## Parâmetros
- **page**: Número da página (string)
- **rp**: Registros por página (string)
- **data_inicio**: Data inicial do período (date)
- **data_fim**: Data final do período (date)

## Uso
Permite consultar entradas e saídas financeiras, útil para conciliação bancária e relatórios gerenciais.',
   ARRAY['ixc', 'api', 'financeiro', 'caixa', 'erp'], true),
   
  ('IXC API - Produtos/Serviços dos Contratos', 'ixc-api', 'document',
   '# Endpoint: /su_oss_chamado (POST)

## Descrição
Lista produtos e serviços vinculados aos contratos dos clientes, como Telemedicina, Antivírus, serviços adicionais, etc.

## Parâmetros
- **page**: Número da página (string)
- **rp**: Registros por página (string, recomendado: "100")
- **qtype**: Tipo de consulta (ex: "su_oss_chamado.id")
- **query**: Valor para busca (string)
- **oper**: Operador: = (igual), >= (maior ou igual)
- **grid_param**: Filtro avançado em formato JSON para filtrar por id_cliente_contrato

## Request Body Exemplo
```json
{
  "page": "1",
  "rp": "100",
  "qtype": "su_oss_chamado.id",
  "query": "1",
  "oper": ">=",
  "sortname": "su_oss_chamado.id",
  "sortorder": "desc",
  "grid_param": "[{\"TB\":\"su_oss_chamado.id_cliente_contrato\",\"OP\":\"=\",\"P\":\"12345\"}]"
}
```

## Response Exemplo
```json
{
  "page": "1",
  "total": 2,
  "registros": [
    {
      "id": "1001",
      "id_cliente_contrato": "12345",
      "descricao": "Telemedicina Premium",
      "valor": "49.90",
      "status": "Ativo",
      "tipo_produto": "Serviço Adicional"
    },
    {
      "id": "1002",
      "id_cliente_contrato": "12345",
      "descricao": "Antivírus Kaspersky",
      "valor": "19.90",
      "status": "Ativo",
      "tipo_produto": "Serviço Adicional"
    }
  ]
}
```

## Observações
- Use grid_param para filtrar produtos de um contrato específico
- O endpoint pode retornar diversos tipos de produtos: Telemedicina, Antivírus, suporte técnico, etc.',
   ARRAY['ixc', 'api', 'contratos', 'produtos', 'telemedicina', 'serviços', 'erp'], true);