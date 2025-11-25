import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

type SecurityEventType = 
  | 'login_attempt' 
  | 'password_change' 
  | 'profile_update' 
  | 'suspicious_activity' 
  | 'file_upload' 
  | 'rate_limit_exceeded'
  | 'validation_failed'
  | 'unauthorized_access'
  | 'rate_limit_blocked'
  | 'profile_validation'
  | 'password_change_blocked'
  | 'password_validation'
  | 'file_upload_blocked';

type SeverityLevel = 'info' | 'warning' | 'error' | 'critical';

export const useSecurityLog = () => {
  const logSecurityEvent = useCallback(async (
    eventType: SecurityEventType,
    description: string,
    details: Record<string, unknown> = {},
    severity: SeverityLevel = 'info'
  ) => {
    try {
      // Capturar informações do contexto atual
      let contextDetails: Record<string, unknown> = {
        ...details,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        screen: {
          width: screen.width,
          height: screen.height
        },
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      };

      // Tentar obter IP (funciona apenas em alguns contextos)
      try {
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        contextDetails = {
          ...contextDetails,
          clientIP: ipData.ip
        };
      } catch (ipError) {
        // IP não é crítico, continuar sem ele
        console.debug('Could not fetch IP:', ipError);
      }

      const { error } = await supabase.rpc('log_security_event', {
        event_type: eventType,
        event_description: description,
        details_param: contextDetails as never,
        severity_param: severity
      });

      if (error) {
        console.error('Error logging security event:', error);
      }
    } catch (error) {
      console.error('Failed to log security event:', error);
      // Em produção, você pode querer enviar para um serviço de monitoramento
    }
  }, []);

  const logSuspiciousActivity = useCallback(async (
    activity: string,
    riskLevel: 'low' | 'medium' | 'high' = 'medium',
    additionalDetails: Record<string, unknown> = {}
  ) => {
    const severity: SeverityLevel = riskLevel === 'high' ? 'critical' : 
                                   riskLevel === 'medium' ? 'error' : 'warning';

    await logSecurityEvent(
      'suspicious_activity',
      `Atividade suspeita detectada: ${activity}`,
      {
        riskLevel,
        ...additionalDetails
      },
      severity
    );
  }, [logSecurityEvent]);

  const logValidationFailure = useCallback(async (
    field: string,
    attemptedValue: string,
    validationRule: string
  ) => {
    await logSecurityEvent(
      'validation_failed',
      `Falha na validação do campo ${field}`,
      {
        field,
        attemptedValue: attemptedValue.substring(0, 100), // Limitar tamanho do log
        validationRule,
        possibleAttack: attemptedValue.length > 1000 || 
                        /[<>'"]/g.test(attemptedValue) ||
                        /script|javascript|eval/i.test(attemptedValue)
      },
      'warning'
    );
  }, [logSecurityEvent]);

  const logUnauthorizedAccess = useCallback(async (
    resource: string,
    attemptedAction: string
  ) => {
    await logSecurityEvent(
      'unauthorized_access',
      `Tentativa de acesso não autorizado ao recurso: ${resource}`,
      {
        resource,
        attemptedAction
      },
      'error'
    );
  }, [logSecurityEvent]);

  const logFileUpload = useCallback(async (
    fileName: string,
    fileSize: number,
    fileType: string,
    validationResult: { isValid: boolean; errors?: string[]; warnings?: string[] }
  ) => {
    await logSecurityEvent(
      'file_upload',
      `Upload de arquivo: ${fileName}`,
      {
        fileName,
        fileSize,
        fileType,
        validationPassed: validationResult.isValid,
        errors: validationResult.errors,
        warnings: validationResult.warnings
      },
      validationResult.isValid ? 'info' : 'warning'
    );
  }, [logSecurityEvent]);

  return {
    logSecurityEvent,
    logSuspiciousActivity,
    logValidationFailure,
    logUnauthorizedAccess,
    logFileUpload
  };
};