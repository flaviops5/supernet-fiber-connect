import { useMemo } from 'react';

interface PasswordStrength {
  score: number;
  strength: 'muito-fraca' | 'fraca' | 'media' | 'forte' | 'muito-forte';
  feedback: string[];
  checks: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    numbers: boolean;
    symbols: boolean;
    noCommon: boolean;
    noRepeated: boolean;
    noSequential: boolean;
  };
}

export const usePasswordStrength = () => {
  const commonPasswords = useMemo(() => [
    '123456', 'password', '123456789', '12345678', '12345', '1234567',
    'qwerty', 'abc123', '111111', '123123', 'admin', 'letmein',
    'welcome', 'monkey', '1234567890', 'dragon', 'password1',
    'sunshine', 'master', 'hottie', 'freedom', 'whatever', 'qazwsx',
    'trustno1', 'jordan23', 'harley', 'robert', 'matthew', 'jordan',
    'michelle', 'love', 'shadow', 'jessica', 'superman', 'michael'
  ], []);

  const calculatePasswordStrength = useMemo(() => (password: string): PasswordStrength => {
    const checks = {
      length: password.length >= 12,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      numbers: /\d/.test(password),
      symbols: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      noCommon: !commonPasswords.includes(password.toLowerCase()),
      noRepeated: !/(.)\1{2,}/.test(password), // Não ter 3+ caracteres consecutivos iguais
      noSequential: !/123|abc|qwe|asd|zxc/i.test(password) // Não ter sequências óbvias
    };

    const score = Object.values(checks).filter(Boolean).length;
    const feedback: string[] = [];

    if (!checks.length) feedback.push('Use pelo menos 12 caracteres');
    if (!checks.uppercase) feedback.push('Adicione pelo menos uma letra maiúscula');
    if (!checks.lowercase) feedback.push('Adicione pelo menos uma letra minúscula');
    if (!checks.numbers) feedback.push('Adicione pelo menos um número');
    if (!checks.symbols) feedback.push('Adicione pelo menos um símbolo (!@#$%^&*...)');
    if (!checks.noCommon) feedback.push('Evite senhas muito comuns');
    if (!checks.noRepeated) feedback.push('Evite repetir o mesmo caractere muitas vezes');
    if (!checks.noSequential) feedback.push('Evite sequências óbvias (123, abc, qwe...)');

    let strength: PasswordStrength['strength'];
    if (score <= 2) strength = 'muito-fraca';
    else if (score <= 4) strength = 'fraca';
    else if (score <= 6) strength = 'media';
    else if (score <= 7) strength = 'forte';
    else strength = 'muito-forte';

    return { score, strength, feedback, checks };
  }, [commonPasswords]);

  const getStrengthColor = useMemo(() => (strength: PasswordStrength['strength']): string => {
    switch (strength) {
      case 'muito-fraca': return 'text-red-600';
      case 'fraca': return 'text-orange-600';
      case 'media': return 'text-yellow-600';
      case 'forte': return 'text-blue-600';
      case 'muito-forte': return 'text-green-600';
      default: return 'text-gray-600';
    }
  }, []);

  const getStrengthText = useMemo(() => (strength: PasswordStrength['strength']): string => {
    switch (strength) {
      case 'muito-fraca': return 'Muito Fraca';
      case 'fraca': return 'Fraca';
      case 'media': return 'Média';
      case 'forte': return 'Forte';
      case 'muito-forte': return 'Muito Forte';
      default: return 'Indefinida';
    }
  }, []);

  const getProgressPercentage = useMemo(() => (score: number): number => {
    return Math.min((score / 8) * 100, 100);
  }, []);

  return {
    calculatePasswordStrength,
    getStrengthColor,
    getStrengthText,
    getProgressPercentage
  };
};