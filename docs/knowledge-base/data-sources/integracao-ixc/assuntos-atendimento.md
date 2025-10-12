# Assuntos de Atendimento IXC

## Visão Geral

O sistema integra-se com a API do IXC Soft para buscar dinamicamente os assuntos de atendimento disponíveis. Esses assuntos são utilizados ao criar novos tickets de suporte.

## Endpoint da API

**Endpoint**: `/webservice/v1/su_oss_assunto`

**Método**: POST

**Autenticação**: Basic Auth (IXC_API_USERNAME e IXC_API_PASSWORD)

## Estrutura de Dados

Cada assunto do IXC contém:

- **id**: ID único do assunto no IXC
- **assunto**: Nome/descrição do assunto
- **ativo**: Status do assunto ("Sim" ou "Não")

## Edge Function

A busca de assuntos é realizada pela edge function `ixc-list-subjects`:

```typescript
// Endpoint
POST /functions/v1/ixc-list-subjects

// Resposta
{
  "success": true,
  "data": [
    {
      "id": "25",
      "nome": "Instalação"
    },
    {
      "id": "1",
      "nome": "Suporte Técnico"
    }
  ],
  "total": 15
}
```

## Funcionalidades

### Busca Automática
- Os assuntos são buscados automaticamente ao abrir o diálogo de criação de atendimento
- Apenas assuntos ativos são exibidos
- Os assuntos são ordenados alfabeticamente

### Filtros Aplicados
- **Status**: Apenas assuntos com `ativo = "Sim"`
- **Ordenação**: Por nome do assunto (crescente)
- **Limite**: Até 100 assuntos por consulta

### Fluxos de Trabalho

Alguns assuntos disparam fluxos específicos no IXC:

- **Assunto ID 25 (Instalação)**: Dispara o workflow de instalação (id_wfl_processo: 11)

## Uso no Sistema

### Abertura de Atendimento

1. O agente clica em "Abrir Atendimento" no painel do cliente
2. Um diálogo é exibido com a lista de assuntos carregada do IXC
3. O agente seleciona o assunto apropriado
4. Adiciona observações (opcional)
5. Confirma a criação do atendimento

### Componentes Relacionados

- **OpenTicketDialog**: Componente que exibe o diálogo de seleção de assunto
- **ClientInfoPanel**: Contém os botões "Abrir Atendimento" e "Enviar PIX/Boleto"
- **ixc-list-subjects**: Edge function que busca os assuntos via **proxy IXC**
- **ixc-proxy**: Proxy centralizado para chamadas IXC com retry automático
- **ixc-integration**: Edge function que cria o atendimento e busca informações de pagamento

### Integração com Proxy IXC

A função `ixc-list-subjects` utiliza o **proxy IXC** através do `callIxcWithRetry` para garantir:
- Autenticação centralizada
- Retry automático com backoff exponencial
- Circuit breaker para proteção contra sobrecarga
- Logging unificado de requisições

**Parâmetros de busca**:
```json
{
  "qtype": "su_oss_assunto.id",
  "query": "1",
  "oper": ">=",
  "page": "1",
  "rp": "1000",
  "sortname": "su_oss_assunto.id",
  "sortorder": "desc"
}
```

**Filtros**: Retorna apenas assuntos com `ativo === 'Sim'` ou `ativo === 'S'`

## Tratamento de Erros

Se houver erro ao buscar os assuntos:
- Uma mensagem de erro é exibida ao usuário
- O campo de seleção fica desabilitado
- O botão de criar atendimento permanece desabilitado

## Nova Funcionalidade: Enviar PIX/Boleto

### Botão "Enviar PIX/Boleto"

**Localização**: ClientInfoPanel - Ações Rápidas

**Funcionalidade**: Busca títulos financeiros pendentes e exibe informações de pagamento

**Fluxo**:
1. Busca títulos pendentes do cliente via `getFinancialTitles`
2. Obtém QR Code PIX do primeiro título via `getPixQrCode`
3. Exibe modal com:
   - Valor e data de vencimento
   - PIX Copia e Cola (com botão copiar)
   - Código de barras (com botão copiar)
   - Links para boleto e página de pagamento
   - Mensagem pronta para WhatsApp (com botão copiar)

**Endpoint IXC**: `/fn_areceber_qrcode?id={titleId}`

## Configuração Necessária

Para que a busca de assuntos funcione, as seguintes variáveis de ambiente devem estar configuradas:

- `IXC_API_BASE_URL`: URL base da API do IXC
- `IXC_API_USERNAME`: Usuário de autenticação
- `IXC_API_PASSWORD`: Senha de autenticação

## Boas Práticas

1. **Cache**: A lista de assuntos é recarregada a cada vez que o diálogo é aberto (garante dados atualizados)
2. **Validação**: O botão de criar atendimento só é habilitado quando um assunto é selecionado
3. **Feedback**: Indicador de carregamento é exibido enquanto os assuntos são buscados
4. **Fallback**: Em caso de erro, o sistema notifica o usuário claramente

## Exemplos de Assuntos Comuns

Exemplos típicos de assuntos cadastrados no IXC:

- Instalação
- Suporte Técnico
- Financeiro
- Cancelamento
- Mudança de Endereço
- Upgrade de Plano
- Downgrade de Plano
- Reinstalação
- Manutenção Preventiva
- Reclamação
- Elogio/Sugestão

**Nota**: A lista real depende da configuração específica do IXC de cada provedor.
