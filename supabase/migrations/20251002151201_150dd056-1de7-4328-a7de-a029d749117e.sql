-- Adicionar documentação dos novos endpoints IXC na base de conhecimento

-- 1. Documentação: Reiniciar Modem
INSERT INTO knowledge_base (
  title,
  category,
  content_type,
  content,
  tags,
  agent_types,
  is_active,
  display_order
) VALUES 
(
  'API IXC - Reiniciar Modem Remotamente',
  'ixc_endpoints',
  'document',
  'REINICIAR MODEM REMOTAMENTE

ENDPOINT:
POST https://{{dominio}}/webservice/v1/desconectar_clientes

AUTENTICAÇÃO:
Header: Authorization: Basic {{token_base64}}

PARÂMETROS:
- id_cliente: ID do cliente no IXC (obrigatório)

DESCRIÇÃO:
Força a desconexão do cliente do servidor RADIUS, fazendo com que o modem/roteador reconecte automaticamente. Útil para resolver travamentos e problemas de conexão.

FLUXO DE AÇÃO:
1. Sistema envia comando de desconexão para o RADIUS
2. Cliente perde conexão temporariamente (5-10 segundos)
3. Modem detecta perda de conexão
4. Modem reinicia processo de autenticação PPPoE
5. Nova conexão é estabelecida (30s-2min)

USO NO CÓDIGO (Edge Function):
```javascript
const result = await supabase.functions.invoke(''ixc-integration'', {
  body: {
    action: ''restartModem'',
    params: { customerId: ''1234'' }
  }
});
```

QUANDO USAR:
✅ Cliente reclama de lentidão persistente
✅ Conexão travada/congelada
✅ Após mudanças de configuração no roteador
✅ Como primeiro passo de troubleshooting técnico
✅ Problemas de autenticação PPPoE

IMPORTANTE:
⚠️ A reconexão pode levar até 2 minutos
⚠️ Cliente ficará sem internet durante o processo
⚠️ Avisar cliente antes de executar
⚠️ Só usar se cliente estiver ONLINE e com STATUS ATIVO

SCRIPT PARA CLIENTE:
"Vou reiniciar seu modem remotamente para resolver o problema. Você ficará sem internet por cerca de 1 minuto. Pode deixar que em instantes volta ao normal!"',
  ARRAY['ixc', 'api', 'modem', 'restart', 'tecnico'],
  ARRAY['support_tech', 'routing'],
  true,
  30
);

-- 2. Documentação: Limpar MAC Address
INSERT INTO knowledge_base (
  title,
  category,
  content_type,
  content,
  tags,
  agent_types,
  is_active,
  display_order
) VALUES 
(
  'API IXC - Limpar Endereço MAC',
  'ixc_endpoints',
  'document',
  'LIMPAR ENDEREÇO MAC (RADIUS)

ENDPOINT:
POST https://{{dominio}}/webservice/v1/radusuarios_{{id}}

AUTENTICAÇÃO:
Header: Authorization: Basic {{token_base64}}

PARÂMETROS:
- id: ID do registro radusuarios no IXC (obrigatório)

DESCRIÇÃO:
Limpa/remove o registro de endereço MAC do cliente na tabela radusuarios do servidor RADIUS. Resolve problemas de MAC duplicado ou travado.

O QUE É MAC ADDRESS:
- Identificador único de cada equipamento de rede
- Formato: AA:BB:CC:DD:EE:FF
- Usado pelo RADIUS para controlar autenticações
- Pode ficar "travado" no sistema causando conflitos

FLUXO DE AÇÃO:
1. Sistema localiza registro do cliente no radusuarios
2. Remove/limpa entrada de MAC address
3. Libera para nova autenticação
4. Cliente pode conectar com novo MAC

USO NO CÓDIGO (Edge Function):
```javascript
// Primeiro, buscar o radusuario_id do cliente
const statusResult = await supabase.functions.invoke(''ixc-integration'', {
  body: {
    action: ''getCustomerStatus'',
    params: { id: ''1234'' }
  }
});

// Depois, limpar o MAC usando o ID encontrado
const cleanResult = await supabase.functions.invoke(''ixc-integration'', {
  body: {
    action: ''cleanMac'',
    params: { radiusUserId: statusResult.data.pppoeLogin }
  }
});
```

QUANDO USAR:
✅ Erro "MAC address duplicado"
✅ Cliente trocou de modem/roteador
✅ Problemas de autenticação PPPoE persistentes
✅ "Usuário já conectado em outro local"
✅ Após reset de fábrica do modem

SINTOMAS DE MAC TRAVADO:
- Cliente não consegue autenticar no PPPoE
- Erro de "usuário já conectado"
- Conexão cai e não volta
- Status ONLINE = NÃO mas cliente deveria estar online

COMO OBTER O RADUSUARIOS_ID:
1. Usar action ''getCustomerStatus'' do ixc-integration
2. O campo ''pppoeLogin'' ou ''lastConnection'' contém informações
3. Sistema busca automaticamente na maioria dos casos

IMPORTANTE:
⚠️ Após limpar MAC, cliente DEVE tentar conectar novamente
⚠️ Cliente pode precisar desligar/ligar modem manualmente
⚠️ Ação não reconecta automaticamente - apenas libera
⚠️ Aguardar 30s após limpar antes de tentar reconexão

SCRIPT PARA CLIENTE:
"Identifiquei que seu MAC address está travado no sistema. Vou fazer a limpeza agora. Após eu confirmar, por favor desligue seu modem da tomada por 10 segundos e ligue novamente, ok?"',
  ARRAY['ixc', 'api', 'mac', 'radius', 'tecnico'],
  ARRAY['support_tech', 'routing'],
  true,
  31
);

