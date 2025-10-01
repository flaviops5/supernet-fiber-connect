-- Popular knowledge_base com estrutura organizada de categorias

INSERT INTO public.knowledge_base (title, category, content_type, agent_type, content, tags, is_active)
VALUES 

-- VENDAS
('Fibra Óptica vs Internet Comum', 'planos', 'document', 'sales', 
$$FIBRA ÓPTICA vs INTERNET COMUM

VANTAGENS DA FIBRA:
- Velocidade simétrica (download = upload)
- Baixíssima latência (ideal para jogos/streaming)
- Estabilidade mesmo em dias chuvosos
- Não sofre interferência elétrica
- Suporta múltiplos dispositivos simultaneamente

INTERNET COMUM (cabo/rádio):
- Velocidade assimétrica  
- Latência alta em horários de pico
- Pode sofrer com clima/interferências
- Performance cai com muitos dispositivos

ARGUMENTO DE VENDA:
"Com fibra óptica você terá internet REAL, não apenas prometida. Se contratou 300MB, terá 300MB de verdade!"$$, 
ARRAY['vendas', 'fibra'], true),

('Benefícios por Perfil de Cliente', 'planos', 'document', 'sales',
$$BENEFÍCIOS POR PERFIL

HOME OFFICE:
- Upload rápido para videochamadas
- Conexão estável (sem travar em reunião)
- VPN funciona perfeitamente

FAMÍLIA:
- Todos conectados ao mesmo tempo
- Netflix em 4K + jogos online simultaneamente
- Smart TVs, celulares, tablets sem lentidão

GAMERS:
- Ping baixíssimo
- Zero lag em jogos competitivos
- Download de jogos em minutos

PEQUENAS EMPRESAS:
- Sistema em nuvem sem travamentos
- Videoconferências profissionais
- Backup rápido de arquivos$$, 
ARRAY['vendas', 'segmentacao'], true),

('Tratamento de Objeções - Preço', 'processo_vendas', 'document', 'sales',
$$OBJEÇÃO: Está muito caro

TÉCNICA DE RESPOSTA:

1. EMPATIA:
Entendo sua preocupação com o investimento.

2. RESSIGNIFICAÇÃO:
Vamos ver quanto isso representa por dia? R$99,90 dividido por 30 dias = R$3,33/dia. Menos que um café!

3. VALOR vs CUSTO:
Pense: quantas vezes sua internet atual travou essa semana? Quanto vale sua tranquilidade e produtividade?

4. COMPARAÇÃO:
Internet comum mais barata muitas vezes é barata porque não entrega a velocidade prometida. Aqui você paga pelo que realmente vai usar.

5. PLANOS ALTERNATIVOS:
Temos planos a partir de R$79,90. Qual velocidade seria ideal para você?

6. FECHAMENTO:
Que tal testarmos por 30 dias? Se não ficar satisfeito, cancelamos sem multa!$$,
ARRAY['vendas', 'objecao'], true),

('Gatilhos Mentais para Fechamento', 'processo_vendas', 'document', 'sales',
$$GATILHOS MENTAIS DE VENDAS

ESCASSEZ:
Temos apenas 3 vagas disponíveis para instalação esta semana na sua região.

URGÊNCIA:
Essa promoção é válida apenas até sexta-feira.

PROVA SOCIAL:
Mais de 500 famílias do seu bairro já confiam na SUPERNET.

BÔNUS:
Se fechar hoje, a instalação que custa R$150 sai GRÁTIS.

GARANTIA:
Se em 30 dias não estiver satisfeito, cancelamos sem multa e sem letras miúdas.

EXCLUSIVIDADE:
Clientes que fecham hoje ganham prioridade no suporte técnico 24h.

QUANDO USAR:
Use 2-3 gatilhos por conversa, não exagere. Mantenha a naturalidade!$$,
ARRAY['vendas', 'gatilhos'], true),

-- SUPORTE FINANCEIRO
('Regras de Desbloqueio de Confiança', 'desbloqueio', 'document', 'support_financial',
$$DESBLOQUEIO DE CONFIANÇA - REGRAS

QUANDO PODE SER USADO:
✅ Cliente com histórico de pagamento regular
✅ Máximo 1x por mês
✅ Pendência de até 2 faturas
✅ Não estar negativado

QUANDO NÃO PODE:
❌ Cliente já usou no mês atual
❌ Mais de 2 faturas em atraso
❌ Histórico de inadimplência recorrente
❌ Contrato em processo de cancelamento

PROCEDIMENTO:
1. Verificar histórico no IXC
2. Confirmar CPF do cliente
3. Informar que será liberado por 3 dias úteis
4. Reforçar que após 3 dias bloqueia automaticamente se não pagar
5. Enviar boleto/PIX imediatamente

SCRIPT:
Consegui fazer o desbloqueio de confiança! Sua internet será liberada nos próximos 30 minutos e ficará ativa por 3 dias úteis. Nesse período, preciso que regularize o pagamento. Já vou te enviar o PIX agora mesmo, ok?$$,
ARRAY['financeiro', 'desbloqueio'], true),

