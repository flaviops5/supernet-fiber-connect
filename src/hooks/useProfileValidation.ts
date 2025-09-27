import { useState } from 'react';

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

  const validateProfile = (data: ProfileData): boolean => {
    const newErrors: ValidationErrors = {};

    // Validação do nome
    if (!data.name?.trim()) {
      newErrors.name = 'Nome é obrigatório';
    } else if (data.name.trim().length < 2) {
      newErrors.name = 'Nome deve ter pelo menos 2 caracteres';
    } else if (data.name.trim().length > 100) {
      newErrors.name = 'Nome deve ter no máximo 100 caracteres';
    } else if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(data.name.trim())) {
      newErrors.name = 'Nome deve conter apenas letras e espaços';
    }

    // Validação do email
    if (!data.email?.trim()) {
      newErrors.email = 'Email é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
      newErrors.email = 'Email deve ter um formato válido';
    } else if (data.email.trim().length > 255) {
      newErrors.email = 'Email deve ter no máximo 255 caracteres';
    }

    // Validação do telefone (opcional)
    if (data.phone && data.phone.trim()) {
      const phoneRegex = /^[\d\s\-\(\)\+]+$/;
      if (!phoneRegex.test(data.phone.trim())) {
        newErrors.phone = 'Telefone deve conter apenas números, espaços, hífens, parênteses e +';
      } else if (data.phone.trim().length < 10) {
        newErrors.phone = 'Telefone deve ter pelo menos 10 dígitos';
      } else if (data.phone.trim().length > 20) {
        newErrors.phone = 'Telefone deve ter no máximo 20 caracteres';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePassword = (data: PasswordData): boolean => {
    const newErrors: ValidationErrors = {};

    // Validação da senha atual
    if (!data.currentPassword?.trim()) {
      newErrors.currentPassword = 'Senha atual é obrigatória';
    }

    // Validação da nova senha
    if (!data.newPassword?.trim()) {
      newErrors.newPassword = 'Nova senha é obrigatória';
    } else if (data.newPassword.length < 8) {
      newErrors.newPassword = 'Nova senha deve ter pelo menos 8 caracteres';
    } else if (data.newPassword.length > 128) {
      newErrors.newPassword = 'Nova senha deve ter no máximo 128 caracteres';
    } else if (!/(?=.*[a-z])/.test(data.newPassword)) {
      newErrors.newPassword = 'Nova senha deve conter pelo menos uma letra minúscula';
    } else if (!/(?=.*[A-Z])/.test(data.newPassword)) {
      newErrors.newPassword = 'Nova senha deve conter pelo menos uma letra maiúscula';
    } else if (!/(?=.*\d)/.test(data.newPassword)) {
      newErrors.newPassword = 'Nova senha deve conter pelo menos um número';
    } else if (!/(?=.*[@$!%*?&])/.test(data.newPassword)) {
      newErrors.newPassword = 'Nova senha deve conter pelo menos um caractere especial (@$!%*?&)';
    }

    // Validação da confirmação de senha
    if (!data.confirmPassword?.trim()) {
      newErrors.confirmPassword = 'Confirmação de senha é obrigatória';
    } else if (data.newPassword !== data.confirmPassword) {
      newErrors.confirmPassword = 'As senhas não coincidem';
    }

    // Verificar se a nova senha é diferente da atual
    if (data.currentPassword && data.newPassword && data.currentPassword === data.newPassword) {
      newErrors.newPassword = 'A nova senha deve ser diferente da senha atual';
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

  return {
    errors,
    validateProfile,
    validatePassword,
    clearErrors,
    getFieldError,
    hasErrors
  };
};