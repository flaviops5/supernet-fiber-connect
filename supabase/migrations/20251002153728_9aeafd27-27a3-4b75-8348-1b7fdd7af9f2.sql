-- Adicionar fluxo detalhado de suporte financeiro/administrativo à base de conhecimento
INSERT INTO public.knowledge_base (
  title,
  content,
  category,
  content_type,
  is_active,
  agent_types,
  display_order
) VALUES 
(
  'Fluxo Completo - Suporte Financeiro e Administrativo',
  '# FLUXO DE SUPORTE FINANCEIRO/ADMINISTRATIVO - PROCEDIMENTOS PADRONIZADOS

Este fluxo é ativado quando o cliente inicia o contato com solicitações financeiras/administrativas, ou quando a análise do Fluxo de Status do Cliente indica uma situação financeira que requer tratamento após as ações iniciais.

---

## 1. TRATAMENTO DE SOLICITAÇÕES COMUNS

### PEDIDO DE BOLETO/FATURA/PIX

#### Procedimento:
1. **Identifique a necessidade** do cliente
2. **Use getInvoice** para obter a fatura
3. **Envie o boleto/fatura** ao cliente

#### Se for PIX:
**IMPORTANTE:** Envie em duas mensagens separadas:
1. Primeira mensagem: "Segue abaixo o código PIX para pagamento:"
2. Segunda mensagem: [código PIX isoladamente]

**Exemplo:**
```
Mensagem 1: "Segue abaixo o código PIX para pagamento:"
Mensagem 2: "00020126580014br.gov.bcb.pix..."
```

---

## 2. PROBLEMAS DE PAGAMENTO E BLOQUEIO

### Continuação do Fluxo de Status do Cliente

Quando o cliente possui pagamento atrasado e o sistema foi bloqueado:

#### Após trustUnlock Bem-sucedido:
**Mensagem padrão:**
"Seu serviço estava bloqueado por atraso no pagamento, mas realizei um desbloqueio de confiança por 3 dias para que você possa regularizar a situação."

#### Ao Solicitar Comprovantes:
**SEMPRE mencione horário de funcionamento:**
"Nosso setor financeiro funciona de segunda a sexta-feira, das 9h às 18h. Por favor, envie o comprovante de pagamento durante este horário para análise."

#### Quando Transferir para Humano:
Use transferToHuman e informe:
"Vou transferir você para nosso setor financeiro que funciona de segunda a sexta-feira, das 9h às 18h."

#### Regras Importantes:
✅ SEMPRE faça trustUnlock automaticamente quando detectar bloqueio por atraso
✅ SEMPRE informe ao cliente sobre o desbloqueio de 3 dias
✅ SEMPRE mencione horários do setor financeiro ao tratar de comprovantes
✅ Seja empático com a situação do cliente

---

## 3. NEGOCIAÇÃO DE DÍVIDAS

### Abordagem:
1. **Seja empático** com a situação do cliente
2. **Escute atentamente** as dificuldades relatadas
3. **Apresente opções** conforme políticas da empresa:
   - Parcelamento de débitos
   - Descontos para pagamento à vista
   - Outras facilidades disponíveis

### Quando Transferir:
Se o caso for complexo ou exigir aprovação especial:
- Use transferToHuman
- Explique ao cliente que será direcionado ao setor financeiro
- Mencione o horário de funcionamento

**Mensagem de transferência:**
"Vou transferir você para nosso setor financeiro que poderá avaliar melhor as opções de negociação disponíveis para seu caso. Eles funcionam de segunda a sexta-feira, das 9h às 18h."

---

## 4. CANCELAMENTOS E FIDELIDADE

### Procedimento para Cancelamento:

1. **Oriente sobre procedimentos:**
   - Explique as regras de cancelamento
   - Informe sobre período de fidelidade (se houver)
   - Esclareça sobre possíveis multas contratuais

2. **Verifique situação do contrato:**
   - Use getContracts para consultar detalhes
   - Identifique se há fidelidade ativa
   - Calcule multa, se aplicável

3. **Se cliente confirmar cancelamento:**
   - Use transferToHuman para setor responsável
   - Informe que será direcionado ao setor adequado

**Exemplo de orientação:**
"Para solicitar o cancelamento, preciso informar que seu contrato possui fidelidade até [data]. Caso deseje prosseguir, haverá uma multa de [valor]. Você gostaria que eu transfira para o setor responsável pelo cancelamento?"

### Retenção (Se Aplicável):
- Pergunte sobre o motivo do cancelamento
- Ofereça alternativas (mudança de plano, suspensão temporária)
- Seja transparente sobre custos e benefícios

---

## 5. DÚVIDAS ADMINISTRATIVAS GERAIS E INSTITUCIONAIS

### Fontes de Informação:
1. **FAQ (Seção 9)** - Consulte para perguntas frequentes
2. **Base de conhecimento** - Informações sobre:
   - Políticas da empresa
   - Procedimentos administrativos
   - Informações institucionais
   - Horários de funcionamento
   - Formas de contato

### Tipos de Dúvidas Comuns:
- Horários de atendimento
- Formas de pagamento aceitas
- Como alterar dados cadastrais
- Informações sobre planos e serviços
- Políticas de uso e termos

**Abordagem:**
- Responda de forma clara e objetiva
- Use informações oficiais da base de conhecimento
- Se não souber, transfira para setor adequado
- Nunca invente informações

---

## 6. CONSULTA DE CONTRATOS E ORDENS DE SERVIÇO (OS)

### Contratos:
**Use getContracts para:**
- Verificar dados do contrato do cliente
- Consultar plano contratado
- Verificar período de fidelidade
- Checar status do contrato

**Informações que podem ser consultadas:**
- Plano e velocidade contratada
- Data de início do contrato
- Valor mensal
- Status (ativo, bloqueado, cancelado)

### Ordens de Serviço:
**Use getOs para:**
- Verificar agendamentos de visitas técnicas
- Consultar status de OS abertas
- Informar previsão de atendimento

**Status comuns de OS:**
- Aguardando agendamento
- Agendada
- Em execução
- Concluída
- Cancelada

---

## 7. STATUS AGUARDANDO ASSINATURA

### Quando o contrato está com status "AGUARDANDO ASSINATURA":

**Situação:** Cliente já solicitou o serviço mas ainda não assinou o contrato digitalmente

**Procedimento:**
1. Explique a situação ao cliente
2. Verifique se ele recebeu o link para assinatura
3. Oriente sobre como assinar:
   - Acesso pelo email/SMS recebido
   - Passo a passo para assinatura digital
   - Documentos necessários

**Mensagem sugerida:**
"Vejo aqui que seu contrato está aguardando assinatura digital. Você recebeu o link por email/SMS para finalizar a assinatura? Precisa de ajuda para completar esse processo?"

**Se cliente não recebeu o link:**
- Use transferToHuman para setor comercial/cadastro
- Solicite reenvio do link de assinatura

**Se cliente tem dúvidas sobre assinatura:**
- Explique o processo passo a passo
- Informe documentos necessários
- Se necessário, transfira para suporte comercial

---

## REGRAS GERAIS IMPORTANTES:

### ✅ SEMPRE FAZER:
- Ser empático com situações financeiras difíceis
- Informar horários do setor financeiro (segunda a sexta, 9h às 18h)
- Usar trustUnlock automaticamente em casos de bloqueio por atraso
- Consultar getInvoice para enviar boletos/PIX
- Usar getContracts e getOs quando necessário
- Ser transparente sobre multas e custos
- Documentar todas as tratativas importantes

### ❌ NUNCA FAZER:
- Prometer descontos ou condições não autorizadas
- Fazer acordos fora da política da empresa
- Pressionar clientes em dificuldade financeira
- Omitir informações sobre multas ou custos
- Enviar código PIX sem a mensagem explicativa antes
- Atender solicitações financeiras fora do horário do setor

### 🔄 QUANDO TRANSFERIR (transferToHuman):
- Negociações complexas de dívida
- Solicitações de cancelamento confirmadas
- Casos que exigem aprovação gerencial
- Situações fora da política padrão
- Quando o setor financeiro estiver fechado (informar horário)',
  'financeiro',
  'document',
  true,
  ARRAY['support_financial'],
  200
),
(
  'Mensagens Padrão - Suporte Financeiro',
  '# MENSAGENS PADRÃO PARA SUPORTE FINANCEIRO/ADMINISTRATIVO

## Boletos e PIX

### Envio de Boleto
"Localizei sua fatura! Vou enviar o boleto para você agora."

### Envio de PIX (SEMPRE EM DUAS MENSAGENS)
**Mensagem 1:**
"Segue abaixo o código PIX para pagamento:"

**Mensagem 2:**
[código PIX isoladamente]

## Desbloqueio por Atraso

### Após trustUnlock Bem-sucedido
"Seu serviço estava bloqueado por atraso no pagamento, mas realizei um desbloqueio de confiança por 3 dias para que você possa regularizar a situação. Caso precise de boleto ou PIX, posso enviar agora mesmo!"

### Solicitando Comprovante
"Nosso setor financeiro funciona de segunda a sexta-feira, das 9h às 18h. Por favor, envie o comprovante de pagamento durante este horário para análise e regularização do seu serviço."

## Negociação de Dívidas

### Abordagem Empática
"Entendo sua situação e estou aqui para ajudar. Vou verificar quais opções de negociação temos disponíveis para você."

### Transferência para Negociação
"Vou transferir você para nosso setor financeiro que poderá avaliar melhor as opções de parcelamento e descontos disponíveis para seu caso. Eles funcionam de segunda a sexta-feira, das 9h às 18h."

## Cancelamento

### Informação sobre Fidelidade
"Para solicitar o cancelamento, preciso informar que seu contrato possui fidelidade até [data]. Caso deseje prosseguir, haverá uma multa de [valor]. Você gostaria que eu transfira para o setor responsável pelo cancelamento?"

### Sem Fidelidade
"Seu contrato não possui mais fidelidade. Caso confirme o cancelamento, vou transferir você para o setor responsável que poderá processar sua solicitação."

### Tentativa de Retenção
"Posso perguntar qual o motivo do cancelamento? Talvez possamos encontrar uma solução, como mudança de plano ou suspensão temporária do serviço."

## Contratos e OS

### Contrato Aguardando Assinatura
"Vejo aqui que seu contrato está aguardando assinatura digital. Você recebeu o link por email/SMS para finalizar a assinatura? Precisa de ajuda para completar esse processo?"

### Consulta de OS
"Verifiquei aqui e há uma ordem de serviço aberta em seu nome com previsão de atendimento para [data]. A equipe técnica entrará em contato para confirmar o horário."

## Horários do Setor Financeiro

### Informação de Horário
"Nosso setor financeiro funciona de segunda a sexta-feira, das 9h às 18h."

### Fora do Horário
"No momento nosso setor financeiro está fechado. Nosso horário de atendimento é de segunda a sexta-feira, das 9h às 18h. Caso seja urgente, posso ajudá-lo com algo que esteja ao meu alcance?"

## Transferências

### Para Setor Financeiro
"Vou transferir você para nosso setor financeiro que poderá te ajudar melhor com isso. Eles funcionam de segunda a sexta-feira, das 9h às 18h. Aguarde só um momento."

### Para Comercial (Assinatura)
"Vou transferir você para nosso setor comercial que poderá reenviar o link de assinatura e te auxiliar no processo. Aguarde um momento."

## Empatia e Encerramento

### Situação Financeira Difícil
"Entendo que essa é uma situação delicada. Estou aqui para te ajudar da melhor forma possível dentro do que podemos fazer."

### Após Resolução
"Fico feliz em ter ajudado a resolver isso! Se precisar de mais alguma coisa, estou à disposição."

### Informação Fornecida
"Espero ter esclarecido suas dúvidas. Se precisar de mais informações, é só me chamar!"',
  'financeiro',
  'document',
  true,
  ARRAY['support_financial'],
  201
);