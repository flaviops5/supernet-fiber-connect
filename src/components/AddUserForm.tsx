import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, EyeOff, UserPlus, ArrowLeft, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { useSanitization } from '@/hooks/useSanitization';
import { useSecurityLog } from '@/hooks/useSecurityLog';
import { PasswordStrengthIndicator } from '@/components/PasswordStrengthIndicator';
import { z } from 'zod';

// Validation schema
const userSchema = z.object({
  email: z.string()
    .trim()
    .email({ message: "Email inválido" })
    .max(255, { message: "Email muito longo" }),
  password: z.string()
    .min(8, { message: "Senha deve ter no mínimo 8 caracteres" })
    .max(100, { message: "Senha muito longa" })
    .regex(/[A-Z]/, { message: "Senha deve conter ao menos uma letra maiúscula" })
    .regex(/[a-z]/, { message: "Senha deve conter ao menos uma letra minúscula" })
    .regex(/\d/, { message: "Senha deve conter ao menos um número" }),
  fullName: z.string()
    .trim()
    .min(3, { message: "Nome deve ter no mínimo 3 caracteres" })
    .max(100, { message: "Nome muito longo" }),
  phone: z.string().optional(),
  role: z.enum(['admin', 'editor', 'viewer'])
});

type UserFormData = z.infer<typeof userSchema>;

