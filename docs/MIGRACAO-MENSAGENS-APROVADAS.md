# 🔄 Migração de Mensagens Aprovadas

## ⚠️ AÇÃO NECESSÁRIA APÓS IMPLEMENTAÇÃO

### Problema Identificado

Após a implementação do sistema de mensagens aprovadas (23/10/2025), todas as aprovações antigas no banco têm `approved_messages: []` vazio porque foram feitas **antes** da migration que adicionou essa coluna.

**Resultado:** O Luan continua usando textos hardcoded mesmo com aprovações "approved" no banco.

### ✅ Solução (2 minutos)

Para começar a usar mensagens aprovadas:

1. **Acesse:** `/admin/testes` → Aba "Simulador de Fluxos Guiados"

2. **Escolha:** Qualquer cenário de **"Energia"** (ex: "Cenário A - Verificar Energia")

3. **Simule:** Faça uma conversa completa com o agente

4. **Aprove:** Clique em "✅ Aprovar esta variação"

5. **Pronto!** A partir desse momento, o Luan vai usar os textos aprovados ao invés dos hardcoded

### 🔍 Como Verificar se Funcionou

Depois de aprovar, faça um teste real:

1. Abra o chat do Luan (`/`)
2. Diga: "olá"
3. Forneça um CPF válido
4. Quando o Luan perguntar sobre as luzes, responda: "estão apagadas"
5. Ele vai perguntar sobre energia. Responda: "está ligado na tomada sim"

**Esperado:** A resposta deve ser o texto que você aprovou, não o hardcoded padrão.

### 📊 Query de Verificação

Para ver quais aprovações têm mensagens salvas:

```sql
SELECT 
  scenario_key,
  variation_path,
  status,
  CASE 
    WHEN approved_messages IS NULL OR approved_messages = '[]'::jsonb 
    THEN '❌ Vazio' 
    ELSE '✅ Tem mensagens' 
  END as tem_mensagens,
  created_at
FROM agent_flow_scenario_approvals
WHERE status = 'approved'
ORDER BY created_at DESC
LIMIT 10;
```

### 🎯 Cenários Prioritários para Reaprovar

Comece reaprovando variações destes cenários (mais usados):

1. **cenario_a_verificar_energia** ⚡
2. **cenario_a_verificar_luz_vermelha** 🔴
3. **cenario_a_aguardando_manipulacao** 🔧
4. **cenario_a_verificar_resultado_manipulacao** ✅

### 🔄 Não Precisa Reaprovar Tudo

- O sistema continua funcionando com os hardcoded como fallback
- Reaprove apenas os cenários que você quer customizar
- Priorize os cenários mais críticos/frequentes

### 📝 Logs para Monitorar

Após reaprovar, monitore os logs da edge function `support-tech-agent`:

```
🎯 Usando texto aprovado para verificar_luz_vermelha
{
  "conversation_id": "...",
  "usando_aprovado": true  // ← Deve ser true!
}
```

Se aparecer `usando_aprovado: false`, significa que ainda não há mensagens aprovadas salvas para aquele step específico.

### 🚨 Troubleshooting

**Problema:** Mesmo depois de reaprovar, continua usando hardcoded

**Possíveis causas:**
1. Cache de 5 minutos (aguarde ou force limpeza)
2. Aprovação de um scenario_key diferente do esperado
3. Step key não está mapeado no código

**Verificar:** 
```sql
-- Ver a última aprovação com mensagens
SELECT * FROM agent_flow_scenario_approvals 
WHERE approved_messages IS NOT NULL 
AND approved_messages != '[]'::jsonb
ORDER BY created_at DESC 
LIMIT 1;
```

### 📞 Suporte

Se após reaprovar ainda não funcionar, verifique:
- Logs da edge function `support-tech-agent`
- Console do navegador (erros JS)
- Network tab (chamadas à API)

---

**Data da Migration:** 23/10/2025  
**Responsável:** Sistema automatizado  
**Status:** ✅ Implementado - Aguardando reaprovações
