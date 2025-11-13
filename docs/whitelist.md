# Whitelist de IPs - Rate Limiting

## 📋 Visão Geral

Sistema de whitelist para IPs/ranges confiáveis que bypassam completamente o rate limiting. Ideal para:
- **APIs internas** (microserviços, backends)
- **Serviços autorizados** (parceiros, integrações)
- **Ferramentas de monitoramento** (health checks, alertas)
- **IPs corporativos** (VPNs, escritórios)

## ⚠️ Importante - Segurança

**ATENÇÃO**: IPs whitelisted **bypassam completamente** todos os rate limits. Use apenas para sistemas confiáveis!

### Riscos
- ❌ IP whitelisted pode abusar de recursos
- ❌ Atacante com acesso ao IP pode explorar bypass
- ❌ IPs corporativos podem ter múltiplos usuários

### Boas Práticas
- ✅ Use expiração para acessos temporários
- ✅ Documente o motivo de cada entrada
- ✅ Monitore logs de acesso via whitelist
- ✅ Revise periodicamente a lista
- ✅ Prefira ranges CIDR pequenos

## 🏗️ Estrutura

### Tabela: `rate_limit_whitelist`

```sql
CREATE TABLE rate_limit_whitelist (
  id UUID PRIMARY KEY,
  ip_address INET,              -- IP específico (ex: 192.168.1.100)
  ip_range CIDR,                -- Range CIDR (ex: 192.168.1.0/24)
  label TEXT NOT NULL,          -- Nome/descrição curta
  description TEXT,             -- Descrição detalhada
  reason TEXT NOT NULL,         -- Motivo do whitelist
  added_by UUID,                -- Usuário que adicionou
  is_active BOOLEAN,            -- Ativo/inativo
  expires_at TIMESTAMP,         -- Expiração automática (opcional)
  metadata JSONB,               -- Dados extras
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Funções

#### `is_ip_whitelisted(check_ip INET)`

Verifica se um IP está na whitelist ativa.

```sql
SELECT is_ip_whitelisted('192.168.1.100'::inet);
-- Retorna: true ou false
```

Lógica:
1. Verifica se `is_active = true`
2. Verifica se não expirou (`expires_at IS NULL OR expires_at > now()`)
3. Match exato de IP OU dentro do range CIDR

#### `add_to_whitelist(...)`

Adiciona IP/range à whitelist com validação.

```sql
SELECT add_to_whitelist(
  p_ip_address := '192.168.1.100'::inet,
  p_ip_range := NULL,
  p_label := 'API Interna - Produção',
  p_description := 'Servidor de processamento de pedidos',
  p_reason := 'Internal API',
  p_expires_at := NULL
);
-- Retorna: UUID do registro criado
```

Validações:
- Pelo menos `ip_address` ou `ip_range` deve ser fornecido
- `label` deve ter no mínimo 2 caracteres
- Registra log de segurança automaticamente

## 🚀 Uso

### Interface Admin

Acesse: `/admin/whitelist`

**Funcionalidades:**
- ➕ Adicionar IPs individuais ou ranges CIDR
- 🔄 Ativar/desativar entradas
- 🗑️ Remover da whitelist
- ⏰ Configurar expiração automática
- 📊 Visualizar status e histórico

### Via SQL

```sql
-- Adicionar IP específico
SELECT add_to_whitelist(
  p_ip_address := '203.0.113.10'::inet,
  p_label := 'API Gateway',
  p_reason := 'Internal API',
  p_description := 'Gateway principal de APIs internas'
);

-- Adicionar range CIDR (toda a subnet)
SELECT add_to_whitelist(
  p_ip_range := '10.0.0.0/8'::cidr,
  p_label := 'Rede Corporativa',
  p_reason := 'Corporate Network',
  p_description := 'Todos os IPs da rede interna'
);

-- Adicionar com expiração (7 dias)
SELECT add_to_whitelist(
  p_ip_address := '198.51.100.42'::inet,
  p_label := 'Parceiro Temporário',
  p_reason := 'Partner Integration',
  p_expires_at := now() + interval '7 days'
);

-- Verificar se IP está whitelisted
SELECT is_ip_whitelisted('192.168.1.100'::inet);

