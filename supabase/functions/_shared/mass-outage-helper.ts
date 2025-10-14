/**
 * Mass Outage Helper
 * Centralizes mass outage detection and context formatting for all agents
 */

interface MassOutageEvent {
  id: string;
  affected_count: number;
  region_pattern: string;
  detected_at: string;
  status: string;
  metadata?: any;
}

interface MassOutageContextResult {
  hasActiveOutage: boolean;
  context: string;
  outageData?: MassOutageEvent;
}

/**
 * Fetches active mass outages and returns formatted context for agent prompts
 */
export async function getMassOutageContext(
  supabase: any,
  logger?: any
): Promise<MassOutageContextResult> {
  try {
    const { data: activeOutages, error } = await supabase
      .from('mass_outage_events')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      if (logger) {
        logger.error('Failed to fetch mass outage events', { error: error.message });
      } else {
        console.error('❌ mass_outage_events query error:', error);
      }
      return {
        hasActiveOutage: false,
        context: '',
      };
    }

    if (!activeOutages || activeOutages.length === 0) {
      if (logger) {
        logger.info('No active mass outages detected');
      }
      return {
        hasActiveOutage: false,
        context: '',
      };
    }

    const outage = activeOutages[0];
    const context = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ ALERTA: QUEDA EM MASSA ATIVA
${outage.affected_count} clientes afetados
Região: ${outage.region_pattern}
Detectado em: ${new Date(outage.detected_at).toLocaleString('pt-BR')}

IMPORTANTE: Informe ao cliente que há uma instabilidade conhecida na região e que a equipe técnica já está trabalhando na solução.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

    if (logger) {
      logger.warn('Active mass outage detected', {
        outage_id: outage.id,
        affected_count: outage.affected_count,
        region: outage.region_pattern,
      });
    } else {
      console.warn('⚠️ Active mass outage:', {
        id: outage.id,
        affected: outage.affected_count,
        region: outage.region_pattern,
      });
    }

    return {
      hasActiveOutage: true,
      context,
      outageData: outage,
    };
  } catch (e) {
    if (logger) {
      logger.error('Unexpected error in getMassOutageContext', { error: String(e) });
    } else {
      console.error('❌ Unexpected error in getMassOutageContext:', e);
    }
    return {
      hasActiveOutage: false,
      context: '',
    };
  }
}

/**
 * Checks if a customer is affected by an active mass outage
 */
export async function isCustomerAffectedByOutage(
  supabase: any,
  customerData: { login?: string; cidade?: string; bairro?: string },
  logger?: any
): Promise<boolean> {
  const outageResult = await getMassOutageContext(supabase, logger);
  
  if (!outageResult.hasActiveOutage || !outageResult.outageData) {
    return false;
  }

  const { region_pattern } = outageResult.outageData;
  const { login, cidade, bairro } = customerData;

  // Check if customer matches the outage region pattern
  const regionLower = region_pattern.toLowerCase();
  const matchesLogin = login && regionLower.includes(login.toLowerCase());
  const matchesCidade = cidade && regionLower.includes(cidade.toLowerCase());
  const matchesBairro = bairro && regionLower.includes(bairro.toLowerCase());

  const isAffected = matchesLogin || matchesCidade || matchesBairro;

  if (isAffected && logger) {
    logger.info('Customer is affected by mass outage', {
      login,
      cidade,
      bairro,
      region_pattern,
    });
  }

  return isAffected;
}
