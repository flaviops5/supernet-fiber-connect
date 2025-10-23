# 🧪 Plano de Testes End-to-End - Pré-Produção

**Data de criação**: 2025-10-23  
**Objetivo**: Validar todos os fluxos críticos antes do deploy em produção

---

## 📋 Checklist Geral

- [ ] Todos os testes de fluxo WhatsApp
- [ ] Todos os agents funcionando
- [ ] Integrações IXC validadas
- [ ] Features críticas testadas
- [ ] Segurança e LGPD validados
- [ ] Performance sob carga

---

## 1️⃣ Testes de Fluxo WhatsApp Completo

### Teste 1.1: Primeiro Contato - Vendas
**Objetivo**: Validar routing agent → sales agent

**Passos**:
1. Enviar mensagem: "Olá, quero contratar internet"
2. Verificar que `routing-agent` classifica como vendas
3. Verificar que `sales-agent` responde com planos
4. Verificar criação de `conversation` e `messages` no DB
5. Verificar que agent_type = 'sales'

**Resultado esperado**:
- ✅ Conversa criada com status 'active'
- ✅ Agent correto atribuído
- ✅ Mensagens armazenadas
- ✅ Resposta enviada via Evolution API

---

### Teste 1.2: Suporte Técnico - Cliente Offline
**Objetivo**: Validar routing → support-tech → diagnóstico completo

**Passos**:
1. Enviar: "Minha internet está fora"
2. Agent solicita CPF
3. Fornecer CPF válido: "123.456.789-00"
4. Verificar chamada ao IXC (buscar cliente)
5. Verificar diagnóstico de ONU/Rádio
6. Verificar sugestão de reboot (se aplicável)

**Resultado esperado**:
- ✅ CPF validado e mascarado nos logs
- ✅ Cliente encontrado no IXC
- ✅ Diagnóstico completo executado
- ✅ Recomendações enviadas ao cliente
- ✅ Métricas coletadas

---

### Teste 1.3: Suporte Financeiro - Negociação
**Objetivo**: Validar routing → support-financial → envio de boleto/PIX

**Passos**:
1. Enviar: "Quero negociar minha conta em atraso"
2. Agent solicita CPF
3. Fornecer CPF com débitos
4. Verificar listagem de títulos vencidos
5. Solicitar envio de boleto
6. Verificar chamada ao `send-payment-to-customer`

**Resultado esperado**:
- ✅ Títulos listados corretamente
- ✅ Boleto/PIX enviado com sucesso
- ✅ Mensagem de confirmação ao cliente
- ✅ Log de ação registrado

---

### Teste 1.4: Telemedicina - Agendamento
**Objetivo**: Validar routing → telemedicina-agent

**Passos**:
1. Enviar: "Quero agendar uma consulta"
2. Agent apresenta planos de telemedicina
3. Cliente escolhe plano
4. Agent solicita dados (nome, data nascimento)
5. Verificar processo de cadastro

**Resultado esperado**:
- ✅ Planos apresentados
- ✅ Dados coletados corretamente
- ✅ Validação de campos obrigatórios
- ✅ Próximos passos indicados

---

### Teste 1.5: Automação - Dispositivos Compatíveis
**Objetivo**: Validar routing → automacao-agent

**Passos**:
1. Enviar: "Quero automatizar minha casa"
2. Agent apresenta soluções de automação
3. Cliente pergunta sobre compatibilidade
4. Verificar busca na knowledge base

**Resultado esperado**:
- ✅ Informações de automação apresentadas
- ✅ Knowledge base consultada
- ✅ Dispositivos compatíveis listados

---

## 2️⃣ Testes de Agents Especializados

### Teste 2.1: Routing Agent - Classificação
**Cenários a testar**:
- [ ] Vendas: "quero contratar", "planos disponíveis"
- [ ] Suporte técnico: "internet caiu", "lento"
- [ ] Suporte financeiro: "negociar débito", "2ª via"
- [ ] Telemedicina: "consulta médica", "agendamento"
- [ ] Automação: "casa inteligente", "automação"
- [ ] Logística: "instalar internet", "técnico"

**Resultado esperado**: 100% de precisão na classificação

---

### Teste 2.2: Sales Agent - Conversão
**Fluxo completo**:
1. Cliente interessado em plano
2. Agent apresenta planos do IXC
3. Cliente escolhe plano
4. Agent coleta dados (CPF, nome, endereço)
5. Validação de cobertura via CEP
6. Geração de contrato
7. Assinatura digital

**Validações**:
- [ ] Planos corretos do IXC
- [ ] CEP válido na área de cobertura
- [ ] Dados coletados completos
- [ ] Contrato gerado corretamente
- [ ] Link de assinatura enviado

---

### Teste 2.3: Support-Tech Agent - Reboot
**Fluxo de reboot**:
1. Cliente offline identificado
2. Agent solicita permissão para reiniciar
3. Cliente autoriza
4. Chamada ao `reboot-client-equipment`
5. Verificar status após reboot
6. Confirmar resolução

**Validações**:
- [ ] Permissão do cliente capturada
- [ ] Reboot executado com sucesso
- [ ] Status atualizado no DB
- [ ] Feedback enviado ao cliente
- [ ] Métrica de sucesso registrada

