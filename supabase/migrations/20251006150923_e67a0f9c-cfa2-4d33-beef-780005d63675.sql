-- Inserir informações sobre configuração de telemedicina no banco de conhecimento

INSERT INTO public.knowledge_base (
  title,
  content,
  content_type,
  category,
  tags,
  is_active,
  agent_types
) VALUES 
(
  'Configuração Telemedicina - IXC API',
  '# Configuração da API IXC para Telemedicina

## URL Base da API
A URL base da API IXC deve sempre incluir o protocolo HTTPS:
- **Correto**: https://central.supernetfibra.com.br
- **Incorreto**: central.supernetfibra.com.br (sem https://)

## Secrets Necessários
Para funcionamento completo do sistema de telemedicina, os seguintes secrets devem estar configurados no Supabase:

1. **IXC_API_BASE_URL**: https://central.supernetfibra.com.br
2. **IXC_API_USERNAME**: Usuário de autenticação na API IXC
3. **IXC_API_PASSWORD**: Senha de autenticação na API IXC

## Como Funciona a Autenticação
A autenticação de telemedicina funciona através da edge function `telemedicina-auth`:

1. Cliente envia CPF e senha
2. Sistema limpa o CPF (remove caracteres especiais)
3. Busca o cliente na API IXC usando o CPF
4. Verifica se o cliente possui contrato ativo com plano "TELEMEDICINA"
5. Gera URL de acesso à telemedicina
6. Registra o acesso no histórico

## Verificação de Plano
O sistema busca por contratos que contenham a palavra "TELEMEDICINA" no nome do plano. Se encontrado, o acesso é liberado.

## Troubleshooting Comum
- **Erro "Invalid URL"**: Verifica se IXC_API_BASE_URL inclui https://
- **Cliente não encontrado**: Verifica se CPF está correto e cadastrado no IXC
- **Sem acesso**: Cliente não possui plano de telemedicina ativo',
  'document',
  'telemedicina',
  ARRAY['telemedicina', 'ixc', 'api', 'configuração', 'autenticação'],
  true,
  ARRAY['telemedicina', 'support_tech']
),
(
  'Informações sobre Planos de Telemedicina',
  '# Planos de Telemedicina

## Descrição do Serviço
A Supernet oferece serviço de telemedicina integrado aos planos de internet. Clientes com plano de telemedicina ativo têm acesso a consultas médicas online.

## Como Acessar
1. Acesse a página de telemedicina no site da Supernet
2. Faça login com seu CPF e senha (mesma senha do IXC)
3. Após autenticação, você será redirecionado para o portal de telemedicina

## Requisitos
- Ter um plano ativo que inclua telemedicina
- CPF cadastrado no sistema IXC
- Senha configurada

## Especialidades Disponíveis
O serviço de telemedicina oferece acesso a diversas especialidades médicas através de videoconsulta.

## Suporte
Para problemas com acesso ou dúvidas sobre o serviço, entre em contato com o suporte técnico da Supernet.',
  'document',
  'telemedicina',
  ARRAY['telemedicina', 'planos', 'serviços', 'clientes'],
  true,
  ARRAY['sales', 'support_financial', 'telemedicina']
),
(
  'Edge Functions - Telemedicina',
  '# Edge Functions de Telemedicina

## telemedicina-auth
**Função**: Autenticação de clientes para acesso ao portal de telemedicina

**Endpoint**: `/telemedicina-auth`

**Método**: POST

**Payload**:
```json
{
  "cpf": "12345678900",
  "password": "senha_cliente"
}
```

**Resposta de Sucesso**:
```json
{
  "success": true,
  "user": {
    "id": "123",
    "name": "Nome do Cliente",
    "cpf": "123.456.789-00",
    "email": "cliente@email.com"
  },
  "telemedicinaUrl": "https://portal-telemedicina.com/access?token=xxx"
}
```

**Resposta de Erro**:
```json
{
  "error": "Cliente não encontrado ou sem plano de telemedicina ativo"
}
```

## telemedicina-agent
**Função**: Agente de IA para suporte e informações sobre telemedicina

**Endpoint**: `/telemedicina-agent`

**Método**: POST

**Características**:
- Responde dúvidas sobre o serviço de telemedicina
- Fornece informações sobre especialidades
- Orienta sobre como acessar o serviço
- Integrado com Lovable AI Gateway

## Secrets Utilizados
- `IXC_API_BASE_URL`: URL da API IXC
- `IXC_API_USERNAME`: Usuário API IXC
- `IXC_API_PASSWORD`: Senha API IXC
- `LOVABLE_API_KEY`: Chave para AI Gateway',
  'document',
  'telemedicina',
  ARRAY['telemedicina', 'edge-functions', 'api', 'desenvolvimento'],
  true,
  ARRAY['telemedicina', 'support_tech']
),
(
  'Segurança e Rate Limiting - Sistema Geral',
  '# Segurança e Rate Limiting

## Rate Limiting Implementado
O sistema possui rate limiting para proteger contra abuso:

### Hooks Disponíveis
- `useRateLimit`: Controle de taxa de requisições
- `useSecurityLog`: Registro de eventos de segurança
- `useRobustValidation`: Validação robusta com segurança integrada

### Configuração de Rate Limit
```typescript
const { checkRateLimit } = useRateLimit();

const result = await checkRateLimit(
  "login_attempt",  // Tipo de ação
  5,                // Máximo de tentativas
  15,               // Janela de tempo (minutos)
  60                // Tempo de bloqueio (minutos)
);
```

## Logs de Segurança
Todos os eventos críticos são registrados:
- Tentativas de login
- Alterações de senha
- Validações falhas
- Acessos não autorizados
- Rate limit excedido

## Validação de Dados
- Validação de CPF
- Sanitização de inputs
- Proteção contra XSS
- Proteção contra SQL injection (via RLS)

## Monitoramento
Logs estão disponíveis na tabela `security_logs` do Supabase para auditoria e análise.',
  'document',
  'segurança',
  ARRAY['segurança', 'rate-limiting', 'validação', 'logs'],
  true,
  ARRAY['support_tech']
);