-- 3. Documentação: Fluxo Completo de Troubleshooting Técnico
INSERT INTO knowledge_base (
  title,
  category,
  content_type,
  content,
  tags,
  agent_types,
  is_active,
  display_order
) VALUES 
(
  'Fluxo Completo - Troubleshooting Técnico com Tools',
  'troubleshooting',
  'document',
  'FLUXO COMPLETO: TROUBLESHOOTING TÉCNICO
Usando as tools do ixc-integration

═══════════════════════════════════════════════════════

ETAPA 1: VERIFICAÇÃO INICIAL
═══════════════════════════════════════════════════════

1.1 COLETAR INFORMAÇÕES:
□ Qual o problema? (sem internet, lento, cai muito)
□ Quando começou?
□ Em todos dispositivos ou só alguns?
□ Luzes do modem estão normais?

1.2 IDENTIFICAR CLIENTE:
□ Solicitar CPF
□ Buscar no sistema: action ''searchCustomers''

═══════════════════════════════════════════════════════

ETAPA 2: DIAGNÓSTICO AUTOMÁTICO
═══════════════════════════════════════════════════════

2.1 VERIFICAR STATUS COMPLETO:
```javascript
const status = await ixcIntegration.invoke({
  action: ''getCustomerStatus'',
  params: { id: clienteId }
});
```

2.2 ANALISAR RESULTADO:
□ STATUS DE ACESSO: ativo, bloqueado, financeiro em atraso?
□ STATUS ONLINE: SIM ou NÃO?
□ TEM CONTRATOS ATIVOS?

═══════════════════════════════════════════════════════

ETAPA 3: DECISÃO BASEADA NO STATUS
═══════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────┐
│ CENÁRIO A: ONLINE = SIM + STATUS = ATIVO           │
│ (Cliente conectado, sem bloqueio)                   │
└─────────────────────────────────────────────────────┘

AÇÃO: Problema é LOCAL (roteador/dispositivo)

3.1 EXECUTAR AÇÕES REMOTAS:
```javascript
// 1. Limpar MAC
await ixcIntegration.invoke({
  action: ''cleanMac'',
  params: { radiusUserId: status.pppoeLogin }
});

// 2. Reiniciar modem
await ixcIntegration.invoke({
  action: ''restartModem'',
  params: { customerId: clienteId }
});
```

3.2 AGUARDAR 1-2 MINUTOS

3.3 TESTAR NOVAMENTE
- Se voltou: problema resolvido ✅
- Se não voltou: seguir para 3.4

3.4 ORIENTAÇÕES MANUAIS:
□ Desligar modem 30s e ligar
□ Testar cabo direto (sem Wi-Fi)
□ Resetar configurações de rede do dispositivo
□ Se persiste: agendar visita técnica

┌─────────────────────────────────────────────────────┐
│ CENÁRIO B: ONLINE = NÃO + STATUS = ATIVO          │
│ (Sem conexão, mas contrato regular)                │
└─────────────────────────────────────────────────────┘

AÇÃO: Problema é de INFRAESTRUTURA

3.5 VERIFICAR:
□ Há relatos de queda na região?
□ Problema em múltiplos clientes?

3.6 EXECUTAR DIAGNÓSTICO:
```javascript
// Tentar forçar reconexão
await ixcIntegration.invoke({
  action: ''restartModem'',
  params: { customerId: clienteId }
});
```

3.7 SE NÃO RESOLVER:
□ Problema pode ser: cabo rompido, CTO, equipamento
□ Registrar chamado técnico
□ Informar prazo: 24-48h

┌─────────────────────────────────────────────────────┐
│ CENÁRIO C: STATUS = BLOQUEADO/FINANCEIRO EM ATRASO│
│ (Problema é financeiro, não técnico)                │
└─────────────────────────────────────────────────────┘

AÇÃO: TRANSFERIR PARA FINANCEIRO

3.8 NÃO FAZER TROUBLESHOOTING TÉCNICO
□ Transferir conversa: transferToHuman (departamento: financial)
□ Informar: "Seu serviço está com pendência financeira"

═══════════════════════════════════════════════════════

ETAPA 4: SCRIPTS DE COMUNICAÇÃO
═══════════════════════════════════════════════════════

4.1 AO EXECUTAR LIMPEZA DE MAC:
"Vou fazer uma limpeza no registro do seu modem. Isso pode resolver o problema de autenticação. Aguarde um momento..."

4.2 AO REINICIAR MODEM:
"Vou reiniciar seu modem remotamente. Você ficará sem internet por cerca de 1 minuto. É normal, aguarde que logo volta!"

4.3 APÓS SUCESSO:
"Pronto! Realizei os procedimentos remotamente. Por favor, teste sua conexão agora. Funcionou?"

4.4 SE NÃO RESOLVER:
"Pelos testes, identifiquei que precisa de uma verificação presencial. Vou abrir um chamado técnico. Nossa equipe entrará em contato em até 24h para agendar a visita."

═══════════════════════════════════════════════════════

ETAPA 5: REGISTRO E FOLLOW-UP
═══════════════════════════════════════════════════════

5.1 REGISTRAR NO SISTEMA:
□ Criar atendimento no IXC: action ''createAtendimento''
□ Documentar ações tomadas
□ Resultado obtido

5.2 CONFIRMAR COM CLIENTE:
□ Problema resolvido?
□ Alguma outra dúvida?
□ Satisfação com o atendimento

═══════════════════════════════════════════════════════',
  ARRAY['troubleshooting', 'fluxo', 'tecnico', 'tools'],
  ARRAY['support_tech', 'routing'],
  true,
  100
);