('Negociação de Dívida - Passo a Passo', 'negociacao', 'document', 'support_financial',
$$NEGOCIAÇÃO DE DÍVIDAS

ETAPAS:

LEVANTAMENTO:
- Quantas faturas em aberto?
- Valor total da dívida
- Há quanto tempo está em atraso?
- Cliente quer continuar ou cancelar?

ANÁLISE DE CAPACIDADE:
Quanto você consegue pagar hoje?
Precisa parcelar? Em quantas vezes consegue?

OPÇÕES DE ACORDO:
- À vista: 15% de desconto
- Parcelado 3x: 10% de desconto
- Parcelado 6x: 5% de desconto
- Acima de 6x: sem desconto

CONDIÇÕES:
- Entrada mínima: 30% do total
- Parcelas mínimas: R$50,00
- Prazo máximo: 12x

FORMALIZAÇÃO:
- Gerar boletos/PIX das parcelas
- Enviar por WhatsApp
- Registrar acordo no sistema IXC

FOLLOW-UP:
- Confirmar recebimento da entrada
- Acompanhar pagamento das parcelas
- Avisar 3 dias antes do vencimento

IMPORTANTE:
Sempre registrar o acordo no IXC
Enviar confirmação por e-mail
Bloquear novamente se descumprir acordo$$,
ARRAY['financeiro', 'negociacao'], true),

-- SUPORTE TÉCNICO
('Diagnóstico Inicial - Checklist', 'troubleshooting', 'document', 'support_tech',
$$DIAGNÓSTICO INICIAL - PASSO A PASSO

PERGUNTAS ESSENCIAIS:
□ Está sem internet em todos os dispositivos ou só em algum específico?
□ O problema começou quando? Mudou algo recentemente?
□ As luzes do modem/roteador estão normais?
□ Já tentou reiniciar o equipamento?

VERIFICAÇÃO FÍSICA:
□ Equipamento está ligado na tomada?
□ Cabo de rede está conectado?
□ Luzes indicadoras:
  - Luz POWER: deve estar acesa fixa
  - Luz PON/LOS: deve estar acesa fixa (se piscar = sem sinal)
  - Luz LAN: pisca quando há tráfego
  - Luz Wi-Fi: acesa fixa

TESTES BÁSICOS:
1. Pedir para reiniciar (desligar 30s, ligar)
2. Testar cabo direto (sem Wi-Fi)
3. Verificar em outro dispositivo
4. Checar se o problema é só velocidade ou sem conexão

SE PROBLEMA PERSISTE:
Verificar status no IXC (bloqueado?)
Testar sinal PON
Agendar visita técnica se necessário$$,
ARRAY['suporte', 'diagnostico'], true),

('Configuração de Roteador', 'configuracao', 'document', 'support_tech',
$$CONFIGURAÇÃO BÁSICA DE ROTEADOR

ACESSO AO ROTEADOR:
1. Conectar no Wi-Fi do roteador
2. Abrir navegador
3. Digitar: 192.168.1.1 ou 192.168.0.1
4. Login padrão: admin/admin

TROCAR NOME DA REDE (SSID):
1. Menu Wireless ou Wi-Fi
2. Campo SSID ou Nome da Rede
3. Digitar novo nome
4. Clicar Salvar

TROCAR SENHA DO WI-FI:
1. Menu Wireless Security ou Segurança
2. Tipo: WPA2-PSK (mais seguro)
3. Campo Password ou Senha
4. Digitar senha forte (mín. 8 caracteres)
5. Clicar Salvar

MELHORAR SINAL:
1. Posicionar roteador no centro da casa
2. Altura média (1,5m do chão)
3. Longe de micro-ondas e paredes grossas
4. Antenas em ângulos diferentes

IMPORTANTE:
Ao salvar, o roteador pode reiniciar. É normal, aguardar 2-3 minutos.$$,
ARRAY['suporte', 'configuracao'], true),

