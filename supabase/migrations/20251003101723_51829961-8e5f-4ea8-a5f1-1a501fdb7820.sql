-- Inserir conhecimento sobre endpoints IXC relacionados a GPON
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
  'Endpoints IXC - Infraestrutura GPON',
  '# Endpoints IXC para Monitoramento GPON

## 📡 Endpoints Confirmados

### 1. radusuarios (RADIUS)
**Endpoint**: `/webservice/v1/radusuarios`
**Função**: Monitorar status online/offline dos clientes na ONU/ONT
**Dados principais**:
- `login` - Login do cliente
- `acctstoptime` - Data/hora da última desconexão
- `acctstarttime` - Data/hora da última conexão
- `framedipaddress` - IP atribuído ao cliente

**Uso**: Identificar clientes offline para monitoramento proativo

---

## 🔍 Endpoints Potenciais (a investigar)

### Equipamentos/ONU
- `cliente_equipamento` - ONUs/ONTs instaladas por cliente
- `equipamento_fibra` - Cadastro geral de equipamentos ópticos
- `pon_onu` - Gestão específica de ONUs na rede PON

### Monitoramento de Rede
- `pon_olt` - Configuração e status das OLTs
- `pon_sinal` - Potência óptica e qualidade do sinal
- `cliente_conexao_historico` - Histórico de conexões/desconexões

### Infraestrutura Física
- `fibra_cto` - CTOs (Caixas de Terminação Óptica)
- `fibra_splitter` - Cadastro de splitters ópticos
- `fibra_cabo` - Mapeamento do trajeto da fibra
- `fibra_rede` - Topologia da rede FTTH

### Diagnóstico
- `pon_diagnostico` - Diagnóstico de qualidade do sinal
- `pon_rx_power` - Potência de recepção
- `pon_tx_power` - Potência de transmissão

---

## 🎯 Aplicação Prática

**Monitoramento Proativo de Clientes Offline**:
1. Consultar `radusuarios` a cada 5 minutos
2. Identificar clientes com `acctstoptime` > 12h
3. Verificar `cliente_equipamento` para dados da ONU
4. Consultar `pon_sinal` para diagnóstico
5. Enviar notificação proativa via WhatsApp
6. Abrir OS automática se necessário

**Relação GPON → IXC**:
- OLT → Gerenciada via `pon_olt`
- Splitter → Cadastrado em `fibra_splitter`
- CTO → Registrado em `fibra_cto`
- ONU/ONT → Associado em `cliente_equipamento`
- Status Online → Monitorado em `radusuarios`',
  'document',
  'ixc-provedor',
  ARRAY['gpon', 'onu', 'olt', 'infraestrutura', 'monitoramento', 'fibra'],
  ARRAY['support_tech'],
  true,
  100
);