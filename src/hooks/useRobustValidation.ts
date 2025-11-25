import { useCallback } from 'react';
import { useProfileValidation } from '@/hooks/useProfileValidation';
import { usePasswordStrength } from '@/hooks/usePasswordStrength';
import { useFileValidation } from '@/hooks/useFileValidation';
import { useRateLimit } from '@/hooks/useRateLimit';
import { useSecurityLog } from '@/hooks/useSecurityLog';
import { useSanitization } from '@/hooks/useSanitization';

interface RobustValidationOptions {
  enableRateLimit?: boolean;
  enableSecurityLogging?: boolean;
  enableSanitization?: boolean;
  rateLimitConfig?: {
    maxAttempts: number;
    windowMinutes: number;
    blockMinutes: number;
  };
}

export const useRobustValidation = (options: RobustValidationOptions = {}) => {
  const {
    enableRateLimit = true,
    enableSecurityLogging = true,
    enableSanitization = true,
    rateLimitConfig = {
      maxAttempts: 5,
      windowMinutes: 15,
      blockMinutes: 60
    }
  } = options;

  const profileValidation = useProfileValidation();
  const passwordStrength = usePasswordStrength();
  const fileValidation = useFileValidation();
  const rateLimit = useRateLimit();
  const securityLog = useSecurityLog();
  const sanitization = useSanitization();

  const validateProfileWithSecurity = useCallback(async (
    data: { name: string; email: string; phone: string }
  ) => {
    // 1. Verificar rate limit se habilitado
    if (enableRateLimit) {
      const rateLimitResult = await rateLimit.checkRateLimit(
        'profile_update',
        rateLimitConfig.maxAttempts,
        rateLimitConfig.windowMinutes,
        rateLimitConfig.blockMinutes
      );

      if (!rateLimitResult.allowed) {
        if (enableSecurityLogging) {
          await securityLog.logSecurityEvent(
            'rate_limit_blocked',
            'Profile update blocked by rate limit',
            { remainingAttempts: rateLimitResult.remainingAttempts },
            'warning'
          );
        }
        return {
          success: false,
          blocked: true,
          blockedUntil: rateLimitResult.blockedUntil,
          message: `Muitas tentativas. Tente novamente ${rateLimitResult.blockedUntil ? 
            'em ' + rateLimit.formatBlockedTime(rateLimitResult.blockedUntil) : 'mais tarde'}.`
        };
      }
    }

    // 2. Sanitizar dados se habilitado
    let cleanData = data;
    if (enableSanitization) {
      cleanData = profileValidation.getSanitizedData(data);
    }

    // 3. Validar dados
    const isValid = profileValidation.validateProfile(cleanData);

    // 4. Log de segurança se habilitado
    if (enableSecurityLogging) {
      await securityLog.logSecurityEvent(
        'profile_validation',
        `Profile validation ${isValid ? 'passed' : 'failed'}`,
        {
          fieldsValidated: Object.keys(cleanData),
          hasErrors: profileValidation.hasErrors(),
          errorCount: Object.keys(profileValidation.errors).length
        },
        isValid ? 'info' : 'warning'
      );
    }

    return {
      success: isValid,
      blocked: false,
      data: cleanData,
      errors: profileValidation.errors,
      message: isValid ? 'Dados válidos' : 'Corrija os erros antes de continuar'
    };
  }, [
    enableRateLimit, 
    enableSecurityLogging, 
    enableSanitization, 
    rateLimitConfig,
    profileValidation,
    rateLimit,
    securityLog
  ]);

  const validatePasswordWithSecurity = useCallback(async (
    passwordData: { currentPassword: string; newPassword: string; confirmPassword: string }
  ) => {
    // 1. Verificar rate limit para alteração de senha
    if (enableRateLimit) {
      const rateLimitResult = await rateLimit.checkRateLimit(
        'password_change',
        3, // Menos tentativas para senhas
        30, // Janela maior
        120 // Bloqueio maior
      );

      if (!rateLimitResult.allowed) {
        if (enableSecurityLogging) {
          await securityLog.logSecurityEvent(
            'password_change_blocked',
            'Password change blocked by rate limit',
            { remainingAttempts: rateLimitResult.remainingAttempts },
            'error'
          );
        }
        return {
          success: false,
          blocked: true,
          blockedUntil: rateLimitResult.blockedUntil,
          message: `Muitas tentativas de alteração de senha. Tente novamente ${rateLimitResult.blockedUntil ? 
            'em ' + rateLimit.formatBlockedTime(rateLimitResult.blockedUntil) : 'mais tarde'}.`
        };
      }
    }

    // 2. Verificar força da nova senha
    const strength = passwordStrength.calculatePasswordStrength(passwordData.newPassword);
    
    // 3. Validar senhas
    const isValid = profileValidation.validatePassword(passwordData);

    // 4. Verificações adicionais de segurança
    let securityWarnings: string[] = [];
    
    if (strength.score < 6) {
      securityWarnings.push('Senha considerada fraca para segurança máxima');
    }
    
    if (passwordData.newPassword.toLowerCase().includes('password') ||
        passwordData.newPassword.toLowerCase().includes('123456')) {
      securityWarnings.push('Senha contém padrões comuns e inseguros');
    }

    // 5. Log de segurança
    if (enableSecurityLogging) {
      await securityLog.logSecurityEvent(
        'password_validation',
        `Password validation ${isValid ? 'passed' : 'failed'}`,
        {
          strengthScore: strength.score,
          strengthLevel: strength.strength,
          hasWarnings: securityWarnings.length > 0,
          warningCount: securityWarnings.length
        },
        isValid ? (securityWarnings.length > 0 ? 'warning' : 'info') : 'error'
      );
    }

    return {
      success: isValid,
      blocked: false,
      errors: profileValidation.errors,
      warnings: securityWarnings,
      strength,
      message: isValid ? 'Senha válida' : 'Corrija os erros na senha'
    };
  }, [
    enableRateLimit,
    enableSecurityLogging,
    rateLimit,
    securityLog,
    passwordStrength,
    profileValidation
  ]);

  const validateFileWithSecurity = useCallback(async (file: File) => {
    // 1. Verificar rate limit para uploads
    if (enableRateLimit) {
      const rateLimitResult = await rateLimit.checkRateLimit(
        'file_upload',
        10, // 10 uploads por janela
        60, // Janela de 60 minutos
        30  // Bloqueio de 30 minutos
      );

      if (!rateLimitResult.allowed) {
        if (enableSecurityLogging) {
          await securityLog.logSecurityEvent(
            'file_upload_blocked',
            'File upload blocked by rate limit',
            { 
              fileName: file.name, 
              fileSize: file.size,
              remainingAttempts: rateLimitResult.remainingAttempts 
            },
            'warning'
          );
        }
        return {
          success: false,
          blocked: true,
          blockedUntil: rateLimitResult.blockedUntil,
          message: `Muitos uploads. Tente novamente ${rateLimitResult.blockedUntil ? 
            'em ' + rateLimit.formatBlockedTime(rateLimitResult.blockedUntil) : 'mais tarde'}.`
        };
      }
    }

    // 2. Validar arquivo
    const validationResult = await fileValidation.validateFile(file);

    // 3. Log de segurança
    if (enableSecurityLogging) {
      await securityLog.logFileUpload(
        file.name,
        file.size,
        file.type,
        validationResult
      );
    }

    return {
      success: validationResult.isValid,
      blocked: false,
      ...validationResult,
      message: validationResult.isValid ? 'Arquivo válido' : 'Arquivo inválido'
    };
  }, [
    enableRateLimit,
    enableSecurityLogging,
    rateLimit,
    securityLog,
    fileValidation
  ]);

  return {
    validateProfile: validateProfileWithSecurity,
    validatePassword: validatePasswordWithSecurity,
    validateFile: validateFileWithSecurity,
    profileValidation,
    passwordStrength,
    fileValidation,
    rateLimit,
    securityLog,
    sanitization
  };
};