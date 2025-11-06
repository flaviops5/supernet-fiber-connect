# 🎯 Guia: Primeiro Atendimento Real com IXC

**Objetivo:** Executar um atendimento real usando seus dados cadastrados no IXC, validando todo o fluxo omnichannel do sistema.

---

## ✅ Pré-Requisitos

### 1. **Edge Functions Deployadas**

Verifique se as edge functions estão deployadas no Supabase:

```bash
# Se você tem Supabase CLI instalado localmente:
supabase functions list

# Ou verifique no dashboard:
# https://supabase.com/dashboard/project/mxdupkbpxjcfxdgrwknp/functions
```

**Edge Functions necessárias:**
- ✅ `routing-agent` - Roteamento inteligente
- ✅ `support-tech-agent` - Suporte técnico (Luan)
- ✅ `support-financial-agent` - Financeiro (Julia)
- ✅ `sales-agent` - Comercial (Vicente)
- ✅ `ixc-integration` - Integração IXC
- ✅ `mass-outage-detector` - Detector de pane massiva
- ✅ `cloe-agent` - Atendente virtual Cloé

**Como deployar (se necessário):**
```bash
# Deploy individual
supabase functions deploy routing-agent

# Deploy todas de uma vez
supabase functions deploy
```

---

### 2. **Secrets Configurados**

Verifique se os secrets estão configurados no Supabase:

**Secrets obrigatórios:**

| Secret | Descrição | Como obter |
|--------|-----------|------------|
| `IXC_API_URL` | URL da API IXC | Ex: `https://seudominio.ixcsoft.com.br/webservice/v1` |
| `IXC_API_TOKEN` | Token de autenticação IXC | Painel IXC → Configurações → API |
| `LOVABLE_API_KEY` | Chave Lovable AI (auto-gerada) | Já configurado automaticamente |

**Verificar secrets:**
1. Acesse: https://supabase.com/dashboard/project/mxdupkbpxjcfxdgrwknp/settings/functions
2. Confirme que `IXC_API_URL` e `IXC_API_TOKEN` estão listados
3. Se ausentes, adicione-os clicando em "Add Secret"

**⚠️ IMPORTANTE:** Sem `IXC_API_URL` e `IXC_API_TOKEN` o sistema não conseguirá buscar dados do cliente!

---

### 3. **Banco de Dados Configurado**

Verifique se as tabelas principais existem:

```sql
-- Execute no SQL Editor do Supabase:
-- https://supabase.com/dashboard/project/mxdupkbpxjcfxdgrwknp/sql/new

SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'conversations',
  'conversation_messages',
  'customer_contact_history',
  'agent_presence',
  'mass_outage_events'
);
```

**Resultado esperado:** 5 tabelas encontradas

---

### 4. **Seu CPF Cadastrado no IXC**

Confirme que você está cadastrado como cliente:
- CPF: `[SEU_CPF]`
- Status: Ativo ou Bloqueado (para testar financeiro)
- Conexão: Online ou Offline (para testar técnico)

---

## 📝 Passo-a-Passo do Atendimento Real

### **PASSO 1: Acessar Interface de Atendimento**

1. No navegador, acesse: `http://localhost:5173/atendimento`
2. Faça login com usuário `admin` ou `editor`
3. Você verá 3 colunas:
   - **Esquerda:** Fila de conversas
   - **Centro:** Área de chat
   - **Direita:** Informações do agente e cliente

---

### **PASSO 2: Configurar Seu Departamento**

1. No topo da página, selecione seu departamento:
   - **Comercial** → Para novos clientes / vendas
   - **Técnico** → Para problemas de conexão
   - **Financeiro** → Para pendências de pagamento
   - **Administrativo** → Geral

2. Seu status será definido como **"Online"** automaticamente

---

### **PASSO 3: Iniciar Conversa Real**

#### **Opção A: Usar o SendRealMessageButton (Recomendado)**

1. Clique no botão **"Enviar Mensagem Real"** no topo
2. Um modal será aberto
3. Digite uma mensagem inicial, por exemplo:
   ```
   Olá, meu CPF é 123.456.789-10
   ```
4. Clique em **"Enviar Mensagem Real"**

