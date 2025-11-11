# Testes de Equivalência - Cenários Refatorados

## 🎯 Objetivo

Garantir que os cenários refatorados (A, B, C, D, E) produzem resultados **idênticos** ao código inline original, validando a refatoração antes do rollout em produção.

## 🧪 Como Executar

### Localmente (Deno)

```bash
cd supabase/functions/support-tech-agent

# Executar todos os testes
deno test --allow-net --allow-env tests/scenario-equivalence.test.ts

# Executar teste específico
deno test --allow-net --allow-env tests/scenario-equivalence.test.ts --filter "Cenário A"
```

### CI/CD (GitHub Actions)

Os testes rodam automaticamente em cada push para validar as mudanças.

## 📋 Cobertura de Testes

### ✅ Testes Implementados

| Cenário | Descrição | Status |
|---------|-----------|--------|
| A | Verificação de energia (TX/RX = 0) | ✅ |
| B | Fast-path com sinal bom | ✅ |
| C | Detecção de sinal fraco | ✅ |
| D | RX crítico - escalação | ✅ |
| E | Diagnóstico WAN/Wi-Fi | ✅ |
| Adapter | Conversão inline → refactored | ✅ |
| Feature Flag | Rollout gradual | ✅ |

## 🔍 O Que é Testado

### 1. Lógica de Detecção
- Cenário A detecta corretamente TX/RX = 0.00
- Cenário B ativa fast-path quando elegível
- Cenário C identifica sinal fraco (-24 a -28 dBm)
- Cenário D detecta RX crítico (< -28 dBm)
- Cenário E diagnostica problemas WAN/Wi-Fi

### 2. Estrutura de Resposta
- Mensagem gerada é string válida
- Flow updates estão presentes
- Flags de escalação corretas
- Próximo step definido

### 3. Context Adapter
- Conversão inline → refactored preserva dados
- Validação detecta contexto incompleto
- Nomenclatura (snake_case vs camelCase) correta

### 4. Feature Flags
- Rollout gradual funciona
- Hash determinístico por conversation_id
- Safe defaults em caso de erro

## 🚨 Critérios de Aceitação

Antes de aumentar o rollout, todos os testes devem:

✅ Passar sem erros  
✅ Validar estrutura de resposta  
✅ Confirmar lógica de decisão  
✅ Testar edge cases  

## 📊 Próximos Passos

### Testes Adicionais Recomendados

1. **Testes de Integração**
   - Testar fluxo completo end-to-end
   - Validar com banco de dados real
   - Simular edge functions reais

2. **Testes de Performance**
   - Comparar tempo de execução refactored vs inline
   - Medir uso de memória
   - Stress test com alta concorrência

3. **Testes de Regressão**
   - Validar backward compatibility
   - Testar migração de flow_state
   - Garantir zero data loss

## 🐛 Reportar Problemas

Se algum teste falhar:

1. Verificar logs detalhados
2. Comparar output refactored vs inline
3. Abrir issue com reprodução mínima
4. Bloquear rollout até correção

## 📚 Referências

- [Fase 1: Extração de Módulos](../docs/PHASE1-COMPLETE.md)
- [Fase 2: Feature Flag](../docs/PHASE2-COMPLETE.md)
- [Fase 3: Testing](../docs/PHASE3-TESTING.md)
- [Plano de Refatoração](../../../docs/INDEX-REFACTORING-PLAN.md)
