export default function GPT5() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-foreground mb-4">
          Sistema de Atendimento Inteligente - Documentação Técnica Completa
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          Arquitetura, fluxos e implementação dos agentes de IA com IXC ERP e Supabase
        </p>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          {/* Resumo Executivo */}
          <section className="bg-card p-6 rounded-lg border">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              Resumo Executivo
            </h2>
            <p className="text-muted-foreground mb-4">
              <strong>Cloé (orquestradora)</strong> realiza todas as consultas; <strong>Luan (técnico)</strong>, 
              <strong> Júlia Martins (financeiro)</strong> e <strong>Vicente (vendas)</strong> recebem contexto e, 
              quando necessário, executam ações no IXC (criar/atualizar atendimentos, reiniciar equipamentos, criar lead). 
              Todas as ações ficam registradas em <code>action_log</code> no Supabase.
            </p>
          </section>

          {/* 1 - Arquitetura */}
          <section className="bg-card p-6 rounded-lg border">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              1. Arquitetura (Visão Rápida)
            </h2>
            <pre className="bg-muted p-4 rounded-md overflow-x-auto">
              <code>{`Cliente → Cloé (routing-agent) → {Luan | Júlia Martins | Vicente}
                    ↓
                IXC Proxy (single auth)
                    ↓
                IXC ERP (atendimentos, reboot, financeiro)
                    ↓
                Supabase (conversations, conversation_messages, action_log)`}</code>
            </pre>
          </section>

          {/* 2 - Tabelas Essenciais */}
          <section className="bg-card p-6 rounded-lg border">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              2. Tabelas Essenciais (SQL Migration)
            </h2>
            <details>
              <summary className="cursor-pointer font-medium mb-2">Ver SQL completo →</summary>
              <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm">
                <code>{`-- migrations/002_action_log_and_indexes.sql
CREATE TABLE IF NOT EXISTS action_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name text NOT NULL,
  client_cpf text,
  action_type text NOT NULL,
  -- Tipos: create_ticket, remote_reboot, payment_link, 
  --        create_lead, schedule_visit, update_ticket
  action_payload jsonb,
  ixcticket_id text,
  result jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mass_outage_affected_logins 
  ON mass_outage_events USING gin(affected_logins jsonb_path_ops);
CREATE INDEX IF NOT EXISTS idx_conversations_customer_cpf 
  ON conversations(customer_cpf);`}</code>
              </pre>
            </details>
          </section>

          {/* 3 - Regras IXC */}
          <section className="bg-card p-6 rounded-lg border">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              3. Regras de Quando Disparar Chamada IXC
            </h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold mb-2">Luan (Técnico)</h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li><strong>remote_reboot</strong> → quando tentativa remota for plausível</li>
                  <li><strong>create_ticket</strong> → quando diagnóstico indicar visita física</li>
                  <li><strong>update_ticket</strong> → quando o status muda</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-2">Júlia Martins (Financeiro)</h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li><strong>create_ticket</strong> → escalação administrativa</li>
                  <li><strong>payment_link</strong> → registra ação</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-2">Vicente (Vendas)</h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li><strong>create_lead</strong> → sempre para novo cliente</li>
                  <li><strong>create_ticket</strong> → instalação/upgrade</li>
                </ul>
              </div>

              <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded">
                <p className="text-sm font-semibold">⚠️ Importante:</p>
                <p className="text-sm text-muted-foreground">Cloé nunca cria atendimentos, só consulta e roteia.</p>
              </div>
            </div>
          </section>

          {/* Documentação completa disponível no código */}
          <section className="bg-card p-6 rounded-lg border">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              Documentação Completa
            </h2>
            <p className="text-muted-foreground">
              Para a documentação técnica completa incluindo exemplos de código, payloads, fluxos Mermaid, 
              testes e variáveis de ambiente, consulte o código-fonte desta página ou a documentação interna do projeto.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
