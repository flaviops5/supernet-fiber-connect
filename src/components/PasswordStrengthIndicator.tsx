import React from 'react';
import { usePasswordStrength } from '@/hooks/usePasswordStrength';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
}

export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
  password,
  className = ''
}) => {
  const { 
    calculatePasswordStrength, 
    getStrengthColor, 
    getStrengthText, 
    getProgressPercentage 
  } = usePasswordStrength();

  const strength = calculatePasswordStrength(password);

  if (!password) return null;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Indicador de força */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Força da senha:</span>
          <span className={`text-sm font-semibold ${getStrengthColor(strength.strength)}`}>
            {getStrengthText(strength.strength)}
          </span>
        </div>
        
        <Progress 
          value={getProgressPercentage(strength.score)} 
          className="h-2"
        />
      </div>

      {/* Checklist de requisitos */}
      <div className="space-y-1">
        <div className="text-sm font-medium text-muted-foreground mb-2">Requisitos:</div>
        <div className="grid grid-cols-1 gap-1 text-xs">
          <RequirementItem 
            met={strength.checks.length} 
            text="Pelo menos 12 caracteres" 
          />
          <RequirementItem 
            met={strength.checks.uppercase} 
            text="Letra maiúscula (A-Z)" 
          />
          <RequirementItem 
            met={strength.checks.lowercase} 
            text="Letra minúscula (a-z)" 
          />
          <RequirementItem 
            met={strength.checks.numbers} 
            text="Número (0-9)" 
          />
          <RequirementItem 
            met={strength.checks.symbols} 
            text="Símbolo (!@#$%^&*...)" 
          />
          <RequirementItem 
            met={strength.checks.noCommon} 
            text="Não é senha comum" 
          />
          <RequirementItem 
            met={strength.checks.noRepeated} 
            text="Sem repetições excessivas" 
          />
          <RequirementItem 
            met={strength.checks.noSequential} 
            text="Sem sequências óbvias" 
          />
        </div>
      </div>

      {/* Feedback de melhorias */}
      {strength.feedback.length > 0 && (
        <div className="space-y-1">
          <div className="text-sm font-medium text-muted-foreground">Sugestões:</div>
          <ul className="space-y-1">
            {strength.feedback.map((feedback, index) => (
              <li key={index} className="text-xs text-muted-foreground flex items-start">
                <AlertTriangle className="h-3 w-3 mr-1 mt-0.5 text-amber-500 flex-shrink-0" />
                {feedback}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

interface RequirementItemProps {
  met: boolean;
  text: string;
}

const RequirementItem: React.FC<RequirementItemProps> = ({ met, text }) => {
  return (
    <div className={`flex items-center space-x-2 ${met ? 'text-green-600' : 'text-muted-foreground'}`}>
      {met ? (
        <CheckCircle2 className="h-3 w-3 text-green-600" />
      ) : (
        <XCircle className="h-3 w-3 text-muted-foreground" />
      )}
      <span className="text-xs">{text}</span>
    </div>
  );
};