-- Desativar entrada
UPDATE rate_limit_whitelist
SET is_active = false
WHERE label = 'API Gateway';

-- Remover da whitelist
DELETE FROM rate_limit_whitelist
WHERE id = 'uuid-aqui';
```

### Integração Automática

A whitelist é verificada **automaticamente** em `check_rate_limit_with_ip()`:

```sql
-- Exemplo de resposta para IP whitelisted
{
  "allowed": true,
  "whitelisted": true,
  "remaining_attempts": 5,
  "message": "Whitelisted IP - no rate limit applied"
}
```

## 📊 Exemplos de Uso

### 1. API Interna (Produção)

```sql
SELECT add_to_whitelist(
  p_ip_address := '10.0.1.50'::inet,
  p_label := 'API Backend - Produção',
  p_description := 'Servidor principal de APIs internas',
  p_reason := 'Internal API'
);
```

### 2. Range de Escritório

```sql
SELECT add_to_whitelist(
  p_ip_range := '192.168.100.0/24'::cidr,
  p_label := 'Escritório Central',
  p_description := 'Todos os IPs do escritório principal',
  p_reason := 'Corporate Network'
);
```

### 3. Parceiro Temporário

```sql
SELECT add_to_whitelist(
  p_ip_address := '203.0.113.42'::inet,
  p_label := 'Parceiro XYZ - Migração',
  p_description := 'Acesso temporário durante migração de dados',
  p_reason := 'Partner Integration',
  p_expires_at := '2025-12-31 23:59:59'::timestamp
);
```

### 4. Monitoramento

```sql
SELECT add_to_whitelist(
  p_ip_address := '198.51.100.100'::inet,
  p_label := 'Uptime Monitor',
  p_description := 'Serviço de health check externo',
  p_reason := 'Monitoring Service'
);
```

## 🔍 Monitoramento

### Ver Acessos via Whitelist

```sql
-- Últimos 100 acessos whitelisted
SELECT 
  created_at,
  event_description,
  details->>'ip_address' as ip,
  details->>'action_type' as action
FROM security_logs
WHERE event_type = 'rate_limit_whitelist_bypass'
ORDER BY created_at DESC
LIMIT 100;
```

### Top IPs Whitelisted

```sql
-- IPs que mais usam whitelist (últimas 24h)
SELECT 
  details->>'ip_address' as ip,
  COUNT(*) as access_count,
  array_agg(DISTINCT details->>'action_type') as actions
FROM security_logs
WHERE event_type = 'rate_limit_whitelist_bypass'
  AND created_at > now() - interval '24 hours'
GROUP BY details->>'ip_address'
ORDER BY access_count DESC;
```

### Entradas Expiradas

```sql
-- Whitelist entries que expiraram
SELECT 
  label,
  ip_address,
  ip_range,
  expires_at,
  age(expires_at) as expired_for
FROM rate_limit_whitelist
WHERE is_active = true
  AND expires_at IS NOT NULL
  AND expires_at < now()
ORDER BY expires_at DESC;
```

### Estatísticas

```sql
-- Resumo da whitelist
SELECT 
  COUNT(*) as total_entries,
  COUNT(*) FILTER (WHERE is_active = true) as active_entries,
  COUNT(*) FILTER (WHERE ip_address IS NOT NULL) as specific_ips,
  COUNT(*) FILTER (WHERE ip_range IS NOT NULL) as cidr_ranges,
  COUNT(*) FILTER (WHERE expires_at IS NOT NULL AND expires_at > now()) as with_expiration,
  COUNT(*) FILTER (WHERE expires_at IS NOT NULL AND expires_at < now()) as expired
FROM rate_limit_whitelist;
```

## 🛡️ Segurança e RLS

### Policies

```sql
-- Admins/moderators podem visualizar
CREATE POLICY "Admins can view whitelist"
  ON rate_limit_whitelist FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() 
        AND role IN ('admin', 'moderator')
    )
  );

-- Apenas admins podem gerenciar
CREATE POLICY "Admins can manage whitelist"
  ON rate_limit_whitelist FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() 
        AND role = 'admin'
    )
  );
