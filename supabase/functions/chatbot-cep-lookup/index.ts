import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createAuthenticatedHandler } from "../_shared/base-handler.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger } from '../_shared/logger.ts';

const logger = createLogger('chatbot-cep-lookup');

interface CepLookupRequest {
  cep?: string;
  message: string;
  action: 'check_coverage' | 'list_plans' | 'find_region';
}

interface CepPlanData {
  plans: {
    id: string;
    name: string;
    speed: string;
    price: number;
    original_price?: number;
    popular?: boolean;
    features?: string[];
    image_url?: string;
  };
}

interface PlanInfo {
  id: string;
  name: string;
  speed: string;
  price: number;
  original_price?: number;
  popular?: boolean;
  features?: string[];
  image_url?: string;
}

Deno.serve(createAuthenticatedHandler(
  'chatbot-cep-lookup',
  async (req, { supabase, user }) => {
    logger.info('CEP lookup request received');
    
    const body = await req.json();
    logger.debug('Request body', { action: body.action, hasCep: !!body.cep });

    // Extract CEP from message if not provided directly
    let cep = body.cep
    if (!cep && body.message) {
      const cepMatch = body.message.match(/\d{5}-?\d{3}/)
      if (cepMatch) {
        cep = cepMatch[0].replace(/\D/g, '')
      }
    }

    const action = body.action || 'check_coverage'

    switch (action) {
      case 'check_coverage':
        return await checkCepCoverage(supabase, cep, body.message)
      
      case 'list_plans':
        return await listAvailablePlans(supabase, cep)
      
      case 'find_region':
        return await findRegionInfo(supabase, cep)
      
      default:
        return await checkCepCoverage(supabase, cep, body.message)
    }
  }
));

async function checkCepCoverage(supabase: SupabaseClient, cep: string, originalMessage: string) {
  if (!cep || cep.length !== 8) {
    return { 
      response: `Para verificar a cobertura na sua região, preciso do seu CEP completo com 8 dígitos. 

Por exemplo: "Meu CEP é 70000-000" ou "Tenho cobertura em 71000000?"

Você pode me informar seu CEP?`,
      requires_cep: true
    };
  }

    logger.info('Checking coverage for CEP', { cep });

    // Search for CEP coverage
    const { data: cepData, error: cepError } = await supabase
      .from('cep_coverage')
      .select(`
        id,
        cep_start,
        cep_end,
        region_name,
        available,
        coordinates,
        coverage_areas (
          name,
          color
        )
      `)
      .lte('cep_start', cep)
      .gte('cep_end', cep)
      .eq('available', true)
      .limit(1)
      .single()

    if (cepError || !cepData) {
      logger.info('No coverage found', { cep });
      return {
        response: `❌ **Infelizmente não temos cobertura para o CEP ${formatCep(cep)}** na região consultada.

🌟 **Mas temos uma ótima notícia!** Estamos sempre expandindo nossa rede de fibra óptica.

📞 **Entre em contato conosco:**
• WhatsApp: (61) 99999-9999
• Telefone: (61) 3333-3333

Deixe seu contato e te avisaremos assim que a fibra óptica chegar na sua região! 

Você também pode consultar outros CEPs próximos se desejar.`,
        has_coverage: false,
        cep: formatCep(cep)
      };
    }

    // Get available plans for this CEP
    const { data: plansData } = await supabase
      .from('cep_plans')
      .select(`
        plans (
          id,
          name,
          speed,
          price,
          original_price,
          popular,
          features,
          image_url
        )
      `)
      .eq('cep_coverage_id', cepData.id)

    const plans: PlanInfo[] = plansData?.map((cp: CepPlanData) => cp.plans).filter(Boolean) || []

    let response = `✅ **Ótimas notícias! Temos cobertura para o CEP ${formatCep(cep)}!**

📍 **Região:** ${cepData.region_name}
🏢 **Área:** ${cepData.coverage_areas?.name || 'Região de Cobertura'}

`

    if (plans.length > 0) {
      response += `🚀 **Planos Disponíveis:**\n\n`
      
      plans.forEach((plan: PlanInfo) => {
        const discount = plan.original_price ? 
          Math.round(((plan.original_price - plan.price) / plan.original_price) * 100) : 0
        
        // Adicionar imagem se disponível
        if (plan.image_url) {
          response += `![${plan.name}](${plan.image_url})\n`
        }
        
        response += `${plan.popular ? '⭐ **' : '• **'}${plan.name}**${plan.popular ? ' (Mais Popular)' : ''}\n`
        response += `Com uma velocidade de ${plan.speed}\n`
        
        if (plan.original_price && discount > 0) {
          response += `*Valor:* ~~R$ ${plan.original_price.toFixed(2)}~~ **R$ ${plan.price.toFixed(2)}** (${discount}% OFF)\n`
        } else {
          response += `*Valor:* R$ ${plan.price.toFixed(2)}\n`
        }

        // Adicionar frase de impacto baseada no ID do plano
        if (plan.id === 60) {
          response += `🌐 Plano Premium com rede Mesh! Conectividade superior em toda sua casa!\n`
        } else if (plan.id === 107) {
          response += `🏆 Nosso plano mais vendido e de melhor custo-benefício!\n`
        } else {
          // Frases de impacto genéricas baseadas na velocidade
          const speedNumber = parseInt(plan.speed.replace(/\D/g, ''))
          if (speedNumber >= 500) {
            response += `🚀 Velocidade máxima para sua casa! ${plan.speed} de internet ultrarrápida! 📶💨\n`
          } else if (speedNumber >= 300) {
            response += `⚡ Conexão poderosa para seu dia a dia! ${plan.speed} de pura velocidade! 🌍📡\n`
          } else {
            response += `✨ Uma excelente escolha para quem ama assistir filmes e navegar! ${plan.speed} de velocidade.\n`
          }
        }

        if (plan.features && Array.isArray(plan.features)) {
          plan.features.forEach((feature: { text: string }) => {
            response += `  ✓ ${feature.text}\n`
          })
        }
        response += `\n\n`
      })

      response += `Qual deles atende melhor sua necessidade?\n\n`
      response += `💬 **Quer contratar?**\n`
      response += `WhatsApp: (61) 99999-9999\n`
      response += `Telefone: (61) 3333-3333\n\n`
      response += `🎁 **Instalação 100% GRATUITA!**\n`
      response += `⚡ **Velocidade garantida 24h**\n`
      response += `🛠️ **Suporte técnico especializado**`
    } else {
      response += `📋 Entre em contato para conhecer os planos disponíveis:\n`
      response += `• WhatsApp: (61) 99999-9999\n`
      response += `• Telefone: (61) 3333-3333`
    }

    return { 
      response,
      has_coverage: true,
      cep: formatCep(cep),
      region: cepData.region_name,
      plans: plans.length
    };
}

