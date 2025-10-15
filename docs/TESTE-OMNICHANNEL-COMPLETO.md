# Teste Completo do Sistema Omnichannel

## 🎯 Objetivo
Validar o fluxo completo de atendimento desde o contato inicial até o roteamento para o departamento correto, seguindo o fluxograma da Cloé Martins.

---

## 📋 Checklist Pré-Teste

### ✅ Verificações Iniciais
- [ ] Edge functions deployadas (`routing-agent`, `support-financial-agent`, `support-tech-agent`, `sales-agent`)
- [ ] Tabelas criadas (`conversations`, `conversation_messages`, `customer_contact_history`, etc.)
- [ ] Configurações de agentes cadastradas na tabela `agent_configurations`
- [ ] Agentes AI ativos (verificar `is_active = true`)

### 🔧 Configuração
- [ ] `LOVABLE_API_KEY` configurada (já vem por padrão)
- [ ] `IXC_API_BASE_URL`, `IXC_API_USERNAME`, `IXC_API_PASSWORD` configurados (para testes reais com IXC)

---

## 🧪 CPFs de Teste

O sistema possui **CPFs de teste** (mock data) para validar todos os cenários sem depender do IXC:

| CPF | Cenário | Roteamento Esperado |
|-----|---------|---------------------|
| `111.111.111-11` | Cliente OFFLINE + Sem Pendências | **Luan Silva** (Suporte Técnico) |
| `222.222.222-22` | Cliente OFFLINE + Com Pendências (Bloqueado) | **Julia Martins** (Financeiro) |
| `333.333.333-33` | Cliente ONLINE + Sem Pendências | **Cloé Martins** (aguarda intenção) |
| `444.444.444-44` | Cliente ONLINE + Com Pendências | **Julia Martins** (Financeiro) |
| `999.999.999-99` | Cliente Novo (não existe no IXC) | **Vicente** (Vendas) |

---

## 🔍 Cenários de Teste

### **Cenário 1: Cliente Offline - Suporte Técnico (com Reboot Híbrido)**
**CPF:** `111.111.111-11`

#### Passos:
1. Abrir o chat omnichannel
2. Cloé pergunta: "Olá! Sou a Cloé Martins 😊. Para começarmos, você poderia me informar seu CPF?"
3. Enviar: `111.111.111-11`
4. Sistema consulta histórico → valida no IXC (mock)
5. Detecta: Cliente OFFLINE, sem pendências, sem pane massiva

#### Resultado Esperado (Fluxo Híbrido):
```
✅ Cloé Martins: "Perfeito! Transferindo você para nosso Suporte Técnico. Um momento! ⏳"
📋 Protocolo: PROT-XXXXX

✅ Luan Silva: "Olá! Sou o Luan do suporte técnico. 
Vi aqui que sua internet está offline. Vou iniciar um reinício remoto do equipamento - isso leva cerca de 1 minuto... 🔄"

[~66 segundos depois, automaticamente]

✅ Luan Silva: "✅ Ótima notícia! Seu equipamento foi religado e já está ONLINE! 
Testa aí pra mim?"
```

#### Validações do Fluxo Híbrido:
- [ ] Cloé detecta OFFLINE e adiciona flag `suggestAutoReboot: true`
- [ ] Cloé transfere para Luan com flag `suggested_action: "auto_reboot"`
- [ ] Luan responde IMEDIATAMENTE (< 1s) ao cliente
- [ ] Luan executa `reboot-client-equipment` em BACKGROUND (não await)
- [ ] Cliente não fica esperando (experiência assíncrona)
- [ ] Após ~66s, Luan envia atualização automática com resultado
- [ ] Se ONLINE: mensagem de sucesso
- [ ] Se ainda OFFLINE: Luan continua troubleshooting manual
- [ ] Registro em `equipment_reboots` tabela

---

### **Cenário 2: Cliente Bloqueado - Financeiro**
**CPF:** `222.222.222-22`

#### Passos:
1. Abrir o chat omnichannel
2. Cloé pergunta CPF
3. Enviar: `222.222.222-22`
4. Sistema detecta: Cliente OFFLINE + BLOQUEADO (status_internet = 'CA')