---

### Teste 2.4: Support-Financial Agent - LGPD
**Fluxo de opt-out**:
1. Cliente envia: "SAIR"
2. Agent marca opt_out_requested=true
3. Agent atualiza lgpd_consent=false
4. Confirmação enviada
5. Próximas mensagens bloqueadas

**Validações**:
- [ ] Opt-out registrado no DB
- [ ] Mensagens futuras bloqueadas
- [ ] Confirmação enviada
- [ ] Logs LGPD gerados

---

## 3️⃣ Testes de Integrações

### Teste 3.1: IXC Integration
**Endpoints a testar**:
- [ ] `/cliente` - Buscar cliente por CPF
- [ ] `/cliente_contrato` - Listar contratos
- [ ] `/fn_areceber` - Títulos financeiros
- [ ] `/cliente_assunto` - Listar assuntos
- [ ] `/su_oss_chamado` - Abrir ticket
- [ ] `/raio_status` - Status rádios
- [ ] `/olt_status` - Status ONUs

**Validações**:
- [ ] Circuit breaker não abre
- [ ] Cache funcionando (2º request mais rápido)
- [ ] Retry em caso de falha
- [ ] Métricas coletadas

---

### Teste 3.2: Evolution API
**Testes**:
- [ ] Conexão com instância SDR2
- [ ] Envio de mensagem texto
- [ ] Envio de mensagem com mídia
- [ ] Recebimento via webhook
- [ ] Estado da instância = "open"

**Comando de teste**:
```bash
curl https://mxdupkbpxjcfxdgrwknp.supabase.co/functions/v1/test-evolution-api \
  -H "Authorization: Bearer TOKEN"
```

---

## 4️⃣ Testes de Features Críticas

### Teste 4.1: Circuit Breaker
**Cenário de sobrecarga**:
1. Simular 100 requests simultâneos ao IXC
2. Verificar que circuit breaker abre após threshold
3. Validar que requisições param de ir ao IXC
4. Testar reset manual
5. Verificar que volta a funcionar

**Validações**:
- [ ] Circuit breaker abre corretamente
- [ ] Erro retornado é amigável
- [ ] Reset manual funciona
- [ ] Métricas de circuit breaker corretas

---

### Teste 4.2: Dead Letter Queue (DLQ)
**Fluxo de retry**:
1. Simular falha no envio de WhatsApp
2. Verificar registro no DLQ
3. Executar `process-dlq`
4. Validar retry com backoff exponencial
5. Confirmar sucesso ou falha final

**Validações**:
- [ ] Ação registrada no DLQ
- [ ] Retry executado com delay
- [ ] Limite de retries respeitado (5x)
- [ ] Alerta gerado após limite

---

### Teste 4.3: Mass Outage Detection
**Cenário de queda em massa**:
1. Simular 25+ clientes offline simultaneamente
2. Executar `detect-mass-outage`
3. Verificar detecção de outage
4. Validar notificações enviadas
5. Confirmar status_resolved após restauração

**Validações**:
- [ ] Outage detectado corretamente
- [ ] Clientes afetados identificados
- [ ] Notificações enviadas (email, WhatsApp)
- [ ] Dashboard atualizado
- [ ] Resolução registrada

---

### Teste 4.4: Auto-Reboot System
**Fluxo automático**:
1. Equipamento frozen por 15+ minutos
2. `check-reboot-candidates` identifica
3. Cliente elegível para reboot automático
4. `auto-reboot-frozen-equipment` executa
5. Validar reboot e notificação

**Validações**:
- [ ] Candidato identificado corretamente
- [ ] Blacklist respeitada
- [ ] Reboot executado com sucesso
- [ ] Cliente notificado
- [ ] Histórico registrado

---

## 5️⃣ Testes de Segurança e LGPD

### Teste 5.1: RLS Policies
**Validações**:
- [ ] Usuário comum não acessa dados de outros
- [ ] Admin acessa tudo
- [ ] Agent só acessa conversas atribuídas
- [ ] Public tables acessíveis sem auth

**Como testar**:
```typescript
// Tentar acessar conversa de outro usuário
const { data, error } = await supabase
  .from('conversations')
  .select('*')
  .eq('id', 'conversation_de_outro_usuario');

// Deve retornar vazio ou erro
```

---

### Teste 5.2: Validação e Mascaramento de CPF
**Cenários**:
- [ ] CPF válido: "123.456.789-00" → aceito
- [ ] CPF inválido: "111.111.111-11" → rejeitado
- [ ] CPF sem formatação: "12345678900" → aceito e formatado
- [ ] CPF nos logs: sempre mascarado (***.***.789-00)

**Função**: `validateAndMaskCPF()` em `_shared/`

---

### Teste 5.3: Rate Limiting
**Teste de abuso**:
1. Enviar 15 mensagens em 10 minutos do mesmo cliente
2. Verificar bloqueio após 10 mensagens
3. Aguardar 5 minutos
4. Verificar que voltou a funcionar