#### **Opção B: Abrir Chat Omnichannel (Público)**

1. Abra uma aba anônima no navegador
2. Acesse: `http://localhost:5173/`
3. Clique no ícone de chat no canto inferior direito
4. Digite seu CPF no chat

---

### **PASSO 4: Acompanhar o Roteamento**

Após enviar seu CPF, o sistema irá:

1. **Validar CPF** (usando `validateAndMaskCPF`)
2. **Buscar dados no IXC** (via `ixc-integration`)
3. **Determinar status:**
   - Cliente bloqueado → Rota para **Financeiro (Julia)**
   - Cliente offline → Rota para **Técnico (Luan)**
   - Cliente online → Continua com **Cloé**
   - Cliente não encontrado → Rota para **Comercial (Vicente)**

4. **Verificar pane em massa** (opcional, se houver outage ativo)

**Logs para acompanhar:**
- Console do navegador (F12)
- Logs do Supabase: https://supabase.com/dashboard/project/mxdupkbpxjcfxdgrwknp/functions/routing-agent/logs

---

### **PASSO 5: Validar Dados do Cliente**

Na interface `/atendimento`, verifique o painel **"Cliente"** (direita):

✅ **Deve mostrar:**
- Nome completo
- CPF mascarado (`***.***.***-10`)
- Email (se disponível no IXC)
- Status de conexão (Online/Offline)
- Protocolo de atendimento (gerado automaticamente)

---

### **PASSO 6: Interagir com o Agente AI**

1. Digite mensagens como um cliente real:
   ```
   Minha internet está lenta
   ```
   
2. O agente correto responderá:
   - **Luan (Técnico):** Diagnóstico de conexão, reboot, TX/RX
   - **Julia (Financeiro):** Pendências, boletos, negociação
   - **Vicente (Comercial):** Planos, upgrade, cobertura
   - **Cloé:** Informações gerais, roteamento

3. Observe as respostas sendo geradas em tempo real

---

### **PASSO 7: Validar Tools Chamados**

Durante o atendimento, verifique no console do navegador se os tools foram chamados:

**Tools esperados:**
- `ixc_client_lookup` → Buscar dados do cliente
- `get_onu_signal_status` → Consultar TX/RX (técnico)
- `reboot_client_equipment` → Reiniciar equipamento (técnico)
- `criar_atendimento_ixc` → Criar chamado no IXC (técnico/financeiro)

---

### **PASSO 8: Finalizar Atendimento**

1. Resolva o problema do cliente
2. Confirme que o protocolo foi salvo
3. Status da conversa deve mudar de `active` → `resolved`

---

## 🔍 Validação dos Resultados

Execute estas queries no SQL Editor para confirmar:

### **1. Verificar conversa criada**
```sql
SELECT 
  id,
  customer_name,
  customer_cpf,
  status,
  department,
  protocol,
  created_at
FROM conversations
ORDER BY created_at DESC
LIMIT 5;
```

### **2. Verificar mensagens trocadas**
```sql
SELECT 
  c.protocol,
  m.sender,
  LEFT(m.content, 100) as message_preview,
  m.timestamp
FROM conversation_messages m
JOIN conversations c ON c.id = m.conversation_id
WHERE c.protocol = '[SEU_PROTOCOLO]'
ORDER BY m.timestamp;
```

### **3. Verificar histórico de contatos**
```sql
SELECT 
  customer_cpf,
  customer_name,
  ixc_client_id,
  last_interaction,
  total_interactions
FROM customer_contact_history
WHERE customer_cpf = '[SEU_CPF]'
LIMIT 1;
```

### **4. Verificar logs de monitoramento**
```sql
SELECT 
  acao,
  agente,
  detalhes,
  created_at
FROM registros_de_monitoramento
WHERE created_at >= NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 20;
```

---

## 🚨 Troubleshooting

### **Problema 1: CPF não encontrado no IXC**

**Sintoma:** Mensagem "Cliente não encontrado"

**Possíveis causas:**
1. CPF não cadastrado no IXC
2. `IXC_API_TOKEN` inválido ou expirado
3. `IXC_API_URL` incorreta

