import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FlowStep {
  id: string;
  agent_type: string;
  step_key: string;
  step_order: number;
  question: string;
  instruction: string;
  response_options: any;
  response_variations: any;
  next_step_map: any;
  awaits_response: boolean;
}

interface ConversationPath {
  steps: string[];
  responses: Array<{ step: string; response: string }>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { agentType } = await req.json();

    if (!agentType) {
      throw new Error('agentType é obrigatório');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`🔄 Buscando steps para agente: ${agentType}`);

    // 1. Buscar todos os steps do agente
    const { data: steps, error: stepsError } = await supabase
      .from('agent_flow_steps')
      .select('*')
      .eq('agent_type', agentType)
      .eq('is_active', true)
      .order('step_order');

    if (stepsError) throw stepsError;
    if (!steps || steps.length === 0) {
      throw new Error('Nenhum step encontrado para este agente');
    }

    console.log(`📊 ${steps.length} steps encontrados`);

    // 2. Gerar todos os caminhos possíveis
    const allPaths = generateAllPaths(steps);
    console.log(`🌳 ${allPaths.length} caminhos possíveis gerados`);

    // 3. Limpar simulações antigas deste agente
    await supabase
      .from('flow_simulations')
      .delete()
      .eq('agent_type', agentType);

    // 4. Gerar conversas para cada caminho usando IA
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    const simulations = [];

    for (let i = 0; i < allPaths.length; i++) {
      const path = allPaths[i];
      console.log(`💬 Gerando conversa ${i + 1}/${allPaths.length}...`);

      try {
        const conversation = await generateConversationWithAI(
          steps,
          path,
          agentType,
          lovableApiKey
        );

        simulations.push({
          agent_type: agentType,
          simulation_name: `Simulação #${i + 1} - ${path.responses.map(r => r.response).join(' → ')}`,
          conversation_path: path.steps,
          responses_chosen: path.responses,
          conversation_transcript: conversation.messages,
          total_steps: path.steps.length,
          estimated_duration_seconds: conversation.estimatedDuration,
          quality_score: conversation.qualityScore,
          issues_detected: conversation.issues,
          suggestions: conversation.suggestions,
          metadata: {
            generated_at: new Date().toISOString(),
            path_index: i
          }
        });
      } catch (error) {
        console.error(`❌ Erro ao gerar conversa ${i + 1}:`, error);
      }
    }

    // 5. Salvar todas as simulações no banco
    const { error: insertError } = await supabase
      .from('flow_simulations')
      .insert(simulations);

    if (insertError) throw insertError;

    console.log(`✅ ${simulations.length} simulações salvas com sucesso!`);

    return new Response(
      JSON.stringify({
        success: true,
        totalSimulations: simulations.length,
        agentType,
        avgQualityScore: simulations.reduce((acc, s) => acc + (s.quality_score || 0), 0) / simulations.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Gerar todos os caminhos possíveis no fluxo
function generateAllPaths(steps: FlowStep[]): ConversationPath[] {
  const paths: ConversationPath[] = [];
  
  // Encontrar o primeiro step (menor step_order)
  const firstStep = steps.reduce((min, step) => 
    step.step_order < min.step_order ? step : min, 
    steps[0]
  );
  
  console.log(`🎯 Primeiro step: ${firstStep.step_key} (order: ${firstStep.step_order})`);

  function explorePath(
    currentStepKey: string,
    visitedSteps: string[],
    responses: Array<{ step: string; response: string }>
  ) {
    const currentStep = steps.find(s => s.step_key === currentStepKey);
    
    // Se o step não existe, é um fim de caminho (transferência, resolução, etc)
    if (!currentStep) {
      console.log(`✅ Caminho completo encontrado: ${visitedSteps.length} steps -> ${currentStepKey}`);
      paths.push({
        steps: visitedSteps,
        responses: responses
      });
      return;
    }

    const newVisitedSteps = [...visitedSteps, currentStepKey];

    // Se não tem next_step_map ou está vazio, é fim do caminho
    if (!currentStep.next_step_map || Object.keys(currentStep.next_step_map).length === 0) {
      console.log(`✅ Caminho completo (sem próximos): ${newVisitedSteps.length} steps`);
      paths.push({
        steps: newVisitedSteps,
        responses: responses
      });
      return;
    }

    // Explorar cada opção de resposta
    const nextStepMap = currentStep.next_step_map;
    console.log(`🔍 Explorando ${currentStepKey}: ${Object.keys(nextStepMap).length} opções`);
    
    for (const [response, nextStep] of Object.entries(nextStepMap)) {
      // Evitar loops infinitos
      if (!visitedSteps.includes(nextStep as string)) {
        explorePath(
          nextStep as string,
          newVisitedSteps,
          [...responses, { step: currentStepKey, response }]
        );
      } else {
        console.log(`⚠️ Loop detectado: ${nextStep} já foi visitado`);
      }
    }
  }

  explorePath(firstStep.step_key, [], []);
  console.log(`🎉 Total de caminhos gerados: ${paths.length}`);
  return paths;
}

// Gerar conversa realista usando IA
async function generateConversationWithAI(
  steps: FlowStep[],
  path: ConversationPath,
  agentType: string,
  lovableApiKey: string
): Promise<{
  messages: any[];
  estimatedDuration: number;
  qualityScore: number;
  issues: string[];
  suggestions: string[];
}> {
  
  // Montar contexto do fluxo
  const pathSteps = path.steps.map(stepKey => {
    const step = steps.find(s => s.step_key === stepKey);
    const response = path.responses.find(r => r.step === stepKey);
    return {
      question: step?.question,
      instruction: step?.instruction,
      responseGiven: response?.response,
      variations: step?.response_variations
    };
  });

  const prompt = `Você é um especialista em análise de experiência do cliente.

CONTEXTO:
- Agente: ${agentType === 'support-tech-agent' ? 'Luan (Suporte Técnico)' : agentType}
- Cenário: Atendimento via WhatsApp

FLUXO DA CONVERSA:
${pathSteps.map((step, i) => `
Step ${i + 1}:
- Pergunta do Luan: ${step.question}
- Instrução interna: ${step.instruction}
- Resposta do cliente: ${step.responseGiven}
${step.variations ? `- Variações disponíveis: ${JSON.stringify(step.variations)}` : ''}
`).join('\n')}

TAREFA:
Gere uma conversa REALISTA e NATURAL entre o cliente e o Luan seguindo EXATAMENTE esse fluxo.
Use as variações de resposta quando disponíveis para tornar a conversa mais natural.

Retorne um JSON com:
{
  "messages": [
    {"role": "user", "message": "texto do cliente"},
    {"role": "assistant", "message": "texto do Luan"}
  ],
  "estimatedDuration": tempo_em_segundos,
  "qualityScore": score_de_0_a_100,
  "issues": ["problema1", "problema2"],
  "suggestions": ["sugestão1", "sugestão2"]
}

CRITÉRIOS DE QUALIDADE:
- Clareza das perguntas
- Tempo de resolução
- Experiência do usuário
- Naturalidade da conversa`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${lovableApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'Você é um analista de experiência do cliente especializado em atendimento técnico.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.8,
      response_format: { type: 'json_object' }
    }),
  });

  if (!response.ok) {
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  const result = JSON.parse(data.choices[0].message.content);

  return {
    messages: result.messages || [],
    estimatedDuration: result.estimatedDuration || 120,
    qualityScore: result.qualityScore || 70,
    issues: result.issues || [],
    suggestions: result.suggestions || []
  };
}
