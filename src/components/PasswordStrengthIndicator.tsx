import { useMemo } from 'react';
import { Shield, ShieldAlert, ShieldCheck, ShieldX } from 'lucide-react';

interface PasswordStrengthIndicatorProps {
  password: string;
}

type StrengthLevel = 'weak' | 'medium' | 'strong' | 'very-strong';

interface StrengthResult {
  level: StrengthLevel;
  score: number;
  feedback: string[];
  color: string;
  icon: React.ReactNode;
}

export const PasswordStrengthIndicator = ({ password }: PasswordStrengthIndicatorProps) => {
  const strength = useMemo((): StrengthResult => {
    if (!password) {
      return {
        level: 'weak',
        score: 0,
        feedback: ['Digite uma senha'],
        color: 'bg-gray-300',
        icon: <ShieldX className="h-4 w-4 text-gray-500" />
      };
    }

    let score = 0;
    const feedback: string[] = [];

    // Length check
    if (password.length >= 8) {
      score += 25;
    } else {
      feedback.push('Use pelo menos 8 caracteres');
    }

    if (password.length >= 12) {
      score += 15;
    }

    // Uppercase check
    if (/[A-Z]/.test(password)) {
      score += 20;
    } else {
      feedback.push('Adicione letras maiúsculas');
    }

    // Lowercase check
    if (/[a-z]/.test(password)) {
      score += 20;
    } else {
      feedback.push('Adicione letras minúsculas');
    }

    // Number check
    if (/\d/.test(password)) {
      score += 20;
    } else {
      feedback.push('Adicione números');
    }

    // Special character check
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      score += 20;
    } else {
      feedback.push('Adicione caracteres especiais');
    }

    // Determine level and color
    let level: StrengthLevel;
    let color: string;
    let icon: React.ReactNode;

    if (score < 40) {
      level = 'weak';
      color = 'bg-red-500';
      icon = <ShieldX className="h-4 w-4 text-red-500" />;
    } else if (score < 70) {
      level = 'medium';
      color = 'bg-yellow-500';
      icon = <ShieldAlert className="h-4 w-4 text-yellow-500" />;
    } else if (score < 90) {
      level = 'strong';
      color = 'bg-blue-500';
      icon = <Shield className="h-4 w-4 text-blue-500" />;
    } else {
      level = 'very-strong';
      color = 'bg-green-500';
      icon = <ShieldCheck className="h-4 w-4 text-green-500" />;
    }

    return { level, score, feedback, color, icon };
  }, [password]);

  const levelText = {
    'weak': 'Fraca',
    'medium': 'Média',
    'strong': 'Forte',
    'very-strong': 'Muito Forte'
  }[strength.level];

  return (
    <div className="space-y-2" role="status" aria-live="polite" aria-label="Indicador de força da senha">
      <div className="flex items-center gap-2">
        {strength.icon}
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-300 ${strength.color}`}
            style={{ width: `${strength.score}%` }}
            role="progressbar"
            aria-valuenow={strength.score}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
        <span className="text-xs font-medium text-muted-foreground">
          {levelText}
        </span>
      </div>
      
      {strength.feedback.length > 0 && (
        <ul className="text-xs text-muted-foreground space-y-1" aria-label="Sugestões para melhorar a senha">
          {strength.feedback.map((item, index) => (
            <li key={index}>• {item}</li>
          ))}
        </ul>
      )}
    </div>
  );
};
