import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EscalationRule {
  id: string;
  from_department: string;
  to_department: string;
  priority: number;
  conditions: {
    keywords?: string[];
  };
  enabled: boolean;
  auto_escalate_after_minutes?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversation_id, message_content, current_department } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar configurações de escalonamento
    const { data: settings, error: settingsError } = await supabase
      .from('escalation_settings')
      .select('*')
      .single();

    if (settingsError || !settings?.enabled) {
      return new Response(
        JSON.stringify({ should_escalate: false, reason: 'Escalation disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar regras ativas para o departamento atual
    const { data: rules, error: rulesError } = await supabase
      .from('escalation_rules')
      .select('*')
      .eq('from_department', current_department)
      .eq('enabled', true)
      .order('priority', { ascending: true });

    if (rulesError || !rules || rules.length === 0) {
      return new Response(
        JSON.stringify({ should_escalate: false, reason: 'No rules found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const messageLower = message_content.toLowerCase();

    // Verificar cada regra
    for (const rule of rules as EscalationRule[]) {
      const keywords = rule.conditions?.keywords || [];
      
      // Verificar se alguma palavra-chave foi encontrada
      const keywordMatch = keywords.some(keyword => 
        messageLower.includes(keyword.toLowerCase())
      );

      if (keywordMatch) {
        // Buscar agente disponível no departamento de destino
        const { data: availableAgents } = await supabase
          .rpc('get_available_agents_for_department', {
            dept: rule.to_department,
            include_universal: true
          });

        if (availableAgents && availableAgents.length > 0) {
          const targetAgent = availableAgents[0];

          // Registrar escalonamento no histórico
          await supabase
            .from('escalation_history')
            .insert({
              conversation_id,
              from_department: current_department,
              to_department: rule.to_department,
              to_agent_id: targetAgent.user_id,
              rule_id: rule.id,
              escalation_type: settings.mode,
              reason: rule.description,
              customer_notified: settings.mode === 'explicit'
            });

          return new Response(
            JSON.stringify({
              should_escalate: true,
              escalation_mode: settings.mode,
              target_department: rule.to_department,
              target_agent_id: targetAgent.user_id,
              rule_description: rule.description,
              matched_keywords: keywords.filter(k => messageLower.includes(k.toLowerCase()))
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    return new Response(
      JSON.stringify({ should_escalate: false, reason: 'No matching rules' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error checking escalation:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});