#### Resultado Esperado:
```
✅ Cloé Martins: "Perfeito! Transferindo você para nosso Suporte Financeiro. Um momento! ⏳"
📋 Protocolo: PROT-XXXXX

✅ Julia Martins: "Olá! Identifiquei sua situação:
🌐 Status: OFFLINE
🔒 Acesso: BLOQUEADO (Cancelado por Atraso)

✅ Consegui desbloquear sua conexão! Teste já sua navegação.

📄 Para regularizar seu pagamento:
💵 Valor: R$ XX,XX
..."
```

#### Validações:
- [ ] Julia informa STATUS (OFFLINE + BLOQUEADO)
- [ ] Julia tenta desbloqueio automático
- [ ] Julia **SEMPRE** envia PIX/Boleto (mesmo se desbloqueio falhar)
- [ ] Atualiza `conversations.department = 'financeiro'`

---

### **Cenário 3: Cliente Online - Cloé Continua**
**CPF:** `333.333.333-33`

#### Passos:
1. Abrir o chat omnichannel
2. Cloé pergunta CPF
3. Enviar: `333.333.333-33`
4. Sistema detecta: Cliente ONLINE, sem pendências

#### Resultado Esperado:
```
✅ Cloé Martins: "Obrigado, [Nome]! Verifiquei aqui e está tudo certo com sua conexão. Como posso ajudá-lo?"
```

#### Validações:
- [ ] Cloé **NÃO** transfere automaticamente
- [ ] Aguarda próxima mensagem do cliente
- [ ] Analisa intenção para decidir próximo passo

---

### **Cenário 4: Cliente Novo - Vendas**
**CPF:** `999.999.999-99`

#### Passos:
1. Abrir o chat omnichannel
2. Cloé pergunta CPF
3. Enviar: `999.999.999-99`
4. Sistema **NÃO** encontra no IXC

#### Resultado Esperado:
```
✅ Cloé Martins: "Olá! Vejo que você ainda não é nosso cliente! Como posso ajudá-lo hoje?"
```

#### Validações:
- [ ] CPF registrado no `customer_contact_history` com `was_found_in_ixc = false`
- [ ] Após 3 tentativas falhadas, transfere para Vicente (Vendas)

---

### **Cenário 5: Validação Progressiva de CPF**
**Testar tentativas múltiplas com CPF inexistente**

#### Passos:
1. Enviar CPF inválido: `000.000.000-00`
2. Sistema responde: "CPF não encontrado. Você digitou corretamente?"
3. Enviar novamente: `000.000.000-00`
4. Sistema responde: "Tente informar novamente..."
5. Enviar pela 3ª vez: `000.000.000-00`

#### Resultado Esperado (3ª tentativa):
```
❌ "Não consegui localizar seu cadastro após várias tentativas.

🆕 Vou transferir você para um de nossos colaboradores que vai entrar em contato em breve. 🙏"
```

#### Validações:
- [ ] 1ª tentativa: Mensagem simples
- [ ] 2ª tentativa: Mensagem mais detalhada
- [ ] 3ª tentativa: Transfere para humano
- [ ] Todas as tentativas registradas em `customer_contact_history`

---

### **Cenário 6: Verificação de Queda em Massa**
**Testar se Cloé detecta mass outage antes de transferir para técnico**

#### Configuração (via SQL):
```sql
-- Criar evento de queda em massa ativo
INSERT INTO mass_outage_events (
  region_pattern, 
  affected_count, 
  status,
  affected_logins,
  metadata
) VALUES (
  'Região Centro',
  50,
  'active',
  ARRAY['test@pppoe', 'outro@pppoe'],
  '{"power_outage": true, "dying_gasp_count": 12}'::jsonb
);
```

#### Passos:
1. Enviar CPF `111.111.111-11` (cliente OFFLINE)
2. Sistema verifica se `pppoeLogin` está em `affected_logins`

#### Resultado Esperado (se afetado):
```
🚨 INTERRUPÇÃO EM MASSA DETECTADA

Identifiquei que você está afetado por uma interrupção na sua região (Região Centro).

📊 Situação atual:
• 50 clientes afetados
• Detectado em: [timestamp]
⚡ CAUSA IDENTIFICADA: Falta de energia na região confirmada por 12 equipamentos (Dying Gasp).

✅ Nossa equipe técnica já está trabalhando na solução.

O problema não é no seu equipamento individual.
```