-- 4. Documentação: Estrutura de Tools do Sistema
INSERT INTO knowledge_base (
  title,
  category,
  content_type,
  content,
  tags,
  agent_types,
  is_active,
  display_order
) VALUES 
(
  'Referência: Todas as Tools IXC Integration',
  'ixc_endpoints',
  'document',
  'REFERÊNCIA COMPLETA: IXC INTEGRATION TOOLS
Edge Function: ixc-integration

═══════════════════════════════════════════════════════

📋 GESTÃO DE CLIENTES
═══════════════════════════════════════════════════════

1. getCustomers
   Parâmetros: page, limit, orderBy, order
   Retorna: Lista de clientes
   Uso: Listar todos os clientes

2. getCustomer
   Parâmetros: id (obrigatório)
   Retorna: Dados de um cliente específico
   Uso: Buscar detalhes de um cliente

3. searchCustomers
   Parâmetros: query (obrigatório)
   Retorna: Clientes que correspondem à busca
   Uso: Buscar por CPF, CNPJ ou nome

4. createCustomer
   Parâmetros: customerData (obrigatório)
   Retorna: Cliente criado com ID
   Uso: Cadastrar novo cliente no IXC

═══════════════════════════════════════════════════════

📊 STATUS E MONITORAMENTO
═══════════════════════════════════════════════════════

5. getCustomerStatus
   Parâmetros: id (obrigatório)
   Retorna: Status completo do cliente
   Campos: isOnline, contracts, accessStatus, pppoeLogin
   Uso: Verificar situação atual do cliente

6. getOnlineClients
   Parâmetros: page, limit
   Retorna: Clientes atualmente online
   Uso: Listar clientes conectados

7. getCustomersByStatus
   Parâmetros: status (obrigatório), page, limit
   Retorna: Clientes filtrados por status
   Uso: Buscar clientes bloqueados, em atraso, etc.

8. testConnection
   Parâmetros: nenhum
   Retorna: Status da conexão com IXC
   Uso: Verificar se API está respondendo

═══════════════════════════════════════════════════════

📝 CONTRATOS E ATENDIMENTOS
═══════════════════════════════════════════════════════

9. createContract
   Parâmetros: customerId, contractData (obrigatórios)
   Retorna: Contrato criado com ID
   Uso: Criar novo contrato para cliente

10. createAtendimento
    Parâmetros: customerId, atendimentoData (obrigatórios)
    Retorna: Atendimento criado
    Uso: Registrar chamado técnico/suporte

═══════════════════════════════════════════════════════

💰 FINANCEIRO
═══════════════════════════════════════════════════════

11. getFinancialTitles
    Parâmetros: customerId ou dueDate
    Retorna: Faturas/títulos financeiros
    Uso: Buscar boletos, PIX, débitos

12. getPixQrCode
    Parâmetros: titleId (obrigatório)
    Retorna: Código PIX e QR Code
    Uso: Gerar PIX para pagamento

13. desbloqueioConfianca
    Parâmetros: contractId (obrigatório)
    Retorna: Sucesso ou erro
    Uso: Desbloquear temporariamente (3 dias)

═══════════════════════════════════════════════════════

🔧 TROUBLESHOOTING TÉCNICO
═══════════════════════════════════════════════════════

14. restartModem ⭐ NOVO
    Parâmetros: customerId (obrigatório)
    Retorna: Sucesso da operação
    Uso: Reiniciar modem remotamente
    Tempo: ~1-2 minutos

15. cleanMac ⭐ NOVO
    Parâmetros: radiusUserId (obrigatório)
    Retorna: Sucesso da operação
    Uso: Limpar MAC address travado
    Tempo: ~10 segundos

═══════════════════════════════════════════════════════

📚 EXEMPLO DE USO COMPLETO
═══════════════════════════════════════════════════════

```javascript
// 1. Buscar cliente
const searchResult = await supabase.functions.invoke(''ixc-integration'', {
  body: {
    action: ''searchCustomers'',
    params: { query: ''12345678900'' }
  }
});

const clienteId = searchResult.data[0].id;

// 2. Verificar status
const status = await supabase.functions.invoke(''ixc-integration'', {
  body: {
    action: ''getCustomerStatus'',
    params: { id: clienteId }
  }
});

// 3. Se necessário, fazer troubleshooting
if (!status.data.isOnline) {
  // Reiniciar modem
  await supabase.functions.invoke(''ixc-integration'', {
    body: {
      action: ''restartModem'',
      params: { customerId: clienteId }
    }
  });
}

// 4. Se problema financeiro, desbloquear
if (status.data.accessStatus === ''BLOQUEADO'') {
  const contratoId = status.data.contracts[0].id;
  
  await supabase.functions.invoke(''ixc-integration'', {
    body: {
      action: ''desbloqueioConfianca'',
      params: { contractId: contratoId }
    }
  });
}

// 5. Buscar fatura para pagamento
const faturas = await supabase.functions.invoke(''ixc-integration'', {
  body: {
    action: ''getFinancialTitles'',
    params: { customerId: clienteId }
  }
});

// 6. Gerar PIX
if (faturas.data.registros.length > 0) {
  const tituloId = faturas.data.registros[0].id_titulo;
  
  const pix = await supabase.functions.invoke(''ixc-integration'', {
    body: {
      action: ''getPixQrCode'',
      params: { titleId: tituloId }
    }
  });
  
  console.log(''Código PIX:'', pix.data.qrcode);
}

// 7. Registrar atendimento
await supabase.functions.invoke(''ixc-integration'', {
  body: {
    action: ''createAtendimento'',
    params: {
      customerId: clienteId,
      atendimentoData: {
        assunto: ''Suporte Técnico'',
        descricao: ''Cliente sem internet - troubleshooting realizado'',
        prioridade: ''alta''
      }
    }
  }
});
```

═══════════════════════════════════════════════════════',
  ARRAY['ixc', 'api', 'tools', 'referencia'],
  ARRAY['support_tech', 'support_financial', 'routing', 'sales'],
  true,
  1
);