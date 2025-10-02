-- Adicionar fluxo detalhado de suporte técnico à base de conhecimento
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
  'Fluxo Completo - Suporte Técnico com Procedimentos Detalhados',
  '# FLUXO DE SUPORTE TÉCNICO - PROCEDIMENTOS PADRONIZADOS

Este fluxo é ativado quando a análise inicial indica um problema técnico (ex: ONLINE=NÃO com STATUS DE ACESSO=ATIVO) ou quando o cliente relata dificuldades técnicas.

## 1. PROBLEMAS DE CONEXÃO GERAL (Sem Internet / Modem Offline)

### PASSO 1: Verificação Física Inicial
**Ação:** Pergunte se os equipamentos estão ligados na tomada
**Mensagem sugerida:** "Para começarmos, pode confirmar, por favor, se as luzes do roteador estão acesas normalmente? ENVIAR MÍDIA"

#### Se DESLIGADOS:
1. Peça para ligar e aguardar 2 minutos
2. Verifique status ONLINE novamente
3. Se ONLINE=SIM → Peça teste de navegação → Encerre se resolvido
4. Se não ligarem → Teste em outra tomada
5. Se ainda não ligar → Problema na fonte/aparelho → Apresente opções (comprar, solicitar envio/visita) → transferToHuman para Logística

#### Se LIGADOS:
**Ação:** Pergunte sobre luz LOS vermelha
**Mensagem:** "Você consegue verificar se há uma luz vermelha chamada LOS piscando no seu equipamento de fibra? ENVIE MÍDIA"

##### Se LUZ LOS VERMELHA PISCANDO:
1. Instrua a desconectar e reconectar o conector de fibra óptica ENVIE MÍDIA
2. Peça para observar se normalizou
3. **Se Normalizou:** Verifique ONLINE → Teste → Encerre
4. **Se Continuar Vermelha:** Informe sobre rompimento de fibra → Abrir OS → transferToHuman

##### Se LUZ LOS NÃO Está Vermelha:
1. Pergunte se tem mais de um roteador/repetidor
2. Se SIM → Desligar todos → Aguardar 1 min → Ligar SOMENTE o principal
   - Se normalizou → Verificar ONLINE → Teste → Encerre
3. Se NÃO normalizou → Verificar conectores bem encaixados ENVIE MÍDIA
   - Se normalizou → Verificar ONLINE → Teste → Encerre
4. Se NÃO normalizou → Desligar equipamentos por 1 min → Ligar ENVIE MÍDIA
   - Se normalizou → Verificar ONLINE → Teste → Encerre
5. Se NÃO normalizou → Transferir para suporte avançado (transferToHuman)

---

## 2. PROBLEMAS DE REDE WI-FI

### AÇÃO INICIAL PADRÃO:
**SEMPRE:** Reinicie o roteador remotamente usando restartModem
**Mensagem:** "Reiniciei seu modem, aguarde um minuto e me diga se voltou a funcionar."

### CENÁRIOS ESPECÍFICOS DE WI-FI:

#### CENÁRIO 1: Lentidão no Wi-Fi
1. Pergunte em qual rede está conectado (2.4GHz ou 5.8GHz)
2. Explique a diferença entre as redes
3. Se na 2.4GHz → Sugira teste na 5.8GHz perto do roteador
   - Mensagem: "Você já tentou testar a internet conectado à rede Wi-Fi 5.8GHz? Ela costuma ser mais rápida."
   - Envie link do Speedtest e peça print
4. Se não suporta 5.8GHz → Explique limitação → Sugira teste em outro dispositivo ou cabo
5. Analise resultado do teste → Se necessário, transferToHuman

#### CENÁRIO 2: Sinal Fraco / Não Alcança Certos Cômodos
1. Explique sobre alcance (2.4 vs 5.8) e interferências
2. Informe que otimização exige análise detalhada
3. Transferir para técnico (transferToHuman)

#### CENÁRIO 3: Aplicativo Específico Não Funciona
1. Peça para testar outros apps/sites
2. **Se Outros Funcionam:** Explique que pode ser problema do app/dispositivo
3. **Se Nenhum Funciona:** Peça para reiniciar o dispositivo e verificar conexão
4. Se insistir → transferToHuman

#### CENÁRIO 4: TV Box ou IPTV Travando
1. Explique sobre serviços não homologados e servidores distantes
2. Realize teste de velocidade
3. Se insistir → transferToHuman

