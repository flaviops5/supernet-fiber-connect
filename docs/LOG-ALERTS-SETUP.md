# 🚨 Sistema de Alertas de Logs - Configuração

## Visão Geral

O sistema detecta automaticamente logs de erro críticos (`logger.error()`) e envia alertas via WhatsApp para responsáveis configurados, evitando spam através de agrupamento por contexto.

## Componentes

### 1. Edge Function: `log-alert-handler`
- **Localização**: `supabase/functions/log-alert-handler/`
- **Função**: Busca logs de erro não notificados, agrupa por contexto e envia WhatsApp
- **Frequência**: Executada via trigger de database ou cron job (recomendado: a cada 5 minutos)

### 2. Dashboard: Log Analytics
- **Rota**: `/monitoring/analytics`
- **Recursos**:
  - KPIs de logs (total, erros, warnings, info)
  - Timeline de logs por hora
  - Distribuição por nível (gráfico de pizza)
  - Top 10 contextos mais ativos
  - Lista de erros recentes
  - Exportação de logs em CSV
  - Auto-refresh a cada 30 segundos

## Configuração

### Passo 1: Configurar Responsáveis de Alerta

Insira contatos na tabela `responsaveis_alerta`:

```sql
INSERT INTO responsaveis_alerta (nome, telefone, funcao, tipo_evento, ativo)
VALUES 
  ('João Silva', '5511999999999', 'DevOps Lead', 'all', true),
  ('Maria Santos', '5511888888888', 'Suporte Tech', 'support', true),
  ('Pedro Costa', '5511777777777', 'Coordenador Rede', 'network', true);
```

**Campos**:
- `nome`: Nome do responsável
- `telefone`: WhatsApp no formato internacional (5511999999999)
- `funcao`: Cargo/função
- `tipo_evento`: Tipo de evento (all, support, network, etc.) - filtra alertas
- `ativo`: true/false para ativar/desativar

### Passo 2: Adicionar Coluna `alerted_at` (se não existir)

```sql
ALTER TABLE monitoring_logs 
ADD COLUMN IF NOT EXISTS alerted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_monitoring_logs_alerted 
ON monitoring_logs(level, log_timestamp, alerted_at) 
WHERE level = 'error' AND alerted_at IS NULL;
```

### Passo 3: Automatizar Execução (Escolha uma opção)

#### Opção A: Database Trigger (Tempo Real)
```sql
CREATE OR REPLACE FUNCTION trigger_log_alert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.level = 'error' THEN
    -- Invocar edge function de forma assíncrona
    PERFORM net.http_post(
      url := concat(current_setting('app.settings.supabase_url'), '/functions/v1/log-alert-handler'),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', concat('Bearer ', current_setting('app.settings.service_role_key'))
      ),
      body := '{}'::jsonb
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_error_log_alert
AFTER INSERT ON monitoring_logs
FOR EACH ROW
WHEN (NEW.level = 'error')
EXECUTE FUNCTION trigger_log_alert();
```

#### Opção B: Cron Job (Recomendado - Evita Spam)
```sql
-- Instalar pg_cron (se necessário)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Executar a cada 5 minutos
SELECT cron.schedule(
  'log-alerts-check',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := concat(current_setting('app.settings.supabase_url'), '/functions/v1/log-alert-handler'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', concat('Bearer ', current_setting('app.settings.service_role_key'))
    ),
    body := '{}'::jsonb
  );
  $$
);
```

#### Opção C: External Cron (cURL)
Configure um serviço externo (cron.job, GitHub Actions, etc.) para chamar:

```bash
curl -X POST \
  https://[SEU_PROJECT_ID].supabase.co/functions/v1/log-alert-handler \
  -H "Authorization: Bearer [SERVICE_ROLE_KEY]" \
  -H "Content-Type: application/json"
```

## Formato do Alerta WhatsApp

```
🚨 *ALERTA DE ERRO CRÍTICO*

📍 Contexto: support-tech-agent
⚠️ Ocorrências: 3
📝 Mensagem: Falha ao criar ticket IXC
🔗 CorrelationID: abc123-def456-ghi789
⏰ Timestamp: 09/11/2025 14:35:22

📦 Metadata: {"ticketId": "12345", "clientId": "98765", "error": "Connection timeout"}...
```

## Recursos Anti-Spam

1. **Agrupamento por Contexto**: Erros do mesmo contexto são agrupados em uma única mensagem
2. **Janela de Tempo**: Busca erros dos últimos 5 minutos
3. **Flag `alerted_at`**: Evita reenvio de alertas para o mesmo log
4. **Limite de Logs**: Processa no máximo 10 erros por execução

## Monitoramento

### Verificar Logs da Edge Function
```sql
SELECT * FROM monitoring_logs 
WHERE context = 'log-alert-handler' 
ORDER BY log_timestamp DESC 
LIMIT 20;
```

### Verificar Alertas Enviados
```sql
SELECT 
  context,
  COUNT(*) as total_erros,
  COUNT(alerted_at) as alertados,
  MAX(log_timestamp) as ultimo_erro
FROM monitoring_logs
WHERE level = 'error' 
  AND log_timestamp > NOW() - INTERVAL '1 day'
GROUP BY context
ORDER BY total_erros DESC;
```

### Analytics no Dashboard
Acesse `/monitoring/analytics` para visualizar:
- Total de logs e distribuição por nível
- Timeline de erros, warnings e info
- Top contextos com mais atividade
- Lista de erros recentes com detalhes

## Troubleshooting

### Alertas não estão sendo enviados
1. Verificar se `responsaveis_alerta` tem contatos ativos
2. Verificar se WhatsApp Edge Function está funcionando
3. Verificar logs da `log-alert-handler`
4. Confirmar que cron job/trigger está ativo

### Spam de alertas
1. Aumentar intervalo do cron job (ex: 10 minutos)
2. Revisar lógica de agrupamento
3. Adicionar filtros por severidade

### Performance
```sql
-- Index otimizado para queries de alerta
CREATE INDEX idx_monitoring_logs_alert_query 
ON monitoring_logs(level, log_timestamp DESC, alerted_at) 
WHERE level = 'error';

-- Limpeza de logs antigos (manter 30 dias)
DELETE FROM monitoring_logs 
WHERE log_timestamp < NOW() - INTERVAL '30 days';
```

## Melhores Práticas

1. **Use Contextos Descritivos**: `logger.error('msg', { context: 'nome-do-componente' })`
2. **Inclua Metadata Relevante**: Adicione IDs, valores de erro, stack traces
3. **Correlation IDs**: Sempre propague o correlationId entre chamadas
4. **Evite Logs Excessivos**: Use `logger.warn()` para casos não críticos
5. **Monitore Regularmente**: Revise o dashboard analytics semanalmente

## Próximos Passos

- [ ] Configurar tabela `responsaveis_alerta`
- [ ] Adicionar coluna `alerted_at` em `monitoring_logs`
- [ ] Escolher e configurar método de automação (trigger ou cron)
- [ ] Testar alertas com erro simulado
- [ ] Acessar dashboard `/monitoring/analytics`
- [ ] Configurar limpeza automática de logs antigos