#### Validações:
- [ ] Cloé **NÃO** transfere para Luan
- [ ] Informa queda em massa diretamente
- [ ] Encerra atendimento (`autoClose: true`)

---

## 🔍 Como Testar

### 1. **Abrir o Chat de Teste**
- Navegue para: `/admin` (ou página com OmnichannelChat)
- Componente: `<OmnichannelChat />`

### 2. **Monitorar Logs**
Abra o console do navegador (`F12 → Console`) e verifique:
```
🧭 Routing Agent started
📥 Message: [CPF redacted]
📊 Histórico de contatos: { hasHistory: false, contactCount: 0 }
CPF found in message: 11111111111
✅ Rate limit OK: X requests remaining
🧪 TEST CPF detected - using mock data
🧪 MOCK: Cliente OFFLINE - roteando para Luan (Suporte Técnico)
```

### 3. **Verificar Banco de Dados**
```sql
-- Ver conversas criadas
SELECT id, customer_name, customer_cpf, department, status, created_at 
FROM conversations 
ORDER BY created_at DESC LIMIT 5;

-- Ver mensagens
SELECT conversation_id, sender_name, content, created_at 
FROM conversation_messages 
WHERE conversation_id = 'UUID_DA_CONVERSA'
ORDER BY created_at;

-- Ver histórico de contatos
SELECT cpf, contact_reason, was_found_in_ixc, created_at, metadata
FROM customer_contact_history 
ORDER BY created_at DESC LIMIT 10;
```

### 4. **Verificar Edge Function Logs**
No Supabase Dashboard:
- Functions → `routing-agent` → Logs
- Buscar por: `correlation-id`, `CPF found`, `roteando para`

---

## ✅ Checklist de Validação Final

### Fluxo Cloé → IXC
- [ ] Cloé solicita CPF no início
- [ ] Sistema consulta `customer_contact_history` **ANTES** do IXC
- [ ] Sistema valida CPF no IXC (ou usa mock)
- [ ] Registra tentativa (sucesso/falha) no histórico

### Roteamento Automático
- [ ] Cliente BLOQUEADO → Julia (Financeiro)
- [ ] Cliente OFFLINE (não bloqueado) → Luan (Técnico)
- [ ] Cliente ONLINE → Cloé continua
- [ ] Cliente NOVO → Vicente (Vendas, após 3 tentativas)

### Julia (Financeiro)
- [ ] **SEMPRE** informa STATUS (ONLINE/OFFLINE + BLOQUEADO/LIBERADO)
- [ ] Tenta desbloqueio automático imediatamente
- [ ] **SEMPRE** envia PIX e Boleto (sucesso ou falha)

### Luan (Técnico)
- [ ] Verifica mass outage antes de diagnóstico individual
- [ ] Se afetado: Cloé informa diretamente (não transfere)
- [ ] Se não afetado: Luan executa troubleshooting

### Personalização
- [ ] Clientes recorrentes: "Que bom te ver de novo!"
- [ ] Clientes novos: Mensagem padrão
- [ ] Protocolos gerados: `PROT-XXXXX`

---

## 🚨 Problemas Comuns

### ❌ "Routing agent configuration not found"
**Solução:** Verificar se há registro ativo em `agent_configurations` com `agent_type = 'routing'`

### ❌ "LOVABLE_API_KEY is not configured"
**Solução:** Verificar secrets no Supabase (já deve estar configurado por padrão)

### ❌ Mensagens não aparecem no banco
**Solução:** Verificar RLS policies em `conversations` e `conversation_messages`

### ❌ CPF não validado
**Solução:** Verificar logs do `routing-agent` e validar formato do CPF

---

## 📊 KPIs de Sucesso

- [ ] **100% dos CPFs** são validados (formato correto)
- [ ] **100% dos contatos** registrados em `customer_contact_history`
- [ ] **100% dos roteamentos** seguem a lógica do fluxograma
- [ ] **0 erros** de configuração de agentes
- [ ] **< 2s** tempo de resposta do routing-agent

---

## 🎉 Conclusão

Se todos os cenários passaram, o sistema omnichannel está **funcionando corretamente** e pronto para produção (com IXC real)!

**Próximos Passos:**
1. Testar com IXC real (não mock)
2. Testar integração WhatsApp
3. Validar detecção de mass outage em produção
