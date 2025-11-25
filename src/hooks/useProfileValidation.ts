import { useState } from 'react';
import { useSanitization } from '@/hooks/useSanitization';
import { useSecurityLog } from '@/hooks/useSecurityLog';

interface ValidationErrors {
  name?: string;
  email?: string;
  phone?: string;
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

interface ProfileData {
  name: string;
  email: string;
  phone: string;
}

interface PasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export const useProfileValidation = () => {
  const [errors, setErrors] = useState<ValidationErrors>({});
  const { 
    sanitizeName, 
    sanitizeEmail, 
    sanitizePhone, 
    detectSuspiciousContent 
  } = useSanitization();
  const { logValidationFailure, logSuspiciousActivity } = useSecurityLog();

  const validateProfile = (data: ProfileData): boolean => {
    const newErrors: ValidationErrors = {};

    // Verificar conteúdo suspeito antes da validação
    Object.entries(data).forEach(([field, value]) => {
      if (detectSuspiciousContent(value)) {
        logSuspiciousActivity(
          `Conteúdo suspeito detectado no campo ${field}`,
          'high',
          { field, value: value.substring(0, 100) }
        );
      }
    });

    // Validação e sanitização do nome
    const cleanName = sanitizeName(data.name);
    if (!cleanName.trim()) {
      const error = 'Nome é obrigatório';
      newErrors.name = error;
      logValidationFailure('name', data.name, 'required');
    } else if (cleanName.length < 2) {
      const error = 'Nome deve ter pelo menos 2 caracteres';
      newErrors.name = error;
      logValidationFailure('name', data.name, 'min_length');
    } else if (cleanName.length > 100) {
      const error = 'Nome deve ter no máximo 100 caracteres';
      newErrors.name = error;
      logValidationFailure('name', data.name, 'max_length');
    } else if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(cleanName)) {
      const error = 'Nome deve conter apenas letras e espaços';
      newErrors.name = error;
      logValidationFailure('name', data.name, 'format');
    }

    // Validação e sanitização do email
    const cleanEmail = sanitizeEmail(data.email);
    if (!cleanEmail.trim()) {
      const error = 'Email é obrigatório';
      newErrors.email = error;
      logValidationFailure('email', data.email, 'required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      const error = 'Email deve ter um formato válido';
      newErrors.email = error;
      logValidationFailure('email', data.email, 'format');
    } else if (cleanEmail.length > 255) {
      const error = 'Email deve ter no máximo 255 caracteres';
      newErrors.email = error;
      logValidationFailure('email', data.email, 'max_length');
    }

    // Validação e sanitização do telefone (opcional)
    if (data.phone && data.phone.trim()) {
      const cleanPhone = sanitizePhone(data.phone);
      const phoneDigits = cleanPhone.replace(/[^0-9]/g, '');
      
      if (phoneDigits.length < 10) {
        const error = 'Telefone deve ter pelo menos 10 dígitos';
        newErrors.phone = error;
        logValidationFailure('phone', data.phone, 'min_length');
      } else if (cleanPhone.length > 20) {
        const error = 'Telefone deve ter no máximo 20 caracteres';
        newErrors.phone = error;
        logValidationFailure('phone', data.phone, 'max_length');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePassword = (data: PasswordData): boolean => {
    const newErrors: ValidationErrors = {};

    // Verificar conteúdo suspeito
    Object.entries(data).forEach(([field, value]) => {
      if (detectSuspiciousContent(value)) {
        logSuspiciousActivity(
          `Conteúdo suspeito detectado no campo ${field}`,
          'high',
          { field, value: '***' } // Não logar senhas
        );
      }
    });

    // Validação da senha atual
    if (!data.currentPassword?.trim()) {
      const error = 'Senha atual é obrigatória';
      newErrors.currentPassword = error;
      logValidationFailure('currentPassword', '***', 'required');
    }

    // Validação da nova senha
    if (!data.newPassword?.trim()) {
      const error = 'Nova senha é obrigatória';
      newErrors.newPassword = error;
      logValidationFailure('newPassword', '***', 'required');
    } else if (data.newPassword.length < 12) {
      const error = 'Nova senha deve ter pelo menos 12 caracteres';
      newErrors.newPassword = error;
      logValidationFailure('newPassword', '***', 'min_length');
    } else if (data.newPassword.length > 128) {
      const error = 'Nova senha deve ter no máximo 128 caracteres';
      newErrors.newPassword = error;
      logValidationFailure('newPassword', '***', 'max_length');
    } else if (!/(?=.*[a-z])/.test(data.newPassword)) {
      const error = 'Nova senha deve conter pelo menos uma letra minúscula';
      newErrors.newPassword = error;
      logValidationFailure('newPassword', '***', 'lowercase_required');
    } else if (!/(?=.*[A-Z])/.test(data.newPassword)) {
      const error = 'Nova senha deve conter pelo menos uma letra maiúscula';
      newErrors.newPassword = error;
      logValidationFailure('newPassword', '***', 'uppercase_required');
    } else if (!/(?=.*\d)/.test(data.newPassword)) {
      const error = 'Nova senha deve conter pelo menos um número';
      newErrors.newPassword = error;
      logValidationFailure('newPassword', '***', 'number_required');
    } else if (!/(?=.*[@$!%*?&])/.test(data.newPassword)) {
      const error = 'Nova senha deve conter pelo menos um caractere especial (@$!%*?&)';
      newErrors.newPassword = error;
      logValidationFailure('newPassword', '***', 'special_char_required');
    }

    // Validação da confirmação de senha
    if (!data.confirmPassword?.trim()) {
      const error = 'Confirmação de senha é obrigatória';
      newErrors.confirmPassword = error;
      logValidationFailure('confirmPassword', '***', 'required');
    } else if (data.newPassword !== data.confirmPassword) {
      const error = 'As senhas não coincidem';
      newErrors.confirmPassword = error;
      logValidationFailure('confirmPassword', '***', 'mismatch');
    }

    // Verificar se a nova senha é diferente da atual
    if (data.currentPassword && data.newPassword && data.currentPassword === data.newPassword) {
      const error = 'A nova senha deve ser diferente da senha atual';
      newErrors.newPassword = error;
      logValidationFailure('newPassword', '***', 'same_as_current');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const clearErrors = () => {
    setErrors({});
  };

  const getFieldError = (field: keyof ValidationErrors): string | undefined => {
    return errors[field];
  };

  const hasErrors = (): boolean => {
    return Object.keys(errors).length > 0;
  };

  const getSanitizedData = (data: ProfileData): ProfileData => {
    return {
      name: sanitizeName(data.name),
      email: sanitizeEmail(data.email),
      phone: sanitizePhone(data.phone)
    };
  };

  return {
    errors,
    validateProfile,
    validatePassword,
    clearErrors,
    getFieldError,
    hasErrors,
    getSanitizedData
  };
};