async function listAvailablePlans(supabase: SupabaseClient, cep?: string) {
  try {
    let query = supabase
      .from('plans')
      .select('id, name, speed, price, original_price, description, features, image_url, popular')
      .eq('active', true)
      .order('display_order')

    const { data: plans, error } = await query

    if (error) throw error

    let response = `🚀 **Nossos Planos de Internet Fibra Óptica:**\n\n`

    plans?.forEach((plan: { id: number; name: string; speed: string; price: number; original_price?: number; description?: string; features?: Array<{ text: string }>; image_url?: string; popular?: boolean }) => {
      const discount = plan.original_price ? 
        Math.round(((plan.original_price - plan.price) / plan.original_price) * 100) : 0
      
      // Adicionar imagem se disponível
      if (plan.image_url) {
        response += `![${plan.name}](${plan.image_url})\n`
      }
      
      response += `${plan.popular ? '⭐ **' : '• **'}${plan.name}**${plan.popular ? ' (Mais Popular)' : ''}\n`
      response += `Com uma velocidade de ${plan.speed}\n`
      
      if (plan.original_price && discount > 0) {
        response += `*Valor:* ~~R$ ${plan.original_price.toFixed(2)}~~ **R$ ${plan.price.toFixed(2)}** (${discount}% OFF)\n`
      } else {
        response += `*Valor:* R$ ${plan.price.toFixed(2)}\n`
      }

      if (plan.description) {
        response += `${plan.description}\n`
      }

      // Adicionar frase de impacto baseada no ID do plano
      if (plan.id === 60) {
        response += `🌐 Plano Premium com rede Mesh!\n`
      } else if (plan.id === 107) {
        response += `🏆 Nosso plano mais vendido e de melhor custo-benefício!\n`
      }

      if (plan.features && Array.isArray(plan.features)) {
        plan.features.forEach((feature) => {
          response += `  ✓ ${feature.text}\n`
        })
      }
      response += `\n\n`
    })

    response += `💡 **Todas as velocidades são simétricas** (upload = download)\n`
    response += `🎁 **Instalação gratuita** em toda nossa área de cobertura\n\n`
    
    if (cep) {
      response += `Para verificar disponibilidade no seu CEP ${formatCep(cep)}, posso consultar nossa base de dados!\n\n`
    } else {
      response += `💬 **Consulte seu CEP** para ver quais planos estão disponíveis na sua região!\n\n`
    }
    
    response += `📞 **Contrate já:**\n`
    response += `• WhatsApp: (61) 99999-9999\n`
    response += `• Telefone: (61) 3333-3333`

    return { response };
  } catch (error) {
    logger.error('Erro ao listar planos', { error });
    return { response: 'Desculpe, não consegui listar os planos agora. Tente novamente em instantes.' };
  }
}

async function findRegionInfo(supabase: SupabaseClient, cep: string) {
  if (!cep || cep.length !== 8) {
    return { 
      response: 'Para consultar informações da região, preciso de um CEP válido com 8 dígitos.' 
    };
  }

    const { data: regions, error } = await supabase
      .from('coverage_areas')
      .select('*')
      .eq('active', true)

    if (error) throw error

    let response = `🌍 **Áreas de Cobertura SUPERNET FIBRA:**\n\n`

    regions?.forEach((region: { name?: string; region_code?: string }) => {
      response += `📍 **${region.name}** (${region.region_code})\n`
    })

    response += `\n🔍 **Para verificar se atendemos seu CEP ${formatCep(cep)}**, posso consultar nossa base de dados!\n\n`
    response += `Ou entre em contato:\n`
    response += `• WhatsApp: (61) 99999-9999\n`
    response += `• Telefone: (61) 3333-3333`

    return { response };
}

function formatCep(cep: string): string {
  if (!cep) return ''
  const cleanCep = cep.replace(/\D/g, '')
  return cleanCep.replace(/(\d{5})(\d{3})/, '$1-$2')
}