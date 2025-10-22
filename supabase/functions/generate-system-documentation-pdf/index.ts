import { createPublicHandler } from '../_shared/base-handler.ts';

Deno.serve(createPublicHandler('generate-system-documentation-pdf', async (req, { supabase }) => {
  // Buscar documentação completa
  const { data: knowledgeDocs } = await supabase
    .from('knowledge_base')
    .select('*')
    .order('category', { ascending: true });

  const { data: agentConfigs } = await supabase
    .from('agent_configurations')
    .select('*')
    .eq('is_active', true);

  const { data: plans } = await supabase
    .from('plans')
    .select('*')
    .eq('is_active', true);

  // Montar HTML com toda documentação
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Documentação Completa do Sistema</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
    h1 { color: #ef4444; border-bottom: 3px solid #ef4444; padding-bottom: 10px; }
    h2 { color: #fb7185; border-bottom: 2px solid #fb7185; padding-bottom: 8px; margin-top: 30px; }
    h3 { color: #334155; margin-top: 20px; }
    .section { margin-bottom: 40px; page-break-inside: avoid; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background-color: #ef4444; color: white; }
    tr:nth-child(even) { background-color: #f9fafb; }
    code { background: #f3f4f6; padding: 2px 6px; border-radius: 3px; }
    pre { background: #1f2937; color: #f9fafb; padding: 15px; border-radius: 8px; overflow-x: auto; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; }
    .badge-success { background: #10b981; color: white; }
    .badge-info { background: #3b82f6; color: white; }
    .badge-warning { background: #f59e0b; color: white; }
  </style>
</head>
<body>
  <h1>📚 Documentação Completa do Sistema SUPERNET</h1>
  <p><strong>Gerado em:</strong> ${new Date().toLocaleString('pt-BR')}</p>
  
  <div class="section">
    <h2>🎯 Visão Geral</h2>
    <p>Sistema completo de atendimento inteligente com IA multiagente, integrações IXC, WhatsApp e automação de processos.</p>
    
    <h3>Componentes Principais</h3>
    <ul>
      <li><strong>Agentes de IA:</strong> 6 agentes especializados (vendas, suporte técnico, financeiro, logística, automação, telemedicina)</li>
      <li><strong>Edge Functions:</strong> 64 funções serverless (58 efetivas + 6 de teste)</li>
      <li><strong>Integrações:</strong> IXC Provedor, Evolution API (WhatsApp), OpenAI/Gemini</li>
      <li><strong>Automações:</strong> Envio de faturas, reboot de equipamentos, detecção de quedas massivas</li>
    </ul>
  </div>

  <div class="section">
    <h2>🤖 Agentes de IA Configurados</h2>
    <table>
      <thead>
        <tr>
          <th>Agente</th>
          <th>Tipo</th>
          <th>Modelo</th>
          <th>Temperatura</th>
          <th>Max Tokens</th>
        </tr>
      </thead>
      <tbody>
        ${agentConfigs?.map(agent => `
          <tr>
            <td><strong>${agent.name}</strong></td>
            <td><code>${agent.agent_type}</code></td>
            <td>${agent.model}</td>
            <td>${agent.temperature}</td>
            <td>${agent.max_tokens}</td>
          </tr>
        `).join('') || '<tr><td colspan="5">Nenhum agente configurado</td></tr>'}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>📦 Planos Disponíveis</h2>
    <table>
      <thead>
        <tr>
          <th>Plano</th>
          <th>Velocidade</th>
          <th>Preço</th>
          <th>Descrição</th>
        </tr>
      </thead>
      <tbody>
        ${plans?.map(plan => `
          <tr>
            <td><strong>${plan.name}</strong></td>
            <td>${plan.speed}</td>
            <td>R$ ${plan.price}</td>
            <td>${plan.description || '-'}</td>
          </tr>
        `).join('') || '<tr><td colspan="4">Nenhum plano configurado</td></tr>'}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>📚 Base de Conhecimento</h2>
    <p><strong>Total de documentos:</strong> ${knowledgeDocs?.length || 0}</p>
    
    ${['vendas', 'suporte', 'automacao', 'telemedicina', 'integracao', 'sistema'].map(cat => {
      const docs = knowledgeDocs?.filter(d => d.category === cat) || [];
      if (docs.length === 0) return '';
      
      return `
        <h3>${cat.toUpperCase()}</h3>
        <ul>
          ${docs.map(doc => `
            <li>
              <strong>${doc.title}</strong>
              ${doc.description ? `<br><small>${doc.description}</small>` : ''}
            </li>
          `).join('')}
        </ul>
      `;
    }).join('')}
  </div>

  <div class="section">
    <h2>⚙️ Edge Functions (58 Efetivas)</h2>
    
    <h3>🤖 Agentes de IA (6)</h3>
    <ul>
      <li><strong>automacao-agent:</strong> Automação residencial e dispositivos inteligentes</li>
      <li><strong>logistics-agent:</strong> Agendamentos de instalação</li>
      <li><strong>routing-agent:</strong> Roteamento inteligente de conversas</li>
      <li><strong>sales-agent:</strong> Vendas e contratação de planos</li>
      <li><strong>support-financial-agent:</strong> Suporte financeiro e cobranças</li>
      <li><strong>support-tech-agent:</strong> Suporte técnico e diagnósticos</li>
    </ul>

    <h3>🔗 Integrações IXC (15)</h3>
    <ul>
      <li><strong>ixc-proxy:</strong> Proxy centralizado com cache e circuit breaker</li>
      <li><strong>ixc-integration:</strong> Interface principal para operações IXC</li>
      <li><strong>ixc-evolution-proxy:</strong> Proxy para Evolution API integrada</li>
      <li><strong>ixc-count-clients:</strong> Contagem de clientes ativos</li>
      <li><strong>ixc-discover-gpon-endpoints:</strong> Descoberta automática de GPON</li>
      <li><strong>ixc-endpoints-health:</strong> Health check dos endpoints</li>
      <li><strong>ixc-financial-analytics:</strong> Análise financeira</li>
      <li><strong>ixc-list-contracts:</strong> Listagem de contratos</li>
      <li><strong>ixc-list-plans:</strong> Sincronização de planos</li>
      <li><strong>ixc-list-subjects:</strong> Assuntos de atendimento</li>
      <li><strong>ixc-pon-status:</strong> Status de portas PON</li>
      <li><strong>ixc-radio-status:</strong> Status de rádios</li>
      <li><strong>ixc-revenue-stats:</strong> Estatísticas de receita</li>
      <li><strong>ixc-sync-plans:</strong> Sincronização de planos para Supabase</li>
      <li><strong>sync-ixc-documentation:</strong> Sync de docs IXC</li>
    </ul>

    <h3>💬 WhatsApp e Comunicação (4)</h3>
    <ul>
      <li><strong>whatsapp-webhook:</strong> Recebe mensagens do WhatsApp</li>
      <li><strong>send-whatsapp-message:</strong> Envia mensagens via WhatsApp</li>
      <li><strong>voice-to-text:</strong> Transcrição de áudios</li>
      <li><strong>send-locaweb-email:</strong> Envio de emails</li>
    </ul>

    <h3>⚙️ Automação (7)</h3>
    <ul>
      <li><strong>auto-send-overdue-invoices:</strong> Envio automático de faturas vencidas</li>
      <li><strong>auto-reboot-frozen-equipment:</strong> Reboot automático de equipamentos</li>
      <li><strong>check-due-invoices:</strong> Verificação de vencimentos</li>
      <li><strong>check-reboot-candidates:</strong> Identificação de candidatos a reboot</li>
      <li><strong>check-escalation:</strong> Escalação de conversas</li>
      <li><strong>retry-failed-actions:</strong> Reprocessamento de falhas (DLQ)</li>
      <li><strong>network-maintenance-executor:</strong> Execução de manutenções</li>
    </ul>

    <h3>📊 Monitoramento (5)</h3>
    <ul>
      <li><strong>detect-mass-outage:</strong> Detecção de quedas massivas</li>
      <li><strong>metrics-collector:</strong> Coleta de métricas</li>
      <li><strong>system-health:</strong> Health check geral</li>
      <li><strong>check-lovable-ai-config:</strong> Validação Lovable AI</li>
      <li><strong>reset-circuit-breaker:</strong> Reset manual de circuit breakers</li>
    </ul>
  </div>

  <div class="section">
    <h2>🔒 Segurança e Robustez</h2>
    <ul>
      <li><span class="badge badge-success">Circuit Breaker Pattern</span> Proteção contra falhas em cascata</li>
      <li><span class="badge badge-success">HMAC Validation</span> Comunicação segura entre funções</li>
      <li><span class="badge badge-success">Rate Limiting</span> Controle de frequência por CPF</li>
      <li><span class="badge badge-success">Dead Letter Queue</span> Reprocessamento de falhas</li>
      <li><span class="badge badge-info">Cache Inteligente</span> Redis com invalidação automática</li>
      <li><span class="badge badge-info">Retry Logic</span> Tentativas automáticas com backoff</li>
    </ul>
  </div>

  <div class="section">
    <h2>📈 Métricas e Observabilidade</h2>
    <p>Sistema monitora:</p>
    <ul>
      <li>Taxa de sucesso/erro de cada agente</li>
      <li>Tempo médio de resposta</li>
      <li>Throughput de mensagens</li>
      <li>Status de circuit breakers</li>
      <li>Taxa de hit do cache</li>
      <li>Alertas automáticos para anomalias</li>
    </ul>
  </div>

  <div class="section">
    <h2>🔄 Fluxos Principais</h2>
    
    <h3>Atendimento WhatsApp</h3>
    <pre>Cliente → WhatsApp → Evolution API → whatsapp-webhook
  ↓
routing-agent (analisa mensagem)
  ↓
[sales-agent | support-tech-agent | support-financial-agent | ...]
  ↓
Resposta → send-whatsapp-message → Cliente</pre>

    <h3>Envio Automático de Faturas</h3>
    <pre>Cron (diário 09h) → auto-send-overdue-invoices
  ↓
Busca clientes FA no IXC (ixc-proxy)
  ↓
Para cada cliente: busca PIX/boleto
  ↓
send-whatsapp-message → Cliente inadimplente</pre>

    <h3>Reboot Automático</h3>
    <pre>Cron (30min) → check-reboot-candidates
  ↓
Identifica equipamentos sem tráfego
  ↓
auto-reboot-frozen-equipment
  ↓
Valida 3x com intervalo
  ↓
Se confirmado: executa reboot via IXC</pre>
  </div>

  <div class="section">
    <h2>📊 Estatísticas do Sistema</h2>
    <table>
      <tr>
        <th>Métrica</th>
        <th>Valor</th>
      </tr>
      <tr>
        <td>Total de Edge Functions</td>
        <td><strong>64</strong> (58 efetivas + 6 testes)</td>
      </tr>
      <tr>
        <td>Agentes de IA</td>
        <td><strong>6</strong> especializados</td>
      </tr>
      <tr>
        <td>Integrações Ativas</td>
        <td><strong>IXC, Evolution API, OpenAI, Gemini</strong></td>
      </tr>
      <tr>
        <td>Documentos Knowledge Base</td>
        <td><strong>${knowledgeDocs?.length || 0}</strong></td>
      </tr>
      <tr>
        <td>Planos Ativos</td>
        <td><strong>${plans?.length || 0}</strong></td>
      </tr>
    </table>
  </div>

  <footer style="margin-top: 60px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; color: #6b7280;">
    <p>Sistema SUPERNET FIBRA - Documentação Técnica Completa</p>
    <p>Gerado automaticamente em ${new Date().toLocaleString('pt-BR')}</p>
  </footer>
</body>
</html>`;

  return { html, success: true };
}));