export const AddUserForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'admin' | 'editor' | 'viewer'>('viewer');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  // Rate limiting
  const lastSubmitTime = useRef<number>(0);
  const submitCount = useRef<number>(0);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { sanitizeInput, sanitizeEmail, sanitizePhone, sanitizeName, detectSuspiciousContent } = useSanitization();
  const { logSecurityEvent, logValidationFailure, logSuspiciousActivity } = useSecurityLog();

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setValidationErrors({});
    
    // Rate limiting - max 3 attempts per minute
    const now = Date.now();
    if (now - lastSubmitTime.current < 60000) {
      submitCount.current += 1;
      if (submitCount.current > 3) {
        setError('Muitas tentativas. Aguarde um minuto.');
        logSuspiciousActivity('Excessive user creation attempts', 'medium', {
          attempts: submitCount.current
        });
        return;
      }
    } else {
      submitCount.current = 1;
      lastSubmitTime.current = now;
    }

    // Sanitize inputs
    const sanitizedEmail = sanitizeEmail(email);
    const sanitizedFullName = sanitizeName(fullName);
    const sanitizedPhone = phone ? sanitizePhone(phone) : '';

    // Detect suspicious content
    if (detectSuspiciousContent(email) || detectSuspiciousContent(fullName)) {
      setError('Conteúdo suspeito detectado nos dados fornecidos');
      logSuspiciousActivity('Suspicious content in user creation form', 'high', {
        email: sanitizedEmail,
        fullName: sanitizedFullName
      });
      return;
    }

    // Password match validation
    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      logValidationFailure('confirmPassword', password, 'passwords_must_match');
      return;
    }

    // Validate with Zod
    const validationResult = userSchema.safeParse({
      email: sanitizedEmail,
      password,
      fullName: sanitizedFullName,
      phone: sanitizedPhone,
      role
    });

    if (!validationResult.success) {
      const errors: Record<string, string> = {};
      validationResult.error.errors.forEach((err) => {
        const field = err.path[0] as string;
        errors[field] = err.message;
        logValidationFailure(field, 'hidden', err.message);
      });
      setValidationErrors(errors);
      setError('Por favor, corrija os erros antes de continuar');
      return;
    }

    setLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/admin`;
      
      // Create user account
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: sanitizedEmail,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: sanitizedFullName,
            phone: sanitizedPhone || null,
          }
        }
      });

      if (signUpError) {
        if (signUpError.message.includes('User already registered')) {
          setError('Este email já está cadastrado.');
          logSuspiciousActivity('Tentativa de criar usuário duplicado', 'low', {
            email: sanitizedEmail
          });
        } else {
          setError(signUpError.message);
          logger.error('User creation error', signUpError);
        }
        return;
      }

      if (!signUpData.user) {
        setError('Erro ao criar usuário');
        logger.error('No user data returned from signUp');
        return;
      }

      // Assign role if not viewer (requires edge function with service role)
      if (role !== 'viewer') {
        try {
          const { error: roleError } = await supabase.functions.invoke('assign-user-role', {
            body: {
              userId: signUpData.user.id,
              role
            }
          });

          if (roleError) {
            logger.warn('Failed to assign custom role, user will have viewer role', { error: roleError });
            toast({
              title: "Aviso",
              description: "Usuário criado com role padrão (viewer). Você pode alterar manualmente.",
              variant: "default"
            });
          }
        } catch (roleErr) {
          logger.warn('Role assignment not available', roleErr);
        }
      }

      // Log successful creation
      logger.info(`Usuário criado com sucesso`, {
        email: sanitizedEmail,
        role,
        userId: signUpData.user.id,
        fullName: sanitizedFullName
      });
      
      toast({
        title: "Usuário criado com sucesso!",
        description: `${sanitizedFullName} foi adicionado ao sistema. O usuário receberá um email de confirmação.`,
      });

      // Clear form
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setFullName('');
      setPhone('');
      setRole('viewer');
      
      navigate('/admin/users');
    } catch (err) {
      logger.error('Error creating user', err, {
        context: 'AddUserForm'
      });
      setError('Erro interno. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/admin/users')}
          aria-label="Voltar para lista de usuários"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <UserPlus className="h-8 w-8" aria-hidden="true" />
            Adicionar Novo Usuário
          </h1>
          <p className="text-muted-foreground">
            Crie uma nova conta de usuário para o sistema
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Dados do Usuário</CardTitle>
            <CardDescription>
              Preencha as informações do novo usuário
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert className="mb-6 border-red-200 bg-red-50" role="alert">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-red-700">{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">
                    Nome Completo *
                  </Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Nome completo do usuário"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={loading}
                    aria-required="true"
                    aria-invalid={!!validationErrors.fullName}
                    aria-describedby={validationErrors.fullName ? "fullName-error" : undefined}
                  />
                  {validationErrors.fullName && (
                    <p id="fullName-error" className="text-sm text-red-600" role="alert">
                      {validationErrors.fullName}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">
                    Email *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="usuario@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    aria-required="true"
                    aria-invalid={!!validationErrors.email}
                    aria-describedby={validationErrors.email ? "email-error" : undefined}
                  />
                  {validationErrors.email && (
                    <p id="email-error" className="text-sm text-red-600" role="alert">
                      {validationErrors.email}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    type="text"
                    placeholder="(00) 00000-0000"
                    value={phone}
                    onChange={(e) => {
                      const formatted = formatPhone(e.target.value);
                      if (formatted.length <= 15) setPhone(formatted);
                    }}
                    disabled={loading}
                    aria-describedby="phone-hint"
                  />
                  <p id="phone-hint" className="text-xs text-muted-foreground">
                    Opcional
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Função no Sistema *</Label>
                  <Select 
                    value={role} 
                    onValueChange={(value) => setRole(value as 'admin' | 'editor' | 'viewer')}
                    disabled={loading}
                  >
                    <SelectTrigger 
                      id="role"
                      aria-required="true"
                      aria-describedby="role-hint"
                    >
                      <SelectValue placeholder="Selecione a função" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">Visualizador</SelectItem>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                  <p id="role-hint" className="text-xs text-muted-foreground">
                    A função padrão é Visualizador
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Senha *</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Mínimo 8 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-12"
                      disabled={loading}
                      aria-required="true"
                      aria-invalid={!!validationErrors.password}
                      aria-describedby={validationErrors.password ? "password-error password-strength" : "password-strength"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {validationErrors.password && (
                    <p id="password-error" className="text-sm text-red-600" role="alert">
                      {validationErrors.password}
                    </p>
                  )}
                  <div id="password-strength">
                    <PasswordStrengthIndicator password={password} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Senha *</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Repita a senha"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pr-12"
                      disabled={loading}
                      aria-required="true"
                      aria-describedby="confirmPassword-hint"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showConfirmPassword ? "Ocultar confirmação de senha" : "Mostrar confirmação de senha"}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p id="confirmPassword-hint" className="text-xs text-muted-foreground">
                    Deve ser igual à senha acima
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/admin/users')}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                >
                  {loading ? 'Criando usuário...' : 'Criar Usuário'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Informações Importantes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-medium">📧 Email de Confirmação</h4>
              <p className="text-muted-foreground">
                O usuário receberá um email para confirmar a conta antes de poder fazer login.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">🔐 Senha Segura</h4>
              <p className="text-muted-foreground">
                Use uma senha forte com letras maiúsculas, minúsculas, números e caracteres especiais.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">👤 Funções do Sistema</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• <strong>Visualizador:</strong> Apenas leitura</li>
                <li>• <strong>Editor:</strong> Pode editar conteúdo</li>
                <li>• <strong>Admin:</strong> Acesso total</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">🔒 Segurança</h4>
              <p className="text-muted-foreground text-xs">
                Todos os dados são sanitizados e validados. Tentativas suspeitas são registradas.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};