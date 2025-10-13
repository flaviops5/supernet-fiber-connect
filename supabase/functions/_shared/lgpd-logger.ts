/**
 * LGPD Audit Logger - Sprint 1
 * 
 * Registra todos os acessos a dados pessoais conforme Art. 37 da LGPD
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

interface LGPDAuditLog {
  user_id?: string;
  action_type: 'access' | 'export' | 'delete' | 'anonymize' | 'consent';
  resource_type: 'conversation' | 'customer_data' | 'pii' | 'message';
  resource_id?: string;
  legal_basis: 'consent' | 'legitimate_interest' | 'legal_obligation' | 'contract';
  purpose: string;
  data_accessed?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
}

export async function logLGPDAccess(
  supabase: ReturnType<typeof createClient>,
  log: LGPDAuditLog
): Promise<void> {
  try {
    const { error } = await supabase
      .from('lgpd_audit')
      .insert({
        ...log,
        created_at: new Date().toISOString(),
        // Retenção padrão: 5 anos conforme Art. 16 LGPD
        retention_until: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString(),
      });

    if (error) {
      console.error('❌ Erro ao registrar auditoria LGPD:', error);
      // Não bloqueia a operação principal, mas registra erro
    }
  } catch (err) {
    console.error('❌ Exceção ao registrar auditoria LGPD:', err);
  }
}

/**
 * Helper para registrar acesso a conversação
 */
export async function logConversationAccess(
  supabase: ReturnType<typeof createClient>,
  conversationId: string,
  userId: string | undefined,
  purpose: string,
  req?: Request
): Promise<void> {
  await logLGPDAccess(supabase, {
    user_id: userId,
    action_type: 'access',
    resource_type: 'conversation',
    resource_id: conversationId,
    legal_basis: 'legitimate_interest',
    purpose,
    ip_address: req?.headers.get('x-forwarded-for') || req?.headers.get('x-real-ip') || undefined,
    user_agent: req?.headers.get('user-agent') || undefined,
  });
}

/**
 * Helper para registrar processamento de dados pessoais
 */
export async function logPIIProcessing(
  supabase: ReturnType<typeof createClient>,
  actionType: 'access' | 'export' | 'delete' | 'anonymize',
  dataType: string,
  purpose: string,
  dataAccessed?: Record<string, any>
): Promise<void> {
  await logLGPDAccess(supabase, {
    action_type: actionType,
    resource_type: 'pii',
    legal_basis: actionType === 'delete' ? 'legal_obligation' : 'legitimate_interest',
    purpose,
    data_accessed: dataAccessed,
  });
}

/**
 * Helper para registrar consentimento
 */
export async function logConsent(
  supabase: ReturnType<typeof createClient>,
  customerId: string,
  granted: boolean,
  purpose: string
): Promise<void> {
  await logLGPDAccess(supabase, {
    action_type: 'consent',
    resource_type: 'customer_data',
    resource_id: customerId,
    legal_basis: 'consent',
    purpose: `Consentimento ${granted ? 'concedido' : 'revogado'}: ${purpose}`,
  });
}