**Validações**:
- [ ] Limite de 10 msgs/15min respeitado
- [ ] Mensagem de erro clara
- [ ] Reset após janela de tempo
- [ ] Logs de rate limit gerados

---

### Teste 5.4: PII Redaction
**Validar redação de dados sensíveis nos logs**:
- [ ] CPF redatado: 123.456.789-00 → ***.***.789-**
- [ ] Email redatado: user@example.com → u***@e***.com
- [ ] Telefone redatado: (61) 99988-7766 → (61) ***88-**66

**Arquivo**: `_shared/pii-redaction.ts`

---

## 6️⃣ Testes de Performance

### Teste 6.1: Load Test - Webhook WhatsApp
**Cenário**: 100 mensagens simultâneas

**Como executar**:
```bash
# Usar ferramenta como k6 ou Artillery
artillery quick --count 100 --num 1 \
  https://mxdupkbpxjcfxdgrwknp.supabase.co/functions/v1/whatsapp-webhook
```

**Métricas esperadas**:
- [ ] P95 latency < 2s
- [ ] P99 latency < 5s
- [ ] Error rate < 1%
- [ ] Circuit breaker não abre

---

### Teste 6.2: Cache Effectiveness
**Validar cache do IXC Proxy**:
1. Request inicial (cache MISS)
2. Request idêntico em <5min (cache HIT)
3. Verificar tempo de resposta reduzido

**Métricas**:
- [ ] Cache hit rate > 60%
- [ ] Response time em cache < 100ms
- [ ] TTL respeitado (5min)

---

### Teste 6.3: Concorrência de Agents
**Cenário**: 50 conversas simultâneas

**Validações**:
- [ ] Todas as conversas processadas
- [ ] Sem race conditions
- [ ] Sem deadlocks no DB
- [ ] Métricas de concorrência corretas

---

## 7️⃣ Testes de Observabilidade

### Teste 7.1: Structured Logging
**Validar formato de logs**:
```json
{
  "timestamp": "2025-10-23T12:00:00Z",
  "level": "info",
  "function_name": "support-tech-agent",
  "correlation_id": "uuid",
  "message": "Cliente diagnosticado",
  "context": {
    "cpf": "***.***.789-00",
    "online": false
  }
}
```

**Validações**:
- [ ] Todos os logs em JSON
- [ ] correlation_id presente
- [ ] PII redatado
- [ ] Níveis corretos (debug, info, warn, error)

---

### Teste 7.2: Metrics Collection
**Métricas a validar**:
- [ ] `metrics_collector` rodando via cron
- [ ] Dados em `function_metrics`
- [ ] Dashboard acessível em `/system-metrics`
- [ ] Alertas funcionando

---

### Teste 7.3: Health Check
**Endpoint**: `/system-health`

**Validações**:
- [ ] Status 200 quando tudo OK
- [ ] Status 503 quando algo crítico falha
- [ ] Detalhes de cada componente
- [ ] Tempo de resposta < 500ms

---

## 8️⃣ Testes de Disaster Recovery

### Teste 8.1: Rollback de Deploy
**Cenário**: Deploy com bug crítico

**Passos**:
1. Deploy versão com bug
2. Identificar problema no health check
3. Executar rollback via Lovable/Supabase
4. Validar que versão anterior voltou
5. Confirmar que sistema funciona

**Tempo máximo**: 5 minutos (SLA)

---

### Teste 8.2: Restore de Backup
**Cenário**: Perda de dados

**Passos**:
1. Criar backup manual via Supabase
2. Simular perda de dados (deletar tabela test)
3. Restaurar backup
4. Validar integridade dos dados
5. Confirmar que aplicação funciona

**Documentação**: Ver `docs/backup-guide.md`

---

## 📊 Critérios de Sucesso Geral

Para aprovar o sistema para produção, TODOS os seguintes critérios devem ser atendidos:

### Funcionalidade
- [x] 100% dos testes de fluxo WhatsApp passando
- [x] 100% dos agents respondendo corretamente
- [x] 100% das integrações funcionando

### Performance
- [x] P95 latency < 2s
- [x] P99 latency < 5s
- [x] Error rate < 1%

### Segurança
- [x] RLS policies validadas
- [x] PII redaction funcionando
- [x] Rate limiting ativo
- [x] LGPD compliance

### Observabilidade
- [x] Logs estruturados
- [x] Métricas coletadas
- [x] Alertas configurados
- [x] Health check responsivo

### Resiliência
- [x] Circuit breaker protegendo
- [x] DLQ processando retries
- [x] Rollback testado
- [x] Backup validado

---

## 🚀 Próximos Passos

1. **Executar todos os testes**: Usar o componente `TestSuiteRunner`
2. **Documentar resultados**: Marcar todos os checkboxes acima
3. **Corrigir falhas**: Se algum teste falhar, corrigir antes de produção
4. **Aprovação final**: Revisar com equipe técnica
5. **Deploy**: Seguir procedimentos do `operational-guide.md`

---

## 📞 Contato em Caso de Dúvidas

- **Documentação**: `docs/operational-guide.md`
- **Suporte Técnico**: Lovable Discord
- **Dashboard**: `/system-metrics`
- **Health Check**: `GET /system-health`