```

### Auditoria

Todas as ações são logadas:
- Adição à whitelist
- Remoção da whitelist
- Ativação/desativação
- Acessos via whitelist

```sql
-- Ver histórico de mudanças
SELECT * FROM security_logs
WHERE event_type IN (
  'whitelist_ip_added',
  'rate_limit_whitelist_bypass'
)
ORDER BY created_at DESC;
```

## 📚 CIDR Notation

### Exemplos Comuns

| CIDR | Range | IPs | Uso |
|------|-------|-----|-----|
| `/32` | x.x.x.x/32 | 1 | IP único |
| `/30` | x.x.x.0/30 | 4 | Ponto a ponto |
| `/29` | x.x.x.0/29 | 8 | Pequeno grupo |
| `/28` | x.x.x.0/28 | 16 | Subnet pequena |
| `/24` | x.x.x.0/24 | 256 | Subnet padrão |
| `/16` | x.x.0.0/16 | 65,536 | Rede grande |
| `/8` | x.0.0.0/8 | 16,777,216 | Classe A |

### Calculadora CIDR

```bash
# Verificar quantos IPs em um range
echo "192.168.1.0/24" | ipcalc

# Resultado:
# Network: 192.168.1.0/24
# Netmask: 255.255.255.0
# Hosts: 256 (254 usable)
```

## 🔧 Troubleshooting

### IP não está sendo whitelisted?

```sql
-- Verificar se IP está registrado
SELECT * FROM rate_limit_whitelist
WHERE ip_address = '192.168.1.100'::inet
   OR '192.168.1.100'::inet << ip_range;

-- Verificar se está ativo
SELECT is_ip_whitelisted('192.168.1.100'::inet);
```

### Range CIDR não funciona?

```sql
-- Testar match de IP em range
SELECT '192.168.1.100'::inet << '192.168.1.0/24'::cidr;
-- true se está dentro do range

-- Ver todos os ranges ativos
SELECT ip_range, label 
FROM rate_limit_whitelist
WHERE is_active = true
  AND ip_range IS NOT NULL;
```

### Remover todos os expirados

```sql
-- Desativar entradas expiradas
UPDATE rate_limit_whitelist
SET is_active = false
WHERE is_active = true
  AND expires_at IS NOT NULL
  AND expires_at < now();

-- Ou remover permanentemente
DELETE FROM rate_limit_whitelist
WHERE expires_at IS NOT NULL
  AND expires_at < now() - interval '90 days';
```

## 📈 Métricas Recomendadas

### Alertas

1. **Alto volume de acessos whitelisted**
   ```sql
   -- > 1000 acessos/hora de um único IP
   SELECT COUNT(*) 
   FROM security_logs
   WHERE event_type = 'rate_limit_whitelist_bypass'
     AND created_at > now() - interval '1 hour'
     AND details->>'ip_address' = 'ip-suspeito';
   ```

2. **Entradas expirando em breve**
   ```sql
   -- Expira nos próximos 7 dias
   SELECT * FROM rate_limit_whitelist
   WHERE is_active = true
     AND expires_at BETWEEN now() AND now() + interval '7 days';
   ```

3. **Whitelist crescendo muito rápido**
   ```sql
   -- > 10 novas entradas/dia
   SELECT COUNT(*) 
   FROM rate_limit_whitelist
   WHERE created_at > now() - interval '24 hours';
   ```

## 🎯 Casos de Uso

### ✅ Recomendado

- APIs internas com IP fixo
- Servidores de monitoramento conhecidos
- Parceiros com SLA definido
- Ferramentas de CI/CD
- Load balancers corporativos

### ❌ Não Recomendado

- IPs residenciais dinâmicos
- Ranges muito amplos (/8, /16) sem justificativa
- "Bypass temporário para testar" que vira permanente
- IPs de desenvolvedores individuais
- Qualquer IP sem documentação do motivo

## 📚 Referências

- [PostgreSQL INET/CIDR Types](https://www.postgresql.org/docs/current/datatype-net-types.html)
- [CIDR Notation Calculator](https://www.ipaddressguide.com/cidr)
- [Rate Limiting Best Practices](https://cloud.google.com/architecture/rate-limiting-strategies-techniques)
