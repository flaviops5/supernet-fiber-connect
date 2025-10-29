# 📘 PR #13 - Sistema Anti-Fuga de Fluxo: Guia Operacional

> **Versão:** 1.0 (FINAL ✅)  
> **Data:** 2025-01-29  
> **Objetivo:** Eliminar loops infinitos causados por desvios de contexto do cliente

---

## 🎯 O Que É o Sistema Anti-Fuga?

O sistema detecta quando o cliente **desvia do fluxo esperado** (ex: pergunta sobre outro assunto quando deveria responder uma pergunta técnica) e toma ações progressivas:

1. **Aviso 1:** Redireciona gentilmente
2. **Aviso 2:** Reforça com contexto da última pergunta
3. **Aviso 3:** Transfere para atendente humano

---

## 🔍 Como Funciona (Técnico)

### Detecção de Fuga

O sistema identifica fuga quando:
- Cliente está em `waiting_step` ativo (ex: `scenario_a_check_los`)
- Mensagem do cliente NÃO contém palavras-chave esperadas
- Confiança do sistema híbrido < threshold

```typescript
// Exemplo de detecção
const isOffTopic = interpretation.confidence < 0.5 && 
                   !interpretation.expectedKeywordsFound;
```

### Estados Salvos

Campos em `agent_flow_states`:
- `context_warnings` (integer): Contador de avisos (0-3)
- `last_agent_question` (text): Última pergunta feita ao cliente
- `transferred_to_human` (boolean): Se foi transferido por fuga

### Logs Gerados

```sql
-- Aviso incrementado
SELECT * FROM registros_de_monitoramento 
WHERE acao = 'context_warning_increment';

-- Transferência por fuga
SELECT * FROM registros_de_monitoramento 
WHERE acao = 'context_escape_transfer';
```

---

## 📊 Quando Revisar Casos Transferidos

### Indicadores de Problema

Acesse o **Dashboard de Context Escape** em `/monitoramento`:

🚨 **Alerta Vermelho** (Ação Imediata):
- Taxa de fuga > 15%
- Mais de 10 fugas/dia no mesmo passo
- Tempo médio até fuga < 2 minutos

⚠️ **Alerta Amarelo** (Revisar em 48h):
- Taxa de fuga entre 10-15%
- Crescimento de 50%+ em 7 dias
- Cenário específico com taxa > 20%

✅ **Saúde Normal**:
- Taxa de fuga < 10%
- Distribuição equilibrada entre passos
- Sem crescimento súbito

### O Que Analisar

1. **Top 5 Passos Problemáticos**
   - Qual pergunta está confusa?
   - Contexto está claro para o cliente?
   - Palavras-chave de detecção estão corretas?

2. **Conversas Transferidas**
   - Ler últimas 10 conversas transferidas
   - Identificar padrões (ex: sempre no mesmo ponto)
   - Verificar se pergunta foi mal formulada

3. **Tempo Médio**
   - Se < 3 min: Cliente desiste rápido (UX ruim?)
   - Se > 10 min: Fluxo muito longo (simplificar?)

---

## ⚙️ Como Ajustar Thresholds

### Alterar Número de Avisos

📁 **Arquivo:** `supabase/functions/support-tech-agent/index.ts`

```typescript
// Linha ~2770-2840
// 🔧 Ajustar aqui os limites de avisos

if (warnings === 1) {  // ← Primeiro aviso (GENTIL)
  return await textReplyWithContext(...);
}

if (warnings === 2) {  // ← Segundo aviso (FIRME)
  return await textReplyWithContext(...);
}

if (warnings >= 3) {  // ← Transferir (FINAL)
  await updateFlowState(..., { transferred_to_human: true });
  ...
}
```

**Recomendações:**
- ✅ **Manter 3 avisos** para a maioria dos casos
- 🔄 **Testar 2 avisos** se clientes ficam irritados
- ⚠️ **Nunca usar 1 aviso** (transfere rápido demais)

### Alterar Taxa de Alerta

📁 **Arquivo:** `src/components/monitoring/ContextEscapeAnalytics.tsx`

```typescript
// Linha ~71
criticalAlert: avgRate > 15  // ← Threshold de 15%
```

**Valores Sugeridos:**
- **Conservador:** 10% (alerta mais cedo)
- **Padrão:** 15% (balanceado)
- **Tolerante:** 20% (menos alertas)

---

## 📈 Exemplos de Melhorias Baseadas em Análise

### Caso Real 1: Cenário A - Verificar LOS

**Problema Detectado:**
- 45 fugas em `scenario_a_check_los`
- Taxa de fuga: 22%
- Tempo médio: 2.5 min

**Análise:**
- Clientes não entendiam "LOS piscando"
- Pergunta muito técnica

**Solução Aplicada:**
```typescript
// ❌ ANTES
"A luz LOS está piscando?"

// ✅ DEPOIS (PR #14 - MediaGuided UX)
"🚨 A luz LOS (vermelha) está PISCANDO?"
+ media_context: "los_detected"  // Mostra foto
```

**Resultado:**
- Taxa de fuga: 22% → 8%
- Tempo médio: 2.5 → 4.2 min (cliente entende melhor)

---

### Caso Real 2: Cenário B - Pós-Reboot

**Problema Detectado:**
- 30 fugas em `scenario_b_post_reboot`
- Clientes perguntam "quanto tempo esperar?"

**Solução:**
```typescript
// ❌ ANTES
"Desligou e ligou o roteador?"

// ✅ DEPOIS
"Desligou e ligou o roteador da tomada?\n\n⏱️ Aguarde 1 minuto completo antes de me responder."
```

**Resultado:**
- Fugas: 30 → 12 (-60%)

---

## 🛠️ Manutenção Preventiva

### Checklist Semanal

- [ ] Acessar dashboard `/monitoramento`
- [ ] Verificar taxa de fuga semanal
- [ ] Revisar top 5 passos problemáticos
- [ ] Ler 5 conversas transferidas aleatórias
- [ ] Atualizar este documento com aprendizados

### Checklist Mensal

- [ ] Comparar taxa de fuga mês atual vs. anterior
- [ ] Identificar tendências de crescimento
- [ ] Revisar thresholds (aumentar/diminuir avisos?)
- [ ] Reunião de equipe para discutir melhorias
- [ ] Atualizar palavras-chave de detecção se necessário

---

## 🔗 Recursos Relacionados

- **Dashboard:** `/monitoramento` (componente `ContextEscapeAnalytics`)
- **Views SQL:** 
  - `context_escape_analysis` (tendências)
  - `top_escape_steps` (passos problemáticos)
- **Tabelas:**
  - `agent_flow_states` (estados e flags)
  - `conversations` (metadata com `transfer_reason`)
  - `registros_de_monitoramento` (logs de avisos)

---

## 📞 Suporte

**Dúvidas?** Consulte:
1. Este guia operacional
2. Dashboard de analytics
3. Código-fonte em `supabase/functions/support-tech-agent/index.ts` (linhas 2750-2860)

**Melhorias?** Documente aqui:
- Data da melhoria
- Problema identificado
- Solução aplicada
- Resultado medido

---

**Última atualização:** 2025-01-29  
**Próxima revisão:** 2025-02-29
