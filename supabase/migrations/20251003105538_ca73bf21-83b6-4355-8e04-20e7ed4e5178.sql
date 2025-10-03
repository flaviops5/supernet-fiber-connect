-- Adicionar conhecimento sobre sistema de detecção de quedas em massa
INSERT INTO public.knowledge_base (
  title,
  content,
  content_type,
  category,
  tags,
  agent_types,
  is_active,
  display_order
) VALUES 
(
  'Sistema de Detecção de Quedas em Massa',
  '# Sistema de Detecção de Quedas em Massa

## 🔹 O que é Queda em Massa?

Uma **queda em massa** ocorre quando múltiplos clientes da mesma região (mesma CTO/porta PON) ficam offline simultaneamente. Isso indica um problema na infraestrutura compartilhada, não em equipamentos individuais dos clientes.

## 🔹 Padrão de Nomenclatura

A SUPERNET FIBRA segue um padrão de login:
- **Formato**: LOCAL-BLOCO-APARTAMENTO
- **Exemplo**: SRI-B-102
  - SRI = Local (bairro/região)
  - B = Bloco do prédio
  - 102 = Número do apartamento

**Clientes da mesma região compartilham**:
- Mesma CTO (Caixa de Terminação Óptica)
- Mesma porta PON
- Mesmo segmento de rede
- Geralmente estão em um raio de 150 metros

## 🔹 Critérios de Detecção

Uma queda em massa é identificada quando:
- **3 ou mais clientes** da mesma região (LOCAL-BLOCO) estão offline
- Os clientes compartilham o mesmo padrão de login (ex: SRI-B)
- A detecção é feita automaticamente a cada 5 minutos

## 🔹 Causas Comuns

Quando há queda em massa, as causas prováveis são:

1. **Problema na CTO**:
   - Porta danificada
   - Água/umidade na caixa
   - Conexão solta

2. **Problema no Splitter**:
   - Divisor óptico defeituoso
   - Fusão comprometida

3. **Problema na Fibra de Distribuição**:
   - Cabo rompido
   - Atenuação excessiva
   - Emenda danificada

4. **Problema na OLT/Porta PON**:
   - Porta PON com problemas
   - Potência inadequada
   - Necessidade de reset

## 🔹 Como Atender um Cliente Durante Queda em Massa

### SE HOUVER QUEDA ATIVA NA REGIÃO DO CLIENTE:

**1. Confirme o Padrão**:
- Extraia o padrão do login (ex: SRI-B de SRI-B-102)
- Verifique se há evento ativo para essa região

**2. Informe ao Cliente**:
```
"Olá [Nome]! Identificamos que há uma interrupção afetando múltiplos clientes 
na sua região (CTO compartilhada). Nossa equipe técnica já foi notificada e está 
trabalhando na solução. O problema não é no seu equipamento."
```

**3. NÃO Solicite**:
- ❌ Reiniciar ONU
- ❌ Verificar cabos
- ❌ Testes de conexão
**Motivo**: O problema é na infraestrutura, não no cliente

**4. Ofereça Informações**:
- Previsão de normalização (se disponível)
- Número de clientes afetados na mesma região
- Garantia que é prioridade da equipe técnica

### SE NÃO HOUVER QUEDA EM MASSA:

- Prossiga com atendimento normal
- Solicite testes de conexão
- Verifique equipamento do cliente
- Considere agendamento técnico se necessário

## 🔹 Benefícios do Sistema

1. **Evita Chamados Redundantes**: Cliente já recebe notificação automática
2. **Priorização Correta**: Equipe técnica sabe que é problema de infraestrutura
3. **Melhor Experiência**: Cliente sabe que não é culpa dele
4. **Eficiência Operacional**: Não envia técnico para problema individual quando é coletivo

## 🔹 Integração com Atendimento

Quando um cliente entra em contato:
1. Sistema identifica o login
2. Verifica se há queda em massa ativa para aquela região
3. Orienta o agente automaticamente
4. Agente passa informação correta ao cliente

## 🔹 Exemplo Real

**Situação**: 
- 8 clientes com login SRI-B-* (SRI-B-101, SRI-B-102, etc.) estão offline
- Sistema detecta queda em massa na região "SRI-B"
- Evento é criado automaticamente

**Quando cliente SRI-B-105 ligar**:
- ✅ Agente sabe que é queda em massa
- ✅ Informa que é problema regional
- ✅ Não pede testes desnecessários
- ✅ Cliente fica tranquilo que está sendo resolvido',
  'document',
  'procedimentos',
  ARRAY['queda-massa', 'suporte', 'gpon', 'infraestrutura', 'atendimento', 'cto'],
  ARRAY['routing', 'support_tech'],
  true,
  102
);