#### CENÁRIO 5: Apenas Um Equipamento Não Navega
1. Confirme se outros dispositivos funcionam
2. **Se SIM:** Explique que o problema é no equipamento específico
3. Sugira: reiniciar, verificar senha, etc.
4. Se entender → Encerre
5. Se insistir → transferToHuman

#### CENÁRIO 6: Nomes das Redes Wi-Fi Não Aparecem
1. Pergunte se é em um ou todos os dispositivos
2. **Se Um:** Sugira reiniciar / modo avião
3. **Se Vários/Todos:** Reinicie o modem (restartModem)
4. Se não voltar → Pergunte se vê rede padrão (Mercusys, TP-Link)
5. **Se SIM:** Explique sobre reset → Pergunte sobre PC/notebook para reconfigurar
   - Se aceitar → transferToHuman
   - Se não aceitar → Informe sobre visita técnica → Abra OS → transferToHuman para Logística

#### CENÁRIO 7: Senha do Wi-Fi (Esqueceu/Quer Alterar)
1. Informe que não guardam a senha, mas podem ajudar
2. Peça dados de verificação (nome, CPF, data nasc.)
3. Informe sobre tempo de espera
4. Transferir para equipe técnica (transferToHuman)

#### CENÁRIO 8: Conexão Cai e Volta (Intermitência)
1. Peça para verificar cabos, tomadas, réguas
2. Peça para balançar cabos procurando mal contato
3. Peça para observar se equipamentos desligam
4. Se não achar nada → transferToHuman para análise

---

## REGRAS IMPORTANTES:

✅ SEMPRE use restartModem como primeira ação em problemas de Wi-Fi
✅ SEMPRE verifique status ONLINE após cada ação corretiva
✅ SEMPRE peça para o cliente testar a navegação antes de encerrar
✅ Use transferToHuman quando:
   - Problema persiste após todas as tentativas
   - Cliente solicita visita técnica
   - Necessário reconfigurar equipamentos
   - Problema de infraestrutura externa (LOS vermelha)

❌ NUNCA encerre sem confirmar que o problema foi resolvido
❌ NUNCA prometa que técnico irá em horário específico sem consultar logística',
  'troubleshooting',
  'document',
  true,
  ARRAY['support_tech'],
  100
),
(
  'Mensagens Padrão - Suporte Técnico',
  '# MENSAGENS PADRÃO PARA SUPORTE TÉCNICO

## Verificações Iniciais

### Equipamentos Ligados
"Para começarmos, pode confirmar, por favor, se as luzes do roteador estão acesas normalmente? 📸 ENVIAR MÍDIA"

### Verificar Luz LOS
"Você consegue verificar se há uma luz vermelha chamada LOS piscando no seu equipamento de fibra? 📸 ENVIE MÍDIA"

### Após Reiniciar Modem
"Reiniciei seu modem remotamente. Aguarde cerca de 1 minuto para ele religar completamente e me avise se voltou a funcionar, por favor."

## Wi-Fi

### Sugerir Rede 5.8GHz
"Você já tentou testar a internet conectado à rede Wi-Fi 5.8GHz? Ela costuma ser mais rápida e com menos interferências. Faça um teste por favor e me avise!"

### Teste de Velocidade
"Vamos fazer um teste de velocidade para ver como está sua conexão. Acesse https://www.speedtest.net/ e me envie um print do resultado, por favor."

### Problema em Equipamento Específico
"Notei que apenas esse aparelho está com problema, enquanto os outros funcionam normalmente. Isso indica que o problema está no próprio dispositivo. Você já tentou reiniciá-lo ou verificar se a senha do Wi-Fi está correta?"

## Transferências

### Para Suporte Avançado
"Vou transferir você para um colega com mais experiência na área que poderá te ajudar melhor com isso. Aguarde só um momentinho."

### Para Logística (Visita Técnica)
"Vou abrir uma ordem de serviço para que nossa equipe técnica possa fazer uma visita e resolver isso pessoalmente. Vou te transferir para o setor de agendamento."

### Após Horário
"No momento estamos fora do horário de atendimento técnico. Mas fique tranquilo(a), nossa equipe entrará em contato com você no primeiro horário de amanhã para resolver isso."

## Encerramento

### Problema Resolvido
"Que ótimo que conseguimos resolver! 😊 Se precisar de mais alguma coisa, é só chamar. Tenha um ótimo dia!"

### Orientação Final
"Caso o problema volte a acontecer, não hesite em nos chamar novamente. Estamos sempre à disposição para ajudar!"',
  'suporte_tecnico',
  'document',
  true,
  ARRAY['support_tech'],
  101
);