-- SISTEMA IXC
('Códigos de Status de Contrato', 'ixc_status', 'document', 'support_tech',
$$CÓDIGOS DE STATUS IXC - CONTRATOS

STATUS_INTERNET (campo crítico):

ATIVOS/ONLINE:
- A = Ativo
- AA = Ativo Aguardando
- AT = Ativo Trial
- AC = Ativo Cortesia

BLOQUEADOS:
- CM = Cortado Manual
- CA = Cortado Automático  
- CB = Cortado Bloqueado
- FA = Financeiro em Atraso

SUSPENSOS:
- S = Suspenso
- SC = Suspenso Cortesia
- ST = Suspenso Trial

INATIVOS:
- D = Desativado
- C = Cancelado
- I = Inativo

COMO USAR:
1. Sempre verificar campo status_internet
2. Se CA/CM/CB/FA → Cliente tem problema financeiro
3. Se D/C/I → Contrato cancelado (não desbloquear)
4. Se S/SC/ST → Verificar motivo da suspensão

AÇÕES POR STATUS:
- CA/CM/CB/FA → Transferir para financeiro
- A/AA/AT/AC → Cliente ativo, resolver técnico
- D/C/I → Informar que contrato está cancelado$$,
ARRAY['ixc', 'status'], true),

('API IXC - Buscar Cliente', 'ixc_endpoints', 'document', 'support_tech',
$$API IXC - BUSCAR CLIENTE

ENDPOINT:
GET https://{{dominio}}/webservice/v1/cliente

AUTENTICAÇÃO:
Header: Authorization: Basic {{token_base64}}

PARÂMETROS DE BUSCA:
- qtype: Campo para buscar (id, cnpj_cpf, razao)
- query: Valor a buscar
- oper: Operador (=, LIKE)
- page: Página (padrão: 1)
- rp: Registros por página (padrão: 50)

EXEMPLOS:

Buscar por CPF:
?qtype=cnpj_cpf&query=12345678900&oper==

Buscar por nome:
?qtype=razao&query=Maria&oper=LIKE

Buscar por ID:
?qtype=id&query=1343&oper==

CAMPOS IMPORTANTES:
- id: ID do cliente no IXC
- ativo: S=Ativo, N=Inativo
- cnpj_cpf: CPF/CNPJ do cliente
- telefone_celular: Telefone principal$$,
ARRAY['ixc', 'api'], true),

-- EMPRESA (todos veem)
('Horários de Funcionamento', 'contatos', 'document', null,
$$HORÁRIOS DE ATENDIMENTO SUPERNET FIBRA

CENTRAL DE ATENDIMENTO:
Segunda a Sexta: 8h às 18h
Sábado: 8h às 12h
Domingo: Fechado

WHATSAPP (Vendas):
Segunda a Sexta: 8h às 20h
Sábado: 8h às 14h
Domingo: Fechado

SUPORTE TÉCNICO 24h:
Todos os dias, 24 horas
Emergências técnicas sempre atendidas

FINANCEIRO:
Segunda a Sexta: 8h às 18h
Sábado: 8h às 12h

LOJA FÍSICA:
Segunda a Sexta: 9h às 18h
Sábado: 9h às 13h

TEMPO DE RESPOSTA:
- WhatsApp: até 10 minutos
- E-mail: até 24h úteis
- Telefone: imediato (em horário comercial)$$,
ARRAY['empresa', 'horarios'], true),

('Política de Cancelamento', 'politicas', 'document', null,
$$POLÍTICA DE CANCELAMENTO SUPERNET FIBRA

CANCELAMENTO SEM MULTA:
✅ Após completar período de fidelidade (12 meses)
✅ Por mudança para área sem cobertura
✅ Por falecimento do titular

CANCELAMENTO COM MULTA:
❌ Antes de 12 meses: multa proporcional aos meses restantes
   Exemplo: faltam 6 meses = 6x o valor da mensalidade

COMO SOLICITAR:
1. Ligar no 0800 ou WhatsApp
2. Informar motivo do cancelamento
3. Confirmar CPF e dados do titular
4. Protocolo de cancelamento gerado

PRAZOS:
- Solicitação processada em até 48h úteis
- Desinstalação agendada em até 5 dias úteis
- Equipamentos devem ser devolvidos na desinstalação

EQUIPAMENTOS:
Roteador/modem são COMODATO
Devem ser devolvidos em perfeito estado
Se danificado/perdido: cobrança de R$150

REEMBOLSO:
- Pagamento proporcional de dias não utilizados
- Crédito em conta em até 30 dias
- Sem reembolso de taxa de instalação

NEGOCIAÇÃO:
Antes de cancelar, oferecemos:
- Desconto na mensalidade
- Upgrade de plano sem custo adicional
- Isenção de multa em casos especiais$$,
ARRAY['empresa', 'cancelamento'], true);