**Solução:**
```bash
# Testar manualmente a API IXC
curl -X POST "https://seudominio.ixcsoft.com.br/webservice/v1/cliente" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"qtype":"cliente.cnpj_cpf","query":"12345678910"}'
```

---

### **Problema 2: Edge Functions não respondem**

**Sintoma:** Timeout ou erro 500

**Verificar:**
1. Edge functions deployadas:
   ```bash
   supabase functions list
   ```

2. Logs de erro:
   - https://supabase.com/dashboard/project/mxdupkbpxjcfxdgrwknp/functions/routing-agent/logs

3. Secrets configurados:
   - https://supabase.com/dashboard/project/mxdupkbpxjcfxdgrwknp/settings/functions

**Solução:**
```bash
# Re-deploy da função
supabase functions deploy routing-agent --project-ref mxdupkbpxjcfxdgrwknp
```

---

### **Problema 3: Conversa não aparece na fila**

**Sintoma:** Mensagem enviada mas não aparece em `/atendimento`

**Verificar:**
1. Status da conversa:
   ```sql
   SELECT status FROM conversations ORDER BY created_at DESC LIMIT 1;
   ```

2. Filtro de departamento (dropdown no topo da página)

3. RLS policies ativas:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'conversations';
   ```

**Solução:**
- Verifique se você está no departamento correto
- Confirme que está logado como `admin` ou `editor`

---

### **Problema 4: Agente AI não responde**

**Sintoma:** Mensagem enviada mas sem resposta

**Verificar:**
1. `LOVABLE_API_KEY` configurado (auto-gerado)
2. Logs da edge function correspondente
3. Rate limit do Lovable AI (429 error)

**Solução:**
```sql
-- Verificar última mensagem enviada
SELECT * FROM conversation_messages 
WHERE sender = 'agent' 
ORDER BY timestamp DESC 
LIMIT 1;
```

Se não houver mensagens de agente, verifique logs:
- https://supabase.com/dashboard/project/mxdupkbpxjcfxdgrwknp/functions/support-tech-agent/logs

---

### **Problema 5: Dados do cliente não aparecem no painel**

**Sintoma:** Painel direito vazio ou "Carregando..."

**Verificar:**
1. `conversationId` selecionado na fila
2. Permissões RLS da tabela `conversations`
3. Integração IXC retornando dados

**Solução:**
```sql
-- Verificar metadata da conversa
SELECT metadata FROM conversations 
WHERE id = '[CONVERSATION_ID]';
```

---

## 📊 Métricas de Sucesso

Após o atendimento, confirme:

- ✅ CPF validado e cliente identificado
- ✅ Dados do IXC carregados corretamente
- ✅ Roteamento correto (técnico/financeiro/comercial)
- ✅ Protocolo gerado automaticamente
- ✅ Histórico de mensagens salvo
- ✅ Status da conversa atualizado
- ✅ Logs de monitoramento registrados

---

## 🎉 Próximos Passos

Após validar o atendimento real:

1. **FASE 8 - Deploy Coordenado:**
   - Execute health checks
   - Valide smoke tests
   - Documente métricas

2. **FASE 9 - Ativação Progressiva:**
   - Configure feature flags
   - Ative gradualmente (10% → 50% → 100%)
   - Monitore KPIs em tempo real

3. **GO-LIVE Oficial:**
   - Anuncie aos clientes
   - Ative monitoramento 24/7
   - Prepare equipe de suporte

---

## 📚 Documentação Relacionada

- [Fluxo Diagnóstico Offline](./FLUXO-DIAGNOSTICO-OFFLINE-CONSOLIDADO.md)
- [Teste Omnichannel Completo](./TESTE-OMNICHANNEL-COMPLETO.md)
- [FASE 8: Deploy Coordenado](./GO-LIVE-FASE-8.md)
- [FASE 9: Ativação Progressiva](./GO-LIVE-FASE-9.md)

---

## 🆘 Suporte

**Em caso de dúvidas ou problemas:**
1. Consulte os logs do Supabase
2. Verifique a documentação completa
3. Execute queries de diagnóstico SQL
4. Contate o time de desenvolvimento

---

**Última atualização:** 2025-01-06  
**Versão:** 1.0.0  
**Status:** ✅ Pronto para uso
